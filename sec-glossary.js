/* ============================================================================
   sec-glossary.js  —  Triggered Short
   Drop-in term highlighter for SEC filing text.

   Usage — load this file with a script tag pointing at /sec-glossary.js,
   then call:

     SECGlossary.annotate(document.getElementById('filing-body'));

   (Note: no literal closing script tag appears anywhere in this file.
   A closing tag inside a comment would terminate the block early if this
   file is ever inlined into a page.)

   Annotates the FIRST occurrence of each term inside the given element,
   wraps it in a button, and shows the definition in a popup on tap or click.
   Nothing navigates away from the page.

   The TERMS object below is the single source of truth. The glossary page
   and this highlighter should both be generated from it so they can never
   drift apart.
   ========================================================================== */

(function (global) {
  'use strict';

  /* --------------------------------------------------------------------
     1. THE DATA
     `match` holds every string that should trigger this entry, including
     the way it actually appears in filings. Longest match wins.
     ------------------------------------------------------------------ */
  var TERMS = {
    blocker: {
      title: 'Blocker (Beneficial Ownership Limitation)',
      match: [
        'Beneficial Ownership Limitation', 'Beneficial Ownership Limitations',
        'Maximum Percentage', 'Ownership Cap', 'Exercise Limitation', 'blocker'
      ],
      plain: 'WHAT IT TELLS YOU: somebody holds the right to buy shares at a price fixed in the past \u2014 more of them than the ownership number in the filing shows \u2014 and to use that right they must sell shares into the market first. The selling is not optional; it is how the instrument works. Technically: a clause capping conversion, usually at 4.99%. It caps CONVERTING, not OWNING. A tap, not a tank.',
      matters: 'Three consequences. (1) The reported figure is a ceiling, not a position \u2014 the warrants behind it may convert to many times more. (2) A capped holder at the cap must SELL before exercising again, so sell-exercise-sell repeats. (3) The cap is a percentage, so it grows as the company issues stock: 4.99% permits ~499,000 shares on 10 million outstanding, and ~2,290,000 on 45,892,668. Nothing renegotiated. It tells you what the structure makes likely, never what anyone did.',
      where: 'Contract terms, not disclosures \u2014 never in a press release. EX-4.1 Form of Warrant and EX-10.1 Securities Purchase Agreement on the 8-K (search for \u201c4.99\u201d) \u00b7 13G footnotes \u00b7 S-1/S-3 Description of Securities \u00b7 10-Q equity note \u00b7 the proxy when a vote is needed'
    },
    prefunded: {
      title: 'Pre-funded warrant',
      match: ['Pre-Funded Warrant', 'Pre-Funded Warrants', 'prefunded warrant', 'pre-funded warrants'],
      plain: 'A warrant where the buyer pays nearly the whole price up front and leaves a token amount — often $0.0001 — payable at exercise. Economically a share; legally not yet one.',
      matters: 'It exists to get around the blocker. Unexercised warrants do not count toward beneficial ownership, so a capped buyer can hold an unlimited number. The money is in, the position is set, the shares are not outstanding and do not vote.',
      where: 'EX-4.x Form of Pre-Funded Warrant · offering press release · S-1/S-3 Description of Securities'
    },
    coverage: {
      title: 'Warrant coverage',
      match: ['warrant coverage', 'Warrant Coverage'],
      plain: 'How many warrants came with each share sold, as a percentage. 100% coverage means every share bought carried a warrant to buy one more later at a fixed price.',
      matters: 'Coverage is future supply that does not show up in today\u2019s share count. 200% coverage means two more potential shares for every one sold, at a price already agreed.',
      where: 'Offering 8-K and press release · warrant exhibit · 10-Q equity note'
    },
    inducement: {
      title: 'Repricing / warrant inducement',
      match: ['Inducement Letter', 'Inducement Agreement', 'warrant inducement', 'repricing', 'repriced'],
      plain: 'The company lowers the exercise price on warrants already outstanding so holders will exercise and hand over cash. Holders usually receive new warrants as part of the bargain.',
      matters: 'Cash today, dilution today, and a fresh overhang tomorrow. Watch the ratio of new warrants issued to warrants exercised — two-for-one is common, and it doubles the overhang.',
      where: '8-K Items 1.01 and 3.02 with EX-10.x Inducement Letter · 10-Q equity note'
    },
    deemed: {
      title: 'Deemed dividend',
      match: ['deemed dividend', 'Deemed Dividend'],
      plain: 'An accounting entry recording value handed to one class of holders that was never paid in cash — for instance, the difference between what a repriced warrant was worth and what was paid for it.',
      matters: 'It is the company\u2019s own arithmetic on what a transaction cost, audited and filed. Not an outside estimate.',
      where: '10-Q and 10-K statement of operations · loss-per-share reconciliation'
    },
    atm: {
      title: 'ATM — at-the-market offering',
      match: ['at-the-market offering', 'at the market offering', 'ATM Agreement', 'Sales Agreement'],
      plain: 'A standing arrangement letting the company sell new shares straight into the open market, a little at a time, at whatever the price happens to be. No announcement before each sale.',
      matters: 'Establishing an ATM is not the same as using one. The only way to know how much was actually sold is the next 10-Q — never the announcement.',
      where: '424(b)(5) prospectus supplement · EX-1.1 Sales Agreement · 10-Q for shares actually sold'
    },
    eloc: {
      title: 'Equity line of credit',
      match: ['Equity Line of Credit', 'Standby Equity Purchase Agreement', 'committed equity facility'],
      plain: 'An investor commits to buy shares on demand up to a set dollar amount, usually at a discount to the market price at the time of each draw.',
      matters: 'The discount is fixed; the price is not. As the stock falls, each draw issues more shares for the same money.',
      where: '8-K Item 1.01 with purchase agreement exhibit · S-1 registering resale'
    },
    shelf: {
      title: 'Shelf registration',
      match: ['shelf registration', 'base shelf prospectus', 'Form S-3', 'S-3 shelf'],
      plain: 'A registration statement pre-clearing the company to sell securities up to a stated amount at any time over the next three years without starting over.',
      matters: 'Capacity, not a sale — but it tells you what the company has already prepared to do, filed long before anything happens.',
      where: 'Form S-3 · each drawdown as a 424(b) prospectus supplement'
    },
    reversesplit: {
      title: 'Reverse split',
      match: ['reverse stock split', 'reverse split', 'share consolidation'],
      plain: 'Every set number of existing shares becomes one new share. 1-for-25 turns 25 shares into 1 and multiplies the price by about 25. Your percentage of the company is unchanged.',
      matters: 'Nothing is created or destroyed on the day — but it lowers the share count without lowering the authorized ceiling, which restores room to issue. Splits often come before financings. Each one also changes the CUSIP.',
      where: '8-K Item 5.03 · proxy, if shareholders vote — some states let the board act alone'
    },
    authorized: {
      title: 'Authorized vs outstanding shares',
      match: ['authorized shares', 'authorized share capital', 'shares authorized', 'increase the number of authorized'],
      plain: 'Outstanding is how many shares exist now. Authorized is the maximum the charter permits without another shareholder vote. The gap between them is dilution already approved.',
      matters: 'Raising the authorized ceiling is the most consequential vote most small-company holders ever get, and usually the least attended. The ceiling goes up years before the shares appear.',
      where: '10-K/10-Q cover page and balance sheet · DEF 14A proposal · 8-K Item 5.03'
    },
    quorum: {
      title: 'Quorum',
      match: ['quorum'],
      plain: 'The minimum share participation needed for a shareholder meeting to do business — often one third of the voting power. Below it, nothing can be decided.',
      matters: 'Failed meetings are public and measurable. Note that brokers may vote uninstructed shares only on routine matters — a share issuance is not routine.',
      where: '8-K Item 5.07 for the actual tallies · the bylaws exhibit for the threshold'
    },
    agent: {
      title: 'Placement agent',
      match: ['placement agent', 'Placement Agency Agreement', 'exclusive placement agent'],
      plain: 'The broker-dealer arranging a financing between company and investors, paid a percentage of the money raised and often warrants of its own.',
      matters: 'The agent is the connective tissue between issuers. The same firm turns up across many small companies and the agreement terms repeat almost word for word.',
      where: 'EX-1.1 Placement Agency Agreement · offering press release · 424(b) Plan of Distribution'
    },
    goingconcern: {
      title: 'Going concern',
      match: ['going concern', 'substantial doubt about'],
      plain: 'A formal statement that there is substantial doubt the company can operate for another twelve months without raising more money.',
      matters: 'Management and the auditor saying, on the record, that more financing is required. Everything about the terms of the next raise follows from that sentence.',
      where: '10-K/10-Q Note 1 · the auditor\u2019s report'
    },
    ftd: {
      title: 'Fails to deliver',
      match: ['fails to deliver', 'fail to deliver', 'failure to deliver'],
      plain: 'Shares sold but not delivered to the buyer by the settlement deadline. The SEC publishes daily totals for every security, free.',
      matters: 'Fails happen for ordinary operational reasons and prove nothing by themselves. They are useful because they are one of the few pieces of trading-side data the public can get.',
      where: 'SEC Fails-to-Deliver Data, twice monthly, by settlement date and CUSIP'
    },
    bagholder: {
      title: 'Bag Holder Trap\u2122',
      match: ['Bag Holder Trap', 'bag holder trap', 'bagholder trap'],
      plain: 'Heavy trading before the market opens, at prices the stock never returns to that session \u2014 on a morning the company prices a financing below all of it. The buyers in that pre-market volume are left holding the highest cost basis of the day.',
      matters: 'The number that matters is not the high. It is how many shares, and how many dollars, went in above the price the company itself sold stock at hours later. A high set on 300 shares is a print. A high set on a million is a crowd.',
      where: 'Pre-market prints from a consolidated feed \u00b7 the 8-K or 424(b) that prices the offering \u00b7 the daily bar, which by convention omits pre-market entirely'
    },
    pirate: {
      title: 'Pirate transaction',
      match: ['Pirate transaction', 'pirate transaction'],
      plain: 'Our term for a financing that carries all three of these at once: a discounted price to the investor, warrant coverage on top, and an ownership blocker. Each one is ordinary on its own. Together they describe a deal where supply is committed in advance at a price the market has not seen yet.',
      matters: 'A reader who spots all three can expect what the structure makes likely \u2014 shares sold into strength, exercise at the fixed low price, and the cycle repeating, because a capped holder must sell before it can exercise again. Every term is lawful and every term is filed. The flag is on the transaction type, not on any firm or person.',
      where: 'The three terms sit in different places, which is why they are rarely seen together: the discount in the offering press release and the 424(b) \u00b7 the warrant coverage in the 8-K \u00b7 the blocker in EX-4.1, the Form of Warrant'
    },
    blockercycle: {
      title: 'The blocker cycle',
      match: ['blocker cycle', 'the blocker cycle', 'exercise cycle'],
      plain: 'The repeating sequence a 4.99% cap creates. The holder exercises up to the cap, and to exercise any more must first sell shares to get back under it. Sell, exercise, sell, exercise.',
      matters: 'The selling is not a choice about the company. It is a condition of using the instrument. That is why supply can arrive on good news for reasons that have nothing to do with what the news said.',
      where: 'EX-4.1 Form of Warrant for the cap and the notice period \u00b7 10-Q equity note for warrants outstanding and exercised \u00b7 13G/A history for the position falling as it is used'
    },
    sched13: {
      title: 'Schedule 13G vs Schedule 13D',
      match: ['Schedule 13G', 'Schedule 13D', '13G/A', '13D/A'],
      plain: 'Both report ownership above 5%. A 13G is the short form for passive holders — acquired in the ordinary course, not to influence control. A 13D is required when the holder intends to influence the company, and it must state the purpose.',
      matters: 'A holder switching from 13G to 13D is announcing a change of intent, in advance, on the record. One of the few forward-looking signals in the system, and free to read.',
      where: 'EDGAR under the holder\u2019s name as well as the company\u2019s · Forms 3/4/5 are filed under individuals and are missed by searching the fund name alone'
    }
  };

  /* --------------------------------------------------------------------
     2. STYLES  (delete this block and use a stylesheet if you prefer)
     ------------------------------------------------------------------ */
  var CSS = [
    '.sg-term{background:#FFF3CD;border:0;border-bottom:2px dotted #B3202C;padding:0 1px;',
    'font:inherit;color:inherit;cursor:pointer;border-radius:2px}',
    '.sg-term:hover,.sg-term:focus{background:#FFE69A;outline:none}',
    '.sg-pop{position:absolute;z-index:9999;max-width:390px;background:#fff;color:#1B2430;',
    'border:1px solid #C9D2DC;border-top:4px solid #12355B;border-radius:4px;',
    'box-shadow:0 8px 28px rgba(18,53,91,.18);padding:16px 18px;',
    'font:15px/1.5 Georgia,"Times New Roman",serif}',
    '.sg-pop h4{margin:0 0 8px;font:600 15px/1.3 Helvetica,Arial,sans-serif;color:#12355B}',
    '.sg-pop p{margin:0 0 10px}',
    '.sg-pop .sg-matters{background:#F4F7FA;border-left:3px solid #B3202C;padding:8px 12px;',
    'margin:10px 0;font-size:14px}',
    '.sg-pop .sg-matters b{display:block;font:600 11px/1.4 Helvetica,Arial,sans-serif;',
    'letter-spacing:.07em;text-transform:uppercase;color:#B3202C;margin-bottom:3px}',
    '.sg-pop .sg-where{font:13px/1.45 Helvetica,Arial,sans-serif;color:#5A6472;',
    'border-top:1px solid #E4E8ED;padding-top:8px;margin-top:4px}',
    '.sg-pop .sg-where b{color:#12355B;display:block;letter-spacing:.06em;',
    'text-transform:uppercase;font-size:11px;margin-bottom:3px}',
    '.sg-pop .sg-close{position:absolute;top:6px;right:10px;border:0;background:none;',
    'font-size:20px;line-height:1;color:#8A94A0;cursor:pointer}',
    '@media(max-width:520px){.sg-pop{max-width:calc(100vw - 24px)}}'
  ].join('');

  /* --------------------------------------------------------------------
     3. INTERNALS
     ------------------------------------------------------------------ */
  var SKIP = { SCRIPT:1, STYLE:1, TEXTAREA:1, A:1, BUTTON:1, CODE:1, PRE:1, H1:1, H2:1 };
  var injected = false, pop = null;

  function injectCSS() {
    if (injected) return;
    var s = document.createElement('style');
    s.textContent = CSS;
    document.head.appendChild(s);
    injected = true;
  }

  function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  // Build one regex, longest phrases first so "Pre-Funded Warrant" wins over "warrant".
  function buildPattern() {
    var all = [];
    Object.keys(TERMS).forEach(function (k) {
      TERMS[k].match.forEach(function (m) { all.push({ key: k, text: m }); });
    });
    all.sort(function (a, b) { return b.text.length - a.text.length; });
    var lookup = {};
    all.forEach(function (e) { lookup[e.text.toLowerCase()] = e.key; });
    var src = all.map(function (e) { return esc(e.text); }).join('|');
    return { re: new RegExp('\\b(' + src + ')\\b', 'gi'), lookup: lookup };
  }

  function closePop() {
    if (pop) { pop.remove(); pop = null; }
  }

  function openPop(btn, key) {
    closePop();
    var t = TERMS[key];
    if (!t) return;
    pop = document.createElement('div');
    pop.className = 'sg-pop';
    pop.setAttribute('role', 'dialog');
    pop.innerHTML =
      '<button class="sg-close" aria-label="Close">&times;</button>' +
      '<h4></h4><p class="sg-plain"></p>' +
      '<div class="sg-matters"><b>Why it matters</b><span></span></div>' +
      '<div class="sg-where"><b>Where you will find it</b><span></span></div>';
    pop.querySelector('h4').textContent = t.title;
    pop.querySelector('.sg-plain').textContent = t.plain;
    pop.querySelector('.sg-matters span').textContent = t.matters;
    pop.querySelector('.sg-where span').textContent = t.where;
    pop.querySelector('.sg-close').addEventListener('click', closePop);
    document.body.appendChild(pop);

    // position below the term, nudged to stay on screen
    var r = btn.getBoundingClientRect();
    var top = r.bottom + window.scrollY + 8;
    var left = r.left + window.scrollX;
    var w = pop.offsetWidth;
    var maxLeft = window.scrollX + document.documentElement.clientWidth - w - 12;
    if (left > maxLeft) left = Math.max(window.scrollX + 12, maxLeft);
    pop.style.top = top + 'px';
    pop.style.left = left + 'px';
  }

  document.addEventListener('click', function (e) {
    if (pop && !pop.contains(e.target) && !e.target.classList.contains('sg-term')) closePop();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closePop(); });

  /* --------------------------------------------------------------------
     4. PUBLIC API
     ------------------------------------------------------------------ */
  function annotate(root, opts) {
    if (!root) return 0;
    injectCSS();
    opts = opts || {};
    var perTerm = opts.occurrences || 1;   // mark first N of each term; keeps it readable
    var built = buildPattern();
    var seen = {}, count = 0;

    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (!n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        var p = n.parentNode;
        while (p && p !== root) {
          if (SKIP[p.nodeName] || (p.classList && p.classList.contains('sg-term')))
            return NodeFilter.FILTER_REJECT;
          p = p.parentNode;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    var nodes = [], n;
    while ((n = walker.nextNode())) nodes.push(n);

    nodes.forEach(function (node) {
      var text = node.nodeValue, m, last = 0, frag = null;
      built.re.lastIndex = 0;
      while ((m = built.re.exec(text)) !== null) {
        var key = built.lookup[m[0].toLowerCase()];
        if (!key) continue;
        if ((seen[key] || 0) >= perTerm) continue;
        seen[key] = (seen[key] || 0) + 1;
        count++;
        frag = frag || document.createDocumentFragment();
        if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'sg-term';
        b.textContent = m[0];
        b.setAttribute('aria-label', m[0] + ' — show definition');
        b.dataset.term = key;
        b.addEventListener('click', function (ev) {
          ev.stopPropagation();
          openPop(this, this.dataset.term);
        });
        frag.appendChild(b);
        last = m.index + m[0].length;
      }
      if (frag) {
        if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
        node.parentNode.replaceChild(frag, node);
      }
    });
    return count;
  }

  global.SECGlossary = {
    terms: TERMS,
    annotate: annotate,
    close: closePop
  };
})(window);
