// sw.js - FIXED - API ko kabhi cache / intercept mat karo
// Pehle wala sw.js /api wale fetch ko bhi pakad raha tha, isliye CORS error + Failed to convert to Response aa raha tha
const CACHE = 'pdf-studio-v3'; // version badal di, purana cache delete hoga
const FILES = ['./', './index.html', './style.css', './app.js', './direct-ads.js', './config.js', './favicon.ico', './favicon.png', './favicon.png', './icon-192.png', './icon-512.png', './apple-touch-icon.png', './manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).catch(()=>{}));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.map(k => { if(k !== CACHE) return caches.delete(k); }))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  const url = e.request.url;
  // FIX: Agar API ka request hai (Backend ko ja raha hai) toh Service Worker beech me mat aao
  // Seedha network se jaane do, warna CORS fail hoga
  if(url.includes('/api') || url.includes('onrender.com') || url.includes('koyeb.app') || url.includes('railway.app')){
    e.respondWith(fetch(e.request));
    return;
  }
  // Sirf static files (HTML/CSS/JS) ko cache se do
  e.respondWith(
    fetch(e.request).then(res => {
      // Sirf GET aur same-origin ko cache karo
      if(e.request.method === 'GET' && url.startsWith(self.location.origin)){
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
      }
      return res;
    }).catch(() => caches.match(e.request))
  );
});
