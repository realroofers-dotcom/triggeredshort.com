# Build order

Do these in sequence. The database goes first so the API has something to talk
to the moment it deploys, and the pages go last so nothing is live before the
things it depends on.

Built by Mark Nejmeh · 2026-08-12 · schema 1.0

---

## STEP 1 — The database

**Cloudflare dashboard → Storage & databases → D1 → Create database**

Name it exactly:

    overhang

Open it, click **Console**, and run these two files in this order:

1. **`schema.sql`** — creates 19 tables and 3 views, and writes the `meta`
   table with your name, contact, EDGAR filer details, and the build date.
2. **`seed.sql`** — loads everything gathered so far: the issuer, three reverse
   splits, eleven share counts, four financings with every agent fee, four
   warrant tranches, twenty-one chronology events, ninety-two FINRA short
   interest readings, thirteen parties, twenty-two roles, the four comment
   letters, and the six reports.

Paste each file whole. Run schema first. If you run seed first it will fail,
because the tables will not exist yet.

**Check it worked.** In the same console:

    SELECT k, v FROM meta WHERE k IN ('author','built','schema_version');

You should see your name, 2026-08-12, and 1.0.

---

## STEP 2 — Bindings and the key

**Workers & Pages → your project → Settings**

**Bindings → Add binding → D1 database**

- Variable name: `OVERHANG`   ← exactly this, capitals included
- Database: `overhang`

**Variables and Secrets → Add → type Secret**

- Name: `LOG_KEY`
- Value: a long random string you invent. Write it down somewhere safe.

Everything private on the site sits behind that key. Without it those
addresses return "Not found."

---

## STEP 3 — The API

Upload the `functions` folder to the repo, keeping its structure exactly:

    functions/api/db.js          read and write the research database
    functions/api/lookup.js      records a calculation
    functions/api/stats.js       public totals, no key needed
    functions/api/log.js         private export of calculations
    functions/api/hit.js         records a page view
    functions/api/visits.js      private visitor summary
    functions/api/subscribe.js   email signup

Cloudflare finds these by their path. `functions/api/db.js` becomes
`/api/db`. If the folder structure is flattened the routes will not exist.

---

## STEP 4 — Everything else

Upload to the repo root:

    index.html          the docket
    chronology.html     corporate chronology from filings
    data.html           FINRA short interest and October 2025 day by day
    model.html          the calculator and the formulas
    example.html        worked example on a real 10-Q
    forms.html          understanding SEC codes
    exhibits.html       exhibit index A to L
    method.html         definitions and corrections policy
    styles.css
    logo.png
    logo-sm.png
    favicon.png

Reference files, useful in the repo but not served as pages:

    schema.sql
    seed.sql
    README.md
    SETUP-DATABASE.md
    UPLOAD-ORDER.md

---

## STEP 5 — Deploy and check

Bindings only take effect on a **new** deployment. Go to **Deployments**, open
the latest, and choose **Retry deployment**.

Then, in order:

1. `https://triggeredshort.com` — the docket loads, logo in the masthead.
2. `https://triggeredshort.com/api/stats` — returns `{"total":0,...}`.
   If it errors, the D1 binding did not take.
3. `https://triggeredshort.com/api/db?key=YOUR_KEY&q=meta` — returns your
   name, contact details, EDGAR filer information, and the build date.
4. `https://triggeredshort.com/api/db?key=YOUR_KEY&q=recurrence` — returns
   the parties appearing at more than one issuer. That is Exhibit J.
5. Open the calculator, change a number, and confirm the readout moves.

---

## Where your name appears

- The `meta` table in the database, twenty-two rows including your contact
  details, EDGAR CIK and LTID, and the build date.
- `<meta name="author">`, `copyright`, `publisher` and `dcterms.creator` tags
  in the head of every page, which is what a search engine and an archive read.
- A build stamp in the footer of every page: *Built by Mark Nejmeh · 2026-08-12
  · schema 1.0 · Triggered Short™ is his own term.*
- The masthead and footer of every page.
