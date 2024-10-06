"use client"

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import { VoucherData } from '../../utils/VoucherData'
import { TokenUtils } from '../../utils/TokenUtils'
import VoucherList from '../components/VoucherList'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { Gift, Loader2 } from 'lucide-react'
import Peer from 'peerjs'
import {
    createTransferInstruction,
    createAssociatedTokenAccountInstruction,
    getAssociatedTokenAddress,
    TOKEN_2022_PROGRAM_ID
} from '@solana/spl-token'
import {
    PublicKey,
    Transaction,
    Connection,
    TransactionInstruction
} from '@solana/web3.js'
import { SignerWalletAdapterProps } from '@solana/wallet-adapter-base'
import SuccessBanner from '../components/SuccessBanner'

export default function InfluencerDashboard() {
    const [vouchers, setVouchers] = useState<VoucherData[]>([])
    const [loading, setLoading] = useState<boolean>(true)
    const [error, setError] = useState<string | null>(null)
    const [openDialog, setOpenDialog] = useState<boolean>(false)
    const [selectedVoucher, setSelectedVoucher] = useState<VoucherData | null>(null)
    const { publicKey, signTransaction, connected } = useWallet()
    const { connection } = useConnection()

    const [peer, setPeer] = useState<Peer | null>(null)
    const [peerId, setPeerId] = useState<string | null>(null)
    const [qrCodeData, setQrCodeData] = useState<string | null>(null)
    const [showSuccessBanner, setShowSuccessBanner] = useState<boolean>(false)
    const [successMessage, setSuccessMessage] = useState<string>('')

    useEffect(() => {
        if (connected && publicKey) {
            fetchVouchers()
        }
    }, [connected, publicKey])

    useEffect(() => {
        const peer = new Peer()
        setPeer(peer)

        peer.on('open', (id) => {
            setPeerId(id)
            console.log('Peer ID:', id)
        })

        peer.on('connection', (conn) => {
            conn.on('data', (data) => {
                console.log('Message received:', data)

                if (data === 'Transfer valid') {
                    console.log('valid transfer -> refresh')
                    handleCloseDialog()
                    setLoading(true)
                    fetchVouchers()
                    setTimeout(() => setSuccessMessage('Voucher redeemed successfully'), 2000)
                    setShowSuccessBanner(true)
                    setTimeout(() => setShowSuccessBanner(false), 3000)
                } else {

                    const [targetWalletAddress, selectedVoucher] = (data as string).split(',')
                    console.log('Target wallet address:', targetWalletAddress)
                    console.log('Selected voucher:', selectedVoucher)

                    transferToken(targetWalletAddress, selectedVoucher)
                }
            })
        })

        return () => {
            peer.disconnect()
            peer.destroy()
        }
    }, [])

    const fetchVouchers = async () => {
        if (!publicKey) return

        try {
            const tokenUtils = new TokenUtils()
            const voucherData = await tokenUtils.populateVoucherArray(publicKey.toBase58())
            setVouchers(voucherData)
            if (voucherData.length > vouchers.length) {
                //setSuccessMessage('Received new voucher')
                //setShowSuccessBanner(true)
                //setTimeout(() => setShowSuccessBanner(false), 3000)
            }
        } catch (err) {
            setError('Failed to fetch voucher data')
            console.error('Error fetching voucher data:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleRedeem = (voucher: VoucherData) => {
        setSelectedVoucher(voucher)
        const userWalletKey = publicKey?.toBase58()
        const tokenMintAddress = voucher.mintAddress

        if (peerId && userWalletKey) {
            const qrCodeData = `${peerId},${userWalletKey},${tokenMintAddress}`
            setQrCodeData(qrCodeData)
            setOpenDialog(true)
        } else {
            console.error('Peer ID or wallet key is not available')
        }
    }

    const handleCloseDialog = () => {
        setOpenDialog(false)
        setSelectedVoucher(null)
    }

    const handleVoucherTransferred = (mintAddress: string) => {
        setVouchers(prevVouchers => prevVouchers.filter(v => v.mintAddress !== mintAddress))
        console.log('valid transfer -> refresh')
        handleCloseDialog()
        setLoading(true)
        fetchVouchers()
        setTimeout(() => setSuccessMessage('Voucher redeemed successfully'), 2000)
        setShowSuccessBanner(true)
        setTimeout(() => setShowSuccessBanner(false), 3000)
    }

    const transferToken = (targetWalletAddress: string, selectedVoucher: string) => {
        console.log('transferToken function triggered')

        if (!connected) {
            console.error('Wallet is not connected. Please connect your wallet to proceed.')
            return
        }

        handleTransfer(targetWalletAddress, selectedVoucher)
    }

    const handleTransfer = async (walletAddress: string, selectedVoucher: string) => {
        if (!walletAddress || !selectedVoucher || !publicKey || !signTransaction) {
            console.error("Wallet not connected or voucher not selected")
            return
        }

        try {
            const mintAddress = new PublicKey(selectedVoucher)
            const recipientAddress = new PublicKey(walletAddress)

            console.log('1. Attempting to transfer voucher with: ', mintAddress.toString(), publicKey.toString(), recipientAddress.toString())

            const fromTokenAccount = await getAssociatedTokenAddress(
                mintAddress,
                publicKey,
                false,
                TOKEN_2022_PROGRAM_ID
            )

            console.log('2. fromTokenAccount: ', fromTokenAccount.toString())

            const toTokenAccount = await getAssociatedTokenAddress(
                mintAddress,
                recipientAddress,
                false,
                TOKEN_2022_PROGRAM_ID
            )

            console.log('3. toTokenAccount: ', toTokenAccount.toString())

            const instructions: TransactionInstruction[] = []

            // Check if the recipient's token account exists
            const receiverAccount = await connection.getAccountInfo(toTokenAccount)
            if (!receiverAccount) {
                console.log('4. Creating associated token account for recipient')
                instructions.push(
                    createAssociatedTokenAccountInstruction(
                        publicKey,
                        toTokenAccount,
                        recipientAddress,
                        mintAddress,
                        TOKEN_2022_PROGRAM_ID
                    )
                )
            }

            // Add transfer instruction
            instructions.push(
                createTransferInstruction(
                    fromTokenAccount,
                    toTokenAccount,
                    publicKey,
                    1,  // amount to transfer
                    [],
                    TOKEN_2022_PROGRAM_ID
                )
            )

            console.log('5. Creating transaction')
            const transaction = new Transaction().add(...instructions)

            console.log('6. Configuring and sending transaction')
            const signature = await configureAndSendCurrentTransaction(
                transaction,
                connection,
                publicKey,
                signTransaction
            )

            console.log(`Transferred voucher ${mintAddress} to wallet ${recipientAddress.toString()} with signature: ${signature}`)
            handleVoucherTransferred(selectedVoucher)

        } catch (error) {
            console.error("Failed to transfer voucher", error)
        }
    }

    const configureAndSendCurrentTransaction = async (
        transaction: Transaction,
        connection: Connection,
        feePayer: PublicKey,
        signTransaction: SignerWalletAdapterProps['signTransaction']
    ) => {
        try {
            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()
            transaction.feePayer = feePayer
            transaction.recentBlockhash = blockhash
            transaction.lastValidBlockHeight = lastValidBlockHeight

            console.log('7. Signing transaction')
            const signed = await signTransaction(transaction)

            console.log('8. Sending raw transaction')
            const signature = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: true })

            console.log('9. Confirming transaction')
            await connection.confirmTransaction({
                blockhash,
                lastValidBlockHeight,
                signature
            })

            console.log(`Transaction confirmed with signature: ${signature}`)
            return signature
        } catch (error) {
            console.error("Failed to send transaction", error)
            throw error
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-background to-secondary/10">
            <main className="container mx-auto px-4 py-12">
                <motion.div
                    className="text-center mb-12"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <h1 className="text-4xl font-bold mb-2 text-primary">Welcome, Influencer!</h1>
                    <p className="text-xl text-muted-foreground">View and redeem your vouchers below.</p>
                </motion.div>

                <AnimatePresence mode="wait">
                    {!connected ? (
                        <motion.div
                            key="connect-wallet"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.5 }}
                            className="bg-card text-card-foreground p-8 rounded-lg shadow-lg text-center"
                        >
                            <Gift size={48} className="mx-auto mb-4 text-primary" />
                            <p className="text-xl mb-4">Please connect your wallet to view your vouchers.</p>
                            <p className="text-muted-foreground">Once connected, you'll be able to see and redeem your vouchers.</p>
                        </motion.div>
                    ) : loading ? (
                        <motion.div
                            key="loading"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.5 }}
                            className="text-center"
                        >
                            <Loader2 size={48} className="animate-spin mx-auto mb-4 text-primary" />
                            <p className="text-xl mb-4">Loading vouchers...</p>
                            <p className="text-muted-foreground">Please wait while we fetch your voucher data.</p>
                        </motion.div>
                    ) : error ? (
                        <motion.div
                            key="error"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.5 }}
                            className="bg-destructive/10 text-destructive p-8 rounded-lg shadow-lg text-center"
                        >
                            <p className="text-xl mb-4">{error}</p>
                            <p className="text-muted-foreground">Please try again later or contact support if the problem persists.</p>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="voucher-list"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.5 }}
                        >
                            <VoucherList
                                vouchers={vouchers}
                                userType="receiver"
                                onRedeem={handleRedeem}
                                onVoucherTransferred={handleVoucherTransferred}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {openDialog && selectedVoucher && qrCodeData && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                className="bg-background p-8 rounded-lg shadow-xl max-w-md w-full"
                            >
                                <h2 className="text-2xl font-bold mb-4 text-center">Scan QR Code to Redeem</h2>
                                <div className="flex justify-center mb-6">
                                    <QRCodeSVG value={qrCodeData} size={256} />
                                </div>
                                <p className="text-center mb-6 text-muted-foreground">
                                    Use this QR code to redeem your voucher at the designated location.
                                </p>
                                <button
                                    onClick={handleCloseDialog}
                                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg text-lg font-semibold transition-colors duration-200"
                                >
                                    Close
                                </button>
                            </motion.div>
                        </motion.div>
                    )}

                    {showSuccessBanner && (
                        <SuccessBanner message={successMessage} />
                    )}
                </AnimatePresence>
            </main>
        </div>
    )
}
