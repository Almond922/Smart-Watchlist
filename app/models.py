"""
SQLAlchemy models.

Design note: the two tables that actually make "what changed since I last
checked" possible are `PricePoint` (history, needed for volatility/volume
baselines) and `WatchlistSnapshot` (per-user, per-symbol "what the state
looked like the last time this user acknowledged it"). Everything else is
bookkeeping around those two.
"""
from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Float, DateTime, ForeignKey, JSON,
    UniqueConstraint, Index, Boolean
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


def utcnow():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, nullable=False, index=True)
    created_at = Column(DateTime, default=utcnow)

    watchlist_items = relationship("WatchlistItem", back_populates="user", cascade="all, delete-orphan")


class WatchlistItem(Base):
    """A symbol on a user's watchlist. Cross-device by construction —
    keyed on user_id, not session, so the same watchlist and the same
    'what changed' state show up on phone and laptop alike."""
    __tablename__ = "watchlist_items"
    __table_args__ = (UniqueConstraint("user_id", "symbol", name="uq_user_symbol"),)

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    symbol = Column(String, nullable=False, index=True)
    added_at = Column(DateTime, default=utcnow)

    user = relationship("User", back_populates="watchlist_items")


class PricePoint(Base):
    """Time-series price/volume history per symbol. This is what the
    scoring engine reads to compute a symbol's *own* baseline volatility
    and volume distribution — without history, "meaningful" has nothing
    to be relative to."""
    __tablename__ = "price_points"
    __table_args__ = (Index("ix_symbol_time", "symbol", "fetched_at"),)

    id = Column(Integer, primary_key=True)
    symbol = Column(String, nullable=False, index=True)
    price = Column(Float, nullable=False)
    volume = Column(Float, nullable=True)
    source = Column(String, nullable=False)          # which upstream provider
    confidence = Column(Float, default=1.0)           # 0-1, lower if source disagreement/staleness
    is_stale = Column(Boolean, default=False)          # served from cache due to upstream failure
    fetched_at = Column(DateTime, default=utcnow, index=True)


class NewsEvent(Base):
    """A headline/event tied to a symbol, used for the news-delta signal
    (price can be flat while something material just happened)."""
    __tablename__ = "news_events"

    id = Column(Integer, primary_key=True)
    symbol = Column(String, nullable=False, index=True)
    headline = Column(String, nullable=False)
    event_type = Column(String, default="news")       # news | earnings | filing
    published_at = Column(DateTime, default=utcnow, index=True)


class WatchlistSnapshot(Base):
    """The 'last time this user looked' state, per user per symbol.
    On each visit we diff the *current* computed state against this row;
    on acknowledgment we overwrite it. This single table is what turns a
    quote API into a change-detection product."""
    __tablename__ = "watchlist_snapshots"
    __table_args__ = (UniqueConstraint("user_id", "symbol", name="uq_snapshot_user_symbol"),)

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    symbol = Column(String, nullable=False, index=True)
    snapshot = Column(JSON, nullable=False)            # {price, volume, key_levels, latest_news_id, ...}
    seen_at = Column(DateTime, default=utcnow)
    # optimistic concurrency: bumped on every ack write, so two devices
    # racing to ack the same symbol can't silently clobber each other
    version = Column(Integer, default=0, nullable=False)
