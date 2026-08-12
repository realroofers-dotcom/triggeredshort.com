# The research database

A proper database, not a log. It holds every fact behind the reports with a
source next to it, and it is built so the same analysis can be run on a second
company without starting over.

The site works without it. Set it up when you want it.

---

## Step 1 — Create the database

Cloudflare dashboard → **Storage & databases → D1** → **Create database**.
Name it `overhang`.

Open it, click **Console**, paste the whole of `schema.sql`, and run.

Then paste the whole of `seed.sql` and run. That loads everything gathered so
far: the issuer, three reverse splits, eleven share counts, four financings,
four warrant tranches, twenty-one chronology events, ninety-two FINRA short
interest readings, thirteen parties, twenty-two roles, the four comment
letters, and the six reports.

## Step 2 — Bind it to the site

**Workers & Pages** → your project → **Settings** → **Bindings**
→ **Add binding** → **D1 database**.

- Variable name: `OVERHANG`   ← exactly this
- Database: `overhang`

## Step 3 — Add your key

Same Settings page → **Variables and Secrets** → **Add** → type **Secret**.

- Name: `LOG_KEY`
- Value: a long random string you invent. Write it down.

Everything private is behind that key. Without it those addresses return
"Not found."

## Step 4 — Redeploy

Bindings only take effect on a new deployment. **Deployments** → open the
latest → **Retry deployment**.

---

## What is in it

| Table | Holds |
|---|---|
| `issuers` | One row per company under study. CIK, ticker, former names, state of incorporation. |
| `filings` | The document index. Everything else can point back to a filing. |
| `events` | The chronology. Dated corporate actions with a source. |
| `share_counts` | Outstanding and authorized shares by date. |
| `splits` | Reverse splits — ratio, whether shareholders voted, counts before and after. |
| `financings` | Each raise. Price, shares, gross, agent, agent's fee, counsel, prior close. |
| `warrants` | Each tranche. Strike, original strike if repriced, blocker, exercised, outstanding. |
| `short_interest` | FINRA, twice monthly. |
| `fails` | SEC fails to deliver, twice monthly. |
| `prices` | Daily open, high, low, close, volume. |
| `parties` | Counsel, agents, funds, directors, auditors. |
| `roles` | A party's connection to an issuer, with dates and a filing count. **This is Exhibit J.** |
| `correspondence` | Demands and comment letters, sent and received. |
| `reports` | The series index that drives the docket page. |
| `lookups` | What readers calculate. |
| `visits` | Page views. |
| `subscribers` | Email addresses from the calculator page. |

Three views answer the questions asked most:

- `v_overhang` — current shares, warrants and last close for every issuer
- `v_network` — every party and every issuer they appear at
- `v_recurrence` — parties appearing at more than one issuer, ranked

---

## Reading it

    /api/db?key=YOUR_KEY&q=recurrence
    /api/db?key=YOUR_KEY&q=key_events
    /api/db?key=YOUR_KEY&q=short_moves
    /api/db?key=YOUR_KEY&q=warrants

Add `&format=csv` to any of them to download a spreadsheet.

Available queries: `overhang`, `network`, `recurrence`, `issuers`, `events`,
`key_events`, `short`, `short_moves`, `financings`, `warrants`, `shares`,
`splits`, `correspondence`, `reports`, `prices`, `fails`, `lookups`,
`top_tickers`, `subscribers`, `sub_count`.

Your email list:

    /api/db?key=YOUR_KEY&q=subscribers&format=csv

That downloads a CSV ready to import into Substack — Substack's importer
takes an email column.

`short_moves` returns every settlement date where reported short interest moved
more than 100 percent. `recurrence` returns every party appearing at more than
one issuer. Those two are where the work is.

---

## Adding data

POST to the same address. No SQL is ever accepted from the caller — only a
table name and rows.

    POST /api/db?key=YOUR_KEY
    {
      "table": "prices",
      "rows": [
        {"ticker":"TOVX","d":"2026-08-12","open":0.2279,"high":0.24,
         "low":0.23,"close":0.2339,"volume":327981,"source":"exchange history"}
      ]
    }

Up to 2000 rows per request. Existing rows with the same key are replaced, so
re-importing the same file is safe.

Writable tables: `prices`, `short_interest`, `fails`, `filings`, `events`,
`share_counts`, `parties`, `roles`, `issuers`, `correspondence`.

### Turning a CSV into rows

Paste the CSV into any spreadsheet, then use a formula to build the JSON, or
ask for a converter and one will be written for the specific file. The FINRA
short interest export and the SEC fails-to-deliver files both come as
delimited text and load the same way.

---

## Adding a second company

1. `POST` a row to `issuers` with its CIK, ticker and name.
2. Load its short interest from FINRA, its prices, and its filings.
3. Add its counsel, placement agent and directors to `parties`, and one row
   per connection to `roles`.
4. Run `/api/db?key=…&q=recurrence`.

If the same names come back, that is the finding.

---

## The email gate

On the calculator page, near the top of the script:

    var REQUIRE_EMAIL = false;

Left as `false`, the results show immediately and the email ask sits
underneath. Set it to `true` and the results are blurred until an address is
entered.

The case for leaving it `false`: the formulas are printed further down the same
page, so anyone can do the arithmetic in a spreadsheet regardless. A hard gate
stops the casual reader and irritates the serious one — and the serious one is
the reporter or the examiner you built this for.

Whichever you choose, the address is remembered in the browser so a returning
reader is not asked twice.

## What is stored about people

Nothing that identifies a reader. No name, no email, no address, no IP.

Page views record the path, the referring site's domain only, country and
region, and whether the device is a phone or a computer. Calculator use records
the ticker and figures a reader types.

Email addresses given on the calculator page are stored in `subscribers`, with
the date, the ticker the reader was looking at, and a country code. They are
used to send the reports and for nothing else.

`parties` and `roles` hold the names of firms and individuals in their
professional capacity, taken from filings. They are not private individuals'
records and contain nothing beyond what the filings show.
