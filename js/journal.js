/* ==========================================================================
   TradeLab — Trade Journal (js/journal.js)
   Log trades, filter them, and study the resulting stats and charts.

   Global: window.Journal = { render(container, sub) }
   Storage: App.Store key 'trades' (Trade[]), 'journal.filters' (last filters).
   P/L is ALWAYS computed via App.tradePL(trade) — never a local formula.
   ========================================================================== */
(function () {
  'use strict';

  var MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var FORM_IDS = ['jf-date', 'jf-symbol', 'jf-qty', 'jf-entry', 'jf-exit', 'jf-stop', 'jf-fees'];

  /* ------------------------------ helpers ------------------------------ */
  function pad2(n) { return String(n).padStart(2, '0'); }

  /* Parse 'YYYY-MM-DD' as a LOCAL date (never new Date(string): UTC shift). */
  function parseDateKey(key) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key || ''));
    if (!m) return null;
    return new Date(+m[1], +m[2] - 1, +m[3]);
  }

  function dateLabel(key) {
    var d = parseDateKey(key);
    if (!d) return String(key || '');
    return MO[d.getMonth()] + ' ' + d.getDate();
  }

  function trunc(s, n) {
    s = String(s == null ? '' : s);
    if (s.length <= n) return s;
    return s.slice(0, n - 1) + '…';
  }

  function chronCmp(a, b) {
    var da = String(a.date || ''), db = String(b.date || '');
    if (da < db) return -1;
    if (da > db) return 1;
    return (+a.createdAt || 0) - (+b.createdAt || 0);
  }
  function newestCmp(a, b) { return chronCmp(b, a); }

  function getTrades() {
    var t = App.Store.get('trades', []);
    if (!Array.isArray(t)) return [];
    return t.filter(function (x) { return x && typeof x === 'object'; });
  }

  function strategyOptions() {
    var list = [];
    var data = window.STRATEGY_DATA;
    if (Array.isArray(data) && data.length) {
      data.forEach(function (s) {
        if (s && s.id) list.push({ id: String(s.id), name: String(s.name || s.id) });
      });
    }
    if (!list.length) {
      list = [
        { id: 'orb', name: 'Opening Range Breakout' },
        { id: 'pullback', name: 'Pullback Trading' },
        { id: 'scalping', name: 'Scalping' }
      ];
    }
    list.push({ id: 'other', name: 'Other' });
    return list;
  }

  function strategyName(id) {
    var key = id == null || id === '' ? 'other' : String(id);
    var opts = strategyOptions();
    for (var i = 0; i < opts.length; i++) {
      if (opts[i].id === key) return opts[i].name;
    }
    return key;
  }

  /* Realized R multiple: PL / (|entry - stop| * qty). null when no stop / zero risk. */
  function realizedR(t, pl) {
    if (!t || t.stop == null || t.stop === '' || !isFinite(+t.stop)) return null;
    var risk = Math.abs((+t.entry) - (+t.stop)) * Math.abs(+t.qty || 0);
    if (!(risk > 0)) return null;
    return pl / risk;
  }

  function csvCell(v) {
    var s = v == null ? '' : String(v);
    if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function normalizeFilters(f) {
    f = (f && typeof f === 'object') ? f : {};
    return {
      strategy: (typeof f.strategy === 'string' && f.strategy) ? f.strategy : 'all',
      side: (f.side === 'long' || f.side === 'short') ? f.side : 'all',
      result: (f.result === 'win' || f.result === 'loss') ? f.result : 'all',
      from: typeof f.from === 'string' ? f.from : '',
      to: typeof f.to === 'string' ? f.to : ''
    };
  }

  function applyFilters(trades, f) {
    return trades.filter(function (t) {
      if (f.strategy !== 'all' && String(t.strategy || 'other') !== f.strategy) return false;
      if (f.side !== 'all' && t.side !== f.side) return false;
      if (f.result !== 'all') {
        var pl = App.tradePL(t);
        if (f.result === 'win' && !(pl > 0)) return false;
        if (f.result === 'loss' && !(pl < 0)) return false;
      }
      if (f.from && String(t.date || '') < f.from) return false;
      if (f.to && String(t.date || '') > f.to) return false;
      return true;
    });
  }

  function computeStats(filtered) {
    var chron = filtered.slice().sort(chronCmp);
    var n = chron.length;
    var net = 0, wins = 0, losses = 0, scratches = 0, grossW = 0, grossL = 0;
    var best = -Infinity, worst = Infinity;
    var cum = 0, peak = 0, maxDD = 0;
    var rSum = 0, rN = 0;
    var curve = [];

    chron.forEach(function (t) {
      var pl = App.tradePL(t);
      net += pl;
      if (pl > 0) { wins++; grossW += pl; }
      else if (pl < 0) { losses++; grossL += -pl; }
      else { scratches++; }
      if (pl > best) best = pl;
      if (pl < worst) worst = pl;
      cum += pl;
      if (cum > peak) peak = cum;
      if (peak - cum > maxDD) maxDD = peak - cum;
      var r = realizedR(t, pl);
      if (r != null) { rSum += r; rN++; }
      curve.push({ t: t, pl: pl, cum: cum });
    });

    var streak = '—';
    if (n) {
      var lastPl = curve[n - 1].pl;
      if (lastPl !== 0) {
        var up = lastPl > 0, c = 0;
        for (var i = n - 1; i >= 0; i--) {
          var p = curve[i].pl;
          if (up ? p > 0 : p < 0) c++;
          else break;
        }
        streak = (up ? 'W' : 'L') + c;
      }
    }

    return {
      n: n, net: net, wins: wins, losses: losses, scratches: scratches,
      grossW: grossW, grossL: grossL,
      winRate: n ? (wins / n) * 100 : 0,
      best: n ? best : null, worst: n ? worst : null,
      maxDD: maxDD, rSum: rSum, rN: rN,
      streak: streak, curve: curve
    };
  }

  /* ------------------------------ import helpers ------------------------------ */
  function validImportTrade(t) {
    return !!(t && typeof t === 'object' && !Array.isArray(t) &&
      t.id != null && String(t.id) !== '' &&
      /^\d{4}-\d{2}-\d{2}$/.test(String(t.date || '')) &&
      t.symbol != null && String(t.symbol).trim() !== '' &&
      isFinite(+t.qty) && +t.qty > 0 &&
      isFinite(+t.entry) && isFinite(+t.exit));
  }

  function normTrade(t) {
    return {
      id: String(t.id),
      date: String(t.date),
      symbol: String(t.symbol).trim().toUpperCase().slice(0, 12),
      side: t.side === 'short' ? 'short' : 'long',
      strategy: (typeof t.strategy === 'string' && t.strategy) ? t.strategy : 'other',
      qty: +t.qty,
      entry: +t.entry,
      exit: +t.exit,
      fees: isFinite(+t.fees) ? +t.fees : 0,
      stop: (t.stop == null || t.stop === '' || !isFinite(+t.stop)) ? null : +t.stop,
      notes: t.notes == null ? '' : String(t.notes),
      createdAt: isFinite(+t.createdAt) ? +t.createdAt : Date.now(),
      updatedAt: isFinite(+t.updatedAt) ? +t.updatedAt
        : (isFinite(+t.createdAt) ? +t.createdAt : Date.now())
    };
  }

  /* ------------------------------ sample data ------------------------------ */
  function sampleTrades() {
    var now = Date.now();
    function key(daysAgo) {
      var p = App.todayKey().split('-');
      var d = new Date(+p[0], +p[1] - 1, +p[2]);
      d.setDate(d.getDate() - daysAgo);
      var wd = d.getDay();
      if (wd === 0) d.setDate(d.getDate() - 2);
      else if (wd === 6) d.setDate(d.getDate() - 1);
      return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
    }
    /* [daysAgo, symbol, side, strategy, qty, entry, exit, stop, fees, notes] */
    var rows = [
      [19, 'AAPL', 'long', 'orb', 100, 187.42, 188.91, 186.90, 1.30, 'Clean 5-min ORB over the premarket high; sold into the first push.'],
      [19, 'TSLA', 'short', 'scalping', 50, 244.80, 245.62, 245.60, 1.10, 'Faded a weak bounce; stop slipped 2 cents on the fill.'],
      [18, 'NVDA', 'long', 'pullback', 30, 118.35, 121.10, 117.20, 0.90, 'First pullback to rising 9 EMA after a strong open drive.'],
      [15, 'SPY', 'long', 'orb', 40, 531.20, 529.95, 530.10, 0.80, 'Breakout failed on light volume; took the stop without hesitation.'],
      [14, 'AMD', 'long', 'pullback', 120, 158.65, 160.05, 157.90, 1.40, 'Higher low held VWAP; scaled out into the prior high.'],
      [13, 'META', 'short', 'other', 25, 502.60, 498.85, null, 1.00, 'News fade after a pop; no hard stop planned — sized small instead.'],
      [12, 'TSLA', 'long', 'scalping', 60, 249.10, 249.86, 248.72, 1.20, 'Quick level-to-level scalp off the half-dollar.'],
      [11, 'AAPL', 'short', 'scalping', 80, 189.95, 190.42, 190.40, 1.10, 'Countertrend short too early; small planned loss.'],
      [8, 'NVDA', 'long', 'orb', 40, 122.05, 120.90, 121.10, 0.90, 'Gap-and-trap open; price knifed back through the range.'],
      [7, 'SPY', 'short', 'pullback', 50, 534.75, 532.90, 535.80, 1.00, 'Lower high under VWAP in a downtrend day; covered at the LOD.'],
      [5, 'AMZN', 'long', 'pullback', 45, 185.30, 187.15, 184.40, 0.90, 'Bull flag on the 5-min; target was the measured move.'],
      [2, 'MSFT', 'long', 'orb', 35, 447.20, 445.90, 446.05, 0.80, 'Choppy open, low conviction — should have skipped this one.'],
      [1, 'AMD', 'short', 'scalping', 100, 161.40, 160.88, 161.85, 1.20, 'Rejection at yesterday high; fast scalp back to VWAP.']
    ];
    return rows.map(function (r, i) {
      return {
        id: App.uid() + i,
        date: key(r[0]),
        symbol: r[1], side: r[2], strategy: r[3],
        qty: r[4], entry: r[5], exit: r[6],
        stop: r[7], fees: r[8], notes: r[9],
        createdAt: now - r[0] * 86400000 + i
      };
    });
  }

  /* ------------------------------ render ------------------------------ */
  function render(container, sub) {
    var editingId = null;
    var filters = normalizeFilters(App.Store.get('journal.filters', null));
    var trades0 = getTrades();

    container.innerHTML = '';
    var wrap = document.createElement('div');
    container.appendChild(wrap);
    function q(sel) { return wrap.querySelector(sel); }

    /* ---------- static skeleton ---------- */
    function fieldHtml(id, label, req, inputHtml, fullWidth) {
      return '<div class="field"' + (fullWidth ? ' style="grid-column:1/-1"' : '') + '>' +
        '<label class="label" for="' + id + '">' + label + (req ? ' <span class="req">*</span>' : '') + '</label>' +
        inputHtml +
        '<div class="field-err" id="' + id + '-err" hidden></div>' +
        '</div>';
    }

    function formCardHtml() {
      var stratOpts = strategyOptions().map(function (o) {
        return '<option value="' + App.esc(o.id) + '">' + App.esc(o.name) + '</option>';
      }).join('');
      return '<section class="card" id="jr-form-card" style="margin-top:16px">' +
        '<div class="card-title">' + App.icon('plus', 15) + ' <span id="jf-title">Log a trade</span></div>' +
        '<form id="jf-form" novalidate>' +
        '<div class="form-grid">' +
        fieldHtml('jf-date', 'Date', true, '<input class="input" type="date" id="jf-date">') +
        fieldHtml('jf-symbol', 'Symbol', true, '<input class="input" type="text" id="jf-symbol" maxlength="10" placeholder="AAPL" autocomplete="off" spellcheck="false">') +
        fieldHtml('jf-side', 'Side', false, '<select class="select" id="jf-side"><option value="long">Long</option><option value="short">Short</option></select>') +
        fieldHtml('jf-strategy', 'Strategy', false, '<select class="select" id="jf-strategy">' + stratOpts + '</select>') +
        fieldHtml('jf-qty', 'Quantity', true, '<input class="input" type="number" id="jf-qty" min="0" step="any" placeholder="100" inputmode="decimal">') +
        fieldHtml('jf-entry', 'Entry price', true, '<input class="input" type="number" id="jf-entry" min="0" step="0.01" placeholder="187.42" inputmode="decimal">') +
        fieldHtml('jf-exit', 'Exit price', true, '<input class="input" type="number" id="jf-exit" min="0" step="0.01" placeholder="188.91" inputmode="decimal">') +
        fieldHtml('jf-stop', 'Planned stop', false, '<input class="input" type="number" id="jf-stop" min="0" step="0.01" placeholder="optional" inputmode="decimal">') +
        fieldHtml('jf-fees', 'Fees', false, '<input class="input" type="number" id="jf-fees" min="0" step="0.01" value="0" inputmode="decimal">') +
        fieldHtml('jf-notes', 'Notes', false, '<textarea class="textarea" id="jf-notes" rows="2" placeholder="Setup, execution, lesson…"></textarea>', true) +
        '</div>' +
        '<div class="small muted tnum" id="jf-preview" style="margin:12px 0 10px"></div>' +
        '<div class="row">' +
        '<button type="submit" class="btn btn-primary" id="jf-submit">' + App.icon('plus', 15) + ' Save trade</button>' +
        '<button type="button" class="btn btn-ghost" id="jf-cancel" data-act="cancel-edit" hidden>Cancel edit</button>' +
        '</div>' +
        '</form>' +
        '</section>';
    }

    function filterCardHtml() {
      var seen = {};
      var opts = strategyOptions();
      opts.forEach(function (o) { seen[o.id] = true; });
      trades0.forEach(function (t) {
        var id = String(t.strategy || 'other');
        if (!seen[id]) { seen[id] = true; opts.push({ id: id, name: id }); }
      });
      var stratOpts = '<option value="all">All strategies</option>' + opts.map(function (o) {
        return '<option value="' + App.esc(o.id) + '">' + App.esc(o.name) + '</option>';
      }).join('');
      return '<section class="card tight" id="jr-filter-card" style="margin-top:16px">' +
        '<div class="row">' +
        '<span class="muted" style="display:inline-flex">' + App.icon('filter', 15) + '</span>' +
        '<select class="select" id="jr-f-strategy" style="width:auto" aria-label="Filter by strategy">' + stratOpts + '</select>' +
        '<select class="select" id="jr-f-side" style="width:auto" aria-label="Filter by side">' +
        '<option value="all">All sides</option><option value="long">Long</option><option value="short">Short</option></select>' +
        '<select class="select" id="jr-f-result" style="width:auto" aria-label="Filter by result">' +
        '<option value="all">All results</option><option value="win">Winners</option><option value="loss">Losers</option></select>' +
        '<span class="small muted">From</span>' +
        '<input class="input" type="date" id="jr-f-from" style="width:auto" aria-label="Filter from date">' +
        '<span class="small muted">To</span>' +
        '<input class="input" type="date" id="jr-f-to" style="width:auto" aria-label="Filter to date">' +
        '<button type="button" class="btn btn-sm btn-ghost" data-act="clear-filters">Clear</button>' +
        '</div>' +
        '</section>';
    }

    function dataBarHtml() {
      return '<section class="card tight" style="margin-top:16px">' +
        '<div class="row">' +
        '<span class="small muted" style="font-weight:600">Data</span>' +
        '<button type="button" class="btn btn-sm" data-act="export-csv">' + App.icon('downloadIc', 14) + ' Export CSV</button>' +
        '<button type="button" class="btn btn-sm" data-act="export-json">' + App.icon('downloadIc', 14) + ' Export JSON</button>' +
        '<button type="button" class="btn btn-sm" data-act="import-json">' + App.icon('uploadIc', 14) + ' Import JSON</button>' +
        '<button type="button" class="btn btn-sm btn-danger" data-act="clear-all">' + App.icon('trash', 14) + ' Clear all</button>' +
        '<button type="button" class="btn btn-sm btn-primary" id="jr-sample-btn" data-act="load-samples" style="display:none">' + App.icon('zap', 14) + ' Load sample trades</button>' +
        '<input type="file" id="jr-file" accept=".json,application/json" hidden>' +
        '</div>' +
        '</section>';
    }

    wrap.innerHTML =
      '<div class="page-header"><h1>Trade Journal</h1>' +
      '<p class="lede">Log every trade, then let the numbers coach you — win rate, profit factor, expectancy and drawdown update live as you filter.</p></div>' +
      '<div id="jr-stats"></div>' +
      '<div id="jr-charts"></div>' +
      formCardHtml() +
      filterCardHtml() +
      '<div id="jr-tablewrap"></div>' +
      dataBarHtml();

    /* ---------- dynamic sections ---------- */
    function emptyCardHtml() {
      return '<div class="card empty">' + App.icon('journal', 40) +
        '<h3>No trades logged yet</h3>' +
        '<p class="small muted" style="max-width:46ch;margin:6px auto 16px">' +
        'The journal is where an edge gets found. Log each trade the day you take it, or load a realistic sample set to explore the stats and charts first.</p>' +
        '<div class="row" style="justify-content:center">' +
        '<button type="button" class="btn btn-primary" data-act="load-samples">' + App.icon('zap', 15) + ' Load sample trades</button>' +
        '<button type="button" class="btn" data-act="goto-form">' + App.icon('plus', 15) + ' Log your first trade</button>' +
        '</div></div>';
    }

    function statTile(label, valueHtml, cls) {
      return '<div class="stat"><div class="stat-label">' + label + '</div>' +
        '<div class="stat-value tnum' + (cls ? ' ' + cls : '') + '">' + valueHtml + '</div></div>';
    }

    function signCls(v) { return v > 0 ? 'pos' : v < 0 ? 'neg' : ''; }

    function buildStatsHtml(s) {
      if (!s.n) {
        return '<section class="card tight"><div class="row">' +
          '<span class="muted" style="display:inline-flex">' + App.icon('filter', 15) + '</span>' +
          '<span class="small muted">No trades match the current filters — adjust or clear them below.</span>' +
          '</div></section>';
      }
      var pf = s.grossL > 0 ? App.fmtNum(s.grossW / s.grossL, 2) : (s.grossW > 0 ? '∞' : '–');
      var avgWin = s.wins ? App.fmtMoney(s.grossW / s.wins, { sign: true }) : '–';
      var avgLoss = s.losses ? App.fmtMoney(-(s.grossL / s.losses), { sign: true }) : '–';
      var avgR = s.rN ? App.fmtNum(s.rSum / s.rN, 2) + 'R' : '–';
      var dd = App.fmtMoney(s.maxDD > 0 ? -s.maxDD : 0);
      var streakCls = s.streak.charAt(0) === 'W' ? 'pos' : s.streak.charAt(0) === 'L' ? 'neg' : '';
      return '<section class="card">' +
        '<div class="card-title">' + App.icon('trend', 15) + ' Performance — ' + s.n + (s.n === 1 ? ' trade' : ' trades') + '</div>' +
        '<div class="kpi-row">' +
        statTile('Net P/L', App.fmtMoney(s.net, { sign: true }), signCls(s.net)) +
        statTile('Win rate', App.fmtPct(s.winRate)) +
        statTile('Profit factor', pf) +
        statTile('Expectancy / trade', App.fmtMoney(s.net / s.n, { sign: true }), signCls(s.net)) +
        statTile('Avg win', avgWin, s.wins ? 'pos' : '') +
        statTile('Avg loss', avgLoss, s.losses ? 'neg' : '') +
        statTile('Avg realized R', avgR, s.rN ? signCls(s.rSum) : '') +
        statTile('Max drawdown', dd, s.maxDD > 0 ? 'neg' : '') +
        statTile('Best trade', App.fmtMoney(s.best, { sign: true }), signCls(s.best)) +
        statTile('Worst trade', App.fmtMoney(s.worst, { sign: true }), signCls(s.worst)) +
        statTile('Current streak', App.esc(s.streak), streakCls) +
        '</div>' +
        '</section>';
    }

    function chartCard(title, id) {
      return '<section class="card"><div class="card-title">' + title + '</div><div id="' + id + '"></div></section>';
    }

    function renderCharts(stats, filtered) {
      if (!window.Charts) return;
      var money0 = function (v) { return App.fmtMoney(v, { dec: 0 }); };

      /* (a) equity curve */
      var pts = [], tips = [];
      stats.curve.forEach(function (c, i) {
        pts.push({ x: i + 1, y: +c.cum.toFixed(2) });
        tips.push(dateLabel(c.t.date) + ' - ' + String(c.t.symbol || ''));
      });
      var eqEl = q('#jr-ch-equity');
      if (eqEl) {
        Charts.line(eqEl, {
          series: [{ name: 'Equity', points: pts, color: stats.net >= 0 ? 'var(--pos)' : 'var(--neg)', fill: true }],
          height: 230,
          zeroLine: true,
          yFormat: money0,
          xFormat: function (x) { return '#' + Math.round(x); },
          xTipFormat: function (x) {
            var i = Math.round(x) - 1;
            return tips[i] != null ? tips[i] : 'Trade #' + Math.round(x);
          }
        });
      }

      /* (b) P/L by strategy */
      var agg = {}, order = [];
      filtered.forEach(function (t) {
        var id = String(t.strategy || 'other');
        if (agg[id] == null) { agg[id] = 0; order.push(id); }
        agg[id] += App.tradePL(t);
      });
      var stEl = q('#jr-ch-strategy');
      if (stEl) {
        Charts.bars(stEl, {
          labels: order.map(strategyName),
          values: order.map(function (k) { return +agg[k].toFixed(2); }),
          height: 230, colorBySign: true, yFormat: money0
        });
      }

      /* (c) win / loss donut */
      var segs = [
        { label: 'Wins', value: stats.wins, color: 'var(--pos)' },
        { label: 'Losses', value: stats.losses, color: 'var(--neg)' }
      ];
      if (stats.scratches > 0) segs.push({ label: 'Scratches', value: stats.scratches, color: 'var(--chart-3)' });
      var doEl = q('#jr-ch-donut');
      if (doEl) {
        Charts.donut(doEl, {
          segments: segs,
          centerLabel: App.fmtPct(stats.winRate, 0),
          centerSub: 'win rate'
        });
      }

      /* (d) P/L by weekday */
      var wd = [0, 0, 0, 0, 0];
      filtered.forEach(function (t) {
        var d = parseDateKey(t.date);
        if (!d) return;
        var w = d.getDay();
        if (w >= 1 && w <= 5) wd[w - 1] += App.tradePL(t);
      });
      var wdEl = q('#jr-ch-weekday');
      if (wdEl) {
        Charts.bars(wdEl, {
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
          values: wd.map(function (v) { return +v.toFixed(2); }),
          height: 230, colorBySign: true, yFormat: money0
        });
      }
    }

    function buildTableHtml(filtered, total) {
      var newest = filtered.slice().sort(newestCmp);
      var countTxt = filtered.length === total
        ? total + (total === 1 ? ' trade' : ' trades')
        : filtered.length + ' of ' + total + ' shown';
      var html = '<section class="card" style="margin-top:16px">' +
        '<div class="spread"><div class="card-title" style="margin-bottom:0">' + App.icon('journal', 15) + ' Trade log</div>' +
        '<span class="small muted tnum">' + countTxt + '</span></div>';
      if (!newest.length) {
        html += '<p class="small muted" style="margin:12px 0 2px">No trades match the current filters.</p></section>';
        return html;
      }
      html += '<div class="table-wrap" style="margin-top:12px"><table class="table"><thead><tr>' +
        '<th>Date</th><th>Symbol</th><th>Side</th><th>Strategy</th>' +
        '<th class="num">Qty</th><th class="num">Entry</th><th class="num">Exit</th>' +
        '<th class="num">P/L</th><th class="num">R</th><th>Notes</th><th></th>' +
        '</tr></thead><tbody>';
      newest.forEach(function (t) {
        var pl = App.tradePL(t);
        var r = realizedR(t, pl);
        var notes = String(t.notes || '');
        var idAttr = App.esc(String(t.id));
        html += '<tr>' +
          '<td class="tnum" style="white-space:nowrap">' + App.esc(t.date || '') + '</td>' +
          '<td><b>' + App.esc(t.symbol || '') + '</b></td>' +
          '<td><span class="badge ' + (t.side === 'short' ? 'red' : 'green') + '">' + (t.side === 'short' ? 'Short' : 'Long') + '</span></td>' +
          '<td>' + App.esc(strategyName(t.strategy)) + '</td>' +
          '<td class="num">' + App.fmtNum(+t.qty) + '</td>' +
          '<td class="num">' + App.fmtMoney(+t.entry) + '</td>' +
          '<td class="num">' + App.fmtMoney(+t.exit) + '</td>' +
          '<td class="num ' + signCls(pl) + '"><b>' + App.fmtMoney(pl, { sign: true }) + '</b></td>' +
          '<td class="num">' + (r == null ? '–' : App.fmtNum(r, 2)) + '</td>' +
          '<td class="small"' + (notes ? ' title="' + App.esc(notes) + '"' : '') + '>' + App.esc(trunc(notes, 40)) + '</td>' +
          '<td class="row-actions">' +
          '<button type="button" class="icon-btn" data-act="edit" data-id="' + idAttr + '" title="Edit trade" aria-label="Edit trade">' + App.icon('edit', 15) + '</button>' +
          '<button type="button" class="icon-btn" data-act="del" data-id="' + idAttr + '" title="Delete trade" aria-label="Delete trade">' + App.icon('trash', 15) + '</button>' +
          '</td></tr>';
      });
      html += '</tbody></table></div></section>';
      return html;
    }

    function updateDynamic() {
      var trades = getTrades();
      var statsEl = q('#jr-stats'), chartsEl = q('#jr-charts'), tableEl = q('#jr-tablewrap');
      var sampleBtn = q('#jr-sample-btn');
      var filterCard = q('#jr-filter-card');
      if (sampleBtn) sampleBtn.style.display = trades.length ? 'none' : '';
      if (filterCard) filterCard.style.display = trades.length ? '' : 'none';
      if (!statsEl || !chartsEl || !tableEl) return;

      if (!trades.length) {
        statsEl.innerHTML = emptyCardHtml();
        chartsEl.innerHTML = '';
        tableEl.innerHTML = '';
        return;
      }

      var filtered = applyFilters(trades, filters);
      var stats = computeStats(filtered);
      statsEl.innerHTML = buildStatsHtml(stats);
      if (filtered.length) {
        chartsEl.innerHTML = '<div class="grid cols-2" style="margin-top:16px">' +
          chartCard('Equity curve (cumulative P/L)', 'jr-ch-equity') +
          chartCard('P/L by strategy', 'jr-ch-strategy') +
          chartCard('Win / loss split', 'jr-ch-donut') +
          chartCard('P/L by weekday', 'jr-ch-weekday') +
          '</div>';
        renderCharts(stats, filtered);
      } else {
        chartsEl.innerHTML = '';
      }
      tableEl.innerHTML = buildTableHtml(filtered, trades.length);
    }

    /* ---------- form logic ---------- */
    function setErr(id, msg) {
      var input = q('#' + id), err = q('#' + id + '-err');
      if (input) input.classList.toggle('invalid', !!msg);
      if (err) {
        if (msg) { err.textContent = msg; err.hidden = false; }
        else { err.textContent = ''; err.hidden = true; }
      }
    }
    function clearErrs() {
      FORM_IDS.forEach(function (id) { setErr(id, ''); });
    }

    function updatePreview() {
      var pv = q('#jf-preview');
      if (!pv) return;
      var qty = parseFloat(q('#jf-qty').value);
      var entry = parseFloat(q('#jf-entry').value);
      var exit = parseFloat(q('#jf-exit').value);
      var feesRaw = q('#jf-fees').value;
      var fees = feesRaw === '' ? 0 : parseFloat(feesRaw);
      var side = q('#jf-side').value === 'short' ? 'short' : 'long';
      if (isFinite(qty) && qty > 0 && isFinite(entry) && entry > 0 && isFinite(exit) && exit > 0) {
        var pl = App.tradePL({ qty: qty, entry: entry, exit: exit, side: side, fees: isFinite(fees) ? fees : 0 });
        var html = 'Preview — P/L: <b class="' + signCls(pl) + '">' + App.fmtMoney(pl, { sign: true }) + '</b>';
        var stopRaw = q('#jf-stop').value;
        var stop = parseFloat(stopRaw);
        if (stopRaw !== '' && isFinite(stop)) {
          var risk = Math.abs(entry - stop) * qty;
          if (risk > 0) {
            html += ' · R: <b class="' + signCls(pl) + '">' + App.fmtNum(pl / risk, 2) + 'R</b>' +
              ' · risk ' + App.fmtMoney(risk);
          } else {
            html += ' · R: – (stop equals entry)';
          }
        }
        pv.innerHTML = html;
      } else {
        pv.innerHTML = 'Preview — enter quantity, entry and exit to see P/L and R.';
      }
    }

    function resetForm() {
      editingId = null;
      var form = q('#jf-form');
      if (!form) return;
      form.reset();
      q('#jf-date').value = App.todayKey();
      q('#jf-fees').value = '0';
      q('#jf-title').textContent = 'Log a trade';
      q('#jf-submit').innerHTML = App.icon('plus', 15) + ' Save trade';
      q('#jf-cancel').hidden = true;
      clearErrs();
      updatePreview();
    }

    function enterEdit(id) {
      var trades = getTrades();
      var t = null;
      trades.forEach(function (x) { if (String(x.id) === String(id)) t = x; });
      if (!t) { App.toast('Trade not found', 'err'); return; }
      editingId = String(t.id);
      q('#jf-date').value = /^\d{4}-\d{2}-\d{2}$/.test(String(t.date || '')) ? t.date : App.todayKey();
      q('#jf-symbol').value = String(t.symbol || '');
      q('#jf-side').value = t.side === 'short' ? 'short' : 'long';
      var sSel = q('#jf-strategy');
      var sid = String(t.strategy || 'other');
      sSel.value = sid;
      if (sSel.value !== sid) sSel.value = 'other';
      q('#jf-qty').value = t.qty != null ? t.qty : '';
      q('#jf-entry').value = t.entry != null ? t.entry : '';
      q('#jf-exit').value = t.exit != null ? t.exit : '';
      q('#jf-stop').value = t.stop != null ? t.stop : '';
      q('#jf-fees').value = t.fees != null ? t.fees : '0';
      q('#jf-notes').value = String(t.notes || '');
      q('#jf-title').textContent = 'Edit trade — ' + String(t.symbol || '');
      q('#jf-submit').innerHTML = App.icon('check', 15) + ' Update trade';
      q('#jf-cancel').hidden = false;
      clearErrs();
      updatePreview();
      var card = q('#jr-form-card');
      if (card && card.scrollIntoView) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function onSave(ev) {
      ev.preventDefault();
      var errs = 0;
      function check(id, ok, msg) {
        if (ok) { setErr(id, ''); } else { setErr(id, msg); errs++; }
      }
      var date = q('#jf-date').value;
      var symbol = q('#jf-symbol').value.trim().toUpperCase();
      var side = q('#jf-side').value === 'short' ? 'short' : 'long';
      var strategy = q('#jf-strategy').value || 'other';
      var qty = parseFloat(q('#jf-qty').value);
      var entry = parseFloat(q('#jf-entry').value);
      var exit = parseFloat(q('#jf-exit').value);
      var stopRaw = q('#jf-stop').value.trim();
      var stop = stopRaw === '' ? null : parseFloat(stopRaw);
      var feesRaw = q('#jf-fees').value.trim();
      var fees = feesRaw === '' ? 0 : parseFloat(feesRaw);
      var notes = q('#jf-notes').value;

      check('jf-date', /^\d{4}-\d{2}-\d{2}$/.test(date), 'Pick a date');
      check('jf-symbol', symbol.length > 0, 'Symbol is required');
      check('jf-qty', isFinite(qty) && qty > 0, 'Enter a quantity above 0');
      check('jf-entry', isFinite(entry) && entry > 0, 'Enter a price above 0');
      check('jf-exit', isFinite(exit) && exit > 0, 'Enter a price above 0');
      check('jf-stop', stop === null || (isFinite(stop) && stop > 0), 'Stop must be a price above 0');
      check('jf-fees', isFinite(fees) && fees >= 0, 'Fees must be 0 or more');
      if (errs) { App.toast('Please fix the highlighted fields', 'err'); return; }

      var trades = getTrades();
      var rec = {
        id: editingId || App.uid(),
        date: date, symbol: symbol.slice(0, 12), side: side, strategy: strategy,
        qty: qty, entry: entry, exit: exit, fees: fees, stop: stop,
        notes: notes, createdAt: Date.now(),
        /* updatedAt lets Backup & Sync pick the freshest copy of an edited trade */
        updatedAt: Date.now()
      };
      var updated = false;
      if (editingId) {
        for (var i = 0; i < trades.length; i++) {
          if (String(trades[i].id) === editingId) {
            rec.createdAt = +trades[i].createdAt || rec.createdAt;
            trades[i] = rec;
            updated = true;
            break;
          }
        }
      }
      if (!updated) trades.push(rec);
      App.Store.set('trades', trades);
      App.toast(updated ? 'Trade updated' : 'Trade saved — ' + App.fmtMoney(App.tradePL(rec), { sign: true }), 'ok');
      render(container, []);
    }

    /* ---------- filters ---------- */
    function syncFilterControls() {
      var s = q('#jr-f-strategy');
      if (s) {
        s.value = filters.strategy;
        if (s.value !== filters.strategy) { filters.strategy = 'all'; s.value = 'all'; }
      }
      var sd = q('#jr-f-side'); if (sd) sd.value = filters.side;
      var rs = q('#jr-f-result'); if (rs) rs.value = filters.result;
      var fr = q('#jr-f-from'); if (fr) fr.value = filters.from;
      var to = q('#jr-f-to'); if (to) to.value = filters.to;
    }

    function readFilters() {
      filters = normalizeFilters({
        strategy: q('#jr-f-strategy') ? q('#jr-f-strategy').value : 'all',
        side: q('#jr-f-side') ? q('#jr-f-side').value : 'all',
        result: q('#jr-f-result') ? q('#jr-f-result').value : 'all',
        from: q('#jr-f-from') ? q('#jr-f-from').value : '',
        to: q('#jr-f-to') ? q('#jr-f-to').value : ''
      });
    }

    /* ---------- data bar actions ---------- */
    function loadSamples() {
      if (getTrades().length) { App.toast('Journal already has trades', 'err'); return; }
      var s = sampleTrades();
      App.Store.set('trades', s);
      App.toast('Loaded ' + s.length + ' sample trades', 'ok');
      render(container, []);
    }

    function exportCsv() {
      var trades = getTrades().slice().sort(chronCmp);
      if (!trades.length) { App.toast('Nothing to export yet', 'err'); return; }
      var lines = ['date,symbol,side,strategy,qty,entry,exit,stop,fees,pl,notes,id'];
      trades.forEach(function (t) {
        lines.push([
          t.date, t.symbol, t.side, t.strategy || 'other',
          t.qty, t.entry, t.exit,
          t.stop == null ? '' : t.stop,
          isFinite(+t.fees) ? +t.fees : 0,
          App.tradePL(t).toFixed(2),
          t.notes || '', t.id
        ].map(csvCell).join(','));
      });
      App.download('tradelab-trades-' + App.todayKey() + '.csv', lines.join('\n'), 'text/csv');
      App.toast('Exported ' + trades.length + (trades.length === 1 ? ' trade' : ' trades') + ' to CSV', 'ok');
    }

    function exportJson() {
      var trades = getTrades();
      if (!trades.length) { App.toast('Nothing to export yet', 'err'); return; }
      App.download('tradelab-trades-' + App.todayKey() + '.json', JSON.stringify(trades, null, 2), 'application/json');
      App.toast('Exported ' + trades.length + (trades.length === 1 ? ' trade' : ' trades') + ' to JSON', 'ok');
    }

    function clearAll() {
      var trades = getTrades();
      if (!trades.length) { App.toast('Journal is already empty', 'err'); return; }
      if (!confirm('Delete ALL ' + trades.length + ' trades from the journal?')) return;
      if (!confirm('Are you sure? This cannot be undone.')) return;
      App.Store.set('trades', []);
      App.toast('Journal cleared', 'ok');
      render(container, []);
    }

    function importFile(file, input) {
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var data = JSON.parse(String(reader.result));
          if (!Array.isArray(data)) throw new Error('expected a JSON array of trades');
          var valid = [];
          data.forEach(function (t) { if (validImportTrade(t)) valid.push(normTrade(t)); });
          if (!valid.length) {
            App.toast('No valid trades found in that file', 'err');
            input.value = '';
            return;
          }
          var trades = getTrades();
          var skipped = data.length - valid.length;
          var replace = confirm(
            'Import ' + valid.length + (valid.length === 1 ? ' trade' : ' trades') +
            (skipped ? ' (' + skipped + ' invalid skipped)' : '') + '.\n\n' +
            'OK = REPLACE the current journal (' + trades.length + ' trades).\n' +
            'Cancel = MERGE into the current journal (matching ids are updated).'
          );
          if (replace) {
            App.Store.set('trades', valid);
            App.toast('Journal replaced — ' + valid.length + ' imported', 'ok');
          } else {
            var byId = Object.create(null), added = 0, changed = 0;
            trades.forEach(function (t, i) { byId[String(t.id)] = i; });
            valid.forEach(function (t) {
              var k = String(t.id);
              if (byId[k] != null) { trades[byId[k]] = t; changed++; }
              else { byId[k] = trades.length; trades.push(t); added++; }
            });
            App.Store.set('trades', trades);
            App.toast('Merged import — ' + added + ' added, ' + changed + ' updated', 'ok');
          }
          input.value = '';
          render(container, []);
        } catch (e) {
          App.toast('Import failed: ' + (e && e.message ? e.message : 'invalid JSON'), 'err');
          input.value = '';
        }
      };
      reader.onerror = function () {
        App.toast('Could not read that file', 'err');
        input.value = '';
      };
      reader.readAsText(file);
    }

    function deleteTrade(id) {
      var trades = getTrades();
      var t = null;
      trades.forEach(function (x) { if (String(x.id) === String(id)) t = x; });
      if (!t) return;
      if (!confirm('Delete the ' + String(t.symbol || '') + ' trade from ' + String(t.date || '') + '?')) return;
      var next = trades.filter(function (x) { return String(x.id) !== String(id); });
      App.Store.set('trades', next);
      App.toast('Trade deleted', 'ok');
      render(container, []);
    }

    /* ---------- wiring ---------- */
    wrap.addEventListener('click', function (ev) {
      var btn = ev.target && ev.target.closest ? ev.target.closest('[data-act]') : null;
      if (!btn || !wrap.contains(btn)) return;
      var act = btn.getAttribute('data-act');
      if (act === 'edit') { enterEdit(btn.getAttribute('data-id')); }
      else if (act === 'del') { deleteTrade(btn.getAttribute('data-id')); }
      else if (act === 'load-samples') { loadSamples(); }
      else if (act === 'goto-form') {
        var card = q('#jr-form-card');
        if (card && card.scrollIntoView) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
        var sym = q('#jf-symbol');
        if (sym) { try { sym.focus({ preventScroll: true }); } catch (e) { sym.focus(); } }
      }
      else if (act === 'cancel-edit') { resetForm(); }
      else if (act === 'clear-filters') {
        filters = normalizeFilters(null);
        App.Store.set('journal.filters', filters);
        syncFilterControls();
        updateDynamic();
      }
      else if (act === 'export-csv') { exportCsv(); }
      else if (act === 'export-json') { exportJson(); }
      else if (act === 'import-json') { var fi = q('#jr-file'); if (fi) fi.click(); }
      else if (act === 'clear-all') { clearAll(); }
    });

    var form = q('#jf-form');
    form.addEventListener('submit', onSave);
    form.addEventListener('input', function (ev) {
      var t = ev.target;
      if (t && t.id === 'jf-symbol') {
        var up = t.value.toUpperCase();
        if (up !== t.value) t.value = up;
      }
      updatePreview();
    });
    form.addEventListener('change', updatePreview);

    q('#jr-filter-card').addEventListener('change', function () {
      readFilters();
      App.Store.set('journal.filters', filters);
      updateDynamic();
    });

    q('#jr-file').addEventListener('change', function () {
      var f = this.files && this.files[0];
      if (!f) return;
      importFile(f, this);
    });

    syncFilterControls();
    resetForm();
    updateDynamic();
  }

  window.Journal = { render: render };
})();
