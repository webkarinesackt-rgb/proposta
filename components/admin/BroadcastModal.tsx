'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { X, Search, Send, Square, AlertTriangle, Check, XCircle } from 'lucide-react'
import { waServer, WaChat } from '@/lib/waServer'

const MAX_RECIPIENTS = 40
const MIN_DELAY_MS = 8000
const MAX_DELAY_MS = 18000

function firstName(name: string): string {
  const n = (name || '').trim()
  if (!n) return ''
  return n.split(/\s+/)[0]
}

function applyVars(text: string, chat: WaChat): string {
  return text.replaceAll('{nome}', firstName(chat.name) || chat.name || '')
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

type Result = { chatId: string; name: string; ok: boolean; error?: string }

export default function BroadcastModal({
  initialText,
  onClose,
}: {
  initialText: string
  onClose: () => void
}) {
  const [chats, setChats] = useState<WaChat[]>([])
  const [chatsError, setChatsError] = useState(false)
  const [text, setText] = useState(initialText)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [sending, setSending] = useState(false)
  const [results, setResults] = useState<Result[]>([])
  const [nextEtaS, setNextEtaS] = useState<number | null>(null)
  const stopRef = useRef(false)
  const aliveRef = useRef(true)

  useEffect(() => {
    aliveRef.current = true
    waServer.chats().then(setChats).catch(() => setChatsError(true))
    return () => {
      aliveRef.current = false
      stopRef.current = true
    }
  }, [])

  const candidates = useMemo(() => {
    const q = search.trim().toLowerCase()
    return chats
      .filter((c) => !c.archived && !c.isGroup && !(c.tags || []).includes('pessoal'))
      .filter((c) => !q || c.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [chats, search])

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else if (next.size < MAX_RECIPIENTS) next.add(id)
      return next
    })
  }

  function selectFiltered() {
    setSelected(new Set(candidates.slice(0, MAX_RECIPIENTS).map((c) => c.id)))
  }

  async function startSending() {
    if (sending || selected.size === 0 || !text.trim()) return
    setSending(true)
    setResults([])
    stopRef.current = false
    const list = candidates.filter((c) => selected.has(c.id))
    for (let i = 0; i < list.length; i++) {
      if (stopRef.current || !aliveRef.current) break
      const chat = list[i]
      let ok = false
      let error: string | undefined
      try {
        const r = await waServer.sendText(chat.id, applyVars(text, chat))
        ok = !!r.ok
        error = r.error
      } catch (e) {
        error = e instanceof Error ? e.message : 'erro'
      }
      if (!aliveRef.current) return
      setResults((rs) => [...rs, { chatId: chat.id, name: chat.name, ok, error }])
      if (i < list.length - 1 && !stopRef.current) {
        const delay = MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS)
        const until = Date.now() + delay
        while (Date.now() < until) {
          if (stopRef.current || !aliveRef.current) break
          setNextEtaS(Math.ceil((until - Date.now()) / 1000))
          await sleep(500)
        }
      }
    }
    if (aliveRef.current) {
      setSending(false)
      setNextEtaS(null)
    }
  }

  function stopSending() {
    stopRef.current = true
  }

  const done = !sending && results.length > 0
  const okCount = results.filter((r) => r.ok).length
  const failCount = results.filter((r) => !r.ok).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.45)' }}
        onClick={() => !sending && onClose()}
      />
      <div
        className="relative w-full max-w-[640px] rounded-2xl flex flex-col"
        style={{ background: '#FFFFFF', maxHeight: '88vh' }}
      >
        <div
          className="px-4 py-3 flex items-center justify-between flex-shrink-0"
          style={{ borderBottom: '1px solid #E6E6E1' }}
        >
          <span className="text-[14px] font-bold flex items-center gap-2" style={{ color: '#141414' }}>
            <Send size={15} />
            Disparo de mensagens
          </span>
          <button
            onClick={() => !sending && onClose()}
            disabled={sending}
            style={{ color: sending ? '#D8D8D0' : '#A8B5B0' }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-3 overflow-y-auto">
          {!done && (
            <div
              className="flex items-start gap-2 text-[11px] leading-relaxed rounded-lg p-3"
              style={{ background: '#FDECD3', color: '#8A5A17' }}
            >
              <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
              <span>
                Envio em massa pode fazer o WhatsApp sinalizar o número como spam.
                Limite de <b>{MAX_RECIPIENTS} contatos por disparo</b>, com intervalo
                de {Math.round(MIN_DELAY_MS / 1000)}–{Math.round(MAX_DELAY_MS / 1000)}s
                entre cada envio. Prefira quem já te respondeu antes e evite repetir
                todo dia.
              </span>
            </div>
          )}

          {done ? (
            <>
              <p className="text-[13px] font-bold" style={{ color: '#141414' }}>
                Disparo concluído: {okCount} enviada{okCount !== 1 ? 's' : ''}
                {failCount > 0 ? `, ${failCount} falhou/falharam` : ''}.
              </p>
              <div className="flex flex-col gap-1 max-h-[220px] overflow-y-auto">
                {results.map((r) => (
                  <div key={r.chatId} className="flex items-center gap-2 text-[12px] py-1">
                    {r.ok ? (
                      <Check size={13} style={{ color: '#2F6B4F' }} />
                    ) : (
                      <XCircle size={13} style={{ color: '#B45309' }} />
                    )}
                    <span style={{ color: '#141414' }}>{r.name}</span>
                    {r.error && (
                      <span className="text-[10px]" style={{ color: '#B45309' }}>
                        — {r.error}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div>
                <label
                  className="block text-[10px] font-bold uppercase tracking-wider mb-1"
                  style={{ color: '#9B9B9B' }}
                >
                  Mensagem — use {'{nome}'} pra personalizar
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  disabled={sending}
                  rows={4}
                  className="w-full text-[13px] px-3 py-2 rounded-lg outline-none resize-y leading-relaxed"
                  style={{ background: '#F4F3EF', border: '1px solid #E6E6E1', color: '#141414' }}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    className="text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: '#9B9B9B' }}
                  >
                    Destinatários ({selected.size}/{MAX_RECIPIENTS})
                  </label>
                  <button
                    onClick={selectFiltered}
                    disabled={sending}
                    className="text-[11px] font-bold"
                    style={{ color: '#141414' }}
                  >
                    selecionar da busca (até {MAX_RECIPIENTS})
                  </button>
                </div>
                <div className="relative mb-2">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: '#A8B5B0' }} />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    disabled={sending}
                    placeholder="Buscar contato…"
                    className="w-full text-[12.5px] pl-8 pr-3 py-2 rounded-lg outline-none"
                    style={{ background: '#F4F3EF', border: '1px solid #E6E6E1', color: '#141414' }}
                  />
                </div>
                {chatsError ? (
                  <p className="text-[12px]" style={{ color: '#B45309' }}>
                    Servidor do WhatsApp offline — não dá pra disparar agora.
                  </p>
                ) : (
                  <div
                    className="max-h-[220px] overflow-y-auto rounded-lg"
                    style={{ border: '1px solid #E6E6E1' }}
                  >
                    {candidates.map((c) => (
                      <label
                        key={c.id}
                        className="flex items-center gap-2.5 px-3 py-2 text-[12.5px] cursor-pointer transition-colors hover:bg-[#FAFAF8]"
                        style={{ borderBottom: '1px solid #F0F0EC', color: '#141414' }}
                      >
                        <input
                          type="checkbox"
                          checked={selected.has(c.id)}
                          onChange={() => toggle(c.id)}
                          disabled={sending}
                        />
                        {c.name}
                      </label>
                    ))}
                    {candidates.length === 0 && (
                      <p className="text-[12px] p-3" style={{ color: '#A8B5B0' }}>
                        Nenhum contato encontrado.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {sending && (
                <div
                  className="rounded-lg p-3 text-[12px] flex items-center justify-between"
                  style={{ background: '#EAF3E9', color: '#141414' }}
                >
                  <span>
                    Enviando… {results.length}/{selected.size}
                    {nextEtaS != null && ` · próxima em ${nextEtaS}s`}
                  </span>
                  <button
                    onClick={stopSending}
                    className="flex items-center gap-1 font-bold px-2.5 py-1 rounded-full"
                    style={{ background: '#141414', color: '#D6F23C' }}
                  >
                    <Square size={11} /> Parar
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <div
          className="px-4 py-3 flex justify-end gap-2 flex-shrink-0"
          style={{ borderTop: '1px solid #E6E6E1' }}
        >
          {done ? (
            <button
              onClick={onClose}
              className="text-[12px] font-bold px-4 py-2 rounded-lg"
              style={{ background: '#141414', color: '#D6F23C' }}
            >
              Fechar
            </button>
          ) : (
            <>
              <button
                onClick={onClose}
                disabled={sending}
                className="text-[12px] font-semibold px-4 py-2 rounded-lg disabled:opacity-40"
                style={{ color: '#6E6E6E' }}
              >
                Cancelar
              </button>
              <button
                onClick={startSending}
                disabled={sending || selected.size === 0 || !text.trim()}
                className="flex items-center gap-1.5 text-[12px] font-bold px-4 py-2 rounded-lg disabled:opacity-50"
                style={{ background: '#141414', color: '#D6F23C' }}
              >
                <Send size={13} />
                Iniciar disparo
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
