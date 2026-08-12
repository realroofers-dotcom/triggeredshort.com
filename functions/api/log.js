// GET /api/log?key=… — private research export. Not linked from the site.
// Binding required: env.LOG_KEY (a secret you set in Cloudflare)
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const key = url.searchParams.get('key');

  const hdr = request.headers.get('X-Auth-Key');
  if (!env.LOG_KEY || (hdr || key) !== env.LOG_KEY) {
    return new Response('Not found', { status: 404 });
  }
  if (!env.OVERHANG) return new Response('No database bound', { status: 500 });

  const limit = Math.min(parseInt(url.searchParams.get('limit') || '500', 10), 5000);
  const { results } = await env.OVERHANG.prepare(
    `SELECT created_at,ticker,company,shares,warrants,strike,price,
            overhang_pct,dilution_pct,gap_pct,country
       FROM lookups ORDER BY id DESC LIMIT ?`
  ).bind(limit).all();

  if (url.searchParams.get('format') === 'csv') {
    const cols = ['created_at','ticker','company','shares','warrants','strike',
                  'price','overhang_pct','dilution_pct','gap_pct','country'];
    const esc = v => v == null ? '' : `"${String(v).replace(/"/g,'""')}"`;
    const csv = [cols.join(',')]
      .concat(results.map(r => cols.map(c => esc(r[c])).join(','))).join('\n');
    return new Response(csv, {
      headers: {
        'content-type': 'text/csv',
        'content-disposition': 'attachment; filename="overhang-lookups.csv"'
      }
    });
  }

  return new Response(JSON.stringify(results, null, 2),
    { headers: { 'content-type': 'application/json' } });
}
