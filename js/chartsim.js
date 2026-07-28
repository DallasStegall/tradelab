/* ==========================================================================
   TradeLab — Chart Trainer (bull / bear reading practice)
   Shows a procedurally-generated candlestick chart of a textbook setup up to a
   decision point, asks whether the next move is bullish or bearish, then
   reveals the continuation with an explanation tied to the playbooks.

   These are SYNTHETIC teaching charts, not real market data and not a
   prediction engine: each scenario is built with a known continuation so the
   "answer" is the higher-probability read a trained trader would make from the
   tell that is visible in the setup. Educational only — not financial advice.

   Public API:
     ChartTrainer.render(container, sub)
     ChartTrainer.status() -> {plays, correct, best} | null   (dashboard)
   Storage: 'trainer.stats' = { plays, correct, best }  (best = best streak)
   ========================================================================== */
(function () {
  'use strict';

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

  /* Linear path of closes from -> to over n steps with small jitter. */
  function ramp(from, to, n, jitter, unit) {
    var a = [];
    for (var i = 1; i <= n; i++) {
      var t = i / n;
      a.push(from + (to - from) * t + rnd(-jitter, jitter) * unit);
    }
    return a;
  }
  /* Oscillate between lo and hi over n candles (for ranges). */
  function oscillate(lo, hi, n, unit) {
    var a = [], mid = (lo + hi) / 2, amp = (hi - lo) / 2;
    for (var i = 0; i < n; i++) {
      a.push(mid + amp * Math.sin(i * 1.7) + rnd(-0.15, 0.15) * unit);
    }
    return a;
  }

  /* Wrap a closes[] into candles: opens chain from the prior close (continuous,
     intraday-style), wicks are proportional to the body with light noise. */
  function candles(closes, unit) {
    var out = [], prev = closes[0];
    for (var i = 0; i < closes.length; i++) {
      var o = i === 0 ? closes[0] - rnd(0.1, 0.4) * unit : prev;
      var c = closes[i];
      var hi = Math.max(o, c), lo = Math.min(o, c);
      out.push({ o: o, h: hi + rnd(0.15, 0.7) * unit, l: lo - rnd(0.15, 0.7) * unit, c: c });
      prev = c;
    }
    return out;
  }

  /* --------------------------- scenario archetypes --------------------------- */
  /* Each returns { name, answer:'bull'|'bear', setup:[cndl], future:[cndl],
     levels:[{p,label,cls}], ma:{period}|null, explain } in absolute prices.
     The setup ALWAYS ends at the decision point with the tell visible. */

  function bullFlag(base) {
    var u = base * 0.008;
    var top = base * rnd(1.03, 1.045), flagLo = base * rnd(1.018, 1.026);
    var setup = candles(ramp(base, top, 5, 0.3, u).concat(ramp(top, flagLo, 4, 0.22, u)), u);
    var future = candles(ramp(flagLo, base * rnd(1.07, 1.09), 6, 0.35, u), u);
    return { name: 'Bull flag', answer: 'bull', setup: setup, future: future, levels: [], ma: null,
      explain: 'A sharp impulse up followed by a shallow, orderly pullback (the flag) is a continuation pattern — the higher-probability resolution is a break in the direction of the impulse. This is the engine behind the <a href="#/strategies/abcd">ABCD</a> and <a href="#/strategies/pullback">pullback</a> playbooks.' };
  }

  function bearFlag(base) {
    var u = base * 0.008;
    var bot = base * rnd(0.955, 0.97), flagHi = base * rnd(0.974, 0.982);
    var setup = candles(ramp(base, bot, 5, 0.3, u).concat(ramp(bot, flagHi, 4, 0.22, u)), u);
    var future = candles(ramp(flagHi, base * rnd(0.91, 0.93), 6, 0.35, u), u);
    return { name: 'Bear flag', answer: 'bear', setup: setup, future: future, levels: [], ma: null,
      explain: 'A sharp impulse <em>down</em> followed by a shallow, orderly bounce (the flag) is a continuation pattern — the higher-probability resolution is a break lower, in the direction of the impulse. It is a bull flag flipped upside down.' };
  }

  function pullbackBounce(base) {
    var u = base * 0.008;
    var up = ramp(base, base * 1.04, 7, 0.3, u);
    var pbLo = base * 1.028;
    var pull = ramp(base * 1.04, pbLo, 3, 0.15, u);
    pull[pull.length - 1] = pbLo + rnd(0.4, 0.9) * u; /* reversal candle closes back up */
    var setup = candles(up.concat(pull), u);
    var future = candles(ramp(setup[setup.length - 1].c, base * 1.075, 6, 0.35, u), u);
    return { name: 'Pullback to a rising average', answer: 'bull', setup: setup, future: future,
      levels: [], ma: { period: 5 },
      explain: 'In an uptrend, the first controlled pullback into a rising moving average that holds — a reversal candle closing back up off the average — is a with-trend long. See the <a href="#/strategies/ema-9-20">9/20 EMA</a> and <a href="#/strategies/pullback">pullback</a> playbooks.' };
  }

  function maBreakdown(base) {
    var u = base * 0.008;
    var up = ramp(base, base * 1.04, 7, 0.3, u);
    /* decisive loss of the average + a lower low: the last close is well below trend */
    var brk = ramp(base * 1.04, base * 1.012, 3, 0.18, u);
    var setup = candles(up.concat(brk), u);
    var future = candles(ramp(setup[setup.length - 1].c, base * 0.965, 6, 0.35, u), u);
    return { name: 'Trend loses its average', answer: 'bear', setup: setup, future: future,
      levels: [], ma: { period: 5 },
      explain: 'When an uptrend closes decisively <em>below</em> its rising average and prints a lower low, the trend that held the average has changed character — momentum has flipped down. Holding longs here is fighting the new structure.' };
  }

  function doubleTop(base) {
    var u = base * 0.008;
    var lvl = base * 1.05;
    var closes = ramp(base, lvl - 0.2 * u, 3, 0.2, u)
      .concat(ramp(lvl, base * 1.022, 3, 0.2, u))          /* pull back */
      .concat(ramp(base * 1.022, lvl - rnd(0.4, 0.9) * u, 3, 0.15, u)) /* second, slightly lower high */
      .concat([base * 1.02]);                              /* rejection close */
    var setup = candles(closes, u);
    var future = candles(ramp(base * 1.02, base * 0.96, 6, 0.35, u), u);
    return { name: 'Double top at resistance', answer: 'bear', setup: setup, future: future,
      levels: [{ p: lvl, label: 'Resistance', cls: 'neg' }], ma: null,
      explain: 'Two failed pushes into the same resistance — the second making a lower high — and a rejection candle closing back down is distribution. Buyers could not clear the level twice; the read is lower. See <a href="#/strategies/support-resistance">Support & Resistance</a>.' };
  }

  function doubleBottom(base) {
    var u = base * 0.008;
    var lvl = base * 0.95;
    var closes = ramp(base, lvl + 0.2 * u, 3, 0.2, u)
      .concat(ramp(lvl, base * 0.978, 3, 0.2, u))
      .concat(ramp(base * 0.978, lvl + rnd(0.4, 0.9) * u, 3, 0.15, u))
      .concat([base * 0.98]);
    var setup = candles(closes, u);
    var future = candles(ramp(base * 0.98, base * 1.04, 6, 0.35, u), u);
    return { name: 'Double bottom at support', answer: 'bull', setup: setup, future: future,
      levels: [{ p: lvl, label: 'Support', cls: 'pos' }], ma: null,
      explain: 'Two failed pushes into the same support — the second making a higher low — and a reversal candle closing back up is accumulation. Sellers could not break the level twice; the read is higher. See <a href="#/strategies/support-resistance">Support & Resistance</a>.' };
  }

  function sweepReclaim(base) {
    var u = base * 0.008;
    var sup = base * 0.99;
    var closes = oscillate(sup + 0.3 * u, base * 1.008, 5, u).concat([sup + rnd(0.4, 0.8) * u]);
    var setup = candles(closes, u);
    /* force the last candle to be the sweep+reclaim: wick below support, close above */
    var last = setup[setup.length - 1];
    last.o = sup - rnd(0.1, 0.4) * u;
    last.l = sup - rnd(0.9, 1.5) * u;   /* the stop-run wick below the shelf */
    last.h = last.c + rnd(0.1, 0.3) * u;
    var future = candles(ramp(last.c, base * 1.03, 6, 0.35, u), u);
    return { name: 'Liquidity sweep + reclaim', answer: 'bull', setup: setup, future: future,
      levels: [{ p: sup, label: 'Support / equal lows', cls: 'accent' }], ma: null,
      explain: 'Price spikes just below an obvious support (running the stops resting there), then snaps back and <em>reclaims</em> the level on the same candle. That failed breakdown traps sellers — the read is a reversal up. This is the whole idea of the <a href="#/strategies/liquidity-sweeps">Liquidity Sweeps</a> playbook.' };
  }

  function rangeBreakdown(base) {
    var u = base * 0.008;
    var lo = base * 0.99, hi = base * 1.01;
    var closes = oscillate(lo, hi, 7, u).concat([lo - rnd(0.6, 1.2) * u]); /* decisive close below */
    var setup = candles(closes, u);
    var future = candles(ramp(setup[setup.length - 1].c, base * 0.955, 6, 0.35, u), u);
    return { name: 'Range breakdown', answer: 'bear', setup: setup, future: future,
      levels: [{ p: lo, label: 'Range low', cls: 'neg' }, { p: hi, label: 'Range high', cls: 'ink' }], ma: null,
      explain: 'After a tight range, a candle that <em>closes</em> decisively below the range low (not just a wick) resolves the balance to the downside — trapped range-longs become sellers. Wait for the close, not the poke.' };
  }

  function headShoulders(base) {
    var u = base * 0.008, neck = base * 1.008, sh = base * 1.032, head = base * 1.055;
    var closes = ramp(base, sh, 3, 0.2, u)
      .concat(ramp(sh, neck, 2, 0.2, u))
      .concat(ramp(neck, head, 3, 0.2, u))
      .concat(ramp(head, neck, 3, 0.2, u))
      .concat(ramp(neck, sh - rnd(0.2, 0.6) * u, 3, 0.2, u))  /* right shoulder = lower high */
      .concat([neck + rnd(0.3, 0.8) * u]);                    /* rolling back toward the neckline */
    var setup = candles(closes, u);
    var future = candles(ramp(setup[setup.length - 1].c, base * 0.965, 6, 0.35, u), u);
    return { name: 'Head and shoulders', answer: 'bear', setup: setup, future: future,
      levels: [{ p: neck, label: 'Neckline', cls: 'neg' }], ma: null,
      explain: 'Three peaks — a higher head between two lower shoulders — over a shared neckline. Once the right shoulder makes a lower high and price turns back down toward the neckline, this topping pattern favors a break lower. See <a href="#/strategies/support-resistance">Support & Resistance</a>.' };
  }
  function invHeadShoulders(base) {
    var u = base * 0.008, neck = base * 0.992, sh = base * 0.968, head = base * 0.945;
    var closes = ramp(base, sh, 3, 0.2, u)
      .concat(ramp(sh, neck, 2, 0.2, u))
      .concat(ramp(neck, head, 3, 0.2, u))
      .concat(ramp(head, neck, 3, 0.2, u))
      .concat(ramp(neck, sh + rnd(0.2, 0.6) * u, 3, 0.2, u))  /* right shoulder = higher low */
      .concat([neck - rnd(0.3, 0.8) * u]);
    var setup = candles(closes, u);
    var future = candles(ramp(setup[setup.length - 1].c, base * 1.035, 6, 0.35, u), u);
    return { name: 'Inverse head and shoulders', answer: 'bull', setup: setup, future: future,
      levels: [{ p: neck, label: 'Neckline', cls: 'pos' }], ma: null,
      explain: 'Three troughs — a lower head between two higher lows — a bottoming pattern. When the right shoulder makes a higher low and price turns up toward the neckline, the read favors a break higher.' };
  }
  function ascTriangle(base) {
    var u = base * 0.008, res = base * 1.03;
    var lows = [base * 0.995, base * 1.006, base * 1.016, base * 1.023];
    var closes = [];
    for (var i = 0; i < lows.length; i++) { closes.push(res - rnd(0.2, 0.5) * u); closes.push(lows[i]); }
    closes.push(res - rnd(0.4, 0.9) * u);  /* coiled just under resistance */
    var setup = candles(closes, u);
    var future = candles(ramp(setup[setup.length - 1].c, base * 1.07, 6, 0.35, u), u);
    return { name: 'Ascending triangle', answer: 'bull', setup: setup, future: future,
      levels: [{ p: res, label: 'Resistance', cls: 'accent' }], ma: null,
      explain: 'A flat ceiling of resistance pressed by rising higher lows — buyers stepping in earlier each time while sellers defend one price. The squeeze usually resolves with a break UP through the flat top.' };
  }
  function descTriangle(base) {
    var u = base * 0.008, sup = base * 0.97;
    var highs = [base * 1.005, base * 0.994, base * 0.984, base * 0.977];
    var closes = [];
    for (var i = 0; i < highs.length; i++) { closes.push(sup + rnd(0.2, 0.5) * u); closes.push(highs[i]); }
    closes.push(sup + rnd(0.4, 0.9) * u);
    var setup = candles(closes, u);
    var future = candles(ramp(setup[setup.length - 1].c, base * 0.93, 6, 0.35, u), u);
    return { name: 'Descending triangle', answer: 'bear', setup: setup, future: future,
      levels: [{ p: sup, label: 'Support', cls: 'neg' }], ma: null,
      explain: 'A flat floor of support pressed by falling lower highs — sellers stepping in earlier each time while buyers defend one price. The squeeze usually resolves with a break DOWN through the flat floor.' };
  }
  function breakoutRetest(base) {
    var u = base * 0.008, lvl = base * 1.02;
    var closes = oscillate(base * 1.005, lvl - 0.3 * u, 4, u)
      .concat([lvl + rnd(0.6, 1.1) * u])                        /* breakout close above */
      .concat(ramp(lvl + 0.8 * u, lvl + rnd(0.1, 0.3) * u, 2, 0.12, u)) /* pull back to the level */
      .concat([lvl + rnd(0.4, 0.8) * u]);                       /* retest holds */
    var setup = candles(closes, u);
    var future = candles(ramp(setup[setup.length - 1].c, base * 1.06, 6, 0.35, u), u);
    return { name: 'Breakout and retest', answer: 'bull', setup: setup, future: future,
      levels: [{ p: lvl, label: 'Broken resistance → support', cls: 'accent' }], ma: null,
      explain: 'Price breaks above resistance, pulls back to test that level from above, and holds — old resistance behaving as new support (role reversal). The retest that holds is the higher-probability entry. See <a href="#/strategies/orb">ORB</a> break-and-retest.' };
  }
  function falseBreakout(base) {
    var u = base * 0.008, lvl = base * 1.02;
    var closes = oscillate(base * 1.004, lvl - 0.3 * u, 4, u)
      .concat([lvl + rnd(0.6, 1.0) * u])   /* pokes above the level */
      .concat([lvl - rnd(0.5, 1.0) * u]);  /* closes back BELOW — the trap */
    var setup = candles(closes, u);
    var future = candles(ramp(setup[setup.length - 1].c, base * 0.965, 6, 0.35, u), u);
    return { name: 'Failed breakout (bull trap)', answer: 'bear', setup: setup, future: future,
      levels: [{ p: lvl, label: 'Resistance', cls: 'neg' }], ma: null,
      explain: 'Price pushes above resistance but cannot hold and closes back below it — a bull trap. The breakout buyers are now offside and become sellers. The tell is the close back inside the level, not the poke above it.' };
  }

  var ARCHES = [bullFlag, bearFlag, pullbackBounce, maBreakdown, doubleTop, doubleBottom, sweepReclaim, rangeBreakdown,
    headShoulders, invHeadShoulders, ascTriangle, descTriangle, breakoutRetest, falseBreakout];

  /* --------------------------- rendering --------------------------- */
  function sma(arr, period) {
    var out = [];
    for (var i = 0; i < arr.length; i++) {
      var s = 0, n = 0;
      for (var j = Math.max(0, i - period + 1); j <= i; j++) { s += arr[j]; n++; }
      out.push(s / n);
    }
    return out;
  }

  var PAD = { l: 8, r: 96, t: 18, b: 20 };
  var CW = 760, CH = 340;

  function drawChart(scn, reveal) {
    var all = scn.setup.concat(scn.future);
    /* Scale the y-axis to the ALWAYS-VISIBLE content (setup candles + reference
       levels), then pad SYMMETRICALLY by enough to contain the hidden future in
       either direction. Scaling to setup+future would push the setup into the
       bottom of the frame for bull scenarios (future ends higher) and the top
       for bear ones — silently leaking the answer through whitespace before the
       user has read a thing. Symmetric padding keeps the setup centred and the
       scale identical across the reveal (no rescale jump). */
    var baseLo = Infinity, baseHi = -Infinity;
    scn.setup.forEach(function (k) { if (k.l < baseLo) baseLo = k.l; if (k.h > baseHi) baseHi = k.h; });
    scn.levels.forEach(function (v) { if (v.p < baseLo) baseLo = v.p; if (v.p > baseHi) baseHi = v.p; });
    var futLo = Infinity, futHi = -Infinity;
    scn.future.forEach(function (k) { if (k.l < futLo) futLo = k.l; if (k.h > futHi) futHi = k.h; });
    var pad = Math.max(futHi - baseHi, baseLo - futLo, 0) + (baseHi - baseLo) * 0.08;
    var lo = baseLo - pad, hi = baseHi + pad;

    var x0 = PAD.l, x1 = CW - PAD.r, y0 = PAD.t, y1 = CH - PAD.b;
    var n = all.length, band = (x1 - x0) / n;
    var bw = Math.min(15, band * 0.62);
    var cx = function (i) { return x0 + band * (i + 0.5); };
    var sy = function (p) { return y1 - (p - lo) / (hi - lo) * (y1 - y0); };

    var shown = reveal ? all : scn.setup;
    var s = '';

    /* level lines */
    scn.levels.forEach(function (v) {
      var col = v.cls === 'pos' ? 'var(--pos)' : v.cls === 'neg' ? 'var(--neg)' : v.cls === 'accent' ? 'var(--accent)' : 'var(--ink-3)';
      var tcol = v.cls === 'pos' ? 'var(--pos-text)' : v.cls === 'neg' ? 'var(--neg-text)' : v.cls === 'accent' ? 'var(--accent)' : 'var(--ink-3)';
      s += '<line x1="' + x0 + '" y1="' + sy(v.p).toFixed(1) + '" x2="' + x1 + '" y2="' + sy(v.p).toFixed(1) +
        '" stroke="' + col + '" stroke-width="1.3" stroke-dasharray="6 4"/>';
      s += '<text x="' + (x1 + 6) + '" y="' + (sy(v.p) + 4).toFixed(1) + '" font-size="11" fill="' + tcol + '" text-anchor="start">' + v.label + '</text>';
    });

    /* moving average */
    if (scn.ma) {
      var closes = shown.map(function (k) { return k.c; });
      var m = sma(closes, scn.ma.period);
      var pts = m.map(function (val, i) { return cx(i).toFixed(1) + ',' + sy(val).toFixed(1); }).join(' ');
      s += '<polyline points="' + pts + '" fill="none" stroke="var(--accent)" stroke-width="1.6"/>';
      s += '<text x="' + (x1 + 6) + '" y="' + (sy(m[m.length - 1]) + 4).toFixed(1) + '" font-size="10.5" fill="var(--accent)" text-anchor="start">' + scn.ma.period + '-MA</text>';
    }

    /* decision divider */
    var dx = x0 + band * scn.setup.length;
    s += '<line x1="' + dx.toFixed(1) + '" y1="' + y0 + '" x2="' + dx.toFixed(1) + '" y2="' + y1 + '" stroke="var(--border-strong)" stroke-width="1.2" stroke-dasharray="3 3"/>';

    if (!reveal) {
      s += '<rect x="' + dx.toFixed(1) + '" y="' + y0 + '" width="' + (x1 - dx).toFixed(1) + '" height="' + (y1 - y0) +
        '" fill="var(--surface-2)" fill-opacity="0.5"/>';
      s += '<text x="' + ((dx + x1) / 2).toFixed(1) + '" y="' + ((y0 + y1) / 2).toFixed(1) +
        '" font-size="34" fill="var(--ink-3)" text-anchor="middle" font-weight="700">?</text>';
      s += '<text x="' + ((dx + x1) / 2).toFixed(1) + '" y="' + ((y0 + y1) / 2 + 26).toFixed(1) +
        '" font-size="11" fill="var(--ink-3)" text-anchor="middle">next move</text>';
    }

    /* candles */
    shown.forEach(function (k, i) {
      var future = i >= scn.setup.length;
      var up = k.c >= k.o;
      var col = up ? 'var(--pos)' : 'var(--neg)';
      var op = future ? '1' : '0.95';
      var X = cx(i);
      s += '<line x1="' + X.toFixed(1) + '" y1="' + sy(k.h).toFixed(1) + '" x2="' + X.toFixed(1) + '" y2="' + sy(k.l).toFixed(1) +
        '" stroke="' + col + '" stroke-width="1.3" opacity="' + op + '"/>';
      var top = sy(Math.max(k.o, k.c)), bh = Math.max(1.5, sy(Math.min(k.o, k.c)) - top);
      s += '<rect x="' + (X - bw / 2).toFixed(1) + '" y="' + top.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + bh.toFixed(1) +
        '" rx="1.2" fill="' + col + '" opacity="' + op + '"/>';
    });

    /* reveal: net-direction arrow + label */
    if (reveal) {
      var a = scn.setup[scn.setup.length - 1].c, b = scn.future[scn.future.length - 1].c;
      var pct = ((b - a) / a * 100);
      var col = b >= a ? 'var(--pos)' : 'var(--neg)';
      var ax = dx + 6, ay = sy(a), by = sy(b), bx = x1 - 4;
      s += '<line x1="' + ax.toFixed(1) + '" y1="' + ay.toFixed(1) + '" x2="' + bx.toFixed(1) + '" y2="' + by.toFixed(1) +
        '" stroke="' + col + '" stroke-width="1.6" stroke-dasharray="5 3" opacity="0.8"/>';
    }

    return '<svg viewBox="0 0 ' + CW + ' ' + CH + '" xmlns="http://www.w3.org/2000/svg" role="img" style="width:100%;height:auto;display:block">' + s + '</svg>';
  }

  /* --------------------------- stats --------------------------- */
  function loadStats() {
    var s = App.Store.get('trainer.stats', {});
    if (!s || typeof s !== 'object') s = {};
    return { plays: +s.plays || 0, correct: +s.correct || 0, best: +s.best || 0 };
  }
  function saveStats(s) { App.Store.set('trainer.stats', s); }

  function status() {
    try {
      if (!window.App || !window.App.Store) return null;
      var s = loadStats();
      return { plays: s.plays, correct: s.correct, best: s.best };
    } catch (e) { return null; }
  }

  /* --------------------------- round + UI --------------------------- */
  function newScenario() {
    var base = rnd(18, 380);
    var scn = pick(ARCHES)(base);
    scn.base = base;
    return scn;
  }

  var TIMED_SECS = 15;

  function render(container, sub) {
    var streak = 0;               /* current session streak */
    var current = null;
    var answered = false;
    var timed = App.Store.get('trainer.timed', false) === true;
    var timer = null, timeLeft = 0;

    function segBtn(mode, label, ic) {
      return '<button type="button" class="seg-btn" data-mode="' + mode + '" aria-pressed="false">' + App.icon(ic, 15) + ' ' + label + '</button>';
    }

    var root = document.createElement('div');
    root.innerHTML =
      '<div class="page-header"><h1>Chart Trainer</h1>' +
      '<p class="lede">Read the setup, call the next move. Each chart is a textbook setup drawn to a decision point — pick <b>bullish</b> or <b>bearish</b>, then see the continuation and why. Practice reps, no real money, no real ticker.</p></div>' +
      '<section class="card">' +
      '<div class="ct-modebar"><div class="seg" id="ct-mode">' + segBtn('practice', 'Practice', 'book') + segBtn('timed', 'Timed', 'clock') + '</div>' +
      '<div class="ct-timer" id="ct-timer" hidden></div></div>' +
      '<div class="ct-scorebar" id="ct-score"></div>' +
      '<div class="ct-chart" id="ct-chart"></div>' +
      '<div class="ct-tag small muted" id="ct-tag"></div>' +
      '<div class="ct-controls" id="ct-controls">' +
      '<button type="button" class="btn ct-bull" data-guess="bull">' + App.icon('trend', 16) + ' Bullish</button>' +
      '<button type="button" class="btn ct-bear" data-guess="bear">' + App.icon('trend', 16) + ' Bearish</button>' +
      '</div>' +
      '<div class="ct-result" id="ct-result" hidden></div>' +
      '</section>' +
      '<section class="card"><div class="card-title">' + App.icon('info', 15) + ' How this works</div>' +
      '<p class="small" style="margin:6px 0 0;color:var(--ink-2)">These are synthetic charts generated to show a specific setup with a known continuation — they are practice for pattern recognition, not predictions about any real stock. In live markets nothing is certain; even a textbook setup fails a meaningful share of the time, which is exactly why every playbook here sizes from a stop. Treat a correct call as “I read the setup,” not “I know the future.”</p>' +
      '</section>';

    var chartEl = root.querySelector('#ct-chart');
    var tagEl = root.querySelector('#ct-tag');
    var scoreEl = root.querySelector('#ct-score');
    var controls = root.querySelector('#ct-controls');
    var resultEl = root.querySelector('#ct-result');
    var modeEl = root.querySelector('#ct-mode');
    var timerEl = root.querySelector('#ct-timer');

    function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }
    function paintTimer() {
      if (!timed) { timerEl.hidden = true; return; }
      timerEl.hidden = false;
      timerEl.innerHTML = '<div class="sizing-timebar"><div class="sizing-timefill" style="width:' + Math.max(0, timeLeft / TIMED_SECS * 100) + '%"></div></div>' +
        '<span class="small muted tnum">' + Math.max(0, timeLeft).toFixed(0) + 's</span>';
    }
    function paintMode() {
      modeEl.querySelectorAll('.seg-btn').forEach(function (b) {
        var on = b.getAttribute('data-mode') === (timed ? 'timed' : 'practice');
        b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }
    function paintScore() {
      var s = loadStats();
      var pct = s.plays ? Math.round(s.correct / s.plays * 100) : 0;
      scoreEl.innerHTML =
        '<span>Read <b class="tnum">' + s.correct + ' / ' + s.plays + '</b>' + (s.plays ? ' · <b class="tnum">' + pct + '%</b>' : '') + '</span>' +
        '<span class="muted">Streak <b class="tnum">' + streak + '</b>' + (s.best ? ' · best <b class="tnum">' + s.best + '</b>' : '') + '</span>';
    }

    function loadRound() {
      current = newScenario();
      answered = false;
      chartEl.innerHTML = drawChart(current, false);
      tagEl.textContent = timed ? 'What happens next? Beat the clock.' : 'What happens next?';
      controls.hidden = false;
      resultEl.hidden = true;
      resultEl.className = 'ct-result';
      stopTimer();
      if (timed) {
        timeLeft = TIMED_SECS; paintTimer();
        timer = setInterval(function () {
          timeLeft -= 0.1; paintTimer();
          if (timeLeft <= 0) { stopTimer(); if (!answered) answer(null); }
        }, 100);
      } else { paintTimer(); }
      paintScore();
    }

    function answer(guess) {
      if (answered || !current) return;
      answered = true;
      stopTimer(); timeLeft = 0; paintTimer();
      var timedOut = guess == null;
      var correct = !timedOut && guess === current.answer;
      var s = loadStats();
      s.plays += 1;
      if (correct) { s.correct += 1; streak += 1; if (streak > s.best) s.best = streak; }
      else { streak = 0; }
      saveStats(s);

      chartEl.innerHTML = drawChart(current, true);
      tagEl.textContent = current.name;
      controls.hidden = true;

      var word = current.answer === 'bull' ? 'Bullish' : 'Bearish';
      resultEl.className = 'ct-result ' + (correct ? 'ok' : 'no');
      resultEl.innerHTML =
        '<div class="ct-verdict">' + App.icon(correct ? 'check' : 'x', 18) +
        '<span>' + (correct ? 'Correct — ' : timedOut ? 'Time’s up — ' : 'Not this time — ') + 'this was <b>' + word + '</b></span></div>' +
        '<p class="small" style="margin:8px 0 0;color:var(--ink-2)">' + current.explain + '</p>' +
        '<button type="button" class="btn btn-primary" id="ct-next" style="margin-top:14px">Next chart ' + App.icon('chevR', 15) + '</button>';
      resultEl.hidden = false;
      var nb = resultEl.querySelector('#ct-next');
      if (nb) nb.addEventListener('click', loadRound);
      nb && nb.focus();
      paintScore();
    }

    controls.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-guess]');
      if (b) answer(b.getAttribute('data-guess'));
    });
    modeEl.addEventListener('click', function (ev) {
      var b = ev.target.closest('.seg-btn'); if (!b) return;
      var nowTimed = b.getAttribute('data-mode') === 'timed';
      if (nowTimed === timed) return;
      timed = nowTimed;
      App.Store.set('trainer.timed', timed);
      paintMode();
      loadRound();
    });

    /* kill the interval if the router swaps out this view */
    var mo = new MutationObserver(function () {
      if (!document.body.contains(root)) { stopTimer(); mo.disconnect(); }
    });
    mo.observe(document.getElementById('content'), { childList: true });

    container.innerHTML = '';
    container.appendChild(root);
    paintMode();
    loadRound();
  }

  window.ChartTrainer = { render: render, status: status };
})();
