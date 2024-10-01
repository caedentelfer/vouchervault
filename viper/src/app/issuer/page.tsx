"use client"

import React, { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Peer, { DataConnection } from 'peerjs'
import QrScanner from 'react-qr-scanner'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { Connection, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { getAssociatedTokenAddress, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { VoucherData } from '../../utils/VoucherData'
import { TokenUtils } from '../../utils/TokenUtils'
import { createReleaseEscrowAndBurnVoucherInstruction } from '../../generated/instructions'
import { CheckCircle, AlertCircle, QrCode, X, Camera, ShoppingBag, AlertTriangle, Gift, Loader2, RotateCcw, FileText, Wallet, AlertOctagon, RefreshCw } from 'lucide-react'
import SuccessBanner from '../components/SuccessBanner'
import { SYSVAR_CLOCK_PUBKEY } from '@solana/web3.js'
import { useCountry } from '../contexts/CountryContext'
import emailjs from 'emailjs-com'
import { RecentTransactions } from '../utils/RecentTransactions'

const TransactionHistoryPopup = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-white p-6 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto relative"
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition-colors duration-200"
                >
                    <X size={24} />
                </button>
                <h2 className="text-2xl font-bold mb-4 text-blue-600">Transaction History</h2>
                <RecentTransactions />
            </motion.div>
        </motion.div>
    );
};

const WalletBalancePopup = ({ isOpen, onClose, balance, onRefresh }) => {
    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden"
            >
                <div className="bg-blue-600 text-white px-6 py-4 flex items-center justify-between">
                    <h2 className="text-2xl font-bold flex items-center">
                        <Wallet className="mr-2 h-6 w-6" />
                        Wallet Balance
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-white hover:text-blue-200 transition-colors duration-200"
                        aria-label="Close"
                    >
                        <X size={24} />
                    </button>
                </div>
                <div className="p-6">
                    <div className="bg-gray-100 rounded-lg p-4 mb-4">
                        <p className="text-3xl font-bold text-blue-600 text-center">
                            {balance !== null ? `${balance.toFixed(4)} SOL` : 'Loading...'}
                        </p>
                    </div>
                    <p className="text-sm text-gray-600 mb-4 text-center">
                        Your balance on the Solana.
                    </p>
                    <button
                        onClick={onRefresh}
                        className="w-full bg-blue-500 text-white hover:bg-blue-600 py-2 px-4 rounded-lg text-sm font-semibold transition-colors duration-200 flex items-center justify-center"
                    >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Refresh Balance
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default function IssuerDashboard() {
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const peerRef = useRef<Peer | null>(null)
    const [conn, setConn] = useState<DataConnection | null>(null)
    const [peerId, setPeerId] = useState<string | null>(null)
    const [qrDialogOpen, setQrDialogOpen] = useState<boolean>(false)
    const [transferDialogOpen, setTransferDialogOpen] = useState<boolean>(false)
    const [qrData, setQrData] = useState<string | null>(null)
    const [transferring, setTransferring] = useState<boolean>(false)
    const [transferSuccess, setTransferSuccess] = useState<boolean | null>(null)
    const [voucherData, setVoucherData] = useState<VoucherData | null>(null)
    const [burnSuccessDialogOpen, setBurnSuccessDialogOpen] = useState<boolean>(false)
    const [burnFailureDialogOpen, setBurnFailureDialogOpen] = useState<boolean>(false)
    const [burning, setBurning] = useState<boolean>(false)
    const { connection } = useConnection()
    const { publicKey: userWalletKey, signTransaction, connected } = useWallet()
    const [loading, setLoading] = useState<boolean>(true)
    const [showSuccessBanner, setShowSuccessBanner] = useState<boolean>(false)
    const [successMessage, setSuccessMessage] = useState<string>('')
    const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
    const [isMobile, setIsMobile] = useState<boolean>(false)
    const { country } = useCountry()
    const [exchangeRate, setExchangeRate] = useState<number>(1)
    const [currencySymbol, setCurrencySymbol] = useState<string>('SOL')
    const [isTransactionHistoryOpen, setIsTransactionHistoryOpen] = useState(false);
    const program = "gidsaNxwQbr6pyLDaqVn4pPwAypkjwFNZQvvKBJ1Rbi"
    const [isIssueModalOpen, setIsIssueModalOpen] = useState(false)
    const [issueTitle, setIssueTitle] = useState('')
    const [issueMessage, setIssueMessage] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [walletBalance, setWalletBalance] = useState<number | null>(null);
    const [isBalancePopupOpen, setIsBalancePopupOpen] = useState(false);

    useEffect(() => {
        if (connected) {
            setLoading(false)
        }
    }, [connected])

    useEffect(() => {
        const peer = new Peer()
        peerRef.current = peer

        peer.on('open', (id) => {
            setPeerId(id)
            console.log('My peer ID is: ' + id)
        })

        peer.on('connection', (connection) => {
            setConn(connection)
            connection.on('data', (data) => {
                console.log('Received data from Influencer:', data)
            })
        })

        peer.on('error', (err) => {
            console.error('Peer error:', err)
        })

        setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent))

        return () => {
            peer.destroy()
        }
    }, [userWalletKey])

    useEffect(() => {
        const fetchExchangeRate = async () => {
            try {
                const response = await fetch(`https://api.exchangerate-api.com/v4/latest/USD`)
                const data = await response.json()
                const solToUsd = 20 // 1 SOL = $20 USD 
                const usdToLocalCurrency = data.rates[country.currency]
                setExchangeRate(solToUsd * usdToLocalCurrency)
                setCurrencySymbol(country.currencySymbol)
            } catch (error) {
                console.error('Failed to fetch exchange rate:', error)
            }
        }

        fetchExchangeRate()
    }, [country])

    const convertSolToLocalCurrency = (solAmount: number) => {
        return (solAmount * exchangeRate).toFixed(2)
    }

    const handleScanVoucher = () => {
        setQrDialogOpen(true)
    }

    const handleBurn = async (voucherId: string, escrowAccount: string) => {
        if (!userWalletKey || !signTransaction) {
            console.error('Wallet not connected');
            return;
        }

        setBurning(true);
        try {
            console.log('Burning voucher and releasing funds for voucher ID:', voucherId);
            const voucherPublicKey = new PublicKey(voucherId);
            const escrowPublicKey = new PublicKey(escrowAccount);

            const ata = await getAssociatedTokenAddress(
                voucherPublicKey,
                userWalletKey,
                false,
                TOKEN_2022_PROGRAM_ID,
                ASSOCIATED_TOKEN_PROGRAM_ID
            );

            const mintAuthority = PublicKey.findProgramAddressSync(
                [Buffer.from('mint_authority')],
                new PublicKey(program)
            );

            const instruction = createReleaseEscrowAndBurnVoucherInstruction({
                payer: userWalletKey,
                ata: ata,
                mintAccount: voucherPublicKey,
                mintAuthority: mintAuthority[0],
                escrowAccount: escrowPublicKey,
                tokenProgram: TOKEN_2022_PROGRAM_ID,
                clockProgram: SYSVAR_CLOCK_PUBKEY,
                systemProgram: SystemProgram.programId,
            });

            console.log('Burning Voucher...');
            console.log(`Payer: ${userWalletKey.toBase58()}`);
            console.log(`ATA: ${ata.toBase58()}`);
            console.log(`Mint: ${voucherId}`);
            console.log(`Mint Authority: ${mintAuthority[0].toBase58()}`);
            console.log(`Escrow: ${escrowPublicKey.toBase58()}`);

            const transaction = new Transaction().add(instruction);
            transaction.feePayer = userWalletKey

            console.log('Transaction:', transaction);

            const latestBlockhash = await connection.getLatestBlockhash();
            transaction.recentBlockhash = latestBlockhash.blockhash;

            console.log('Blockhash:', latestBlockhash.blockhash);

            const signedTransaction = await signTransaction(transaction);

            console.log('Transaction signed:', signedTransaction);

            const rawTransaction = signedTransaction.serialize();
            const signature = await connection.sendRawTransaction(rawTransaction, {
                skipPreflight: false,
                preflightCommitment: 'confirmed'
            });

            console.log('Transaction sent:', signature);

            const confirmation = await connection.confirmTransaction({
                signature,
                blockhash: latestBlockhash.blockhash,
                lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
            });

            console.log('Transaction confirmation:', confirmation);

            if (confirmation.value.err) {
                throw new Error(`Transaction failed: ${confirmation.value.err}`);
            }

            console.log('Success! Voucher burned and funds released.');
            console.log(`Tx Signature: ${signature}`);
            setBurnSuccessDialogOpen(true);
            setSuccessMessage('Voucher burned successfully');
            setShowSuccessBanner(true);
            setTimeout(() => setShowSuccessBanner(false), 3000);

        } catch (error) {
            console.error('Error in burning voucher and releasing funds:', error)
            if (error instanceof Error) {
                console.error('Error message:', error.message)
            }
            if (error.logs) {
                console.error('Transaction logs:', error.logs)
            }
            setBurnFailureDialogOpen(true)
        } finally {
            setBurning(false);
            setTransferDialogOpen(false);
        }
    };

    const handleQrScan = (data: any) => {
        if (data) {
            let scannedData: string;
            if (typeof data === 'string') {
                scannedData = data;
            } else if (data.text) {
                scannedData = data.text;
            } else {
                console.error('Unexpected QR data format:', data);
                return;
            }

            console.log('QR Data:', scannedData)
            setQrData(scannedData)
            setQrDialogOpen(false)
            setTransferDialogOpen(true)
            setTransferring(true)

            try {
                const [peerID, walletPublicKey, tokenMintAddress] = scannedData.split(',')

                const tokenUtils = new TokenUtils()
                tokenUtils.getTokenMetadata(tokenMintAddress).then(fetchedVoucherData => {
                    setVoucherData(fetchedVoucherData)

                    if (peerID) {
                        const peerConnection = peerRef.current?.connect(peerID)
                        if (peerConnection) {
                            setConn(peerConnection)
                            peerConnection.on('open', async () => {
                                console.log('Connected to Influencer:', peerID)
                                peerConnection.send(userWalletKey?.toBase58() + ',' + tokenMintAddress)

                                await checkTransferStatus(tokenMintAddress)
                                console.log('Transfer status checked.')

                                peerConnection.close()
                            })
                        }
                    }
                })
            } catch (error) {
                console.error('Failed to parse QR data:', error)
                setTransferSuccess(false)
            }
        }
    }

    const checkTransferStatus = async (tokenMintAddress: string) => {
        const startTime = Date.now()
        const timeoutDuration = 30000 // 30 seconds
        let transferConfirmed = false

        while (Date.now() - startTime < timeoutDuration) {
            console.log('Checking transfer status...')
            try {
                const ata = await getAssociatedTokenAddress(
                    new PublicKey(tokenMintAddress),
                    userWalletKey,
                    false,
                    TOKEN_2022_PROGRAM_ID,
                    ASSOCIATED_TOKEN_PROGRAM_ID
                )

                const balance = await connection.getTokenAccountBalance(ata)
                if (parseInt(balance.value.amount) > 0) {
                    transferConfirmed = true
                    break
                }
            } catch (err) {
                console.error('Error checking token balance:', err)
            }

            await new Promise((resolve) => setTimeout(resolve, 1000))
        }

        setTransferring(false)
        setTransferSuccess(transferConfirmed)
    }

    const handleQrError = (err: Error) => {
        console.error('QR Scan error:', err)
    }

    const toggleCamera = () => {
        setFacingMode(prevMode => prevMode === 'environment' ? 'user' : 'environment')
    }

    const handleLogIssue = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)
        setErrorMessage('')

        try {
            const templateParams = {
                to_name: 'VoucherVault Support',
                from_name: 'Issuer Dashboard User',
                issue_title: issueTitle,
                message: issueMessage
            }

            await emailjs.send(
                'service_f7icxfj',
                'template_682zpwu',
                templateParams,
                '9n0EOgaTKGHbKa169'
            )

            setSuccessMessage('Issue logged successfully!')
            setShowSuccessBanner(true)
            setIsIssueModalOpen(false)
            setIssueTitle('')
            setIssueMessage('')
            setTimeout(() => setShowSuccessBanner(false), 3000)
        } catch (error) {
            console.error('Error logging issue:', error)
            setErrorMessage('Failed to log issue. Please try again.')
        }

        setIsSubmitting(false)
    }

    const fetchWalletBalance = async () => {
        if (!userWalletKey || !connection) return;

        try {
            const balance = await connection.getBalance(userWalletKey);
            setWalletBalance(balance / LAMPORTS_PER_SOL);
        } catch (error) {
            console.error('Error fetching wallet balance:', error);
            setWalletBalance(null);
        }
    };

    const handleViewBalance = async () => {
        await fetchWalletBalance();
        setIsBalancePopupOpen(true);
    };

    return (
        <div className="min-h-screen bg-gray-100">
            <main className="container mx-auto px-4 py-12">
                <motion.div
                    className="text-center mb-12"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <h1 className="text-4xl font-bold mb-2 text-blue-600">Hello Issuer!</h1>
                    <p className="text-xl text-gray-600">Verify and burn vouchers redeemed at your store</p>
                </motion.div>

                <AnimatePresence mode="wait">
                    {!connected ? (
                        <motion.div
                            key="connect-wallet"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.5 }}
                            className="bg-white p-8 rounded-lg shadow-lg text-center"
                        >
                            <Gift size={48} className="mx-auto mb-4 text-blue-500" />
                            <p className="text-xl mb-4 text-gray-800">Please connect your wallet to access the issuer dashboard.</p>
                            <p className="text-gray-600">Once connected, you'll be able to verify and burn vouchers.</p>
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
                            <Loader2 size={48} className="animate-spin mx-auto mb-4 text-blue-500" />
                            <p className="text-xl mb-4 text-gray-800">Loading issuer dashboard...</p>
                            <p className="text-gray-600">Please wait while we set up your dashboard.</p>
                        </motion.div>
                    ) : (
                        <>
                            <div className="grid md:grid-cols-2 gap-8 mb-12">
                                <motion.div
                                    className="bg-white rounded-lg shadow-lg p-6"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, delay: 0.2 }}
                                >
                                    <h2 className="text-2xl font-semibold mb-6 text-blue-600 text-center">Scan Voucher</h2>
                                    <p className="text-gray-600 mb-4 text-center">Quickly verify and process customer vouchers.</p>
                                    <button
                                        onClick={handleScanVoucher}
                                        className="w-full bg-blue-500 text-white hover:bg-blue-600 py-3 px-4 rounded-lg flex items-center justify-center text-lg font-semibold transition-colors duration-200"
                                    >
                                        <QrCode className="mr-2 h-6 w-6" /> Scan Now
                                    </button>
                                </motion.div>
                                <motion.div
                                    className="bg-white rounded-lg shadow-lg p-6"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.5, delay: 0.4 }}
                                >
                                    <h2 className="text-2xl font-semibold mb-6 text-blue-600">Quick Guide</h2>
                                    <div className="space-y-4">
                                        <div className="flex items-center">
                                            <Camera className="h-8 w-8 text-blue-500 mr-4" />
                                            <p className="text-gray-600">Click "Scan Now" and hold the voucher QR code up to the camera.</p>
                                        </div>
                                        <div className="flex items-center">
                                            <ShoppingBag className="h-8 w-8 text-green-500 mr-4" />
                                            <p className="text-gray-600">For valid vouchers, proceed with the customer's transaction.</p>
                                        </div>
                                        <div className="flex items-center">
                                            <AlertTriangle className="h-8 w-8 text-yellow-500 mr-4" />
                                            <p className="text-gray-600">If a voucher is invalid, kindly inform the customer.</p>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>

                            <div className="grid md:grid-cols-3 gap-8">
                                <motion.div
                                    className="bg-white rounded-lg shadow-lg p-6"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, delay: 0.6 }}
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-semibold text-blue-600">Wallet Balance</h3>
                                        <Wallet className="h-6 w-6 text-blue-500" />
                                    </div>
                                    <p className="text-sm text-gray-600 mb-4">Check your current wallet balance.</p>
                                    <button
                                        onClick={handleViewBalance}
                                        className="w-full bg-gray-200 text-gray-800 hover:bg-gray-300 py-2 px-4 rounded-lg text-sm font-semibold transition-colors duration-200"
                                    >
                                        View Balance
                                    </button>
                                </motion.div>
                                <motion.div
                                    className="bg-white rounded-lg shadow-lg p-6"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, delay: 0.7 }}
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-semibold text-blue-600">Transaction History</h3>
                                        <FileText className="h-6 w-6 text-green-500" />
                                    </div>
                                    <p className="text-sm text-gray-600 mb-4">View your recent voucher redemption history.</p>
                                    <button
                                        onClick={() => setIsTransactionHistoryOpen(true)}
                                        className="w-full bg-gray-200 text-gray-800 hover:bg-gray-300 py-2 px-4 rounded-lg text-sm font-semibold transition-colors duration-200"
                                    >
                                        View History
                                    </button>
                                </motion.div>
                                <motion.div
                                    className="bg-white rounded-lg shadow-lg p-6"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, delay: 0.8 }}
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-semibold text-blue-600">Log an Issue</h3>
                                        <AlertOctagon className="h-6 w-6 text-red-500" />
                                    </div>
                                    <p className="text-sm text-gray-600 mb-4">Report any problems or request support.</p>
                                    <button
                                        onClick={() => setIsIssueModalOpen(true)}
                                        className="w-full bg-red-500 text-white hover:bg-red-600 py-2 px-4 rounded-lg text-sm font-semibold transition-colors duration-200"
                                    >
                                        Log an Issue
                                    </button>
                                </motion.div>
                            </div>
                        </>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {qrDialogOpen && (
                        <motion.div
                            key="qr-dialog"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                        >
                            <motion.div
                                initial={{ scale: 0.9, y: 20 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.9, y: 20 }}
                                className="bg-white p-6 rounded-lg max-w-md w-full shadow-xl"
                            >
                                <div className="flex flex-col items-center mb-6">
                                    <h2 className="text-2xl font-bold text-gray-800 mb-2">QR Scanner</h2>
                                    {isMobile && (
                                        <button
                                            onClick={toggleCamera}
                                            className="bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors duration-200 flex items-center"
                                        >
                                            <RotateCcw className="mr-2 h-4 w-4" /> Rotate Camera
                                        </button>
                                    )}
                                </div>
                                <div className="bg-gray-100 p-4 rounded-lg mb-6 relative">
                                    <div className="absolute inset-0 pointer-events-none">
                                        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500"></div>
                                        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500"></div>
                                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500"></div>
                                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500"></div>
                                    </div>
                                    <QrScanner
                                        key={facingMode}
                                        delay={300}
                                        onError={handleQrError}
                                        onScan={handleQrScan}
                                        style={{ width: '100%' }}
                                        facingMode={facingMode}
                                    />
                                </div>
                                <p className="text-sm text-gray-600 text-center mb-6">Position the QR code within the frame to scan</p>
                                <button
                                    onClick={() => setQrDialogOpen(false)}
                                    className="w-full bg-blue-500 text-white hover:bg-blue-600 py-3 px-4 rounded-lg text-lg font-semibold transition-colors duration-200"
                                >
                                    Close Scanner
                                </button>
                            </motion.div>
                        </motion.div>
                    )}

                    {isIssueModalOpen && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                        >
                            <motion.div
                                initial={{ scale: 0.9, y: 20 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.9, y: 20 }}
                                className="bg-white p-6 rounded-lg max-w-md w-full shadow-xl"
                            >
                                <h2 className="text-2xl font-bold mb-4 text-blue-600">Log an Issue</h2>
                                <form onSubmit={handleLogIssue}>
                                    <div className="mb-4">
                                        <label htmlFor="issueTitle" className="block text-sm font-medium text-gray-700 mb-1">
                                            Title
                                        </label>
                                        <input
                                            type="text"
                                            id="issueTitle"
                                            value={issueTitle}
                                            onChange={(e) => setIssueTitle(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            required
                                        />
                                    </div>
                                    <div className="mb-4">
                                        <label htmlFor="issueMessage" className="block text-sm font-medium text-gray-700 mb-1">
                                            Message
                                        </label>
                                        <textarea
                                            id="issueMessage"
                                            value={issueMessage}
                                            onChange={(e) => setIssueMessage(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            rows={4}
                                            required
                                        ></textarea>
                                    </div>
                                    {errorMessage && (
                                        <div className="mb-4 text-red-500 text-sm">{errorMessage}</div>
                                    )}
                                    <div className="flex justify-end space-x-2">
                                        <button
                                            type="button"
                                            onClick={() => setIsIssueModalOpen(false)}
                                            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                                        >
                                            {isSubmitting ? 'Submitting...' : 'Submit'}
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </motion.div>
                    )}

                    <TransactionHistoryPopup
                        isOpen={isTransactionHistoryOpen}
                        onClose={() => setIsTransactionHistoryOpen(false)}
                    />

                    <WalletBalancePopup
                        isOpen={isBalancePopupOpen}
                        onClose={() => setIsBalancePopupOpen(false)}
                        balance={walletBalance} onRefresh={undefined} />
                </AnimatePresence>

                {showSuccessBanner && (
                    <SuccessBanner message={successMessage} />
                )}
            </main>
        </div>
    )
}