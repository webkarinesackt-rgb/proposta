'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { FileText, MessageSquare, BarChart3, Tag, LogOut, PieChart } from 'lucide-react'
import { waServer } from '@/lib/waServer'
import { createClient } from '@/lib/supabase/client'
import type { ReactNode } from 'react'

const TABS = [
  { path: '/admin', icon: FileText, label: 'Propostas' },
  { path: '/admin/inbox', icon: MessageSquare, label: 'Inbox' },
  { path: '/admin/leads', icon: Tag, label: 'Leads' },
  { path: '/admin/dashboard', icon: BarChart3, label: 'Métricas' },
  { path: '/admin/relatorios', icon: PieChart, label: 'Relatórios' },
] as const

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname() || '/admin'
  const [conn, setConn] = useState<string>('starting')

  // monitora a conexão com o WhatsApp
  useEffect(() => {
    let alive = true
    async function tick() {
      try {
        const s = await waServer.status()
        if (alive) setConn(s.state)
      } catch {
        if (alive) setConn('off')
      }
    }
    tick()
    const iv = setInterval(tick, 6000)
    return () => {
      alive = false
      clearInterval(iv)
    }
  }, [])

  const connDot =
    conn === 'open' ? '#9DE9A8' : conn === 'qr' ? '#F4D55D' : '#E57373'

  return (
    <div
      className="h-screen flex flex-col md:flex-row overflow-hidden"
      style={{
        background: '#F7F7F4',
        fontFamily: 'var(--font-inter)',
        color: '#162322',
      }}
    >
      {/* sidebar (desktop) — escondida no mobile, vira tab-bar abaixo */}
      <aside
        className="hidden md:flex w-[84px] flex-shrink-0 flex-col items-center py-5 h-screen"
        style={{
          background:
            'linear-gradient(180deg, #0E3C3D 0%, #082828 100%)',
          borderRight: '1px solid rgba(0,0,0,0.08)',
        }}
      >
        {/* mark — logo Fysi */}
        <div className="relative mb-10">
          <div
            className="w-12 h-12 rounded-2xl overflow-hidden flex items-center justify-center"
            style={{
              background: '#FFFFFF',
              boxShadow:
                '0 6px 24px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.4)',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-fysi-mark.png"
              alt="Fysi"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>
          {/* status do whatsapp como bolinha no canto */}
          <span
            title={`WhatsApp: ${conn}`}
            className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
            style={{
              background: connDot,
              borderColor: '#051A1A',
              boxShadow: `0 0 8px ${connDot}88`,
            }}
          />
        </div>

        {/* tabs */}
        <nav className="flex flex-col gap-1 w-full">
          {TABS.map((tab) => {
            const active =
              pathname === tab.path ||
              (tab.path !== '/admin' && pathname.startsWith(tab.path))
            const Icon = tab.icon
            return (
              <button
                key={tab.path}
                onClick={() => router.push(tab.path)}
                className="relative w-full flex flex-col items-center justify-center py-3.5 transition-all group"
                style={{
                  background: active
                    ? 'linear-gradient(90deg, rgba(244,249,157,0.06) 0%, transparent 70%)'
                    : 'transparent',
                }}
              >
                {active && (
                  <span
                    className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full"
                    style={{
                      background: '#F4F99D',
                      boxShadow: '0 0 12px rgba(244,249,157,0.65)',
                    }}
                  />
                )}
                <Icon
                  size={20}
                  className="transition-transform group-hover:scale-110"
                  style={{
                    color: active ? '#F4F99D' : 'rgba(139,183,175,0.65)',
                    filter: active
                      ? 'drop-shadow(0 0 8px rgba(244,249,157,0.4))'
                      : 'none',
                  }}
                />
                <span
                  className="text-[9px] font-bold uppercase tracking-[0.12em] mt-1.5 transition-colors"
                  style={{
                    color: active ? '#E6F1EE' : 'rgba(139,183,175,0.55)',
                  }}
                >
                  {tab.label}
                </span>
              </button>
            )
          })}
        </nav>

        <div className="mt-auto flex flex-col items-center gap-3">
          <button
            onClick={async () => {
              const supabase = createClient()
              await supabase.auth.signOut()
              router.push('/login')
              router.refresh()
            }}
            title="Sair"
            className="w-10 h-10 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: 'rgba(139,183,175,0.6)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#F4F99D'
              e.currentTarget.style.background = 'rgba(244,249,157,0.06)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'rgba(139,183,175,0.6)'
              e.currentTarget.style.background = 'transparent'
            }}
          >
            <LogOut size={16} />
          </button>
          <p
            className="text-[8px] font-bold uppercase tracking-[0.18em] text-center leading-tight"
            style={{ color: 'rgba(139,183,175,0.35)' }}
          >
            Fysi
            <br />
            Lab
          </p>
        </div>
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
            'linear-gradient(180deg, #0E3C3D 0%, #082828 100%)',
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
                background: active ? 'rgba(244,249,157,0.08)' : 'transparent',
              }}
            >
              {active && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-b-full"
                  style={{
                    background: '#F4F99D',
                    boxShadow: '0 0 8px rgba(244,249,157,0.6)',
                  }}
                />
              )}
              <Icon
                size={20}
                style={{ color: active ? '#F4F99D' : 'rgba(139,183,175,0.65)' }}
              />
              <span
                className="text-[9px] font-bold uppercase tracking-[0.1em]"
                style={{ color: active ? '#E6F1EE' : 'rgba(139,183,175,0.55)' }}
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
