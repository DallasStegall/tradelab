/* ==========================================================================
   TradeLab — Strategy Library data (js/data/strategies.js)
   Pure data: window.STRATEGY_DATA. Rendered by js/app.js (renderStrategyDetail).
   All colors via CSS variables so diagrams work in both themes and print.
   ========================================================================== */
(function () {
  'use strict';

  /* ---------- tiny SVG builders (run once at load, output plain strings) ---------- */

  function candle(cx, o, h, l, c, sy, bw) {
    bw = bw || 16;
    var col = c >= o ? 'var(--pos)' : 'var(--neg)';
    var top = sy(Math.max(o, c)).toFixed(1);
    var bot = sy(Math.min(o, c));
    var bh = Math.max(2, bot - sy(Math.max(o, c))).toFixed(1);
    return '<line x1="' + cx + '" y1="' + sy(h).toFixed(1) + '" x2="' + cx + '" y2="' + sy(l).toFixed(1) +
      '" stroke="' + col + '" stroke-width="1.5"/>' +
      '<rect x="' + (cx - bw / 2) + '" y="' + top + '" width="' + bw + '" height="' + bh + '" rx="1.5" fill="' + col + '"/>';
  }

  function volBar(cx, h, hot, bw) {
    bw = bw || 18;
    return '<rect x="' + (cx - bw / 2) + '" y="' + (372 - h) + '" width="' + bw + '" height="' + h +
      '" rx="1" fill="' + (hot ? 'var(--accent)' : 'var(--grid)') + '"/>';
  }

  function hline(x1, x2, y, color, dash, w) {
    return '<line x1="' + x1 + '" y1="' + y.toFixed(1) + '" x2="' + x2 + '" y2="' + y.toFixed(1) +
      '" stroke="' + color + '" stroke-width="' + (w || 1.5) + '"' +
      (dash ? ' stroke-dasharray="6 4"' : '') + '/>';
  }

  function txt(x, y, s, opts) {
    opts = opts || {};
    return '<text x="' + x + '" y="' + y + '" font-size="' + (opts.size || 12) +
      '" fill="' + (opts.fill || 'var(--ink-2)') + '"' +
      (opts.anchor ? ' text-anchor="' + opts.anchor + '"' : '') +
      (opts.weight ? ' font-weight="' + opts.weight + '"' : '') + '>' + s + '</text>';
  }

  function arrow(x, y1, y2, color) {
    var head = y2 > y1 ? y2 - 6 : y2 + 6;
    return '<line x1="' + x + '" y1="' + y1 + '" x2="' + x + '" y2="' + y2 + '" stroke="' + color + '" stroke-width="2"/>' +
      '<path d="M' + (x - 4) + ',' + head + ' L' + x + ',' + y2 + ' L' + (x + 4) + ',' + head + '" fill="none" stroke="' + color + '" stroke-width="2"/>';
  }

  function wrapSvg(inner, caption, h) {
    /* 830 wide: labels anchored at x≈700+ need right-side headroom or they clip */
    return '<div class="diagram"><svg viewBox="0 0 830 ' + (h || 380) + '" xmlns="http://www.w3.org/2000/svg" role="img">' +
      inner + '</svg>' + (caption ? '<div class="diagram-caption">' + caption + '</div>' : '') + '</div>';
  }

  /* ---------------- ORB diagram 1: the full setup ---------------- */
  function orbSetupSvg() {
    var sy = function (p) { return 330 - (p - 25.0) * 187.5; };
    var s = '';
    /* opening range shading */
    s += '<rect x="70" y="' + sy(25.80).toFixed(1) + '" width="580" height="' + (sy(25.20) - sy(25.80)).toFixed(1) +
      '" fill="var(--accent)" fill-opacity="0.07"/>';
    /* levels */
    s += hline(70, 700, sy(25.80), 'var(--accent)', true);
    s += hline(70, 700, sy(25.20), 'var(--axis)', true);
    s += hline(340, 700, sy(25.50), 'var(--neg)', true);
    s += hline(70, 700, sy(26.40), 'var(--pos)', true);
    s += txt(705, sy(25.80) + 4, 'OR high 25.80', { anchor: 'start', size: 11, fill: 'var(--accent)' });
    s += txt(705, sy(25.20) + 4, 'OR low 25.20', { anchor: 'start', size: 11, fill: 'var(--ink-3)' });
    s += txt(705, sy(25.50) + 4, 'Stop 25.50', { anchor: 'start', size: 11, fill: 'var(--neg-text)' });
    s += txt(705, sy(26.40) + 4, 'Target 26.40', { anchor: 'start', size: 11, fill: 'var(--pos-text)' });
    s += txt(80, sy(25.80) - 8, 'Opening range = first 5-minute candle', { size: 11.5, fill: 'var(--accent)', weight: 600 });
    s += txt(80, sy(26.40) - 8, 'Measured move: OR high + range (25.80 + 0.60)', { size: 11, fill: 'var(--pos-text)' });
    /* candles */
    var cs = [
      [90, 25.35, 25.80, 25.20, 25.72],
      [134, 25.72, 25.75, 25.48, 25.55],
      [178, 25.55, 25.68, 25.42, 25.62],
      [222, 25.62, 25.72, 25.50, 25.54],
      [266, 25.54, 25.66, 25.45, 25.60],
      [310, 25.60, 25.76, 25.55, 25.70],
      [354, 25.70, 26.00, 25.62, 25.96],
      [398, 25.96, 26.12, 25.85, 26.05],
      [442, 26.05, 26.18, 25.92, 25.98],
      [486, 25.98, 26.28, 25.95, 26.24],
      [530, 26.24, 26.45, 26.15, 26.38],
      [574, 26.38, 26.44, 26.20, 26.30]
    ];
    cs.forEach(function (c) { s += candle(c[0], c[1], c[2], c[3], c[4], sy); });
    /* volume */
    var vols = [30, 14, 10, 9, 8, 12, 26, 18, 10, 16, 14, 9];
    cs.forEach(function (c, i) { s += volBar(c[0], vols[i], i === 0 || i === 6); });
    s += txt(60, 368, 'Vol', { size: 10, fill: 'var(--ink-3)', anchor: 'end' });
    /* entry annotation */
    s += arrow(354, sy(26.30), sy(26.02) - 4, 'var(--accent)');
    s += txt(354, sy(26.30) - 8, 'Entry 25.85: close above OR high on 2x volume', { anchor: 'middle', size: 11.5, fill: 'var(--accent)', weight: 600 });
    /* time axis */
    s += hline(70, 700, 336, 'var(--axis)', false, 1);
    s += txt(90, 352, '9:30', { anchor: 'middle', size: 10.5, fill: 'var(--ink-3)' });
    s += txt(222, 352, '9:45', { anchor: 'middle', size: 10.5, fill: 'var(--ink-3)' });
    s += txt(354, 352, '10:00', { anchor: 'middle', size: 10.5, fill: 'var(--ink-3)' });
    s += txt(530, 352, '10:20', { anchor: 'middle', size: 10.5, fill: 'var(--ink-3)' });
    return wrapSvg(s, 'A 5-minute ORB long: the first candle sets the range, price coils inside it, then a high-volume candle closes above the range high. Stop at the range midpoint, target at one full range above the breakout level.');
  }

  /* ---------------- ORB diagram 2: stop & exit zones ---------------- */
  function orbExitSvg() {
    var sy = function (p) { return 300 - (p - 25.0) * 200; };
    var s = '';
    /* zones */
    s += '<rect x="60" y="' + sy(26.40).toFixed(1) + '" width="560" height="' + (sy(25.85) - sy(26.40)).toFixed(1) + '" fill="var(--pos)" fill-opacity="0.10"/>';
    s += '<rect x="60" y="' + sy(25.50).toFixed(1) + '" width="560" height="' + (sy(25.15) - sy(25.50)).toFixed(1) + '" fill="var(--neg)" fill-opacity="0.10"/>';
    s += hline(60, 620, sy(25.85), 'var(--accent)', false, 2);
    s += hline(60, 620, sy(26.20), 'var(--pos)', true);
    s += hline(60, 620, sy(26.40), 'var(--pos)', true);
    s += hline(60, 620, sy(25.50), 'var(--neg)', false, 2);
    s += hline(60, 620, sy(25.15), 'var(--neg)', true);
    s += txt(628, sy(25.85) + 4, 'Entry 25.85', { anchor: 'start', size: 11.5, fill: 'var(--accent)', weight: 600 });
    s += txt(628, sy(26.20) + 4, '+1R 26.20 — sell half,', { anchor: 'start', size: 11, fill: 'var(--pos-text)' });
    s += txt(628, sy(26.20) + 17, 'stop to breakeven', { anchor: 'start', size: 11, fill: 'var(--pos-text)' });
    s += txt(628, sy(26.40) + 4, 'Target 26.40 (+1 range)', { anchor: 'start', size: 11, fill: 'var(--pos-text)' });
    s += txt(628, sy(25.50) + 4, 'Stop A: 25.50 (mid)', { anchor: 'start', size: 11, fill: 'var(--neg-text)' });
    s += txt(628, sy(25.15) + 4, 'Stop B: 25.15 (below OR low)', { anchor: 'start', size: 11, fill: 'var(--neg-text)' });
    s += txt(70, sy(26.40) + 16, 'Profit zone — scale out into strength', { size: 11.5, fill: 'var(--pos-text)', weight: 600 });
    s += txt(70, sy(25.15) - 8, 'Failure zone — breakout is invalid, exit without debate', { size: 11.5, fill: 'var(--neg-text)', weight: 600 });
    /* simplified price path */
    s += '<path d="M70,' + sy(25.70).toFixed(1) + ' L140,' + sy(25.60).toFixed(1) + ' L210,' + sy(25.88).toFixed(1) +
      ' L280,' + sy(25.80).toFixed(1) + ' L350,' + sy(26.05).toFixed(1) + ' L420,' + sy(25.95).toFixed(1) +
      ' L490,' + sy(26.22).toFixed(1) + ' L560,' + sy(26.15).toFixed(1) + ' L610,' + sy(26.41).toFixed(1) +
      '" fill="none" stroke="var(--chart-1)" stroke-width="2" stroke-linejoin="round"/>';
    s += '<circle cx="210" cy="' + sy(25.88).toFixed(1) + '" r="4" fill="var(--accent)" stroke="var(--surface)" stroke-width="2"/>';
    s += '<circle cx="490" cy="' + sy(26.22).toFixed(1) + '" r="4" fill="var(--pos)" stroke="var(--surface)" stroke-width="2"/>';
    s += '<circle cx="610" cy="' + sy(26.41).toFixed(1) + '" r="4" fill="var(--pos)" stroke="var(--surface)" stroke-width="2"/>';
    return wrapSvg(s, 'The trade brackets itself: half off at +1R with the stop moved to breakeven, the rest at the measured move. Choose stop A (range midpoint, tighter, more shakeouts) or stop B (below the range, wider, fewer but larger losses) before entry — never mid-trade.', 340);
  }

  /* ---------------- Pullback diagram 1: trend + pullback entry ---------------- */
  function pullbackSetupSvg() {
    var sy = function (p) { return 330 - (p - 159.0) * 60; };
    var s = '';
    /* EMAs as smooth paths (9 EMA hugs price, 20 EMA below) */
    s += '<path d="M70,' + sy(160.0).toFixed(1) + ' C160,' + sy(160.6).toFixed(1) + ' 240,' + sy(161.4).toFixed(1) + ' 330,' + sy(162.1).toFixed(1) +
      ' S480,' + sy(162.1).toFixed(1) + ' 540,' + sy(162.5).toFixed(1) + ' S680,' + sy(163.6).toFixed(1) + ' 700,' + sy(163.9).toFixed(1) +
      '" fill="none" stroke="var(--chart-1)" stroke-width="1.8" opacity="0.9"/>';
    s += '<path d="M70,' + sy(159.6).toFixed(1) + ' C170,' + sy(160.1).toFixed(1) + ' 260,' + sy(160.8).toFixed(1) + ' 350,' + sy(161.5).toFixed(1) +
      ' S500,' + sy(161.7).toFixed(1) + ' 560,' + sy(162.0).toFixed(1) + ' S680,' + sy(162.9).toFixed(1) + ' 700,' + sy(163.1).toFixed(1) +
      '" fill="none" stroke="var(--chart-4)" stroke-width="1.8" opacity="0.9"/>';
    s += txt(704, sy(163.9) + 3, '9 EMA', { anchor: 'start', size: 10.5, fill: 'var(--chart-1)' });
    s += txt(704, sy(163.1) + 10, '20 EMA', { anchor: 'start', size: 10.5, fill: 'var(--chart-4)' });
    /* candles: impulse up, pullback, hammer, entry, continuation */
    var cs = [
      [90, 160.20, 160.70, 160.05, 160.60],
      [130, 160.60, 161.15, 160.50, 161.05],
      [170, 161.05, 161.80, 161.00, 161.70],
      [210, 161.70, 162.40, 161.60, 162.30],
      [250, 162.30, 163.00, 162.20, 162.90],   /* impulse high */
      [290, 162.90, 162.95, 162.45, 162.55],   /* pullback 1 (red) */
      [330, 162.55, 162.65, 162.10, 162.20],   /* pullback 2 (red) */
      [370, 162.20, 162.30, 161.80, 161.95],   /* pullback 3 (red) */
      [410, 161.95, 162.10, 161.55, 162.00],   /* hammer at 20 EMA */
      [450, 162.00, 162.55, 161.95, 162.45],   /* entry candle */
      [490, 162.45, 163.05, 162.40, 162.95],
      [530, 162.95, 163.15, 162.60, 162.75],
      [570, 162.75, 163.45, 162.70, 163.35],
      [610, 163.35, 163.90, 163.25, 163.80]
    ];
    cs.forEach(function (c) { s += candle(c[0], c[1], c[2], c[3], c[4], sy, 15); });
    var vols = [16, 18, 22, 24, 26, 12, 10, 8, 9, 20, 18, 10, 17, 15];
    cs.forEach(function (c, i) { s += volBar(c[0], vols[i], i === 9, 16); });
    /* annotations */
    s += txt(170, sy(163.05) - 26, 'Impulse leg — strong volume', { anchor: 'middle', size: 11.5, fill: 'var(--ink-2)', weight: 600 });
    s += txt(330, sy(163.3) - 4, 'Controlled pullback:', { anchor: 'middle', size: 11, fill: 'var(--ink-2)' });
    s += txt(330, sy(163.3) + 9, '2-4 candles, shrinking volume', { anchor: 'middle', size: 11, fill: 'var(--ink-3)' });
    s += arrow(410, sy(160.8), sy(161.5) - 4, 'var(--accent)');
    s += txt(410, sy(160.8) + 14, 'Reversal candle holds the 20 EMA', { anchor: 'middle', size: 11, fill: 'var(--accent)', weight: 600 });
    s += hline(430, 620, sy(162.10), 'var(--accent)', true);
    s += txt(626, sy(162.10) + 4, 'Entry 162.10', { anchor: 'start', size: 11, fill: 'var(--accent)' });
    s += hline(390, 620, sy(161.50), 'var(--neg)', true);
    s += txt(626, sy(161.50) + 4, 'Stop 161.50', { anchor: 'start', size: 11, fill: 'var(--neg-text)' });
    s += hline(70, 336, 336, 'var(--axis)', false, 1);
    return wrapSvg(s, 'Trend continuation: an impulse leg on volume, a shallow 3-candle pullback into the rising 20 EMA on shrinking volume, a reversal candle that holds the average, entry over its high. The stop hides under the pullback low.');
  }

  /* ---------------- Pullback diagram 2: fib depth zones ---------------- */
  function pullbackZonesSvg() {
    var sy = function (p) { return 40 + (163.0 - p) * 130; };
    var s = '';
    /* impulse line */
    s += '<path d="M90,' + sy(161.0).toFixed(1) + ' L300,' + sy(163.0).toFixed(1) + '" stroke="var(--chart-1)" stroke-width="2.5" fill="none"/>';
    s += '<circle cx="90" cy="' + sy(161.0).toFixed(1) + '" r="4" fill="var(--chart-1)" stroke="var(--surface)" stroke-width="2"/>';
    s += '<circle cx="300" cy="' + sy(163.0).toFixed(1) + '" r="4" fill="var(--chart-1)" stroke="var(--surface)" stroke-width="2"/>';
    s += txt(84, sy(161.0) + 18, 'Swing low 161.00', { size: 11, fill: 'var(--ink-3)' });
    s += txt(294, sy(163.0) - 10, 'Swing high 163.00', { size: 11, fill: 'var(--ink-3)' });
    /* retracement zones */
    var zones = [
      { from: 162.24, to: 162.62, label: 'Shallow: 19-38% — strongest trends barely rest', color: 'var(--pos)' },
      { from: 161.76, to: 162.24, label: 'The sweet spot: 38-62% — classic continuation zone', color: 'var(--accent)' },
      { from: 161.30, to: 161.76, label: 'Deep: 62-85% — trend in doubt, demand extra confirmation', color: 'var(--chart-3)' },
      { from: 161.00, to: 161.30, label: 'Below 85% / full retrace — no longer a pullback trade', color: 'var(--neg)' }
    ];
    zones.forEach(function (z) {
      s += '<rect x="330" y="' + sy(z.to).toFixed(1) + '" width="300" height="' + (sy(z.from) - sy(z.to)).toFixed(1) +
        '" fill="' + z.color + '" fill-opacity="0.13"/>';
      s += txt(340, sy(z.to) + 17, z.label, { size: 11, fill: 'var(--ink-2)' });
    });
    /* pullback path into sweet spot */
    s += '<path d="M300,' + sy(163.0).toFixed(1) + ' L370,' + sy(162.5).toFixed(1) + ' L430,' + sy(162.0).toFixed(1) + ' L470,' + sy(161.9).toFixed(1) +
      ' L540,' + sy(162.6).toFixed(1) + ' L620,' + sy(163.4).toFixed(1) + '" fill="none" stroke="var(--ink-3)" stroke-width="2" stroke-dasharray="1 0" stroke-linejoin="round"/>';
    s += '<circle cx="470" cy="' + sy(161.9).toFixed(1) + '" r="5" fill="var(--accent)" stroke="var(--surface)" stroke-width="2"/>';
    s += txt(470, sy(161.9) + 22, 'Entry zone', { anchor: 'middle', size: 11.5, fill: 'var(--accent)', weight: 600 });
    return wrapSvg(s, 'Measure the impulse leg, then judge the pullback by how much of it price gives back. 38-62% into a rising 20 EMA or VWAP is the classic zone; a pullback that swallows more than ~85% of the leg is a reversal, not a dip.', 330);
  }

  /* ---------------- Scalping diagram 1: VWAP scalp ---------------- */
  function scalpSetupSvg() {
    var sy = function (p) { return 320 - (p - 160.4) * 260; };
    var s = '';
    /* VWAP line */
    s += '<path d="M70,' + sy(160.78).toFixed(1) + ' C200,' + sy(160.84).toFixed(1) + ' 340,' + sy(160.90).toFixed(1) + ' 470,' + sy(160.97).toFixed(1) +
      ' S650,' + sy(161.05).toFixed(1) + ' 700,' + sy(161.08).toFixed(1) + '" fill="none" stroke="var(--chart-3)" stroke-width="2"/>';
    s += txt(704, sy(161.08) + 4, 'VWAP', { anchor: 'start', size: 11, fill: 'var(--chart-3)', weight: 600 });
    /* candles: drive, fade to vwap, reclaim burst */
    var cs = [
      [90, 160.85, 161.10, 160.80, 161.05],
      [128, 161.05, 161.30, 161.00, 161.25],
      [166, 161.25, 161.42, 161.18, 161.38],
      [204, 161.38, 161.44, 161.20, 161.24],
      [242, 161.24, 161.28, 161.05, 161.10],
      [280, 161.10, 161.16, 160.96, 161.00],
      [318, 161.00, 161.08, 160.90, 160.95],   /* tags vwap */
      [356, 160.95, 161.02, 160.92, 160.99],   /* holds */
      [394, 160.99, 161.22, 160.97, 161.20],   /* reclaim burst = entry */
      [432, 161.20, 161.38, 161.16, 161.34],
      [470, 161.34, 161.48, 161.28, 161.44],
      [508, 161.44, 161.50, 161.30, 161.36]
    ];
    cs.forEach(function (c) { s += candle(c[0], c[1], c[2], c[3], c[4], sy, 14); });
    var vols = [18, 20, 16, 10, 12, 11, 14, 8, 26, 20, 16, 10];
    cs.forEach(function (c, i) { s += volBar(c[0], vols[i], i === 8, 15); });
    /* annotations */
    s += arrow(394, sy(160.62), sy(160.94) - 4, 'var(--accent)');
    s += txt(394, sy(160.62) + 14, 'Entry 161.02 — VWAP holds, tape speeds up', { anchor: 'middle', size: 11.5, fill: 'var(--accent)', weight: 600 });
    s += hline(370, 640, sy(160.87), 'var(--neg)', true);
    s += txt(645, sy(160.87) + 4, 'Stop 160.87 (-0.15)', { anchor: 'start', size: 11, fill: 'var(--neg-text)' });
    s += hline(400, 640, sy(161.22), 'var(--pos)', true);
    s += txt(645, sy(161.22) + 4, 'T1 +0.20', { anchor: 'start', size: 11, fill: 'var(--pos-text)' });
    s += hline(400, 640, sy(161.34), 'var(--pos)', true);
    s += txt(645, sy(161.34) + 4, 'T2 +0.32', { anchor: 'start', size: 11, fill: 'var(--pos-text)' });
    s += txt(318, sy(161.55), 'Fade into VWAP on shrinking volume', { anchor: 'middle', size: 11, fill: 'var(--ink-3)' });
    s += hline(70, 700, 336, 'var(--axis)', false, 1);
    return wrapSvg(s, 'A VWAP-hold scalp: an extended stock fades back to VWAP on declining volume, holds it for two candles, then bursts through the fade trendline. In and out within minutes: fixed 15-cent stop, first target +0.20, done by +0.32.');
  }

  /* ---------------- Scalping diagram 2: the risk box ---------------- */
  function scalpRiskSvg() {
    var s = '';
    /* timeline box */
    s += '<rect x="60" y="60" width="640" height="180" rx="10" fill="var(--accent)" fill-opacity="0.06" stroke="var(--border-strong)"/>';
    s += txt(380, 46, 'Anatomy of one scalp — seconds to minutes, everything predefined', { anchor: 'middle', size: 12.5, weight: 600, fill: 'var(--ink)' });
    var steps = [
      { x: 130, title: '0s — Entry', body1: 'Limit at the level.', body2: 'Full size instantly.', color: 'var(--accent)' },
      { x: 290, title: '10-60s — Verdict', body1: 'Works right away', body2: 'or it is wrong.', color: 'var(--chart-3)' },
      { x: 450, title: '+0.20 — Partial', body1: 'Half off. Stop to', body2: 'breakeven. Free trade.', color: 'var(--pos)' },
      { x: 610, title: '1-3 min — Flat', body1: 'Rest out at T2 /', body2: 'trail, never linger.', color: 'var(--pos)' }
    ];
    steps.forEach(function (st, i) {
      s += '<circle cx="' + st.x + '" cy="110" r="7" fill="' + st.color + '" stroke="var(--surface)" stroke-width="2"/>';
      if (i < steps.length - 1) s += '<line x1="' + (st.x + 9) + '" y1="110" x2="' + (steps[i + 1].x - 9) + '" y2="110" stroke="var(--axis)" stroke-width="1.5"/>';
      s += txt(st.x, 145, st.title, { anchor: 'middle', size: 11.5, weight: 600, fill: 'var(--ink)' });
      s += txt(st.x, 163, st.body1, { anchor: 'middle', size: 10.5, fill: 'var(--ink-3)' });
      s += txt(st.x, 177, st.body2, { anchor: 'middle', size: 10.5, fill: 'var(--ink-3)' });
    });
    s += txt(380, 218, 'The stop (-0.10 to -0.20) never widens. If the level breaks, the reason for the trade no longer exists.', { anchor: 'middle', size: 11, fill: 'var(--neg-text)' });
    /* daily circuit breaker strip */
    s += '<rect x="60" y="262" width="640" height="52" rx="10" fill="var(--neg)" fill-opacity="0.08" stroke="var(--border)"/>';
    s += txt(380, 284, 'Daily circuit breaker: 3 losing scalps in a row, or -1.5% on the day = flat and done.', { anchor: 'middle', size: 11.5, weight: 600, fill: 'var(--neg-text)' });
    s += txt(380, 302, 'Scalping profits die by a thousand cuts in chop — the breaker is the edge.', { anchor: 'middle', size: 10.5, fill: 'var(--ink-3)' });
    return wrapSvg(s, 'Scalps are clockwork, not conviction: predefined entry, instant verdict, mechanical partial, hard daily cutoff.', 330);
  }

  /* =============================== DATA =============================== */

  window.STRATEGY_DATA = [

    /* ============================ ORB ============================ */
    {
      id: 'orb',
      name: 'Opening Range Breakout',
      short: 'ORB',
      icon: 'zap',
      tagline: 'Trade the first directional resolution of the day on stocks that gapped with a reason.',
      difficulty: 'Beginner',
      timeframe: '5-min charts (1-min for execution)',
      bestTime: '9:30–10:30 ET',
      riskReward: '1:2+',
      markets: 'Gapping US stocks / ETFs',
      overview:
        '<h2>Why this works</h2>' +
        '<p>The first minutes of the US session concentrate the day’s largest volume as overnight news, pre-market positioning and opening auctions get repriced at once. The high and low of the first candle — the <strong>opening range</strong> — mark where that initial auction found its extremes. When price escapes the range on strong volume, the side that lost the auction is trapped and has to cover, which is the fuel behind the move.</p>' +
        '<p>ORB is mechanical enough for newer traders — the range, trigger, stop and target all come from the chart, not from judgment calls — yet it stays in professional playbooks because the edge renews every morning a stock gaps on a genuine catalyst.</p>' +
        '<div class="callout info>PLACEHOLDER</div>',
      sections: [
        {
          title: 'How it works',
          html:
            '<p>Pick a stock that gapped at least 2% on a real catalyst with pre-market relative volume of 2 or more. Let the first 5-minute candle finish — <strong>do nothing before 9:35</strong>. Its high and low define the opening range. From there the trade is a simple bracket: a confirmed break of the range high is a long; a confirmed break of the range low is a short (on gap-down or weak names). The range size itself becomes the measuring stick for the stop and the first target.</p>' +
            orbSetupSvg() +
            '<p>The range can also be built from the first 15 or 30 minutes. Longer ranges filter more noise and produce fewer, higher-quality signals — at the cost of later entries and wider stops. Most day traders start with the 5-minute range on clean gappers and step up to 15 minutes on choppier names.</p>'
        },
        {
          title: 'Choosing the range: 5, 10 or 15 minutes',
          html:
            '<p>The opening range is simply the window you decide the “opening” is. The three common choices trade speed against reliability — pick one per name before the bell and hold to it; switching mid-trade is how a plan becomes a guess.</p>' +
            '<div class="table-wrap"><table class="table"><thead><tr><th>Range</th><th>Window (ET)</th><th>Character</th><th>Stop</th><th>Best for</th></tr></thead><tbody>' +
            '<tr><td><strong>5-minute</strong></td><td>9:30–9:35</td><td>Earliest entry, most signals, most false breaks — one candle sets the level.</td><td>Tightest</td><td>Clean, liquid gappers with an obvious catalyst</td></tr>' +
            '<tr><td><strong>10-minute</strong></td><td>9:30–9:40</td><td>The middle ground: a second candle of price discovery filters many 5-minute head-fakes while still entering before the morning trend is spent.</td><td>Medium</td><td>Most gappers, most days — a sensible default once the 5-min feels too noisy</td></tr>' +
            '<tr><td><strong>15 / 30-minute</strong></td><td>9:30–9:45 / 10:00</td><td>Fewest, highest-quality signals; late, wide entries. The range often swallows the first pullback.</td><td>Widest</td><td>Choppy names, indices / ETFs, part-time traders</td></tr>' +
            '</tbody></table></div>' +
            '<div class="callout info"><div><b>Why 10 minutes makes a strong default.</b> The 5-minute range is defined by a single candle, so one liquidity spike can hand you a bad level. The 10-minute range is built from two candles of two-sided auction — it discards a lot of opening noise while still letting you in before ~9:45, when the cleanest ORB moves are usually already under way.</div></div>' +
            '<p><strong>The setup in one breath</strong> — identical whichever length you choose:</p>' +
            '<ol>' +
            '<li>Pre-open, the name has already cleared the scan: gap ≥ 2% on a real catalyst, RVOL ≥ 2, price $5–500, tight spread, clean air overhead.</li>' +
            '<li>Let your chosen window finish and mark its high and low. Do nothing inside the range.</li>' +
            '<li>Trade only when a candle <em>closes</em> beyond the range on expanding volume, or on a break-and-retest hold of the broken edge.</li>' +
            '<li>Stop at the range midpoint or beyond the opposite extreme; first target +1R, then the measured move (one full range projected from the break).</li>' +
            '</ol>' +
            '<p>Whatever you pick, keep it consistent across a stock’s history so your win-rate and expectancy numbers actually mean something — a 5-minute ORB and a 15-minute ORB are two different strategies wearing the same name.</p>'
        },
        {
          title: 'Setup criteria',
          html:
            '<p>Every box must be ticked before the open. If any is missing, the breakout is a guess, not a setup.</p>' +
            '<ul>' +
            '<li><strong>Gap of 2%+ with a catalyst.</strong> Earnings, guidance, FDA news, M&A, a major analyst move. No catalyst, no trust: news-less gaps fill more often than they run.</li>' +
            '<li><strong>Relative volume ≥ 2.</strong> At least double the normal volume for the time of day, with 500k+ shares traded pre-market on mid-caps or better.</li>' +
            '<li><strong>Price between $5 and $500.</strong> Below $5, spreads and manipulation dominate; far above, share sizing gets awkward for small accounts.</li>' +
            '<li><strong>Clean air on the daily chart.</strong> The gap should not open directly into a major daily resistance level — check where the 52-week high, prior gap fills and big round numbers sit.</li>' +
            '<li><strong>Average spread ≤ $0.05 or ≤ 0.1% of price.</strong> The strategy needs precise fills at the range edge.</li>' +
            '<li><strong>A defined opening range.</strong> The first candle should be meaningful — a range under ~0.3% of price is too small to structure a trade around; skip or wait for the 15-minute range.</li>' +
            '</ul>'
        },
        {
          title: 'Entry rules',
          html:
            '<p>Two entry styles, both requiring the range to actually break — a wick through the level is not a break.</p>' +
            '<ol>' +
            '<li><strong>Momentum entry.</strong> A 1- or 5-minute candle <em>closes</em> beyond the range extreme on expanding volume. Enter on that close or a stop-order a cent or two beyond the level. Fastest fill, most false starts.</li>' +
            '<li><strong>Break-and-retest entry.</strong> After the breakout candle, wait for price to pull back and hold the broken level (old resistance behaving as support). Enter as it reclaims the breakout candle’s midpoint. Later entry, tighter effective stop, much better win rate — the professional default on all but the very strongest tapes.</li>' +
            '</ol>' +
            '<div class="table-wrap"><table class="table"><thead><tr><th>Range length</th><th>Signals</th><th>Stop width</th><th>Best for</th></tr></thead><tbody>' +
            '<tr><td>5 min</td><td>Many, earlier</td><td>Tight</td><td>Clean, liquid gappers with obvious catalysts</td></tr>' +
            '<tr><td>15 min</td><td>Fewer, filtered</td><td>Medium</td><td>Choppier names, slower traders</td></tr>' +
            '<tr><td>30 min</td><td>Few, late</td><td>Wide</td><td>Indexes/ETFs, trend days, part-time traders</td></tr>' +
            '</tbody></table></div>' +
            '<div class="callout warn>PLACEHOLDER2</div>'
        },
        {
          title: 'Stop placement & exits',
          html:
            '<p>The range defines failure. Choose one stop model before entry and never widen it:</p>' +
            '<ul>' +
            '<li><strong>Stop A — range midpoint.</strong> Tighter risk, bigger size, more shakeouts. Suits break-and-retest entries.</li>' +
            '<li><strong>Stop B — beyond the opposite range extreme.</strong> The textbook invalidation: if a long breakout trades back below the <em>low</em> of the range, the breakout thesis is simply wrong. Fewer stop-outs, wider risk, smaller size.</li>' +
            '</ul>' +
            orbExitSvg() +
            '<p><strong>Exits:</strong> take half at +1R and move the stop to breakeven — the trade can no longer lose. The second target is the <strong>measured move</strong>: range size projected from the breakout level. Past that, trail the remainder under each new 5-minute higher low (or the 9 EMA) and let a trend day pay. <strong>Time stop:</strong> if the breakout hasn’t reached +1R within 15–20 minutes, momentum failed — scratch it. Most good ORBs work almost immediately.</p>'
        },
        {
          title: 'Position sizing & risk',
          html:
            '<p>Size from the stop distance, never from a fixed share count. With a $30,000 account risking 1% ($300):</p>' +
            '<div class="callout info>PLACEHOLDER3</div>' +
            '<ul>' +
            '<li>Entry 25.85, stop 25.50 → risk/share $0.35 → <span class="mono">floor(300 / 0.35) = 857 shares</span> (~$22,150 position — fits a cash account).</li>' +
            '<li>Entry 122.48, stop 122.00 → risk/share $0.48 → <span class="mono">floor(300 / 0.48) = 625 shares</span> (~$76,550 — needs margin; still inside typical 4× intraday buying power of $120,000).</li>' +
            '</ul>' +
            '<p>If the computed position exceeds your buying power, the buying power caps the size — accept the smaller dollar risk rather than widening the stop or skipping the sizing math. First 30 minutes = highest volatility of the day: many ORB traders run 0.5–0.75% risk here and reserve full 1% for A+ setups only.</p>'
        },
        {
          title: 'Worked example',
          html:
            '<p><strong>Setup.</strong> NVDA gaps up 3.2% after raising full-year guidance. Pre-market volume 8M shares (RVOL ≈ 3), price ~$122, spread $0.02. Nothing overhead on the daily until 126. Every setup box ticks.</p>' +
            '<ol>' +
            '<li><strong>9:30–9:35.</strong> First candle prints high <span class="mono">122.40</span>, low <span class="mono">121.60</span> — an $0.80 range. Plan: long over 122.40; stop at range midpoint 122.00; measured target 123.20.</li>' +
            '<li><strong>9:41.</strong> A 1-minute candle closes at 122.48 above the range high on a volume spike. Entry <span class="mono">122.48</span>. Risk/share = 122.48 − 122.00 = <span class="mono">$0.48</span>. Size = floor($300 / $0.48) = <strong>625 shares</strong>.</li>' +
            '<li><strong>9:48.</strong> Price tags +1R at <span class="mono">122.96</span>. Sell 313 shares: 313 × $0.48 = <strong>+$150.24</strong>. Stop on the remaining 312 moves to breakeven (122.48).</li>' +
            '<li><strong>10:05.</strong> The push through the 123.20 measured level stalls at 123.38; trailing under the 5-min higher low exits the last 312 shares at <span class="mono">123.35</span>: 312 × $0.87 = <strong>+$271.44</strong>.</li>' +
            '</ol>' +
            '<p><strong>Result:</strong> +$150.24 + $271.44 − $2.00 fees = <strong>+$419.68</strong>, about <strong>+1.4R</strong> against the $300 planned risk, in 24 minutes. The same trade with a failed breakout would have lost $300 + fees — which is why the 1:2 potential (full measured move ≈ +1.7R on the back half) justifies the attempt.</p>'
        },
        {
          title: 'Common mistakes',
          html:
            '<ul>' +
            '<li><strong>Entering inside the range.</strong> Anticipating the break turns a defined trade into a coin flip. <em>Fix: no order exists until the level breaks.</em></li>' +
            '<li><strong>Trading news-less gaps.</strong> A gap without a catalyst is somebody’s exit. <em>Fix: read the actual headline before the open, every time.</em></li>' +
            '<li><strong>Chasing the third candle.</strong> Entering 1R above the breakout level wrecks the math. <em>Fix: if the move left without you, wait for the retest or skip.</em></li>' +
            '<li><strong>Ignoring volume at the break.</strong> Low-volume breakouts are where the false ones live. <em>Fix: demand an obvious expansion versus the prior candles.</em></li>' +
            '<li><strong>Widening the stop “because it looks strong”.</strong> The range defined failure before entry; moving it converts small losses into large ones. <em>Fix: stop orders live in the platform, not in your head.</em></li>' +
            '<li><strong>Trading every gapper on the scanner.</strong> Focus beats coverage. <em>Fix: rank pre-market, trade only the top one or two names.</em></li>' +
            '</ul>'
        },
        {
          title: 'When NOT to trade it',
          html:
            '<ul>' +
            '<li><strong>Sideways index days.</strong> When SPY/QQQ open inside yesterday’s value with no catalyst, breakouts across the board lose follow-through.</li>' +
            '<li><strong>Major data at 10:00 ET</strong> (ISM, consumer sentiment) or Fed speakers mid-morning — the range gets invalidated by the news, not by price discovery.</li>' +
            '<li><strong>Tiny opening ranges.</strong> A sub-0.3% range means the auction never disagreed; the “breakout” is noise. Wait for the 15-minute range instead.</li>' +
            '<li><strong>Halt-prone low floats.</strong> A halt through your stop turns 1R into 4R of slippage. Leave sub-10M floats to specialists.</li>' +
            '<li><strong>OPEX Fridays and half-days</strong>, when opening flows are dominated by options mechanics rather than directional conviction.</li>' +
            '</ul>'
        },
        {
          title: 'Quick reference',
          html:
            '<div class="table-wrap"><table class="table"><tbody>' +
            '<tr><th>Scan</th><td>Gap ≥ 2% + catalyst, RVOL ≥ 2, $5–500, spread ≤ 0.1%</td></tr>' +
            '<tr><th>Range</th><td>High/low of first 5-min candle (15/30-min variants for chop)</td></tr>' +
            '<tr><th>Trigger</th><td>Candle CLOSES outside range on expanding volume; or break-and-retest hold</td></tr>' +
            '<tr><th>Stop</th><td>Range midpoint (tight) or beyond opposite extreme (full)</td></tr>' +
            '<tr><th>Targets</th><td>Half at +1R → stop to breakeven; rest at measured move (± trail 9 EMA)</td></tr>' +
            '<tr><th>Time stop</th><td>No +1R within 15–20 min → scratch</td></tr>' +
            '<tr><th>Size</th><td>floor(account × risk% ÷ stop distance), capped by buying power</td></tr>' +
            '<tr><th>Window</th><td>9:30–10:30 ET only</td></tr>' +
            '</tbody></table></div>'
        }
      ]
    },

    /* ============================ PULLBACK ============================ */
    {
      id: 'pullback',
      name: 'Pullback Trading',
      short: 'Pullback',
      icon: 'trend',
      tagline: 'Join an established intraday trend at a discount instead of chasing its highs.',
      difficulty: 'Intermediate',
      timeframe: '5-min charts (2-min for timing)',
      bestTime: '9:45–11:30 ET',
      riskReward: '1:2 – 1:3',
      markets: 'Trending large-caps / ETFs',
      overview:
        '<h2>Why this works</h2>' +
        '<p>Strong intraday trends are driven by institutions working large orders over hours — they cannot buy everything at once, so trends move in <strong>impulse legs</strong> followed by shallow rests where early longs take profit. Each orderly pullback into a rising moving average or VWAP is where that resting institutional bid tends to reload. Buying there means entering <em>with</em> the dominant flow but at a far better price — and with a far tighter stop — than chasing the highs.</p>' +
            '<p>The skill is qualification: a pullback trade is only as good as the trend it joins. Most failed pullback trades were actually failed <em>trends</em> that should never have qualified.</p>' +
        '<div class="callout info>PLACEHOLDER4</div>',
      sections: [
        {
          title: 'How it works',
          html:
            '<p>First qualify the trend, then wait for the rest, then join on the resumption. Never buy a falling knife into support — the entry trigger is price turning back <em>up</em>, not price being low.</p>' +
            pullbackSetupSvg() +
            '<p>A healthy trend for this playbook: price above a rising 9 EMA, which is above a rising 20 EMA, which is above VWAP; each push makes a higher high and each rest a higher low; volume expands on pushes and dries up on rests. When any of those breaks — a lower low, price losing VWAP, volume expanding on the pullback — the trend is no longer qualified and the setup is void.</p>'
        },
        {
          title: 'Setup criteria',
          html:
            '<ul>' +
            '<li><strong>An impulse worth joining:</strong> a clear directional leg of at least ~1% (or 2+ ATR of the 5-min chart) on expanding volume, ideally born from the open or a catalyst.</li>' +
            '<li><strong>Structure intact:</strong> higher highs and higher lows (inverted for shorts); price on the right side of both the 20 EMA and VWAP.</li>' +
            '<li><strong>An orderly pullback:</strong> 2–4 candles, small bodies, <em>declining</em> volume — profit-taking, not distribution. Sharp high-volume reversals are exits, not entries.</li>' +
            '<li><strong>A confluence zone to lean on:</strong> rising 20 EMA, VWAP, prior breakout level or the 38–62% retracement of the impulse — two or more lining up is the A+ version.</li>' +
            '<li><strong>Liquidity:</strong> average daily volume ≥ 2M shares, spread ≤ $0.03–0.05. This is a large-cap playbook.</li>' +
            '<li><strong>Index agreement:</strong> the trade fights uphill when SPY is trending hard the other way.</li>' +
            '</ul>' +
            pullbackZonesSvg()
        },
        {
          title: 'Entry rules',
          html:
            '<ol>' +
            '<li><strong>Reversal-candle entry (standard).</strong> In the confluence zone, wait for a candle that rejects lower prices — a hammer, a bullish engulfing bar, or any bar that closes back above the 9 EMA. Enter a few cents above the high of that candle. No reversal candle, no trade.</li>' +
            '<li><strong>Pullback-high break (conservative).</strong> Enter only when price takes out the high of the entire pullback structure, confirming the trend has resumed. Later entry, higher win rate, slightly worse price.</li>' +
            '<li><strong>First-touch rule.</strong> The first pullback to the 20 EMA/VWAP after a fresh impulse is the highest-quality touch. Third and fourth touches degrade fast — by then the trend is aging.</li>' +
            '</ol>' +
            '<div class="callout warn>PLACEHOLDER5</div>'
        },
        {
          title: 'Stop placement & exits',
          html:
            '<ul>' +
            '<li><strong>Initial stop:</strong> a few cents below the pullback low (the swing low that just held). If the zone truly held, that low should not trade again. Structure-based, never dollar-based.</li>' +
            '<li><strong>Target 1 — the prior high:</strong> take a third to a half there and move the stop to breakeven.</li>' +
            '<li><strong>Target 2 — the measured move:</strong> the impulse leg’s length projected from the pullback low; or simply trail.</li>' +
            '<li><strong>Trail the rest</strong> under each successive 5-min higher low (or the 20 EMA for slower trends). The last piece is the trend-day lottery ticket — let the market close it.</li>' +
            '<li><strong>Void rule:</strong> if the entry candle’s low breaks before the trade reaches +1R, the resumption failed — exit even if the hard stop hasn’t hit.</li>' +
            '</ul>'
        },
        {
          title: 'Position sizing & risk',
          html:
            '<p>Same fixed-fraction engine as every playbook — $30,000 account, 1% = $300 risk:</p>' +
            '<ul>' +
            '<li>Entry 162.10, stop 161.50 → risk/share $0.60 → <span class="mono">floor(300 / 0.60) = 500 shares</span> (~$81,050 position — margin, inside 4× buying power).</li>' +
            '<li>Because pullback stops hide behind structure, stop distance varies trade to trade; the share count must vary with it. Same $300 risk with a $0.30 stop = 1,000 shares; with a $1.20 stop = 250 shares.</li>' +
            '</ul>' +
            '<p>Pullbacks in the 9:45–11:30 window can carry full 1% risk — the open’s chaos has resolved and structure is readable. Cut risk to 0.5% for counter-index trades or third-touch entries.</p>'
        },
        {
          title: 'Worked example',
          html:
            '<p><strong>Setup.</strong> AMD reports strong guidance and drives from 160.20 to 163.00 in the first 25 minutes on triple RVOL — a 2.8-point impulse, higher highs and higher lows, price above rising 9/20 EMAs and VWAP.</p>' +
            '<ol>' +
            '<li><strong>10:02.</strong> Profit-taking begins: three small red 5-min candles drift from 163.00 back to 161.90 on shrinking volume — a 39% retrace of the impulse, landing right on the rising 20 EMA with VWAP just beneath.</li>' +
            '<li><strong>10:17.</strong> A hammer prints: low <span class="mono">161.55</span>, close 161.95, holding the average. Plan: entry over its high at <span class="mono">162.10</span>, stop under the pullback low at <span class="mono">161.50</span> (risk $0.60), T1 at the prior high 163.00, T2 at the measured move 164.35.</li>' +
            '<li><strong>10:21.</strong> Entry fills at 162.10. Size = floor(300 / 0.60) = <strong>500 shares</strong>.</li>' +
            '<li><strong>10:34.</strong> Prior high tags: sell 250 at <span class="mono">163.00</span> → 250 × $0.90 = <strong>+$225.00</strong>. Stop to breakeven.</li>' +
            '<li><strong>11:05.</strong> The trend grinds on; trailing under 5-min higher lows exits the last 250 at <span class="mono">163.70</span> → 250 × $1.60 = <strong>+$400.00</strong>.</li>' +
            '</ol>' +
            '<p><strong>Result:</strong> +$225.00 + $400.00 − $2.00 fees = <strong>+$623.00 ≈ +2.1R</strong>. The stop was 44 minutes of exposure away from a −$300 outcome — that asymmetry, repeated, is the entire business.</p>'
        },
        {
          title: 'Common mistakes',
          html:
            '<ul>' +
            '<li><strong>Buying the dip in a downtrend.</strong> A pullback requires a qualified uptrend; below VWAP there is nothing to pull back <em>to</em>. <em>Fix: qualification checklist first, entry pattern second.</em></li>' +
            '<li><strong>Entering while price still falls.</strong> Catching knives at the EMA is hope, not confluence. <em>Fix: the reversal candle plus its high breaking is the trigger.</em></li>' +
            '<li><strong>Stops at the obvious tick.</strong> Placing the stop exactly at the EMA or the round number gets swept. <em>Fix: behind the swing low, plus a few cents of slack.</em></li>' +
            '<li><strong>Taking the fourth touch like the first.</strong> Late-trend touches fail disproportionately. <em>Fix: count the touches; after two, demand extra confluence or pass.</em></li>' +
            '<li><strong>Full size against the index.</strong> The stock rarely outruns a hard SPY sell-off for long. <em>Fix: halve risk or wait for the index to at least flatten.</em></li>' +
            '<li><strong>Confusing a reversal for a pullback.</strong> Expanding volume on the way down, a lower low, VWAP loss — that is distribution. <em>Fix: any structure break voids the setup instantly.</em></li>' +
            '</ul>'
        },
        {
          title: 'When NOT to trade it',
          html:
            '<ul>' +
            '<li><strong>Range-bound days.</strong> No impulse, no trend, nothing to join — pullback logic in a range produces entries at the middle, the worst location.</li>' +
            '<li><strong>Lunch hours (11:30–14:00 ET).</strong> Volume dries up; “pullbacks” drift forever without resuming. The playbook’s stats live in the morning.</li>' +
            '<li><strong>Into scheduled news.</strong> A perfect flag five minutes before FOMC is a coin flip with extra steps.</li>' +
            '<li><strong>Parabolic extensions.</strong> After a vertical move far above the 9 EMA, the first “pullback” is usually the start of the unwind — let the first touch prove itself.</li>' +
            '<li><strong>Thin or halt-prone names</strong> where the swing-low stop can gap.</li>' +
            '</ul>'
        },
        {
          title: 'Quick reference',
          html:
            '<div class="table-wrap"><table class="table"><tbody>' +
            '<tr><th>Qualify</th><td>Impulse ≥ ~1% on volume; HH/HL; above rising 9/20 EMA + VWAP</td></tr>' +
            '<tr><th>Pullback</th><td>2–4 candles, shrinking volume, into 20 EMA / VWAP / 38–62% zone</td></tr>' +
            '<tr><th>Trigger</th><td>Reversal candle at the zone → enter over its high</td></tr>' +
            '<tr><th>Stop</th><td>Below pullback low (structure, not dollars)</td></tr>' +
            '<tr><th>Targets</th><td>1/2 at prior high → breakeven stop; rest to measured move / trail</td></tr>' +
            '<tr><th>Void</th><td>Entry candle low breaks pre-1R; or any structure break</td></tr>' +
            '<tr><th>Size</th><td>floor(account × risk% ÷ stop distance)</td></tr>' +
            '<tr><th>Window</th><td>9:45–11:30 ET; first touch after the impulse is best</td></tr>' +
            '</tbody></table></div>'
        }
      ]
    },

    /* ============================ SCALPING ============================ */
    {
      id: 'scalping',
      name: 'Scalping',
      short: 'Scalp',
      icon: 'target',
      tagline: 'Harvest many small, fast moves at key levels — execution and discipline as the edge.',
      difficulty: 'Advanced',
      timeframe: '1-min / tick charts',
      bestTime: '9:30–11:00 & 15:00–16:00 ET',
      riskReward: '1:1 – 1:1.5, high frequency',
      markets: 'Ultra-liquid large-caps / ETFs',
      overview:
        '<h2>Why this works</h2>' +
        '<p>At well-watched intraday levels — VWAP, the prior day’s high/low, round numbers, the pre-market high — short-term order flow becomes briefly predictable: stops cluster just beyond the level and breakout/fade algorithms react to it. A scalper positions at the level with a tiny stop, takes the first burst of movement, and is flat before the market has time to change its mind.</p>' +
        '<p>The economics are inverted versus swing styles: the win rate must be high (55–65%+) because winners are small. That makes <strong>execution costs, spreads and discipline</strong> the real edge — a scalper who hesitates, or trades a wide-spread name, has negative expectancy before the chart even matters. This is the most demanding playbook in the library; trade it in a simulator until the numbers prove otherwise.</p>' +
        '<div class="callout info>PLACEHOLDER6</div>',
      sections: [
        {
          title: 'How it works',
          html:
            '<p>Scalps are built on two repeating patterns at high-traffic levels:</p>' +
            '<ul>' +
            '<li><strong>The hold (fade):</strong> price approaches a level on <em>declining</em> momentum, the level holds, and price snaps back — e.g. an extended stock fading into VWAP that gets bought the moment sellers exhaust.</li>' +
            '<li><strong>The reclaim/break (momentum):</strong> price flips through a level on <em>accelerating</em> tape — volume bursts, the spread tightens, prints hit the offer — and the trapped side fuels a fast 20–40 cent burst.</li>' +
            '</ul>' +
            scalpSetupSvg() +
            '<p>Either way the trade has one premise: the level. The moment price trades meaningfully back through it, the premise is gone, and so is the position — usually within seconds.</p>'
        },
        {
          title: 'Setup criteria',
          html:
            '<ul>' +
            '<li><strong>Only ultra-liquid names:</strong> average volume ≥ 5M shares/day, penny-wide spreads ($0.01–0.02). SPY, QQQ and the megacaps are the natural habitat.</li>' +
            '<li><strong>Price $20–500</strong> so a 10–20 cent move is a meaningful fraction of risk.</li>' +
            '<li><strong>A pre-marked level:</strong> VWAP, PDH/PDL, pre-market high/low, whole/half dollars, yesterday’s close. Levels are marked before the open — scalps are never improvised on unmarked ground.</li>' +
            '<li><strong>Active tape:</strong> RVOL ≥ 1.5 (≥ 1 acceptable on megacaps), real two-sided prints. Dead tape = spreads eat the edge.</li>' +
            '<li><strong>Direct, fast order entry with hotkeys.</strong> Mouse-and-menu order tickets disqualify the strategy.</li>' +
            '<li><strong>Commission structure that survives frequency</strong> — per-share pricing or free executions; know your round-trip cost per 100 shares to the cent.</li>' +
            '</ul>'
        },
        {
          title: 'Entry rules',
          html:
            '<ol>' +
            '<li><strong>Level hold:</strong> price tags the level, momentum stalls (smaller candles, volume fading), and the first bar closes back away from it. Enter on that close, stop just beyond the level.</li>' +
            '<li><strong>Level reclaim:</strong> price loses the level then snaps back through it within a bar or two on a volume burst — the failed move traps the breakout sellers. Enter on the reclaim print.</li>' +
            '<li><strong>Momentum burst:</strong> tight 1-min consolidation near session highs breaks on accelerating tape. Enter the break, exit into the very next extension — no waiting for “confirmation candles”.</li>' +
            '</ol>' +
            '<p>All three share the same constraint: the fill must be <em>at</em> the level. If the entry would be more than a few cents late, the risk/reward is already gone — skip and wait for the next rotation.</p>'
        },
        {
          title: 'Stop placement & exits',
          html:
            '<ul>' +
            '<li><strong>Fixed structural stop, $0.10–0.20</strong> just beyond the level (wider only if the instrument’s 1-min noise demands it — then size down accordingly). The stop is placed with the entry order.</li>' +
            '<li><strong>First target +0.15 to +0.25:</strong> half off, stop to breakeven. The trade is now free.</li>' +
            '<li><strong>Second exit</strong> into the next level or momentum stall, typically +0.30–0.50. Scalps do not become swing trades.</li>' +
            '<li><strong>Time exit:</strong> if the trade does nothing within 1–2 minutes, scratch it. Right ideas work immediately at these timeframes.</li>' +
            '</ul>' +
            scalpRiskSvg()
        },
        {
          title: 'Position sizing & risk',
          html:
            '<p>Scalps risk <strong>0.25–0.5%</strong> per attempt (frequency replaces size). $30,000 account at 0.5% = $150 risk:</p>' +
            '<ul>' +
            '<li>Entry 161.02, stop 160.87 → risk/share $0.15 → raw size floor(150 / 0.15) = 1,000 shares (~$161,000).</li>' +
            '<li><strong>Buying power caps it first:</strong> 4× margin on $30,000 = $120,000 → max ≈ 745 shares. Trading 700 shares keeps cushion; actual risk = 700 × $0.15 = <strong>$105</strong>.</li>' +
            '</ul>' +
            '<p>That cap is normal for scalping — tight stops on high-priced stocks almost always hit the buying-power wall before the risk wall. Accept the smaller risk; never widen the stop to “use” the full risk budget. And because losses arrive in bursts, the daily circuit breaker (−1.5% or three consecutive losers) is part of the sizing model, not an afterthought.</p>'
        },
        {
          title: 'Worked example',
          html:
            '<p><strong>Setup.</strong> AMD, mid-morning. After an opening drive, price fades to VWAP at <span class="mono">160.90</span> on shrinking volume — a textbook first VWAP touch on a strong stock. Spread is $0.01, tape active.</p>' +
            '<ol>' +
            '<li><strong>10:12:30.</strong> Two 1-min candles hold VWAP; sellers slow. The fade trendline breaks and prints start hitting the offer. Entry <span class="mono">161.02</span>, stop <span class="mono">160.87</span> (−$0.15), first target +0.20.</li>' +
            '<li><strong>Sizing.</strong> Raw: floor(150 / 0.15) = 1,000 shares. Buying power ($120,000 / 161.02 ≈ 745) caps it → trade <strong>700 shares</strong>, actual risk $105.</li>' +
            '<li><strong>10:13:40.</strong> +0.20 prints at <span class="mono">161.22</span>: sell 350 → 350 × $0.20 = <strong>+$70.00</strong>. Stop to breakeven.</li>' +
            '<li><strong>10:15:10.</strong> Momentum stalls under the half-dollar 161.50; final 350 out at <span class="mono">161.34</span> → 350 × $0.32 = <strong>+$112.00</strong>.</li>' +
            '</ol>' +
            '<p><strong>Result:</strong> +$70.00 + $112.00 − $2.80 fees = <strong>+$179.20 ≈ +1.7R</strong> on $105 risked, exposure under three minutes. A scalper’s day is ten to twenty of these attempts where the losers are −$105 and the discipline never varies.</p>'
        },
        {
          title: 'Common mistakes',
          html:
            '<ul>' +
            '<li><strong>Scalping wide-spread names.</strong> A $0.06 spread on a $0.15 stop is a 40% tax per attempt. <em>Fix: penny-wide instruments only — the universe is small on purpose.</em></li>' +
            '<li><strong>Letting a scalp “become a day trade”.</strong> Refusing the small stop and holding is how one trade erases twenty. <em>Fix: the stop executes mechanically; no second thoughts inside the trade.</em></li>' +
            '<li><strong>Overtrading dead tape.</strong> Lunch-hour scalps donate the morning’s profits back in spreads and chop. <em>Fix: trade the open and the close; stand down in between.</em></li>' +
            '<li><strong>Ignoring cumulative fees.</strong> Forty round trips a day is real money even at per-share rates. <em>Fix: track net-of-fees P/L per attempt weekly; if it is negative, stop and fix costs first.</em></li>' +
            '<li><strong>Revenge sizing after two stops.</strong> Doubling size to “get it back” meets the third loss at maximum exposure. <em>Fix: the circuit breaker is hard-coded: three consecutive losers = done.</em></li>' +
            '<li><strong>Trading without hotkeys</strong> (or with untested ones). <em>Fix: rehearse entries/exits/flatten in the simulator until they are reflexes.</em></li>' +
            '</ul>'
        },
        {
          title: 'When NOT to trade it',
          html:
            '<ul>' +
            '<li><strong>11:30–14:00 ET.</strong> The lunch chop is where scalping accounts go to die — spreads widen relative to movement and every burst mean-reverts.</li>' +
            '<li><strong>Straight into scheduled releases.</strong> Holding a scalp through 10:00 data or 14:00 FOMC is gambling with 100× your intended risk.</li>' +
            '<li><strong>When you are tilted, tired, or forcing.</strong> Scalping compounds emotional state faster than any other style — the circuit breaker exists because everyone eventually needs it.</li>' +
            '<li><strong>On unfamiliar platforms or slow connections.</strong> A 500 ms delay is disqualifying at this timeframe.</li>' +
            '<li><strong>When the weekly net-of-fees stats are negative.</strong> That is data, not noise: back to the simulator, adjust, re-verify.</li>' +
            '</ul>'
        },
        {
          title: 'Quick reference',
          html:
            '<div class="table-wrap"><table class="table"><tbody>' +
            '<tr><th>Universe</th><td>Avg vol ≥ 5M/day, spread $0.01–0.02, price $20–500</td></tr>' +
            '<tr><th>Levels</th><td>VWAP, PDH/PDL, pre-market H/L, round numbers — marked pre-open</td></tr>' +
            '<tr><th>Triggers</th><td>Level hold / level reclaim / momentum burst — fill AT the level</td></tr>' +
            '<tr><th>Stop</th><td>Fixed $0.10–0.20 beyond the level, placed with the entry</td></tr>' +
            '<tr><th>Targets</th><td>Half at +0.15–0.25 → breakeven; rest to next level; 1–2 min time exit</td></tr>' +
            '<tr><th>Risk</th><td>0.25–0.5% per attempt; buying power usually caps size first</td></tr>' +
            '<tr><th>Breaker</th><td>3 consecutive losers or −1.5% day = flat, done</td></tr>' +
            '<tr><th>Window</th><td>9:30–11:00 & 15:00–16:00 ET</td></tr>' +
            '</tbody></table></div>'
        }
      ]
    }
  ];

  /* Fill the callouts (kept out of the big literals to keep quotes simple) */
  var CALLOUTS = {
    PLACEHOLDER:
      '<div class="callout info"><div><b>The edge in one line.</b> A catalyst-driven gap + double volume + a confirmed range break = trapped traders on the wrong side who must exit into your position. Without all three ingredients there is no trap, and no trade.</div></div>',
    PLACEHOLDER2:
      '<div class="callout warn"><div><b>The first breakout attempt fails roughly as often as it works.</b> That is not a flaw — the stop is designed for it, and the break-and-retest entry exists precisely to let the failures reveal themselves first.</div></div>',
    PLACEHOLDER3:
      '<div class="callout info"><div><b>Formula.</b> <span class="mono">shares = floor((account × risk%) ÷ (entry − stop))</span>. The Tools section has a live calculator for this.</div></div>',
    PLACEHOLDER4:
      '<div class="callout info"><div><b>The edge in one line.</b> Institutions buy trends in installments; an orderly pullback into a rising 20 EMA / VWAP is where the next installment tends to land — enter with it, risk the swing low.</div></div>',
    PLACEHOLDER5:
      '<div class="callout warn"><div><b>The pattern is the last check, not the first.</b> A perfect hammer in an unqualified trend is a losing trade with good aesthetics. Qualification order: trend → location → volume behavior → entry candle.</div></div>',
    PLACEHOLDER6:
      '<div class="callout info"><div><b>The edge in one line.</b> Stops and algos cluster at obvious levels; being positioned there with a 15-cent stop and no hesitation converts that crowding into dozens of small, repeatable wins.</div></div>'
  };
  window.STRATEGY_DATA.forEach(function (s) {
    Object.keys(CALLOUTS).forEach(function (k) {
      var token = '<div class="callout info>' + k + '</div>';
      var tokenWarn = '<div class="callout warn>' + k + '</div>';
      if (s.overview.indexOf(token) !== -1) s.overview = s.overview.replace(token, CALLOUTS[k]);
      s.sections.forEach(function (sec) {
        if (sec.html.indexOf(token) !== -1) sec.html = sec.html.replace(token, CALLOUTS[k]);
        if (sec.html.indexOf(tokenWarn) !== -1) sec.html = sec.html.replace(tokenWarn, CALLOUTS[k]);
      });
    });
  });
})();
