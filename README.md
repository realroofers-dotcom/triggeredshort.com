# triggeredshort.com

Research docket. Built by **Mark Nejmeh**, 2026-08-12, schema 1.0.

**Build order: database first, then the API, then the pages. See UPLOAD-ORDER.md.**
Static docket site. No build step, no dependencies.

## Files — upload all to the repo root

- index.html      — docket home, series index, comment-request status
- chronology.html — corporate chronology and capital structure, from filings
- data.html       — FINRA short interest, average daily volume, October 2025 day by day
- model.html      — warrant overhang calculator + the formulas
- example.html    — worked example: finding the four numbers in a real 10-Q
- forms.html      — SEC form reference, plain language
- schema.sql      — the research database, 19 tables + 3 views, incl. the meta table
- seed.sql        — everything gathered so far, ready to load
- functions/api/lookup.js — records a calculation
- functions/api/stats.js  — public totals only
- functions/api/log.js    — private export of calculations, requires LOG_KEY
- functions/api/hit.js    — records a page view
- functions/api/visits.js — private visitor summary, requires LOG_KEY
- functions/api/db.js     — read and write the research database, requires LOG_KEY
- functions/api/subscribe.js — email signup from the calculator page
- exhibits.html   — exhibit index A through L
- method.html     — definitions, standard of proof, corrections policy
- styles.css      — stylesheet for all pages
- og-card.png     — 1200x630 preview card for search and social
- sitemap.xml     — for search engines
- robots.txt      — allows everything except /api/

## Cloudflare Pages settings

- Framework preset: None
- Build command: (leave blank)
- Build output directory: /

## Adding a report

Copy chronology.html, change the title and the nav `aria-current`, replace the
content between `<main>` and `</main>`. Then add a row to the docket table in
index.html and set its status class:

  st-filed  green   Published
  st-prep   grey    In preparation
  st-hold   red     Held

## Before publishing anything on August 19

Update index.html — the comment request table needs a Response column showing
either the reply received or "No response received."

## The database

See SETUP-DATABASE.md. The site works fine without it — the calculator still
runs and the counter line stays empty.

Load `schema.sql` then `seed.sql` in the D1 console, bind the database as
`OVERHANG`, add `LOG_KEY` as a secret, redeploy.
