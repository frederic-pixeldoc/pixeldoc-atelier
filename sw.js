/* Service worker PixelDoc : l'appli s'ouvre aussi sans connexion.
   Ne met en cache que les fichiers de l'appli ; les données restent dans le navigateur.

   VERSION : à incrémenter à CHAQUE modification d'un fichier de l'appli (HTML, CSS, JS, icônes).
   Le changement de nom du cache force le téléchargement de tous les fichiers et supprime l'ancien cache.
   tests/sw.test.mjs vérifie que tous les fichiers chargés par index.html figurent dans ASSETS. */
const VERSION = 'v2';
const V = 'pd-pixeldoc-atelier-' + VERSION;
const ASSETS = [
  './', 'index.html', 'manifest.webmanifest', 'css/style.css',
  'js/calc.js', 'js/docs-core.js', 'js/backup-core.js',
  'js/state.js', 'js/lock.js', 'js/app.js', 'js/dashboard.js', 'js/stock.js', 'js/repairs.js', 'js/ui.js',
  'js/bon.js', 'js/documents.js', 'js/seed.js', 'js/catalog.js', 'js/profil.js', 'js/backup.js', 'js/tools.js',
  'js/quote.js', 'js/legal.js', 'js/repair-form.js', 'js/boot.js', 'js/sw-register.js',
  'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png',
];
// Bibliothèques externes (avec contrôle d'intégrité dans index.html) : mises en cache au mieux, sans bloquer l'installation.
const LIBS = [
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js',
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(V);
    await c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' })));          // échec = installation annulée, l'ancienne version reste active
    await Promise.allSettled(LIBS.map(u => c.add(new Request(u, { mode: 'cors', credentials: 'omit' }))));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  const libs = /(^|\.)(cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)$/.test(u.hostname);
  if (u.origin !== location.origin && !libs) return;
  if (u.origin === location.origin) {
    // fichiers de l'appli : réseau d'abord (une version publiée est prise tout de suite, et les fichiers restent cohérents entre eux),
    // cache en secours hors connexion
    e.respondWith(fetch(r).then(res => { if (res.ok) { const c = res.clone(); caches.open(V).then(x => x.put(r, c)); } return res; })
      .catch(() => caches.match(r, { ignoreSearch: true }).then(m => m || (r.mode === 'navigate' ? caches.match('./') : Response.error()))));
    return;
  }
  // polices et bibliothèques externes : cache d'abord, mis à jour en arrière-plan
  e.respondWith(caches.match(r).then(m => {
    const n = fetch(r).then(res => { if (res && (res.ok || res.type === 'opaque')) { const c = res.clone(); caches.open(V).then(x => x.put(r, c)); } return res; }).catch(() => m);
    return m || n;
  }));
});
