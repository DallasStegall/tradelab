/* ============================================================================
   TradeLab — Backup & Sync
   Full-app backup (every tdp.* key) as a downloadable file or a copy-paste
   "sync code", with Merge / Replace restore. Keeps the app 100% offline:
   data moves between devices only when the user moves it.
   ============================================================================ */
(function () {
  'use strict';

  var PREFIX = 'tdp.';
  var CODE_TAG = 'TLB1.';
  var MAX_CODE_LEN = 5 * 1024 * 1024; /* 5 MB of base64 — far above any real backup */

  /* ------------------------------ collect / validate ------------------------------ */

  function collect() {
    var data = {};
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k.indexOf(PREFIX) === 0) {
        try { data[k.slice(PREFIX.length)] = JSON.parse(localStorage.getItem(k)); }
        catch (e) { /* unparseable entries are not worth carrying */ }
      }
    }
    return data;
  }

  function payload() {
    return {
      app: 'tradelab',
      kind: 'backup',
      version: 1,
      exportedAt: new Date().toISOString(),
      data: collect()
    };
  }

  function validate(obj) {
    return !!(obj && obj.app === 'tradelab' && obj.kind === 'backup' &&
      obj.data && typeof obj.data === 'object' && !Array.isArray(obj.data));
  }

  /* base64 with unicode safety (btoa alone chokes on non-latin1) */
  function encode(json) {
    return CODE_TAG + btoa(unescape(encodeURIComponent(json)));
  }
  function decode(code) {
    code = String(code || '').trim().replace(/\s+/g, '');
    if (code.indexOf(CODE_TAG) === 0) code = code.slice(CODE_TAG.length);
    if (!code || code.length > MAX_CODE_LEN) throw new Error('Sync code is empty or too large.');
    return decodeURIComponent(escape(atob(code)));
  }

  function cleanTrades(arr) {
    if (!Array.isArray(arr)) return [];
    return arr.filter(function (t) { return t && typeof t === 'object'; })
      .map(function (t) { if (!t.id) t.id = App.uid(); return t; });
  }

  /* ------------------------------ summary ------------------------------ */

  function describe(data) {
    var out = [];
    var trades = cleanTrades(data.trades);
    if (trades.length) {
      var net = 0;
      trades.forEach(function (t) { net += App.tradePL(t); });
      out.push(trades.length + ' trade' + (trades.length === 1 ? '' : 's') + ' (net ' + App.fmtMoney(net) + ')');
    }
    var qs = data['quiz.scores'];
    if (qs && typeof qs === 'object' && !Array.isArray(qs)) {
      var banks = Object.keys(qs).length;
      if (banks) out.push('quiz scores for ' + banks + ' bank' + (banks === 1 ? '' : 's'));
    }
    var hist = data['checklist.history'];
    if (hist && typeof hist === 'object' && !Array.isArray(hist)) {
      var days = Object.keys(hist).length;
      if (days) out.push(days + ' checklist day' + (days === 1 ? '' : 's'));
    }
    var dr = data['diary.entries'];
    if (dr && typeof dr === 'object' && !Array.isArray(dr)) {
      var dn = Object.keys(dr).length;
      if (dn) out.push(dn + ' reflection' + (dn === 1 ? '' : 's'));
    }
    if (data['checklist.state'] && data['checklist.state'].date) out.push('today’s checklist');
    if (data['tools.inputs']) out.push('tool inputs');
    if (data['journal.filters']) out.push('journal filters');
    if (data.theme) out.push(data.theme + ' theme');
    /* a backup can carry any shape here — only describe a real string */
    var nm = data['profile.name'];
    if (typeof nm === 'string' && nm.trim()) out.push('name (' + nm.trim().slice(0, 24) + ')');
    return out.length ? out.join(' · ') : 'no saved data';
  }

  /* ------------------------------ apply: replace / merge ------------------------------ */

  /* App.Store.set silently swallows storage failures (quota, privacy mode);
     a restore must never claim success it can't verify, so writes here go
     through put() and any failure aborts the success toast + reload. */
  var writeFailed = false;
  function put(key, value) {
    try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); }
    catch (e) { writeFailed = true; }
  }

  function applyReplace(data) {
    /* the confirm dialog promises ALL data is replaced — so clear every
       tdp.* key first, then write only what the backup contains */
    var doomed = [];
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k.indexOf(PREFIX) === 0) doomed.push(k);
    }
    doomed.forEach(function (k) { try { localStorage.removeItem(k); } catch (e) {} });
    Object.keys(data).forEach(function (k) {
      put(k, data[k]);
    });
  }

  function applyMerge(inc) {
    /* trades — union by id; on the same id the most recently edited copy wins
       (updatedAt, falling back to createdAt), ties keep this device.
       Object.create(null): a trade id like "__proto__" must be a plain key. */
    var cur = cleanTrades(App.Store.get('trades', []));
    var incTrades = cleanTrades(inc.trades);
    if (incTrades.length) {
      var byId = Object.create(null);
      cur.forEach(function (t) { byId[t.id] = t; });
      incTrades.forEach(function (t) {
        var mine = byId[t.id];
        var tStamp = +t.updatedAt || +t.createdAt || 0;
        var mStamp = mine ? (+mine.updatedAt || +mine.createdAt || 0) : -1;
        if (!mine || tStamp > mStamp) byId[t.id] = t;
      });
      var merged = Object.keys(byId).map(function (id) { return byId[id]; });
      put('trades', merged);
    }

    /* quiz scores — per bank keep the best of both worlds */
    var incQ = inc['quiz.scores'];
    if (incQ && typeof incQ === 'object' && !Array.isArray(incQ)) {
      var curQ = App.Store.get('quiz.scores', {});
      if (!curQ || typeof curQ !== 'object' || Array.isArray(curQ)) curQ = {};
      Object.keys(incQ).forEach(function (bank) {
        var a = curQ[bank], b = incQ[bank];
        if (!b || typeof b !== 'object') return;
        if (!a || typeof a !== 'object') { curQ[bank] = b; return; }
        curQ[bank] = {
          best: Math.max(a.best || 0, b.best || 0),
          last: (a.last != null) ? a.last : b.last,
          attempts: Math.max(a.attempts || 0, b.attempts || 0)
        };
      });
      put('quiz.scores', curQ);
    }

    /* diary — union by date; on the same day the most recently edited copy
       wins (updatedAt, falling back to createdAt), ties keep this device */
    var incD = inc['diary.entries'];
    if (incD && typeof incD === 'object' && !Array.isArray(incD)) {
      var curD = App.Store.get('diary.entries', {});
      if (!curD || typeof curD !== 'object' || Array.isArray(curD)) curD = {};
      Object.keys(incD).forEach(function (d) {
        /* key shape gate: also blocks "__proto__" and friends from a hostile code */
        if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return;
        var a = curD[d], b = incD[d];
        if (!b || typeof b !== 'object' || typeof b.text !== 'string') return;
        var bS = +b.updatedAt || +b.createdAt || 0;
        var aS = a ? (+a.updatedAt || +a.createdAt || 0) : -1;
        if (!a || bS > aS) curD[d] = b;
      });
      put('diary.entries', curD);
    }

    /* checklist history — union by date, keep the higher completion */
    var incH = inc['checklist.history'];
    if (incH && typeof incH === 'object' && !Array.isArray(incH)) {
      var curH = App.Store.get('checklist.history', {});
      if (!curH || typeof curH !== 'object' || Array.isArray(curH)) curH = {};
      Object.keys(incH).forEach(function (d) {
        var a = curH[d], b = incH[d];
        if (!b || typeof b !== 'object') return;
        if (!a || (b.done || 0) > (a.done || 0)) curH[d] = b;
      });
      put('checklist.history', curH);
    }

    /* today's checklist — union the ticked boxes if both are from today */
    var incS = inc['checklist.state'];
    if (incS && typeof incS === 'object' && incS.date === App.todayKey()) {
      var curS = App.Store.get('checklist.state', null);
      if (curS && typeof curS === 'object' && curS.date === App.todayKey()) {
        var checked = {};
        Object.keys(curS.checked || {}).forEach(function (k) { checked[k] = true; });
        Object.keys(incS.checked || {}).forEach(function (k) { checked[k] = true; });
        put('checklist.state', { date: curS.date, checked: checked, toasted: !!(curS.toasted || incS.toasted) });
      } else {
        /* the stored state may hold an earlier, not-yet-archived day —
           archive it into history before overwriting, like checklist.js does */
        if (window.Checklist && Checklist.archiveIfStale) Checklist.archiveIfStale();
        put('checklist.state', incS);
      }
    }

    /* device preferences (name, theme, filters, tool inputs) — only fill gaps,
       never overwrite this device's own choices on a merge */
    ['profile.name', 'theme', 'journal.filters', 'tools.inputs'].forEach(function (k) {
      if (inc[k] != null && App.Store.get(k, null) == null) put(k, inc[k]);
    });
  }

  function applyBackup(obj, mode) {
    writeFailed = false;
    if (mode === 'replace') applyReplace(obj.data);
    else applyMerge(obj.data);
    if (writeFailed) {
      App.toast('Restore failed — the browser blocked storage (full or private mode). Keep your backup file safe and try again.', 'err');
      return;
    }
    App.toast(mode === 'replace' ? 'Backup restored — reloading…' : 'Backups merged — reloading…', 'ok');
    setTimeout(function () { location.reload(); }, 900);
  }

  /* ------------------------------ clipboard ------------------------------ */

  function copyText(text, done) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
    } else {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta);
      done(ok);
    }
  }

  /* ------------------------------ render ------------------------------ */

  var pending = null; /* parsed backup awaiting a Merge/Replace decision */

  function render(container) {
    var mine = collect();

    var html = '';
    html += '<div class="page-header"><h1>Backup &amp; Sync</h1>' +
      '<p class="muted">Move your journal, scores and settings between this computer and your phone. ' +
      'Everything stays offline — data only travels when you carry it.</p></div>';

    /* this device */
    html += '<section class="card">' +
      '<div class="card-title">' + App.icon('shield', 15) + ' On this device</div>' +
      '<p style="margin:6px 0 0">' + App.esc(describe(mine)) + '</p>' +
      '<p class="small muted" style="margin-top:8px">Saved in this browser’s local storage. Clearing browser data erases it — keep a backup file somewhere safe.</p>' +
      '</section>';

    /* backup file */
    html += '<section class="card">' +
      '<div class="card-title">' + App.icon('downloadIc', 15) + ' Backup file</div>' +
      '<p class="small muted" style="margin:4px 0 12px">One file containing everything. Save it to cloud storage, email it to yourself, or move it by USB.</p>' +
      '<div class="row" style="flex-wrap:wrap;gap:10px">' +
      '<button class="btn btn-primary" id="bk-export">' + App.icon('downloadIc', 15) + ' Download backup</button>' +
      (navigator.share ? '<button class="btn" id="bk-share">' + App.icon('uploadIc', 15) + ' Share backup…</button>' : '') +
      '<label class="btn" for="bk-file" style="cursor:pointer">' + App.icon('uploadIc', 15) + ' Restore from file…</label>' +
      '<input type="file" id="bk-file" accept=".json,application/json" style="display:none">' +
      '</div>' +
      '</section>';

    /* sync code */
    html += '<section class="card">' +
      '<div class="card-title">' + App.icon('refresh', 15) + ' Sync code (phone ↔ computer)</div>' +
      '<p class="small muted" style="margin:4px 0 12px">Generate a code here, send it to yourself in any messaging app, then paste it on the other device. No account needed.</p>' +
      '<div class="row" style="flex-wrap:wrap;gap:10px;margin-bottom:10px">' +
      '<button class="btn btn-primary" id="bk-gen">Generate code</button>' +
      '<button class="btn" id="bk-copy" disabled>Copy code</button>' +
      '</div>' +
      '<textarea id="bk-out" class="textarea" rows="3" readonly placeholder="Your sync code appears here…" style="width:100%;font-family:var(--mono, monospace);font-size:.72rem"></textarea>' +
      '<div style="margin-top:16px">' +
      '<label class="small" for="bk-in" style="font-weight:600">Received a code from your other device?</label>' +
      '<textarea id="bk-in" class="textarea" rows="3" placeholder="Paste the sync code here…" style="width:100%;margin-top:6px;font-family:var(--mono, monospace);font-size:.72rem"></textarea>' +
      '<button class="btn" id="bk-apply" style="margin-top:10px">Apply sync code</button>' +
      '</div>' +
      '</section>';

    /* confirmation panel (hidden until a backup is loaded) */
    html += '<section class="card" id="bk-confirm" hidden>' +
      '<div class="card-title">' + App.icon('alert', 15) + ' Confirm restore</div>' +
      '<p id="bk-confirm-desc" style="margin:6px 0 12px"></p>' +
      '<div class="row" style="flex-wrap:wrap;gap:10px">' +
      '<button class="btn btn-primary" id="bk-merge">Merge into this device</button>' +
      '<button class="btn" id="bk-replace">Replace this device’s data</button>' +
      '<button class="btn" id="bk-cancel">Cancel</button>' +
      '</div>' +
      '<p class="small muted" style="margin-top:10px"><b>Merge</b> combines both devices (trades united by id, best quiz scores kept, checklist history joined) and never touches this device’s theme or settings. ' +
      '<b>Replace</b> overwrites this device with the backup.</p>' +
      '</section>';

    /* how to */
    html += '<section class="card">' +
      '<div class="card-title">' + App.icon('info', 15) + ' Keeping phone and computer in sync</div>' +
      '<ol style="margin:8px 0 0 18px;line-height:1.9">' +
      '<li>On the device with the newest data, tap <b>Generate code</b> → <b>Copy code</b>.</li>' +
      '<li>Send it to yourself — WhatsApp, email, Telegram, notes app, anything.</li>' +
      '<li>On the other device, paste it under <b>Apply sync code</b> and choose <b>Merge</b>.</li>' +
      '<li>Do this whenever you’ve logged trades you want on both devices. Merging twice is harmless — trades are matched by id, nothing duplicates.</li>' +
      '</ol>' +
      '</section>';

    container.innerHTML = '<div class="wrap">' + html + '</div>';

    /* ------------------------------ events ------------------------------ */

    var codeOut = container.querySelector('#bk-out');
    var copyBtn = container.querySelector('#bk-copy');

    function offerConfirm(obj, sourceLabel) {
      pending = obj;
      var panel = container.querySelector('#bk-confirm');
      var when = obj.exportedAt ? new Date(obj.exportedAt) : null;
      container.querySelector('#bk-confirm-desc').innerHTML =
        'Backup from <b>' + App.esc(sourceLabel) + '</b>' +
        (when && !isNaN(+when) ? ' (exported ' + App.esc(when.toLocaleString()) + ')' : '') +
        ' contains: <b>' + App.esc(describe(obj.data)) + '</b>.';
      panel.hidden = false;
      panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    container.querySelector('#bk-export').addEventListener('click', function () {
      var p = payload();
      App.download('tradelab-backup-' + App.todayKey() + '.json', JSON.stringify(p, null, 2), 'application/json');
      App.toast('Backup downloaded', 'ok');
    });

    var shareBtn = container.querySelector('#bk-share');
    if (shareBtn) {
      shareBtn.addEventListener('click', function () {
        var json = JSON.stringify(payload(), null, 2);
        var shared = false;
        try {
          var file = new File([json], 'tradelab-backup-' + App.todayKey() + '.json', { type: 'application/json' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            shared = true;
            navigator.share({ files: [file], title: 'TradeLab backup' }).catch(function () {});
          }
        } catch (e) {}
        if (!shared) {
          navigator.share({ title: 'TradeLab backup', text: encode(JSON.stringify(payload())) })
            .catch(function (err) {
              /* AbortError = user closed the share sheet; anything else is a real failure */
              if (!err || err.name !== 'AbortError') {
                App.toast('Sharing failed — use Download backup or Copy code instead', 'err');
              }
            });
        }
      });
    }

    container.querySelector('#bk-file').addEventListener('change', function () {
      var f = this.files && this.files[0];
      this.value = '';
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var obj = JSON.parse(String(reader.result));
          if (!validate(obj)) throw new Error('Not a TradeLab backup file.');
          if ('trades' in obj.data) obj.data.trades = cleanTrades(obj.data.trades);
          offerConfirm(obj, f.name);
        } catch (e) {
          App.toast('Could not read that file: ' + (e.message || 'invalid JSON'), 'err');
        }
      };
      reader.onerror = function () { App.toast('Could not read that file.', 'err'); };
      reader.readAsText(f);
    });

    container.querySelector('#bk-gen').addEventListener('click', function () {
      var code = encode(JSON.stringify(payload()));
      codeOut.value = code;
      copyBtn.disabled = false;
      App.toast('Sync code ready (' + Math.round(code.length / 1024) + ' KB)', 'ok');
    });

    copyBtn.addEventListener('click', function () {
      if (!codeOut.value) return;
      copyText(codeOut.value, function (ok) {
        if (ok) { App.toast('Copied — paste it on your other device', 'ok'); }
        else {
          codeOut.focus(); codeOut.select();
          App.toast('Copy blocked — the code is selected, press Ctrl/Cmd+C', 'err');
        }
      });
    });

    container.querySelector('#bk-apply').addEventListener('click', function () {
      var raw = container.querySelector('#bk-in').value;
      if (!raw.trim()) { App.toast('Paste a sync code first', 'err'); return; }
      try {
        var obj = JSON.parse(decode(raw));
        if (!validate(obj)) throw new Error('bad payload');
        if ('trades' in obj.data) obj.data.trades = cleanTrades(obj.data.trades);
        offerConfirm(obj, 'sync code');
      } catch (e) {
        App.toast('That doesn’t look like a valid TradeLab sync code.', 'err');
      }
    });

    container.querySelector('#bk-merge').addEventListener('click', function () {
      if (pending) applyBackup(pending, 'merge');
    });
    container.querySelector('#bk-replace').addEventListener('click', function () {
      if (!pending) return;
      if (confirm('Replace ALL TradeLab data on this device with the backup? This cannot be undone.')) {
        applyBackup(pending, 'replace');
      }
    });
    container.querySelector('#bk-cancel').addEventListener('click', function () {
      pending = null;
      container.querySelector('#bk-confirm').hidden = true;
    });
  }

  window.Backup = { render: render };
})();
