# triggeredshort.com

Static docket site. No build step, no dependencies.

## Files — upload all to the repo root

- index.html      — docket home, series index, comment-request status
- chronology.html — corporate chronology and capital structure, from filings
- data.html       — FINRA short interest, average daily volume, October 2025 day by day
- model.html      — warrant overhang calculator (vanilla JS, no dependencies)
- exhibits.html   — exhibit index A through L
- method.html     — definitions, standard of proof, corrections policy
- styles.css      — stylesheet for all pages

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
