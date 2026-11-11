/* Service worker do FeiraUP: guarda o app no aparelho para abrir sem internet.
   Só trata arquivos do próprio app; chamadas ao Supabase passam direto (a sincronização é feita pelo app). */
var BUILD = '186c1ae820';
var CACHE = 'controle-cestas-' + BUILD;
var SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png',
  './icons/icon-maskable-512.png', './icons/apple-touch-icon.png', './icons/favicon.svg', './icons/favicon-32.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf('controle-cestas-') === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  var key = req.mode === 'navigate' ? './index.html' : req;
  // abre na hora com a cópia guardada e atualiza em segundo plano para a próxima abertura
  e.respondWith(caches.open(CACHE).then(function (cache) {
    return cache.match(key, { ignoreSearch: true }).then(function (hit) {
      var net = fetch(req).then(function (res) {
        if (res && res.ok) cache.put(key, res.clone());
        return res;
      }).catch(function () { return null; });
      if (hit) { e.waitUntil(net); return hit; }
      return net.then(function (res) { return res || new Response('Sem conexão e este arquivo ainda não foi guardado.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }); });
    });
  }));
});
