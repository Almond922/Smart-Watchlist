# Smart Market Watchlist — Frontend

Next.js dashboard for the watchlist backend. Connects over a live WebSocket
(`/ws/{user_id}/changes`) so rows update in place every few seconds without
polling — falls back and auto-reconnects if the connection drops, which
doubles as a live demo of the resilience story.

## Run it
```
npm install
cp .env.local.example .env.local   # adjust if your backend isn't on :8000
npm run dev
```
Open http://localhost:3000. Enter any email to create/load a user — the
same email on any device loads the same watchlist and "what's changed"
state, since that's all keyed server-side.

## What to try
1. Add a symbol (e.g. `AAPL`) — the app auto-seeds fake history via the
   backend's demo endpoint so scoring works immediately.
2. Watch the connection badge (top right) go "Live" — every ~5s the row
   re-scores based on the backend's WebSocket push.
3. Click "Demo controls" → "Trigger outage" to simulate the upstream
   failing. Rows show a `stale · NN%` badge instead of breaking, and the
   connection badge still says "Live" (the WebSocket itself didn't drop —
   only the underlying data source did, which is the point: two
   independent failure modes, handled independently).
4. "Ack" a row to mark it seen — its attention score drops on the next
   push since there's nothing new to flag anymore.

## Design notes
Dark, terminal-inspired palette with functional (not decorative) color —
amber only means "this needs attention," green/coral only carry price
direction. Fonts are system stacks, not a Google Fonts fetch: deliberate,
since an app about handling unreliable dependencies gracefully shouldn't
have its own render blocked by one.
