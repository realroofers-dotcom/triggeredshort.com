# Collector setup — browser only, no command line

Everything below is done in the Cloudflare dashboard and GitHub in a browser. Nothing
here needs wrangler, Node, or a terminal.

## Why a separate Worker and not a Pages Function

Cloudflare Pages Functions do not support cron triggers. Only a Worker can run on a
schedule. So the collector lives beside the site rather than inside it, and both talk to
the same D1 database. Nothing about the existing site changes.

---

## Step 1 — Add the collector tables to D1

Cloudflare dashboard → Storage & Databases → D1 → **overhang** → Console.

Paste the whole contents of `6-collector-schema.sql` and run it. The file has no comment
lines and every statement is on its own line, so the console's line-break stripping
cannot damage it — same rule as the earlier seed files.

It creates four tables (`watchlist`, `filings`, `issuer_names`, `collector_runs`), four
indexes, three views, and seeds the watchlist with Theriva and Tonix.

Check it took:

    SELECT * FROM watchlist;

---

## Step 2 — Create the Worker

Dashboard → Compute (Workers & Pages) → **Create** → **Create Worker**.

- Name it **triggeredshort-collector**
- Deploy the "Hello World" starter it offers, then click **Edit code**
- Delete everything in the editor, paste the whole of `collector-worker.js`, click
  **Deploy**

---

## Step 3 — Bindings and variables

On the Worker → **Settings**.

**Bindings → Add → D1 database**
- Variable name: `OVERHANG` (exactly this, capitals)
- Database: `overhang`

**Variables and Secrets → Add**
- `SEC_UA` — plain text (not a secret). This is the User-Agent the SEC requires.
  Format: an identifiable name and a working contact address, e.g.
  `Foundation for Job Creation - Triggered Short research - you@yourdomain.com`
  Without it the SEC blocks the request, and the block is by IP address.
- `LOG_KEY` — **Secret**. Same value as the site's key. Letters and numbers only.

Then **Deploy** again. Secrets and bindings only take effect on a new deployment — same
trap as the site.

---

## Step 4 — Run it once by hand

Open in a browser tab:

    https://triggeredshort-collector.<your-subdomain>.workers.dev/?key=YOURKEY

The Worker's own URL is shown on its overview page. It returns JSON:

    {
      "ciks_checked": 2,
      "filings_seen": 1183,
      "filings_new": 1183,
      "names_new": 3,
      "status": "ok"
    }

The first run pulls roughly a year of filings for both companies at once. Every run after
that adds only what is new, because the accession number is the primary key and duplicates
are ignored rather than overwritten.

Read it back:

    ?key=YOURKEY&view=filings&limit=50
    ?key=YOURKEY&view=filings&cik=0000894158
    ?key=YOURKEY&view=names
    ?key=YOURKEY&view=runs
    ?key=YOURKEY&view=watchlist

`view=names` is the one to look at first. It rebuilds the name-change trail from the
SEC's own record — Synthetic Biologics to Theriva on the unchanged CIK, with the dates,
pulled automatically instead of typed.

---

## Step 5 — Put it on a schedule

Worker → Settings → **Triggers** → Cron Triggers → Add.

    0 22 * * 1-5

That is 22:00 UTC on weekdays — 6:00 PM Eastern in summer, after EDGAR's 5:30 PM cutoff,
so each run catches the whole filing day.

---

## Adding a company

One row. In the D1 console:

    INSERT INTO watchlist (cik, label, active) VALUES ('0000885590', 'iBio', 1);

The next run picks it up. Ten-digit CIK with leading zeros, in quotes.

---

## What this does and does not do

Does: pulls every filing for every watched CIK, stores form type, filing date, report
date, acceptance timestamp, 8-K item numbers, and direct links to the document and the
index page; rebuilds the former-name trail; logs every run.

Does not: read inside the documents, raise any flag, or make any judgment. That is the
next layer, and it is deliberately separate — the collector holds only facts the SEC
published, so anything built on top of it can be re-derived and checked by anyone with
the same accession numbers.
