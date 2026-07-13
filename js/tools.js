/* ==========================================================================
   TradeLab — Interactive Tools (js/tools.js)
   Four tools: position size / risk calculator, breakeven calculator,
   Monte Carlo P/L simulator, volume profile explainer.

   Global: window.Tools = { render(container, sub) }
   Storage: App.Store 'tools.inputs' = { toolId: {inputName: value} }
   ========================================================================== */
(function () {
  'use strict';

  var TOOLS = [
    { id: 'position', label: 'Position size', icon: 'target' },
    { id: 'breakeven', label: 'Breakeven', icon: 'dollar' },
    { id: 'simulator', label: 'P/L simulator', icon: 'trend' },
    { id: 'volume-profile', label: 'Volume profile', icon: 'layers' }
  ];

  /* ------------------------------ input persistence ------------------------------ */
  function loadInputs(toolId, defaults) {
    var all = App.Store.get('tools.inputs', {});
    var saved = (all && typeof all === 'object' && all[toolId] && typeof all[toolId] === 'object') ? all[toolId] : {};
    var out = {};
    Object.keys(defaults).forEach(function (k) {
      var v = saved[k];
      out[k] = (v == null || v === '' || (typeof v === 'number' && !isFinite(v))) ? defaults[k] : v;
    });
    return out;
  }
  function saveInputs(toolId, obj) {
    var all = App.Store.get('tools.inputs', {});
    if (!all || typeof all !== 'object' || Array.isArray(all)) all = {};
    all[toolId] = obj;
    App.Store.set('tools.inputs', all);
  }

  /* ------------------------------ small builders ------------------------------ */
  function numField(id, label, value, step, hint) {
    return '<div class="field">' +
      '<label class="label" for="' + id + '">' + label + '</label>' +
      '<input class="input tnum" type="number" id="' + id + '" value="' + App.esc(String(value)) + '" step="' + (step || 'any') + '" inputmode="decimal">' +
      (hint ? '<div class="small muted">' + hint + '</div>' : '') +
      '</div>';
  }
  function stat(label, valueHtml, cls) {
    return '<div class="stat"><div class="stat-label">' + label + '</div>' +
      '<div class="stat-value tnum' + (cls ? ' ' + cls : '') + '">' + valueHtml + '</div></div>';
  }
  function num(el) {
    var v = parseFloat(el && el.value);
    return isFinite(v) ? v : NaN;
  }

  /* =============================== POSITION SIZE =============================== */
  function renderPosition(body) {
    var inp = loadInputs('position', { account: 30000, risk: 1, entry: 50, stop: 49.5 });
    body.innerHTML =
      '<section class="card">' +
      '<div class="card-title">' + App.icon('target', 15) + ' Position size / risk calculator</div>' +
      '<div class="form-grid">' +
      numField('ps-account', 'Account size ($)', inp.account, '100') +
      numField('ps-risk', 'Risk per trade (%)', inp.risk, '0.05', 'Typical: 0.25–2%. Start small.') +
      numField('ps-entry', 'Entry price ($)', inp.entry, '0.01') +
      numField('ps-stop', 'Stop price ($)', inp.stop, '0.01', 'Below entry = long, above = short.') +
      '</div>' +
      '<div id="ps-out" style="margin-top:16px"></div>' +
      '</section>' +
      '<section class="card" style="margin-top:16px">' +
      '<div class="callout info"><div><b>Formula.</b> <span class="mono">shares = floor((account × risk%) ÷ |entry − stop|)</span> — the stop distance sets the size, so every trade risks the same fraction of the account no matter how tight or wide the setup is.</div></div>' +
      '<p class="small muted" style="margin:0">The stop belongs at the level that proves the trade wrong (below the swing low, beyond the range). Pick the stop first; the share count is just arithmetic.</p>' +
      '</section>';

    function update() {
      var account = num(body.querySelector('#ps-account'));
      var risk = num(body.querySelector('#ps-risk'));
      var entry = num(body.querySelector('#ps-entry'));
      var stop = num(body.querySelector('#ps-stop'));
      var out = body.querySelector('#ps-out');
      saveInputs('position', { account: account, risk: risk, entry: entry, stop: stop });

      if (!(account > 0) || !(risk > 0) || !(entry > 0) || !(stop > 0)) {
        out.innerHTML = '<div class="callout warn">' + App.icon('alert') + '<div>Enter positive numbers for all four fields.</div></div>';
        return;
      }
      if (risk > 5) {
        out.innerHTML = '<div class="callout danger">' + App.icon('alert') + '<div><b>' + App.fmtPct(risk, 1) + ' risk per trade is outside day-trading practice.</b> A 10-loss streak at that risk is account-threatening — professional risk sits between 0.25% and 2%.</div></div>';
        return;
      }
      if (entry === stop) {
        out.innerHTML = '<div class="callout warn">' + App.icon('alert') + '<div>Entry and stop cannot be equal — there is no risk distance to size against.</div></div>';
        return;
      }
      var side = stop < entry ? 'long' : 'short';
      var riskDollars = account * risk / 100;
      var perShare = Math.abs(entry - stop);
      var shares = Math.floor(riskDollars / perShare);
      var value = shares * entry;
      var pctAcct = account > 0 ? (value / account) * 100 : 0;

      var warn = '';
      if (shares < 1) {
        warn = '<div class="callout warn">' + App.icon('alert') + '<div>The stop distance is wider than the entire risk budget — this trade cannot be sized. Tighten the stop or skip it.</div></div>';
      } else if (value > account * 4) {
        warn = '<div class="callout danger">' + App.icon('alert') + '<div><b>Position exceeds typical 4× intraday buying power</b> ($' + App.fmtNum(account * 4, 0) + '). Buying power caps the size at about <b>' + App.fmtNum(Math.floor(account * 4 / entry), 0) + ' shares</b> — accept the smaller dollar risk rather than widening the stop.</div></div>';
      } else if (value > account) {
        warn = '<div class="callout warn">' + App.icon('info') + '<div>Position value exceeds the cash account — this size requires intraday margin (' + App.fmtNum(value / account, 1) + '× account). Normal for tight stops; just know what you are using.</div></div>';
      }

      var rows = '';
      [1, 2, 3].forEach(function (r) {
        var target = side === 'long' ? entry + r * perShare : entry - r * perShare;
        rows += '<tr><td class="tnum">' + r + 'R</td><td class="num">' + App.fmtMoney(target) + '</td>' +
          '<td class="num pos">+' + App.fmtMoney(shares * r * perShare, { dec: 0 }).replace('$', '$') + '</td></tr>';
      });

      out.innerHTML =
        '<div class="kpi-row">' +
        stat('Direction', side === 'long' ? '<span class="pos">Long</span>' : '<span class="neg">Short</span>') +
        stat('Shares', '<b>' + App.fmtNum(shares, 0) + '</b>') +
        stat('$ at risk', App.fmtMoney(riskDollars, { dec: 0 })) +
        stat('Risk / share', App.fmtMoney(perShare)) +
        stat('Position value', App.fmtMoney(value, { dec: 0 })) +
        stat('% of account', App.fmtPct(pctAcct, 0)) +
        '</div>' +
        (warn ? '<div style="margin-top:12px">' + warn + '</div>' : '') +
        '<div class="table-wrap" style="margin-top:14px"><table class="table"><thead><tr><th>Target</th><th class="num">Price</th><th class="num">P/L at target</th></tr></thead><tbody>' +
        rows + '</tbody></table></div>' +
        '<p class="small muted" style="margin:10px 0 0">Stop hit = <span class="neg tnum">-' + App.fmtMoney(shares * perShare, { dec: 0 }).replace('$', '$') + '</span> (−1R). Common plan: half off at 1R, stop to breakeven, rest toward 2–3R.</p>';
    }
    body.addEventListener('input', update);
    update();
  }

  /* =============================== BREAKEVEN =============================== */
  function renderBreakeven(body) {
    var inp = loadInputs('breakeven', { side: 'long', entry: 50, shares: 200, commission: 1, fees: 0.5 });
    body.innerHTML =
      '<section class="card">' +
      '<div class="card-title">' + App.icon('dollar', 15) + ' Breakeven calculator</div>' +
      '<div class="form-grid">' +
      '<div class="field"><label class="label" for="be-side">Side</label>' +
      '<select class="select" id="be-side"><option value="long"' + (inp.side !== 'short' ? ' selected' : '') + '>Long</option>' +
      '<option value="short"' + (inp.side === 'short' ? ' selected' : '') + '>Short</option></select></div>' +
      numField('be-entry', 'Entry price ($)', inp.entry, '0.01') +
      numField('be-shares', 'Shares', inp.shares, '1') +
      numField('be-comm', 'Commission per side ($)', inp.commission, '0.01', 'Charged on entry AND exit.') +
      numField('be-fees', 'Other round-trip fees ($)', inp.fees, '0.01', 'ECN, SEC/TAF, locate fees…') +
      '</div>' +
      '<div id="be-out" style="margin-top:16px"></div>' +
      '</section>' +
      '<section class="card" style="margin-top:16px">' +
      '<div class="card-title">' + App.icon('refresh', 15) + ' The recovery table</div>' +
      '<p class="small" style="color:var(--ink-2)">Losses compound against you: a loss shrinks the base that the recovery has to grow from, so the required gain is always bigger than the loss that caused it.</p>' +
      '<div class="table-wrap"><table class="table"><thead><tr><th>Account loss</th><th class="num">Gain needed to break even</th></tr></thead><tbody>' +
      '<tr><td class="tnum">−5%</td><td class="num">+5.3%</td></tr>' +
      '<tr><td class="tnum">−10%</td><td class="num">+11.1%</td></tr>' +
      '<tr><td class="tnum">−20%</td><td class="num">+25.0%</td></tr>' +
      '<tr><td class="tnum">−30%</td><td class="num">+42.9%</td></tr>' +
      '<tr><td class="tnum">−50%</td><td class="num">+100%</td></tr>' +
      '</tbody></table></div>' +
      '</section>';

    function update() {
      var side = body.querySelector('#be-side').value === 'short' ? 'short' : 'long';
      var entry = num(body.querySelector('#be-entry'));
      var shares = num(body.querySelector('#be-shares'));
      var comm = num(body.querySelector('#be-comm'));
      var fees = num(body.querySelector('#be-fees'));
      var out = body.querySelector('#be-out');
      saveInputs('breakeven', { side: side, entry: entry, shares: shares, commission: comm, fees: fees });

      if (!(entry > 0) || !(shares > 0)) {
        out.innerHTML = '<div class="callout warn">' + App.icon('alert') + '<div>Enter a positive entry price and share count.</div></div>';
        return;
      }
      comm = isFinite(comm) && comm >= 0 ? comm : 0;
      fees = isFinite(fees) && fees >= 0 ? fees : 0;
      var totalCost = comm * 2 + fees;
      var movePerShare = totalCost / shares;
      var be = side === 'long' ? entry + movePerShare : entry - movePerShare;
      var movePct = (movePerShare / entry) * 100;

      out.innerHTML =
        '<div class="kpi-row">' +
        stat('Round-trip cost', App.fmtMoney(totalCost)) +
        stat('Breakeven price', '<b>' + App.fmtMoney(be, { dec: be < 10 ? 4 : 2 }) + '</b>') +
        stat('Move needed', App.fmtMoney(movePerShare, { dec: 4 }) + '/sh') +
        stat('Move needed (%)', App.fmtPct(movePct, 3)) +
        '</div>' +
        '<p class="small muted" style="margin:12px 0 0">' +
        (side === 'long'
          ? 'A long from ' + App.fmtMoney(entry) + ' starts profitable only above ' + App.fmtMoney(be, { dec: 4 }) + '.'
          : 'A short from ' + App.fmtMoney(entry) + ' starts profitable only below ' + App.fmtMoney(be, { dec: 4 }) + '.') +
        ' On small share counts fees are a real fraction of the edge — scalpers live and die by this number.</p>';
    }
    body.addEventListener('input', update);
    body.addEventListener('change', update);
    update();
  }

  /* =============================== SIMULATOR =============================== */
  function renderSimulator(body) {
    var inp = loadInputs('simulator', { balance: 30000, risk: 1, winRate: 45, avgWin: 2, avgLoss: 1, trades: 100, runs: 200 });
    body.innerHTML =
      '<section class="card">' +
      '<div class="card-title">' + App.icon('trend', 15) + ' Monte Carlo P/L simulator</div>' +
      '<p class="small" style="color:var(--ink-2);margin-top:4px">Feed it a system (win rate, average win/loss in R, risk per trade) and it plays out hundreds of alternative futures. The spread between the best and worst runs of the <i>same</i> system is what variance feels like.</p>' +
      '<div class="form-grid">' +
      numField('sm-balance', 'Starting balance ($)', inp.balance, '100') +
      numField('sm-risk', 'Risk per trade (%)', inp.risk, '0.05') +
      numField('sm-winrate', 'Win rate (%)', inp.winRate, '1') +
      numField('sm-avgwin', 'Avg win (R)', inp.avgWin, '0.1') +
      numField('sm-avgloss', 'Avg loss (R)', inp.avgLoss, '0.1') +
      numField('sm-trades', 'Trades per run', inp.trades, '1') +
      numField('sm-runs', 'Runs', inp.runs, '10') +
      '<div class="field"><label class="label">&nbsp;</label><button type="button" class="btn btn-primary" id="sm-run">' + App.icon('refresh', 15) + ' Re-run</button></div>' +
      '</div>' +
      '<div id="sm-expect" style="margin-top:14px"></div>' +
      '</section>' +
      '<section class="card" style="margin-top:16px"><div class="card-title">Equity curves (sample of runs + median)</div><div id="sm-chart"></div></section>' +
      '<section class="card" style="margin-top:16px"><div id="sm-stats"></div>' +
      '<p class="small muted" style="margin:12px 0 0">Risk of ruin here = share of runs that ever dropped below 50% of the starting balance. Real traders stop (or should) long before mathematical ruin — which is the point of daily loss limits.</p></section>';

    function readCfg() {
      var cfg = {
        balance: num(body.querySelector('#sm-balance')),
        risk: num(body.querySelector('#sm-risk')),
        winRate: num(body.querySelector('#sm-winrate')),
        avgWin: num(body.querySelector('#sm-avgwin')),
        avgLoss: num(body.querySelector('#sm-avgloss')),
        trades: num(body.querySelector('#sm-trades')),
        runs: num(body.querySelector('#sm-runs'))
      };
      saveInputs('simulator', cfg);
      /* clamp to sane simulation bounds */
      cfg.balance = cfg.balance > 0 ? cfg.balance : 30000;
      cfg.risk = Math.min(Math.max(isFinite(cfg.risk) ? cfg.risk : 1, 0.01), 25);
      cfg.winRate = Math.min(Math.max(isFinite(cfg.winRate) ? cfg.winRate : 45, 0), 100);
      cfg.avgWin = Math.max(isFinite(cfg.avgWin) ? cfg.avgWin : 2, 0);
      cfg.avgLoss = Math.max(isFinite(cfg.avgLoss) ? cfg.avgLoss : 1, 0);
      cfg.trades = Math.round(Math.min(Math.max(isFinite(cfg.trades) ? cfg.trades : 100, 10), 1000));
      cfg.runs = Math.round(Math.min(Math.max(isFinite(cfg.runs) ? cfg.runs : 200, 20), 1000));
      return cfg;
    }

    function simulate() {
      var cfg = readCfg();
      var p = cfg.winRate / 100;

      /* expectancy readout */
      var E = p * cfg.avgWin - (1 - p) * cfg.avgLoss;
      var expEl = body.querySelector('#sm-expect');
      var eTxt = 'Expectancy: <b class="tnum ' + (E > 0 ? 'pos' : E < 0 ? 'neg' : '') + '">' +
        (E >= 0 ? '+' : '') + E.toFixed(2) + 'R per trade</b> — E = (' + App.fmtPct(cfg.winRate, 0) + ' × ' + cfg.avgWin +
        'R) − (' + App.fmtPct(100 - cfg.winRate, 0) + ' × ' + cfg.avgLoss + 'R).';
      if (E <= 0) {
        expEl.innerHTML = '<div class="callout warn">' + App.icon('alert') + '<div><b>This system loses money.</b> ' + eTxt +
          ' No position sizing fixes negative expectancy — improve the win rate or the reward:risk before touching size.</div></div>';
      } else {
        expEl.innerHTML = '<div class="callout tip">' + App.icon('check') + '<div>' + eTxt +
          ' At ' + App.fmtPct(cfg.risk, 2) + ' risk that compounds to roughly ' +
          App.fmtPct((Math.pow(1 + (cfg.risk / 100) * E, cfg.trades) - 1) * 100, 0) + ' over ' + cfg.trades + ' trades — if the inputs hold and the trader executes.</div></div>';
      }

      /* runs */
      var paths = [], finals = [], maxDDs = [], ruined = 0, profitable = 0;
      for (var r = 0; r < cfg.runs; r++) {
        var bal = cfg.balance, peak = bal, dd = 0, hitRuin = false;
        var path = [bal];
        for (var t = 0; t < cfg.trades; t++) {
          var riskAmt = bal * cfg.risk / 100;
          bal += (Math.random() < p) ? riskAmt * cfg.avgWin : -riskAmt * cfg.avgLoss;
          if (bal < 0) bal = 0;
          if (bal > peak) peak = bal;
          if (peak > 0) {
            var d = (peak - bal) / peak;
            if (d > dd) dd = d;
          }
          if (bal < cfg.balance * 0.5) hitRuin = true;
          path.push(bal);
        }
        paths.push(path);
        finals.push(bal);
        maxDDs.push(dd);
        if (hitRuin) ruined++;
        if (bal > cfg.balance) profitable++;
      }

      function median(arr) {
        var a = arr.slice().sort(function (x, y) { return x - y; });
        var m = Math.floor(a.length / 2);
        return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
      }

      /* per-trade median curve */
      var medPath = [];
      for (var i = 0; i <= cfg.trades; i++) {
        var col = new Array(cfg.runs);
        for (var rr = 0; rr < cfg.runs; rr++) col[rr] = paths[rr][i];
        medPath.push(median(col));
      }

      /* chart: ~22 sampled runs + median */
      var series = [];
      var sampleN = Math.min(22, cfg.runs);
      var stepR = Math.max(1, Math.floor(cfg.runs / sampleN));
      for (var s = 0; s < cfg.runs && series.length < sampleN; s += stepR) {
        series.push({
          points: paths[s].map(function (v, ix) { return { x: ix, y: Math.round(v) }; }),
          color: 'var(--chart-1)', opacity: 0.16, width: 1, endDot: false
        });
      }
      series.push({
        name: 'Median',
        points: medPath.map(function (v, ix) { return { x: ix, y: Math.round(v) }; }),
        color: 'var(--accent)', width: 2.5
      });
      Charts.line(body.querySelector('#sm-chart'), {
        series: series,
        height: 300,
        yFormat: function (v) { return App.fmtMoney(v, { dec: 0 }); },
        xFormat: function (x) { return 'Trade ' + Math.round(x); },
        zeroLine: false
      });

      var bestF = Math.max.apply(null, finals);
      var worstF = Math.min.apply(null, finals);
      var medF = median(finals);
      var medDD = median(maxDDs) * 100;
      body.querySelector('#sm-stats').innerHTML =
        '<div class="card-title">' + App.icon('layers', 15) + ' Across ' + cfg.runs + ' runs of ' + cfg.trades + ' trades</div>' +
        '<div class="kpi-row">' +
        stat('Median final', App.fmtMoney(medF, { dec: 0 }), medF >= cfg.balance ? 'pos' : 'neg') +
        stat('Best run', App.fmtMoney(bestF, { dec: 0 }), 'pos') +
        stat('Worst run', App.fmtMoney(worstF, { dec: 0 }), worstF < cfg.balance ? 'neg' : '') +
        stat('Profitable runs', App.fmtPct(profitable / cfg.runs * 100, 0)) +
        stat('Median max drawdown', App.fmtPct(medDD, 1), medDD > 25 ? 'neg' : '') +
        stat('Risk of ruin (<50%)', App.fmtPct(ruined / cfg.runs * 100, 1), ruined > 0 ? 'neg' : 'pos') +
        '</div>';
    }

    body.querySelector('#sm-run').addEventListener('click', simulate);
    body.addEventListener('change', function (ev) {
      if (ev.target && ev.target.classList && ev.target.classList.contains('input')) simulate();
    });
    simulate();
  }

  /* =============================== VOLUME PROFILE =============================== */

  /* Volumes chosen so the 102.5–105.5 value area really holds ~70%:
     band = 354 of total 509 = 69.5%. POC 104.5 is the max; 107.5 a local max
     (HVN); 106.0 the interior local minimum (LVN). */
  var VP_LEVELS = [
    [109.0, 8], [108.5, 12], [108.0, 22], [107.5, 34], [107.0, 26], [106.5, 16],
    [106.0, 10], [105.5, 46], [105.0, 62], [104.5, 74], [104.0, 60], [103.5, 48],
    [103.0, 36], [102.5, 28], [102.0, 14], [101.5, 8], [101.0, 5]
  ];
  var VP_ZONES = {
    poc: {
      label: 'POC', price: 104.5, color: 'var(--chart-3)',
      title: 'Point of Control (POC) — 104.50',
      body: 'The single price where the most volume traded — the market’s “fairest” price for the period. Price gets drawn back toward it in balanced conditions (it acts like a magnet), and how price behaves on a revisit is the tell: slowing and holding = acceptance and likely chop; a fast push through = initiative flow with the POC now behind it. A <b>naked POC</b> (from a prior day, never revisited) is a favorite intraday target.'
    },
    vah: {
      label: 'Value Area High', price: 105.5, color: 'var(--accent)',
      title: 'Value Area High (VAH) — 105.50',
      body: 'The top of the value area — the zone holding roughly 70% of the period’s volume. Above the VAH, buyers are paying up beyond agreed value. Two classic plays: price pokes above and gets <b>rejected</b> back inside → fade toward the POC; or price <b>accepts</b> above it (holds, builds volume) → the old VAH becomes support and trend continuation is on.'
    },
    val: {
      label: 'Value Area Low', price: 102.5, color: 'var(--accent)',
      title: 'Value Area Low (VAL) — 102.50',
      body: 'The bottom of value — the mirror of the VAH. Rejection at the VAL (a probe below that snaps back) is responsive buying and targets the POC. Acceptance below it means sellers moved value lower: the VAL flips to resistance and lower prices are being “advertised”. The 80% rule of thumb: an open below value that re-enters and holds has good odds of rotating the full value area.'
    },
    hvn: {
      label: 'HVN', price: 107.5, color: 'var(--chart-1)',
      title: 'High Volume Node (HVN) — around 107.50',
      body: 'A secondary volume bulge — a shelf where the market previously spent time and built acceptance. Price approaching an HVN tends to <b>slow down and get sticky</b>: expect chop inside the node, and use its edges (not its middle) for entries and targets. HVNs above are natural profit-taking zones for longs; HVNs below act as landing pads on sell-offs.'
    },
    lvn: {
      label: 'LVN', price: 106.0, color: 'var(--neg)',
      title: 'Low Volume Node (LVN) — around 106.00',
      body: 'A thin shelf where almost no business was done — the market rejected these prices quickly. Price moves <b>fast</b> through LVNs (nothing to slow it down), which makes them dividing lines between value zones. Uses: breakout trades accelerate through an LVN; stops hide on the far side of one; and a target placed <i>inside</i> an LVN is poorly placed — price tends to slice through to the node beyond.'
    }
  };

  function vpSvg(selected) {
    var yOf = function (p) { return 30 + (109.0 - p) * 40; };
    var maxVol = 74, maxW = 250, x0 = 96;
    var s = '';
    /* value area shading */
    s += '<rect x="60" y="' + (yOf(105.5) - 9) + '" width="640" height="' + (yOf(102.5) - yOf(105.5) + 18) + '" fill="var(--accent)" fill-opacity="0.06"/>';
    s += '<text x="694" y="' + (yOf(104.0) + 4) + '" font-size="11" fill="var(--ink-3)" text-anchor="end">~70% of volume = value area</text>';
    /* bars */
    VP_LEVELS.forEach(function (lv) {
      var p = lv[0], v = lv[1];
      var w = v / maxVol * maxW;
      var zoneKey = null;
      Object.keys(VP_ZONES).forEach(function (k) { if (VP_ZONES[k].price === p) zoneKey = k; });
      var fill = 'var(--chart-1)';
      var op = '0.5';
      if (p === 104.5) { fill = 'var(--chart-3)'; op = '0.95'; }
      else if (p === 107.5) { op = '0.85'; }
      else if (p === 106.0) { fill = 'var(--neg)'; op = '0.55'; }
      var isSel = selected && VP_ZONES[selected] && VP_ZONES[selected].price === p;
      s += '<rect data-vp="' + (zoneKey || '') + '" x="' + x0 + '" y="' + (yOf(p) - 8) + '" width="' + w.toFixed(1) + '" height="16" rx="3" fill="' + fill + '" fill-opacity="' + op + '"' +
        (isSel ? ' stroke="var(--ink)" stroke-width="2"' : '') +
        (zoneKey ? ' style="cursor:pointer"' : '') + '/>';
      if (p === Math.round(p)) {
        s += '<text x="' + (x0 - 8) + '" y="' + (yOf(p) + 4) + '" font-size="10.5" fill="var(--ink-3)" text-anchor="end" style="font-variant-numeric:tabular-nums">' + p.toFixed(0) + '</text>';
      }
    });
    /* zone marker lines + labels */
    Object.keys(VP_ZONES).forEach(function (k) {
      var z = VP_ZONES[k];
      var y = yOf(z.price);
      var isSel = selected === k;
      s += '<line x1="' + x0 + '" y1="' + y + '" x2="470" y2="' + y + '" stroke="' + z.color + '" stroke-width="' + (isSel ? 2 : 1.2) + '" stroke-dasharray="5 4" opacity="' + (isSel ? 1 : 0.65) + '"/>';
      s += '<text data-vp="' + k + '" x="476" y="' + (y + 4) + '" font-size="' + (isSel ? 12 : 11) + '" font-weight="' + (isSel ? 700 : 550) + '" fill="' + z.color + '" style="cursor:pointer">' + z.label + '</text>';
    });
    /* faint intraday price path on the right */
    var pp = [[560, 103.2], [575, 104.4], [590, 104.1], [605, 105.3], [618, 104.6], [630, 104.9], [642, 106.1], [652, 107.3], [663, 107.6], [674, 107.1], [686, 105.6], [700, 104.7]];
    var d = '';
    pp.forEach(function (p, i) { d += (i ? 'L' : 'M') + p[0] + ',' + yOf(p[1]).toFixed(1); });
    s += '<path d="' + d + '" fill="none" stroke="var(--ink-3)" stroke-width="1.6" opacity="0.7" stroke-linejoin="round"/>';
    s += '<text x="630" y="' + (yOf(101.4)) + '" font-size="10.5" fill="var(--ink-3)" text-anchor="middle">price spends time in value,</text>';
    s += '<text x="630" y="' + (yOf(101.4) + 14) + '" font-size="10.5" fill="var(--ink-3)" text-anchor="middle">races through the LVN</text>';
    return '<svg viewBox="0 0 760 400" xmlns="http://www.w3.org/2000/svg" role="img" style="width:100%;height:auto">' + s + '</svg>';
  }

  function renderVolumeProfile(body) {
    var selected = 'poc';
    body.innerHTML =
      '<section class="card">' +
      '<div class="card-title">' + App.icon('layers', 15) + ' Volume profile, explained interactively</div>' +
      '<p class="small" style="color:var(--ink-2);margin-top:4px">A volume profile turns the volume axis sideways: instead of volume per <i>time</i>, it shows volume per <i>price</i>. The shape reveals where the market did business (acceptance) and where it refused to (rejection). Click a zone:</p>' +
      '<div class="tabs" id="vp-tabs" style="margin:10px 0 14px">' +
      Object.keys(VP_ZONES).map(function (k) {
        return '<button type="button" class="tab' + (k === selected ? ' active' : '') + '" data-zone="' + k + '">' + VP_ZONES[k].label + '</button>';
      }).join('') +
      '</div>' +
      '<div class="diagram" id="vp-diagram" style="margin-top:0">' + vpSvg(selected) + '</div>' +
      '<div class="callout info" id="vp-explain" style="margin-top:14px">' + App.icon('info') + '<div><b id="vp-title"></b><br><span id="vp-body" class="small"></span></div></div>' +
      '</section>' +
      '<section class="card guide-sec" style="margin-top:16px">' +
      '<div class="card-title">' + App.icon('book', 15) + ' How day traders actually use it</div>' +
      '<ul>' +
      '<li><strong>Open inside value:</strong> expect rotation — responsive trading between VAH and VAL, fading the edges back toward the POC. Breakout playbooks underperform.</li>' +
      '<li><strong>Open outside value:</strong> the day starts imbalanced. Acceptance out there (price builds volume where it opened) = trend day potential, trade with it. A quick re-entry into value = failed breakout, often rotates to the far side of value.</li>' +
      '<li><strong>Levels for free:</strong> yesterday’s VAH/VAL/POC are objective, widely watched levels — mark them pre-market alongside PDH/PDL. Naked POCs from recent days act as magnets.</li>' +
      '<li><strong>LVNs structure the trade:</strong> enter as price leaves a node through an LVN, target the next HVN, hide the stop on the other side of the LVN.</li>' +
      '</ul>' +
      '<div class="callout warn">' + App.icon('alert') + '<div><b>Common mistakes.</b> Treating the profile as a signal generator (it is a <i>map</i>, not a trigger — you still need a playbook entry); placing targets mid-LVN where price does not rest; and reading a half-formed morning profile as if it were a finished day’s auction.</div></div>' +
      '</section>';

    function select(k) {
      if (!VP_ZONES[k]) return;
      selected = k;
      body.querySelectorAll('#vp-tabs .tab').forEach(function (b) {
        b.classList.toggle('active', b.getAttribute('data-zone') === k);
      });
      body.querySelector('#vp-diagram').innerHTML = vpSvg(k);
      body.querySelector('#vp-title').textContent = VP_ZONES[k].title;
      body.querySelector('#vp-body').innerHTML = VP_ZONES[k].body;
    }

    body.addEventListener('click', function (ev) {
      var tab = ev.target.closest ? ev.target.closest('[data-zone]') : null;
      if (tab) { select(tab.getAttribute('data-zone')); return; }
      var el = ev.target;
      if (el && el.getAttribute && el.getAttribute('data-vp')) {
        var k = el.getAttribute('data-vp');
        if (k) select(k);
      }
    });
    select(selected);
  }

  /* =============================== shell =============================== */

  function render(container, sub) {
    var active = (sub && sub[0] && TOOLS.some(function (t) { return t.id === sub[0]; })) ? sub[0] : 'position';

    container.innerHTML = '';
    var wrap = document.createElement('div');
    wrap.innerHTML =
      '<div class="page-header"><h1>Interactive Tools</h1>' +
      '<p class="lede">Calculators for the decisions that repeat every day. Inputs are saved on this device, so your numbers are waiting tomorrow.</p></div>' +
      '<div class="tabs no-print" style="margin-bottom:18px">' +
      TOOLS.map(function (t) {
        return '<button type="button" class="tab' + (t.id === active ? ' active' : '') + '" data-tool="' + t.id + '">' + t.label + '</button>';
      }).join('') +
      '</div>' +
      '<div id="tool-body"></div>';
    container.appendChild(wrap);

    wrap.querySelectorAll('.tab[data-tool]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-tool');
        if (id !== active) location.hash = '#/tools/' + id;
      });
    });

    var body = wrap.querySelector('#tool-body');
    if (active === 'position') renderPosition(body);
    else if (active === 'breakeven') renderBreakeven(body);
    else if (active === 'simulator') renderSimulator(body);
    else renderVolumeProfile(body);
  }

  window.Tools = { render: render };
})();
