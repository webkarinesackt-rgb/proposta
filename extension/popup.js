const $ = (id) => document.getElementById(id)

function setStatus(msg, cls) {
  $('status').textContent = msg
  $('status').className = cls || ''
}

const DEFAULT_URL = 'https://wa-fysi.177-73-235-85.nip.io'
const DEFAULT_TOKEN = 'cbdfc4cdb6aa39ccd397bc562d1731d6fdf74639319b00efce16acb8a3a715ce'

// carrega config salva, ou usa default (zero-config inicial)
chrome.storage.local.get(['waUrl', 'waToken'], (cfg) => {
  $('waUrl').value = cfg.waUrl || DEFAULT_URL
  $('waToken').value = cfg.waToken || DEFAULT_TOKEN
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
