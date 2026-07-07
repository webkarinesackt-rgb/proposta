'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function NovaSenhaPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 6) {
      setError('A senha precisa ter pelo menos 6 caracteres.')
      return
    }
    if (password !== confirm) {
      setError('As senhas não conferem.')
      return
    }
    setLoading(true)
    const supabase = createClient()
    const { error: err } = await supabase.auth.updateUser({ password })
    if (err) {
      setError(
        err.message === 'Auth session missing!'
          ? 'O link expirou ou já foi usado. Volte ao login e clique em "Esqueci minha senha" de novo.'
          : err.message
      )
      setLoading(false)
      return
    }
    router.push('/admin')
    router.refresh()
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ background: '#F7F7F4', fontFamily: 'var(--font-inter)' }}
    >
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{
              background:
                'radial-gradient(circle at 30% 25%, #F4F99D 0%, #C8E6E0 60%, #6BA89E 100%)',
              boxShadow: '0 6px 24px rgba(244,249,157,0.25)',
            }}
          >
            <span
              style={{
                fontFamily: '"ivypresto-display", Georgia, serif',
                fontStyle: 'italic',
                fontWeight: 700,
                fontSize: 28,
                color: '#0D3839',
                lineHeight: 1,
              }}
            >
              F
            </span>
          </div>
        </div>

        <h1
          className="text-center leading-tight mb-2"
          style={{
            fontFamily: '"ivypresto-display", Georgia, serif',
            fontStyle: 'italic',
            fontWeight: 300,
            fontSize: '1.9rem',
            color: '#162322',
          }}
        >
          Defina sua nova senha
        </h1>
        <p className="text-center text-[13px] mb-8" style={{ color: '#6B8585' }}>
          Escolha uma senha nova pra entrar no painel.
        </p>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl p-6 flex flex-col gap-4"
          style={{
            background: '#FFFFFF',
            border: '1px solid #E6E6E1',
            boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
          }}
        >
          <div>
            <label
              className="block text-[10px] font-bold uppercase tracking-[0.12em] mb-1.5"
              style={{ color: '#8AA09A' }}
            >
              Nova senha
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
              autoComplete="new-password"
              className="w-full px-3 py-2.5 rounded-lg text-[14px] outline-none"
              style={{
                background: '#F4F3EF',
                border: '1px solid #E6E6E1',
                color: '#162322',
              }}
            />
          </div>

          <div>
            <label
              className="block text-[10px] font-bold uppercase tracking-[0.12em] mb-1.5"
              style={{ color: '#8AA09A' }}
            >
              Confirmar nova senha
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
              className="w-full px-3 py-2.5 rounded-lg text-[14px] outline-none"
              style={{
                background: '#F4F3EF',
                border: '1px solid #E6E6E1',
                color: '#162322',
              }}
            />
          </div>

          {error && (
            <p
              className="text-[12px] font-semibold px-3 py-2 rounded-lg"
              style={{ background: '#FEF2F2', color: '#B91C1C' }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-[13px] font-bold uppercase tracking-[0.1em] transition-all active:scale-95 disabled:opacity-50"
            style={{ background: '#0D3839', color: '#F4F99D' }}
          >
            {loading ? 'Salvando…' : 'Salvar e entrar'}
          </button>
        </form>

        <p className="text-center text-[11px] mt-6" style={{ color: '#A8B5B0' }}>
          Fysi Lab Digital
        </p>
      </div>
    </div>
  )
}
