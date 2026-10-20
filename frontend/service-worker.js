// Service worker do Breshopper.
// Todos os caminhos são relativos: o site roda em um subcaminho no GitHub Pages (/prjBreshooper/).
// Ao criar ou renomear arquivos, atualize ASSETS e incremente CACHE.
const CACHE = "breshopper-v8";
const ASSETS = [
  "./", "./index.html", "./manifest.json", "./css/global.css",
  "./js/main.js", "./js/config.js",
  "./js/services/api.js", "./js/services/auth.js", "./js/services/session.js", "./js/services/store.js", "./js/services/finance.js",
  "./js/views/ui.js", "./js/views/authViews.js", "./js/views/homeView.js", "./js/views/operatorViews.js", "./js/views/financeViews.js",
  "./js/controllers/loginController.js", "./js/controllers/homeController.js", "./js/controllers/operatorController.js",
  "./icons/logo.svg", "./icons/favicon-32.png", "./icons/icon-192.png", "./icons/icon-512.png",
  "./icons/maskable-512.png", "./icons/apple-touch-icon.png",
];

// cache: "reload" evita gravar uma versão antiga vinda do cache HTTP; skipWaiting/claim fazem a versão nova assumir na hora.
self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS.map(url => new Request(url, { cache: "reload" })))));
});

self.addEventListener("activate", event => event.waitUntil(
  caches.keys()
    .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
    .then(() => self.clients.claim())
));

self.addEventListener("fetch", event => {
  // A API (outra origem) e o SDK do Google nunca são cacheados.
  if (new URL(event.request.url).origin !== self.location.origin) return;
  // Páginas: rede primeiro, para não prender o usuário em uma versão antiga; cache só sem internet.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then(response => { const copy = response.clone(); caches.open(CACHE).then(cache => cache.put("./index.html", copy)); return response; })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }
  // Demais arquivos: cache primeiro; ignoreSearch para "global.css?v=2" corresponder a "global.css".
  event.respondWith(caches.match(event.request, { ignoreSearch: true }).then(cached => cached || fetch(event.request)));
});
