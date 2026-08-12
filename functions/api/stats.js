// GET /api/stats — public aggregate only. No company is ever named here.
export async function onRequestGet({ env }) {
  const empty = { total: 0, tickers: 0, week: 0 };
  if (!env.OVERHANG) {
    return new Response(JSON.stringify(empty),
      { headers: { 'content-type': 'application/json' } });
  }
  const week = new Date(Date.now() - 7 * 864e5).toISOString();
  const { results } = await env.OVERHANG.prepare(
    `SELECT
       (SELECT COUNT(*)            FROM lookups) AS total,
       (SELECT COUNT(DISTINCT ticker) FROM lookups) AS tickers,
       (SELECT COUNT(*)            FROM lookups WHERE created_at > ?) AS week`
  ).bind(week).all();

  return new Response(JSON.stringify(results[0] || empty), {
    headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=300' }
  });
}
