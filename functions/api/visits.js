// GET /api/visits?key=… — private. Not linked from the site.
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  if (!env.LOG_KEY || url.searchParams.get('key') !== env.LOG_KEY)
    return new Response('Not found', { status: 404 });
  if (!env.OVERHANG) return new Response('No database bound', { status: 500 });

  const db = env.OVERHANG;
  const day  = new Date(Date.now() - 864e5).toISOString();
  const week = new Date(Date.now() - 7*864e5).toISOString();

  const q = async (sql, ...a) => (await db.prepare(sql).bind(...a).all()).results;

  const view = url.searchParams.get('view');

  if (view === 'recent') {
    const rows = await q(
      `SELECT created_at,path,referrer,country,region,device
         FROM visits ORDER BY id DESC LIMIT ?`,
      Math.min(parseInt(url.searchParams.get('limit')||'300',10), 5000));
    return json(rows);
  }

  const [totals] = await q(
    `SELECT (SELECT COUNT(*) FROM visits) AS all_time,
            (SELECT COUNT(*) FROM visits WHERE created_at > ?) AS week,
            (SELECT COUNT(*) FROM visits WHERE created_at > ?) AS day,
            (SELECT COUNT(DISTINCT visitor) FROM visits WHERE created_at > ?) AS visitors_week`,
    week, day, week);

  return json({
    totals,
    pages:      await q(`SELECT path,COUNT(*) n FROM visits WHERE created_at > ? GROUP BY path ORDER BY n DESC LIMIT 30`, week),
    referrers:  await q(`SELECT referrer,COUNT(*) n FROM visits WHERE created_at > ? AND referrer IS NOT NULL GROUP BY referrer ORDER BY n DESC LIMIT 40`, week),
    countries:  await q(`SELECT country,COUNT(*) n FROM visits WHERE created_at > ? GROUP BY country ORDER BY n DESC LIMIT 40`, week),
    regions:    await q(`SELECT country,region,COUNT(*) n FROM visits WHERE created_at > ? AND region IS NOT NULL GROUP BY country,region ORDER BY n DESC LIMIT 40`, week),
    devices:    await q(`SELECT device,COUNT(*) n FROM visits WHERE created_at > ? GROUP BY device ORDER BY n DESC`, week),
    daily:      await q(`SELECT substr(created_at,1,10) d,COUNT(*) n FROM visits GROUP BY d ORDER BY d DESC LIMIT 60`),
    top_tickers:await q(`SELECT ticker,COUNT(*) n,ROUND(AVG(overhang_pct),1) avg_overhang
                           FROM lookups GROUP BY ticker ORDER BY n DESC LIMIT 40`)
  });
}

const json = d => new Response(JSON.stringify(d, null, 2),
  { headers: { 'content-type': 'application/json' } });
