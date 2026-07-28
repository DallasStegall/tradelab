/* ==========================================================================
   TradeLab — Games (quick skill drills)
   Two offline mini-games that reinforce the core skills:
     • Pattern flashcards — "name this candlestick pattern"
     • Sizing drill       — compute the share size from a stop, against the clock
   Sub-routed: #/games (menu) · #/games/patterns · #/games/sizing
   Educational practice only — not financial advice.

   Public API:
     Games.render(container, sub)
     Games.status() -> {plays, correct} | null   (dashboard)
   Storage: 'games.stats' = { patterns:{plays,correct,best}, sizing:{plays,correct,best} }
   ========================================================================== */
(function () {
  'use strict';

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  /* --------------------------- stats --------------------------- */
  function loadStats() {
    var s = App.Store.get('games.stats', {});
    if (!s || typeof s !== 'object') s = {};
    function g(k) { var o = s[k]; if (!o || typeof o !== 'object') o = {}; return { plays: +o.plays || 0, correct: +o.correct || 0, best: +o.best || 0 }; }
    return { patterns: g('patterns'), sizing: g('sizing') };
  }
  function saveStats(s) { App.Store.set('games.stats', s); }
  function status() {
    try {
      if (!window.App || !window.App.Store) return null;
      var s = loadStats();
      return { plays: s.patterns.plays + s.sizing.plays, correct: s.patterns.correct + s.sizing.correct };
    } catch (e) { return null; }
  }

  /* --------------------------- candlestick patterns --------------------------- */
  /* candles as [open, high, low, close]; only visually-distinct patterns so a
     multiple-choice name is always fair (hammer/hanging-man look identical, so
     only one is included). */
  var PATTERNS = [
    { name: 'Hammer', bias: 'bull', cands: [[52, 53, 45, 52.5]],
      meaning: 'A small body at the top of a long lower wick after a decline — buyers rejected lower prices. A potential bullish reversal; wait for the next candle to confirm.' },
    { name: 'Shooting star', bias: 'bear', cands: [[48, 55, 47.6, 48.4]],
      meaning: 'A small body at the bottom of a long upper wick after a rally — sellers rejected higher prices. A potential bearish reversal.' },
    { name: 'Doji', bias: 'neutral', cands: [[50, 53, 47, 50.1]],
      meaning: 'Open and close are almost equal — indecision, a balance between buyers and sellers. Meaningful at the extreme of a move, where it warns momentum is stalling.' },
    { name: 'Bullish engulfing', bias: 'bull', cands: [[51, 51.4, 49, 49.3], [49, 52.6, 48.8, 52.3]],
      meaning: 'A down candle followed by a larger up candle whose body fully engulfs it — a decisive shift from sellers to buyers.' },
    { name: 'Bearish engulfing', bias: 'bear', cands: [[49, 51, 48.6, 50.7], [51, 51.3, 47.6, 48]],
      meaning: 'An up candle followed by a larger down candle that engulfs it — buyers were overwhelmed by sellers.' },
    { name: 'Inside bar', bias: 'neutral', cands: [[48, 53, 47, 52], [50, 51.4, 49, 50.4]],
      meaning: 'The second candle trades entirely within the first candle’s range — a volatility contraction. A break of the mother bar’s high or low often triggers the next move.' },
    { name: 'Morning star', bias: 'bull', cands: [[53, 53.4, 50, 50.3], [49.7, 50.1, 49, 49.4], [49.7, 53, 49.5, 52.6]],
      meaning: 'A down candle, a small indecision candle, then a strong up candle — a three-bar bottoming reversal.' },
    { name: 'Evening star', bias: 'bear', cands: [[47, 50, 46.8, 49.7], [50.3, 51, 49.9, 50.5], [50.3, 50.5, 47, 47.4]],
      meaning: 'An up candle, a small indecision candle, then a strong down candle — a three-bar topping reversal.' },
    { name: 'Three white soldiers', bias: 'bull', cands: [[48, 49, 47.8, 48.8], [48.7, 49.9, 48.5, 49.7], [49.6, 50.7, 49.4, 50.5]],
      meaning: 'Three consecutive strong up candles, each opening within and closing above the prior — steady, broad buying pressure.' },
    { name: 'Three black crows', bias: 'bear', cands: [[51, 51.2, 50, 50.2], [50.3, 50.5, 49.1, 49.3], [49.4, 49.6, 48.2, 48.5]],
      meaning: 'Three consecutive strong down candles — steady, broad selling pressure and a bearish continuation/reversal.' },
    { name: 'Bullish marubozu', bias: 'bull', cands: [[48, 51.05, 47.95, 51]],
      meaning: 'A full-bodied up candle with virtually no wicks — buyers controlled from open to close. Strong conviction.' }
  ];

  function patternSvg(cands) {
    var W = 260, H = 160, padX = 30, padY = 18;
    var lo = Infinity, hi = -Infinity;
    cands.forEach(function (c) { if (c[2] < lo) lo = c[2]; if (c[1] > hi) hi = c[1]; });
    var p = (hi - lo) * 0.14; lo -= p; hi += p;
    var band = (W - padX * 2) / cands.length, bw = Math.min(24, band * 0.5);
    var sy = function (v) { return padY + (1 - (v - lo) / (hi - lo)) * (H - padY * 2); };
    var s = '';
    cands.forEach(function (c, i) {
      var x = padX + band * (i + 0.5);
      var up = c[3] >= c[0], col = up ? 'var(--pos)' : 'var(--neg)';
      s += '<line x1="' + x.toFixed(1) + '" y1="' + sy(c[1]).toFixed(1) + '" x2="' + x.toFixed(1) + '" y2="' + sy(c[2]).toFixed(1) + '" stroke="' + col + '" stroke-width="1.8"/>';
      var top = sy(Math.max(c[0], c[3])), bh = Math.max(2, sy(Math.min(c[0], c[3])) - top);
      s += '<rect x="' + (x - bw / 2).toFixed(1) + '" y="' + top.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + bh.toFixed(1) + '" rx="1.6" fill="' + col + '"/>';
    });
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" role="img" style="width:100%;max-width:280px;height:auto;display:block;margin:0 auto">' + s + '</svg>';
  }

  /* --------------------------- shared option UI --------------------------- */
  function optionRow(label, val) {
    return '<button type="button" class="game-opt" data-val="' + App.esc(String(val)) + '">' + App.esc(label) + '</button>';
  }
  function biasBadge(bias) {
    var m = { bull: ['pos', 'Bullish'], bear: ['neg', 'Bearish'], neutral: ['', 'Indecision'] }[bias] || ['', bias];
    return '<span class="badge ' + (m[0] === 'pos' ? 'green' : m[0] === 'neg' ? 'red' : '') + '">' + m[1] + '</span>';
  }

  /* --------------------------- pattern flashcards --------------------------- */
  function patternGame(container) {
    var streak = 0, current = null, answered = false;
    var root = document.createElement('div');
    root.innerHTML =
      '<a class="back-link" href="#/games">' + App.icon('chevL', 14) + ' Games</a>' +
      '<div class="page-header spread"><div><h1>Pattern flashcards</h1>' +
      '<p class="lede">Name the candlestick pattern. One or a few candles — read the bodies and the wicks.</p></div></div>' +
      '<section class="card">' +
      '<div class="ct-scorebar" id="g-score"></div>' +
      '<div class="game-figure" id="g-fig"></div>' +
      '<div class="game-opts" id="g-opts"></div>' +
      '<div class="ct-result" id="g-result" hidden></div>' +
      '</section>';

    var figEl = root.querySelector('#g-fig'), optsEl = root.querySelector('#g-opts'),
      resultEl = root.querySelector('#g-result'), scoreEl = root.querySelector('#g-score');

    function paintScore() {
      var st = loadStats().patterns, pct = st.plays ? Math.round(st.correct / st.plays * 100) : 0;
      scoreEl.innerHTML = '<span>Score <b class="tnum">' + st.correct + ' / ' + st.plays + '</b>' + (st.plays ? ' · <b class="tnum">' + pct + '%</b>' : '') + '</span>' +
        '<span class="muted">Streak <b class="tnum">' + streak + '</b>' + (st.best ? ' · best <b class="tnum">' + st.best + '</b>' : '') + '</span>';
    }
    function load() {
      current = PATTERNS[Math.floor(Math.random() * PATTERNS.length)];
      answered = false;
      figEl.innerHTML = patternSvg(current.cands);
      var others = shuffle(PATTERNS.filter(function (p) { return p.name !== current.name; })).slice(0, 3);
      var choices = shuffle(others.concat([current]).map(function (p) { return p.name; }));
      optsEl.innerHTML = choices.map(function (n) { return optionRow(n, n); }).join('');
      optsEl.hidden = false;
      resultEl.hidden = true; resultEl.className = 'ct-result';
      paintScore();
    }
    function answer(val, btn) {
      if (answered) return; answered = true;
      var correct = val === current.name;
      var st = loadStats(); st.patterns.plays++;
      if (correct) { st.patterns.correct++; streak++; if (streak > st.patterns.best) st.patterns.best = streak; }
      else streak = 0;
      saveStats(st);
      optsEl.querySelectorAll('.game-opt').forEach(function (b) {
        var v = b.getAttribute('data-val');
        if (v === current.name) b.classList.add('correct');
        else if (b === btn) b.classList.add('wrong');
        b.disabled = true;
      });
      resultEl.className = 'ct-result ' + (correct ? 'ok' : 'no');
      resultEl.innerHTML = '<div class="ct-verdict">' + App.icon(correct ? 'check' : 'x', 18) +
        '<span>' + (correct ? 'Correct' : 'It was ' + current.name) + ' ' + biasBadge(current.bias) + '</span></div>' +
        '<p class="small" style="margin:8px 0 0;color:var(--ink-2)">' + App.esc(current.meaning) + '</p>' +
        '<button type="button" class="btn btn-primary" id="g-next" style="margin-top:14px">Next ' + App.icon('chevR', 15) + '</button>';
      resultEl.hidden = false;
      var nb = resultEl.querySelector('#g-next');
      nb.addEventListener('click', load); nb.focus();
      paintScore();
    }
    optsEl.addEventListener('click', function (ev) {
      var b = ev.target.closest('.game-opt'); if (b && !answered) answer(b.getAttribute('data-val'), b);
    });

    container.innerHTML = ''; container.appendChild(root); load();
  }

  /* --------------------------- position-sizing drill --------------------------- */
  function sizingGame(container) {
    var streak = 0, current = null, answered = false, timer = null, timeLeft = 0;
    var root = document.createElement('div');
    root.innerHTML =
      '<a class="back-link" href="#/games">' + App.icon('chevL', 14) + ' Games</a>' +
      '<div class="page-header"><h1>Sizing speed drill</h1>' +
      '<p class="lede">How many shares? <b>Shares = account × risk% ÷ (entry − stop)</b>, rounded down. Beat the clock — the math should become automatic.</p></div>' +
      '<section class="card">' +
      '<div class="ct-scorebar" id="s-score"></div>' +
      '<div class="sizing-timer" id="s-timer"></div>' +
      '<div class="sizing-card" id="s-prompt"></div>' +
      '<div class="game-opts" id="s-opts"></div>' +
      '<div class="ct-result" id="s-result" hidden></div>' +
      '</section>';

    var promptEl = root.querySelector('#s-prompt'), optsEl = root.querySelector('#s-opts'),
      resultEl = root.querySelector('#s-result'), scoreEl = root.querySelector('#s-score'),
      timerEl = root.querySelector('#s-timer');

    function paintScore() {
      var st = loadStats().sizing, pct = st.plays ? Math.round(st.correct / st.plays * 100) : 0;
      scoreEl.innerHTML = '<span>Score <b class="tnum">' + st.correct + ' / ' + st.plays + '</b>' + (st.plays ? ' · <b class="tnum">' + pct + '%</b>' : '') + '</span>' +
        '<span class="muted">Streak <b class="tnum">' + streak + '</b>' + (st.best ? ' · best <b class="tnum">' + st.best + '</b>' : '') + '</span>';
    }
    function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }
    function paintTimer() {
      timerEl.innerHTML = '<div class="sizing-timebar"><div class="sizing-timefill" style="width:' + Math.max(0, timeLeft / 20 * 100) + '%"></div></div>' +
        '<span class="small muted tnum">' + Math.max(0, timeLeft).toFixed(0) + 's</span>';
    }
    function make() {
      var account = App.Store.get ? 0 : 0;
      account = [10000, 20000, 25000, 30000, 50000][Math.floor(rnd(0, 5))];
      var riskPct = [0.5, 1, 1, 1.5, 2][Math.floor(rnd(0, 5))];
      var entry = +(rnd(8, 220)).toFixed(2);
      var stopDist = +(rnd(0.10, 0.80)).toFixed(2);
      var stop = +(entry - stopDist).toFixed(2);
      var riskDollars = account * riskPct / 100;
      var correct = Math.floor(riskDollars / stopDist);
      /* distractors: common mistakes + near-misses */
      var set = {}; set[correct] = true;
      var cands = [
        Math.floor(account / entry),                    /* max shares by capital (ignores risk) */
        Math.floor(riskDollars / entry),                /* divided by price, not stop distance */
        Math.floor(correct * (Math.random() < 0.5 ? 1.5 : 0.6)),
        Math.round(correct / 10) * 10,
        correct + (Math.random() < 0.5 ? 1 : -1) * Math.max(5, Math.round(correct * 0.15))
      ];
      var opts = [correct];
      for (var i = 0; i < cands.length && opts.length < 4; i++) {
        var v = cands[i];
        if (v > 0 && !set[v]) { set[v] = true; opts.push(v); }
      }
      while (opts.length < 4) { var f = correct + opts.length * 7; if (!set[f]) { set[f] = true; opts.push(f); } }
      return { account: account, riskPct: riskPct, entry: entry, stop: stop, stopDist: stopDist,
        riskDollars: riskDollars, correct: correct, options: shuffle(opts) };
    }
    function load() {
      current = make(); answered = false;
      promptEl.innerHTML =
        '<div class="sizing-grid">' +
        '<div><span class="sizing-lbl">Account</span><span class="sizing-num tnum">' + App.fmtMoney(current.account, { dec: 0 }) + '</span></div>' +
        '<div><span class="sizing-lbl">Risk / trade</span><span class="sizing-num tnum">' + current.riskPct + '%</span></div>' +
        '<div><span class="sizing-lbl">Entry</span><span class="sizing-num tnum">' + current.entry.toFixed(2) + '</span></div>' +
        '<div><span class="sizing-lbl">Stop</span><span class="sizing-num tnum">' + current.stop.toFixed(2) + '</span></div>' +
        '</div>';
      optsEl.innerHTML = current.options.map(function (v) { return optionRow(App.fmtNum(v, 0) + ' shares', v); }).join('');
      optsEl.hidden = false;
      resultEl.hidden = true; resultEl.className = 'ct-result';
      timeLeft = 20; paintTimer(); stopTimer();
      timer = setInterval(function () {
        timeLeft -= 0.1; paintTimer();
        if (timeLeft <= 0) { stopTimer(); if (!answered) answer(null, null); }
      }, 100);
      paintScore();
    }
    function answer(val, btn) {
      if (answered) return; answered = true; stopTimer(); timeLeft = 0; paintTimer();
      var correct = val != null && +val === current.correct;
      var st = loadStats(); st.sizing.plays++;
      if (correct) { st.sizing.correct++; streak++; if (streak > st.sizing.best) st.sizing.best = streak; }
      else streak = 0;
      saveStats(st);
      optsEl.querySelectorAll('.game-opt').forEach(function (b) {
        var v = +b.getAttribute('data-val');
        if (v === current.correct) b.classList.add('correct');
        else if (b === btn) b.classList.add('wrong');
        b.disabled = true;
      });
      var timedOut = val == null;
      resultEl.className = 'ct-result ' + (correct ? 'ok' : 'no');
      resultEl.innerHTML = '<div class="ct-verdict">' + App.icon(correct ? 'check' : 'x', 18) +
        '<span>' + (correct ? 'Correct' : timedOut ? 'Time — it was ' + current.correct + ' shares' : 'It was ' + current.correct + ' shares') + '</span></div>' +
        '<p class="small" style="margin:8px 0 0;color:var(--ink-2)">Risk = ' + App.fmtMoney(current.account, { dec: 0 }) + ' × ' + current.riskPct + '% = <b>' + App.fmtMoney(current.riskDollars, { dec: 0 }) +
        '</b>. Stop distance = ' + current.entry.toFixed(2) + ' − ' + current.stop.toFixed(2) + ' = <b>' + current.stopDist.toFixed(2) +
        '</b>. Shares = floor(' + App.fmtMoney(current.riskDollars, { dec: 0 }) + ' ÷ ' + current.stopDist.toFixed(2) + ') = <b>' + current.correct + '</b>.</p>' +
        '<button type="button" class="btn btn-primary" id="s-next" style="margin-top:14px">Next ' + App.icon('chevR', 15) + '</button>';
      resultEl.hidden = false;
      var nb = resultEl.querySelector('#s-next');
      nb.addEventListener('click', load); nb.focus();
      paintScore();
    }
    optsEl.addEventListener('click', function (ev) {
      var b = ev.target.closest('.game-opt'); if (b && !answered) answer(b.getAttribute('data-val'), b);
    });

    /* stop the interval if the user navigates away (router replaces #content) */
    var mo = new MutationObserver(function () {
      if (!document.body.contains(root)) { stopTimer(); mo.disconnect(); }
    });
    mo.observe(document.getElementById('content'), { childList: true });

    container.innerHTML = ''; container.appendChild(root); load();
  }

  /* --------------------------- menu --------------------------- */
  function menu(container) {
    var st = loadStats();
    function stat(g) { return g.plays ? (g.correct + '/' + g.plays + ' · ' + Math.round(g.correct / g.plays * 100) + '%' + (g.best > 1 ? ' · best streak ' + g.best : '')) : 'Not played yet'; }
    var root = document.createElement('div');
    root.innerHTML =
      '<div class="page-header"><h1>Games</h1><p class="lede">Fast drills that build the two reflexes every trader needs: reading candles and sizing from a stop. Quick reps, tracked scores, fully offline.</p></div>' +
      '<div class="grid cols-2">' +
      '<a class="card" href="#/games/patterns"><div class="row" style="margin-bottom:8px;color:var(--accent)">' + App.icon('candles', 20) + '<h3 style="margin:0;color:var(--ink)">Pattern flashcards</h3></div>' +
      '<p class="small" style="color:var(--ink-2);margin-bottom:10px">See a candlestick pattern, name it, learn what it signals.</p><div class="small muted">' + App.esc(stat(st.patterns)) + '</div></a>' +
      '<a class="card" href="#/games/sizing"><div class="row" style="margin-bottom:8px;color:var(--accent)">' + App.icon('calc', 20) + '<h3 style="margin:0;color:var(--ink)">Sizing speed drill</h3></div>' +
      '<p class="small" style="color:var(--ink-2);margin-bottom:10px">Compute the share size from a stop before the clock runs out.</p><div class="small muted">' + App.esc(stat(st.sizing)) + '</div></a>' +
      '</div>';
    container.innerHTML = ''; container.appendChild(root);
  }

  function render(container, sub) {
    var which = sub && sub[0];
    if (which === 'patterns') patternGame(container);
    else if (which === 'sizing') sizingGame(container);
    else menu(container);
  }

  window.Games = { render: render, status: status };
})();
