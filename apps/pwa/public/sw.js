// Service Worker mínimo para que la PWA sea instalable (Chrome y otros
// browsers exigen un SW registrado para el botón "Añadir a inicio").
//
// Sin cache offline en v1: el escaneo necesita red de todas formas
// (consulta `/api/v1/scan`), así que un cache shell tiene poco valor.
// Cuando entre el modo offline-friendly, este archivo se reemplaza por
// una estrategia network-first con fallback a página de "sin conexión".

self.addEventListener('install', () => {
  // Activa el SW recién instalado sin esperar a que se cierren todas las
  // pestañas viejas.
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  // Toma control de todos los clients ya abiertos.
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', () => {
  // Pasa todo a la red sin tocar. No interceptamos requests en v1.
})
