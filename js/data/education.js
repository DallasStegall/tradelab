/* ==========================================================================
   TradeLab — Education Hub data (js/data/education.js)
   Pure data: window.EDUCATION_DATA. Rendered by js/app.js (renderEducationDetail).
   All SVG colors via CSS variables (theme + print safe).
   ========================================================================== */
(function () {
  'use strict';

  /* ---------- SVG helpers (run once at load) ---------- */

  function candle(cx, o, h, l, c, sy, bw) {
    bw = bw || 14;
    var col = c >= o ? 'var(--pos)' : 'var(--neg)';
    var top = sy(Math.max(o, c));
    var bot = sy(Math.min(o, c));
    var bh = Math.max(2, bot - top);
    return '<line x1="' + cx + '" y1="' + sy(h).toFixed(1) + '" x2="' + cx + '" y2="' + sy(l).toFixed(1) +
      '" stroke="' + col + '" stroke-width="1.5"/>' +
      '<rect x="' + (cx - bw / 2) + '" y="' + top.toFixed(1) + '" width="' + bw + '" height="' + bh.toFixed(1) + '" rx="1.5" fill="' + col + '"/>';
  }

  function txt(x, y, s, opts) {
    opts = opts || {};
    return '<text x="' + x + '" y="' + y + '" font-size="' + (opts.size || 12) +
      '" fill="' + (opts.fill || 'var(--ink-2)') + '"' +
      (opts.anchor ? ' text-anchor="' + opts.anchor + '"' : '') +
      (opts.weight ? ' font-weight="' + opts.weight + '"' : '') + '>' + s + '</text>';
  }

  function hline(x1, x2, y, color, dash, w) {
    return '<line x1="' + x1 + '" y1="' + y.toFixed(1) + '" x2="' + x2 + '" y2="' + y.toFixed(1) +
      '" stroke="' + color + '" stroke-width="' + (w || 1.5) + '"' + (dash ? ' stroke-dasharray="6 4"' : '') + '/>';
  }

  function wrapSvg(inner, caption, h, vb) {
    return '<div class="diagram"><svg viewBox="0 0 ' + (vb || 760) + ' ' + (h || 360) +
      '" xmlns="http://www.w3.org/2000/svg" role="img">' + inner + '</svg>' +
      (caption ? '<div class="diagram-caption">' + caption + '</div>' : '') + '</div>';
  }

  /* Mini pattern chart used by the candlestick gallery. cs = [[o,h,l,c],...] */
  function miniPattern(cs) {
    var W = 220, H = 130, padX = 18, padY = 12;
    var lo = Infinity, hi = -Infinity;
    cs.forEach(function (c) { if (c[2] < lo) lo = c[2]; if (c[1] > hi) hi = c[1]; });
    if (hi === lo) hi = lo + 1;
    var band = (W - padX * 2) / cs.length;
    var sy = function (p) { return padY + (1 - (p - lo) / (hi - lo)) * (H - padY * 2); };
    var out = '';
    cs.forEach(function (c, i) {
      out += candle(padX + band * i + band / 2, c[0], c[1], c[2], c[3], sy, Math.min(13, band * 0.55));
    });
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" role="img" style="width:100%;max-width:190px;height:auto;display:block;margin:0 auto">' + out + '</svg>';
  }

  /* ---------- ta-basics diagrams ---------- */

  function srFlipSvg() {
    var sy = function (p) { return 300 - (p - 96) * 30; };
    var lvl = sy(102);
    var s = '';
    s += hline(60, 700, lvl, 'var(--accent)', true, 2);
    s += txt(704, lvl + 4, '102.00', { anchor: 'start', size: 11.5, fill: 'var(--accent)', weight: 600 });
    /* price path: two rejections, break, retest, go */
    var pts = [
      [60, 97.5], [110, 100.2], [150, 101.9], [185, 100.3], [225, 99.0],
      [265, 101.8], [300, 100.6], [340, 99.6], [385, 101.2], [430, 103.2],
      [470, 104.3], [510, 103.4], [545, 102.15], [590, 103.8], [650, 105.6], [700, 106.4]
    ];
    var d = '';
    pts.forEach(function (p, i) { d += (i ? 'L' : 'M') + p[0] + ',' + sy(p[1]).toFixed(1); });
    s += '<path d="' + d + '" fill="none" stroke="var(--chart-1)" stroke-width="2.2" stroke-linejoin="round"/>';
    /* touch markers */
    [[150, 101.9], [265, 101.8], [545, 102.15]].forEach(function (p) {
      s += '<circle cx="' + p[0] + '" cy="' + sy(p[1]).toFixed(1) + '" r="5" fill="none" stroke="var(--chart-3)" stroke-width="2.5"/>';
    });
    s += txt(150, sy(101.9) - 14, 'Rejection 1', { anchor: 'middle', size: 11, fill: 'var(--ink-3)' });
    s += txt(265, sy(101.8) - 14, 'Rejection 2', { anchor: 'middle', size: 11, fill: 'var(--ink-3)' });
    s += txt(430, sy(103.2) - 14, 'Break on volume', { anchor: 'middle', size: 11.5, fill: 'var(--pos-text)', weight: 600 });
    s += txt(545, sy(102.15) + 24, 'Retest: old resistance = new support', { anchor: 'middle', size: 11.5, fill: 'var(--accent)', weight: 600 });
    s += txt(70, sy(97.5) - 10, 'Resistance while below…', { size: 11, fill: 'var(--ink-3)' });
    s += txt(690, sy(106.4) + 16, '…support once above', { anchor: 'end', size: 11, fill: 'var(--ink-3)' });
    return wrapSvg(s, 'Role reversal: a level that rejects price twice becomes support after a high-volume break. The retest is the trade location — risk is measured against the level, not a feeling.', 330);
  }

  function structureSvg() {
    var sy = function (p) { return 310 - (p - 50) * 42; };
    var pts = [
      [70, 50.8, ''], [150, 53.0, 'HH'], [215, 51.9, 'HL'], [300, 54.4, 'HH'],
      [365, 53.2, 'HL'], [455, 55.9, 'HH'], [520, 54.6, 'HL'], [610, 56.6, 'HH'], [690, 55.9, '']
    ];
    var s = '', d = '';
    pts.forEach(function (p, i) { d += (i ? 'L' : 'M') + p[0] + ',' + sy(p[1]).toFixed(1); });
    s += '<path d="' + d + '" fill="none" stroke="var(--chart-1)" stroke-width="2.2" stroke-linejoin="round"/>';
    pts.forEach(function (p) {
      if (!p[2]) return;
      var isH = p[2] === 'HH';
      s += '<circle cx="' + p[0] + '" cy="' + sy(p[1]).toFixed(1) + '" r="4.5" fill="' + (isH ? 'var(--pos)' : 'var(--chart-3)') + '" stroke="var(--surface)" stroke-width="2"/>';
      s += txt(p[0], sy(p[1]) + (isH ? -12 : 22), p[2], { anchor: 'middle', size: 11.5, weight: 600, fill: isH ? 'var(--pos-text)' : 'var(--ink-2)' });
    });
    /* trendline under the HLs */
    s += '<line x1="180" y1="' + (sy(51.55)).toFixed(1) + '" x2="620" y2="' + (sy(55.3)).toFixed(1) + '" stroke="var(--ink-3)" stroke-width="1.5" stroke-dasharray="7 5"/>';
    s += txt(640, sy(55.4) - 4, 'Trendline: connect the higher lows', { anchor: 'end', size: 11, fill: 'var(--ink-3)' });
    s += txt(80, 40, 'Uptrend = higher highs AND higher lows. One lower low puts the trend on trial.', { size: 12, weight: 600, fill: 'var(--ink)' });
    return wrapSvg(s, 'Market structure is the trend definition that needs no indicator: rising pivots. Trade with it, and treat the first broken pivot as the warning shot.', 340);
  }

  function maSvg() {
    var sy = function (p) { return 320 - (p - 98) * 26; };
    var s = '';
    /* price path */
    var pp = [[70, 99.2], [130, 100.6], [190, 102.2], [235, 101.4], [285, 103.4], [330, 102.6], [385, 104.6], [430, 103.7], [490, 105.8], [545, 105.0], [610, 107.0], [690, 108.2]];
    var d = '';
    pp.forEach(function (p, i) { d += (i ? 'L' : 'M') + p[0] + ',' + sy(p[1]).toFixed(1); });
    s += '<path d="' + d + '" fill="none" stroke="var(--chart-1)" stroke-width="2.2" stroke-linejoin="round"/>';
    /* 9 EMA & 20 EMA smooth curves */
    s += '<path d="M70,' + sy(98.9).toFixed(1) + ' C200,' + sy(100.9).toFixed(1) + ' 320,' + sy(102.4).toFixed(1) + ' 430,' + sy(103.6).toFixed(1) +
      ' S620,' + sy(106.2).toFixed(1) + ' 690,' + sy(107.4).toFixed(1) + '" fill="none" stroke="var(--chart-3)" stroke-width="2"/>';
    s += '<path d="M70,' + sy(98.4).toFixed(1) + ' C210,' + sy(100.0).toFixed(1) + ' 330,' + sy(101.4).toFixed(1) + ' 445,' + sy(102.8).toFixed(1) +
      ' S630,' + sy(105.2).toFixed(1) + ' 690,' + sy(106.2).toFixed(1) + '" fill="none" stroke="var(--chart-4)" stroke-width="2"/>';
    s += txt(695, sy(107.4) + 3, '9 EMA', { anchor: 'start', size: 11, fill: 'var(--chart-3)', weight: 600 });
    s += txt(695, sy(106.2) + 14, '20 EMA', { anchor: 'start', size: 11, fill: 'var(--chart-4)', weight: 600 });
    /* touches */
    [[235, 101.4], [430, 103.7], [545, 105.0]].forEach(function (p) {
      s += '<circle cx="' + p[0] + '" cy="' + sy(p[1]).toFixed(1) + '" r="5" fill="none" stroke="var(--accent)" stroke-width="2.5"/>';
    });
    s += txt(430, sy(103.7) + 26, 'Pullback touches of a rising MA = trend entries', { anchor: 'middle', size: 11.5, fill: 'var(--accent)', weight: 600 });
    return wrapSvg(s, 'In a healthy trend price rides the 9 EMA and rests at the 20 EMA. Flat, tangled averages mean range conditions — MA signals stop working precisely when the lines stop sloping.', 350);
  }

  function volumeSvg() {
    var sy = function (p) { return 240 - (p - 49) * 44; };
    var s = '';
    /* left panel: breakout WITH volume */
    var csA = [
      [70, 50.0, 50.5, 49.8, 50.35], [110, 50.35, 50.6, 50.2, 50.5], [150, 50.5, 50.65, 50.3, 50.4],
      [190, 50.4, 51.5, 50.35, 51.4], [230, 51.4, 52.0, 51.2, 51.9], [270, 51.9, 52.4, 51.7, 52.3]
    ];
    csA.forEach(function (c) { s += candle(c[0], c[1], c[2], c[3], c[4], sy, 15); });
    var volsA = [16, 14, 12, 44, 36, 30];
    csA.forEach(function (c, i) {
      s += '<rect x="' + (c[0] - 8) + '" y="' + (300 - volsA[i]) + '" width="16" height="' + volsA[i] + '" rx="1" fill="' + (i === 3 ? 'var(--pos)' : 'var(--grid)') + '"/>';
    });
    s += hline(60, 290, sy(50.6), 'var(--accent)', true);
    s += txt(170, 330, 'Breakout + volume expansion = conviction', { anchor: 'middle', size: 11.5, fill: 'var(--pos-text)', weight: 600 });
    /* right panel: rally on FADING volume */
    var off = 400;
    var csB = [
      [off + 70, 50.0, 50.6, 49.9, 50.5], [off + 110, 50.5, 51.0, 50.4, 50.9], [off + 150, 50.9, 51.3, 50.8, 51.2],
      [off + 190, 51.2, 51.55, 51.1, 51.45], [off + 230, 51.45, 51.7, 51.35, 51.6], [off + 270, 51.6, 51.78, 51.5, 51.7]
    ];
    csB.forEach(function (c) { s += candle(c[0], c[1], c[2], c[3], c[4], sy, 15); });
    var volsB = [42, 34, 26, 19, 13, 8];
    csB.forEach(function (c, i) {
      s += '<rect x="' + (c[0] - 8) + '" y="' + (300 - volsB[i]) + '" width="16" height="' + volsB[i] + '" rx="1" fill="' + (i >= 4 ? 'var(--neg)' : 'var(--grid)') + '"/>';
    });
    s += txt(off + 170, 330, 'Rally on fading volume = suspect, fade-prone', { anchor: 'middle', size: 11.5, fill: 'var(--neg-text)', weight: 600 });
    s += '<line x1="360" y1="30" x2="360" y2="315" stroke="var(--border-strong)" stroke-width="1"/>';
    return wrapSvg(s, 'Volume is the polygraph: the same green candles mean opposite things depending on participation. RVOL ≥ 2 says the crowd showed up; shrinking bars into highs say the move is running on fumes.', 345);
  }

  /* ---------- candlestick anatomy + gallery ---------- */

  function anatomySvg() {
    var s = '';
    var sy = function (p) { return 40 + (108 - p) * 22; };
    /* big green candle */
    var cx = 240;
    s += '<line x1="' + cx + '" y1="' + sy(107).toFixed(1) + '" x2="' + cx + '" y2="' + sy(97).toFixed(1) + '" stroke="var(--pos)" stroke-width="2.5"/>';
    s += '<rect x="' + (cx - 30) + '" y="' + sy(104.5).toFixed(1) + '" width="60" height="' + (sy(99.5) - sy(104.5)).toFixed(1) + '" rx="3" fill="var(--pos)"/>';
    /* labels left/right */
    function tag(y, side, label, sub) {
      var x1 = side === 'l' ? cx - 34 : cx + 34;
      var x2 = side === 'l' ? 150 : 330;
      var anchor = side === 'l' ? 'end' : 'start';
      var res = '<line x1="' + x1 + '" y1="' + y.toFixed(1) + '" x2="' + x2 + '" y2="' + y.toFixed(1) + '" stroke="var(--axis)" stroke-width="1"/>';
      res += txt(side === 'l' ? x2 - 6 : x2 + 6, y + 4, label, { anchor: anchor, size: 12, weight: 600, fill: 'var(--ink)' });
      if (sub) res += txt(side === 'l' ? x2 - 6 : x2 + 6, y + 19, sub, { anchor: anchor, size: 10.5, fill: 'var(--ink-3)' });
      return res;
    }
    s += tag(sy(107), 'r', 'High', 'wick top — the buyers’ furthest reach');
    s += tag(sy(104.5), 'l', 'Close (bullish)', 'green: close above open');
    s += tag(sy(99.5), 'l', 'Open', '');
    s += tag(sy(97), 'r', 'Low', 'wick bottom — the sellers’ furthest reach');
    s += txt(cx, sy(102) + 4, 'BODY', { anchor: 'middle', size: 12, weight: 700, fill: 'var(--accent-ink)' });
    /* red mini candle for contrast */
    var cx2 = 560;
    s += '<line x1="' + cx2 + '" y1="' + sy(106).toFixed(1) + '" x2="' + cx2 + '" y2="' + sy(98).toFixed(1) + '" stroke="var(--neg)" stroke-width="2.5"/>';
    s += '<rect x="' + (cx2 - 30) + '" y="' + sy(103.5).toFixed(1) + '" width="60" height="' + (sy(100) - sy(103.5)).toFixed(1) + '" rx="3" fill="var(--neg)"/>';
    s += txt(cx2, sy(106) - 12, 'Bearish: open at top, close at bottom', { anchor: 'middle', size: 11, fill: 'var(--ink-3)' });
    s += txt(cx2, sy(96.4) + 14, 'Long wicks = rejection; big body = conviction', { anchor: 'middle', size: 11, fill: 'var(--ink-2)' });
    return wrapSvg(s, 'One candle compresses the whole auction: the body is who won, the wicks are what got rejected. Body-to-wick ratio is the fastest read of conviction vs. indecision.', 330);
  }

  var PATTERNS = [
    {
      name: 'Hammer', bias: 'bull',
      cs: [[48.2, 48.5, 47.6, 47.8], [47.8, 48.0, 47.0, 47.2], [47.2, 47.4, 46.5, 46.7], [46.7, 46.95, 45.4, 46.85]],
      read: 'After a decline, sellers push hard but the close claws back near the top — demand absorbed the flush.',
      note: 'Needs a downtrend before it and confirmation after (next candle over its high). At support/VWAP it is A-grade; mid-range it is noise.'
    },
    {
      name: 'Shooting star', bias: 'bear',
      cs: [[45.0, 45.6, 44.9, 45.5], [45.5, 46.1, 45.4, 46.0], [46.0, 46.4, 45.9, 46.3], [46.35, 47.4, 46.15, 46.2]],
      read: 'The mirror of the hammer: buyers spike price into the highs and get fully rejected into the close.',
      note: 'Strongest after an extended run into resistance. Entry is the break of its low, stop above the wick.'
    },
    {
      name: 'Doji', bias: 'neutral',
      cs: [[46.8, 47.2, 46.5, 47.1], [47.1, 47.5, 46.9, 47.4], [47.4, 47.9, 46.9, 47.42]],
      read: 'Open and close nearly equal — a stand-off. Neither side won the auction.',
      note: 'Not a signal by itself; it marks hesitation. A doji at a key level often precedes the real move — trade the break of its range.'
    },
    {
      name: 'Bullish engulfing', bias: 'bull',
      cs: [[48.0, 48.2, 47.3, 47.5], [47.5, 47.7, 46.9, 47.0], [47.0, 47.3, 46.5, 46.6], [46.5, 47.6, 46.4, 47.5]],
      read: 'A green body swallows the prior red body whole — buyers reversed everything the sellers did, and more.',
      note: 'The engulfed body matters, not the wicks. More reliable on the second candle’s volume expansion.'
    },
    {
      name: 'Bearish engulfing', bias: 'bear',
      cs: [[45.6, 45.9, 45.4, 45.8], [45.8, 46.2, 45.7, 46.1], [46.1, 46.5, 46.0, 46.4], [46.5, 46.6, 45.3, 45.4]],
      read: 'A red body swallows the prior green one at the highs — supply just overwhelmed the advance.',
      note: 'At resistance or after an extended run it flags exhaustion; inside a strong uptrend it is often just a pullback’s first candle.'
    },
    {
      name: 'Inside bar', bias: 'neutral',
      cs: [[46.2, 47.6, 46.0, 47.4], [47.2, 47.45, 46.7, 46.9], [46.9, 47.2, 46.75, 47.05]],
      read: 'A candle contained entirely within the prior candle’s range — compression after a push.',
      note: 'A coiled spring: trade the break of the mother bar’s range in the trend direction, stop at its other side.'
    },
    {
      name: 'Morning star', bias: 'bull',
      cs: [[48.3, 48.4, 47.8, 47.9], [48.0, 48.3, 46.8, 47.0], [46.7, 46.95, 46.4, 46.6], [46.8, 48.1, 46.7, 47.9]],
      read: 'Big red, a small pausing star below it, then a big green closing deep into the first candle — a three-act reversal.',
      note: 'The third candle is the confirmation built in. The deeper it closes into candle one, the stronger the signal.'
    },
    {
      name: 'Evening star', bias: 'bear',
      cs: [[45.4, 45.6, 45.1, 45.5], [45.5, 46.7, 45.4, 46.6], [46.8, 47.1, 46.6, 46.95], [46.7, 46.8, 45.5, 45.7]],
      read: 'The top-side mirror: strong green, a stalling star at the highs, then a red candle that gives the advance back.',
      note: 'Marks distribution after a climb; heavier volume on the third candle strengthens it.'
    },
    {
      name: 'Three white soldiers', bias: 'bull',
      cs: [[46.0, 46.9, 45.9, 46.8], [46.5, 47.6, 46.4, 47.5], [47.2, 48.3, 47.1, 48.2]],
      read: 'Three consecutive full-bodied greens, each opening inside the prior body and closing near its high.',
      note: 'Persistent, orderly demand. Late in a move it can also mean the last buyers are all in — check how far from the mean it prints.'
    },
    {
      name: 'Three black crows', bias: 'bear',
      cs: [[48.2, 48.3, 47.3, 47.4], [47.7, 47.8, 46.8, 46.9], [47.1, 47.2, 46.2, 46.3]],
      read: 'Three heavy red candles stair-stepping down — sustained distribution, not a one-off dip.',
      note: 'Most meaningful when it breaks a prior support shelf; expect bounces to get sold.'
    },
    {
      name: 'Hanging man', bias: 'bear',
      cs: [[45.8, 46.4, 45.7, 46.3], [46.3, 46.9, 46.2, 46.8], [46.8, 47.3, 46.7, 47.2], [47.3, 47.45, 46.2, 47.15]],
      read: 'A hammer shape printing after a rally: the deep intraday flush shows supply is now active under the surface.',
      note: 'Same candle as a hammer — location flips the meaning. Confirmation is a close below its low.'
    },
    {
      name: 'Marubozu', bias: 'neutral',
      cs: [[46.6, 46.8, 46.1, 46.3], [46.3, 46.5, 46.0, 46.2], [46.2, 47.5, 46.2, 47.5]],
      read: 'All body, no wicks: one side controlled the candle from open to close without a single rejection.',
      note: 'A green marubozu through a level is conviction; the color decides the bias, the location decides the trade.'
    }
  ];

  function patternGallery() {
    var badge = { bull: '<span class="badge green">Bullish</span>', bear: '<span class="badge red">Bearish</span>', neutral: '<span class="badge">Context</span>' };
    return '<div class="grid cols-3">' + PATTERNS.map(function (p) {
      return '<div class="card tight">' +
        '<div class="diagram" style="padding:8px;margin:0 0 10px">' + miniPattern(p.cs) + '</div>' +
        '<div class="spread" style="margin-bottom:6px"><h4 style="margin:0">' + p.name + '</h4>' + badge[p.bias] + '</div>' +
        '<p class="small" style="color:var(--ink-2);margin-bottom:6px">' + p.read + '</p>' +
        '<p class="small muted" style="margin:0">' + p.note + '</p>' +
        '</div>';
    }).join('') + '</div>';
  }

  /* ---------- sessions: volume U-curve ---------- */

  function uCurveSvg() {
    var vols = [100, 62, 48, 40, 34, 30, 28, 30, 35, 42, 50, 64, 88];
    var labels = { 0: '9:30', 3: '11:00', 6: '12:30', 9: '14:00', 12: '15:30' };
    var s = '';
    var x0 = 70, bw = 40, gap = 9;
    vols.forEach(function (v, i) {
      var h = v * 2.4;
      var x = x0 + i * (bw + gap);
      var hot = i === 0 || i === 12;
      s += '<rect x="' + x + '" y="' + (300 - h) + '" width="' + bw + '" height="' + h + '" rx="4" fill="' +
        (hot ? 'var(--accent)' : 'var(--chart-1)') + '"' + (hot ? '' : ' fill-opacity="0.45"') + '/>';
      if (labels[i]) s += txt(x + bw / 2, 320, labels[i], { anchor: 'middle', size: 10.5, fill: 'var(--ink-3)' });
    });
    s += hline(60, 715, 300, 'var(--axis)', false, 1.5);
    s += txt(70, 36, 'Typical intraday volume by 30-minute bucket (illustrative)', { size: 12, weight: 600, fill: 'var(--ink)' });
    s += txt(70 + 20, 60, 'The open and the close carry the volume — and the opportunity', { size: 11, fill: 'var(--ink-3)' });
    return wrapSvg(s, 'The U-curve: participation collapses through lunch and returns for the close. Strategies built on momentum need the ends of the day; the middle rewards patience more than activity.', 340);
  }

  /* =============================== DATA =============================== */

  window.EDUCATION_DATA = [

    /* ------------------------- TA BASICS ------------------------- */
    {
      id: 'ta-basics',
      title: 'Technical Analysis Basics',
      icon: 'trend',
      blurb: 'Support/resistance, structure, moving averages, VWAP and volume — the five tools under every setup.',
      minutes: 14,
      sections: [
        {
          title: 'Support & resistance',
          html:
            '<p>A support or resistance level is simply a price where a large amount of business was done — prior day high/low, a gap edge, a heavily traded consolidation, a round number. Traders who did that business defend or regret it, which is why price reacts when it returns.</p>' +
            srFlipSvg() +
            '<ul>' +
            '<li><strong>Fewer, bigger levels.</strong> Two or three levels marked pre-market beat fifteen lines nobody respects. If it is not obvious on the chart in two seconds, it is not a level.</li>' +
            '<li><strong>Zones, not lines.</strong> Expect reactions within a few cents around the level, and place stops <em>beyond</em> the zone, not on it.</li>' +
            '<li><strong>Role reversal is the tell.</strong> Broken resistance acting as support (and vice versa) confirms the break was real — the retest is the professional entry.</li>' +
            '<li><strong>Tested-to-death levels break.</strong> Each retest consumes the resting orders defending it; the fourth knock usually gets through.</li>' +
            '</ul>'
        },
        {
          title: 'Trendlines & market structure',
          html:
            '<p>Before any indicator, read the pivots. An uptrend is a staircase of higher highs and higher lows; a downtrend is the mirror. Everything else — averages, oscillators, patterns — is commentary on that structure.</p>' +
            structureSvg() +
            '<p>Practical rules: trade in the direction of the current staircase; treat the first lower low in an uptrend as a warning, and a failed retest of the old high after it as the exit/reverse signal. Draw trendlines across the <em>lows</em> in an uptrend (they show where buyers keep stepping in), and demand at least three touches before trusting one.</p>'
        },
        {
          title: 'Moving averages',
          html:
            '<p>A moving average smooths price into a single line of average cost. Day traders leave most of them alone and watch four:</p>' +
            '<div class="table-wrap"><table class="table"><thead><tr><th>MA</th><th>Type</th><th>Intraday job</th></tr></thead><tbody>' +
            '<tr><td><b>9 EMA</b></td><td>Exponential</td><td>Momentum leash — strong moves ride it; losing it ends the burst</td></tr>' +
            '<tr><td><b>20 EMA</b></td><td>Exponential</td><td>The pullback magnet — trend entries live at its touch</td></tr>' +
            '<tr><td><b>50 SMA</b></td><td>Simple</td><td>Deeper intraday support; regime line for the session</td></tr>' +
            '<tr><td><b>200 SMA</b> (daily)</td><td>Simple</td><td>The institutional line in the sand — daily-chart context for the day’s bias</td></tr>' +
            '</tbody></table></div>' +
            maSvg() +
            '<p>EMA vs SMA: the EMA weights recent prices more, so it turns faster — better for intraday timing; the SMA is steadier — better for context. The slope matters more than the crossing: <strong>rising average = trend tool, flat average = stay away</strong>. And an MA is a <em>location</em>, never a trigger: the trigger is price reacting there.</p>'
        },
        {
          title: 'VWAP',
          html:
            '<p>The <strong>volume-weighted average price</strong> is the session’s true average cost — every share traded, weighted by size. Institutions benchmark their executions against it, which makes it the most self-fulfilling line on an intraday chart.</p>' +
            '<ul>' +
            '<li><strong>Bias line:</strong> price above a rising VWAP = buyers in control; below = sellers. The cleanest single filter for long-vs-short decisions.</li>' +
            '<li><strong>Reload zone:</strong> in a trending stock the first orderly pullback to VWAP tends to get bought/sold by the same institutions that drove the move.</li>' +
            '<li><strong>Reversion anchor:</strong> when price stretches far from VWAP without new news, snap-backs toward it fund the fade trade.</li>' +
            '<li><strong>Fights at the line:</strong> repeated VWAP crosses = a balanced, choppy auction. Momentum playbooks should stand down.</li>' +
            '</ul>' +
            '<div class="callout tip"><div><b>Rule of thumb.</b> Longs above VWAP, shorts below it. Breaking that rule requires a written reason.</div></div>'
        },
        {
          title: 'Volume',
          html:
            '<p>Price says <em>what</em> happened; volume says <em>how many people agreed</em>. Every breakout, reversal and trend claim should be cross-examined against participation.</p>' +
            volumeSvg() +
            '<ul>' +
            '<li><strong>Confirmation:</strong> breakouts and trend pushes are trustworthy on expanding volume, suspect without it.</li>' +
            '<li><strong>RVOL (relative volume):</strong> today’s volume vs the normal for this time of day. RVOL ≥ 2 marks a stock actually in play; RVOL 0.7 means the crowd stayed home regardless of the story.</li>' +
            '<li><strong>Climax:</strong> a volume spike several times normal after an extended move often marks the exhaustion point — the last buyers arriving at once.</li>' +
            '<li><strong>Divergence:</strong> new price highs on shrinking volume say the advance is being carried by fewer and fewer participants — tighten stops.</li>' +
            '</ul>'
        },
        {
          title: 'Putting it together',
          html:
            '<p>A repeatable 60-second read, top down:</p>' +
            '<ol>' +
            '<li><strong>Daily chart:</strong> where is price relative to the 200 SMA, yesterday’s range and any big level? That sets the day’s bias and the magnets above/below.</li>' +
            '<li><strong>Structure:</strong> on the 5-minute, is there a staircase? Which way?</li>' +
            '<li><strong>Location:</strong> is price AT a level (tradeable) or in the middle of nowhere (wait)?</li>' +
            '<li><strong>Averages/VWAP:</strong> right side or wrong side? Sloped or flat?</li>' +
            '<li><strong>Volume:</strong> does participation confirm the story the candles are telling?</li>' +
            '</ol>' +
            '<p>Five yeses = a setup from the Strategy Library. Anything less = the most profitable trade in the book: no trade.</p>'
        }
      ]
    },

    /* ------------------------- CANDLESTICKS ------------------------- */
    {
      id: 'candlesticks',
      title: 'Candlestick Patterns',
      icon: 'layers',
      blurb: 'Candle anatomy plus the twelve patterns worth knowing — and why location beats shape every time.',
      minutes: 12,
      sections: [
        {
          title: 'Anatomy of a candle',
          html:
            '<p>Each candle is a compressed auction: who pushed, how far, and who ended up in control. Learn to read one candle and every pattern below becomes obvious instead of memorized.</p>' +
            anatomySvg() +
            '<ul>' +
            '<li><strong>Big body, small wicks:</strong> one-sided conviction — continuation fuel.</li>' +
            '<li><strong>Small body, long wicks:</strong> a fight with no winner — expect resolution soon, in either direction.</li>' +
            '<li><strong>Long single wick:</strong> a rejection — the market went there and was refused. Wicks point at prices the market does <em>not</em> accept.</li>' +
            '</ul>'
        },
        {
          title: 'The pattern gallery',
          html:
            '<p>Twelve high-frequency patterns. For each: what the candles literally say, and the context that makes the signal worth risk.</p>' +
            patternGallery()
        },
        {
          title: 'Context beats pattern',
          html:
            '<p>The same candle at different locations is a different trade:</p>' +
            '<ul>' +
            '<li>A <strong>hammer at VWAP</strong> in an uptrend after a 3-candle pullback = an A-grade continuation entry. The identical hammer mid-range on low volume = nothing.</li>' +
            '<li>A <strong>bearish engulfing at the prior day’s high</strong> = a real reversal candidate. The same candle in the middle of a strong trend = usually just the first rest.</li>' +
            '<li>A <strong>doji during lunch chop</strong> = the market being closed for lunch, not indecision worth trading.</li>' +
            '</ul>' +
            '<p>Checklist before acting on any candle pattern: (1) Is it at a pre-marked level or average? (2) Does volume confirm the rejection/conviction it implies? (3) Does the trade it suggests agree with market structure? (4) Is there a confirmation trigger — the break of the pattern candle’s high/low — to enter on? Pattern + location + volume + trigger, in that order.</p>' +
            '<div class="callout warn"><div><b>Reliability honesty.</b> No candlestick pattern carries a durable statistical edge by itself — commonly cited hit rates evaporate out of context. The pattern’s job is timing a trade you already had structural reasons to want.</div></div>'
        }
      ]
    },

    /* ------------------------- RISK ------------------------- */
    {
      id: 'risk',
      title: 'Risk Management',
      icon: 'shield',
      blurb: 'The 1% rule, position sizing, R-multiples, expectancy and drawdown math — the part that decides survival.',
      minutes: 13,
      sections: [
        {
          title: 'The 1% rule',
          html:
            '<p>Risk a fixed small fraction of the account — commonly <strong>0.5–1%</strong> — on every trade. Not because any single trade matters, but because losing streaks are a statistical certainty and the account must be able to absorb the worst realistic one.</p>' +
            '<p>At 1% risk, a brutal 10-loss streak costs about 9.6% of the account — annoying, recoverable. At 5% risk the same streak costs 40% — which needs a 67% gain just to get back. Every professional sizing scheme is downstream of this arithmetic.</p>' +
            '<div class="callout tip"><div><b>The question is never</b> "how much can I make on this trade" but "how many of these can I lose in a row and still be fine". The answer must be: many.</div></div>'
        },
        {
          title: 'Position sizing',
          html:
            '<p>Size is an output, not a choice. Three inputs decide it:</p>' +
            '<div class="callout info"><div><span class="mono">shares = floor((account × risk%) ÷ (entry − stop))</span></div></div>' +
            '<p><strong>Worked example:</strong> $30,000 account, 1% risk = $300. Entry $52.40, stop $51.90 → risk/share $0.50 → <span class="mono">floor(300 / 0.50) = 600 shares</span> (position $31,440 — margin territory, fine intraday). Same account, entry $52.40, stop $52.15 ($0.25) → 1,200 shares. The tighter the stop, the bigger the size — <em>for the same dollar risk</em>.</p>' +
            '<ul>' +
            '<li>The stop comes from <strong>structure</strong> (below the swing low / range). Never from "what size I want".</li>' +
            '<li>If the computed position exceeds buying power, buying power wins and the dollar risk shrinks. Never widen a stop to justify size.</li>' +
            '<li>Recompute every trade. Same risk %, different stops = different share counts. The Tools tab does this live.</li>' +
            '</ul>'
        },
        {
          title: 'Thinking in R-multiples',
          html:
            '<p><strong>1R = the dollars at risk on the trade.</strong> A trade risking $300 that makes $600 is +2R; one that loses its stop is −1R. Denominating results in R instead of dollars does three things:</p>' +
            '<ul>' +
            '<li>Makes trades comparable across position sizes and account growth.</li>' +
            '<li>Forces stop discipline — a loss bigger than −1R means the plan was violated, full stop.</li>' +
            '<li>Reframes the goal: a good week is measured in net R, not dollars, which keeps size increases from feeling like skill increases.</li>' +
            '</ul>' +
            '<p>Journal every trade’s planned R and realized R (TradeLab’s journal computes it when a stop is logged). A system that averages +0.3R per trade over hundreds of trades is a professional edge; one at −0.1R is a slow leak no win-rate streak will fix.</p>'
        },
        {
          title: 'Expectancy',
          html:
            '<p>Expectancy is the average R you earn per trade, and it is the whole game in one number:</p>' +
            '<div class="callout info"><div><span class="mono">E = (win% × avg win R) − (loss% × avg loss R)</span></div></div>' +
            '<p>Example: 45% win rate, average winner +2R, average loser −1R → E = 0.45×2 − 0.55×1 = <strong>+0.35R per trade</strong>. Over 200 trades a year at $300 risk, that is ≈ $21,000 of edge — from a system that loses more often than it wins.</p>' +
            '<p>Minimum reward:risk needed just to break even at a given win rate:</p>' +
            '<div class="table-wrap"><table class="table"><thead><tr><th>Win rate</th><th>Breakeven R:R</th><th>Comfortable R:R</th></tr></thead><tbody>' +
            '<tr><td>30%</td><td class="tnum">1 : 2.33</td><td class="tnum">1 : 3+</td></tr>' +
            '<tr><td>40%</td><td class="tnum">1 : 1.50</td><td class="tnum">1 : 2+</td></tr>' +
            '<tr><td>50%</td><td class="tnum">1 : 1.00</td><td class="tnum">1 : 1.5+</td></tr>' +
            '<tr><td>60%</td><td class="tnum">1 : 0.67</td><td class="tnum">1 : 1+</td></tr>' +
            '</tbody></table></div>' +
            '<p>This table kills two fantasies at once: a high win rate with terrible R:R (the scalper who wins 80% and gives it all back on two blowups), and huge R:R with a win rate too low to survive psychologically. Pick a quadrant and make the <em>other</em> number honest.</p>'
        },
        {
          title: 'The drawdown trap',
          html:
            '<p>Losses are geometric: what you lose in percent must be out-earned by a larger percent on the smaller base.</p>' +
            '<div class="table-wrap"><table class="table"><thead><tr><th>Drawdown</th><th>Gain required to recover</th></tr></thead><tbody>' +
            '<tr><td class="tnum">−5%</td><td class="tnum">+5.3%</td></tr>' +
            '<tr><td class="tnum">−10%</td><td class="tnum">+11.1%</td></tr>' +
            '<tr><td class="tnum">−20%</td><td class="tnum">+25.0%</td></tr>' +
            '<tr><td class="tnum">−30%</td><td class="tnum">+42.9%</td></tr>' +
            '<tr><td class="tnum">−50%</td><td class="tnum">+100%</td></tr>' +
            '</tbody></table></div>' +
            '<p>The curve is gentle until it is not — which is why the risk framework’s only real job is keeping drawdowns in the flat part of this table. Under 10%, recovery is arithmetic; past 30%, it is a career event.</p>'
        },
        {
          title: 'Daily loss limits & circuit breakers',
          html:
            '<ul>' +
            '<li><strong>Daily max loss: 2–3R (or ~2% of account).</strong> Written down the night before, enforced by the platform if possible. Hitting it ends the day — the market reliably reopens tomorrow.</li>' +
            '<li><strong>Consecutive-loss breaker: 3 straight losers = 15-minute walk</strong>, minimum. Losses cluster when the read is wrong or the tape changed; the breaker forces the re-read.</li>' +
            '<li><strong>Weekly review trigger:</strong> a −6R week pauses live trading for a journal audit. What that audit finds is nearly always a rule violation, not bad luck.</li>' +
            '</ul>'
        },
        {
          title: 'When (and when not) to size up',
          html:
            '<p>Size up on <strong>evidence, not feeling</strong>: 50+ logged trades, positive expectancy, max drawdown inside plan — then raise risk in small steps (0.75% → 1%) and re-verify over the next 30 trades. One step at a time.</p>' +
            '<p>Never size up: to recover a loss (that is revenge trading with a spreadsheet), after a hot streak (variance flatters everyone briefly), or on a "sure thing" (the market does not issue those). The account’s growth rate is set by expectancy × frequency — size only scales what already works, and it scales the failures just as faithfully.</p>'
        }
      ]
    },

    /* ------------------------- PSYCHOLOGY ------------------------- */
    {
      id: 'psychology',
      title: 'Trading Psychology',
      icon: 'brain',
      blurb: 'FOMO, revenge trades, loss aversion and tilt — plus the concrete protocols that neutralize them.',
      minutes: 11,
      sections: [
        {
          title: 'Why psychology decides outcomes',
          html:
            '<p>Two traders can run the same playbook with the same account and end the year on opposite sides of zero. The difference is execution under emotion: the rules are easy on Sunday and hard at 9:47 on a red Tuesday. Markets transfer money from the reactive to the prepared — every bias below is a mechanism of that transfer.</p>' +
            '<p>The good news: none of this is fixed by willpower. It is fixed by <strong>protocols</strong> — pre-made decisions that remove the moment of choice. That is what checklists, written plans, fixed risk and circuit breakers actually are: psychology tools wearing spreadsheet clothes.</p>'
        },
        {
          title: 'FOMO and chasing',
          html:
            '<p>Fear of missing out fires when a move leaves without you — and it always frames chasing as "getting in". Chased entries are structurally the worst on the chart: far from any stop-worthy level, at the point of maximum extension, sized on excitement.</p>' +
            '<ul>' +
            '<li><strong>Reframe:</strong> the move was never yours. There is no such thing as a missed trade, only trades outside your plan.</li>' +
            '<li><strong>Protocol:</strong> if the planned entry is gone by more than a few cents, the trade is gone. Write the next level where the setup would re-form, set an alert, close the chart.</li>' +
            '<li><strong>Comfort stat:</strong> the market prints hundreds of playbook-quality setups a month. Scarcity is an illusion the current candle sells you.</li>' +
            '</ul>'
        },
        {
          title: 'Revenge trading',
          html:
            '<p>After a loss — especially a rule-breaking one — the urge is to "make it back" immediately, from the same stock, at double size. That is not a strategy; it is the loss choosing your next trade.</p>' +
            '<ul>' +
            '<li><strong>Tell-tale signs:</strong> entering within a minute of a stop-out, size suddenly bigger, no written setup, the word "owes" anywhere in your thinking.</li>' +
            '<li><strong>Protocol:</strong> after any stop-out, hands off the keyboard for five minutes and re-read the plan. After a rule violation, done for the day — the tuition is only paid if the lesson sticks.</li>' +
            '</ul>'
        },
        {
          title: 'Loss aversion & the disposition effect',
          html:
            '<p>Losses hurt roughly twice as much as equivalent gains feel good — so untrained instinct cuts winners early (to lock the good feeling) and holds losers (to avoid making the pain "real"). That is the exact opposite of positive expectancy, executed with total conviction.</p>' +
            '<ul>' +
            '<li><strong>The stop is the decision.</strong> It was made calmly, before money was on the line; the mid-trade urge to move it has no new information — only new feelings.</li>' +
            '<li><strong>Pre-commit the exits:</strong> partial at +1R, stop to breakeven, trail the rest. Mechanical exits take the feeling-driven choice away on the winning side too.</li>' +
            '<li><strong>Audit for it:</strong> if the journal shows average losers bigger than average winners with a decent win rate, the disposition effect is eating the edge — the numbers make the bias visible.</li>' +
            '</ul>'
        },
        {
          title: 'Overtrading & boredom trades',
          html:
            '<p>The market pays for a handful of good decisions a day, not for activity. Boredom trades — taken because the screen is open and lunch is slow — carry full risk with none of the edge, and their fees and small losses quietly fund the broker.</p>' +
            '<ul>' +
            '<li><strong>Trade count budget:</strong> decide the day’s maximum attempts pre-market (e.g. 5). Spent = done. Quality rises immediately when quantity is scarce.</li>' +
            '<li><strong>The A/B/C test:</strong> grade the setup aloud before entry. B-setups get half size; C-setups get zero. If it needs debate, it is a C.</li>' +
            '<li><strong>Scheduled downtime:</strong> the 11:30–14:00 chop is a designed break, not screen-watching time.</li>' +
            '</ul>'
        },
        {
          title: 'A concrete tilt protocol',
          html:
            '<p>Tilt — trading angry, scared or euphoric — is a state, and states need triggers and actions, not intentions:</p>' +
            '<ol>' +
            '<li><strong>Triggers (any one):</strong> 3 consecutive losses · a rule violation · daily loss limit hit · noticing physical anger/anxiety · gloating over a win.</li>' +
            '<li><strong>Immediate action:</strong> flatten everything, platform closed, 15 minutes physically away from the desk.</li>' +
            '<li><strong>Re-entry condition (written):</strong> back only after journaling what happened in one honest paragraph AND only if a written A-setup exists. Otherwise the session is over.</li>' +
            '<li><strong>Repeat offense in one week:</strong> next day is simulator-only. The account is the tool the career depends on; tilt gets treated like a tool malfunction.</li>' +
            '</ol>'
        },
        {
          title: 'Process over outcome',
          html:
            '<p>Any single trade’s result is mostly noise; the quality of the decision is not. Grade every trade on rule adherence, not P/L: a stopped-out trade that followed the plan is an <strong>A</strong>; a winner that broke the rules is an <strong>F with a bonus</strong> — and the most expensive grade there is, because it teaches the wrong lesson with real money.</p>' +
            '<p>Weekly, count A-grades, not dollars. A month of 90% A-execution with flat P/L is a system problem (fix the playbook); a month of 50% A-execution is a trader problem (fix the protocols). Knowing which problem you have is half the career.</p>'
        },
        {
          title: 'Pre-market mental routine',
          html:
            '<ul>' +
            '<li><strong>State check (2 min):</strong> sleep, stress, mood — honestly. Below baseline = half size or simulator, decided now, not at 9:31.</li>' +
            '<li><strong>Rehearse the plan aloud:</strong> "If X breaks Y on volume, I do Z; otherwise nothing." Spoken plans expose fuzzy ones.</li>' +
            '<li><strong>Pre-accept the loss:</strong> visualize the first trade stopping out at −1R and feel it now, while it is cheap. Traders who have pre-lost the money execute stops without flinching.</li>' +
            '<li><strong>One intention:</strong> a single process goal for the day ("no entries inside the range", "honor the time stop"). One, not five.</li>' +
            '</ul>'
        },
        {
          title: 'Journaling emotions',
          html:
            '<p>Numbers diagnose the system; words diagnose the trader. Alongside each trade’s prices, log one line of state: <em>"calm, planned"</em> · <em>"entered angry after stop-out"</em> · <em>"hesitated, chased the re-entry"</em>. Patterns emerge within weeks: the specific hour, setup or feeling that precedes your worst trades.</p>' +
            '<p>The TradeLab journal’s notes field is built for exactly this — the review that matters is reading those notes on Sunday and finding the sentence that keeps appearing before the red trades.</p>'
        }
      ]
    },

    /* ------------------------- SESSIONS ------------------------- */
    {
      id: 'sessions',
      title: 'Market Sessions & Volatility',
      icon: 'clock',
      blurb: 'What each hour of the US session actually behaves like, and which playbook belongs in which window.',
      minutes: 10,
      sections: [
        {
          title: 'The US intraday map',
          html:
            '<div class="table-wrap"><table class="table"><thead><tr><th>Window (ET)</th><th>Character</th><th>Who is active / what happens</th></tr></thead><tbody>' +
            '<tr><td class="tnum"><b>4:00–9:30</b></td><td>Pre-market</td><td>News gets priced on thin liquidity; gappers form; levels for the day are born. Wide spreads — plan, don’t chase.</td></tr>' +
            '<tr><td class="tnum"><b>9:30–10:00</b></td><td>The open</td><td>Highest volume and volatility of the day. Opening auctions unwind, ORB territory. Fast, unforgiving, most opportunity.</td></tr>' +
            '<tr><td class="tnum"><b>10:00–11:30</b></td><td>Morning trend</td><td>The open’s verdict extends or reverses; 10:00 economic data hits; pullback entries at their best.</td></tr>' +
            '<tr><td class="tnum"><b>11:30–14:00</b></td><td>Lunch</td><td>Volume collapses (see the U-curve); ranges compress; false breakouts multiply. Most pros size down or stand down.</td></tr>' +
            '<tr><td class="tnum"><b>14:00–15:00</b></td><td>Afternoon</td><td>Ranges resolve; FOMC days detonate at 14:00. Trends that survive lunch often re-ignite here.</td></tr>' +
            '<tr><td class="tnum"><b>15:00–16:00</b></td><td>Power hour</td><td>Volume returns; institutions complete daily orders; 15:50+ MOC imbalances shove prices. Momentum works again.</td></tr>' +
            '<tr><td class="tnum"><b>16:00–20:00</b></td><td>After-hours</td><td>Earnings reactions on thin books. Moves are real but fills are bad; most day traders observe only.</td></tr>' +
            '</tbody></table></div>'
        },
        {
          title: 'The volume U-curve',
          html:
            uCurveSvg() +
            '<p>Participation is the raw material of every day-trading edge: moves on volume carry, moves without it revert. The practical consequence is a schedule — morning session for momentum playbooks, lunch for review or rest, the close for the second wave. Trading the 12:30 candle like the 9:45 candle is a category error the U-curve makes visible.</p>'
        },
        {
          title: 'Day-of-week & event behavior',
          html:
            '<p>Tendencies, not laws — but worth respecting when sizing:</p>' +
            '<ul>' +
            '<li><strong>FOMC days (8×/yr):</strong> the morning ranges, the 14:00 statement whipsaws, the 14:30 press conference picks the real direction. Most playbooks stand down from ~13:30 until the dust settles.</li>' +
            '<li><strong>CPI / payrolls mornings (8:30):</strong> the gap and first 30 minutes carry index-level violence; single-stock edges are diluted while everything trades as one risk block.</li>' +
            '<li><strong>OPEX Fridays (monthly) & triple witching (Mar/Jun/Sep/Dec):</strong> huge but often <em>directionless</em> volume; pinning around big strikes dampens trends.</li>' +
            '<li><strong>Mondays</strong> inherit weekend news and often set the week’s tone late rather than early; <strong>Fridays</strong> de-risk into the close — afternoon trends can unwind abruptly.</li>' +
            '<li><strong>Half days</strong> (day after Thanksgiving, Christmas Eve): the U-curve compresses into 3.5 hours — the close behavior starts around noon.</li>' +
            '</ul>'
        },
        {
          title: 'Matching playbook to window',
          html:
            '<div class="table-wrap"><table class="table"><thead><tr><th>Window (ET)</th><th>First choice</th><th>Why</th></tr></thead><tbody>' +
            '<tr><td class="tnum">9:30–10:30</td><td><a href="#/strategies/orb">ORB</a></td><td>Needs the open’s volume surge and range formation</td></tr>' +
            '<tr><td class="tnum">9:45–11:30</td><td><a href="#/strategies/pullback">Pullback</a></td><td>Trends are established and structure is readable</td></tr>' +
            '<tr><td class="tnum">9:30–11:00</td><td><a href="#/strategies/scalping">Scalping</a></td><td>Tape speed and tight spreads at their best</td></tr>' +
            '<tr><td class="tnum">11:30–14:00</td><td><i>None</i></td><td>Review, journal, prep the afternoon list</td></tr>' +
            '<tr><td class="tnum">15:00–16:00</td><td>Scalping / trend re-entries</td><td>Volume returns; imbalance flows move price</td></tr>' +
            '</tbody></table></div>' +
            '<p>The meta-rule: <strong>the window is part of the setup.</strong> An ORB signal at 1 PM or a scalp at 12:15 fails the checklist before the chart is even consulted.</p>'
        },
        {
          title: 'The globe in ET',
          html:
            '<p>US equities do not wake up in a vacuum (times approximate, shifting ±1h with daylight saving):</p>' +
            '<ul>' +
            '<li><strong>Asia (Tokyo ≈ 8:00 PM–2:00 AM ET):</strong> sets overnight futures tone; big moves here show up as US gap risk.</li>' +
            '<li><strong>London (≈ 3:00–11:30 AM ET):</strong> Europe’s open around 3:00 AM brings the first real liquidity to FX and index futures; the 8:00–9:30 ET stretch — London afternoon + US pre-market — is when overnight conviction becomes tradeable flow.</li>' +
            '<li><strong>The 11:30 ET London close</strong> removes a layer of participation right as US lunch begins — one more reason the midday tape thins out.</li>' +
            '</ul>' +
            '<p>A 30-second glance at overnight futures range and Europe’s session tells you whether the US open inherits momentum, a hangover, or nothing at all.</p>'
        }
      ]
    }
  ];
})();
