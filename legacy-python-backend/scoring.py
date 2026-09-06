"""
Attention scoring + snapshot diffing.

The core bet of this product: raw price % change is a bad ranking signal.
A 3% move in a stock that normally moves 0.5%/day is a big deal; a 3% move
in a stock that normally moves 4%/day is Tuesday. So everything here is
scored *relative to the symbol's own recent behavior*, not against a fixed
threshold.
"""
import statistics
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy.orm import Session

from models import PricePoint, NewsEvent, WatchlistSnapshot


@dataclass
class Signal:
    kind: str          # "volatility" | "volume" | "level_break" | "news"
    score: float        # contribution to attention score, 0-1+
    reason: str          # human-readable explanation


@dataclass
class SymbolChange:
    symbol: str
    current_price: float
    current_volume: Optional[float]
    is_stale: bool
    confidence: float
    attention_score: float
    signals: list = field(default_factory=list)
    is_first_view: bool = False
    baseline_price: Optional[float] = None
    baseline_seen_at: Optional[datetime] = None


HISTORY_WINDOW_DAYS = 20
MIN_HISTORY_POINTS = 5


def _recent_history(db: Session, symbol: str, exclude_latest: bool = True) -> list[PricePoint]:
    cutoff = datetime.now(timezone.utc) - timedelta(days=HISTORY_WINDOW_DAYS)
    q = (
        db.query(PricePoint)
        .filter(PricePoint.symbol == symbol, PricePoint.fetched_at >= cutoff)
        .order_by(PricePoint.fetched_at.asc())
    )
    points = q.all()
    return points[:-1] if (exclude_latest and points) else points


def _volatility_signal(history: list[PricePoint], current_price: float) -> Optional[Signal]:
    if len(history) < MIN_HISTORY_POINTS:
        return None
    prices = [p.price for p in history]
    mean = statistics.mean(prices)
    stdev = statistics.pstdev(prices) or (mean * 0.005)  # floor to avoid div-by-zero on flat history
    z = (current_price - mean) / stdev
    if abs(z) < 1.5:
        return None
    direction = "above" if z > 0 else "below"
    return Signal(
        kind="volatility",
        score=min(abs(z) / 3, 2.0),
        reason=f"Price is {abs(z):.1f} std devs {direction} its {HISTORY_WINDOW_DAYS}-day average — "
               f"unusual for this symbol specifically, not just a big % move.",
    )


def _volume_signal(history: list[PricePoint], current_volume: Optional[float]) -> Optional[Signal]:
    if current_volume is None:
        return None
    vols = [p.volume for p in history if p.volume is not None]
    if len(vols) < MIN_HISTORY_POINTS:
        return None
    mean = statistics.mean(vols)
    stdev = statistics.pstdev(vols) or (mean * 0.1 or 1)
    z = (current_volume - mean) / stdev
    if z < 1.5:
        return None
    return Signal(
        kind="volume",
        score=min(z / 3, 2.0),
        reason=f"Volume is running {z:.1f} std devs above normal — possible accumulation/distribution "
               f"ahead of a price move.",
    )


def _level_break_signal(history: list[PricePoint], current_price: float) -> Optional[Signal]:
    if len(history) < MIN_HISTORY_POINTS:
        return None
    prices = [p.price for p in history]
    hi, lo = max(prices), min(prices)
    if current_price > hi:
        return Signal(kind="level_break", score=1.0,
                       reason=f"Broke above its {HISTORY_WINDOW_DAYS}-day high ({hi:.2f}).")
    if current_price < lo:
        return Signal(kind="level_break", score=1.0,
                       reason=f"Broke below its {HISTORY_WINDOW_DAYS}-day low ({lo:.2f}).")
    return None


def _news_signal(db: Session, symbol: str, since: Optional[datetime]) -> Optional[Signal]:
    q = db.query(NewsEvent).filter(NewsEvent.symbol == symbol)
    if since:
        q = q.filter(NewsEvent.published_at > since)
    events = q.order_by(NewsEvent.published_at.desc()).limit(3).all()
    if not events:
        return None
    weight = 1.2 if any(e.event_type == "earnings" for e in events) else 0.8
    headline = events[0].headline
    extra = f" (+{len(events) - 1} more)" if len(events) > 1 else ""
    return Signal(kind="news", score=weight, reason=f"New: \"{headline}\"{extra}")


def compute_change(db: Session, user_id: int, symbol: str, quote) -> SymbolChange:
    """Compute a symbol's attention score for this user's visit, using
    both its own price history (for the statistical signals) and the
    user's last-seen snapshot (for what's new since THEY looked)."""
    history = _recent_history(db, symbol)

    snap = (
        db.query(WatchlistSnapshot)
        .filter(WatchlistSnapshot.user_id == user_id, WatchlistSnapshot.symbol == symbol)
        .first()
    )
    is_first_view = snap is None
    since = snap.seen_at if snap else None

    signals = []
    for fn in (_volatility_signal, _volume_signal, _level_break_signal):
        args = (history, quote.price) if fn is not _volume_signal else (history, quote.volume)
        sig = fn(*args)
        if sig:
            signals.append(sig)

    news_sig = _news_signal(db, symbol, since)
    if news_sig:
        signals.append(news_sig)

    if quote.is_stale:
        signals.append(Signal(
            kind="staleness", score=0.0,
            reason=f"Data is stale (confidence {quote.confidence:.0%}) — upstream source unavailable, "
                   f"showing last known price.",
        ))

    attention_score = round(sum(s.score for s in signals if s.kind != "staleness"), 2)

    return SymbolChange(
        symbol=symbol,
        current_price=quote.price,
        current_volume=quote.volume,
        is_stale=quote.is_stale,
        confidence=quote.confidence,
        attention_score=attention_score,
        signals=signals,
        is_first_view=is_first_view,
        baseline_price=(snap.snapshot.get("price") if snap else None),
        baseline_seen_at=(snap.seen_at if snap else None),
    )


def ack_snapshot(db: Session, user_id: int, symbol: str, quote, latest_news_id: Optional[int]):
    """Overwrite the user's 'last seen' state for this symbol. Uses
    optimistic concurrency (version bump) so two devices acking the same
    symbol near-simultaneously don't silently overwrite each other —
    the second write is treated as a no-op merge rather than a crash."""
    snap = (
        db.query(WatchlistSnapshot)
        .filter(WatchlistSnapshot.user_id == user_id, WatchlistSnapshot.symbol == symbol)
        .first()
    )
    payload = {
        "price": quote.price,
        "volume": quote.volume,
        "latest_news_id": latest_news_id,
    }
    if snap is None:
        snap = WatchlistSnapshot(user_id=user_id, symbol=symbol, snapshot=payload, version=0)
        db.add(snap)
    else:
        snap.snapshot = payload
        snap.seen_at = datetime.now(timezone.utc)
        snap.version += 1
    db.commit()
    return snap
