/* ==========================================================================
   TradeLab — Daily Reflection
   A one-entry-per-day diary for everything the trade journal doesn't capture:
   sleep, routine, discipline, emotion, lessons. The journal records what the
   market did; this records what you did.

   Public API:
     Diary.render(container, sub)
     Diary.status() -> {count, streak, today} (read-only, safe pre-render)
   Storage (via App.Store):
     'diary.entries'  { 'YYYY-MM-DD': {text, mood, createdAt, updatedAt} }
       mood: 0 unset · 1 rough · 2 flat · 3 good · 4 dialed-in
   ========================================================================== */
(function () {
  'use strict';

  var MAX_LEN = 20000;
  var KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

  var MOODS = [
    { v: 1, label: 'Rough',     dot: 'var(--neg)' },
    { v: 2, label: 'Flat',      dot: 'var(--warn)' },
    { v: 3, label: 'Good',      dot: 'var(--pos)' },
    { v: 4, label: 'Dialed in', dot: 'var(--accent)' }
  ];
  function moodOf(v) {
    for (var i = 0; i < MOODS.length; i++) if (MOODS[i].v === v) return MOODS[i];
    return null;
  }

  /* One nudge per day, rotating — shown as the placeholder, never saved. */
  var PROMPTS = [
    'How did the day start — sleep, food, screens on time? Did the morning set up the session or fight it?',
    'Did you follow the plan today, or did the plan follow you? Name one moment you almost broke a rule.',
    'What was the best decision you made today — not the best outcome, the best decision?',
    'What did you feel right before your worst trade today? Where did you first notice it?',
    'If tomorrow-you reads this entry before the open, what one reminder should they get?',
    'What repeated today — a habit, a mistake, an edge? Patterns only show up once they are written down.',
    'Grade the inputs, not the P/L: preparation, patience, sizing, exits. Which one needs work tomorrow?'
  ];

  var DAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MO_LONG = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

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
  function promptFor(key) {
    var d = parseKey(key);
    return PROMPTS[(d.getFullYear() + d.getMonth() + d.getDate()) % PROMPTS.length];
  }

  /* ------------------------------ Storage ------------------------------ */
  /* Entries can arrive from a merged backup, so the map is re-validated on
     read: date-shaped keys only, object values, string text, mood coerced.
     The parsed map is cached only within an editing session (so per-keystroke
     saves skip the re-parse); render() and status() always re-read storage,
     like every other module, so external writes are picked up on navigation. */
  var cache = null;

  function entries() {
    if (cache) return cache;
    var raw = App.Store.get('diary.entries', {});
    var out = {};
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      Object.keys(raw).forEach(function (k) {
        var e = raw[k];
        if (!KEY_RE.test(k) || !e || typeof e !== 'object' || typeof e.text !== 'string') return;
        var mood = Math.round(+e.mood || 0);
        out[k] = {
          text: e.text.slice(0, MAX_LEN),
          mood: (mood >= 1 && mood <= 4) ? mood : 0,
          createdAt: +e.createdAt || 0,
          updatedAt: +e.updatedAt || +e.createdAt || 0
        };
      });
    }
    cache = out;
    return out;
  }

  /* Re-read storage fresh before every mutation. Two windows (installed PWA +
     a browser tab) can both be open; trusting a session-long cache here would
     let one window's whole-map write erase entries the other just saved. The
     re-parse cost per keystroke is trivial for a personal diary. */
  function readFresh() {
    cache = null;
    return entries();
  }

  /* Verified write — App.Store.set swallows quota / private-mode failures, and
     this module's entire promise is that what you type is saved. So write
     directly and report success; a false 'Saved' is worse than no autosave. */
  function writeMap(map) {
    try {
      localStorage.setItem('tdp.diary.entries', JSON.stringify(map));
      cache = map; /* our in-memory copy now matches storage */
      return true;
    } catch (e) {
      cache = null; /* don't trust the cache after a failed write */
      return false;
    }
  }

  /* patch: {text} and/or {mood}. An entry with no text and no mood is deleted.
     Returns {ok, entry}: ok=false means the write to storage failed. */
  function saveEntry(key, patch) {
    var map = readFresh();
    var cur = map[key];
    var next = {
      text: patch.text != null ? String(patch.text).slice(0, MAX_LEN) : (cur ? cur.text : ''),
      mood: patch.mood != null ? patch.mood : (cur ? cur.mood : 0),
      createdAt: cur && cur.createdAt ? cur.createdAt : Date.now(),
      updatedAt: Date.now()
    };
    if (!next.text.trim() && !next.mood) delete map[key];
    else map[key] = next;
    var ok = writeMap(map);
    return { ok: ok, entry: map[key] || null };
  }

  function removeEntry(key) {
    var map = readFresh();
    delete map[key];
    return writeMap(map);
  }

  /* Another window wrote — drop the cache so this window's next save reads the
     current data instead of clobbering it. (No live re-render: that would steal
     focus mid-word; re-reading before the next write is the safe minimum.) */
  window.addEventListener('storage', function (e) {
    if (!e.key || e.key === 'tdp.diary.entries') cache = null;
  });

  /* ------------------------------ Status (dashboard) ------------------------------ */
  function status() {
    try {
      if (!window.App || !window.App.Store) return null;
      cache = null; /* dashboard may render long after an external write */
      var map = entries();
      var today = App.todayKey();
      var streak = 0;
      var d = parseKey(today);
      /* grace: an unwritten today doesn't break the streak until tomorrow */
      if (!map[today]) d.setDate(d.getDate() - 1);
      while (map[keyOf(d)]) { streak++; d.setDate(d.getDate() - 1); }
      return { count: Object.keys(map).length, streak: streak, today: !!map[today] };
    } catch (e) {
      return null;
    }
  }

  /* ------------------------------ Render helpers ------------------------------ */
  function countWords(t) {
    t = String(t || '').trim();
    return t ? t.split(/\s+/).length : 0;
  }

  function editorCard(key, e) {
    var isToday = key === App.todayKey();
    var moodBtns = MOODS.map(function (m) {
      return '<button type="button" class="mood-btn' + (e && e.mood === m.v ? ' on' : '') + '"' +
        ' data-mood="' + m.v + '" style="--dot:' + m.dot + '" aria-pressed="' + (e && e.mood === m.v ? 'true' : 'false') + '">' +
        '<span class="mood-dot"></span>' + m.label + '</button>';
    }).join('');
    return '<section class="card" id="dr-editor">' +
      '<div class="spread" style="flex-wrap:wrap;gap:10px">' +
      '<div class="card-title" style="margin-bottom:0">' + App.icon('edit', 15) + ' ' + App.esc(longDate(key)) +
      (isToday ? ' <span class="badge">today</span>' : '') + '</div>' +
      '<input type="date" class="input" id="dr-date" value="' + App.esc(key) + '" max="' + App.esc(App.todayKey()) + '"' +
      ' style="width:auto" aria-label="Entry date">' +
      '</div>' +
      '<div class="small muted" style="margin-top:6px">How was the day?</div>' +
      '<div class="mood-row" style="margin-top:8px">' + moodBtns + '</div>' +
      '<textarea class="textarea" id="dr-text" rows="7" maxlength="' + MAX_LEN + '"' +
      ' placeholder="' + App.esc(promptFor(key)) + '"' +
      ' style="width:100%;margin-top:12px">' + App.esc(e ? e.text : '') + '</textarea>' +
      '<div class="dr-meta small muted">' +
      '<span id="dr-words" class="tnum">' + countWords(e ? e.text : '') + ' words</span>' +
      '<span id="dr-saved" aria-live="polite"></span>' +
      '</div>' +
      '</section>';
  }

  function entryRow(key, e) {
    var m = moodOf(e.mood);
    return '<div class="dr-entry" data-key="' + App.esc(key) + '">' +
      '<div class="spread" style="gap:10px;flex-wrap:wrap;align-items:flex-start">' +
      '<div><b>' + App.esc(longDate(key)) + '</b>' +
      (m ? ' <span class="pill" style="margin-left:6px"><span class="mood-dot" style="--dot:' + m.dot + ';margin-right:5px"></span>' + m.label + '</span>' : '') +
      '</div>' +
      '<div class="row" style="gap:6px">' +
      '<button type="button" class="btn btn-sm" data-edit="' + App.esc(key) + '">' + App.icon('edit', 13) + ' Edit</button>' +
      '<button type="button" class="btn btn-sm" data-del="' + App.esc(key) + '" aria-label="Delete entry for ' + App.esc(key) + '">' + App.icon('trash', 13) + '</button>' +
      '</div></div>' +
      '<div class="dr-text small">' + App.esc(e.text) + '</div>' +
      '</div>';
  }

  /* The day currently open in the editor lives up there, not in the list —
     that keeps the list from ever showing a stale copy of what's being typed. */
  function historyCard(map, exceptKey) {
    var keys = Object.keys(map).sort().reverse().filter(function (k) { return k !== exceptKey; });
    var st = status() || { streak: 0 };
    var total = Object.keys(map).length;
    return '<section class="card">' +
      '<div class="spread" style="flex-wrap:wrap;gap:10px">' +
      '<div class="card-title" style="margin-bottom:0">' + App.icon('layers', 15) + ' Past reflections' +
      ' <span class="badge">' + total + (total === 1 ? ' entry' : ' entries') + '</span>' +
      (st.streak > 1 ? ' <span class="badge">' + App.icon('zap', 11) + ' ' + st.streak + '-day streak</span>' : '') +
      '</div>' +
      (keys.length ? '<input type="search" class="input" id="dr-search" placeholder="Search entries…" style="width:210px" aria-label="Search past entries">' : '') +
      '</div>' +
      '<div id="dr-list">' +
      (keys.length
        ? keys.map(function (k) { return entryRow(k, map[k]); }).join('')
        : '<p class="small muted" style="margin:10px 0 0">' +
          (total ? 'Older entries appear here once you have more than one day.' :
            'Nothing here yet. Tonight after the close, write three honest sentences — that\'s the whole habit.') +
          '</p>') +
      '</div>' +
      '</section>';
  }

  /* ------------------------------ Render ------------------------------ */
  var currentKey = null; /* the date open in the editor */

  function draw(container) {
    if (!currentKey || !KEY_RE.test(currentKey)) currentKey = App.todayKey();
    var map = entries();

    var root = document.createElement('div');
    root.innerHTML =
      '<div class="page-header"><h1>Daily Reflection</h1>' +
      '<p class="lede">The trade journal records what the market did. This records what you did — sleep, prep, discipline, emotion. Reread it weekly; the patterns pay for the habit.</p></div>' +
      editorCard(currentKey, map[currentKey] || null) +
      '<div style="height:14px"></div>' +
      historyCard(map, currentKey);

    var ta = root.querySelector('#dr-text');
    var savedEl = root.querySelector('#dr-saved');
    var wordsEl = root.querySelector('#dr-words');
    var savedTick = null;

    /* every keystroke is written through — nothing to lose on a crash or
       navigation; the indicator is real, driven by the verified write */
    ta.addEventListener('input', function () {
      var res = saveEntry(currentKey, { text: ta.value });
      wordsEl.textContent = countWords(ta.value) + ' words';
      clearTimeout(savedTick);
      if (!res.ok) {
        /* storage full or blocked (private mode) — tell the truth, don't
           flash a green 'Saved' over data that never persisted */
        savedEl.textContent = 'Not saved — storage full';
        savedEl.classList.remove('ok');
        savedEl.classList.add('err');
        return;
      }
      savedEl.textContent = 'Saving…';
      savedEl.classList.remove('ok', 'err');
      savedTick = setTimeout(function () {
        savedEl.textContent = 'Saved';
        savedEl.classList.add('ok');
      }, 500);
    });

    var dateIn = root.querySelector('#dr-date');
    /* max is baked in at draw time; if the page has been open across midnight
       the calendar would still cap at yesterday, so refresh it just in time */
    dateIn.addEventListener('focus', function () { dateIn.max = App.todayKey(); });
    dateIn.addEventListener('change', function () {
      var v = dateIn.value;
      if (!KEY_RE.test(v)) { dateIn.value = currentKey; return; }
      if (v > App.todayKey()) { App.toast('That day hasn\'t happened yet', 'err'); dateIn.value = currentKey; return; }
      currentKey = v;
      draw(container);
    });

    var search = root.querySelector('#dr-search');
    if (search) {
      /* filter in place — rebuilding rows would steal focus mid-word */
      search.addEventListener('input', function () {
        var q = search.value.trim().toLowerCase();
        root.querySelectorAll('#dr-list .dr-entry').forEach(function (row) {
          var hit = !q || row.textContent.toLowerCase().indexOf(q) !== -1;
          row.hidden = !hit;
        });
      });
    }

    /* delegated: mood toggle + history edit/delete */
    root.addEventListener('click', function (ev) {
      var moodBtn = ev.target.closest('.mood-btn');
      if (moodBtn && root.querySelector('#dr-editor').contains(moodBtn)) {
        var v = +moodBtn.getAttribute('data-mood') || 0;
        var cur = readFresh()[currentKey];
        var next = (cur && cur.mood === v) ? 0 : v; /* click active = clear */
        var res = saveEntry(currentKey, { mood: next });
        if (!res.ok) { App.toast('Couldn\'t save — storage full or blocked', 'err'); return; }
        root.querySelectorAll('#dr-editor .mood-btn').forEach(function (b) {
          var on = +b.getAttribute('data-mood') === next;
          b.classList.toggle('on', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        return;
      }
      var editBtn = ev.target.closest('[data-edit]');
      if (editBtn) {
        currentKey = editBtn.getAttribute('data-edit');
        draw(container);
        var ed = container.querySelector('#dr-editor');
        if (ed) ed.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      var delBtn = ev.target.closest('[data-del]');
      if (delBtn) {
        var k = delBtn.getAttribute('data-del');
        if (window.confirm('Delete the reflection for ' + longDate(k) + '? This cannot be undone.')) {
          var ok = removeEntry(k);
          App.toast(ok ? 'Entry deleted' : 'Couldn\'t update storage', ok ? 'ok' : 'err');
          draw(container);
        }
      }
    });

    container.innerHTML = '';
    container.appendChild(root);
  }

  function render(container, sub) {
    /* fresh navigation always opens on today; sub-routes unused */
    cache = null;
    currentKey = App.todayKey();
    draw(container);
  }

  window.Diary = { render: render, status: status };
})();
