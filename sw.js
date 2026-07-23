const CACHE_NAME = 'sana-dair-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/admin.html',
  '/manifest.json',
  '/widget/mood'
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {});
    })
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((key) => key !== CACHE_NAME && caches.delete(key)));
    })
  );
  self.clients.claim();
});

// Fetch Event
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }
      return fetch(event.request);
    })
  );
});

// ── PWA WIDGETS (W3C SPECIFICATION LISTENERS) ──────────────────────────

// 1. Widget kurulduğunda tetiklenir (widgetinstall)
self.addEventListener('widgetinstall', (event) => {
  event.waitUntil(updateMoodWidget(event.widget));
});

// 2. Widget açıldığında veya yeniden aktifleştiğinde tetiklenir (widgetresume)
self.addEventListener('widgetresume', (event) => {
  event.waitUntil(updateMoodWidget(event.widget));
});

// 3. Widget üzerine tıklandığında tetiklenir (widgetclick)
self.addEventListener('widgetclick', (event) => {
  if (event.action === 'refresh') {
    event.waitUntil(updateMoodWidget(event.widget));
  } else {
    // Tıklanınca ana uygulamayı aç
    event.waitUntil(
      clients.openWindow('/index.html#mood-section')
    );
  }
});

// 4. Arka plan senkronizasyonu (Periodic Background Sync)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-mood-widget') {
    event.waitUntil(updateAllMoodWidgets());
  }
});

// Widget içerik yenileme yardımcı fonksiyonu
async function updateMoodWidget(widget) {
  try {
    const res = await fetch('/api/mood');
    const data = await res.json();

    // W3C Widget payload güncellemesi
    if (self.widgets && typeof self.widgets.updateByTag === 'function') {
      await self.widgets.updateByTag('mood-widget', {
        template: '/widget/mood',
        data: {
          nese: data.nese,
          mete: data.mete,
          updatedAt: new Date().toLocaleTimeString('tr-TR')
        }
      });
    }
  } catch (err) {
    console.error('Widget update error:', err);
  }
}

async function updateAllMoodWidgets() {
  if (self.widgets && typeof self.widgets.matchAll === 'function') {
    const widgets = await self.widgets.matchAll({ tag: 'mood-widget' });
    for (const widget of widgets) {
      await updateMoodWidget(widget);
    }
  }
}
