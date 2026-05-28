const $ = (id) => document.getElementById(id)

function setStatus(msg, cls) {
  $('status').textContent = msg
  $('status').className = cls || ''
}

// carrega config salva
chrome.storage.local.get(['waUrl', 'waToken'], (cfg) => {
  if (cfg.waUrl) $('waUrl').value = cfg.waUrl
  if (cfg.waToken) $('waToken').value = cfg.waToken
})

// testa a URL com o token
async function testConnection(url, token) {
  try {
    const r = await fetch(url.replace(/\/$/, '') + '/status', {
      headers: { Authorization: 'Bearer ' + token },
    })
    if (!r.ok) return { ok: false, error: 'HTTP ' + r.status }
    const d = await r.json()
    return { ok: true, data: d }
  } catch (e) {
    return { ok: false, error: e.message }
  }
}

$('save').addEventListener('click', async () => {
  const waUrl = $('waUrl').value.trim().replace(/\/$/, '')
  const waToken = $('waToken').value.trim()
  if (!waUrl || !waToken) {
    setStatus('Preencha URL e token.', 'err')
    return
  }
  setStatus('Testando…')
  const res = await testConnection(waUrl, waToken)
  if (!res.ok) {
    setStatus('Falhou: ' + res.error, 'err')
    return
  }
  await chrome.storage.local.set({ waUrl, waToken })
  setStatus(`Conectado ao wa-server. Estado: ${res.data.state}`, 'ok')
})
