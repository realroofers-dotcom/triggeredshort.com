-- =====================================================================
-- triggeredshort.com — research database
-- Cloudflare D1 (SQLite). Run once in D1 -> Console.
--
-- Built so the same analysis can be run on a second company without
-- starting over. Every table holding a fact carries a source column.
-- =====================================================================

-- META — who built this, when, and what version -----------------------
CREATE TABLE IF NOT EXISTS meta (
  k          TEXT PRIMARY KEY,
  v          TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);

INSERT OR REPLACE INTO meta (k,v) VALUES
 ('project',        'Triggered Short(TM) — research docket'),
 ('site',           'triggeredshort.com'),
 ('contact_site',   'marknejmeh.com'),
 ('author',         'Mark Nejmeh'),
 ('author_role',    'Author and researcher'),
 ('publisher',      'Foundation for Job Creation'),
 ('organization',   'Foundation for Job Creation, a 501(c)(3)'),
 ('address',        'P.O. Box 589, Clifton, New Jersey 07012'),
 ('phone',          '732-995-3914'),
 ('email',          'realroofers@gmail.com'),
 ('sec_cik',        '0001860507'),
 ('sec_ltid',       '71743954'),
 ('sec_file_no',    '150-11431'),
 ('sec_form_13h',   'accepted 2021-05-04'),
 ('framework',      'Triggered Short(TM), coined by Mark Nejmeh'),
 ('schema_version', '1.0'),
 ('built',          '2026-08-12'),
 ('built_by',       'Mark Nejmeh'),
 ('copyright',      '(c) 2026 Mark Nejmeh. Research and analysis. All rights reserved.'),
 ('disclosure',     'The author holds shares of Theriva Biologics, Inc. (NYSE American: TOVX) and formerly held shares of iBio, Inc. (IBIO).'),
 ('sources',        'SEC EDGAR; FINRA equity short interest; exchange price history; corporate records requests.'),
 ('data_seeded',    '2026-08-12'),
 ('finra_pull',     'Equity short interest for TOVX downloaded 2026-08-12');


