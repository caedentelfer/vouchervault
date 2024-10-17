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
import { CheckCircle, AlertCircle, QrCode, X, Camera, ShoppingBag, AlertTriangle, Gift, Loader2, RotateCcw, FileText, Wallet, AlertOctagon, RefreshCw, Flame } from 'lucide-react'
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
                        Your balance on the Solana network.
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
    const scannedRef = useRef(false);
    const [showErrorPopup, setShowErrorPopup] = useState(false)

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
    }, [])

    useEffect(() => {
        const fetchExchangeRate = async () => {
            try {
                if (!country.currency) {
                    console.error('Country currency not defined')
                    return
                }

                // Ensure the currency code is lowercase as required by CoinGecko
                const currency = country.currency.toLowerCase()

                // Fetch SOL price in the desired currency from CoinGecko
                const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=${currency}`)
                const data = await response.json()

                if (data.solana && data.solana[currency] !== undefined) {
                    const solPriceInLocalCurrency = data.solana[currency]
                    setExchangeRate(solPriceInLocalCurrency)
                    setCurrencySymbol(country.currencySymbol)
                    console.log(`Fetched SOL price in ${currency.toUpperCase()}: ${solPriceInLocalCurrency}`)
                } else {
                    throw new Error(`SOL price not available in ${currency.toUpperCase()}`)
                }
            } catch (error) {
                console.error('Failed to fetch exchange rate from CoinGecko:', error)
                // Optionally, you can fallback to a default rate or another API
            }
        }

        fetchExchangeRate()

        // Optionally, set up an interval to refresh the exchange rate periodically
        const intervalId = setInterval(fetchExchangeRate, 60000) // Refresh every 60 seconds

        return () => clearInterval(intervalId)
    }, [country])

    const convertSolToLocalCurrency = (solAmount: number) => {
        return (solAmount * exchangeRate).toFixed(2)
    }

    const handleScanVoucher = () => {
        scannedRef.current = false;
        setQrDialogOpen(true);
    };

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
                userWalletKey!,
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
        if (data && !scannedRef.current) {
            scannedRef.current = true;

            let scannedData: string;
            if (typeof data === 'string') {
                scannedData = data;
            } else if (data.text) {
                scannedData = data.text;
            } else {
                console.error('Unexpected QR data format:', data);
                return;
            }

            console.log('QR Data:', scannedData);
            setQrData(scannedData);
            setQrDialogOpen(false);
            setTransferDialogOpen(true);
            setTransferring(true);

            try {
                const [peerID, walletPublicKey, tokenMintAddress] = scannedData.split(',');

                const tokenUtils = new TokenUtils();
                tokenUtils.getTokenMetadata(tokenMintAddress).then((fetchedVoucherData) => {
                    setVoucherData(fetchedVoucherData);

                    const targetEscrow = fetchedVoucherData.escrowAddress;
                    const targetAddress = tokenUtils.getRecipientFromEscrow(targetEscrow);

                    if (peerID) {
                        const peerConnection = peerRef.current?.connect(peerID);
                        if (peerConnection) {
                            setConn(peerConnection);
                            peerConnection.on('open', async () => {
                                console.log('Connected to Influencer:', peerID);
                                peerConnection.send(userWalletKey?.toBase58() + ',' + tokenMintAddress + ',' + targetEscrow);

                                console.log('Target address: ', targetAddress);
                                console.log('Wallet address: ', userWalletKey?.toBase58());

                                if (userWalletKey?.toBase58() !== await targetAddress) {
                                    console.error('Wallet address does not match target address:', targetAddress);
                                    setTransferSuccess(false);
                                    setQrDialogOpen(false);
                                    setTransferDialogOpen(false);
                                    peerConnection.send('Transfer invalid');
                                    peerConnection.close();
                                    setShowErrorPopup(true)
                                    // Show error here
                                    return;
                                } else {
                                    checkTransferStatus(tokenMintAddress);
                                    console.log('Transfer status checked.');

                                    peerConnection.send('Transfer valid');
                                    peerConnection.close();
                                }
                            });
                        }
                    }
                });
            } catch (error) {
                console.error('Failed to parse QR data:', error);
                setTransferSuccess(false);
            }
        }
    };

    const checkTransferStatus = async (tokenMintAddress: string) => {
        const startTime = Date.now()
        const timeoutDuration = 30000 // 30 seconds
        let transferConfirmed = false

        while (Date.now() - startTime < timeoutDuration) {
            console.log('Checking transfer status...')
            try {
                const ata = await getAssociatedTokenAddress(
                    new PublicKey(tokenMintAddress),
                    userWalletKey!,
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

    const handleCloseErrorPopup = () => {
        setShowErrorPopup(false)
    }

    useEffect(() => {
        fetchWalletBalance();
        const intervalId = setInterval(fetchWalletBalance, 2000);
        return () => clearInterval(intervalId);
    }, [userWalletKey, connection]);

    const handleViewBalance = () => {
        setIsBalancePopupOpen(true);
    };

    const handleRefreshBalance = () => {
        fetchWalletBalance();
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-background to-secondary/10">
            <main className="container mx-auto px-4 py-12">
                <motion.div
                    className="text-center mb-12"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <h1 className="text-4xl font-bold mb-2 text-primary">Welcome, Issuer!</h1>
                    <p className="text-xl text-muted-foreground">Verify vouchers and claim funds to your account</p>
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
                            <p className="text-xl mb-4">Please connect your wallet to access the issuer dashboard.</p>
                            <p className="text-muted-foreground">Once connected, you'll be able to verify and burn vouchers.</p>
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
                            <p className="text-xl mb-4">Loading issuer dashboard...</p>
                            <p className="text-muted-foreground">Please wait while we set up your dashboard.</p>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="dashboard-content"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.5 }}
                        >
                            <div className="grid md:grid-cols-4 gap-8 mb-8">
                                <div className="bg-card text-card-foreground rounded-lg shadow-lg p-6 md:col-span-3">
                                    <h2 className="text-2xl font-semibold mb-4 text-primary">Scan Voucher</h2>
                                    <p className="text-muted-foreground mb-6">
                                        Use this feature to scan and verify vouchers presented by customers. Ensure the QR code is clearly visible and within the scanner frame.
                                    </p>
                                    <button
                                        onClick={handleScanVoucher}
                                        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-3 px-4 rounded-lg flex items-center justify-center text-lg font-semibold transition-colors duration-200"
                                    >
                                        <QrCode className="mr-2 h-6 w-6" /> Scan Now
                                    </button>
                                </div>

                                <div className="bg-card text-card-foreground rounded-lg shadow-lg p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-semibold text-primary">Wallet Balance</h3>
                                        <Wallet className="h-6 w-6 text-primary" />
                                    </div>
                                    <AnimatePresence mode="wait">
                                        <motion.p
                                            key={walletBalance}
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 10 }}
                                            transition={{ duration: 0.3 }}
                                            className="text-2xl font-bold text-green-500 mb-2"
                                        >
                                            {walletBalance !== null
                                                ? `${currencySymbol}${convertSolToLocalCurrency(walletBalance)}`
                                                : 'Loading...'}
                                        </motion.p>
                                    </AnimatePresence>
                                    <p className="text-sm text-muted-foreground">
                                        {walletBalance !== null ? `${walletBalance.toFixed(4)} SOL` : ''}
                                    </p>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-4 gap-8">
                                <div className="bg-card text-card-foreground rounded-lg shadow-lg p-6 md:col-span-3">
                                    <h2 className="text-2xl font-semibold mb-6 text-primary">Quick Guide</h2>
                                    <div className="space-y-6">
                                        <div className="flex items-start space-x-4">
                                            <Camera className="h-8 w-8 text-primary mt-1 flex-shrink-0" />
                                            <div>
                                                <h4 className="font-semibold mb-1">Scan the Voucher</h4>
                                                <p className="text-muted-foreground">Click "Scan Now" and position the voucher's QR code within the camera frame. Ensure good lighting for best results.</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start space-x-4">
                                            <ShoppingBag className="h-8 w-8 text-green-500 mt-1 flex-shrink-0" />
                                            <div>
                                                <h4 className="font-semibold mb-1">Process Valid Vouchers</h4>
                                                <p className="text-muted-foreground">For valid vouchers, proceed with the customer's transaction. Confirm the voucher details before finalizing.</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start space-x-4">
                                            <AlertTriangle className="h-8 w-8 text-yellow-500 mt-1 flex-shrink-0" />
                                            <div>
                                                <h4 className="font-semibold mb-1">Handle Invalid Vouchers</h4>
                                                <p className="text-muted-foreground">If a voucher is invalid, politely inform the customer. Explain the reason if possible and suggest alternative options.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-8">
                                    <div className="bg-card text-card-foreground rounded-lg shadow-lg p-6 flex flex-col h-[calc(50%-1rem)]">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-lg font-semibold text-primary">Transaction History</h3>
                                            <FileText className="h-6 w-6 text-green-500" />
                                        </div>
                                        <p className="text-sm text-muted-foreground mb-4 flex-grow">View your recent voucher redemption history.</p>
                                        <button
                                            onClick={() => setIsTransactionHistoryOpen(true)}
                                            className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 py-2 px-4 rounded-lg text-sm font-semibold transition-colors duration-200 mt-auto"
                                        >
                                            View History
                                        </button>
                                    </div>

                                    <div className="bg-card text-card-foreground rounded-lg shadow-lg p-6 flex flex-col h-[calc(50%-1rem)]">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-lg font-semibold text-primary">Log an Issue</h3>
                                            <AlertOctagon className="h-6 w-6 text-destructive" />
                                        </div>
                                        <p className="text-sm text-muted-foreground mb-4 flex-grow">Report problems or request support.</p>
                                        <button
                                            onClick={() => setIsIssueModalOpen(true)}
                                            className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90 py-2 px-4 rounded-lg text-sm font-semibold transition-colors duration-200 mt-auto"
                                        >
                                            Log an Issue
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {showErrorPopup && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                className="bg-background p-8 rounded-lg shadow-xl max-w-md w-full"
                            >
                                <div className="flex items-center justify-center mb-4">
                                    <AlertCircle className="text-destructive w-12 h-12" />
                                </div>
                                <h2 className="text-2xl font-bold mb-2 text-destructive text-center">Invalid Voucher</h2>
                                <p className="text-center mb-6 text-muted-foreground">
                                    This voucher cannot be redeemed at this store.
                                </p>
                                <button
                                    onClick={handleCloseErrorPopup}
                                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg text-lg font-semibold transition-colors duration-200"
                                >
                                    Close
                                </button>
                            </motion.div>
                        </motion.div>
                    )}
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
                                className="bg-card text-card-foreground p-6 rounded-lg max-w-md w-full shadow-xl"
                            >
                                <div className="flex flex-col items-center mb-6">
                                    <h2 className="text-2xl font-bold text-primary mb-2">QR Scanner</h2>
                                    {isMobile && (
                                        <button
                                            onClick={toggleCamera}
                                            className="bg-secondary text-secondary-foreground py-2 px-4 rounded-lg hover:bg-secondary/90 transition-colors duration-200 flex items-center"
                                        >
                                            <RotateCcw className="mr-2 h-4 w-4" /> Rotate Camera
                                        </button>
                                    )}
                                </div>
                                <div className="bg-secondary p-4 rounded-lg mb-6 relative">
                                    <div className="absolute inset-0 pointer-events-none">
                                        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary"></div>
                                        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary"></div>
                                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary"></div>
                                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary"></div>
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
                                <p className="text-sm text-muted-foreground text-center mb-6">Position the QR code within the frame to scan</p>
                                <button
                                    onClick={() => setQrDialogOpen(false)}
                                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-3 px-4 rounded-lg text-lg font-semibold transition-colors duration-200"
                                >
                                    Close Scanner
                                </button>
                            </motion.div>
                        </motion.div>
                    )}

                    {transferDialogOpen && (
                        <motion.div
                            key="transfer-dialog"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                        >
                            <motion.div
                                initial={{ scale: 0.9, y: 20 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.9, y: 20 }}
                                className="bg-card text-card-foreground p-6 rounded-lg max-w-md w-full shadow-xl"
                            >
                                <div className="text-center">
                                    <h2 className="text-2xl font-bold text-primary mb-4">Voucher Verification</h2>
                                    {transferring ? (
                                        <div>
                                            <Loader2 className="animate-spin h-12 w-12 mx-auto mb-4 text-primary" />
                                            <p className="text-lg mb-2">Processing Transfer</p>
                                            <p className="text-muted-foreground">Please wait while we verify the voucher...</p>
                                        </div>
                                    ) : transferSuccess === null ? (
                                        <p className="text-lg mb-4">Initiating transfer...</p>
                                    ) : transferSuccess ? (
                                        <div>
                                            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                                            <p className="text-lg mb-2 text-green-500 font-semibold">Transfer Successful</p>
                                            {voucherData && (
                                                <div className="bg-white p-4 rounded-lg mb-4 border-2 border-blue-500">
                                                    <img
                                                        src={voucherData.uri}
                                                        alt="Voucher"
                                                        className="w-40 h-40 object-cover rounded-lg mb-4 mx-auto"
                                                    />
                                                    <h3 className="font-semibold mb-2">{voucherData.name}</h3>
                                                    <p className="text-sm font-medium mb-2">{voucherData.symbol}</p>
                                                    <p className="text-sm text-muted-foreground mb-2">{voucherData.description}</p>
                                                    <p className="text-3xl font-bold text-green-500 mb-2">
                                                        {currencySymbol}{convertSolToLocalCurrency(Number(voucherData.escrow))}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground mb-2">({voucherData.escrow} SOL)</p>
                                                </div>
                                            )}
                                            <button
                                                onClick={() => voucherData && handleBurn(voucherData.mintAddress, voucherData.escrowAddress)}
                                                className={`w-full ${burning
                                                    ? 'bg-red-500 hover:bg-red-500'
                                                    : 'bg-primary hover:bg-primary/90'
                                                    } text-primary-foreground py-2 px-4 rounded-lg text-lg font-semibold transition-colors duration-200 flex items-center justify-center`}
                                                disabled={burning}
                                            >
                                                {burning ? (
                                                    <>
                                                        <Loader2 className="animate-spin mr-2 h-5 w-5" />
                                                        Burning...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Flame className="mr-2 h-5 w-5" />
                                                        Burn Voucher
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    ) : (
                                        <div>
                                            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
                                            <p className="text-lg mb-2 text-destructive font-semibold">Transfer Failed</p>
                                            <p className="text-muted-foreground mb-4">The voucher transfer could not be completed. Please try again.</p>
                                            <button
                                                onClick={() => setTransferDialogOpen(false)}
                                                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-2 px-4 rounded-lg text-lg font-semibold transition-colors duration-200"
                                            >
                                                Close
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        </motion.div>
                    )}

                    {burnSuccessDialogOpen && (
                        <motion.div
                            key="burn-success-dialog"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                        >
                            <motion.div
                                initial={{ scale: 0.9, y: 20 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.9, y: 20 }}
                                className="bg-card text-card-foreground p-6 rounded-lg max-w-md w-full shadow-xl"
                            >
                                <div className="text-center">
                                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                                    <h2 className="text-2xl font-bold text-primary mb-2">Voucher Burned Successfully</h2>
                                    <p className="text-muted-foreground mb-4">The voucher has been burned and the funds have been released.</p>
                                    <button
                                        onClick={() => {
                                            setBurnSuccessDialogOpen(false);
                                            setTransferDialogOpen(false);
                                        }}
                                        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-2 px-4 rounded-lg text-lg font-semibold transition-colors duration-200"
                                    >
                                        Close
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}

                    {burnFailureDialogOpen && (
                        <motion.div
                            key="burn-failure-dialog"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                        >
                            <motion.div
                                initial={{ scale: 0.9, y: 20 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.9, y: 20 }}
                                className="bg-card text-card-foreground p-6 rounded-lg max-w-md w-full shadow-xl"
                            >
                                <div className="text-center">
                                    <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
                                    <h2 className="text-2xl font-bold text-primary mb-2">Voucher Burn Failed</h2>
                                    <p className="text-muted-foreground mb-4">There was an error while attempting to burn the voucher. Please try again or contact support if the issue persists.</p>
                                    <button
                                        onClick={() => {
                                            setBurnFailureDialogOpen(false);
                                            setTransferDialogOpen(false);
                                        }}
                                        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-2 px-4 rounded-lg text-lg font-semibold transition-colors duration-200"
                                    >
                                        Close
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}

                    {isTransactionHistoryOpen && (
                        <TransactionHistoryPopup
                            isOpen={isTransactionHistoryOpen}
                            onClose={() => setIsTransactionHistoryOpen(false)}
                        />
                    )}

                    {isIssueModalOpen && (
                        <motion.div
                            key="issue-modal"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                        >
                            <motion.div
                                initial={{ scale: 0.9, y: 20 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.9, y: 20 }}
                                className="bg-card text-card-foreground p-6 rounded-lg max-w-md w-full shadow-xl"
                            >
                                <h2 className="text-2xl font-bold text-primary mb-4">Log an Issue</h2>
                                <form onSubmit={handleLogIssue}>
                                    <div className="mb-4">
                                        <label htmlFor="issueTitle" className="block text-sm font-medium text-muted-foreground mb-1">
                                            Issue Title
                                        </label>
                                        <input
                                            type="text"
                                            id="issueTitle"
                                            value={issueTitle}
                                            onChange={(e) => setIssueTitle(e.target.value)}
                                            className="w-full px-3 py-2 border border-input bg-background rounded-md"
                                            required
                                        />
                                    </div>
                                    <div className="mb-4">
                                        <label htmlFor="issueMessage" className="block text-sm font-medium text-muted-foreground mb-1">
                                            Issue Description
                                        </label>
                                        <textarea
                                            id="issueMessage"
                                            value={issueMessage}
                                            onChange={(e) => setIssueMessage(e.target.value)}
                                            className="w-full px-3 py-2 border border-input bg-background rounded-md"
                                            rows={4}
                                            required
                                        ></textarea>
                                    </div>
                                    {errorMessage && (
                                        <p className="text-destructive mb-4">{errorMessage}</p>
                                    )}
                                    <div className="flex justify-end space-x-4">
                                        <button
                                            type="button"
                                            onClick={() => setIsIssueModalOpen(false)}
                                            className="px-4 py-2 border border-input bg-background rounded-md text-muted-foreground hover:bg-secondary transition-colors duration-200"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors duration-200"
                                            disabled={isSubmitting}
                                        >
                                            {isSubmitting ? 'Submitting...' : 'Submit'}
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </motion.div>
                    )}

                    {isBalancePopupOpen && (
                        <WalletBalancePopup
                            isOpen={isBalancePopupOpen}
                            onClose={() => setIsBalancePopupOpen(false)}
                            balance={walletBalance}
                            onRefresh={handleRefreshBalance}
                        />
                    )}
                </AnimatePresence>

                {showSuccessBanner && (
                    <SuccessBanner key="success-banner" message={successMessage} />
                )}
            </main>
        </div>
    )
}
