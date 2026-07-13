/* ==========================================================================
   TradeLab — Charts
   Tiny dependency-free SVG chart library. Theme-aware: every color is a CSS
   variable so charts restyle instantly on theme change.

   Public API (window.Charts):
     Charts.line(el, { series:[{name, points:[{x,y}], color, width, opacity, fill}],
                       height, yFormat, xFormat, zeroLine, legend, tooltip })
       - points MUST be sorted ascending by x. x is a number (index or ms epoch).
       - tooltip rows are shown for NAMED series only.
     Charts.bars(el, { labels:[], values:[], height, yFormat, colorBySign, color, tooltip })
     Charts.donut(el, { segments:[{label, value, color}], centerLabel, centerSub })
     Charts.spark(el, points:[number], { color, height })
   All render immediately and auto re-render on container resize.
   ========================================================================== */
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';

  function svgEl(name, attrs, parent) {
    var el = document.createElementNS(NS, name);
    if (attrs) {
      for (var k in attrs) {
        if (attrs[k] != null) el.setAttribute(k, attrs[k]);
      }
    }
    if (parent) parent.appendChild(el);
    return el;
  }

  function txt(parent, x, y, str, opts) {
    opts = opts || {};
    var t = svgEl('text', {
      x: x, y: y,
      'text-anchor': opts.anchor || 'start',
      'font-size': opts.size || 11,
      style: 'fill:' + (opts.fill || 'var(--ink-3)') + ';font-variant-numeric:tabular-nums;' + (opts.style || ''),
      transform: opts.transform || null,
      'font-weight': opts.weight || null
    }, parent);
    t.textContent = str;
    return t;
  }

  function niceNum(range, round) {
    var exp = Math.floor(Math.log10(range));
    var f = range / Math.pow(10, exp);
    var nf;
    if (round) nf = f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10;
    else nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
    return nf * Math.pow(10, exp);
  }

  function niceTicks(min, max, count) {
    if (!isFinite(min) || !isFinite(max)) { min = 0; max = 1; }
    if (min === max) { min -= Math.abs(min) * 0.1 || 1; max += Math.abs(max) * 0.1 || 1; }
    var range = niceNum(max - min, false);
    var step = niceNum(range / (count - 1), true);
    var lo = Math.floor(min / step) * step;
    var hi = Math.ceil(max / step) * step;
    var n = Math.round((hi - lo) / step);
    var dec = Math.max(0, -Math.floor(Math.log10(step)) + 1);
    var ticks = [];
    for (var i = 0; i <= n; i++) ticks.push(+(lo + i * step).toFixed(dec + 2));
    return { ticks: ticks, lo: lo, hi: hi };
  }

  function fmtTick(v) {
    var a = Math.abs(v);
    if (a >= 1e6) return (v / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    if (a >= 1e4) return (v / 1e3).toFixed(1).replace(/\.0$/, '') + 'k';
    return (+v.toFixed(2)).toLocaleString('en-US');
  }

  function estWidth(str, size) { return String(str).length * (size || 11) * 0.62; }

  function renderEmpty(el, msg) {
    el.innerHTML = '<div class="empty small" style="padding:26px 10px">' + (msg || 'No data yet') + '</div>';
  }

  /* Re-render on container width change */
  function mount(el, render) {
    if (el.__chartRO) { try { el.__chartRO.disconnect(); } catch (e) {} el.__chartRO = null; }
    el.classList.add('chart');
    render();
    if (typeof ResizeObserver === 'undefined') return;
    var lastW = el.clientWidth, raf = 0;
    var ro = new ResizeObserver(function () {
      var w = el.clientWidth;
      if (!w || Math.abs(w - lastW) < 9) return;
      lastW = w;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(render);
    });
    ro.observe(el);
    el.__chartRO = ro;
  }

  function makeTip(el) {
    var tip = document.createElement('div');
    tip.className = 'chart-tip';
    tip.style.display = 'none';
    el.appendChild(tip);
    return tip;
  }

  function placeTip(el, tip, px, py) {
    tip.style.display = 'block';
    var w = tip.offsetWidth, h = tip.offsetHeight;
    var x = px + 14, y = py - h - 10;
    if (x + w > el.clientWidth - 4) x = px - w - 14;
    if (x < 4) x = 4;
    if (y < 4) y = py + 14;
    tip.style.left = x + 'px';
    tip.style.top = y + 'px';
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ------------------------------ line ------------------------------ */
  function line(el, opts) { mount(el, function () { renderLine(el, opts || {}); }); }

  function renderLine(el, o) {
    el.innerHTML = '';
    var series = (o.series || []).filter(function (s) { return s && s.points && s.points.length; });
    if (!series.length) return renderEmpty(el);

    var W = Math.max(280, el.clientWidth || 640);
    var H = o.height || 260;
    var yFmt = o.yFormat || fmtTick;
    var xFmt = o.xFormat || function (x) { return fmtTick(x); };

    var xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity;
    series.forEach(function (s) {
      s.points.forEach(function (p) {
        if (p.x < xmin) xmin = p.x;
        if (p.x > xmax) xmax = p.x;
        if (p.y < ymin) ymin = p.y;
        if (p.y > ymax) ymax = p.y;
      });
    });
    if (o.zeroLine || series.some(function (s) { return s.fill; })) {
      if (ymin > 0) ymin = 0;
      if (ymax < 0) ymax = 0;
    }
    var yt = niceTicks(ymin, ymax, 5);
    ymin = yt.lo; ymax = yt.hi;
    if (xmin === xmax) { xmin -= 1; xmax += 1; }

    var maxLbl = 0;
    yt.ticks.forEach(function (t) { maxLbl = Math.max(maxLbl, estWidth(yFmt(t))); });
    var m = { t: 14, r: 18, b: 26, l: Math.max(38, Math.ceil(maxLbl) + 14) };
    var pw = W - m.l - m.r, ph = H - m.t - m.b;
    if (pw < 40) return renderEmpty(el);

    var sx = function (x) { return m.l + (x - xmin) / (xmax - xmin) * pw; };
    var sy = function (y) { return m.t + (1 - (y - ymin) / (ymax - ymin)) * ph; };

    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img' }, null);
    svg.style.width = '100%';
    svg.style.height = 'auto';

    /* grid + y labels */
    yt.ticks.forEach(function (t) {
      var y = sy(t);
      svgEl('line', { x1: m.l, x2: m.l + pw, y1: y, y2: y, style: 'stroke:var(--grid);stroke-width:1' }, svg);
      txt(svg, m.l - 8, y + 3.5, yFmt(t), { anchor: 'end' });
    });
    /* zero line emphasis */
    if (o.zeroLine && ymin < 0 && ymax > 0) {
      svgEl('line', { x1: m.l, x2: m.l + pw, y1: sy(0), y2: sy(0), style: 'stroke:var(--axis);stroke-width:1.4' }, svg);
    }
    /* x labels */
    var xTickCount = Math.min(6, Math.max(2, Math.floor(pw / 90)));
    for (var i = 0; i <= xTickCount; i++) {
      var xv = xmin + (xmax - xmin) * (i / xTickCount);
      txt(svg, sx(xv), H - 8, xFmt(xv), { anchor: i === 0 ? 'start' : (i === xTickCount ? 'end' : 'middle') });
    }

    /* series */
    series.forEach(function (s, si) {
      var color = s.color || 'var(--chart-' + ((si % 6) + 1) + ')';
      var d = '';
      s.points.forEach(function (p, pi) { d += (pi ? 'L' : 'M') + sx(p.x).toFixed(1) + ',' + sy(p.y).toFixed(1); });
      if (s.fill) {
        var base = sy(Math.max(ymin, Math.min(ymax, 0)));
        var ad = d + 'L' + sx(s.points[s.points.length - 1].x).toFixed(1) + ',' + base.toFixed(1) +
                 'L' + sx(s.points[0].x).toFixed(1) + ',' + base.toFixed(1) + 'Z';
        svgEl('path', { d: ad, style: 'fill:' + color + ';fill-opacity:.1;stroke:none' }, svg);
      }
      svgEl('path', {
        d: d,
        style: 'fill:none;stroke:' + color + ';stroke-width:' + (s.width || 2) +
               ';stroke-linecap:round;stroke-linejoin:round;opacity:' + (s.opacity != null ? s.opacity : 1)
      }, svg);
      if (s.endDot !== false && s.points.length && (s.name || series.length === 1)) {
        var lp = s.points[s.points.length - 1];
        svgEl('circle', {
          cx: sx(lp.x), cy: sy(lp.y), r: 4,
          style: 'fill:' + color + ';stroke:var(--surface);stroke-width:2'
        }, svg);
      }
    });

    /* hover layer */
    var named = series.filter(function (s) { return s.name; });
    if (o.tooltip !== false && named.length) {
      var guide = svgEl('line', { y1: m.t, y2: m.t + ph, style: 'stroke:var(--axis);stroke-width:1', 'stroke-dasharray': null }, svg);
      guide.style.display = 'none';
      var dots = named.map(function (s, si) {
        var c = svgEl('circle', {
          r: 4.5,
          style: 'fill:' + (s.color || 'var(--chart-' + ((series.indexOf(s) % 6) + 1) + ')') + ';stroke:var(--surface);stroke-width:2'
        }, svg);
        c.style.display = 'none';
        return c;
      });
      var overlay = svgEl('rect', { x: m.l, y: m.t, width: pw, height: ph, fill: 'transparent' }, svg);
      var tip = makeTip(el);

      function nearest(points, xv) {
        var best = points[0], bd = Infinity;
        for (var i = 0; i < points.length; i++) {
          var d = Math.abs(points[i].x - xv);
          if (d < bd) { bd = d; best = points[i]; }
        }
        return best;
      }
      function move(ev) {
        var rect = svg.getBoundingClientRect();
        var scale = rect.width / W;
        var px = (ev.clientX - rect.left) / scale;
        var xv = xmin + (px - m.l) / pw * (xmax - xmin);
        xv = Math.max(xmin, Math.min(xmax, xv));
        var anchor = nearest(named[0].points, xv);
        var gx = sx(anchor.x);
        guide.setAttribute('x1', gx); guide.setAttribute('x2', gx);
        guide.style.display = 'block';
        var html = '<div class="tip-title">' + esc(o.xTipFormat ? o.xTipFormat(anchor.x) : xFmt(anchor.x)) + '</div>';
        named.forEach(function (s, i) {
          var p = nearest(s.points, anchor.x);
          var color = s.color || 'var(--chart-' + ((series.indexOf(s) % 6) + 1) + ')';
          dots[i].setAttribute('cx', sx(p.x));
          dots[i].setAttribute('cy', sy(p.y));
          dots[i].style.display = 'block';
          html += '<div class="tip-row"><span class="swatch" style="background:' + color + '"></span>' +
                  esc(s.name) + ': <b>' + esc(yFmt(p.y)) + '</b></div>';
        });
        tip.innerHTML = html;
        var elRect = el.getBoundingClientRect();
        placeTip(el, tip, ev.clientX - elRect.left, ev.clientY - elRect.top);
      }
      function leave() {
        guide.style.display = 'none';
        dots.forEach(function (d) { d.style.display = 'none'; });
        tip.style.display = 'none';
      }
      overlay.addEventListener('mousemove', move);
      overlay.addEventListener('mouseleave', leave);
    }

    el.appendChild(svg);

    /* legend for 2+ named series */
    if (o.legend !== false && named.length >= 2 && named.length <= 8) {
      var lg = document.createElement('div');
      lg.className = 'chart-legend';
      lg.innerHTML = named.map(function (s) {
        var color = s.color || 'var(--chart-' + ((series.indexOf(s) % 6) + 1) + ')';
        return '<span class="legend-item"><span class="swatch" style="background:' + color + '"></span>' + esc(s.name) + '</span>';
      }).join('');
      el.appendChild(lg);
    }
  }

  /* ------------------------------ bars ------------------------------ */
  function bars(el, opts) { mount(el, function () { renderBars(el, opts || {}); }); }

  function renderBars(el, o) {
    el.innerHTML = '';
    var labels = o.labels || [];
    var values = o.values || [];
    if (!values.length) return renderEmpty(el);

    var W = Math.max(280, el.clientWidth || 640);
    var yFmt = o.yFormat || fmtTick;
    var ymin = Math.min(0, Math.min.apply(null, values));
    var ymax = Math.max(0, Math.max.apply(null, values));
    if (ymin === 0 && ymax === 0) ymax = 1;
    var yt = niceTicks(ymin, ymax, 5);
    ymin = yt.lo; ymax = yt.hi;

    var maxLbl = 0;
    yt.ticks.forEach(function (t) { maxLbl = Math.max(maxLbl, estWidth(yFmt(t))); });
    var longestX = labels.reduce(function (a, b) { return Math.max(a, estWidth(b, 10.5)); }, 0);
    var n = values.length;
    var mTmp = Math.max(38, Math.ceil(maxLbl) + 14);
    var bandTmp = (W - mTmp - 18) / n;
    var rotate = longestX > bandTmp - 8;
    var H = o.height || 240;
    var m = { t: 14, r: 18, b: rotate ? Math.min(74, longestX * 0.62 + 22) : 28, l: mTmp };
    var pw = W - m.l - m.r, ph = H - m.t - m.b;
    if (pw < 40) return renderEmpty(el);

    var band = pw / n;
    var barW = Math.min(24, Math.max(3, band * 0.72));
    var sy = function (y) { return m.t + (1 - (y - ymin) / (ymax - ymin)) * ph; };
    var y0 = sy(0);

    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img' }, null);
    svg.style.width = '100%'; svg.style.height = 'auto';

    yt.ticks.forEach(function (t) {
      var y = sy(t);
      svgEl('line', { x1: m.l, x2: m.l + pw, y1: y, y2: y, style: 'stroke:var(--grid);stroke-width:1' }, svg);
      txt(svg, m.l - 8, y + 3.5, yFmt(t), { anchor: 'end' });
    });
    svgEl('line', { x1: m.l, x2: m.l + pw, y1: y0, y2: y0, style: 'stroke:var(--axis);stroke-width:1.4' }, svg);

    var tip = (o.tooltip !== false) ? makeTip(el) : null;
    var lblEvery = Math.max(1, Math.ceil(n / Math.floor(pw / (rotate ? 26 : Math.max(30, longestX + 10)))));

    function barPath(x, v) {
      var yv = sy(v);
      var top = Math.min(yv, y0), bot = Math.max(yv, y0);
      var h = Math.max(1, bot - top);
      var r = Math.min(4, barW / 2, h);
      if (v >= 0) {
        return 'M' + x + ',' + bot +
               'L' + x + ',' + (top + r) +
               'Q' + x + ',' + top + ' ' + (x + r) + ',' + top +
               'L' + (x + barW - r) + ',' + top +
               'Q' + (x + barW) + ',' + top + ' ' + (x + barW) + ',' + (top + r) +
               'L' + (x + barW) + ',' + bot + 'Z';
      }
      return 'M' + x + ',' + top +
             'L' + x + ',' + (bot - r) +
             'Q' + x + ',' + bot + ' ' + (x + r) + ',' + bot +
             'L' + (x + barW - r) + ',' + bot +
             'Q' + (x + barW) + ',' + bot + ' ' + (x + barW) + ',' + (bot - r) +
             'L' + (x + barW) + ',' + top + 'Z';
    }

    values.forEach(function (v, i) {
      var cx = m.l + band * i + band / 2;
      var x = cx - barW / 2;
      var color = o.colorBySign ? (v >= 0 ? 'var(--pos)' : 'var(--neg)') : (o.color || 'var(--chart-1)');
      var p = svgEl('path', { d: barPath(x, v), style: 'fill:' + color }, svg);

      if (i % lblEvery === 0) {
        if (rotate) {
          txt(svg, cx, m.t + ph + 12, labels[i], {
            anchor: 'end', size: 10.5,
            transform: 'rotate(-34 ' + cx + ' ' + (m.t + ph + 12) + ')'
          });
        } else {
          txt(svg, cx, m.t + ph + 16, labels[i], { anchor: 'middle', size: 10.5 });
        }
      }
      if (tip) {
        var hit = svgEl('rect', { x: m.l + band * i, y: m.t, width: band, height: ph, fill: 'transparent' }, svg);
        hit.addEventListener('mousemove', function (ev) {
          p.style.opacity = '.82';
          tip.innerHTML = '<div class="tip-title">' + esc(labels[i] != null ? labels[i] : i) + '</div>' +
            '<div class="tip-row"><span class="swatch" style="background:' + color + '"></span><b>' + esc(yFmt(v)) + '</b></div>';
          var elRect = el.getBoundingClientRect();
          placeTip(el, tip, ev.clientX - elRect.left, ev.clientY - elRect.top);
        });
        hit.addEventListener('mouseleave', function () {
          p.style.opacity = '1';
          tip.style.display = 'none';
        });
      }
    });

    el.appendChild(svg);
  }

  /* ------------------------------ donut ------------------------------ */
  function donut(el, opts) { mount(el, function () { renderDonut(el, opts || {}); }); }

  function renderDonut(el, o) {
    el.innerHTML = '';
    var segs = (o.segments || []).filter(function (s) { return s && s.value > 0; });
    var total = segs.reduce(function (a, s) { return a + s.value; }, 0);
    if (!total) return renderEmpty(el);

    var SZ = 210, cx = SZ / 2, cy = SZ / 2, r = 72, sw = 26;
    var C = 2 * Math.PI * r;
    var gap = segs.length > 1 ? 3 : 0;

    var svg = svgEl('svg', { viewBox: '0 0 ' + SZ + ' ' + SZ, role: 'img' }, null);
    svg.style.width = '100%'; svg.style.maxWidth = '230px'; svg.style.margin = '0 auto'; svg.style.height = 'auto';

    var tip = makeTip(el);
    var acc = 0;
    segs.forEach(function (s, i) {
      var frac = s.value / total;
      var len = Math.max(0.6, frac * C - gap);
      var color = s.color || 'var(--chart-' + ((i % 6) + 1) + ')';
      var c = svgEl('circle', {
        cx: cx, cy: cy, r: r, fill: 'none',
        style: 'stroke:' + color + ';transition:stroke-width .12s',
        'stroke-width': sw,
        'stroke-dasharray': len.toFixed(2) + ' ' + (C - len).toFixed(2),
        'stroke-dashoffset': (-(acc + gap / 2)).toFixed(2),
        transform: 'rotate(-90 ' + cx + ' ' + cy + ')'
      }, svg);
      acc += frac * C;
      var pct = (frac * 100).toFixed(1) + '%';
      c.addEventListener('mousemove', function (ev) {
        c.setAttribute('stroke-width', sw + 5);
        tip.innerHTML = '<div class="tip-title">' + esc(s.label) + '</div>' +
          '<div class="tip-row"><span class="swatch" style="background:' + color + '"></span><b>' +
          esc(o.valueFormat ? o.valueFormat(s.value) : s.value) + '</b>&nbsp;(' + pct + ')</div>';
        var elRect = el.getBoundingClientRect();
        placeTip(el, tip, ev.clientX - elRect.left, ev.clientY - elRect.top);
      });
      c.addEventListener('mouseleave', function () {
        c.setAttribute('stroke-width', sw);
        tip.style.display = 'none';
      });
    });

    if (o.centerLabel != null) {
      txt(svg, cx, cy + 1, o.centerLabel, { anchor: 'middle', size: 25, fill: 'var(--ink)', weight: 700 });
      if (o.centerSub) txt(svg, cx, cy + 20, o.centerSub, { anchor: 'middle', size: 11, fill: 'var(--ink-3)' });
    }
    el.appendChild(svg);

    var lg = document.createElement('div');
    lg.className = 'chart-legend';
    lg.style.justifyContent = 'center';
    lg.innerHTML = segs.map(function (s, i) {
      var color = s.color || 'var(--chart-' + ((i % 6) + 1) + ')';
      return '<span class="legend-item"><span class="swatch" style="background:' + color + '"></span>' +
        esc(s.label) + ' <b class="tnum">' + esc(o.valueFormat ? o.valueFormat(s.value) : s.value) + '</b></span>';
    }).join('');
    el.appendChild(lg);
  }

  /* ------------------------------ spark ------------------------------ */
  function spark(el, points, opts) { mount(el, function () { renderSpark(el, points || [], opts || {}); }); }

  function renderSpark(el, points, o) {
    el.innerHTML = '';
    if (!points || points.length < 2) { el.innerHTML = ''; return; }
    var W = Math.max(60, el.clientWidth || 120);
    var H = o.height || 36;
    var min = Math.min.apply(null, points), max = Math.max.apply(null, points);
    if (min === max) { min -= 1; max += 1; }
    var pad = 4;
    var sx = function (i) { return pad + i / (points.length - 1) * (W - pad * 2); };
    var sy = function (v) { return pad + (1 - (v - min) / (max - min)) * (H - pad * 2); };
    var color = o.color || 'var(--accent)';
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, 'aria-hidden': 'true' }, null);
    svg.style.width = '100%'; svg.style.height = 'auto';
    var d = '';
    points.forEach(function (v, i) { d += (i ? 'L' : 'M') + sx(i).toFixed(1) + ',' + sy(v).toFixed(1); });
    svgEl('path', { d: d, style: 'fill:none;stroke:' + color + ';stroke-width:2;stroke-linecap:round;stroke-linejoin:round' }, svg);
    svgEl('circle', {
      cx: sx(points.length - 1), cy: sy(points[points.length - 1]), r: 3,
      style: 'fill:' + color + ';stroke:var(--surface);stroke-width:2'
    }, svg);
    el.appendChild(svg);
  }

  window.Charts = { line: line, bars: bars, donut: donut, spark: spark };
})();
