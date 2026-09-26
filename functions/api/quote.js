// GET /api/quote?t=TOVX — a delayed quote, pre-market / after-hours, and a year of daily
// closes for a room. EVERY BAR WE SEE IS KEPT: our own price history starts the day
// this runs (his ruling, 26 Sep 2026: start free, but building our own data is critical;
// archive history gets bought later and loaded beside it with its own `src`).
//
// ⚠ THE SOURCE IS A STAND-IN. Yahoo's chart endpoint answers, but its terms do not
// allow commercial reuse. Before 8K10Q sells anything this must move to a licensed
// feed (Finnhub, Polygon …). Only the fromYahoo* functions know where the numbers come
// from — write the licensed ones with the same shapes and switch SOURCE.
//
// Every number is reported as it came back or computed from the bars, never filled in:
// a field the source did not give is null and the page says so.
//
// STORAGE (D1 binding OVERHANG, tables created on first use):
//   price_bars   5-minute bars, every session, tagged pre | regular | post | overnight
//   price_daily  one row per trading day
// Rows are INSERT OR IGNORE on (ticker, time, src): a bar is written once and never
// changed, so a later purchased archive can sit beside ours without overwriting it.
// OVERNIGHT (8 PM–4 AM ET, Blue Ocean) is not in this feed; the column is ready for
// the paid feed that has it.

const SOURCE = 'yahoo';
const UA = { headers: { 'user-agent': 'Mozilla/5.0 (8K10Q room)' } };

export async function onRequestGet({ request, env, waitUntil }) {
  const t = (new URL(request.url).searchParams.get('t') || '').trim().toUpperCase();
  if (!/^[A-Z][A-Z0-9.\-]{0,9}$/.test(t)) return json({ ok: false, error: 'give a symbol, e.g. ?t=TOVX' }, 400);

  // one minute of edge cache per symbol, so a busy room does not hammer the source
  const cache = caches.default;
  const key = new Request('https://8k10q.com/api/quote?t=' + t);
  const hit = await cache.match(key);
  if (hit) return hit;

  let daily, intraday;
  try { [daily, intraday] = await Promise.all([fromYahooDaily(t), fromYahooIntraday(t).catch(() => null)]); }
  catch (e) { return json({ ok: false, ticker: t, error: 'no quote just now' }, 502); }
  if (!daily) return json({ ok: false, ticker: t, error: 'no quote for this symbol' }, 404);

  const q = shape(t, daily, intraday);
  if (env && env.OVERHANG) waitUntil(keep(env.OVERHANG, t, daily, intraday).catch(() => {}));

  const res = json({ ok: true, ...q }, 200, 'public, max-age=60');
  await cache.put(key, res.clone());
  return res;
}

/* ---------------- the source (stand-in) ---------------- */
async function chart(t, qs) {
  const r = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/' + encodeURIComponent(t) + '?' + qs, UA);
  if (!r.ok) return null;
  const d = await r.json();
  const res = d && d.chart && d.chart.result && d.chart.result[0];
  return res && res.meta ? res : null;
}
function bars(res) {
  const ts = res.timestamp || [], q = (res.indicators && res.indicators.quote && res.indicators.quote[0]) || {}, out = [];
  for (let i = 0; i < ts.length; i++) {
    if (q.close == null || q.close[i] == null) continue;
    out.push({ ts: ts[i], o: num(q.open && q.open[i]), h: num(q.high && q.high[i]), l: num(q.low && q.low[i]),
               c: round(q.close[i]), v: q.volume && q.volume[i] != null ? q.volume[i] : null });
  }
  return out;
}
async function fromYahooDaily(t) {
  const res = await chart(t, 'range=1y&interval=1d');
  return res ? { meta: res.meta, bars: bars(res) } : null;
}
async function fromYahooIntraday(t) {
  const res = await chart(t, 'range=5d&interval=5m&includePrePost=true');
  return res ? { meta: res.meta, bars: bars(res) } : null;
}