-- ISSUERS -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS issuers (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  cik           TEXT UNIQUE,
  ticker        TEXT,
  name          TEXT NOT NULL,
  former_names  TEXT,
  exchange      TEXT,
  incorporated  TEXT,
  incorporated_date TEXT,
  status        TEXT DEFAULT 'tracking',
  notes         TEXT,
  created_at    TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_iss_ticker ON issuers(ticker);

-- FILINGS -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS filings (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  issuer_id   INTEGER NOT NULL REFERENCES issuers(id),
  form        TEXT NOT NULL,
  filed_date  TEXT NOT NULL,
  period_date TEXT,
  accession   TEXT,
  url         TEXT,
  headline    TEXT,
  notes       TEXT,
  created_at  TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_fil_issuer ON filings(issuer_id, filed_date);
CREATE INDEX IF NOT EXISTS idx_fil_form   ON filings(form);

-- EVENTS (the chronology) ---------------------------------------------
CREATE TABLE IF NOT EXISTS events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  issuer_id   INTEGER NOT NULL REFERENCES issuers(id),
  event_date  TEXT NOT NULL,
  kind        TEXT,
  headline    TEXT NOT NULL,
  detail      TEXT,
  filing_id   INTEGER REFERENCES filings(id),
  source      TEXT,
  is_key      INTEGER DEFAULT 0,
  created_at  TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ev_issuer ON events(issuer_id, event_date);

-- SHARE COUNTS --------------------------------------------------------
CREATE TABLE IF NOT EXISTS share_counts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  issuer_id   INTEGER NOT NULL REFERENCES issuers(id),
  as_of       TEXT NOT NULL,
  outstanding REAL,
  authorized  REAL,
  source      TEXT,
  filing_id   INTEGER REFERENCES filings(id),
  UNIQUE(issuer_id, as_of)
);
CREATE INDEX IF NOT EXISTS idx_sc_issuer ON share_counts(issuer_id, as_of);

-- SPLITS --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS splits (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  issuer_id      INTEGER NOT NULL REFERENCES issuers(id),
  effective_date TEXT NOT NULL,
  ratio_from     REAL,
  ratio_to       REAL,
  board_approved TEXT,
  holder_vote    INTEGER,
  shares_before  REAL,
  shares_after   REAL,
  auth_before    REAL,
  auth_after     REAL,
  source         TEXT
);

-- FINANCINGS ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS financings (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  issuer_id     INTEGER NOT NULL REFERENCES issuers(id),
  priced_date   TEXT,
  closed_date   TEXT,
  kind          TEXT,
  price         REAL,
  shares        REAL,
  prefunded     REAL,
  gross         REAL,
  net           REAL,
  agent         TEXT,
  agent_role    TEXT,
  agent_fee_pct REAL,
  agent_fee     REAL,
  agent_expenses REAL,
  issuer_counsel TEXT,
  prior_close   REAL,
  close_that_day REAL,
  filing_id     INTEGER REFERENCES filings(id),
  notes         TEXT
);
CREATE INDEX IF NOT EXISTS idx_fin_issuer ON financings(issuer_id, priced_date);

-- WARRANT TRANCHES ----------------------------------------------------
CREATE TABLE IF NOT EXISTS warrants (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  issuer_id     INTEGER NOT NULL REFERENCES issuers(id),
  label         TEXT,
  issued_date   TEXT,
  shares        REAL,
  strike        REAL,
  original_strike REAL,
  repriced_date TEXT,
  term_years    REAL,
  expires       TEXT,
  blocker_pct   REAL,
  prefunded     INTEGER DEFAULT 0,
  exercisable   INTEGER DEFAULT 1,
  vote_required TEXT,
  exercised     REAL DEFAULT 0,
  outstanding   REAL,
  financing_id  INTEGER REFERENCES financings(id),
  filing_id     INTEGER REFERENCES filings(id),
  notes         TEXT
);
CREATE INDEX IF NOT EXISTS idx_war_issuer ON warrants(issuer_id);

-- SHORT INTEREST ------------------------------------------------------
CREATE TABLE IF NOT EXISTS short_interest (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  issuer_id     INTEGER REFERENCES issuers(id),
  ticker        TEXT NOT NULL,
  settlement    TEXT NOT NULL,
  current_short REAL,
  previous_short REAL,
  chg           REAL,
  pct_change    REAL,
  avg_daily_vol REAL,
  days_to_cover REAL,
  market        TEXT,
  UNIQUE(ticker, settlement)
);
CREATE INDEX IF NOT EXISTS idx_si_ticker ON short_interest(ticker, settlement);

-- FAILS TO DELIVER ----------------------------------------------------
CREATE TABLE IF NOT EXISTS fails (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  issuer_id  INTEGER REFERENCES issuers(id),
  ticker     TEXT NOT NULL,
  fail_date  TEXT NOT NULL,
  quantity   REAL,
  price      REAL,
  UNIQUE(ticker, fail_date)
);
CREATE INDEX IF NOT EXISTS idx_ftd_ticker ON fails(ticker, fail_date);

-- PRICES --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS prices (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  issuer_id INTEGER REFERENCES issuers(id),
  ticker    TEXT NOT NULL,
  d         TEXT NOT NULL,
  open      REAL, high REAL, low REAL, close REAL, volume REAL,
  source    TEXT,
  UNIQUE(ticker, d)
);
CREATE INDEX IF NOT EXISTS idx_px_ticker ON prices(ticker, d);

-- PARTIES -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS parties (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  name     TEXT NOT NULL,
  kind     TEXT,
  cik      TEXT,
  address  TEXT,
  notes    TEXT,
  UNIQUE(name, kind)
);

-- ROLES (Exhibit J) ---------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  party_id   INTEGER NOT NULL REFERENCES parties(id),
  issuer_id  INTEGER REFERENCES issuers(id),
  issuer_name TEXT,
  role       TEXT,
  start_date TEXT,
  end_date   TEXT,
  filing_count INTEGER,
  source     TEXT,
  notes      TEXT
);
CREATE INDEX IF NOT EXISTS idx_roles_party  ON roles(party_id);
CREATE INDEX IF NOT EXISTS idx_roles_issuer ON roles(issuer_id);

