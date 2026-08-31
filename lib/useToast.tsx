'use client'

import { useEffect, useState, useCallback } from 'react'

/**
 * Toast efêmero — mostra uma mensagem no rodapé central por 2.2s.
 * Uso: const { show, Toast } = useToast()
 *   show('Mensagem enviada')             // verde
 *   show('Falhou', { kind: 'error' })    // vermelho
 *   show('Info', { kind: 'info' })       // azul
 *   { Toast } no JSX renderiza o componente
 */
export type ToastKind = 'ok' | 'error' | 'info'

export interface ToastOpts {
  kind?: ToastKind
}

export function useToast() {
  const [toast, setToast] = useState<{ msg: string; kind: ToastKind } | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2200)
    return () => clearTimeout(t)
  }, [toast])

  const show = useCallback((msg: string, opts: ToastOpts = {}) => {
    setToast({ msg, kind: opts.kind || 'ok' })
  }, [])

  const dismiss = useCallback(() => setToast(null), [])

  function Toast() {
    if (!toast) return null
    const bg =
      toast.kind === 'error'
        ? '#7F1D1D'
        : toast.kind === 'info'
        ? '#1E3A8A'
        : '#141414'
    const fg =
      toast.kind === 'error'
        ? '#FECACA'
        : toast.kind === 'info'
        ? '#BFDBFE'
        : '#D6F23C'
    return (
      <div
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 text-[12px] font-semibold px-4 py-2.5 rounded-full transition-all"
        style={{
          background: bg,
          color: fg,
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
          maxWidth: '90vw',
        }}
      >
        {toast.msg}
      </div>
    )
  }

  return { toast, show, dismiss, Toast }
}
