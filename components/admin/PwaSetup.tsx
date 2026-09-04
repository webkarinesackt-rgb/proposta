'use client'

import { useEffect } from 'react'

/**
 * Registra o service worker do painel. Fica só dentro do /admin: quem abre uma
 * proposta em /p/<slug> nunca executa isso, então o cliente não instala nada.
 * Falha em silêncio de propósito — sem service worker o painel funciona igual,
 * só não fica instalável.
 */
export default function PwaSetup() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  }, [])

  return null
}
