"""
Mock upstream market data provider.

Two things live here on purpose:

1. A believable random-walk price/volume generator per symbol, seeded so
   behavior is stable across a run (some symbols are just more volatile
   than others, like real ones).
2. A circuit breaker wrapping the "upstream call" so the failure/staleness
   story is a real code path, not a claim in the writeup. Toggle it with
   POST /admin/inject-failure to demo the fallback live.

Swapping this for a real provider (Finnhub/Polygon/Alpha Vantage) means
replacing MockMarketDataSource.fetch() — everything downstream (circuit
breaker, staleness flagging, confidence scoring) stays the same.
"""
import random
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional


@dataclass
class Quote:
    symbol: str
    price: float
    volume: float
    source: str
    confidence: float
    is_stale: bool
    fetched_at: datetime


class UpstreamUnavailable(Exception):
    pass


class MockMarketDataSource:
    """Simulates a flaky upstream price API with per-symbol volatility."""

    def __init__(self):
        self._base_prices = {}
        self._base_volumes = {}
        self._force_failure = False   # flipped by the admin endpoint for demos
        self._last_good_quote: dict[str, Quote] = {}

    def set_force_failure(self, on: bool):
        self._force_failure = on

    def _seed_symbol(self, symbol: str):
        if symbol not in self._base_prices:
            rng = random.Random(symbol)  # deterministic per symbol
            self._base_prices[symbol] = rng.uniform(20, 800)
            self._base_volumes[symbol] = rng.uniform(1e5, 5e7)

    def _raw_fetch(self, symbol: str) -> Quote:
        if self._force_failure:
            raise UpstreamUnavailable(f"mock upstream down for {symbol}")

        self._seed_symbol(symbol)
        base_price = self._base_prices[symbol]
        base_volume = self._base_volumes[symbol]

        # per-symbol volatility so some tickers are naturally noisier —
        # this matters later for volatility-normalized scoring
        vol_factor = (hash(symbol) % 5 + 1) / 100  # 1%-5% typical move
        price = base_price * (1 + random.gauss(0, vol_factor))
        volume = max(0, base_volume * (1 + random.gauss(0, 0.4)))

        self._base_prices[symbol] = price  # drift persists across calls

        quote = Quote(
            symbol=symbol,
            price=round(price, 2),
            volume=round(volume, 0),
            source="mock-provider-a",
            confidence=1.0,
            is_stale=False,
            fetched_at=datetime.now(timezone.utc),
        )
        self._last_good_quote[symbol] = quote
        return quote

    def fetch(self, symbol: str) -> Quote:
        """Circuit-breaker wrapper: on upstream failure, fall back to the
        last known-good quote with is_stale=True and reduced confidence,
        rather than raising all the way up to the API layer."""
        try:
            return self._raw_fetch(symbol)
        except UpstreamUnavailable:
            cached = self._last_good_quote.get(symbol)
            if cached is None:
                # never had data for this symbol at all — nothing to fall back to
                raise
            return Quote(
                symbol=cached.symbol,
                price=cached.price,
                volume=cached.volume,
                source=cached.source,
                confidence=max(0.3, cached.confidence - 0.4),
                is_stale=True,
                fetched_at=cached.fetched_at,  # note: NOT updated — it's genuinely stale
            )


# module-level singleton — one shared upstream connection for the app
market_data = MockMarketDataSource()


def generate_synthetic_series(symbol: str, anchor_price: float, points: int) -> list[dict]:
    """Generate a small synthetic history around a real anchor price.

    Used when seeding a symbol's baseline: free-tier real data APIs don't
    give you intraday history, so we can't backfill genuine historical
    ticks. Instead we scatter synthetic points around the REAL current
    price using the same per-symbol volatility model as the mock source —
    the anchor is real, the spread around it is simulated. A production
    system would skip this entirely and let real history accumulate tick
    by tick instead of seeding it instantly.
    """
    vol_factor = (hash(symbol) % 5 + 1) / 100
    base_volume = random.Random(symbol).uniform(1e5, 5e7)
    series = []
    price = anchor_price
    for _ in range(points):
        price = price * (1 + random.gauss(0, vol_factor))
        volume = max(0, base_volume * (1 + random.gauss(0, 0.4)))
        series.append({"price": round(price, 2), "volume": round(volume, 0)})
    return series
