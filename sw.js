/* TradeLab service worker — offline caching + silent updates.
   Bump VERSION on every deploy so clients pick up new files. */
'use strict';

var VERSION = 'tradelab-v4';
var ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './js/charts.js',
  './js/data/strategies.js',
  './js/data/education.js',
  './js/checklist.js',
  './js/journal.js',
  './js/tools.js',
  './js/quiz.js',
  './js/backup.js',
  './js/app.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(VERSION).then(function (cache) {
      /* bypass the HTTP cache — precaching a heuristically-cached stale file
         would freeze the old version into the new SW's cache */
      return cache.addAll(ASSETS.map(function (u) {
        return new Request(u, { cache: 'no-cache' });
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        /* only touch our own caches — the origin (github.io) may host other apps */
        if (k.indexOf('tradelab-') === 0 && k !== VERSION) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== location.origin) return;

  if (req.mode === 'navigate') {
    /* pages: network first (fresh HTML when online), cached shell offline.
       Refresh the cached shell ONLY from a clean 200 for the app's own path —
       a 404 page or a redirected response stored here would poison every
       offline launch (browsers refuse redirected responses for navigations). */
    var scopePath = new URL('./', location.href).pathname;
    e.respondWith(
      fetch(req).then(function (res) {
        var isShell = url.pathname === scopePath || url.pathname === scopePath + 'index.html';
        if (res && res.ok && !res.redirected && isShell) {
          var copy = res.clone();
          caches.open(VERSION).then(function (c) { c.put('./index.html', copy); });
        }
        return res;
      }).catch(function () {
        return caches.match('./index.html', { ignoreSearch: true });
      })
    );
    return;
  }

  /* assets: cache first, refresh the cache in the background */
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(function (cached) {
      var refresh = fetch(req, { cache: 'no-cache' }).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(VERSION).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () { return null; });
      return cached || refresh.then(function (res) {
        return res || new Response('Offline', { status: 503, statusText: 'Offline' });
      });
    })
  );
});
