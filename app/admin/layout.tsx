import type { Metadata, Viewport } from 'next'
import AdminLayout from '@/components/admin/AdminLayout'
import PwaSetup from '@/components/admin/PwaSetup'

/** O app instalável é o painel. O manifesto é declarado só aqui — assim o
 *  convite de instalar não aparece pra quem abre uma proposta em /p/<slug>. */
export const metadata: Metadata = {
  title: 'Fysi — Painel',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Fysi',
    // barra de status escura, combinando com a lateral do painel
    statusBarStyle: 'black-translucent',
  },
  icons: {
    apple: '/icons/apple-touch-icon.png',
  },
  other: {
    // o Next emite só o `mobile-web-app-capable` novo; iPhones mais antigos
    // ainda dependem deste pra abrir em tela cheia
    'apple-mobile-web-app-capable': 'yes',
  },
}

export const viewport: Viewport = {
  themeColor: '#141414',
  // ocupa a área da tela toda no iPhone, inclusive atrás do notch
  viewportFit: 'cover',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PwaSetup />
      <AdminLayout>{children}</AdminLayout>
    </>
  )
}
