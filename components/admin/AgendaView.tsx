'use client'

import { useEffect, useMemo, useState } from 'react'
import { Calendar, MapPin, RefreshCw, Settings, X, Video } from 'lucide-react'

const TZ = 'America/Sao_Paulo'

interface AgEvent {
  title: string
  start: string
  end: string | null
  allDay: boolean
  location: string
  url: string
}

// nome curto do serviço de chamada, pro rótulo do botão
function callLabel(url: string) {
  try {
    const h = new URL(url).hostname
    if (h.includes('meet.google')) return 'Google Meet'
    if (h.includes('zoom')) return 'Zoom'
    if (h.includes('teams')) return 'Teams'
    if (h.includes('whereby')) return 'Whereby'
    if (h.includes('jit.si')) return 'Jitsi'
    if (h.includes('webex')) return 'Webex'
    return 'Entrar na chamada'
  } catch {
    return 'Entrar na chamada'
  }
}

function dayKey(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: TZ })
}
function dayLabel(iso: string) {
  const d = new Date(iso)
  const today = new Date().toLocaleDateString('pt-BR', { timeZone: TZ })
  const tmr = new Date(Date.now() + 86400000).toLocaleDateString('pt-BR', { timeZone: TZ })
  const k = d.toLocaleDateString('pt-BR', { timeZone: TZ })
  const nice = d.toLocaleDateString('pt-BR', {
    timeZone: TZ,
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  })
  if (k === today) return `Hoje · ${nice}`
  if (k === tmr) return `Amanhã · ${nice}`
  return nice
}
function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function AgendaView() {
  const [url, setUrl] = useState('')
  const [events, setEvents] = useState<AgEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [draftUrl, setDraftUrl] = useState('')

  useEffect(() => {
    let saved = ''
    try {
      saved = localStorage.getItem('fysi.agenda.url') || ''
    } catch {}
    setUrl(saved)
    setDraftUrl(saved)
    // sem link salvo → não busca nada (evita abrir já com erro); mostra o setup
    if (!saved) setLoading(false)
  }, [])

  useEffect(() => {
    if (!url) return
    load(url)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url])

  async function load(u: string) {
    setLoading(true)
    setError('')
    try {
      const r = await fetch(`/api/agenda?url=${encodeURIComponent(u)}`)
      const data = await r.json()
      if (!r.ok) {
        setError(data.error || 'Erro ao carregar a agenda.')
        setEvents([])
      } else {
        setEvents(data.events || [])
      }
    } catch {
      setError('Falha ao carregar a agenda.')
    } finally {
      setLoading(false)
    }
  }

  function saveUrl() {
    const u = draftUrl.trim()
    try {
      localStorage.setItem('fysi.agenda.url', u)
    } catch {}
    setUrl(u)
    setShowSettings(false)
  }

  const grouped = useMemo(() => {
    const m = new Map<string, AgEvent[]>()
    for (const e of events) {
      const k = dayKey(e.start)
      if (!m.has(k)) m.set(k, [])
      m.get(k)!.push(e)
    }
    return [...m.entries()]
  }, [events])

  return (
    <div className="flex flex-col h-full" style={{ background: '#EDEDEA' }}>
      <div className="px-5 md:px-8 pt-6 pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-[22px] md:text-[26px] font-bold" style={{ color: '#141414', fontFamily: 'var(--font-inter), Inter, sans-serif' }}>
              Agenda
            </h1>
            <p className="text-[12px] mt-0.5" style={{ color: '#9B9B9B' }}>
              Seus próximos compromissos (Google Agenda) — próximos 60 dias.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => url && load(url)} title="Atualizar" className="p-2 rounded-lg" style={{ background: '#FFFFFF', border: '1px solid #E6E6E1', color: '#141414' }}>
              <RefreshCw size={15} />
            </button>
            <button onClick={() => { setDraftUrl(url); setShowSettings(true) }} className="flex items-center gap-1.5 text-[12px] font-bold px-3 py-2 rounded-lg" style={{ background: '#FFFFFF', border: '1px solid #E6E6E1', color: '#141414' }}>
              <Settings size={14} /> Calendário
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto px-5 md:px-8 pb-8">
        {!url ? (
          <div className="max-w-[560px] rounded-2xl p-6" style={{ background: '#FFFFFF', border: '1px solid #E6E6E1' }}>
            <p className="text-[15px] font-bold" style={{ color: '#141414' }}>Conecte seu Google Agenda</p>
            <p className="text-[13px] mt-1.5" style={{ color: '#6E6E6E' }}>
              Cole o endereço secreto (iCal) da sua agenda pra ver os compromissos aqui, com botão pra entrar nas chamadas.
            </p>
            <SetupHelp />
            <button onClick={() => { setDraftUrl(''); setShowSettings(true) }} className="mt-4 text-[12px] font-bold px-4 py-2 rounded-lg" style={{ background: '#141414', color: '#D6F23C' }}>
              Colar o link do calendário
            </button>
          </div>
        ) : loading ? (
          <p className="text-[13px] text-center py-16" style={{ color: '#A8B5B0' }}>Carregando agenda…</p>
        ) : error ? (
          <div className="max-w-[560px] rounded-2xl p-6" style={{ background: '#FFFFFF', border: '1px solid #E6E6E1' }}>
            <p className="text-[14px] font-bold" style={{ color: '#B42318' }}>Não consegui carregar a agenda</p>
            <p className="text-[13px] mt-1.5" style={{ color: '#6E6E6E' }}>{error}</p>
            <SetupHelp />
            <button onClick={() => { setDraftUrl(url); setShowSettings(true) }} className="mt-4 text-[12px] font-bold px-4 py-2 rounded-lg" style={{ background: '#141414', color: '#D6F23C' }}>
              Colar o link do calendário
            </button>
          </div>
        ) : events.length === 0 ? (
          <p className="text-[13px] text-center py-16" style={{ color: '#A8B5B0' }}>
            Nenhum compromisso nos próximos 60 dias.
          </p>
        ) : (
          <div className="max-w-2xl flex flex-col gap-6">
            {grouped.map(([k, evs]) => (
              <div key={k}>
                <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: '#9B9B9B' }}>
                  {dayLabel(evs[0].start)}
                </p>
                <div className="flex flex-col gap-2">
                  {evs.map((e, i) => (
                    <div key={i} className="rounded-xl p-3 flex items-start gap-3" style={{ background: '#FFFFFF', border: '1px solid #E6E6E1' }}>
                      <div className="flex-shrink-0 text-center" style={{ minWidth: 54 }}>
                        {e.allDay ? (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded" style={{ background: '#EDEDEA', color: '#6E6E6E' }}>dia todo</span>
                        ) : (
                          <span className="text-[14px] font-bold" style={{ color: '#141414' }}>{timeLabel(e.start)}</span>
                        )}
                      </div>
                      <div className="w-[3px] self-stretch rounded-full flex-shrink-0" style={{ background: '#D6F23C' }} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold" style={{ color: '#141414' }}>{e.title}</p>
                        {e.location && !/^https?:\/\//i.test(e.location) && (
                          <p className="text-[11px] mt-0.5 flex items-center gap-1 truncate" style={{ color: '#9B9B9B' }}>
                            <MapPin size={11} /> {e.location}
                          </p>
                        )}
                        {e.url && (
                          <a
                            href={e.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-[11px] font-bold mt-1.5 px-2.5 py-1 rounded-lg transition-opacity hover:opacity-90"
                            style={{ background: '#141414', color: '#D6F23C' }}
                          >
                            <Video size={12} /> {callLabel(e.url)}
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={() => setShowSettings(false)} />
          <div className="relative w-full max-w-[520px] rounded-2xl" style={{ background: '#FFFFFF' }}>
            <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid #E6E6E1' }}>
              <span className="text-[14px] font-bold flex items-center gap-1.5" style={{ color: '#141414' }}>
                <Calendar size={15} /> Link do calendário
              </span>
              <button onClick={() => setShowSettings(false)} style={{ color: '#A8B5B0' }}><X size={16} /></button>
            </div>
            <div className="p-4">
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#9B9B9B' }}>
                Endereço iCal (.ics) do Google Agenda
              </label>
              <input
                value={draftUrl}
                onChange={(e) => setDraftUrl(e.target.value)}
                placeholder="https://calendar.google.com/calendar/ical/.../basic.ics"
                className="w-full text-[12px] px-3 py-2 rounded-lg outline-none"
                style={{ background: '#F4F3EF', border: '1px solid #E6E6E1', color: '#141414' }}
              />
              <SetupHelp />
              <div className="flex justify-end gap-2 mt-4">
                <button onClick={() => setShowSettings(false)} className="text-[12px] font-semibold px-4 py-2 rounded-lg" style={{ color: '#6E6E6E' }}>Cancelar</button>
                <button onClick={saveUrl} className="text-[12px] font-bold px-4 py-2 rounded-lg" style={{ background: '#141414', color: '#D6F23C' }}>Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SetupHelp() {
  return (
    <div className="mt-3 text-[12px] leading-relaxed rounded-lg p-3" style={{ background: '#F4F3EF', color: '#6E6E6E' }}>
      <p className="font-bold" style={{ color: '#141414' }}>Como pegar o link certo (recomendado — mais privado):</p>
      <ol className="mt-1.5 ml-4 list-decimal space-y-0.5">
        <li>No Google Agenda (computador): <b>Configurações</b> → clique no seu calendário à esquerda.</li>
        <li>Role até <b>“Integrar agenda”</b>.</li>
        <li>Copie o <b>“Endereço secreto no formato iCal”</b> (termina em <code>.ics</code>).</li>
        <li>Cole aqui e salve.</li>
      </ol>
      <p className="mt-1.5">O link que você mandou deu 404 — provavelmente a agenda não está pública. O <b>endereço secreto</b> funciona sem deixar tudo público.</p>
    </div>
  )
}
