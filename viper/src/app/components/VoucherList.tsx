"use client"

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWallet } from '@solana/wallet-adapter-react'
import { Connection, PublicKey, Transaction } from '@solana/web3.js'
import { createTransferInstruction, createAssociatedTokenAccountInstruction, getAssociatedTokenAddress, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token'
import { ChevronDown, ChevronUp, Send, Copy, X, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react'
import { useCountry } from '../contexts/CountryContext'

interface VoucherData {
    expiry: number
    mintAddress: string
    name: string
    symbol: string
    description: string
    uri: string
    escrow: string
    escrowAddress: string
}

interface VoucherListProps {
    vouchers: VoucherData[]
    userType: 'payer' | 'receiver' | 'provider'
    onRedeem?: (voucher: VoucherData) => void
    onVoucherTransferred?: (mintAddress: string) => void
}

const FALLBACK_IMAGE_URL = "https://cdn-icons-png.flaticon.com/512/3514/3514447.png"

export default function Component(props: VoucherListProps = {
    vouchers: [],
    userType: 'payer',
    onRedeem: () => { },
    onVoucherTransferred: () => { }
}) {
    const { vouchers, userType, onRedeem, onVoucherTransferred } = props
    const [expandedVoucherId, setExpandedVoucherId] = useState<string | null>(null)
    const [openDialog, setOpenDialog] = useState<boolean>(false)
    const [selectedVoucher, setSelectedVoucher] = useState<VoucherData | null>(null)
    const [walletAddress, setWalletAddress] = useState<string>('')
    const { publicKey, signTransaction } = useWallet()
    const [busySending, setBusySending] = useState(false)
    const [transferSuccess, setTransferSuccess] = useState(false)
    const [transferError, setTransferError] = useState<string | null>(null)
    const [preloadedImages, setPreloadedImages] = useState<{ [key: string]: string }>({})
    const imageRefs = useRef<{ [key: string]: HTMLImageElement | null }>({})
    const { country, exchangeRate } = useCountry()

    useEffect(() => {
        const preloadImages = async () => {
            const imagePromises = vouchers.map(async (voucher) => {
                try {
                    const response = await fetch(voucher.uri)
                    if (!response.ok) throw new Error('Network response was not ok')
                    const blob = await response.blob()
                    return [voucher.mintAddress, URL.createObjectURL(blob)]
                } catch (error) {
                    console.error(`Failed to preload image for voucher ${voucher.mintAddress}:`, error)
                    return [voucher.mintAddress, FALLBACK_IMAGE_URL]
                }
            })

            const results = await Promise.all(imagePromises)
            setPreloadedImages(Object.fromEntries(results))
        }

        preloadImages()

        return () => {
            Object.values(preloadedImages).forEach(URL.revokeObjectURL)
        }
    }, [vouchers])

    useEffect(() => {
        Object.entries(imageRefs.current).forEach(([mintAddress, imgElement]) => {
            if (imgElement) {
                imgElement.src = preloadedImages[mintAddress] || FALLBACK_IMAGE_URL
            }
        })
    }, [preloadedImages])

    const handleClick = (id: string) => {
        setExpandedVoucherId(expandedVoucherId === id ? null : id)
    }

    const handleOpenTransferDialog = (voucher: VoucherData) => {
        setSelectedVoucher(voucher)
        setOpenDialog(true)
        setTransferSuccess(false)
        setTransferError(null)
    }

    const validateWalletAddress = (address: string): boolean => {
        try {
            new PublicKey(address)
            return true
        } catch (error) {
            return false
        }
    }

    const handleTransfer = async () => {
        if (!walletAddress || !selectedVoucher || !publicKey || !signTransaction) {
            setTransferError("Wallet not connected or voucher not selected")
            return
        }

        if (!validateWalletAddress(walletAddress)) {
            setTransferError("Invalid wallet address")
            return
        }

        setBusySending(true)
        setTransferError(null)

        try {
            const connection = new Connection('https://api.devnet.solana.com')
            const mintAddress = new PublicKey(selectedVoucher.mintAddress)
            const recipientAddress = new PublicKey(walletAddress)

            const fromTokenAccount = await getAssociatedTokenAddress(
                mintAddress,
                publicKey,
                false,
                TOKEN_2022_PROGRAM_ID
            )

            const toTokenAccount = await getAssociatedTokenAddress(
                mintAddress,
                recipientAddress,
                false,
                TOKEN_2022_PROGRAM_ID
            )

            const instructions = []

            const receiverAccount = await connection.getAccountInfo(toTokenAccount)
            if (!receiverAccount) {
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

            instructions.push(
                createTransferInstruction(
                    fromTokenAccount,
                    toTokenAccount,
                    publicKey,
                    1,
                    [],
                    TOKEN_2022_PROGRAM_ID
                )
            )

            const transaction = new Transaction().add(...instructions)
            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()
            transaction.recentBlockhash = blockhash
            transaction.lastValidBlockHeight = lastValidBlockHeight
            transaction.feePayer = publicKey

            const signed = await signTransaction(transaction)
            const signature = await connection.sendRawTransaction(signed.serialize())

            await connection.confirmTransaction({
                blockhash,
                lastValidBlockHeight,
                signature
            })

            console.log(`Transferred voucher ${mintAddress} to wallet ${recipientAddress.toString()} with signature: ${signature}`)

            if (onVoucherTransferred) {
                onVoucherTransferred(selectedVoucher.mintAddress)
            }

            setTransferSuccess(true)
            setWalletAddress('')
            setTimeout(() => {
                setOpenDialog(false)
                setTransferSuccess(false)
            }, 3000)
        } catch (error) {
            console.error("Failed to transfer voucher", error)
            setTransferError("Failed to transfer voucher. Please try again.")
        } finally {
            setBusySending(false)
        }
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
    }

    const convertSolToLocalCurrency = (solAmount: string) => {
        const amount = parseFloat(solAmount) * exchangeRate
        return amount.toFixed(2)
    }

    if (vouchers.length === 0) {
        return (
            <motion.div
                className="text-center p-8 bg-card text-card-foreground rounded-lg shadow-md"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <p className="text-xl font-semibold">No vouchers in wallet</p>
            </motion.div>
        )
    }

    return (
        <motion.div
            className="space-y-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
        >
            {vouchers.map((voucher, index) => (
                <motion.div
                    key={voucher.mintAddress}
                    className="bg-card text-card-foreground p-4 sm:p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 cursor-pointer"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    onClick={() => handleClick(voucher.mintAddress)}
                >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center space-x-4">
                            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-lg flex-shrink-0 overflow-hidden">
                                <img
                                    ref={el => { imageRefs.current[voucher.mintAddress] = el }}
                                    src={preloadedImages[voucher.mintAddress] || FALLBACK_IMAGE_URL}
                                    alt={voucher.name}
                                    className="w-full h-full object-cover"
                                    style={{
                                        objectFit: 'cover',
                                        objectPosition: 'center',
                                    }}
                                />
                            </div>
                            <div>
                                <h3 className="text-lg sm:text-2xl font-semibold text-black">{voucher.name}</h3>
                                <p className="text-xs sm:text-sm text-muted-foreground">{voucher.symbol}</p>
                            </div>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end sm:space-x-4 mt-2 sm:mt-0">
                            <span className="text-base sm:text-lg font-medium text-black">
                                {country.currencySymbol}{convertSolToLocalCurrency(voucher.escrow)}
                                <span className="text-sm text-muted-foreground ml-2">({voucher.escrow} SOL)</span>
                            </span>
                            <motion.div
                                className="text-primary"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                            >
                                {expandedVoucherId === voucher.mintAddress ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                            </motion.div>
                        </div>
                    </div>
                    <AnimatePresence>
                        {expandedVoucherId === voucher.mintAddress && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.3 }}
                                className="mt-4 space-y-4 overflow-hidden bg-gray-50 p-4 rounded-lg"
                            >
                                <div className="flex flex-col sm:flex-row">
                                    <div className="flex-1 space-y-2 pr-4">
                                        <p className="text-gray-600"><span className="font-semibold text-blue-600">Description:</span><br />{voucher.description}</p>
                                        <div className="flex items-center">
                                            <p className="mr-2 text-gray-600"><span className="font-semibold text-blue-600">Escrow Account:</span><br />{voucher.escrowAddress}</p>
                                            <button onClick={(e) => { e.stopPropagation(); copyToClipboard(voucher.escrowAddress); }} className="text-blue-600 hover:text-blue-800">
                                                <Copy size={16} />
                                            </button>
                                        </div>
                                        <div className="flex items-center">
                                            <p className="mr-2 text-gray-600"><span className="font-semibold text-blue-600">Mint Address:</span><br />{voucher.mintAddress}</p>
                                            <button onClick={(e) => { e.stopPropagation(); copyToClipboard(voucher.mintAddress); }} className="text-blue-600 hover:text-blue-800">
                                                <Copy size={16} />
                                            </button>
                                        </div>
                                        {voucher.expiry > 0 && (
                                            <p className="text-gray-600"><span className="font-semibold text-blue-600">Expiry:</span><br />{new Date(voucher.expiry).toLocaleString()}</p>
                                        )}
                                        <a
                                            href={`https://explorer.solana.com/address/${voucher.mintAddress}?cluster=devnet`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-block text-blue-600 hover:text-blue-800 transition duration-300"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            View on Solana Explorer <ExternalLink size={14} className="inline" />
                                        </a>
                                    </div>
                                    <div className="flex-shrink-0 mt-4 sm:mt-0">
                                        <div className="relative w-48 h-48 rounded-lg overflow-hidden">
                                            <img
                                                ref={el => { imageRefs.current[`${voucher.mintAddress}-large`] = el }}
                                                src={preloadedImages[voucher.mintAddress] || FALLBACK_IMAGE_URL}
                                                alt={voucher.name}
                                                className="w-full h-full object-cover"
                                                style={{
                                                    objectFit: 'cover',
                                                    objectPosition: 'center',
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                                {userType === 'receiver' && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onRedeem && onRedeem(voucher)
                                        }}
                                        className="w-full bg-green-600 text-white hover:bg-green-700 px-4 py-2 rounded-lg text-lg font-semibold transition duration-300"
                                    >
                                        Redeem
                                    </button>
                                )}
                                {userType === 'payer' && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleOpenTransferDialog(voucher)
                                        }}
                                        className="w-full bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-lg text-lg font-semibold flex items-center justify-center space-x-2 transition duration-300"
                                    >
                                        <Send size={20} />
                                        <span>Transfer</span>
                                    </button>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            ))}
            <AnimatePresence>
                {openDialog && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white p-8 rounded-lg shadow-xl w-full max-w-2xl mx-4"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-2xl font-bold text-blue-600">Transfer Voucher</h2>
                                <button
                                    onClick={() => setOpenDialog(false)}
                                    className="text-gray-500 hover:text-gray-700 transition duration-300"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                            <p className="text-sm text-gray-600 mb-4">
                                Transfer this voucher to a recipient. Paste their wallet address below.
                            </p>
                            <input
                                type="text"
                                value={walletAddress}
                                onChange={(e) => setWalletAddress(e.target.value)}
                                placeholder="Recipient Wallet Address"
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
                                disabled={busySending || transferSuccess}
                            />
                            {busySending && (
                                <div className="flex justify-center mb-4">
                                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                                </div>
                            )}
                            {transferSuccess && (
                                <div className="flex items-center justify-center text-green-500 mb-4">
                                    <CheckCircle className="w-6 h-6 mr-2" />
                                    <span>Voucher sent successfully!</span>
                                </div>
                            )}
                            {transferError && (
                                <div className="flex items-center justify-center text-red-500 mb-4">
                                    <AlertCircle className="w-6 h-6 mr-2" />
                                    <span>{transferError}</span>
                                </div>
                            )}
                            <div className="flex justify-end space-x-2">
                                <button
                                    onClick={() => setOpenDialog(false)}
                                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition duration-300"
                                    disabled={busySending || transferSuccess}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleTransfer}
                                    className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition duration-300 flex items-center justify-center"
                                    disabled={busySending || transferSuccess}
                                >
                                    <Send className="w-5 h-5 mr-2" />
                                    Transfer
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}