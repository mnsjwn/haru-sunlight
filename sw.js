/* 서비스 워커 — 오프라인 캐시 (앱 셸)
   예보 데이터는 localStorage에 따로 캐시된다 (§8 하루 1회 호출) */
var CACHE = 'sunrx-v1';
var SHELL = [
  './', './index.html', './manifest.json', './icon.svg',
  './css/style.css',
  './core/solar.js', './core/engine.js', './core/store.repo.js',
  './core/kma.geo.js', './core/providers/kma.provider.js',
  './core/weather.api.js', './core/prescription.js',
  './shared/ui.js', './shared/chart.js', './shared/notify.js', './shared/app.js',
  './features/onboarding/onboarding.service.js', './features/onboarding/onboarding.view.js',
  './features/home/home.service.js', './features/home/home.view.js',
  './features/timer/timer.service.js', './features/timer/timer.view.js',
  './features/weekly/weekly.service.js', './features/weekly/weekly.view.js',
  './features/settings/settings.service.js', './features/settings/settings.view.js'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(SHELL.map(function (u) {
      return c.add(u).catch(function () {});
    }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; })
      .map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;

  /* 예보 API는 항상 네트워크 우선 (실패 시 앱이 localStorage 캐시로 폴백) */
  if (url.hostname.indexOf('apis.data.go.kr') >= 0) return;

  e.respondWith(
    caches.match(e.request).then(function (hit) {
      return hit || fetch(e.request).then(function (res) {
        if (res.ok && url.origin === location.origin) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        }
        return res;
      }).catch(function () { return caches.match('./index.html'); });
    })
  );
});
