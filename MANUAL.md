# LOX — HOW TO USE IT

The admin page for triggeredshort.com.
Last updated 14 August 2026.

---

## SIGNING IN

Go to **triggeredshort.com/lox.html**

Type your username and password. That's it.

- You stay signed in for **12 hours**, or until you close the tab.
- Your password is sent in a hidden header, never in the address bar.
- Nobody can see your password, including the owner. It can only be replaced.

**Forgot it?** Ask an admin to set a new one. They cannot look yours up.

---

## THE THREE ROLES

| Role | In one line |
|---|---|
| **Viewer** | Can look at everything. Can change nothing. |
| **Editor** | Does the work — site text, watchlist, drafts. |
| **Admin** | Everything, plus people and publishing. |

You are told your role at the top of the page, next to your name.

---

## WHAT YOU'LL SEE

### Crawl
A progress bar. The system reads every public company on the US exchanges —
10,398 of them — and records where each is incorporated, whether it was once a
shell, and how many times it changed its name.

It reads the oldest registrants first. That means the early numbers lean toward
Delaware and will shift as it finishes. The page says so under the figures.

**Recalculate now** — forces the numbers to update immediately. They update on
their own every minute anyway.

### Where they are incorporated
Live counts: Nevada, Delaware, Texas, how many companies have changed names,
how many share a business address with another company.

### Site values
The text and numbers shown on the public pages.

- **Grey tag `auto`** — calculated from the database, refreshed every minute.
- **Green tag `manual`** — typed by a person, never overwritten.

**Editing an auto value turns it manual.** It will stop updating from then on.
That's sometimes what you want. Usually it isn't.

To change something: type in the box, press **Save**.
To add something new: use the **Add a value** box at the bottom.

### Watchlist
The companies the system follows closely — every filing, every name change.

To add one you need its **CIK**, the SEC's number for that company. Find it by
searching the company on sec.gov. Paste the number, give it a name, press Add.

Switching a company off stops the tracking but keeps everything already collected.

### Export
Any table as a spreadsheet file. Click the name, it downloads.

---

## THINGS THAT SURPRISE PEOPLE

**Blank is not zero.** Where a figure shows blank or "unknown," it means the
company did not report it — not that the answer is none. Never read a blank as
a clean record.

**Partial is not final.** While the crawl is running, every percentage will
move. Don't quote a number to anyone until the bar reads 100%.

**Auto values fight back.** If you edit one and it keeps changing, you edited it
somewhere else too, or a second person is editing at the same time.

---

## IF SOMETHING GOES WRONG

| What you see | What it means |
|---|---|
| "Sign in failed" | Wrong username or password |
| "This account is switched off" | An admin disabled it. Ask them |
| "Not permitted" | Your role doesn't allow that action |
| "Read only account" | You're a Viewer |
| Page won't load anything | Your session expired. Sign in again |

---
---

# FOR ADMINS ONLY

Everything below requires an admin account.

## MANAGING PEOPLE

The **People** panel lists every account.

**Add someone:** username, name, role, password (8 characters minimum). Press Add.

**Change a role:** use the dropdown. Takes effect on their next action.

**Set a new password:** type it in their row, press Set. You cannot see the old one.

**Switch someone off:** press *Switch off*. Their session dies immediately —
mid-click, not at the end of the day. Their password is kept. Switch them back
on and it works again, unchanged.

**Delete:** removes the account entirely. There is no undo.

You cannot switch off, demote, or delete **your own** account. That's deliberate —
it stops the last admin from locking everyone out.

## THE MASTER KEY

There is one master key that always works and is always admin. It's the way back
in if every account is lost.

- Keep it somewhere other than this system.
- Anyone holding it has full control.
- Rotate it if it's ever seen — a screenshot counts as seen.

## SIGN-IN HISTORY

Every attempt is recorded: who, when, whether it worked, why it failed, and what
country it came from. Failures are recorded too. Worth a look now and then.

## PUBLISHING

**Publish is admin-only and is not delegated.**

Editors draft. Admins publish. Everything on that site goes out under one
byline, and the person whose name it is decides what carries it.

## THE PERMISSIONS TABLE

The full table lives in the admin page itself, under **What each role may do**.

It is read from the server, not typed into the page — it is the same table the
system actually enforces. If the table says an Editor cannot publish, that is
not a description of the rule, it is the rule.

Seventeen permissions across three roles. Viewing that table is itself a
permission, held by Editors and Admins.

## WHAT THIS IS NOT

Obscure page names and passwords cut down noise. They are not a lock.

The real lock is **Cloudflare Access** in front of the worker — an allow-list of
email addresses, with a one-time code. Until that's on, treat the key and the
passwords as the only thing standing between this system and anyone who finds
the page.

---

*Corrections to this manual: tell the owner. It is kept current as the system
changes, and the date at the top says when it was last true.*