-- CORRESPONDENCE ------------------------------------------------------
CREATE TABLE IF NOT EXISTS correspondence (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  issuer_id   INTEGER REFERENCES issuers(id),
  direction   TEXT,
  party       TEXT,
  attention   TEXT,
  kind        TEXT,
  sent_date   TEXT,
  delivered_date TEXT,
  due_date    TEXT,
  tracking    TEXT,
  method      TEXT,
  response_date TEXT,
  response_text TEXT,
  exhibit     TEXT,
  notes       TEXT
);

-- REPORTS -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reports (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  number      TEXT,
  title       TEXT,
  summary     TEXT,
  status      TEXT,
  hold_until  TEXT,
  published   TEXT,
  url         TEXT,
  sort_order  INTEGER
);

-- PUBLIC USE ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS lookups (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at   TEXT NOT NULL,
  ticker       TEXT,
  company      TEXT,
  shares       REAL, warrants REAL, strike REAL, price REAL,
  overhang_pct REAL, dilution_pct REAL, gap_pct REAL,
  country      TEXT,
  ip_hash      TEXT
);
CREATE INDEX IF NOT EXISTS idx_lookups_ticker   ON lookups(ticker);
CREATE INDEX IF NOT EXISTS idx_lookups_created  ON lookups(created_at);
CREATE INDEX IF NOT EXISTS idx_lookups_overhang ON lookups(overhang_pct);

CREATE TABLE IF NOT EXISTS visits (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL,
  path       TEXT, referrer TEXT, country TEXT, region TEXT,
  device     TEXT, visitor TEXT
);
CREATE INDEX IF NOT EXISTS idx_visits_created  ON visits(created_at);
CREATE INDEX IF NOT EXISTS idx_visits_path     ON visits(path);
CREATE INDEX IF NOT EXISTS idx_visits_referrer ON visits(referrer);

-- VIEWS ---------------------------------------------------------------
CREATE VIEW IF NOT EXISTS v_overhang AS
SELECT i.ticker, i.name,
  (SELECT outstanding FROM share_counts s WHERE s.issuer_id=i.id ORDER BY as_of DESC LIMIT 1) AS shares,
  (SELECT SUM(outstanding) FROM warrants w WHERE w.issuer_id=i.id) AS warrants,
  (SELECT close FROM prices p WHERE p.ticker=i.ticker ORDER BY d DESC LIMIT 1) AS last_close
FROM issuers i;

CREATE VIEW IF NOT EXISTS v_network AS
SELECT p.name AS party, p.kind, r.role,
       COALESCE(i.name, r.issuer_name) AS issuer,
       i.ticker, r.start_date, r.filing_count, r.source
FROM roles r
JOIN parties p ON p.id=r.party_id
LEFT JOIN issuers i ON i.id=r.issuer_id
ORDER BY p.name, r.filing_count DESC;

CREATE VIEW IF NOT EXISTS v_recurrence AS
SELECT p.name AS party, p.kind,
       COUNT(DISTINCT COALESCE(i.name, r.issuer_name)) AS issuers,
       SUM(COALESCE(r.filing_count,0)) AS total_filings
FROM roles r
JOIN parties p ON p.id=r.party_id
LEFT JOIN issuers i ON i.id=r.issuer_id
GROUP BY p.id
HAVING issuers > 1
ORDER BY issuers DESC, total_filings DESC;

-- SUBSCRIBERS ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS subscribers (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  email       TEXT NOT NULL UNIQUE,
  created_at  TEXT NOT NULL,
  source      TEXT,      -- calculator | site
  ticker      TEXT,      -- what they were looking at when they signed up
  country     TEXT,
  confirmed   INTEGER DEFAULT 0,
  unsubscribed INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_sub_created ON subscribers(created_at);
