/* ==========================================================================
   TradeLab — Settings
   The one place for app-wide preferences: display name, theme, and data
   management. Everything here reads/writes the same 'tdp.' localStorage the
   rest of the app uses, so changes show up everywhere on next render.

   Public API:
     Settings.render(container, sub)
   ========================================================================== */
(function () {
  'use strict';

  /* Wipe every TradeLab key. Scoped to the 'tdp.' prefix so a shared origin
     (github.io hosts many apps) never loses a neighbour's data. */
  function clearAll() {
    var doomed = [];
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k.indexOf('tdp.') === 0) doomed.push(k);
    }
    doomed.forEach(function (k) { try { localStorage.removeItem(k); } catch (e) {} });
    return doomed.length;
  }

  /* ------------------------------ Sections ------------------------------ */

  function profileCard() {
    var name = App.profileName();
    return '<section class="card">' +
      '<div class="card-title">' + App.icon('journal', 15) + ' Your name</div>' +
      '<p class="small muted" style="margin:4px 0 12px">Used in the dashboard greeting. Stored on this device and included in your backups. Leave it blank to just be “trader”.</p>' +
      '<div class="field-row">' +
      '<input type="text" class="input" id="set-name" maxlength="' + App.NAME_MAX + '"' +
      ' value="' + App.esc(name) + '" placeholder="your name" autocomplete="off"' +
      ' aria-label="Display name" style="max-width:280px">' +
      '<button type="button" class="btn btn-primary" id="set-name-save">Save name</button>' +
      '</div>' +
      '<p class="small muted" style="margin:10px 0 0">Preview: <b id="set-name-preview">' +
      App.esc('Good evening, ' + (name || 'trader')) + '</b></p>' +
      '</section>';
  }

  function appearanceCard() {
    var cur = App.getTheme();
    var opt = function (val, label, ic) {
      return '<button type="button" class="seg-btn' + (cur === val ? ' on' : '') + '"' +
        ' data-theme="' + val + '" aria-pressed="' + (cur === val ? 'true' : 'false') + '">' +
        App.icon(ic, 15) + ' ' + label + '</button>';
    };
    return '<section class="card">' +
      '<div class="card-title">' + App.icon('sun', 15) + ' Appearance</div>' +
      '<p class="small muted" style="margin:4px 0 12px">Choose a theme. This matches the toggle in the top bar and is remembered on this device.</p>' +
      '<div class="seg" id="set-theme">' + opt('light', 'Light', 'sun') + opt('dark', 'Dark', 'moon') + '</div>' +
      '</section>';
  }

  function dataCard() {
    return '<section class="card">' +
      '<div class="card-title">' + App.icon('shield', 15) + ' Your data</div>' +
      '<p class="small muted" style="margin:4px 0 12px">Everything you enter — trades, reflections, quiz scores, checklists — stays in this browser. Nothing is sent anywhere. To move it to another device or keep a copy safe, use Backup &amp; Sync.</p>' +
      '<a class="btn" href="#/backup">' + App.icon('refresh', 15) + ' Open Backup &amp; Sync</a>' +
      '</section>';
  }

  function dangerCard() {
    return '<section class="card danger-card">' +
      '<div class="card-title">' + App.icon('alert', 15) + ' Danger zone</div>' +
      '<p class="small muted" style="margin:4px 0 12px">Permanently erase <b>all</b> TradeLab data on this device: trades, reflections, quiz scores, checklists, your name and settings. This cannot be undone. Export a backup first if you might want it back.</p>' +
      '<button type="button" class="btn btn-danger" id="set-clear">' + App.icon('trash', 15) + ' Erase all data</button>' +
      '</section>';
  }

  function aboutCard() {
    return '<section class="card">' +
      '<div class="card-title">' + App.icon('info', 15) + ' About</div>' +
      '<p class="small" style="margin:6px 0 0">TradeLab — an offline day-trading study &amp; practice platform. Works fully offline and installs to your home screen.</p>' +
      '<p class="small muted" style="margin:8px 0 0">Educational purposes only. Nothing here is financial advice. You are responsible for your own trading decisions.</p>' +
      '</section>';
  }

  /* ------------------------------ Render ------------------------------ */

  function draw(container) {
    var root = document.createElement('div');
    root.innerHTML =
      '<div class="page-header"><h1>Settings</h1>' +
      '<p class="lede">Your name, the app’s look, and what happens to your data. All of it stays on this device.</p></div>' +
      '<div class="stack">' +
      profileCard() +
      appearanceCard() +
      dataCard() +
      aboutCard() +
      dangerCard() +
      '</div>';

    /* ---- name ---- */
    var nameInput = root.querySelector('#set-name');
    var preview = root.querySelector('#set-name-preview');
    function refreshPreview() {
      /* mirror the greeting's cleaning without persisting — esc() keeps it inert */
      var v = nameInput.value.replace(/\s+/g, ' ').trim().slice(0, App.NAME_MAX);
      preview.textContent = 'Good evening, ' + (v || 'trader');
    }
    function saveName() {
      var saved = App.setProfileName(nameInput.value);
      nameInput.value = saved;
      refreshPreview();
      App.toast(saved ? 'Name saved — hi, ' + saved : 'Name cleared', 'ok');
    }
    nameInput.addEventListener('input', refreshPreview);
    nameInput.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') { ev.preventDefault(); saveName(); }
    });
    root.querySelector('#set-name-save').addEventListener('click', saveName);

    /* ---- theme ---- */
    root.querySelector('#set-theme').addEventListener('click', function (ev) {
      var btn = ev.target.closest('.seg-btn');
      if (!btn) return;
      var val = btn.getAttribute('data-theme');
      App.setTheme(val);
      root.querySelectorAll('#set-theme .seg-btn').forEach(function (b) {
        var on = b.getAttribute('data-theme') === val;
        b.classList.toggle('on', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    });

    /* ---- danger: erase all ---- */
    root.querySelector('#set-clear').addEventListener('click', function () {
      if (!window.confirm('Erase ALL TradeLab data on this device? This deletes every trade, reflection, quiz score and setting. It cannot be undone.')) return;
      if (!window.confirm('Are you absolutely sure? There is no way to recover this unless you exported a backup.')) return;
      clearAll();
      App.toast('All data erased — reloading…', 'ok');
      setTimeout(function () { location.reload(); }, 800);
    });

    container.innerHTML = '';
    container.appendChild(root);
  }

  function render(container, sub) {
    draw(container);
  }

  window.Settings = { render: render };
})();
