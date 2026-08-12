// POST /api/subscribe  {email, ticker, source}
const OK = /^[^@\s]+@[^@\s.]+\.[^@\s]{2,}$/;

export async function onRequestPost({ request, env }) {
  const json = (d, s) => new Response(JSON.stringify(d),
    { status: s || 200, headers: { 'content-type': 'application/json' } });

  if (!env.OVERHANG) return json({ ok: false, error: 'unavailable' }, 500);

  let b;
  try { b = await request.json(); } catch { return json({ ok: false }, 400); }

  const email = String(b.email || '').trim().toLowerCase().slice(0, 200);
  if (!OK.test(email)) return json({ ok: false, error: 'Enter a valid email address.' }, 400);

  const ticker = typeof b.ticker === 'string' ? b.ticker.trim().toUpperCase().slice(0, 12) : null;
  const source = b.source === 'calculator' ? 'calculator' : 'site';

  try {
    await env.OVERHANG.prepare(
      `INSERT OR IGNORE INTO subscribers (email,created_at,source,ticker,country)
       VALUES (?,?,?,?,?)`
    ).bind(email, new Date().toISOString(), source, ticker,
           request.cf?.country || null).run();
  } catch (e) {
    return json({ ok: false, error: 'Could not save that. Try again.' }, 500);
  }

  return json({ ok: true });
}
