// Service worker: guarda os arquivos do app para funcionar sem internet.
// Ao mudar algum arquivo, aumente a VERSAO para o celular baixar a nova.
const VERSAO = "corpoluar-v1";
const ARQUIVOS = [
  "./", "index.html", "style.css", "p5.min.js", "lunacao.js", "dados.js",
  "sketch.js", "interface.js", "configuracao.js", "pwa.js",
  "manifest.webmanifest", "icones/icone-192.png", "icones/icone-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== VERSAO).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// rede primeiro (pega atualizações); sem rede, usa a cópia guardada
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request)
      .then((r) => {
        const copia = r.clone();
        caches.open(VERSAO).then((c) => c.put(e.request, copia));
        return r;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
