/* ==========================================================================
   TradeLab — Glossary
   Searchable, filterable dictionary of trading terms from window.GLOSSARY_DATA.
   Reference only — not financial advice.

   Public API: Glossary.render(container, sub)
   ========================================================================== */
(function () {
  'use strict';

  var CATS = { basics: 'Basics', ta: 'Technical', order: 'Orders', risk: 'Risk', psych: 'Psychology', structure: 'Market structure' };

  function terms() {
    var d = window.GLOSSARY_DATA;
    if (!Array.isArray(d)) return [];
    return d.filter(function (x) { return x && typeof x.t === 'string' && typeof x.d === 'string'; })
      .slice().sort(function (a, b) { return a.t.toLowerCase() < b.t.toLowerCase() ? -1 : 1; });
  }

  function itemHtml(x) {
    var cat = CATS[x.c] || '';
    return '<div class="gl-item" data-search="' + App.esc((x.t + ' ' + x.d).toLowerCase()) + '" data-cat="' + App.esc(x.c || '') + '">' +
      '<div class="gl-term">' + App.esc(x.t) + (cat ? ' <span class="badge">' + App.esc(cat) + '</span>' : '') + '</div>' +
      '<div class="gl-def small">' + App.esc(x.d) + '</div>' +
      '</div>';
  }

  function render(container, sub) {
    var data = terms();
    var cats = {};
    data.forEach(function (x) { if (x.c) cats[x.c] = true; });
    var chipKeys = Object.keys(cats).sort(function (a, b) { return (CATS[a] || a) < (CATS[b] || b) ? -1 : 1; });

    var root = document.createElement('div');
    root.innerHTML =
      '<div class="page-header"><h1>Glossary</h1><p class="lede">The vocabulary of the market, in plain language. Search a term or filter by topic — every definition is written for a learning trader.</p></div>' +
      '<section class="card">' +
      '<input type="search" class="input" id="gl-search" placeholder="Search terms and definitions…" aria-label="Search the glossary" style="width:100%">' +
      '<div class="gl-chips" id="gl-chips" role="group" aria-label="Filter by topic">' +
      '<button type="button" class="chip on" data-cat="">All</button>' +
      chipKeys.map(function (k) { return '<button type="button" class="chip" data-cat="' + App.esc(k) + '">' + App.esc(CATS[k] || k) + '</button>'; }).join('') +
      '</div>' +
      '<div class="gl-count small muted" id="gl-count"></div>' +
      '<div class="gl-list" id="gl-list">' + data.map(itemHtml).join('') + '</div>' +
      '<p class="gl-empty small muted" id="gl-empty" hidden>No terms match your search.</p>' +
      '</section>';

    var searchEl = root.querySelector('#gl-search');
    var listEl = root.querySelector('#gl-list');
    var countEl = root.querySelector('#gl-count');
    var emptyEl = root.querySelector('#gl-empty');
    var chipsEl = root.querySelector('#gl-chips');
    var activeCat = '';

    function apply() {
      var q = searchEl.value.trim().toLowerCase();
      var shown = 0, total = data.length;
      listEl.querySelectorAll('.gl-item').forEach(function (row) {
        var hit = (!q || row.getAttribute('data-search').indexOf(q) !== -1) &&
          (!activeCat || row.getAttribute('data-cat') === activeCat);
        row.hidden = !hit;
        if (hit) shown++;
      });
      emptyEl.hidden = shown !== 0;
      countEl.textContent = shown === total ? total + ' terms' : shown + ' of ' + total + ' terms';
    }

    searchEl.addEventListener('input', apply);
    chipsEl.addEventListener('click', function (ev) {
      var b = ev.target.closest('.chip'); if (!b) return;
      activeCat = b.getAttribute('data-cat') || '';
      chipsEl.querySelectorAll('.chip').forEach(function (c) { c.classList.toggle('on', c === b); });
      apply();
    });

    container.innerHTML = '';
    container.appendChild(root);
    apply();
  }

  window.Glossary = { render: render };
})();
