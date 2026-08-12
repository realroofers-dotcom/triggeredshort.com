// POST /api/hit — records one page view.
// Stores no personal data: no IP, no name, no full user-agent string.
export async function onRequestPost({ request, env }) {
  if (!env.OVERHANG) return new Response('{}', {headers:{'content-type':'application/json'}});

  let b = {};
  try { b = await request.json(); } catch {}

  const ip = request.headers.get('CF-Connecting-IP') || '0.0.0.0';
  const buf = await crypto.subtle.digest('SHA-256',
    new TextEncoder().encode(ip + '|ts-visits'));
  const visitor = [...new Uint8Array(buf)].slice(0,6)
    .map(x => x.toString(16).padStart(2,'0')).join('');

  // referrer: host only, never the full URL
  let ref = null;
  try { if (b.ref) ref = new URL(b.ref).hostname.replace(/^www\./,''); } catch {}

  const ua = request.headers.get('user-agent') || '';
  const device = /Mobile|Android|iPhone/i.test(ua) ? 'mobile'
               : /iPad|Tablet/i.test(ua) ? 'tablet'
               : /bot|crawl|spider|slurp/i.test(ua) ? 'bot' : 'desktop';

  const path = typeof b.path === 'string' ? b.path.slice(0,120) : '/';

  await env.OVERHANG.prepare(
    `INSERT INTO visits (created_at,path,referrer,country,region,device,visitor)
     VALUES (?,?,?,?,?,?,?)`
  ).bind(
    new Date().toISOString(), path, ref,
    request.cf?.country || null,
    request.cf?.region  || null,
    device, visitor
  ).run();

  return new Response('{"ok":true}', {headers:{'content-type':'application/json'}});
}
