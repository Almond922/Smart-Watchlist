(Get a free key at [finnhub.io](https://finnhub.io). Omit this and the
app runs on simulated data automatically.)

```bash
uvicorn app.main:app --reload
```

Confirm it's running at `http://localhost:8000/docs`.

### Frontend

```bash
cd watchlist-frontend/watchlist-frontend
npm install
cp .env.local.example .env.local
npm run dev
```

Open `http://localhost:3000`.

### Using it

1. Enter any email to create/load a watchlist.
2. Add real stock symbols (`AAPL`, `TSLA`, `MSFT`, `GOOGL`, `NVDA`, etc).
3. Watch the connection badge (top right) — it should show **Live**.
4. Click **Demo controls → Trigger outage** to see the resilience
   fallback: rows show a `stale · NN%` badge instead of erroring.
5. Click **Ack** on a row to mark it seen — its score resets to 0 on
   the next update since there's nothing new to flag.

## Verify which data source is active

GET http://localhost:8000/admin/data-source

Returns `{"using_real_data": true, "provider": "finnhub"}` when a key is
configured, or `"provider": "mock"` otherwise.
