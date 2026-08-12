// POST /api/lookup — records one overhang calculation.
// Binding required: D1 database bound as OVERHANG

const LIMIT_PER_HOUR = 40;

async function hashIp(ip, salt) {
  const data = new TextEncoder().encode(ip + '|' + salt);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].slice(0, 8)
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

const num = v => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

const clean = (v, max) =>
  typeof v === 'string' ? v.trim().slice(0, max).replace(/[<>]/g, '') : null;

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.OVERHANG) {
    return new Response(JSON.stringify({ ok: false, error: 'no database bound' }),
      { status: 500, headers: { 'content-type': 'application/json' } });
  }

  let body;
  try { body = await request.json(); }
  catch { return new Response(JSON.stringify({ ok: false }), { status: 400 }); }

  const ip = request.headers.get('CF-Connecting-IP') || '0.0.0.0';
  const ipHash = await hashIp(ip, 'triggeredshort');
  const country = request.cf && request.cf.country ? request.cf.country : null;

  // rate limit by hashed ip
  const since = new Date(Date.now() - 3600e3).toISOString();
  const { results: r } = await env.OVERHANG
    .prepare('SELECT COUNT(*) AS n FROM lookups WHERE ip_hash = ? AND created_at > ?')
    .bind(ipHash, since).all();
  if (r && r[0] && r[0].n >= LIMIT_PER_HOUR) {
    return new Response(JSON.stringify({ ok: false, error: 'rate limited' }),
      { status: 429, headers: { 'content-type': 'application/json' } });
  }

  const ticker = clean(body.ticker, 12);
  if (!ticker) {
    return new Response(JSON.stringify({ ok: false, error: 'ticker required' }),
      { status: 400, headers: { 'content-type': 'application/json' } });
  }

  await env.OVERHANG.prepare(
    `INSERT INTO lookups
       (created_at,ticker,company,shares,warrants,strike,price,
        overhang_pct,dilution_pct,gap_pct,country,ip_hash)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
  ).bind(
    new Date().toISOString(),
    ticker.toUpperCase(),
    clean(body.company, 120),
    num(body.shares), num(body.warrants), num(body.strike), num(body.price),
    num(body.overhang), num(body.dilution), num(body.gap),
    country, ipHash
  ).run();

  return new Response(JSON.stringify({ ok: true }),
    { headers: { 'content-type': 'application/json' } });
}
