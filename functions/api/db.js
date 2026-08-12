// GET  /api/db?key=…&q=<name>   — run a named, read-only query
// POST /api/db?key=…            — insert rows: {table:"…", rows:[{…}]}
//
// Read-only by design: no SQL is accepted from the caller. Named queries only.

const QUERIES = {
  meta:          'SELECT k,v,updated_at FROM meta ORDER BY k',
  overhang:      'SELECT * FROM v_overhang',
  network:       'SELECT * FROM v_network',
  recurrence:    'SELECT * FROM v_recurrence',
  issuers:       'SELECT * FROM issuers ORDER BY ticker',
  events:        `SELECT e.event_date,e.kind,e.headline,e.detail,e.source,e.is_key,i.ticker
                    FROM events e JOIN issuers i ON i.id=e.issuer_id
                   ORDER BY e.event_date`,
  key_events:    `SELECT e.event_date,e.kind,e.headline,e.detail,e.source,i.ticker
                    FROM events e JOIN issuers i ON i.id=e.issuer_id
                   WHERE e.is_key=1 ORDER BY e.event_date`,
  short:         'SELECT * FROM short_interest ORDER BY ticker,settlement',
  short_moves:   `SELECT ticker,settlement,current_short,pct_change,avg_daily_vol
                    FROM short_interest WHERE ABS(pct_change) > 100
                   ORDER BY settlement`,
  financings:    `SELECT f.*,i.ticker FROM financings f JOIN issuers i ON i.id=f.issuer_id
                   ORDER BY f.priced_date`,
  warrants:      `SELECT w.*,i.ticker FROM warrants w JOIN issuers i ON i.id=w.issuer_id
                   ORDER BY w.issued_date`,
  shares:        `SELECT s.as_of,s.outstanding,s.authorized,s.source,i.ticker
                    FROM share_counts s JOIN issuers i ON i.id=s.issuer_id
                   ORDER BY s.as_of`,
  splits:        `SELECT sp.*,i.ticker FROM splits sp JOIN issuers i ON i.id=sp.issuer_id
                   ORDER BY sp.effective_date`,
  correspondence:'SELECT * FROM correspondence ORDER BY sent_date DESC',
  reports:       'SELECT * FROM reports ORDER BY sort_order',
  prices:        'SELECT * FROM prices ORDER BY ticker,d DESC LIMIT 2000',
  fails:         'SELECT * FROM fails ORDER BY ticker,fail_date DESC LIMIT 2000',
  lookups:       'SELECT * FROM lookups ORDER BY id DESC LIMIT 1000',
  subscribers:   'SELECT email,created_at,source,ticker,country FROM subscribers WHERE unsubscribed=0 ORDER BY id DESC',
  sub_count:     'SELECT COUNT(*) n FROM subscribers WHERE unsubscribed=0',
  top_tickers:   `SELECT ticker,COUNT(*) n,ROUND(AVG(overhang_pct),1) avg_overhang,
                         ROUND(MAX(overhang_pct),1) max_overhang
                    FROM lookups GROUP BY ticker ORDER BY n DESC LIMIT 100`
};

// tables the POST endpoint will write to, and the columns it accepts
const WRITABLE = {
  prices:         ['issuer_id','ticker','d','open','high','low','close','volume','source'],
  short_interest: ['issuer_id','ticker','settlement','current_short','previous_short','chg',
                   'pct_change','avg_daily_vol','days_to_cover','market'],
  fails:          ['issuer_id','ticker','fail_date','quantity','price'],
  filings:        ['issuer_id','form','filed_date','period_date','accession','url','headline','notes'],
  events:         ['issuer_id','event_date','kind','headline','detail','source','is_key'],
  share_counts:   ['issuer_id','as_of','outstanding','authorized','source'],
  parties:        ['name','kind','cik','address','notes'],
  roles:          ['party_id','issuer_id','issuer_name','role','start_date','end_date','filing_count','source','notes'],
  issuers:        ['cik','ticker','name','former_names','exchange','incorporated','incorporated_date','status','notes'],
  correspondence: ['issuer_id','direction','party','attention','kind','sent_date','delivered_date',
                   'due_date','tracking','method','response_date','response_text','exhibit','notes']
};

const auth = (url, env) => env.LOG_KEY && url.searchParams.get('key') === env.LOG_KEY;
const json = (d, s) => new Response(JSON.stringify(d, null, 2),
  { status: s || 200, headers: { 'content-type': 'application/json' } });

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  if (!auth(url, env)) return new Response('Not found', { status: 404 });
  if (!env.OVERHANG)   return json({ error: 'no database bound' }, 500);

  const name = url.searchParams.get('q') || 'issuers';
  const sql  = QUERIES[name];
  if (!sql) return json({ error: 'unknown query', available: Object.keys(QUERIES) }, 400);

  const { results } = await env.OVERHANG.prepare(sql).all();

  if (url.searchParams.get('format') === 'csv' && results.length) {
    const cols = Object.keys(results[0]);
    const esc = v => v == null ? '' : `"${String(v).replace(/"/g, '""')}"`;
    const csv = [cols.join(',')]
      .concat(results.map(r => cols.map(c => esc(r[c])).join(','))).join('\n');
    return new Response(csv, {
      headers: { 'content-type': 'text/csv',
                 'content-disposition': `attachment; filename="${name}.csv"` }
    });
  }
  return json(results);
}

export async function onRequestPost({ request, env }) {
  const url = new URL(request.url);
  if (!auth(url, env)) return new Response('Not found', { status: 404 });
  if (!env.OVERHANG)   return json({ error: 'no database bound' }, 500);

  let body;
  try { body = await request.json(); } catch { return json({ error: 'bad json' }, 400); }

  const table = body.table;
  const cols  = WRITABLE[table];
  if (!cols) return json({ error: 'table not writable', writable: Object.keys(WRITABLE) }, 400);

  const rows = Array.isArray(body.rows) ? body.rows : [];
  if (!rows.length) return json({ error: 'no rows' }, 400);
  if (rows.length > 2000) return json({ error: 'max 2000 rows per request' }, 400);

  const used = cols.filter(c => rows.some(r => r[c] !== undefined));
  if (!used.length) return json({ error: 'no recognised columns', accepted: cols }, 400);

  const sql = `INSERT OR REPLACE INTO ${table} (${used.join(',')}) ` +
              `VALUES (${used.map(() => '?').join(',')})`;
  const stmt = env.OVERHANG.prepare(sql);
  const batch = rows.map(r => stmt.bind(...used.map(c => r[c] ?? null)));

  await env.OVERHANG.batch(batch);
  return json({ ok: true, table, inserted: rows.length, columns: used });
}
