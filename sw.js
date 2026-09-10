/* Born2beRoot Malumatnamesi — çevrimdışı çalışma katmanı */
const ONBELLEK = "b2r-v2";
const DOSYALAR = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./ikon-192.png",
  "./ikon-512.png",
  "./ikon-maskable-512.png"
];

/* Kurulumda dosyaları önbelleğe al */
self.addEventListener("install", olay => {
  olay.waitUntil(
    caches.open(ONBELLEK)
      .then(o => o.addAll(DOSYALAR))
      .then(() => self.skipWaiting())
  );
});

/* Eski sürüm önbelleklerini temizle */
self.addEventListener("activate", olay => {
  olay.waitUntil(
    caches.keys()
      .then(adlar => Promise.all(adlar.filter(a => a !== ONBELLEK).map(a => caches.delete(a))))
      .then(() => self.clients.claim())
  );
});

function onbellegeYaz(istek, cevap) {
  if (cevap && cevap.status === 200) {
    const kopya = cevap.clone();
    caches.open(ONBELLEK).then(o => o.put(istek, kopya));
  }
  return cevap;
}

self.addEventListener("fetch", olay => {
  const istek = olay.request;
  if (istek.method !== "GET" || new URL(istek.url).origin !== self.location.origin) return;

  /* Sayfanın kendisi: önce ağ. Böylece uygulamayı güncellediğinde
     ilk açılışta yeni sürüm gelir; ağ yoksa önbellekten açılır. */
  if (istek.mode === "navigate") {
    olay.respondWith(
      fetch(istek)
        .then(cevap => onbellegeYaz(istek, cevap))
        .catch(() => caches.match(istek).then(b => b || caches.match("./index.html")))
    );
    return;
  }

  /* Diğer dosyalar: önce önbellek, arka planda tazele */
  olay.respondWith(
    caches.match(istek).then(bulunan => {
      const agdan = fetch(istek).then(cevap => onbellegeYaz(istek, cevap)).catch(() => bulunan);
      return bulunan || agdan;
    })
  );
});