/* ---------------- what the page gets ---------------- */
function shape(t, daily, intraday) {
  const m = daily.meta, s = daily.bars;
  const price = num(m.regularMarketPrice);
  // yesterday's close is the second-to-last daily close, not chartPreviousClose (that is the start of the range)
  const prev = s.length > 1 ? s[s.length - 2].c : null;
  const vols = s.slice(-31, -1).map(x => x.v).filter(v => v != null);
  let extended = null;
  if (intraday && intraday.bars.length) {
    const last = intraday.bars[intraday.bars.length - 1], ses = sessionOf(last.ts);
    if (ses === 'pre' || ses === 'post') extended = { session: ses, price: last.c, at: iso(last.ts) };
  }
  return {
    ticker: t,
    exchange: m.fullExchangeName || m.exchangeName || null,
    currency: m.currency || 'USD',
    price,
    prev_close: prev,
    change: price != null && prev != null ? round(price - prev) : null,
    change_pct: price != null && prev ? Math.round((price - prev) / prev * 10000) / 100 : null,
    day_high: num(m.regularMarketDayHigh),
    day_low: num(m.regularMarketDayLow),
    wk52_high: num(m.fiftyTwoWeekHigh),
    wk52_low: num(m.fiftyTwoWeekLow),
    volume: num(m.regularMarketVolume),
    avg_volume_30d: vols.length ? Math.round(vols.reduce((a, b) => a + b, 0) / vols.length) : null,
    as_of: m.regularMarketTime ? iso(m.regularMarketTime) : null,
    extended,
    delayed: true,
    source: SOURCE,
    series: s.map(x => ({ d: ymd(x.ts), c: x.c }))
  };
}

/* ---------------- keeping it ---------------- */
async function keep(db, t, daily, intraday) {
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS price_bars (ticker TEXT NOT NULL, ts INTEGER NOT NULL, session TEXT,
      o REAL, h REAL, l REAL, c REAL, v INTEGER, src TEXT NOT NULL, saved_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (ticker, ts, src))`),
    db.prepare(`CREATE TABLE IF NOT EXISTS price_daily (ticker TEXT NOT NULL, d TEXT NOT NULL,
      o REAL, h REAL, l REAL, c REAL, v INTEGER, src TEXT NOT NULL, saved_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (ticker, d, src))`)
  ]);
  const stmts = [];
  // only what we don't already have — the first visit keeps the whole year, later ones a few rows
  const lastBar = await db.prepare('SELECT MAX(ts) AS m FROM price_bars WHERE ticker=? AND src=?').bind(t, SOURCE).first();
  const lastDay = await db.prepare('SELECT MAX(d) AS m FROM price_daily WHERE ticker=? AND src=?').bind(t, SOURCE).first();
  const today = ymd(Date.now() / 1000);
  for (const b of (intraday ? intraday.bars : [])) {
    if (lastBar && lastBar.m && b.ts <= lastBar.m) continue;
    if (Date.now() / 1000 - b.ts < 600) continue;          // leave the bar that is still forming
    stmts.push(db.prepare('INSERT OR IGNORE INTO price_bars (ticker,ts,session,o,h,l,c,v,src) VALUES (?,?,?,?,?,?,?,?,?)')
      .bind(t, b.ts, sessionOf(b.ts), b.o, b.h, b.l, b.c, b.v, SOURCE));
  }
  for (const b of daily.bars) {
    const d = ymd(b.ts);
    if (d >= today) continue;                               // today's day is not finished
    if (lastDay && lastDay.m && d <= lastDay.m) continue;
    stmts.push(db.prepare('INSERT OR IGNORE INTO price_daily (ticker,d,o,h,l,c,v,src) VALUES (?,?,?,?,?,?,?,?)')
      .bind(t, d, b.o, b.h, b.l, b.c, b.v, SOURCE));
  }
  for (let i = 0; i < stmts.length; i += 90) await db.batch(stmts.slice(i, i + 90));
}

/* ---------------- time, in New York ---------------- */
const NY = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour12: false, hour: '2-digit', minute: '2-digit', weekday: 'short' });
function sessionOf(ts) {
  const p = Object.fromEntries(NY.formatToParts(new Date(ts * 1000)).map(x => [x.type, x.value]));
  const mins = (+p.hour % 24) * 60 + +p.minute;
  if (p.weekday === 'Sat' || p.weekday === 'Sun') return 'overnight';
  if (mins >= 240 && mins < 570) return 'pre';          // 4:00–9:30
  if (mins >= 570 && mins < 960) return 'regular';      // 9:30–16:00
  if (mins >= 960 && mins < 1200) return 'post';        // 16:00–20:00
  return 'overnight';                                   // 20:00–4:00
}
const iso = ts => new Date(ts * 1000).toISOString();
const ymd = ts => new Date(ts * 1000).toISOString().slice(0, 10);
const num = v => (typeof v === 'number' && isFinite(v) ? round(v) : null);
const round = v => Math.round(v * 10000) / 10000;
function json(o, status = 200, cc = 'no-store') {
  return new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json', 'cache-control': cc } });
}
