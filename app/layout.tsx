import type { Metadata } from 'next'
import { Inter, Kanit } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const kanit = Kanit({
  subsets: ['latin'],
  variable: '--font-kanit',
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || 'https://pro.fysilabdigital.com.br'
  ),
  title: 'Fysi Lab Digital — Proposta Online',
  description: 'Sistema Estruturado de Conversão',
  openGraph: {
    title: 'Fysi Lab Digital — Proposta Online',
    description: 'Sistema estruturado de conversão — sites e landing pages de alto padrão.',
    siteName: 'Fysi Lab Digital',
    type: 'website',
    locale: 'pt_BR',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className={`h-full ${inter.variable} ${kanit.variable}`} data-scroll-behavior="smooth">
      <head>
        <link rel="stylesheet" href="https://use.typekit.net/pky0xuo.css" />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}
