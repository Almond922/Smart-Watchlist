from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    email: EmailStr


class WatchlistAdd(BaseModel):
    symbol: str


class SignalOut(BaseModel):
    kind: str
    score: float
    reason: str


class SymbolChangeOut(BaseModel):
    symbol: str
    current_price: float
    current_volume: Optional[float]
    is_stale: bool
    confidence: float
    attention_score: float
    is_first_view: bool
    baseline_price: Optional[float] = None
    baseline_seen_at: Optional[datetime] = None
    signals: list[SignalOut]

    class Config:
        from_attributes = True
