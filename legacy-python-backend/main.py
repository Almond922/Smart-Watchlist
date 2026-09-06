from dotenv import load_dotenv
load_dotenv()

import asyncio
from datetime import datetime, timezone
from typing import Optional

from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import get_db, init_db, SessionLocal
from models import User, WatchlistItem, PricePoint, NewsEvent
from schemas import UserCreate, WatchlistAdd, SymbolChangeOut
from market_data_provider import market_data, UpstreamUnavailable, USING_REAL_DATA
from data_source import generate_synthetic_series
from scoring import compute_change, ack_snapshot
from changes_service import compute_changes_for_user

# how often the WebSocket re-scores and pushes an update to a connected client
PUSH_INTERVAL_SECONDS = 5

app = FastAPI(title="Smart Market Watchlist")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # demo only — lock this down for real deployment
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_db()


# ---------- users ----------

@app.post("/users")
def create_user(payload: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        return {"id": existing.id, "email": existing.email}
    user = User(email=payload.email)
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"id": user.id, "email": user.email}


# ---------- watchlist CRUD ----------

@app.post("/watchlist/{user_id}")
def add_symbol(user_id: int, payload: WatchlistAdd, db: Session = Depends(get_db)):
    symbol = payload.symbol.upper().strip()
    if not symbol:
        raise HTTPException(400, "symbol required")
    existing = (
        db.query(WatchlistItem)
        .filter(WatchlistItem.user_id == user_id, WatchlistItem.symbol == symbol)
        .first()
    )
    if existing:
        return {"symbol": symbol, "already_added": True}
    db.add(WatchlistItem(user_id=user_id, symbol=symbol))
    db.commit()
    return {"symbol": symbol, "already_added": False}


@app.delete("/watchlist/{user_id}/{symbol}")
def remove_symbol(user_id: int, symbol: str, db: Session = Depends(get_db)):
    symbol = symbol.upper()
    item = (
        db.query(WatchlistItem)
        .filter(WatchlistItem.user_id == user_id, WatchlistItem.symbol == symbol)
        .first()
    )
    if not item:
        raise HTTPException(404, "not on watchlist")
    db.delete(item)
    db.commit()
    return {"removed": symbol}


@app.get("/watchlist/{user_id}")
def list_watchlist(user_id: int, db: Session = Depends(get_db)):
    items = db.query(WatchlistItem).filter(WatchlistItem.user_id == user_id).all()
    return [i.symbol for i in items]


# ---------- the core endpoint: what changed ----------

@app.get("/watchlist/{user_id}/changes", response_model=list[SymbolChangeOut])
def get_changes(user_id: int, db: Session = Depends(get_db)):
    """One-shot poll: fetch latest data for every watchlisted symbol, score
    each against its own history + the user's last-seen snapshot, and
    return them ranked by attention score (highest first). See
    /ws/{user_id}/changes for the live-push version of the same logic."""
    return compute_changes_for_user(db, user_id)


@app.websocket("/ws/{user_id}/changes")
async def ws_changes(websocket: WebSocket, user_id: int):
    """Live version of GET /changes: pushes a freshly-scored, ranked
    payload every PUSH_INTERVAL_SECONDS for as long as the client stays
    connected. Each tick opens and closes its own DB session — a
    WebSocket's lifetime spans many independent units of work, so it
    shouldn't hold one long-lived session (or one user's dead connection
    could pin a stale transaction)."""
    await websocket.accept()
    try:
        while True:
            db = SessionLocal()
            try:
                payload = compute_changes_for_user(db, user_id)
            finally:
                db.close()
            await websocket.send_json(payload)
            await asyncio.sleep(PUSH_INTERVAL_SECONDS)
    except WebSocketDisconnect:
        pass


@app.post("/watchlist/{user_id}/{symbol}/ack")
def ack(user_id: int, symbol: str, db: Session = Depends(get_db)):
    """Mark a symbol as 'seen' — resets the diff baseline for next visit.
    Idempotent-ish: repeated acks just re-snapshot current state."""
    symbol = symbol.upper()
    try:
        quote = market_data.fetch(symbol)
    except UpstreamUnavailable:
        raise HTTPException(503, "cannot ack: upstream unavailable and no cached quote")
    latest_news = (
        db.query(NewsEvent)
        .filter(NewsEvent.symbol == symbol)
        .order_by(NewsEvent.published_at.desc())
        .first()
    )
    snap = ack_snapshot(db, user_id, symbol, quote, latest_news.id if latest_news else None)
    return {"symbol": symbol, "seen_at": snap.seen_at, "version": snap.version}


# ---------- demo/admin: seeding + failure injection ----------

@app.post("/admin/seed-history/{symbol}")
def seed_history(symbol: str, points: int = 20, db: Session = Depends(get_db)):
    """Backfill a baseline so the volatility/volume z-scores have
    something to compare against immediately. If a real data source is
    active, this anchors on one REAL fetched price and scatters synthetic
    history around it (free-tier APIs don't expose intraday history); on
    the mock source it's synthetic end to end. A production ingestion
    worker wouldn't need this at all — it fills this table continuously
    from real ticks over time instead of seeding it instantly."""
    symbol = symbol.upper()
    anchor = market_data.fetch(symbol)  # real if USING_REAL_DATA, else mock
    series = generate_synthetic_series(symbol, anchor.price, points)
    for point in series:
        db.add(PricePoint(
            symbol=symbol, price=point["price"], volume=point["volume"],
            source="synthetic-seed", confidence=1.0, is_stale=False,
            fetched_at=datetime.now(timezone.utc),
        ))
    db.commit()
    return {"symbol": symbol, "seeded": points, "anchor_price": anchor.price}


@app.get("/admin/data-source")
def data_source_status():
    """Which market data source is currently active — check this to
    confirm FINNHUB_API_KEY was picked up correctly."""
    return {
        "using_real_data": USING_REAL_DATA,
        "provider": "finnhub" if USING_REAL_DATA else "mock",
    }


@app.post("/admin/inject-news/{symbol}")
def inject_news(symbol: str, headline: str, event_type: str = "news", db: Session = Depends(get_db)):
    n = NewsEvent(symbol=symbol.upper(), headline=headline, event_type=event_type)
    db.add(n)
    db.commit()
    return {"id": n.id, "symbol": n.symbol}


@app.post("/admin/inject-failure")
def inject_failure(on: bool = True):
    """Live-toggle the mock upstream to simulate an outage — this is the
    switch to flip during the resilience part of the demo."""
    market_data.set_force_failure(on)
    return {"upstream_forced_failure": on}
