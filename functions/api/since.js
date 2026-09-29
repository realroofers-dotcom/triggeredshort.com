// GET /api/since?t=TOVX&d=2019-08-26,2019-12-05 — what the stock did since each date. Built 2026-09-28 · since-1b.
// For the officer cards: "an eye on their career performance" (his rule, 28 Sep 2026). The card shows the move
// in the share price since the person's first insider filing at the company, as a number, never an adjective.
//
// Prices are monthly closes ADJUSTED FOR EVERY SPLIT, so a reverse split cannot hide the fall: the close on the
// first month on or after each date, against the latest close.
//
// ⚠ THE SOURCE IS A STAND-IN (Yahoo chart, monthly, full history), like /api/quote. Move to a licensed feed
// before selling on it. Only fromYahoo() knows the source.

const UA = { headers: { 'user-agent': 'Mozilla/5.0 (8K10Q cards)' } };

export async function onRequestGet({ request, waitUntil }) {
  const u = new URL(request.url);
  const t = (u.searchParams.get('t') || '').trim().toUpperCase();
  const dates = (u.searchParams.get('d') || '').split(',').map(s => s.trim()).filter(s => /^\d{4}-\d{2}-\d{2}$/.test(s)).slice(0, 20);
  if (!/^[A-Z][A-Z0-9.\-]{0,9}$/.test(t) || !dates.length) return json({ ok: false, error: 'give ?t=SYMBOL&d=YYYY-MM-DD[,YYYY-MM-DD]' }, 400);

  const cache = caches.default;
  const key = new Request('https://8k10q.com/api/since?t=' + t + '&d=' + dates.join(','));
  const hit = await cache.match(key);
  if (hit) return hit;

  let bars, splits;
  try { ({ bars, splits } = await fromYahoo(t)); } catch (e) { return json({ ok: false, ticker: t, error: 'no price history just now' }, 502); }
  if (!bars.length) return json({ ok: false, ticker: t, error: 'no price history for this symbol' }, 404);

  const last = bars[bars.length - 1];
  const since = {};
  for (const d of dates) {
    const b = bars.find(x => x.d >= d.slice(0, 7));   // the first month on or after the date
    since[d] = b && b.c > 0 && last.c > 0
      ? { from_month: b.d, from_close: b.c, to_close: last.c, pct: Math.round((last.c / b.c - 1) * 1000) / 10 }
      : { from_month: null, note: 'no price on record for that date' };
  }
  const res = json({ ok: true, build: 'since-1b', ticker: t, latest_month: last.d, adjusted: 'for every split', src: 'yahoo (stand-in)', since, splits }, 200, 'public, max-age=86400');
  waitUntil(cache.put(key, res.clone()));
  return res;
}

async function fromYahoo(t) {
  const r = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/' + encodeURIComponent(t) + '?interval=1mo&range=max&events=split', UA);
  if (!r.ok) throw new Error('source ' + r.status);
  const j = await r.json();
  const res = j && j.chart && j.chart.result && j.chart.result[0];
  if (!res || !res.timestamp) return { bars: [], splits: [] };
  const splits = Object.values((res.events && res.events.splits) || {}).map(s => ({ date: new Date(s.date * 1000).toISOString().slice(0, 10), ratio: s.splitRatio || (s.numerator + ':' + s.denominator) })).sort((a, b) => a.date.localeCompare(b.date));
  const q = (res.indicators && res.indicators.quote && res.indicators.quote[0]) || {};
  const out = [];
  res.timestamp.forEach((ts, i) => {
    const c = q.close && q.close[i];
    if (typeof c === 'number' && isFinite(c) && c > 0) out.push({ t: ts, d: new Date(ts * 1000).toISOString().slice(0, 7), c: Math.round(c * 1e6) / 1e6 });
  });
  return { bars: out, splits };
}

function json(o, status = 200, cc = 'no-store') {
  return new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json', 'cache-control': cc, 'access-control-allow-origin': '*' } });
}
