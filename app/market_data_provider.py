"""
Single place that decides which market data source is active. Everything
else in the app (scoring, endpoints) imports `market_data` and
`UpstreamUnavailable` from HERE, not from data_source.py directly — that's
what makes the swap a one-file change.
"""
import os

from app.data_source import MockMarketDataSource, UpstreamUnavailable  # noqa: F401 (re-exported)

FINNHUB_API_KEY = os.environ.get("FINNHUB_API_KEY", "").strip()

if FINNHUB_API_KEY:
    from app.real_data_source import FinnhubMarketDataSource
    market_data = FinnhubMarketDataSource(FINNHUB_API_KEY)
    USING_REAL_DATA = True
else:
    market_data = MockMarketDataSource()
    USING_REAL_DATA = False