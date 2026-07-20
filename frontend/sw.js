const CACHE_NAME = 'museo-cache-v1';
const DYNAMIC_MAP_CACHE = 'museo-map-tiles-v1';

// Archivos estáticos mínimos para que la shell de la app funcione offline
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/pages/mapa.html',
  '/pages/recorrido.html',
  '/css/estilos.css',
  '/js/app.js',
  '/js/componentes.js',
  '/js/api.js',
  '/js/mapa-gps.js',
  '/js/qr-voz.js',
  '/assets/data/track.geojson',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME && key !== DYNAMIC_MAP_CACHE)
            .map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Interceptar Peticiones
self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);

  // 1. Manejar las "Tiles" (baldosas) del mapa de CartoCDN / OSM
  if (requestUrl.origin === 'https://a.basemaps.cartocdn.com' ||
      requestUrl.origin === 'https://b.basemaps.cartocdn.com' ||
      requestUrl.origin === 'https://c.basemaps.cartocdn.com' ||
      requestUrl.origin === 'https://d.basemaps.cartocdn.com') {
    event.respondWith(
      caches.match(event.request).then(response => {
        // Devuelve de caché si existe, si no, busca en la red y guarda
        return response || fetch(event.request).then(netResponse => {
          return caches.open(DYNAMIC_MAP_CACHE).then(cache => {
            cache.put(event.request, netResponse.clone());
            return netResponse;
          });
        });
      })
    );
    return;
  }

  // 2. Por defecto: Network First, Fallback to Cache
  // Para que siempre vea la última versión de la API o HTML, pero si no hay internet use la caché.
  if (event.request.method === 'GET') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
  }
});

// Mensajes desde el cliente (mapa-gps.js)
self.addEventListener('message', event => {
  if (event.data && event.data.action === 'precache-mapa') {
    // Aquí podríamos implementar la lógica de pre-caching de un Bounding Box
    // recorriendo lat, lng y zoom, calculando X, Y, y haciendo un cache.addAll()
    // de todas las URLs de las tiles generadas matemáticamente.
    console.log('[SW] Recibida solicitud para precachear el mapa:', event.data.bounds);
  }
});
