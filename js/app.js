/* ==========================================================================
   TradeLab — app core
   Router, theme, storage, icons, market clock, dashboard, and the generic
   renderers for the Strategy Library and Education Hub (data-driven from
   window.STRATEGY_DATA / window.EDUCATION_DATA).

   Public API (window.App) — used by feature modules:
     App.Store.get(key, fallback) / .set(key, value) / .remove(key)
     App.esc(str)                        HTML-escape user content
     App.fmtMoney(n, {sign, dec})        "$1,234.56" / "+$50.00" / "-$12.10"
     App.fmtNum(n, dec)                  "1,234.5"
     App.fmtPct(n, dec)                  n is 0–100 → "56.3%"
     App.uid()                           unique id string
     App.todayKey()                      local date "YYYY-MM-DD"
     App.tradePL(trade)                  P/L $ for a journal trade (single source)
     App.toast(msg, type)                type: 'ok' | 'err' | undefined
     App.icon(name, size)                inline SVG string
     App.navigate(hash)                  e.g. App.navigate('#/journal')
     App.download(filename, text, mime)  save a file locally
     App.etNow()                         {y,mo,d,h,mi,s,wd,dateKey} in ET
     App.marketSession()                 {state,label,sub,pct,earlyClose,holidayName}
   ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------ Store ------------------------------ */
  var Store = {
    get: function (key, fallback) {
      try {
        var v = localStorage.getItem('tdp.' + key);
        return v == null ? fallback : JSON.parse(v);
      } catch (e) { return fallback; }
    },
    set: function (key, value) {
      try { localStorage.setItem('tdp.' + key, JSON.stringify(value)); } catch (e) {}
    },
    remove: function (key) {
      try { localStorage.removeItem('tdp.' + key); } catch (e) {}
    }
  };

  /* ------------------------------ Helpers ------------------------------ */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmtNum(n, dec) {
    if (n == null || !isFinite(n)) return '–';
    return n.toLocaleString('en-US', { minimumFractionDigits: dec == null ? 0 : dec, maximumFractionDigits: dec == null ? 2 : dec });
  }
  function fmtMoney(n, opts) {
    opts = opts || {};
    if (n == null || !isFinite(n)) return '–';
    var dec = opts.dec != null ? opts.dec : 2;
    var abs = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    if (n < 0) return '-$' + abs;
    return (opts.sign ? '+$' : '$') + abs;
  }
  function fmtPct(n, dec) {
    if (n == null || !isFinite(n)) return '–';
    return n.toFixed(dec == null ? 1 : dec) + '%';
  }
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }
  function todayKey() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function tradePL(t) {
    if (!t) return 0;
    var qty = +t.qty || 0, entry = +t.entry || 0, exit = +t.exit || 0, fees = +t.fees || 0;
    var dir = t.side === 'short' ? -1 : 1;
    return (exit - entry) * qty * dir - fees;
  }
  function download(filename, text, mime) {
    var blob = new Blob([text], { type: mime || 'text/plain' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);
  }

  /* ------------------------------ Profile ------------------------------ */
  var NAME_MAX = 24;
  /* The name is echoed into the dashboard heading and can arrive from a
     restored backup, so it is never trusted: control characters out,
     whitespace collapsed, length capped. */
  function cleanName(s) {
    /* a restored backup can hold any JSON shape here; anything but a string
       (object, array, number) is not a name — drop it rather than render
       something like "[object Object]" as the greeting */
    if (typeof s !== 'string') return '';
    return s
      .replace(/[\u0000-\u001f\u007f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, NAME_MAX);
  }
  function profileName() { return cleanName(Store.get('profile.name', '')); }
  function setProfileName(s) {
    var v = cleanName(s);
    if (v) Store.set('profile.name', v); else Store.remove('profile.name');
    return v;
  }

  /* ------------------------------ Icons ------------------------------ */
  var ICONS = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h5v-6h4v6h5V9.5"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
    cap: '<path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12.3V17c0 1.7 2.7 3 6 3s6-1.3 6-3v-4.7"/>',
    journal: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/>',
    calc: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6.5h8"/><path d="M8 11h.01M12 11h.01M16 11h.01M8 14.5h.01M12 14.5h.01M16 14.5h.01M8 18h.01M12 18h.01M16 18h.01"/>',
    clipboard: '<path d="M9 2h6a1 1 0 0 1 1 1v2H8V3a1 1 0 0 1 1-1z"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 14l2 2 4-4"/>',
    quiz: '<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2.6-3 4"/><path d="M12 17.5h.01"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    print: '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M8 2v4M16 2v4M3 10h18"/>',
    chevR: '<path d="M9 18l6-6-6-6"/>',
    chevL: '<path d="M15 18l-6-6 6-6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    trash: '<path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M10 11v6M14 11v6"/>',
    edit: '<path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/>',
    downloadIc: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/>',
    uploadIc: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 8l5-5 5 5"/><path d="M12 3v12"/>',
    filter: '<path d="M22 3H2l8 9.5V19l4 2v-8.5z"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    trend: '<path d="M22 7l-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
    target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
    shield: '<path d="M12 22s8-3.6 8-10V5l-8-3-8 3v7c0 6.4 8 10 8 10z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    refresh: '<path d="M3 2v6h6"/><path d="M3.5 13a9 9 0 1 0 2-7.3L3 8"/>',
    brain: '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M9 9h.01M15 9h.01"/>',
    layers: '<path d="M12 2 2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>',
    dollar: '<path d="M12 1v22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
    cog: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>'
  };
  function icon(name, size) {
    var s = size || 18;
    return '<svg class="icon" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      (ICONS[name] || ICONS.info) + '</svg>';
  }

  /* ------------------------------ Toast ------------------------------ */
  var toastWrap = null;
  function toast(msg, type) {
    if (!toastWrap) {
      toastWrap = document.createElement('div');
      toastWrap.className = 'toast-wrap';
      document.body.appendChild(toastWrap);
    }
    var t = document.createElement('div');
    t.className = 'toast' + (type === 'ok' ? ' ok' : type === 'err' ? ' err' : '');
    t.innerHTML = (type === 'err' ? icon('alert', 16) : icon('check', 16)) + '<span>' + esc(msg) + '</span>';
    toastWrap.appendChild(t);
    setTimeout(function () {
      t.style.opacity = '0';
      t.style.transition = 'opacity .25s';
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 260);
    }, 2800);
  }

  /* ------------------------------ Market clock (ET) ------------------------------ */
  var WD = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  var etFmt = null;
  function etNow() {
    if (!etFmt) {
      etFmt = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York', hourCycle: 'h23',
        weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
    }
    var o = {};
    etFmt.formatToParts(new Date()).forEach(function (p) { o[p.type] = p.value; });
    var h = parseInt(o.hour, 10); if (h === 24) h = 0;
    return {
      y: +o.year, mo: +o.month, d: +o.day,
      h: h, mi: +o.minute, s: +o.second,
      wd: WD[o.weekday] != null ? WD[o.weekday] : 1,
      dateKey: o.year + '-' + o.month + '-' + o.day
    };
  }

  /* NYSE full-day holidays (loaded through 2027) and 1:00 PM ET early closes */
  var HOLIDAYS = {
    '2026-01-01': "New Year's Day", '2026-01-19': 'Martin Luther King Jr. Day',
    '2026-02-16': "Washington's Birthday", '2026-04-03': 'Good Friday',
    '2026-05-25': 'Memorial Day', '2026-06-19': 'Juneteenth',
    '2026-07-03': 'Independence Day (observed)', '2026-09-07': 'Labor Day',
    '2026-11-26': 'Thanksgiving Day', '2026-12-25': 'Christmas Day',
    '2027-01-01': "New Year's Day", '2027-01-18': 'Martin Luther King Jr. Day',
    '2027-02-15': "Washington's Birthday", '2027-03-26': 'Good Friday',
    '2027-05-31': 'Memorial Day', '2027-06-18': 'Juneteenth (observed)',
    '2027-07-05': 'Independence Day (observed)', '2027-09-06': 'Labor Day',
    '2027-11-25': 'Thanksgiving Day', '2027-12-24': 'Christmas Day (observed)'
  };
  var EARLY_CLOSE = { '2026-11-27': true, '2026-12-24': true, '2027-11-26': true };

  var SESS = { preStart: 240, rthStart: 570, rthEnd: 960, rthEndEarly: 780, ahEnd: 1200, ahEndEarly: 1020 };

  function pad2(n) { return String(n).padStart(2, '0'); }
  function minsLabel(mins) {
    var h = Math.floor(mins / 60), m = mins % 60;
    if (h && m) return h + 'h ' + m + 'm';
    if (h) return h + 'h';
    return m + 'm';
  }

  function marketSession() {
    var t = etNow();
    var mins = t.h * 60 + t.mi;
    var isWeekend = t.wd === 0 || t.wd === 6;
    var holidayName = HOLIDAYS[t.dateKey] || null;
    var early = !!EARLY_CLOSE[t.dateKey];
    var rthEnd = early ? SESS.rthEndEarly : SESS.rthEnd;
    var ahEnd = early ? SESS.ahEndEarly : SESS.ahEnd;
    var pct = Math.max(0, Math.min(1, (mins - SESS.preStart) / (SESS.ahEnd - SESS.preStart)));

    var res = { state: 'closed', label: 'Closed', sub: '', pct: pct, earlyClose: early, holidayName: holidayName, mins: mins, wd: t.wd };
    if (isWeekend || holidayName) {
      res.sub = holidayName ? ('Holiday — ' + holidayName) : 'Weekend';
      res.pct = null;
      return res;
    }
    if (mins >= SESS.preStart && mins < SESS.rthStart) {
      res.state = 'pre'; res.label = 'Pre-Market';
      res.sub = 'Opens in ' + minsLabel(SESS.rthStart - mins);
    } else if (mins >= SESS.rthStart && mins < rthEnd) {
      res.state = 'open'; res.label = early ? 'Open · early close' : 'Market Open';
      res.sub = 'Closes in ' + minsLabel(rthEnd - mins) + (early ? ' (1:00 PM ET)' : '');
    } else if (mins >= rthEnd && mins < ahEnd) {
      res.state = 'after'; res.label = 'After-Hours';
      res.sub = 'AH ends in ' + minsLabel(ahEnd - mins);
    } else if (mins < SESS.preStart) {
      res.sub = 'Pre-market opens in ' + minsLabel(SESS.preStart - mins);
    } else {
      res.sub = 'Reopens next trading day, 4:00 AM ET';
    }
    return res;
  }

  function nextHoliday() {
    var today = etNow().dateKey;
    var keys = Object.keys(HOLIDAYS).sort();
    for (var i = 0; i < keys.length; i++) {
      if (keys[i] >= today) return { date: keys[i], name: HOLIDAYS[keys[i]] };
    }
    return null;
  }

  /* ------------------------------ Router / nav ------------------------------ */
  var SECTIONS = [
    { id: 'dashboard',  label: 'Dashboard',            icon: 'home',      render: renderDashboard },
    { id: 'strategies', label: 'Strategy Library',     icon: 'book',      render: renderStrategies },
    { id: 'education',  label: 'Education Hub',        icon: 'cap',       render: renderEducation },
    { id: 'journal',    label: 'Trade Journal',        icon: 'journal',   render: proxyModule('Journal', 'js/journal.js') },
    { id: 'tools',      label: 'Interactive Tools',    icon: 'calc',      render: proxyModule('Tools', 'js/tools.js') },
    { id: 'checklist',  label: 'Pre-Market Checklist', icon: 'clipboard', render: proxyModule('Checklist', 'js/checklist.js') },
    { id: 'reflection', label: 'Daily Reflection',     icon: 'edit',      render: proxyModule('Diary', 'js/diary.js') },
    { id: 'quiz',       label: 'Quiz & Tests',         icon: 'quiz',      render: proxyModule('Quiz', 'js/quiz.js') },
    { id: 'backup',     label: 'Backup & Sync',        icon: 'refresh',   render: proxyModule('Backup', 'js/backup.js') },
    { id: 'settings',   label: 'Settings',             icon: 'cog',       render: proxyModule('Settings', 'js/settings.js') }
  ];

  function proxyModule(name, file) {
    return function (container, sub) {
      var M = window[name];
      if (M && typeof M.render === 'function') {
        M.render(container, sub);
      } else {
        container.innerHTML =
          '<div class="card"><div class="callout danger">' + icon('alert') +
          '<div><b>' + esc(name) + ' module failed to load.</b><br>' +
          '<span class="small muted">Expected <code>' + esc(file) + '</code> to define <code>window.' + esc(name) +
          '.render</code>. Check the browser console for script errors.</span></div></div></div>';
      }
    };
  }

  function navigate(hash) { location.hash = hash; }

  function currentRoute() {
    var h = location.hash || '#/dashboard';
    var parts = h.replace(/^#\/?/, '').split('/').filter(Boolean).map(function (s) {
      /* fail-soft: a malformed escape like '#/tools/100%' must not throw */
      try { return decodeURIComponent(s); } catch (e) { return s; }
    });
    return { id: parts[0] || 'dashboard', sub: parts.slice(1) };
  }

  function buildNav() {
    var nav = document.getElementById('nav');
    nav.innerHTML = SECTIONS.map(function (s) {
      return '<a class="nav-item" data-nav="' + s.id + '" href="#/' + s.id + '">' + icon(s.icon) + '<span>' + esc(s.label) + '</span></a>';
    }).join('');
  }

  function route() {
    var r = currentRoute();
    var sec = null;
    for (var i = 0; i < SECTIONS.length; i++) if (SECTIONS[i].id === r.id) sec = SECTIONS[i];
    if (!sec) { sec = SECTIONS[0]; r = { id: 'dashboard', sub: [] }; }

    document.querySelectorAll('.nav-item').forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('data-nav') === sec.id);
    });
    var tt = document.getElementById('topbar-title');
    if (tt) tt.textContent = sec.label;
    document.title = sec.label + ' — TradeLab';

    closeSidebar();
    var content = document.getElementById('content');
    content.innerHTML = '';
    try {
      sec.render(content, r.sub);
    } catch (err) {
      content.innerHTML = '<div class="card"><div class="callout danger">' + icon('alert') +
        '<div><b>Something went wrong rendering this page.</b><br><span class="small muted">' +
        esc(err && err.message ? err.message : String(err)) + '</span></div></div></div>';
      if (window.console) console.error(err);
    }
    window.scrollTo(0, 0);
  }

  /* Sidebar (mobile) */
  function openSidebar() {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('backdrop').hidden = false;
  }
  function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('backdrop').hidden = true;
  }

  /* Theme */
  function applyThemeIcon() {
    var cur = document.documentElement.getAttribute('data-theme');
    var btn = document.getElementById('theme-toggle');
    if (btn) {
      btn.innerHTML = icon(cur === 'dark' ? 'sun' : 'moon', 19);
      btn.setAttribute('aria-label', cur === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    }
    /* keep the browser/OS chrome color in step with the app theme (PWA) */
    var meta = document.getElementById('meta-theme-color');
    if (meta) meta.setAttribute('content', cur === 'light' ? '#f9f9f7' : '#0d0d0d');
  }
  function getTheme() {
    return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  }
  function setTheme(t) {
    var next = t === 'light' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    Store.set('theme', next);
    applyThemeIcon();
    return next;
  }
  function toggleTheme() {
    setTheme(getTheme() === 'dark' ? 'light' : 'dark');
  }

  /* ------------------------------ Dashboard ------------------------------ */
  var TIPS = [
    'Risk a fixed fraction (0.5–1%) of your account per trade. Survival funds the learning curve.',
    'Plan the trade before the open: entry, stop, target. In the moment you only execute.',
    'Three losers in a row? Step away for 15 minutes. The market will still be there.',
    'The first 5-minute candle sets the tone — let it finish before judging the open.',
    'Add to winners, never to losers. Averaging down is how small losses become account-enders.',
    'Volume confirms price. A breakout on weak volume is a fade candidate, not a signal.',
    'Journal every trade the same day. Unrecorded lessons are repurchased at full price.',
    'Trade the plan, grade the process. A losing trade that followed rules is a good trade.',
    'Size down when volatility spikes — wider stops need smaller positions for the same risk.',
    'Skip the lunch chop (11:30–14:00 ET) unless your edge specifically lives there.',
    'One good setup traded well beats five mediocre setups traded fast.',
    'Know today\'s catalysts before the bell: earnings, FOMC, CPI. Surprise is expensive.',
    'Your stop is a business cost, not a personal failure. Pay it and move on.',
    'If you can\'t define the setup in one sentence, it isn\'t a setup.',
    'Green days are for discipline too — quit while the edge is fresh, not when it\'s gone.',
    'Track your stats weekly: win rate and avg win/loss tell you what to fix next.'
  ];

  var WINDOWS = [
    { from: 240, to: 570,  t: '04:00–09:30', label: 'Pre-market',      note: 'Gappers form on news; thin liquidity — build the plan, don\'t chase.', heat: 2 },
    { from: 570, to: 600,  t: '09:30–10:00', label: 'The open',        note: 'Highest volume and volatility of the day. ORB territory.',            heat: 5 },
    { from: 600, to: 690,  t: '10:00–11:30', label: 'Morning trend',   note: 'Trends extend or reverse; pullback entries work best here.',          heat: 4 },
    { from: 690, to: 840,  t: '11:30–14:00', label: 'Lunch chop',      note: 'Volume dries up; most day traders size down or sit out.',             heat: 1 },
    { from: 840, to: 900,  t: '14:00–15:00', label: 'Afternoon setup', note: 'Ranges resolve; watch for trend re-ignition after consolidation.',    heat: 2 },
    { from: 900, to: 960,  t: '15:00–16:00', label: 'Power hour',      note: 'Volume returns; closing imbalances and MOC flows move price.',        heat: 4 }
  ];

  var EVENTS = [
    { name: 'FOMC rate decision', when: '2:00 PM ET, 8×/year (presser 2:30)', impact: 'Extreme' },
    { name: 'CPI (inflation)', when: '8:30 AM ET, monthly', impact: 'High' },
    { name: 'Nonfarm payrolls', when: '8:30 AM ET, first Friday', impact: 'High' },
    { name: 'Initial jobless claims', when: '8:30 AM ET, Thursdays', impact: 'Medium' },
    { name: 'Retail sales / PPI', when: '8:30 AM ET, monthly', impact: 'Medium' },
    { name: 'EIA crude inventories', when: '10:30 AM ET, Wednesdays', impact: 'Energy names' },
    { name: 'Triple witching (OPEX)', when: '3rd Friday of Mar / Jun / Sep / Dec', impact: 'Volume spike' }
  ];

  function fmtClock(t) {
    var h12 = t.h % 12 === 0 ? 12 : t.h % 12;
    return h12 + ':' + pad2(t.mi) + ':' + pad2(t.s) + ' ' + (t.h < 12 ? 'AM' : 'PM');
  }

  function journalSnapshot() {
    var trades = Store.get('trades', []);
    /* same shape guard as journal.js getTrades(): tolerate valid-JSON garbage */
    if (!Array.isArray(trades)) return null;
    trades = trades.filter(function (x) { return x && typeof x === 'object'; });
    if (!trades.length) return null;
    var wins = 0, gross = 0, grossW = 0, grossL = 0, cum = 0;
    var sorted = trades.slice().sort(function (a, b) {
      return (a.date || '') < (b.date || '') ? -1 : (a.date || '') > (b.date || '') ? 1 : (a.createdAt || 0) - (b.createdAt || 0);
    });
    var curve = [];
    sorted.forEach(function (t) {
      var pl = tradePL(t);
      gross += pl;
      if (pl > 0) { wins++; grossW += pl; } else if (pl < 0) { grossL += -pl; }
      cum += pl;
      curve.push(cum);
    });
    return {
      n: trades.length,
      net: gross,
      winRate: trades.length ? (wins / trades.length) * 100 : 0,
      pf: grossL > 0 ? grossW / grossL : (grossW > 0 ? Infinity : 0),
      curve: curve
    };
  }

  function renderDashboard(container) {
    /* fresh dashboard DOM → invalidate the clock-UI mutation caches */
    lastDashPillHtml = ''; lastSubText = ''; lastMarkerPos = ''; lastLit = '';
    var t = etNow();
    var snap = journalSnapshot();
    var nh = nextHoliday();
    var dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    var moNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    var tipIdx = (t.y * 366 + t.mo * 31 + t.d) % TIPS.length;

    var right;
    if (snap) {
      right =
        '<section class="card">' +
        '<div class="card-title">' + icon('trend', 15) + ' Performance snapshot</div>' +
        '<div class="kpi-row">' +
        '<div class="stat"><div class="stat-label">Net P/L</div><div class="stat-value tnum ' + (snap.net >= 0 ? 'pos' : 'neg') + '">' + fmtMoney(snap.net, { sign: true }) + '</div></div>' +
        '<div class="stat"><div class="stat-label">Win rate</div><div class="stat-value tnum">' + fmtPct(snap.winRate) + '</div></div>' +
        '<div class="stat"><div class="stat-label">Trades</div><div class="stat-value tnum">' + snap.n + '</div></div>' +
        '<div class="stat"><div class="stat-label">Profit factor</div><div class="stat-value tnum">' + (isFinite(snap.pf) ? fmtNum(snap.pf, 2) : '∞') + '</div></div>' +
        '</div>' +
        '<div id="dash-spark" style="margin-top:14px"></div>' +
        '<div class="small muted" style="margin-top:6px">Cumulative P/L · <a href="#/journal">open journal</a></div>' +
        '</section>';
    } else {
      right =
        '<section class="card">' +
        '<div class="card-title">' + icon('zap', 15) + ' Getting started</div>' +
        '<ol style="margin:0;padding-left:1.3em">' +
        '<li>Read a playbook in the <a href="#/strategies">Strategy Library</a>.</li>' +
        '<li>Cover the basics in the <a href="#/education">Education Hub</a>.</li>' +
        '<li>Size positions with the <a href="#/tools">Risk Calculator</a>.</li>' +
        '<li>Run the <a href="#/checklist">Pre-Market Checklist</a> each morning.</li>' +
        '<li>Log every trade in the <a href="#/journal">Trade Journal</a>.</li>' +
        '<li>Validate knowledge in <a href="#/quiz">Quiz &amp; Tests</a>.</li>' +
        '</ol>' +
        '</section>';
    }

    var quickLinks = [
      { id: 'strategies', icon: 'book', desc: 'ORB, Pullback and Scalping playbooks with rules, diagrams and worked examples.', stat: ((window.STRATEGY_DATA || []).length || 3) + ' playbooks' },
      { id: 'education', icon: 'cap', desc: 'Technical analysis, candlesticks, risk, psychology and session timing.', stat: ((window.EDUCATION_DATA || []).length || 5) + ' lessons' },
      { id: 'journal', icon: 'journal', desc: 'Log trades, track win rate, profit factor and your equity curve.', stat: snap ? (snap.n + ' trades · <span class="' + (snap.net >= 0 ? 'pos' : 'neg') + '">' + fmtMoney(snap.net, { sign: true }) + '</span>') : 'No trades logged yet' },
      { id: 'tools', icon: 'calc', desc: 'Position size, breakeven, Monte Carlo P/L simulator, volume profile.', stat: '4 interactive tools' },
      { id: 'checklist', icon: 'clipboard', desc: 'Daily pre-market routine plus screener criteria per strategy.', stat: checklistStat() },
      { id: 'reflection', icon: 'edit', desc: 'End-of-day diary — sleep, discipline, emotion, lessons. Reread weekly.', stat: diaryStat() },
      { id: 'quiz', icon: 'quiz', desc: 'Strategy quizzes, candlestick pattern drills and risk scenarios.', stat: quizStat() }
    ];

    container.innerHTML =
      '<div class="page-header"><h1>Good ' + (t.h < 12 ? 'morning' : t.h < 17 ? 'afternoon' : 'evening') + ', ' + nameBtnHtml() + '</h1>' +
      '<p class="lede">' + dayNames[t.wd] + ', ' + moNames[t.mo - 1] + ' ' + t.d + ', ' + t.y + ' — plan the session, protect the downside, journal the result.</p></div>' +

      '<div class="grid cols-2">' +
      '<section class="card">' +
      '<div class="spread"><div class="card-title" style="margin-bottom:0">' + icon('clock', 15) + ' US market · New York</div>' +
      '<span class="mkt-pill" id="dash-pill"><span class="dot"></span><span id="dash-pill-label"></span></span></div>' +
      '<div class="clock-big tnum" id="dash-clock" style="margin-top:10px"></div>' +
      '<div class="muted small" id="dash-session-sub" style="margin-top:2px"></div>' +
      '<div class="sess-bar">' +
      '<div class="sess-track" id="dash-track">' +
      '<div class="sess-seg pre" style="width:34.4%" title="Pre-market 4:00–9:30"></div>' +
      '<div class="sess-seg rth" style="width:40.6%" title="Regular session 9:30–16:00"></div>' +
      '<div class="sess-seg after" style="width:25%" title="After-hours 16:00–20:00"></div>' +
      '</div>' +
      '<div class="sess-marker" id="dash-marker" style="left:0%;display:none"></div>' +
      '<div class="sess-labels"><span>4:00</span><span>9:30</span><span>16:00</span><span>20:00</span></div>' +
      '</div>' +
      (nh ? '<div class="small muted" style="margin-top:10px">' + icon('calendar', 13) + ' Next market holiday: <b>' + esc(nh.name) + '</b> · ' + esc(nh.date) + '</div>' : '') +
      '</section>' +
      right +
      '</div>' +

      '<h2 style="margin:24px 0 12px">Workspaces</h2>' +
      '<div class="grid cols-3">' +
      quickLinks.map(function (q) {
        var sec = null;
        SECTIONS.forEach(function (s) { if (s.id === q.id) sec = s; });
        return '<a class="card" href="#/' + q.id + '">' +
          '<div class="row" style="margin-bottom:8px;color:var(--accent)">' + icon(q.icon, 20) +
          '<h3 style="margin:0;color:var(--ink)">' + esc(sec ? sec.label : q.id) + '</h3></div>' +
          '<p class="small" style="color:var(--ink-2);margin-bottom:10px">' + q.desc + '</p>' +
          '<div class="small muted">' + q.stat + '</div>' +
          '</a>';
      }).join('') +
      '</div>' +

      '<div class="grid cols-2" style="margin-top:16px">' +
      '<section class="card">' +
      '<div class="card-title">' + icon('zap', 15) + ' Today\'s trading windows (ET)</div>' +
      '<div id="dash-windows">' +
      WINDOWS.map(function (w, i) {
        return '<div class="window-row" data-win="' + i + '"><span class="w-time">' + w.t + '</span>' +
          '<span><b>' + w.label + '</b><span class="heat">' +
          [1, 2, 3, 4, 5].map(function (n) { return '<i class="' + (n <= w.heat ? 'on' : '') + '"></i>'; }).join('') +
          '</span><br><span class="small muted">' + w.note + '</span></span></div>';
      }).join('') +
      '</div>' +
      '</section>' +
      '<div class="stack">' +
      '<section class="card">' +
      '<div class="card-title">' + icon('calendar', 15) + ' Recurring market movers</div>' +
      '<div class="table-wrap"><table class="table"><thead><tr><th>Event</th><th>When</th><th>Impact</th></tr></thead><tbody>' +
      EVENTS.map(function (e) {
        return '<tr><td><b>' + e.name + '</b></td><td class="small">' + e.when + '</td><td><span class="badge amber">' + e.impact + '</span></td></tr>';
      }).join('') +
      '</tbody></table></div>' +
      '<p class="small muted" style="margin-top:8px">Check an economic calendar every morning — scheduled data regularly whipsaws intraday trends.</p>' +
      '</section>' +
      '<section class="card">' +
      '<div class="card-title">' + icon('info', 15) + ' Tip of the day</div>' +
      '<p style="margin:0">' + TIPS[tipIdx] + '</p>' +
      '</section>' +
      '</div>' +
      '</div>';

    if (snap && snap.curve.length > 1 && window.Charts) {
      Charts.spark(document.getElementById('dash-spark'), snap.curve, { color: snap.net >= 0 ? 'var(--pos)' : 'var(--neg)', height: 44 });
    }
    wireNameEdit(container);
    updateClockUI();
  }

  /* Greeting name — a button so it is reachable by keyboard and screen readers;
     clicking swaps it for an input in place. */
  function nameBtnHtml() {
    var n = profileName();
    return '<button type="button" class="name-edit' + (n ? '' : ' unset') + '" id="dash-name"' +
      ' title="' + (n ? 'Change your name' : 'Add your name') + '"' +
      ' aria-label="' + (n ? 'Your name: ' + esc(n) + '. Activate to change it.' : 'Add your name') + '">' +
      esc(n || 'trader') + '</button>';
  }

  function wireNameEdit(container) {
    var btn = container.querySelector('#dash-name');
    if (btn) btn.addEventListener('click', function () { startNameEdit(container); });
  }

  function startNameEdit(container) {
    var btn = container.querySelector('#dash-name');
    if (!btn) return;

    var input = document.createElement('input');
    input.type = 'text';
    input.className = 'name-input';
    input.maxLength = NAME_MAX;
    input.value = profileName();
    input.placeholder = 'your name';
    input.autocomplete = 'off';
    input.setAttribute('aria-label', 'Your name');
    btn.parentNode.replaceChild(input, btn);
    input.focus();
    input.select();

    /* blur fires when Enter/Escape swap the node back, so guard against a
       second close undoing the first one's result */
    var closed = false;
    function close(save) {
      if (closed) return;
      closed = true;
      var saved = save ? setProfileName(input.value) : profileName();
      var holder = document.createElement('span');
      holder.innerHTML = nameBtnHtml();
      var fresh = holder.firstChild;
      if (input.parentNode) input.parentNode.replaceChild(fresh, input);
      fresh.addEventListener('click', function () { startNameEdit(container); });
      if (save) {
        fresh.focus();
        toast(saved ? 'Hi, ' + saved : 'Name cleared', 'ok');
      }
    }

    input.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') { ev.preventDefault(); close(true); }
      else if (ev.key === 'Escape') { ev.preventDefault(); close(false); }
    });
    input.addEventListener('blur', function () { close(true); });
  }

  function checklistStat() {
    var M = window.Checklist;
    if (M && typeof M.progress === 'function') {
      var p = M.progress();
      if (p && p.total) return p.done + ' / ' + p.total + ' done today';
    }
    return 'Daily routine + screeners';
  }
  function quizStat() {
    var M = window.Quiz;
    if (M && typeof M.summary === 'function') {
      var s = M.summary();
      if (s) return esc(s);
    }
    return 'Quizzes & pattern drills';
  }
  function diaryStat() {
    var M = window.Diary;
    if (M && typeof M.status === 'function') {
      var s = M.status();
      if (s && s.count) {
        var bits = [s.count + (s.count === 1 ? ' entry' : ' entries')];
        if (s.streak > 1) bits.push(s.streak + '-day streak');
        if (!s.today) bits.push('not written today');
        return esc(bits.join(' · '));
      }
    }
    return 'End-of-day notes — start tonight';
  }

  /* Live clock + pill (single global ticker).
     DOM is only touched when the rendered value actually changes — the pill
     text shifts once a minute, so idle pages stay mutation-free between ticks. */
  var lastPillHtml = '', lastDashPillHtml = '', lastSubText = '', lastMarkerPos = '', lastLit = '';
  function updateClockUI() {
    var ms = marketSession();
    var pill = document.getElementById('mkt-pill');
    if (pill) {
      var ph = '<span class="dot"></span><span>' + esc(ms.label) + '</span>' +
        (ms.sub ? '<span class="pill-text-extra muted">· ' + esc(ms.sub) + '</span>' : '');
      if (ph !== lastPillHtml || pill.className !== 'mkt-pill ' + ms.state) {
        lastPillHtml = ph;
        pill.className = 'mkt-pill ' + ms.state;
        pill.innerHTML = ph;
      }
    }
    var dashPill = document.getElementById('dash-pill');
    if (dashPill) {
      var dh = '<span class="dot"></span><span>' + esc(ms.label) + '</span>';
      if (dh !== lastDashPillHtml || dashPill.className !== 'mkt-pill ' + ms.state) {
        lastDashPillHtml = dh;
        dashPill.className = 'mkt-pill ' + ms.state;
        dashPill.innerHTML = dh;
      }
    }
    var clock = document.getElementById('dash-clock');
    if (clock) {
      var ct = fmtClock(etNow()) + ' ET';
      if (clock.textContent !== ct) clock.textContent = ct;
    }
    var sub = document.getElementById('dash-session-sub');
    if (sub) {
      var st = ms.sub + (ms.earlyClose ? ' · Early close 1:00 PM ET' : '');
      if (st !== lastSubText) { lastSubText = st; sub.textContent = st; }
    }
    var marker = document.getElementById('dash-marker');
    if (marker) {
      var mp = ms.pct == null ? 'none' : (ms.pct * 100).toFixed(2);
      if (mp !== lastMarkerPos) {
        lastMarkerPos = mp;
        if (mp === 'none') { marker.style.display = 'none'; }
        else { marker.style.display = 'block'; marker.style.left = 'calc(' + mp + '% - 1px)'; }
      }
    }
    var track = document.getElementById('dash-track');
    var litKey = ms.state + '|' + Math.floor(ms.mins / 5);
    if (track && litKey !== lastLit) {
      lastLit = litKey;
      var segs = track.children;
      if (segs.length === 3) {
        segs[0].className = 'sess-seg pre' + (ms.state === 'pre' ? ' lit' : '');
        segs[1].className = 'sess-seg rth' + (ms.state === 'open' ? ' lit' : '');
        segs[2].className = 'sess-seg after' + (ms.state === 'after' ? ' lit' : '');
      }
      var wins = document.querySelectorAll('#dash-windows .window-row');
      if (wins.length) {
        var mins = ms.mins, isTradingDay = ms.wd >= 1 && ms.wd <= 5 && !ms.holidayName;
        wins.forEach(function (rowEl, i) {
          var w = WINDOWS[i];
          rowEl.classList.toggle('now', isTradingDay && mins >= w.from && mins < w.to);
        });
      }
    }
  }

  /* ------------------------------ Strategy Library ------------------------------ */
  function strategyList() { return window.STRATEGY_DATA || []; }

  function renderStrategies(container, sub) {
    var data = strategyList();
    if (sub && sub.length) {
      var strat = null;
      data.forEach(function (s) { if (s.id === sub[0]) strat = s; });
      if (strat) return renderStrategyDetail(container, strat);
    }
    if (!data.length) {
      container.innerHTML = '<div class="card empty"><h3>Strategy data not loaded</h3><p class="small">Expected <code>js/data/strategies.js</code> to define <code>window.STRATEGY_DATA</code>.</p></div>';
      return;
    }
    container.innerHTML =
      '<div class="page-header"><h1>Strategy Library</h1>' +
      '<p class="lede">Three complete day-trading playbooks. Learn one deeply before touching the next — edge comes from repetition, not variety.</p></div>' +
      '<div class="grid cols-3">' +
      data.map(function (s) {
        return '<a class="card" href="#/strategies/' + esc(s.id) + '">' +
          '<div class="row" style="margin-bottom:8px;color:var(--accent)">' + icon(s.icon || 'book', 20) +
          '<h3 style="margin:0;color:var(--ink)">' + esc(s.name) + '</h3></div>' +
          '<p class="small" style="color:var(--ink-2)">' + esc(s.tagline || '') + '</p>' +
          '<div class="meta-strip">' +
          (s.difficulty ? '<span class="badge blue">' + esc(s.difficulty) + '</span>' : '') +
          (s.timeframe ? '<span class="badge">' + esc(s.timeframe) + '</span>' : '') +
          (s.bestTime ? '<span class="badge amber">' + esc(s.bestTime) + '</span>' : '') +
          '</div>' +
          '<div class="small" style="color:var(--accent);margin-top:12px;font-weight:600">Read the playbook ' + icon('chevR', 13) + '</div>' +
          '</a>';
      }).join('') +
      '</div>' +
      '<section class="card" style="margin-top:16px">' +
      '<div class="card-title">' + icon('layers', 15) + ' At a glance</div>' +
      '<div class="table-wrap"><table class="table"><thead><tr>' +
      '<th>Strategy</th><th>Best window (ET)</th><th>Timeframe</th><th>Typical R:R</th><th>Difficulty</th></tr></thead><tbody>' +
      data.map(function (s) {
        return '<tr><td><a href="#/strategies/' + esc(s.id) + '"><b>' + esc(s.name) + '</b></a></td>' +
          '<td>' + esc(s.bestTime || '—') + '</td><td>' + esc(s.timeframe || '—') + '</td>' +
          '<td>' + esc(s.riskReward || '—') + '</td><td>' + esc(s.difficulty || '—') + '</td></tr>';
      }).join('') +
      '</tbody></table></div></section>';
  }

  function renderStrategyDetail(container, s) {
    var secs = s.sections || [];
    container.innerHTML =
      '<a class="back-link" href="#/strategies">' + icon('chevL', 14) + ' Strategy Library</a>' +
      '<div class="page-header spread">' +
      '<div><h1>' + esc(s.name) + '</h1><p class="lede">' + esc(s.tagline || '') + '</p>' +
      '<div class="meta-strip">' +
      (s.difficulty ? '<span class="badge blue">' + esc(s.difficulty) + '</span>' : '') +
      (s.timeframe ? '<span class="badge">' + icon('clock', 12) + ' ' + esc(s.timeframe) + '</span>' : '') +
      (s.bestTime ? '<span class="badge amber">' + esc(s.bestTime) + '</span>' : '') +
      (s.riskReward ? '<span class="badge green">R:R ' + esc(s.riskReward) + '</span>' : '') +
      (s.markets ? '<span class="badge violet">' + esc(s.markets) + '</span>' : '') +
      '</div></div>' +
      '<button class="btn no-print" id="print-guide">' + icon('print', 15) + ' Print guide</button>' +
      '</div>' +
      (s.overview ? '<section class="card guide-sec">' + s.overview + '</section>' : '') +
      '<div class="toc no-print" id="guide-toc">' +
      secs.map(function (x, i) { return '<button type="button" data-target="sec-' + i + '">' + esc(x.title) + '</button>'; }).join('') +
      '</div>' +
      secs.map(function (x, i) {
        return '<section class="card guide-sec" id="sec-' + i + '"><h2>' + esc(x.title) + '</h2>' + x.html + '</section>';
      }).join('') +
      '<div class="row no-print" style="margin-top:18px">' +
      '<a class="btn btn-primary" href="#/quiz">' + icon('quiz', 15) + ' Test yourself</a>' +
      '<a class="btn" href="#/journal">' + icon('journal', 15) + ' Log a ' + esc(s.short || s.name) + ' trade</a>' +
      '</div>';
    wireGuideExtras(container);
  }

  /* ------------------------------ Education Hub ------------------------------ */
  function renderEducation(container, sub) {
    var data = window.EDUCATION_DATA || [];
    if (sub && sub.length) {
      var topic = null;
      data.forEach(function (x) { if (x.id === sub[0]) topic = x; });
      if (topic) return renderEducationDetail(container, topic);
    }
    if (!data.length) {
      container.innerHTML = '<div class="card empty"><h3>Education data not loaded</h3><p class="small">Expected <code>js/data/education.js</code> to define <code>window.EDUCATION_DATA</code>.</p></div>';
      return;
    }
    container.innerHTML =
      '<div class="page-header"><h1>Education Hub</h1>' +
      '<p class="lede">The foundations under every strategy. Work top to bottom — risk management and psychology decide whether the rest ever gets to matter.</p></div>' +
      '<div class="grid cols-2">' +
      data.map(function (x) {
        return '<a class="card" href="#/education/' + esc(x.id) + '">' +
          '<div class="row" style="margin-bottom:8px;color:var(--accent)">' + icon(x.icon || 'cap', 20) +
          '<h3 style="margin:0;color:var(--ink)">' + esc(x.title) + '</h3></div>' +
          '<p class="small" style="color:var(--ink-2)">' + esc(x.blurb || '') + '</p>' +
          '<div class="row" style="margin-top:10px">' +
          (x.minutes ? '<span class="badge">' + icon('clock', 12) + ' ' + x.minutes + ' min</span>' : '') +
          '<span class="badge">' + (x.sections ? x.sections.length : 0) + ' sections</span>' +
          '</div></a>';
      }).join('') +
      '</div>';
  }

  function renderEducationDetail(container, x) {
    var secs = x.sections || [];
    container.innerHTML =
      '<a class="back-link" href="#/education">' + icon('chevL', 14) + ' Education Hub</a>' +
      '<div class="page-header spread">' +
      '<div><h1>' + esc(x.title) + '</h1><p class="lede">' + esc(x.blurb || '') + '</p></div>' +
      '<button class="btn no-print" id="print-guide">' + icon('print', 15) + ' Print lesson</button>' +
      '</div>' +
      '<div class="toc no-print" id="guide-toc">' +
      secs.map(function (sx, i) { return '<button type="button" data-target="sec-' + i + '">' + esc(sx.title) + '</button>'; }).join('') +
      '</div>' +
      secs.map(function (sx, i) {
        return '<section class="card guide-sec" id="sec-' + i + '"><h2>' + esc(sx.title) + '</h2>' + sx.html + '</section>';
      }).join('');
    wireGuideExtras(container);
  }

  function wireGuideExtras(container) {
    var toc = container.querySelector('#guide-toc');
    if (toc) {
      toc.addEventListener('click', function (ev) {
        var btn = ev.target.closest('button[data-target]');
        if (!btn) return;
        var target = container.querySelector('#' + btn.getAttribute('data-target'));
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
    var printBtn = container.querySelector('#print-guide');
    if (printBtn) printBtn.addEventListener('click', function () { window.print(); });
  }

  /* ------------------------------ Boot ------------------------------ */
  function boot() {
    buildNav();
    applyThemeIcon();

    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    document.getElementById('menu-btn').innerHTML = icon('menu', 20);
    document.getElementById('menu-btn').addEventListener('click', openSidebar);
    document.getElementById('backdrop').addEventListener('click', closeSidebar);
    var settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) settingsBtn.innerHTML = icon('cog', 19);

    window.addEventListener('hashchange', route);
    window.addEventListener('beforeprint', function () {
      document.querySelectorAll('#content details').forEach(function (d) { d.open = true; });
    });

    if (!location.hash) {
      try { history.replaceState(null, '', '#/dashboard'); } catch (e) { location.hash = '#/dashboard'; }
    }
    route();

    setInterval(updateClockUI, 1000);
    updateClockUI();

    /* PWA: register the service worker (no-op on file://). Skipped on the local
       dev server — cache-first would serve one-reload-behind files while editing;
       append ?sw=on to the URL to test the SW locally. */
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
      var devHost = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
      var forceSw = /[?&]sw=on\b/.test(location.search);
      if (devHost && !forceSw) {
        /* clean up any SW left from earlier local testing */
        navigator.serviceWorker.getRegistrations().then(function (regs) {
          regs.forEach(function (r) { r.unregister(); });
        }).catch(function () {});
      } else {
        window.addEventListener('load', function () {
          navigator.serviceWorker.register('sw.js').then(function (reg) {
            reg.addEventListener('updatefound', function () {
              var nw = reg.installing;
              if (!nw) return;
              nw.addEventListener('statechange', function () {
                if (nw.state === 'installed' && navigator.serviceWorker.controller) {
                  toast('TradeLab updated — reload for the latest version');
                }
              });
            });
          }).catch(function () { /* offline-first still works without SW */ });
        });
      }
    }
  }

  window.App = {
    Store: Store, esc: esc, fmtMoney: fmtMoney, fmtNum: fmtNum, fmtPct: fmtPct,
    uid: uid, todayKey: todayKey, tradePL: tradePL, toast: toast, icon: icon,
    navigate: navigate, download: download, etNow: etNow, marketSession: marketSession,
    NAME_MAX: NAME_MAX, profileName: profileName, setProfileName: setProfileName,
    getTheme: getTheme, setTheme: setTheme
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
