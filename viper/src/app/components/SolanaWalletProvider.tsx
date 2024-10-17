"use client"

import { useMemo } from 'react'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets'
import { clusterApiUrl } from '@solana/web3.js'
import dynamic from 'next/dynamic'

const WalletModalProviderDynamic = dynamic(
    () => import('@solana/wallet-adapter-react-ui').then(mod => mod.WalletModalProvider),
    { ssr: false }
)

// Import the CSS for the wallet modal
import '@solana/wallet-adapter-react-ui/styles.css'
import React from 'react'

export function SolanaWalletProvider({ children }: { children: React.ReactNode }) {
    const network = WalletAdapterNetwork.Devnet
    const endpoint = useMemo(() => clusterApiUrl(network), [network])

    const wallets = useMemo(
        () => [
            new PhantomWalletAdapter(),
        ],
        []
    )

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProviderDynamic>{children}</WalletModalProviderDynamic>
            </WalletProvider>
        </ConnectionProvider>
    )
}