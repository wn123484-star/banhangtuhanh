const CACHE_NAME = 'nexora-mobile-pwa-v8';
const CORE_ASSETS = [
    '/services/mobile/mobile-app.html',
    '/services/mobile/mobile-app.css',
    '/services/mobile/mobile-app.js',
    '/assets/icons/nexora_mobile_crest.svg',
    '/assets/icons/icon.png',
    '/manifest.json'
];

self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS).catch(() => {}))
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
        ))
    );
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    const reqUrl = new URL(event.request.url);
    if (reqUrl.pathname.startsWith('/api/')) {
        return;
    }
    event.respondWith(
        fetch(event.request)
            .then(networkResp => {
                if (networkResp && networkResp.status === 200 && event.request.method === 'GET') {
                    const respClone = networkResp.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, respClone));
                }
                return networkResp;
            })
            .catch(() => caches.match(event.request))
    );
});