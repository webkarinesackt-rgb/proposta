// Content script — roda no contexto isolado do WhatsApp Web.
// O DOM compartilha, mas variáveis JS NÃO. Pra usar a API do wppconnect
// (que vive na page como window.WPP) precisamos injetar scripts no
// "main world" via tag <script>.

function inject(src) {
  const s = document.createElement('script')
  s.src = chrome.runtime.getURL(src)
  s.async = false // ordem importa: wppconnect antes do nosso inject
  ;(document.head || document.documentElement).appendChild(s)
}

// Recebe config da extensão (URL+token do wa-server) e expõe pro inject.js
chrome.storage.local.get(['waUrl', 'waToken'], (cfg) => {
  // grava no body como data-* — o inject.js vai ler dali (não dá pra
  // passar via postMessage antes do script carregar)
  document.documentElement.setAttribute('data-fysi-wa-url', cfg.waUrl || '')
  document.documentElement.setAttribute('data-fysi-wa-token', cfg.waToken || '')

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
