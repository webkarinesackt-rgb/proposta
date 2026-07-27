// Content script — roda no contexto isolado do WhatsApp Web.
// O DOM compartilha, mas variáveis JS NÃO. Pra usar a API do wppconnect
// (que vive na page como window.WPP) precisamos injetar scripts no
// "main world" via tag <script>.

// Defaults embutidos pra "instalação zero-config" da Fysi.
// O popup ainda permite override se precisar mudar depois.
const DEFAULT_URL = 'https://wa-fysi.177-73-235-85.nip.io'
const DEFAULT_TOKEN = '' /* NUNCA hardcode o token — configure no popup da extensão */

function inject(src) {
  const s = document.createElement('script')
  s.src = chrome.runtime.getURL(src)
  s.async = false // ordem importa: wppconnect antes do nosso inject
  ;(document.head || document.documentElement).appendChild(s)
}

// Recebe config da extensão (URL+token do wa-server) e expõe pro inject.js
chrome.storage.local.get(['waUrl', 'waToken'], (cfg) => {
  const url = cfg.waUrl || DEFAULT_URL
  const token = cfg.waToken || DEFAULT_TOKEN
  // grava no body como data-* — o inject.js vai ler dali (não dá pra
  // passar via postMessage antes do script carregar)
  document.documentElement.setAttribute('data-fysi-wa-url', url)
  document.documentElement.setAttribute('data-fysi-wa-token', token)

  inject('vendor/wppconnect-wa.js')
  inject('inject.js')
})

// Atualiza atributos quando config muda (popup salva → content reage)
chrome.storage.onChanged.addListener((changes) => {
  if (changes.waUrl) {
    document.documentElement.setAttribute('data-fysi-wa-url', changes.waUrl.newValue || '')
  }
  if (changes.waToken) {
    document.documentElement.setAttribute('data-fysi-wa-token', changes.waToken.newValue || '')
  }
})

// ── Relay POST: inject.js → window.postMessage → aqui → fetch ─────────
// Necessário porque o WhatsApp Web tem CSP estrita que bloqueia fetch
// de outros domínios direto do MAIN world. Content scripts vivem no
// "isolated world" da extensão e usam a CSP do manifest (que lista
// nip.io no host_permissions).
let currentUrl = ''
let currentToken = ''
chrome.storage.local.get(['waUrl', 'waToken'], (cfg) => {
  currentUrl = cfg.waUrl || 'https://wa-fysi.177-73-235-85.nip.io'
  currentToken = cfg.waToken || '' /* NUNCA hardcode o token — configure no popup da extensão */
})
chrome.storage.onChanged.addListener((changes) => {
  if (changes.waUrl) currentUrl = changes.waUrl.newValue || currentUrl
  if (changes.waToken) currentToken = changes.waToken.newValue || currentToken
})

window.addEventListener('message', async (ev) => {
  // só aceita mensagens da própria página
  if (ev.source !== window) return
  const d = ev.data
  if (!d || !d.__fysiBridge || !d.path) return
  try {
    const r = await fetch(currentUrl + d.path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + currentToken,
      },
      body: JSON.stringify(d.body || {}),
    })
    if (!r.ok) {
      console.warn('[Fysi Bridge:relay]', d.path, r.status)
    }
  } catch (e) {
    console.warn('[Fysi Bridge:relay]', d.path, 'falhou:', e.message)
  }
})
