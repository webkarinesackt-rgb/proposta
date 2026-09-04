/* Service worker do painel (PWA).
 *
 * Regra de ouro: NADA de dado é cacheado. Só os arquivos estáticos que o Next
 * publica com hash no nome (/_next/static) e os ícones — esses são imutáveis,
 * então cache-first é seguro. Qualquer outra coisa (páginas do painel, chamadas
 * ao Supabase, wa-server, uploads) vai direto pra rede, sempre. Isso existe pra
 * o app abrir rápido e ser instalável, não pra funcionar offline: mostrar
 * proposta ou conversa desatualizada seria pior que uma tela de "sem conexão".
 */
const CACHE = 'fysi-estaticos-v1'

self.addEventListener('install', (event) => {
  // assume o controle já na primeira visita, sem esperar fechar as abas
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll([
        '/icons/icon-192.png',
        '/icons/icon-512.png',
        '/icons/maskable-512.png',
      ])
    )
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  )
})

function podeCachear(url) {
  return url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')
}

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  let url
  try {
    url = new URL(req.url)
  } catch {
    return
  }

  // outra origem (Supabase, wa-server, fontes) não passa por aqui
  if (url.origin !== self.location.origin) return
  if (!podeCachear(url)) return

  event.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit
      return fetch(req).then((res) => {
        // só guarda resposta boa e completa
        if (res && res.ok && res.status === 200) {
          const copia = res.clone()
          caches.open(CACHE).then((cache) => cache.put(req, copia))
        }
        return res
      })
    })
  )
})
