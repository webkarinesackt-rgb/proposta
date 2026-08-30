'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { FileText, MessageSquare, BarChart3, Tag, LogOut, PieChart, Settings, Sheet, BookOpen } from 'lucide-react'
import { waServer } from '@/lib/waServer'
import { createClient } from '@/lib/supabase/client'
import type { ReactNode } from 'react'

const TABS = [
  { path: '/admin/dashboard', icon: BarChart3, label: 'Métricas' },
  { path: '/admin', icon: FileText, label: 'Propostas' },
  { path: '/admin/inbox', icon: MessageSquare, label: 'Inbox' },
  { path: '/admin/leads', icon: Tag, label: 'Leads' },
  { path: '/admin/fechados', icon: Sheet, label: 'Fechados' },
  { path: '/admin/comercial', icon: BookOpen, label: 'Comercial' },
  { path: '/admin/relatorios', icon: PieChart, label: 'Relatórios' },
] as const

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname() || '/admin'
  const [conn, setConn] = useState<string>('starting')

  // monitora a conexão com o WhatsApp.
  // Pausa quando a aba não está visível (window/tab em background não
  // precisa fazer request a cada 6s — economiza bateria no celular e
  // evita request stampede ao voltar pra aba).
  useEffect(() => {
    let alive = true
    let iv: ReturnType<typeof setInterval> | null = null
    async function tick() {
      try {
        const s = await waServer.status()
        if (alive) setConn(s.state)
      } catch {
        if (alive) setConn('off')
      }
    }
    function start() {
      if (iv != null) return
      tick()
      iv = setInterval(tick, 15000) // antes 6s — esse poll é apenas pra
      // mostrar a bolinha de status; SSE no InboxView já reflete em tempo real.
    }
    function stop() {
      if (iv == null) return
      clearInterval(iv)
      iv = null
    }
    function onVis() {
      if (document.hidden) stop()
      else start()
    }
    start()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      alive = false
      stop()
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  const connDot =
    conn === 'open' ? '#93E0A6' : conn === 'qr' ? '#F4D55D' : '#E57373'

  return (
    <div
      className="h-screen flex flex-col md:flex-row overflow-hidden"
      style={{
        background: '#FAFAFA',
        fontFamily: 'var(--font-inter)',
        color: '#162322',
      }}
    >
      {/* trilho flutuante (desktop) — pílula destacada da borda.
          No mobile some e vira a tab-bar de baixo. */}
      <aside
        className="hidden md:flex w-[68px] flex-shrink-0 flex-col items-center py-5 my-4 ml-4 rounded-[34px] self-stretch"
        style={{
          background: 'linear-gradient(180deg, #1F5344 0%, #0C231D 100%)',
          boxShadow: '0 22px 44px -20px rgba(10,30,24,0.65)',
        }}
      >
        {/* marca — vira link do QR quando o WhatsApp pede leitura */}
        <a
          href={conn === 'qr' ? waServer.qrUrl() : undefined}
          target={conn === 'qr' ? '_blank' : undefined}
          rel="noopener"
          title={
            conn === 'qr'
              ? 'WhatsApp aguardando QR — clique pra escanear'
              : `WhatsApp: ${conn}`
          }
          className={`relative w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${conn === 'qr' ? 'cursor-pointer' : 'cursor-default'}`}
          style={{ background: 'rgba(239,227,194,0.10)' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-fysi-mark.png"
            alt="Fysi"
            style={{ width: 26, height: 26, objectFit: 'contain' }}
          />
          {/* status do whatsapp como bolinha no canto — pulsa em QR */}
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 ${conn === 'qr' ? 'animate-pulse' : ''}`}
            style={{
              background: connDot,
              borderColor: '#0C231D',
              boxShadow: `0 0 8px ${connDot}88`,
            }}
          />
        </a>

        {/* navegação centralizada — equilibra o trilho */}
        <nav className="flex-1 flex flex-col items-center justify-center gap-1.5">
          {TABS.map((tab) => {
            const active =
              pathname === tab.path ||
              (tab.path !== '/admin' && pathname.startsWith(tab.path))
            const Icon = tab.icon
            return (
              <button
                key={tab.path}
                onClick={() => router.push(tab.path)}
                title={tab.label}
                className="group relative w-11 h-11 rounded-full flex items-center justify-center transition-all flex-shrink-0"
                style={{ background: active ? '#EFE3C2' : 'transparent' }}
              >
                <Icon
                  size={18}
                  style={{
                    color: active ? '#173B32' : 'rgba(184,201,184,0.75)',
                  }}
                />
                {/* rótulo no hover — bonito e ainda descobrível */}
                <span
                  className="absolute left-full ml-3 px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50"
                  style={{ background: '#173B32', color: '#EFE3C2' }}
                >
                  {tab.label}
                </span>
              </button>
            )
          })}
        </nav>

        <button
          onClick={() => router.push('/admin/conta')}
          title="Minha conta"
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors hover:bg-white/5 mb-1"
          style={{
            color: pathname.startsWith('/admin/conta')
              ? '#EFE3C2'
              : 'rgba(184,201,184,0.55)',
          }}
        >
          <Settings size={16} />
        </button>
        <button
          onClick={async () => {
            const supabase = createClient()
            await supabase.auth.signOut()
            router.push('/login')
            router.refresh()
          }}
          title="Sair"
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors hover:bg-white/5"
          style={{ color: 'rgba(184,201,184,0.55)' }}
        >
          <LogOut size={16} />
        </button>
      </aside>

      {/* main — overflow-y-auto pra páginas sem scroll próprio (form).
          No mobile, deixa espaço pro tab-bar fixo (58px + safe area). */}
      <main
        className="flex-1 min-w-0 min-h-0 flex flex-col overflow-y-auto thin-scroll pb-[calc(58px+env(safe-area-inset-bottom))] md:pb-0"
      >
        {children}
      </main>

      {/* tab-bar mobile (md:hidden) */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex"
        style={{
          background:
            'linear-gradient(180deg, #1F5344 0%, #0C231D 100%)',
          borderTop: '1px solid rgba(0,0,0,0.2)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          boxShadow: '0 -4px 16px rgba(0,0,0,0.15)',
        }}
      >
        {TABS.map((tab) => {
          const active =
            pathname === tab.path ||
            (tab.path !== '/admin' && pathname.startsWith(tab.path))
          const Icon = tab.icon
          return (
            <button
              key={tab.path}
              onClick={() => router.push(tab.path)}
              className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-all"
              style={{
                background: active ? 'rgba(239,227,194,0.08)' : 'transparent',
              }}
            >
              {active && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-b-full"
                  style={{
                    background: '#EFE3C2',
                    boxShadow: '0 0 8px rgba(239,227,194,0.6)',
                  }}
                />
              )}
              <Icon
                size={20}
                style={{ color: active ? '#EFE3C2' : 'rgba(178,197,178,0.65)' }}
              />
              <span
                className="text-[9px] font-bold uppercase tracking-[0.1em]"
                style={{ color: active ? '#F3EEDD' : 'rgba(178,197,178,0.55)' }}
              >
                {tab.label}
              </span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
