import './globals.css'
import type { Metadata } from 'next'
import { SolanaWalletProvider } from './components/SolanaWalletProvider'
import { Header } from './components/Header'
import { CountryProvider } from './contexts/CountryContext'
import { ScrollToTop } from './components/ScrollToTop'

export const metadata: Metadata = {
  title: 'VoucherVault',
  description: 'Revolutionize your affiliate marketing with blockchain technology',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <CountryProvider>
          <SolanaWalletProvider>
            <ScrollToTop />
            <Header />
            {children}
          </SolanaWalletProvider>
        </CountryProvider>
      </body>
    </html>
  )
}