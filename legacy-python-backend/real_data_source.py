"""
Real market data via Finnhub's free-tier quote endpoint.

Honesty note for the README/demo: Finnhub's free tier gives real, live
current price (`c` in their response) but does NOT include volume or
intraday history on the free plan. So:
  - current_price: 100% real, live market data
  - current_volume: synthetic (same per-symbol jitter model as the mock),
    clearly not a real figure — free-tier limitation, not a shortcut we
    took for convenience
This keeps the same Quote/circuit-breaker contract as MockMarketDataSource
so nothing downstream (scoring, endpoints) needs to know which is active.
"""
import random
import requests
from datetime import datetime, timezone

from data_source import Quote, UpstreamUnavailable

FINNHUB_QUOTE_URL = "https://finnhub.io/api/v1/quote"
REQUEST_TIMEOUT_SECONDS = 4


class FinnhubMarketDataSource:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self._force_failure = False
        self._last_good_quote: dict[str, Quote] = {}
        self._base_volumes: dict[str, float] = {}

    def set_force_failure(self, on: bool):
        self._force_failure = on

    def _synthetic_volume(self, symbol: str) -> float:
        # Finnhub's free quote endpoint has no volume field — this fills
        # the gap so the volume-anomaly signal still has something to
        # compare against. Clearly synthetic; not a real trading volume.
        if symbol not in self._base_volumes:
            rng = random.Random(symbol)
            self._base_volumes[symbol] = rng.uniform(1e5, 5e7)
        base = self._base_volumes[symbol]
        volume = max(0, base * (1 + random.gauss(0, 0.4)))
        return round(volume, 0)

    def _raw_fetch(self, symbol: str) -> Quote:
        if self._force_failure:
            raise UpstreamUnavailable(f"forced failure (demo toggle) for {symbol}")

        try:
            resp = requests.get(
                FINNHUB_QUOTE_URL,
                params={"symbol": symbol, "token": self.api_key},
                timeout=REQUEST_TIMEOUT_SECONDS,
            )
        except requests.RequestException as e:
            raise UpstreamUnavailable(f"network error fetching {symbol}: {e}")

        if resp.status_code == 429:
            raise UpstreamUnavailable(f"rate limited fetching {symbol}")
        if resp.status_code != 200:
            raise UpstreamUnavailable(f"Finnhub returned {resp.status_code} for {symbol}")

        data = resp.json()
        price = data.get("c")
        # Finnhub returns 0/None for an unrecognized symbol rather than
        # an HTTP error — treat that as "no data" too
        if not price:
            raise UpstreamUnavailable(f"no quote data for {symbol} (invalid symbol?)")

        quote = Quote(
            symbol=symbol,
            price=round(float(price), 2),
            volume=self._synthetic_volume(symbol),
            source="finnhub",
            confidence=1.0,
            is_stale=False,
            fetched_at=datetime.now(timezone.utc),
        )
        self._last_good_quote[symbol] = quote
        return quote

    def fetch(self, symbol: str) -> Quote:
        """Same circuit-breaker contract as the mock source: on any
        failure (network, rate limit, bad symbol), fall back to the last
        known-good quote with is_stale=True and reduced confidence."""
        try:
            return self._raw_fetch(symbol)
        except UpstreamUnavailable:
            cached = self._last_good_quote.get(symbol)
            if cached is None:
                raise
            return Quote(
                symbol=cached.symbol,
                price=cached.price,
                volume=cached.volume,
                source=cached.source,
                confidence=max(0.3, cached.confidence - 0.4),
                is_stale=True,
                fetched_at=cached.fetched_at,
            )
