// GET /api/actives — the lists under the search. Built 2026-09-28 · actives-1b.
// His rules, 28 Sep 2026: "We need to know the most actives every day and be prepared with a list
// just below the search" and "we need fresh data — the big names, but the microcaps are our game."
//
//   big    the most active symbols by volume (the big names)
//   micro  microcaps on the move: under $300M in market value, pooled from the most-active,
//          small-cap-gainer and aggressive-small-cap screens, ranked by volume
//
// Each list is kept every day (one row per symbol per list per trading day; the latest numbers of
// the day win), so we build our own record of what traded.
//
// ⚠ THE SOURCE IS A STAND-IN, like /api/quote: Yahoo's predefined screeners, whose terms do not allow
// commercial reuse. Move to a licensed feed before selling on it. Only screen() knows the source.
//
// STORAGE (D1 binding OVERHANG, created on first use):
//   actives_daily  trade_date, list, symbol, rank, name, price, change_pct, volume, market_cap, src, seen_at

const UA = { headers: { 'user-agent': 'Mozilla/5.0 (8K10Q actives)' } };
const MICRO_CAP = 300e6;

export async function onRequestGet({ request, env, waitUntil }) {
  const n = Math.max(5, Math.min(25, parseInt(new URL(request.url).searchParams.get('n'), 10) || 12));
  const cache = caches.default;
  const key = new Request('https://8k10q.com/api/actives?v=1b&n=' + n);
  const hit = await cache.match(key);
  if (hit) return hit;

  let most, small, aggr;
  try {
    [most, small, aggr] = await Promise.all([screen('most_actives', 50), screen('small_cap_gainers', 50).catch(() => []), screen('aggressive_small_caps', 50).catch(() => [])]);
  } catch (e) { return json({ ok: false, error: 'the most-active lists are not answering just now' }, 502); }

  const big = most.slice(0, 25).map((x, i) => Object.assign({}, x, { rank: i + 1 }));
  const seen = {};
  const micro = most.concat(small, aggr)
    .filter(x => x.market_cap != null && x.market_cap < MICRO_CAP && x.volume && !seen[x.symbol] && (seen[x.symbol] = 1))
    .sort((a, b) => b.volume - a.volume).slice(0, 25).map((x, i) => Object.assign({}, x, { rank: i + 1 }));

  const day = tradeDate();
  const out = { ok: true, build: 'actives-1b', trade_date: day, as_of: new Date().toISOString(), src: 'yahoo (stand-in)',
                micro_cap_under: MICRO_CAP, big: big.slice(0, n), micro: micro.slice(0, n) };
  const res = json(out, 200, 'public, max-age=300');
  waitUntil(cache.put(key, res.clone()));
  if (env.OVERHANG) waitUntil(store(env, day, big, micro).catch(() => {}));
  return res;
}

async function screen(id, count) {
  const r = await fetch('https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?scrIds=' + id + '&count=' + count, UA);
  if (!r.ok) throw new Error('source ' + r.status);
  const j = await r.json();
  const q = (j && j.finance && j.finance.result && j.finance.result[0] && j.finance.result[0].quotes) || [];
  return q.filter(x => x && x.symbol && !/[=^]/.test(x.symbol)).map(x => ({
    symbol: String(x.symbol).toUpperCase(), name: x.shortName || x.longName || null,
    price: num(x.regularMarketPrice), change_pct: num(x.regularMarketChangePercent),
    volume: x.regularMarketVolume || null, market_cap: x.marketCap || null, exchange: x.fullExchangeName || x.exchange || null
  }));
}

async function store(env, day, big, micro) {
  await env.OVERHANG.prepare(
    `CREATE TABLE IF NOT EXISTS actives_daily (
       trade_date TEXT NOT NULL, list TEXT NOT NULL, symbol TEXT NOT NULL, rank INTEGER, name TEXT, price REAL,
       change_pct REAL, volume INTEGER, market_cap REAL, src TEXT NOT NULL DEFAULT 'yahoo', seen_at TEXT NOT NULL,
       PRIMARY KEY (trade_date, list, symbol, src))`).run();
  const now = new Date().toISOString();
  const stmt = env.OVERHANG.prepare(
    `INSERT INTO actives_daily (trade_date, list, symbol, rank, name, price, change_pct, volume, market_cap, src, seen_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'yahoo', ?)
     ON CONFLICT (trade_date, list, symbol, src) DO UPDATE SET rank = excluded.rank, price = excluded.price,
       change_pct = excluded.change_pct, volume = excluded.volume, market_cap = excluded.market_cap, seen_at = excluded.seen_at`);
  const rows = big.map(x => stmt.bind(day, 'big', x.symbol, x.rank, x.name, x.price, x.change_pct, x.volume, x.market_cap, now))
    .concat(micro.map(x => stmt.bind(day, 'micro', x.symbol, x.rank, x.name, x.price, x.change_pct, x.volume, x.market_cap, now)));
  if (rows.length) await env.OVERHANG.batch(rows);
}

/* the trading day in New York: before 4 AM ET counts as the day before */
function tradeDate() {
  return new Date(Date.now() - 4 * 3600 * 1000).toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}
const num = v => (typeof v === 'number' && isFinite(v) ? Math.round(v * 10000) / 10000 : null);
function json(o, status = 200, cc = 'no-store') {
  return new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json', 'cache-control': cc, 'access-control-allow-origin': '*' } });
}
