const CACHE_NAME = 'pdv-tanque-digital-v1';

// Arquivos principais para funcionamento offline
const APP_SHELL = [
  '/',
  '/index.html',
  '/pdv.html',
  '/dashboard.html',
  '/loja.html',
  '/manifest.webmanifest',
  // CDNs principais usados nas páginas
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css',
  'https://cdn.jsdelivr.net/npm/chart.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(APP_SHELL).catch(err => {
        console.warn('[SW] Erro ao adicionar arquivos ao cache inicial', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const request = event.request;

  // Não interferir em requisições POST/PUT/DELETE (APIs)
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // Estratégia network-first para chamadas da API local
  if (url.origin === self.location.origin && url.pathname.startsWith('/api')) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  // Para navegação e assets estáticos: cache-first com fallback para rede
  event.respondWith(
    caches.match(request).then(response => {
      if (response) {
        return response;
      }

      return fetch(request)
        .then(networkResponse => {
          // Salvar no cache para futuras visitas
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(request, networkResponse.clone());
            return networkResponse;
          });
        })
        .catch(() => {
          // Se quiser, aqui poderíamos retornar uma página offline personalizada
          return caches.match('/index.html');
        });
    })
  );
});

