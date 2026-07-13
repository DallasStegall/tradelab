/* ==========================================================================
   TradeLab — Pre-Market Checklist
   Daily routine checklist (night before / pre-market / final 15 minutes),
   with per-day persistence, 7-day history strip, plus reference cards on
   news scanning and screener criteria per strategy.

   Public API:
     Checklist.render(container, sub)
     Checklist.progress() -> {done, total} for today (never mutates storage)
   Storage (via App.Store):
     'checklist.state'   {date:'YYYY-MM-DD', checked:{itemId:true}, toasted:bool}
     'checklist.history' { 'YYYY-MM-DD': {done,total} }  (pruned to 60 newest)
   ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------ Data ------------------------------ */
  var GROUPS = [
    {
      id: 'nb',
      title: 'Night before',
      sub: 'Ten calm minutes after the close beat thirty rushed minutes at 7 AM.',
      icon: 'moon',
      items: [
        { id: 'nb-journal', text: 'Review today\'s trades in the journal',
          why: 'Patterns in your losers only show up when you read them back the same day, not three weeks later.' },
        { id: 'nb-watchlist', text: 'Build the initial watchlist: gappers, earnings names, unusual-volume movers',
          why: 'Half of tomorrow\'s watchlist is visible tonight — after-hours earnings movers rarely go quiet by morning.' },
        { id: 'nb-calendar', text: 'Note tomorrow\'s economic calendar times (CPI, FOMC, jobless claims)',
          why: 'An 8:30 AM or 2:00 PM ET release can invalidate any setup that trades into it.' },
        { id: 'nb-maxloss', text: 'Write tomorrow\'s max daily loss in dollars',
          why: 'A number written the night before is much harder to negotiate with mid-drawdown.' },
        { id: 'nb-platform', text: 'Prep platform layouts and hotkeys',
          why: 'Order-entry fumbling at 9:31 costs real money — test the buy, sell and flatten keys while nothing is moving.' }
      ]
    },
    {
      id: 'pm',
      title: 'Pre-market 7:00-9:15 ET',
      sub: 'Turn the raw list into a ranked plan while liquidity is still thin.',
      icon: 'search',
      items: [
        { id: 'pm-futures', text: 'Check ES/NQ futures direction and overnight range',
          why: 'Longs fight the tape when futures are down 1% — and the overnight range frames where the open sits.' },
        { id: 'pm-gappers', text: 'Scan gappers: gap >= 2%, RVOL >= 2, price $5-500, catalyst attached',
          why: 'All four filters together weed out drifters; a gap without volume or a reason usually fills.' },
        { id: 'pm-catalysts', text: 'Read the actual catalysts (earnings, guidance, FDA, M&A, analyst action)',
          why: 'The kind of news decides whether a gap holds — raised full-year guidance outlasts a vague PR every time.' },
        { id: 'pm-earnings', text: 'Check today\'s earnings calendar: who reports before open and after close',
          why: 'Names reporting tonight often go quiet after 3:00 PM, and sympathy names move at the open.' },
        { id: 'pm-levels', text: 'Mark levels on every watchlist name: PDH/PDL, pre-market high/low, daily S/R',
          why: 'Entries and stops belong at levels other traders also see; marked in advance, they remove hesitation.' },
        { id: 'pm-tradable', text: 'Verify tradability: spread, average volume, halt risk',
          why: 'A $0.30 spread or a halt-prone low float can turn a planned 1R loss into 3R.' },
        { id: 'pm-tone', text: 'Gauge market tone: SPY/QQQ pre-market, megacap leaders, sector sympathy',
          why: 'A strong stock in a weak tape needs a stronger catalyst — position size should respect the index.' },
        { id: 'pm-setups', text: 'Write the top 2-3 A+ setups with entry, stop and size',
          why: 'If the plan is not written by 9:15, the open will write it for you — badly.' }
      ]
    },
    {
      id: 'fi',
      title: 'Final 15 minutes',
      sub: '9:15-9:30 ET. Nothing new gets added now — only confirmation.',
      icon: 'clock',
      items: [
        { id: 'fi-risk', text: 'Confirm max daily loss and per-trade risk in dollars',
          why: 'Both numbers must exist before the first fill; hitting either one means done for the day or sized down.' },
        { id: 'fi-alerts', text: 'Set alerts at every trigger level',
          why: 'Alerts watch the levels so your eyes can watch price action instead of six tickers at once.' },
        { id: 'fi-distractions', text: 'Close distractions: social feeds, chat rooms, phone',
          why: 'Someone else\'s conviction is the fastest way out of your own plan.' },
        { id: 'fi-rehearse', text: 'Rehearse play one aloud: "if X breaks through Y on volume, then Z; otherwise nothing"',
          why: 'Saying the trade out loud exposes fuzzy plans — "otherwise nothing" is the clause that saves money.' },
        { id: 'fi-market-orders', text: 'No market orders in the first minute unless the plan explicitly says so',
          why: 'The 9:30 spread is the widest of the day; limit orders keep the open from taxing your entry.' }
      ]
    }
  ];

  var ALL_IDS = [];
  GROUPS.forEach(function (g) {
    g.items.forEach(function (it) { ALL_IDS.push(it.id); });
  });
  var TOTAL = ALL_IDS.length;

  var DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var DAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MO_LONG = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  /* ------------------------------ State helpers ------------------------------ */
  function countDone(state) {
    if (!state || !state.checked) return 0;
    var n = 0;
    ALL_IDS.forEach(function (id) { if (state.checked[id]) n++; });
    return n;
  }

  function archiveOldDay(state) {
    try {
      var hist = App.Store.get('checklist.history', {});
      if (!hist || typeof hist !== 'object' || Array.isArray(hist)) hist = {};
      hist[state.date] = { done: countDone(state), total: TOTAL };
      var keys = Object.keys(hist).sort();
      while (keys.length > 60) { delete hist[keys.shift()]; }
      App.Store.set('checklist.history', hist);
    } catch (e) { /* never block render on a bad history blob */ }
  }

  /* Returns today's state, archiving + resetting if the stored day is stale. */
  function ensureToday() {
    var today = App.todayKey();
    var state = App.Store.get('checklist.state', null);
    if (state && state.date === today && state.checked && typeof state.checked === 'object') {
      return state;
    }
    if (state && typeof state.date === 'string' && state.date && state.date !== today) {
      archiveOldDay(state);
    }
    var fresh = { date: today, checked: {}, toasted: false };
    App.Store.set('checklist.state', fresh);
    return fresh;
  }

  /* Archive the stored day into history if it predates today (no reset, no
     render). Backup & Sync calls this before overwriting checklist.state so a
     not-yet-archived day is never lost. */
  function archiveIfStale() {
    var state = App.Store.get('checklist.state', null);
    if (state && typeof state.date === 'string' && state.date && state.date !== App.todayKey()) {
      archiveOldDay(state);
    }
  }

  /* Read-only progress for today. Safe before first render; never mutates. */
  function progress() {
    try {
      if (!window.App || !window.App.Store) return { done: 0, total: TOTAL };
      var state = window.App.Store.get('checklist.state', null);
      if (!state || state.date !== window.App.todayKey()) return { done: 0, total: TOTAL };
      return { done: countDone(state), total: TOTAL };
    } catch (e) {
      return { done: 0, total: TOTAL };
    }
  }

  /* ------------------------------ Date helpers ------------------------------ */
  function keyOf(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function parseKey(key) {
    var p = String(key || '').split('-');
    return new Date(+p[0] || 1970, (+p[1] || 1) - 1, +p[2] || 1);
  }
  function longDate(key) {
    var d = parseKey(key);
    return DAY_LONG[d.getDay()] + ', ' + MO_LONG[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
  }

  /* ------------------------------ Header / history strip ------------------------------ */
  function historyPills(todayK, doneToday) {
    var hist = App.Store.get('checklist.history', {});
    if (!hist || typeof hist !== 'object' || Array.isArray(hist)) hist = {};
    var base = parseKey(todayK);
    var out = '';
    for (var i = 6; i >= 0; i--) {
      var d = new Date(base.getFullYear(), base.getMonth(), base.getDate() - i);
      var key = keyOf(d);
      var wd = d.getDay();
      var isToday = key === todayK;
      var isWeekend = wd === 0 || wd === 6;
      var rec = isToday ? { done: doneToday, total: TOTAL } : hist[key];
      var count = (rec && isFinite(rec.done) && isFinite(rec.total)) ? (rec.done + '/' + rec.total) : '—';
      out += '<span class="pill tnum"' +
        (isToday ? ' id="chk-today-pill"' : '') +
        ' data-day="' + DAY_ABBR[wd] + '"' +
        ' title="' + App.esc(key) + (isToday ? ' (today)' : '') + '"' +
        (isWeekend ? ' style="opacity:.55"' : '') +
        '>' + DAY_ABBR[wd] + ' ' + App.esc(count) + '</span>';
    }
    return out;
  }

  function headerCard(state) {
    var done = countDone(state);
    var pct = TOTAL > 0 ? Math.round((done / TOTAL) * 100) : 0;
    return '' +
      '<section class="card">' +
      '<div class="spread" style="flex-wrap:wrap;gap:10px;align-items:flex-start">' +
      '<div>' +
      '<div class="card-title" style="margin-bottom:4px">' + App.icon('calendar', 15) + ' ' + App.esc(longDate(state.date)) + '</div>' +
      '<div class="small muted" id="chk-count">' + done + ' of ' + TOTAL + ' complete</div>' +
      '</div>' +
      '<button type="button" class="btn btn-sm" id="chk-reset">' + App.icon('refresh', 14) + ' Reset today</button>' +
      '</div>' +
      '<div class="progress' + (done === TOTAL && TOTAL > 0 ? ' pos' : '') + '" id="chk-bar" style="margin-top:12px">' +
      '<div class="progress-fill" id="chk-fill" style="width:' + pct + '%"></div>' +
      '</div>' +
      '<div class="row" style="margin-top:12px;flex-wrap:wrap;gap:6px">' + historyPills(state.date, done) + '</div>' +
      '<div class="small muted" style="margin-top:6px">Last 7 calendar days — weekends dimmed. Consistency is the metric, not any single perfect morning.</div>' +
      '</section>';
  }

  /* ------------------------------ Checklist groups ------------------------------ */
  function groupCards(state) {
    var checked = state.checked || {};
    return GROUPS.map(function (g) {
      var rows = g.items.map(function (it) {
        return '<label class="checkbox-row" style="padding:9px 0;border-bottom:1px solid var(--border)">' +
          '<input type="checkbox" data-chk="' + App.esc(it.id) + '"' + (checked[it.id] ? ' checked' : '') + '>' +
          '<span><span>' + App.esc(it.text) + '</span><br>' +
          '<span class="small muted">' + App.esc(it.why) + '</span></span>' +
          '</label>';
      }).join('');
      return '<section class="card">' +
        '<div class="card-title">' + App.icon(g.icon, 15) + ' ' + App.esc(g.title) +
        ' <span class="badge">' + g.items.length + ' items</span></div>' +
        '<p class="small muted" style="margin:0 0 4px">' + App.esc(g.sub) + '</p>' +
        rows +
        '</section>';
    }).join('');
  }

  /* ------------------------------ Reference card: news scanning ------------------------------ */
  function newsCard() {
    return '' +
      '<section class="card guide-sec">' +
      '<div class="card-title">' + App.icon('search', 15) + ' News &amp; earnings scanning tips</div>' +

      '<p style="margin-top:6px"><b>Where catalysts come from.</b> Nearly every tradable gap traces back to one of six buckets:</p>' +
      '<ul>' +
      '<li><b>Earnings &amp; guidance</b> — the quarter\'s numbers matter less than the guide; a beat with a full-year cut usually fades.</li>' +
      '<li><b>FDA &amp; clinical readouts</b> — binary biotech events; gaps of 30-100%+ happen, and trading halts are routine.</li>' +
      '<li><b>M&amp;A</b> — the target pins near the deal price (little range left); the acquirer often dips. Rumored deals move more than closed ones.</li>' +
      '<li><b>Analyst actions</b> — upgrades, downgrades, initiations, price-target changes. Strongest in the first 30 minutes, frequently faded by 10:30.</li>' +
      '<li><b>Macro data</b> — CPI, FOMC, payrolls move everything at once; single-stock edges shrink while the index digests the print.</li>' +
      '<li><b>Sympathy moves</b> — the sector follows the leader. Sympathy names move later, move less, and reverse faster than the name with the actual news.</li>' +
      '</ul>' +

      '<p><b>Rank by catalyst quality, not gap size.</b> A 4% gap on raised guidance from a profitable company beats a 40% gap on a vague "strategic partnership" PR from a $50M shell. The test question: does this news change what the business earns? If the answer is no, plan for a fade, not a follow-through.</p>' +

      '<p><b>RVOL is the honesty filter.</b> Relative volume (today\'s volume vs. the average at the same time of day) tells you whether real money agrees the news matters. RVOL &gt;= 2 with 500k+ pre-market shares means genuine participation; a big percentage gap on 40k shares is one seller away from collapsing. When the headline and RVOL disagree, believe RVOL.</p>' +

      '<p><b>Fresh beats stale.</b> News older than one session is mostly priced in. If the story broke yesterday at 2:00 PM and the stock already ran 15%, today you are trading positioning and profit-taking, not news. Check the timestamp on every headline before it goes on the watchlist — re-published copies of an old PR are a classic trap.</p>' +

      '<p><b>BMO vs AMC earnings timing.</b> Before-open reporters (roughly 6:00-9:00 AM ET) gap and trade on the numbers immediately — the reaction is tradable at the bell. After-close reporters move in the after-hours session and again at the next open, where the overnight reaction often gets partially reversed. Tag every watchlist name with its reporting slot so a surprise print never lands in the middle of an open position.</p>' +

      '<div class="callout warn">' + App.icon('alert') +
      '<div><b>Low-float pump traps.</b> Sub-10M-float names with vague PRs, a history of dilutive offerings, and sudden paid-promotion chatter can rip 100% and round-trip it within the hour. Warning signs: no hard borrow available, repeated volatility halts, spread wider than 1%, and a filing history full of S-1s. As a rule of thumb: if you trade one at all, quarter size, never add, hard stop — and assume an offering can hit the wire at any moment.</div>' +
      '</div>' +

      '<p style="margin-bottom:6px"><b>Free sources worth checking each morning</b> (generic — use whichever versions your platform offers):</p>' +
      '<ul style="margin-bottom:0">' +
      '<li>A pre-market gapper scanner with gap %, RVOL and float columns.</li>' +
      '<li>An earnings calendar showing BMO/AMC timing and expected move.</li>' +
      '<li>An economic calendar with release times in ET.</li>' +
      '<li>The official press-release wires and SEC filings feed (8-Ks for news, S-1/424B for offering risk).</li>' +
      '<li>Your broker\'s news feed for halts and headlines; social feeds for discovery only — always verify against the primary source before risking money.</li>' +
      '</ul>' +
      '</section>';
  }

  /* ------------------------------ Reference card: screener criteria ------------------------------ */
  function screenerCard() {
    var rows = [
      ['ORB (Opening Range Breakout)', '$5-500', '&gt;= 2', '&gt;= 2% with a catalyst',
        'Avg vol &gt;= 1M/day; float &gt;= 10M preferred', '&lt;= $0.05 or 0.1%', '9:30-10:30'],
      ['Pullback (trend continuation)', '$10-500', '&gt;= 1.5', 'Helpful but not required — needs an established intraday trend',
        'Avg vol &gt;= 2M/day; institutional float', '&lt;= $0.03 or 0.05%', '9:45-11:30'],
      ['Scalping (liquidity names)', '$20-500', '&gt;= 1.5 (&gt;= 1 acceptable on megacaps)', 'Optional — liquidity matters more than the gap',
        'Avg vol &gt;= 5M/day; large float only', '&lt;= $0.01-0.02 (penny-wide)', '9:30-11:00 &amp; 15:00-16:00']
    ];
    var body = rows.map(function (r) {
      return '<tr><td><b>' + r[0] + '</b></td><td class="tnum">' + r[1] + '</td><td class="tnum">' + r[2] + '</td>' +
        '<td>' + r[3] + '</td><td>' + r[4] + '</td><td class="tnum">' + r[5] + '</td><td class="tnum">' + r[6] + '</td></tr>';
    }).join('');
    return '' +
      '<section class="card guide-sec">' +
      '<div class="card-title">' + App.icon('filter', 15) + ' Screener criteria by strategy</div>' +
      '<p class="small muted" style="margin-top:6px">Starting filters for the morning scan — tighten them before you loosen them. All times ET.</p>' +
      '<div class="table-wrap"><table class="table"><thead><tr>' +
      '<th>Strategy</th><th>Price range</th><th>Min RVOL</th><th>Gap %</th>' +
      '<th>Float / avg volume</th><th>Max spread</th><th>Time window (ET)</th>' +
      '</tr></thead><tbody>' + body + '</tbody></table></div>' +
      '<p class="small muted" style="margin:10px 0 0">A screen narrows the universe; the playbook still decides the trade. If a name passes every filter but has no clean level, it stays on the bench.</p>' +
      '</section>';
  }

  /* ------------------------------ Progress UI (partial update) ------------------------------ */
  function updateProgressUI(container, done) {
    var pct = TOTAL > 0 ? Math.round((done / TOTAL) * 100) : 0;
    var fill = container.querySelector('#chk-fill');
    if (fill) fill.style.width = pct + '%';
    var bar = container.querySelector('#chk-bar');
    if (bar) bar.classList.toggle('pos', done === TOTAL && TOTAL > 0);
    var count = container.querySelector('#chk-count');
    if (count) count.textContent = done + ' of ' + TOTAL + ' complete';
    var pill = container.querySelector('#chk-today-pill');
    if (pill) pill.textContent = (pill.getAttribute('data-day') || '') + ' ' + done + '/' + TOTAL;
  }

  /* ------------------------------ Render ------------------------------ */
  function draw(container) {
    var state = ensureToday();

    /* Render into a fresh wrapper so listeners die with it on re-render/navigation
       (the router reuses the same <main> element across pages). */
    var root = document.createElement('div');
    root.innerHTML =
      '<div class="page-header"><h1>Pre-Market Checklist</h1>' +
      '<p class="lede">The same routine every trading day. Professionals do not decide each morning whether to prepare — the checklist decides, and the open only gets executed plans.</p></div>' +
      headerCard(state) +
      '<div style="height:14px"></div>' +
      '<div class="stack">' + groupCards(state) + '</div>' +
      '<h2 style="margin:26px 0 12px">Morning scan reference</h2>' +
      newsCard() +
      screenerCard();

    /* checkbox toggles — one delegated listener on the wrapper */
    root.addEventListener('change', function (ev) {
      var input = ev.target;
      if (!input || input.type !== 'checkbox' || !input.getAttribute('data-chk')) return;
      var id = input.getAttribute('data-chk');
      if (ALL_IDS.indexOf(id) === -1) return;
      var st = ensureToday();
      if (input.checked) st.checked[id] = true;
      else delete st.checked[id];
      var done = countDone(st);
      if (done === TOTAL && !st.toasted) {
        st.toasted = true;
        App.Store.set('checklist.state', st);
        App.toast('Checklist complete - trade the plan', 'ok');
      } else {
        App.Store.set('checklist.state', st);
      }
      updateProgressUI(root, done);
    });

    var resetBtn = root.querySelector('#chk-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        if (!window.confirm('Reset today\'s checklist? All of today\'s checks will be cleared.')) return;
        var st = ensureToday();
        st.checked = {};
        st.toasted = false;
        App.Store.set('checklist.state', st);
        draw(container);
      });
    }

    container.innerHTML = '';
    container.appendChild(root);
  }

  function render(container, sub) {
    /* sub is unused — the checklist has no sub-routes, but must tolerate any. */
    draw(container);
  }

  window.Checklist = { render: render, progress: progress, archiveIfStale: archiveIfStale };
})();
