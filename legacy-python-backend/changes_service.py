"""
Shared logic for computing a user's ranked watchlist changes. Used by both
the REST endpoint (one-shot poll) and the WebSocket endpoint (repeated push)
so there's exactly one implementation of "what does a visit look like."
"""
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from models import WatchlistItem, PricePoint
from market_data_provider import market_data, UpstreamUnavailable
from scoring import compute_change


def compute_changes_for_user(db: Session, user_id: int) -> list[dict]:
    items = db.query(WatchlistItem).filter(WatchlistItem.user_id == user_id).all()
    results = []

    for item in items:
        symbol = item.symbol
        try:
            quote = market_data.fetch(symbol)
        except UpstreamUnavailable:
            results.append({
                "symbol": symbol, "current_price": 0.0, "current_volume": None,
                "is_stale": True, "confidence": 0.0, "attention_score": 0.0,
                "is_first_view": True,
                "signals": [{"kind": "error", "score": 0.0,
                             "reason": "No data available — upstream is down and there's no cached quote."}],
            })
            continue

        db.add(PricePoint(
            symbol=symbol, price=quote.price, volume=quote.volume,
            source=quote.source, confidence=quote.confidence,
            is_stale=quote.is_stale, fetched_at=quote.fetched_at,
        ))
        db.commit()

        change = compute_change(db, user_id, symbol, quote)
        results.append({
            "symbol": change.symbol, "current_price": change.current_price,
            "current_volume": change.current_volume, "is_stale": change.is_stale,
            "confidence": change.confidence, "attention_score": change.attention_score,
            "is_first_view": change.is_first_view,
            "baseline_price": change.baseline_price,
            # isoformat string, not a raw datetime — the WebSocket path uses
            # plain json.dumps (no Pydantic auto-conversion like the REST
            # response_model gets), so a raw datetime here would crash it
            "baseline_seen_at": change.baseline_seen_at.isoformat() if change.baseline_seen_at else None,
            "signals": [{"kind": s.kind, "score": s.score, "reason": s.reason} for s in change.signals],
        })

    results.sort(key=lambda r: r["attention_score"], reverse=True)
    return results
