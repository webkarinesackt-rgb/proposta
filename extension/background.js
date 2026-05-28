// Service worker mínimo. Por enquanto só pra a extensão ter um worker
// (necessário pro popup funcionar bem em MV3). Pode crescer depois pra
// alarmes (sync periódico mesmo com a aba fechada — não dá, mas pra
// notificações quando ela está aberta).

chrome.runtime.onInstalled.addListener(() => {
  console.log('[Fysi Bridge] instalado.')
})
