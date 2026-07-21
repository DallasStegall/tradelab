/* ==========================================================================
   TradeLab — Insights (self-coach)
   A rules-based coach that reads only YOUR OWN logged data — trades,
   daily reflections, pre-market checklists — and surfaces patterns in how
   you trade. It is descriptive, not predictive: it never recommends a trade,
   forecasts a market, or gives financial advice. Every finding shows the
   sample size it rests on, and thin samples are withheld rather than guessed.

   All P/L goes through App.tradePL (single source). No network, no external
   AI — pure arithmetic over localStorage.

   Public API:
     Insights.render(container, sub)
     Insights.status()  -> {trades, patterns} | null   (dashboard, read-only)
     Insights.compute() -> full analysis object         (exposed for tests)
   ========================================================================== */
(function () {
  'use strict';

  /* A bucket must hold at least this many trades before we'll compare or flag
     it — small samples produce confident-sounding noise. */
  var MIN_BUCKET = 4;
  var MIN_PAGE = 5;          /* below this, the page just encourages logging */
  var MIN_PAIR = 4;          /* after-loss / mood / checklist comparisons */

  var DK_RE = /^\d{4}-\d{2}-\d{2}$/;
  var WD_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var WD_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MOOD_LABEL = { 1: 'Rough', 2: 'Flat', 3: 'Good', 4: 'Dialed in' };

  /* ------------------------------ data access ------------------------------ */
  function getTrades() {
    var t = App.Store.get('trades', []);
    if (!Array.isArray(t)) return [];
    return t.filter(function (x) {
      return x && typeof x === 'object' && DK_RE.test(String(x.date || '')) &&
        isFinite(+x.qty) && isFinite(+x.entry) && isFinite(+x.exit);
    });
  }
  function getDiary() {
    var d = App.Store.get('diary.entries', {});
    return (d && typeof d === 'object' && !Array.isArray(d)) ? d : {};
  }
  function getChecklistHistory() {
    var h = App.Store.get('checklist.history', {});
    return (h && typeof h === 'object' && !Array.isArray(h)) ? h : {};
  }

  function strategyName(id) {
    var key = id == null || id === '' ? 'other' : String(id);
    var data = window.STRATEGY_DATA;
    if (Array.isArray(data)) {
      for (var i = 0; i < data.length; i++) {
        if (data[i] && String(data[i].id) === key) return String(data[i].name || key);
      }
    }
    return { orb: 'Opening Range Breakout', pullback: 'Pullback Trading', scalping: 'Scalping', other: 'Other' }[key] || key;
  }

  function parseKey(k) {
    var p = String(k).split('-');
    var d = new Date(+p[0], (+p[1] || 1) - 1, +p[2] || 1);
    return isNaN(+d) ? null : d;
  }

  /* Risk in dollars for a trade with a stop, else null. */
  function riskDollars(t) {
    if (t.stop == null || t.stop === '' || !isFinite(+t.stop)) return null;
    var r = Math.abs((+t.entry) - (+t.stop)) * Math.abs(+t.qty || 0);
    return r > 0 ? r : null;
  }
  function realizedR(t, pl) {
    var risk = riskDollars(t);
    return risk == null ? null : pl / risk;
  }

  function mean(arr) {
    if (!arr.length) return 0;
    var s = 0; for (var i = 0; i < arr.length; i++) s += arr[i];
    return s / arr.length;
  }
  function median(arr) {
    if (!arr.length) return 0;
    var a = arr.slice().sort(function (x, y) { return x - y; });
    var m = Math.floor(a.length / 2);
    return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
  }

  /* Roll a set of trades into a comparable summary. */
  function summarize(trades) {
    var net = 0, wins = 0, losses = 0, n = trades.length, rSum = 0, rN = 0;
    trades.forEach(function (t) {
      var pl = App.tradePL(t);
      net += pl;
      if (pl > 0) wins++; else if (pl < 0) losses++;
      var r = realizedR(t, pl);
      if (r != null) { rSum += r; rN++; }
    });
    return {
      n: n, net: net, wins: wins, losses: losses,
      /* wins / total, matching the journal and dashboard convention (scratches
         count toward the denominator) so the same trades never show two rates */
      winRate: n ? (wins / n) * 100 : 0,
      avgPL: n ? net / n : 0,
      avgR: rN ? rSum / rN : null, rN: rN
    };
  }

  /* ------------------------------ compute ------------------------------ */
  function compute() {
    var trades = getTrades();
    var diary = getDiary();
    var chk = getChecklistHistory();
    var out = { trades: trades.length, overall: null, byStrategy: [], bySide: [], byWeekday: [], cards: [] };
    /* Below the page threshold nothing is emitted — this keeps status() (and so
       the dashboard "N patterns found") in lockstep with what the page shows,
       instead of a lone sub-5-trade card leaking through. */
    if (trades.length < MIN_PAGE) return out;

    out.overall = summarize(trades);

    /* daily P/L: date -> summed P/L, and ordered trades per day (by createdAt) */
    var dayPL = {}, dayTrades = {};
    trades.forEach(function (t) {
      var k = t.date;
      dayPL[k] = (dayPL[k] || 0) + App.tradePL(t);
      (dayTrades[k] || (dayTrades[k] = [])).push(t);
    });
    Object.keys(dayTrades).forEach(function (k) {
      dayTrades[k].sort(function (a, b) { return (+a.createdAt || 0) - (+b.createdAt || 0); });
    });
    out.dayPL = dayPL;

    /* group helper — null-prototype map so a hostile strategy string like
       "__proto__" or "constructor" (possible from a restored backup) is a plain
       key, not an inherited method that breaks the `if (!m[k])` init. */
    function group(keyFn) {
      var m = Object.create(null), order = [];
      trades.forEach(function (t) {
        var k = keyFn(t);
        if (k == null) return;
        if (!m[k]) { m[k] = []; order.push(k); }
        m[k].push(t);
      });
      return { m: m, order: order };
    }

    /* by strategy */
    var gs = group(function (t) { return String(t.strategy || 'other'); });
    out.byStrategy = gs.order.map(function (k) {
      var s = summarize(gs.m[k]); s.key = k; s.name = strategyName(k); return s;
    });
    /* by side */
    var gd = group(function (t) { return t.side === 'short' ? 'short' : 'long'; });
    out.bySide = gd.order.map(function (k) {
      var s = summarize(gd.m[k]); s.key = k; s.name = k === 'short' ? 'Short' : 'Long'; return s;
    });
    /* by weekday */
    var gw = group(function (t) { var d = parseKey(t.date); return d ? String(d.getDay()) : null; });
    out.byWeekday = gw.order.map(function (k) {
      var s = summarize(gw.m[k]); s.wd = +k; s.name = WD_LONG[+k]; return s;
    }).sort(function (a, b) { return a.wd - b.wd; });

    out.cards = buildCards(out, trades, diary, chk, dayPL, dayTrades);
    return out;
  }

  /* ------------------------------ card builders ------------------------------ */
  function buildCards(a, trades, diary, chk, dayPL, dayTrades) {
    var cards = [];

    /* 1. Expectancy — is the system, as traded, paying you? */
    var ov = a.overall;
    if (ov.n >= MIN_PAGE) {
      var tone = ov.avgPL > 0 ? 'pos' : ov.avgPL < 0 ? 'neg' : 'neutral';
      var rTxt = ov.avgR != null ? ' (' + (ov.avgR >= 0 ? '+' : '') + ov.avgR.toFixed(2) + 'R avg, ' + ov.rN + ' with stops)' : '';
      var eNote;
      if (ov.avgPL > 0) {
        eNote = 'Across ' + ov.n + ' trades your average outcome is positive' + rTxt + '. Protect what is working — same size, same rules.';
      } else if (ov.avgPL < 0) {
        eNote = 'Across ' + ov.n + ' trades your average trade loses money' + rTxt + '. ';
        /* dollars negative but R positive = a sizing problem, not an edge problem */
        eNote += (ov.avgR != null && ov.avgR > 0)
          ? 'Oddly, on an R basis you are net positive — a sign one oversized loss is outweighing many good trades. Check the position-size card below.'
          : 'Before adding size, find which bucket below is draining the edge.';
      } else {
        eNote = 'Across ' + ov.n + ' trades you are breaking even' + rTxt + '. No edge is showing yet — keep logging before changing anything.';
      }
      cards.push({
        icon: 'target', tone: tone,
        title: 'Expectancy per trade',
        value: App.fmtMoney(ov.avgPL, { sign: true }),
        note: eNote,
        sample: ov.n
      });
    }

    /* 2. Best vs worst strategy */
    var strat = a.byStrategy.filter(function (s) { return s.n >= MIN_BUCKET; });
    if (strat.length >= 2) {
      var byAvg = strat.slice().sort(function (x, y) { return y.avgPL - x.avgPL; });
      var top = byAvg[0], bot = byAvg[byAvg.length - 1];
      if (top.key !== bot.key && Math.abs(top.avgPL - bot.avgPL) > 0) {
        cards.push({
          icon: 'book', tone: bot.avgPL < 0 ? 'neg' : 'neutral',
          title: 'Your edge is uneven across setups',
          value: top.name + ' vs ' + bot.name,
          note: top.name + ' averages ' + App.fmtMoney(top.avgPL, { sign: true }) + '/trade (' + App.fmtPct(top.winRate, 0) + ' win, ' + top.n + ' trades), while ' +
            bot.name + ' averages ' + App.fmtMoney(bot.avgPL, { sign: true }) + ' (' + App.fmtPct(bot.winRate, 0) + ' win, ' + bot.n + ' trades). Is the weaker one worth keeping in your playbook right now?',
          sample: top.n + bot.n
        });
      }
    }

    /* 3. Long vs short */
    var sides = a.bySide.filter(function (s) { return s.n >= MIN_BUCKET; });
    if (sides.length === 2) {
      var lng = sides[0].key === 'long' ? sides[0] : sides[1];
      var sht = sides[0].key === 'short' ? sides[0] : sides[1];
      if (Math.abs(lng.avgPL - sht.avgPL) > 0) {
        var strong = lng.avgPL >= sht.avgPL ? lng : sht;
        var weak = strong === lng ? sht : lng;
        cards.push({
          icon: 'trend', tone: weak.avgPL < 0 ? 'neg' : 'neutral',
          title: 'Long and short are not equal for you',
          value: strong.name + ' is stronger',
          note: strong.name + ': ' + App.fmtMoney(strong.avgPL, { sign: true }) + '/trade over ' + strong.n + '. ' +
            weak.name + ': ' + App.fmtMoney(weak.avgPL, { sign: true }) + ' over ' + weak.n + '. ' +
            (weak.avgPL < 0 ? 'Your ' + weak.name.toLowerCase() + ' trades are costing you — worth studying what those setups have in common.' : 'Both work, but the gap is worth noticing.'),
          sample: strong.n + weak.n
        });
      }
    }

    /* 4. Weekday pattern — Mon–Fri only, matching the chart; a weekend-dated
       trade (typo, carried-position close) is data noise, not a trading day. */
    var wds = a.byWeekday.filter(function (s) { return s.n >= MIN_BUCKET && s.wd >= 1 && s.wd <= 5; });
    if (wds.length >= 2) {
      var wsort = wds.slice().sort(function (x, y) { return y.avgPL - x.avgPL; });
      var wb = wsort[0], ww = wsort[wsort.length - 1];
      if (ww.avgPL < 0 && wb.wd !== ww.wd) {
        cards.push({
          icon: 'calendar', tone: 'neg',
          title: WD_LONG[ww.wd] + 's are your soft spot',
          value: App.fmtMoney(ww.avgPL, { sign: true }) + '/trade',
          note: 'On ' + WD_LONG[ww.wd] + 's you average ' + App.fmtMoney(ww.avgPL, { sign: true }) + ' over ' + ww.n + ' trades, versus ' +
            App.fmtMoney(wb.avgPL, { sign: true }) + ' on ' + WD_LONG[wb.wd] + 's. Same you, different day — what changes about your prep or focus?',
          sample: ww.n
        });
      }
    }

    /* 5. Revenge / loss-clustering: the trade right after a loss, same day */
    var afterLoss = [], allDecided = 0, allLosses = 0, revengeDays = {};
    Object.keys(dayTrades).forEach(function (k) {
      var seq = dayTrades[k];
      for (var i = 0; i < seq.length; i++) {
        var pl = App.tradePL(seq[i]);
        if (pl !== 0) { allDecided++; if (pl < 0) allLosses++; }
        if (i > 0) {
          var prev = App.tradePL(seq[i - 1]);
          if (prev < 0 && pl !== 0) { afterLoss.push(pl); revengeDays[k] = true; }
        }
      }
    });
    /* require the pattern to span >= 2 distinct days — one bad session's
       contiguous losing streak is not a stable "tilt signature" */
    var revengeDayCount = Object.keys(revengeDays).length;
    if (afterLoss.length >= MIN_PAIR && allDecided >= MIN_PAGE && revengeDayCount >= 2) {
      var afterLossLossRate = afterLoss.filter(function (p) { return p < 0; }).length / afterLoss.length * 100;
      var baseLossRate = allLosses / allDecided * 100;
      if (afterLossLossRate - baseLossRate >= 10) {
        cards.push({
          icon: 'alert', tone: 'neg',
          title: 'Possible revenge-trading tell',
          value: Math.round(afterLossLossRate) + '% lose after a loss',
          note: 'Your next same-day trade after a loss loses ' + Math.round(afterLossLossRate) + '% of the time, versus ' +
            Math.round(baseLossRate) + '% overall (' + afterLoss.length + ' after-loss trades across ' + revengeDayCount + ' days). This looks like a tilt signature — a written “one loss, step away for 10 minutes” rule directly targets it.',
          sample: afterLoss.length
        });
      }
    }

    /* 6. Position-size consistency */
    var risks = [];
    trades.forEach(function (t) { var r = riskDollars(t); if (r != null) risks.push(r); });
    if (risks.length >= MIN_BUCKET) {
      var med = median(risks), mn = Math.min.apply(null, risks), mx = Math.max.apply(null, risks);
      if (med > 0 && mx >= med * 2.5) {
        cards.push({
          icon: 'shield', tone: 'neutral',
          title: 'Your risk per trade swings a lot',
          value: App.fmtMoney(mn, { dec: 0 }) + ' – ' + App.fmtMoney(mx, { dec: 0 }),
          note: 'Across ' + risks.length + ' trades with a stop, your dollar risk ranged ' + App.fmtMoney(mn, { dec: 0 }) + ' to ' + App.fmtMoney(mx, { dec: 0 }) +
            ' (median ' + App.fmtMoney(med, { dec: 0 }) + '). The biggest risk is ' + (mx / med).toFixed(1) + '× the median — one oversized trade can undo a good week. Fixed-fractional sizing keeps every bet the same weight.',
          sample: risks.length
        });
      }
    }

    /* 7. Mood (diary) vs that day's P/L */
    var low = [], high = [];
    Object.keys(diary).forEach(function (k) {
      if (!DK_RE.test(k)) return;
      var e = diary[k];
      if (!e || typeof e !== 'object') return;
      var mood = Math.round(+e.mood || 0);
      if (mood < 1 || mood > 4) return;
      if (dayPL[k] == null) return;         /* only days you actually traded */
      if (mood <= 2) low.push(dayPL[k]); else high.push(dayPL[k]);
    });
    if (low.length >= 3 && high.length >= 3) {
      var lowAvg = mean(low), highAvg = mean(high);
      if (Math.abs(highAvg - lowAvg) > 0) {
        cards.push({
          icon: 'brain', tone: lowAvg < 0 ? 'neg' : 'neutral',
          title: 'How you feel tracks how you trade',
          value: App.fmtMoney(highAvg, { sign: true }) + ' vs ' + App.fmtMoney(lowAvg, { sign: true }),
          note: 'On days you rated your state Good or Dialed in, you averaged ' + App.fmtMoney(highAvg, { sign: true }) + ' (' + high.length + ' days). On Rough or Flat days, ' +
            App.fmtMoney(lowAvg, { sign: true }) + ' (' + low.length + ' days). Your reflections are calling the shots before the market does — a rough-morning rule (smaller size, or sit out) may be your cheapest edge.',
          sample: low.length + high.length, unit: 'day'
        });
      }
    }

    /* 8. Checklist discipline vs P/L */
    var done = [], notDone = [];
    Object.keys(dayPL).forEach(function (k) {
      var rec = chk[k];
      var complete = rec && rec.total > 0 && (rec.done / rec.total) >= 0.8;
      if (complete) done.push(dayPL[k]); else notDone.push(dayPL[k]);
    });
    if (done.length >= 3 && notDone.length >= 3) {
      var dAvg = mean(done), nAvg = mean(notDone);
      if (dAvg - nAvg > 0) {
        /* checklist days did better — but "better" can still be a loss; only
           call it positive when those days are actually green */
        var chkPositive = dAvg > 0;
        cards.push({
          icon: 'clipboard', tone: chkPositive ? 'pos' : 'neutral',
          title: 'Prep shows up in the numbers',
          value: App.fmtMoney(dAvg, { sign: true }) + ' vs ' + App.fmtMoney(nAvg, { sign: true }),
          note: 'Days you finished your pre-market checklist (≥80%) averaged ' + App.fmtMoney(dAvg, { sign: true }) + ' (' + done.length + ' days), versus ' +
            App.fmtMoney(nAvg, { sign: true }) + ' on days you didn\'t (' + notDone.length + '). ' +
            (chkPositive
              ? 'The routine is not busywork — it is showing up in your P/L.'
              : 'You still lose on checklist days, but you lose noticeably less — the routine is cushioning the damage while you tighten the rest.'),
          sample: done.length + notDone.length, unit: 'day'
        });
      }
    }

    return cards;
  }

  /* ------------------------------ status (dashboard) ------------------------------ */
  function status() {
    try {
      if (!window.App || !window.App.Store) return null;
      var a = compute();
      return { trades: a.trades, patterns: a.cards.length };
    } catch (e) {
      return null;
    }
  }

  /* ------------------------------ render ------------------------------ */
  function toneClass(tone) { return tone === 'pos' ? 'pos' : tone === 'neg' ? 'neg' : ''; }

  function overallStrip(ov) {
    return '<section class="card">' +
      '<div class="card-title">' + App.icon('trend', 15) + ' Your record so far</div>' +
      '<div class="kpi-row" style="margin-top:8px">' +
      '<div class="stat"><div class="stat-label">Trades</div><div class="stat-value tnum">' + ov.n + '</div></div>' +
      '<div class="stat"><div class="stat-label">Net P/L</div><div class="stat-value tnum ' + (ov.net >= 0 ? 'pos' : 'neg') + '">' + App.fmtMoney(ov.net, { sign: true }) + '</div></div>' +
      '<div class="stat"><div class="stat-label">Win rate</div><div class="stat-value tnum">' + App.fmtPct(ov.winRate, 0) + '</div></div>' +
      '<div class="stat"><div class="stat-label">Avg / trade</div><div class="stat-value tnum ' + (ov.avgPL >= 0 ? 'pos' : 'neg') + '">' + App.fmtMoney(ov.avgPL, { sign: true }) + '</div></div>' +
      '</div>' +
      '<div id="ins-weekday" style="margin-top:14px"></div>' +
      '<div class="small muted" style="margin-top:6px">P/L by weekday</div>' +
      '</section>';
  }

  function insightCard(c) {
    return '<section class="card insight-card ' + toneClass(c.tone) + '">' +
      '<div class="insight-head">' +
      '<span class="insight-ic">' + App.icon(c.icon, 18) + '</span>' +
      '<div><div class="insight-title">' + App.esc(c.title) + '</div>' +
      '<div class="insight-value ' + toneClass(c.tone) + '">' + App.esc(c.value) + '</div></div>' +
      '</div>' +
      '<p class="small" style="margin:8px 0 0;color:var(--ink-2)">' + App.esc(c.note) + '</p>' +
      '<div class="small muted" style="margin-top:8px">' + App.icon('info', 12) + ' based on ' + c.sample + ' ' + (c.unit || 'trade') + (c.sample === 1 ? '' : 's') + '</div>' +
      '</section>';
  }

  function emptyState(nTrades) {
    return '<section class="card">' +
      '<div class="card-title">' + App.icon('brain', 15) + ' Not enough data yet</div>' +
      '<p class="small" style="margin:6px 0 0;color:var(--ink-2)">' +
      (nTrades ? 'You have logged <b>' + nTrades + '</b> trade' + (nTrades === 1 ? '' : 's') + '. ' : '') +
      'The coach needs at least <b>' + MIN_PAGE + '</b> logged trades before it can find reliable patterns — and it gets much sharper once you also keep <a href="#/reflection">daily reflections</a> and run the <a href="#/checklist">pre-market checklist</a>, since it cross-references all three.</p>' +
      '<div class="row" style="margin-top:12px;flex-wrap:wrap;gap:8px">' +
      '<a class="btn btn-primary" href="#/journal">' + App.icon('journal', 15) + ' Log a trade</a>' +
      '<a class="btn" href="#/reflection">' + App.icon('edit', 15) + ' Write a reflection</a>' +
      '</div></section>';
  }

  function render(container, sub) {
    var a = compute();

    var root = document.createElement('div');
    var head =
      '<div class="page-header"><h1>Insights</h1>' +
      '<p class="lede">Your own coach. This reads only what you have logged — trades, reflections, checklists — and points out patterns in how you trade. It describes your past behaviour; it does not predict markets or tell you what to buy.</p></div>';

    if (a.trades < MIN_PAGE) {
      root.innerHTML = head + emptyState(a.trades);
      container.innerHTML = '';
      container.appendChild(root);
      return;
    }

    var body = head + overallStrip(a.overall);
    if (a.cards.length) {
      body += '<h2 style="margin:24px 0 12px">What your data is telling you</h2>' +
        '<div class="grid cols-2">' + a.cards.map(insightCard).join('') + '</div>';
    } else {
      body += '<section class="card" style="margin-top:16px"><p class="small muted" style="margin:0">' +
        'No standout patterns crossed the confidence bar yet — that is a good sign of consistency. Keep logging and the coach will flag anything that drifts.</p></section>';
    }
    body += '<p class="small muted" style="margin-top:18px">' + App.icon('shield', 12) +
      ' These are patterns in your past trades, not predictions or advice. Small samples are held back on purpose — every card shows how many trades it rests on.</p>';

    root.innerHTML = body;
    container.innerHTML = '';
    container.appendChild(root);

    /* weekday chart (guarded — Charts may be absent, data may be thin) */
    if (window.Charts) {
      var wd = [0, 0, 0, 0, 0], seen = false;
      a.byWeekday.forEach(function (s) {
        if (s.wd >= 1 && s.wd <= 5) { wd[s.wd - 1] = +s.net.toFixed(2); seen = true; }
      });
      var el = root.querySelector('#ins-weekday');
      if (el && seen) {
        Charts.bars(el, {
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
          values: wd, height: 200, colorBySign: true,
          yFormat: function (v) { return App.fmtMoney(v, { dec: 0 }); }
        });
      }
    }
  }

  window.Insights = { render: render, status: status, compute: compute };
})();
