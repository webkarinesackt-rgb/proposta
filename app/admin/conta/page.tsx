'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ShieldCheck, Check } from 'lucide-react'

const T = {
  textPrimary: '#162322',
  textMuted: '#6B8585',
  textDim: '#8AA09A',
  border: '#E6E6E1',
  card: '#FFFFFF',
  bgSubtle: '#F4F3EF',
  accent: '#0D3839',
  accentBright: '#F4F99D',
}

const LABEL =
  'block text-[10px] font-bold uppercase tracking-[0.12em] mb-1.5'
const INPUT =
  'w-full px-3 py-2.5 rounded-lg text-[14px] outline-none focus:ring-2 focus:ring-[#C8D8D4]'

export default function ContaPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setEmail(data.user?.email || ''))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    if (password.length < 8) {
      setMsg({ ok: false, text: 'A senha precisa ter pelo menos 8 caracteres.' })
      return
    }
    if (password !== confirm) {
      setMsg({ ok: false, text: 'As senhas não conferem.' })
      return
    }
    setLoading(true)
    const { error } = await createClient().auth.updateUser({ password })
    setLoading(false)
    if (error) {
      setMsg({ ok: false, text: error.message })
      return
    }
    setMsg({
      ok: true,
      text: 'Senha alterada! Use a nova senha no próximo acesso.',
    })
    setPassword('')
    setConfirm('')
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto thin-scroll">
      <div className="max-w-xl mx-auto px-4 sm:px-8 pt-8 sm:pt-12 pb-20">
        <h1
          className="leading-[0.95] tracking-tight mb-8"
          style={{
            fontFamily: '"ivypresto-display", Georgia, serif',
            fontStyle: 'italic',
            fontWeight: 300,
            fontSize: 'clamp(2rem, 4.5vw, 2.6rem)',
            color: T.textPrimary,
          }}
        >
          Minha conta
        </h1>

        {/* email logado */}
        <div
          className="rounded-2xl p-5 mb-4"
          style={{ background: T.card, border: `1px solid ${T.border}` }}
        >
          <p className={LABEL} style={{ color: T.textDim }}>
            E-mail de acesso
          </p>
          <p className="text-[15px] font-semibold" style={{ color: T.textPrimary }}>
            {email || '—'}
          </p>
        </div>

        {/* trocar senha */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl p-5 flex flex-col gap-4"
          style={{ background: T.card, border: `1px solid ${T.border}` }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: '#E7EEEB', color: T.accent }}
            >
              <ShieldCheck size={16} />
            </div>
            <div>
              <p className="text-[14px] font-bold" style={{ color: T.textPrimary }}>
                Trocar senha
              </p>
              <p className="text-[11px]" style={{ color: T.textMuted }}>
                Senha de acesso ao seu painel.
              </p>
            </div>
          </div>

          <div>
            <label className={LABEL} style={{ color: T.textDim }}>
              Nova senha
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="Pelo menos 8 caracteres"
              className={INPUT}
              style={{ background: T.bgSubtle, border: `1px solid ${T.border}`, color: T.textPrimary }}
            />
          </div>

          <div>
            <label className={LABEL} style={{ color: T.textDim }}>
              Confirmar nova senha
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
              className={INPUT}
              style={{ background: T.bgSubtle, border: `1px solid ${T.border}`, color: T.textPrimary }}
            />
          </div>

          {msg && (
            <p
              className="text-[12px] font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5"
              style={
                msg.ok
                  ? { background: '#E9F2EC', color: '#2F6B4F' }
                  : { background: '#F7EDE9', color: '#9C5A48' }
              }
            >
              {msg.ok && <Check size={13} />}
              {msg.text}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="self-start px-5 py-2.5 rounded-full text-[12px] font-bold transition-all active:scale-95 disabled:opacity-50"
            style={{ background: T.accent, color: T.accentBright }}
          >
            {loading ? 'Salvando…' : 'Salvar nova senha'}
          </button>
        </form>

        <p className="text-[11px] mt-4 leading-relaxed" style={{ color: T.textDim }}>
          Essa é a senha de <b>login do painel</b>. É diferente da chave do
          WhatsApp (que fica no servidor).
        </p>
      </div>
    </div>
  )
}
