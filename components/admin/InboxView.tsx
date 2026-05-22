'use client'

import { useEffect, useRef, useState } from 'react'
import { waServer, WaChat, WaMessage } from '@/lib/waServer'
import { Search, Send, Users, ArrowLeft, Zap } from 'lucide-react'
import { useRouter } from 'next/navigation'
import ModelsPanel from './ModelsPanel'

/* ── helpers ─────────────────────────────────────────── */

function fmtTime(t: number) {
  if (!t) return ''
  const d = new Date(t * 1000)
  const sameDay = d.toDateString() === new Date().toDateString()
  return sameDay
    ? d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?'
}

/* ── chat list row ───────────────────────────────────── */

function ChatRow({
  chat,
  active,
  onClick,
}: {
  chat: WaChat
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
      style={{ background: active ? '#F4FAF8' : 'transparent' }}
    >
      <div
        className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 text-[12px] font-bold"
        style={{ background: active ? '#0D3839' : '#E6E6E1', color: active ? '#F4F99D' : '#8AA09A' }}
      >
        {chat.isGroup ? <Users size={16} /> : initials(chat.name)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[13px] font-bold text-[#162322] truncate">{chat.name}</span>
          <span className="text-[10px] text-[#A8B5B0] flex-shrink-0">{fmtTime(chat.lastTime)}</span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <span className="text-[12px] text-[#8AA09A] truncate">
            {chat.fromMeLast && <span className="text-[#A8B5B0]">Você: </span>}
            {chat.lastText || '—'}
          </span>
          {chat.unread > 0 && (
            <span
              className="text-[10px] font-bold text-white rounded-full flex-shrink-0 flex items-center justify-center"
              style={{ background: '#4CAF7D', minWidth: 18, height: 18, padding: '0 5px' }}
            >
              {chat.unread}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

/* ── message bubble ──────────────────────────────────── */

function Bubble({ msg }: { msg: WaMessage }) {
  const mine = msg.fromMe
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div
        className="max-w-[72%] px-3.5 py-2 rounded-2xl"
        style={{
          background: mine ? '#0D3839' : '#FFFFFF',
          color: mine ? '#FFFFFF' : '#162322',
          border: mine ? 'none' : '1px solid #E6E6E1',
          borderBottomRightRadius: mine ? 4 : 16,
          borderBottomLeftRadius: mine ? 16 : 4,
        }}
      >
        <p className="text-[13px] leading-snug whitespace-pre-wrap break-words">{msg.text}</p>
        <p
          className="text-[10px] mt-1 text-right"
          style={{ color: mine ? 'rgba(255,255,255,0.5)' : '#A8B5B0' }}
        >
          {fmtTime(msg.time)}
        </p>
      </div>
    </div>
  )
}

/* ── main ────────────────────────────────────────────── */

export default function InboxView() {
  const router = useRouter()
  const [chats, setChats] = useState<WaChat[]>([])
  const [conn, setConn] = useState<string>('...')
  const [serverOff, setServerOff] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedName, setSelectedName] = useState('')
  const [messages, setMessages] = useState<WaMessage[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [search, setSearch] = useState('')
  const [showModels, setShowModels] = useState(false)
  const msgEndRef = useRef<HTMLDivElement>(null)

  // poll: status + lista de conversas
  useEffect(() => {
    let alive = true
    async function tick() {
      try {
        const [st, cs] = await Promise.all([waServer.status(), waServer.chats()])
        if (!alive) return
        setConn(st.state)
        setChats(cs)
        setServerOff(false)
      } catch {
        if (alive) setServerOff(true)
      }
    }
    tick()
    const iv = setInterval(tick, 5000)
    return () => {
      alive = false
      clearInterval(iv)
    }
  }, [])

  // poll: mensagens da conversa selecionada
  useEffect(() => {
    if (!selectedId) {
      setMessages([])
      return
    }
    let alive = true
    async function tick() {
      try {
        const r = await waServer.messages(selectedId!)
        if (!alive) return
        setMessages(r.messages || [])
        setSelectedName(r.name)
      } catch {
        /* ignora — o poll de status já sinaliza servidor offline */
      }
    }
    tick()
    const iv = setInterval(tick, 3000)
    return () => {
      alive = false
      clearInterval(iv)
    }
  }, [selectedId])

  // rola para a última mensagem
  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function refreshMessages() {
    if (!selectedId) return
    try {
      const r = await waServer.messages(selectedId)
      setMessages(r.messages || [])
    } catch {
      /* o poll de status sinaliza servidor offline */
    }
  }

  async function handleSend() {
    const text = draft.trim()
    if (!text || !selectedId || sending) return
    setSending(true)
    setDraft('')
    try {
      const r = await waServer.sendText(selectedId, text)
      if (!r.ok) {
        setDraft(text)
        alert('Erro ao enviar: ' + (r.error || 'desconhecido'))
      } else {
        const m = await waServer.messages(selectedId)
        setMessages(m.messages || [])
      }
    } catch {
      setDraft(text)
      alert('Não foi possível falar com o servidor do WhatsApp.')
    } finally {
      setSending(false)
    }
  }

  const filtered = search.trim()
    ? chats.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    : chats

  const connLabel =
    conn === 'open' ? 'conectado' : conn === 'qr' ? 'aguardando QR' : 'conectando…'
  const connColor = conn === 'open' ? '#4CAF7D' : '#E0A33B'

  return (
    <div
      className="h-screen flex flex-col"
      style={{ background: '#ECEAE3', fontFamily: 'var(--font-inter)' }}
    >
      {/* top bar */}
      <div
        className="flex items-center justify-between px-6 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid #DFE0DB' }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/admin')}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-[#8AA09A] hover:text-[#0D3839] transition-colors"
          >
            <ArrowLeft size={13} />
            Painel
          </button>
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8AA09A]">
            · Inbox WhatsApp
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: connColor }} />
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8AA09A]">
            {connLabel}
          </span>
        </div>
      </div>

      {serverOff && (
        <div
          className="px-6 py-2 text-[12px] font-semibold flex-shrink-0"
          style={{ background: '#FBE9E9', color: '#A33' }}
        >
          Servidor do WhatsApp offline. Rode <code>npm start</code> na pasta{' '}
          <code>wa-server</code>.
        </div>
      )}

      {/* corpo: lista + conversa */}
      <div className="flex-1 min-h-0 flex">
        {/* ── lista de conversas ── */}
        <div
          className="w-[340px] flex-shrink-0 flex flex-col"
          style={{ background: '#FFFFFF', borderRight: '1px solid #E6E6E1' }}
        >
          <div className="p-3 flex-shrink-0">
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: '#F4F3EF', border: '1px solid #E6E6E1' }}
            >
              <Search size={14} className="text-[#A8B5B0]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar conversa"
                className="flex-1 bg-transparent text-[13px] text-[#162322] outline-none placeholder-[#A8B5B0]"
              />
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-[12px] text-[#A8B5B0] text-center px-4 py-8">
                {chats.length === 0 ? 'Sincronizando conversas…' : 'Nada encontrado.'}
              </p>
            ) : (
              filtered.map((c) => (
                <ChatRow
                  key={c.id}
                  chat={c}
                  active={c.id === selectedId}
                  onClick={() => setSelectedId(c.id)}
                />
              ))
            )}
          </div>
          <div
            className="px-4 py-2 text-[10px] text-[#A8B5B0] flex-shrink-0"
            style={{ borderTop: '1px solid #F0F0EC' }}
          >
            {chats.length} conversa{chats.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* ── conversa ── */}
        <div className="flex-1 min-w-0 flex flex-col" style={{ background: '#E8E6DF' }}>
          {!selectedId ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-[13px] text-[#A8B5B0]">
                Selecione uma conversa para começar.
              </p>
            </div>
          ) : (
            <>
              {/* header da conversa */}
              <div
                className="px-5 py-3 flex items-center gap-3 flex-shrink-0"
                style={{ background: '#FFFFFF', borderBottom: '1px solid #E6E6E1' }}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold"
                  style={{ background: '#0D3839', color: '#F4F99D' }}
                >
                  {initials(selectedName)}
                </div>
                <span className="text-[14px] font-bold text-[#162322]">{selectedName}</span>
                <button
                  onClick={() => setShowModels((v) => !v)}
                  className="ml-auto flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors"
                  style={{
                    background: showModels ? '#0D3839' : '#F4F3EF',
                    color: showModels ? '#F4F99D' : '#0D3839',
                  }}
                >
                  <Zap size={12} />
                  Modelos
                </button>
              </div>

              {/* mensagens */}
              <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 flex flex-col gap-2">
                {messages.length === 0 ? (
                  <p className="text-[12px] text-[#A8B5B0] text-center py-8">
                    Sem mensagens nesta conversa.
                  </p>
                ) : (
                  messages.map((m) => <Bubble key={m.id} msg={m} />)
                )}
                <div ref={msgEndRef} />
              </div>

              {/* composer */}
              <div
                className="px-4 py-3 flex items-center gap-2 flex-shrink-0"
                style={{ background: '#FFFFFF', borderTop: '1px solid #E6E6E1' }}
              >
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                  placeholder="Escreva uma mensagem…"
                  disabled={conn !== 'open'}
                  className="flex-1 px-4 py-2.5 rounded-xl text-[13px] text-[#162322] outline-none placeholder-[#A8B5B0]"
                  style={{ background: '#F4F3EF', border: '1px solid #E6E6E1' }}
                />
                <button
                  onClick={handleSend}
                  disabled={sending || !draft.trim() || conn !== 'open'}
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-40"
                  style={{ background: '#0D3839', color: '#F4F99D' }}
                >
                  <Send size={16} />
                </button>
              </div>
            </>
          )}
        </div>

        {showModels && selectedId && (
          <ModelsPanel
            chatId={selectedId}
            onClose={() => setShowModels(false)}
            onSent={refreshMessages}
          />
        )}
      </div>
    </div>
  )
}
