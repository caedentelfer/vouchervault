"use client"

import React, { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Peer, { DataConnection } from 'peerjs'
import QrScanner from 'react-qr-scanner'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { Connection, PublicKey, SystemProgram, Transaction } from '@solana/web3.js'
import { getAssociatedTokenAddress, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { VoucherData } from '../../utils/VoucherData'
import { TokenUtils } from '../../utils/TokenUtils'
import { createReleaseEscrowAndBurnVoucherInstruction } from '../../generated/instructions'
import { CheckCircle, AlertCircle, QrCode, X, Camera, ShoppingBag, AlertTriangle, Gift, Loader2, RotateCcw } from 'lucide-react'
import SuccessBanner from '../components/SuccessBanner'
import { SYSVAR_CLOCK_PUBKEY } from '@solana/web3.js'
import { useCountry } from '../contexts/CountryContext'

export default function IssuerDashboard() {
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

    const program = "gidsaNxwQbr6pyLDaqVn4pPwAypkjwFNZQvvKBJ1Rbi"

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
                const solToUsd = 20 // Assuming 1 SOL = $20 USD, replace with actual rate
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

                                //peerConnection.send('Transfer valid')

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

    return (
        <div className="min-h-screen bg-gradient-to-b from-background to-secondary/10">
            <main className="container mx-auto px-4 py-12">
                <motion.div
                    className="text-center mb-12"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <h1 className="text-4xl font-bold mb-2 text-primary">Hello Issuer!</h1>
                    <p className="text-xl text-muted-foreground">Verify and burn vouchers redeemed at your store</p>
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
                        <>
                            <motion.div
                                className="bg-card text-card-foreground rounded-lg shadow-md p-6 mb-8"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.2 }}
                            >
                                <h2 className="text-2xl font-semibold mb-4 text-center">Scan Now</h2>
                                <button
                                    onClick={handleScanVoucher}
                                    className="w-full bg-primary text-primary-foreground py-3 px-4 rounded-md hover:bg-primary/90 transition duration-300 flex items-center justify-center text-lg font-semibold"
                                >
                                    <QrCode className="mr-2 h-6 w-6" /> Scan Voucher
                                </button>
                            </motion.div>

                            <div className="grid md:grid-cols-2 gap-8">
                                <motion.div
                                    className="bg-card text-card-foreground rounded-lg shadow-md p-6"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.5, delay: 0.4 }}
                                >
                                    <h3 className="text-xl font-semibold mb-4">How to Scan</h3>
                                    <div className="flex items-center mb-4">
                                        <Camera className="h-12 w-12 text-primary mr-4" />
                                        <p>Hold the voucher image up to the camera and click "Scan Voucher"</p>
                                    </div>
                                </motion.div>
                                <motion.div
                                    className="bg-card text-card-foreground rounded-lg shadow-md p-6"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.5, delay: 0.6 }}
                                >
                                    <h3 className="text-xl font-semibold mb-4">After Scanning</h3>
                                    <div className="flex items-center mb-4">
                                        <ShoppingBag className="h-12 w-12 text-green-500 mr-4" />
                                        <p>If the voucher is valid, hand over the item(s) to the customer</p>
                                    </div>
                                    <div className="flex items-center">
                                        <AlertTriangle className="h-12 w-12 text-destructive mr-4" />
                                        <p>If the voucher is not valid, inform the customer and deny the product</p>
                                    </div>
                                </motion.div>
                            </div>
                        </>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {qrDialogOpen && (
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
                                className="bg-card p-6 rounded-lg max-w-md w-full shadow-xl"
                            >
                                <div className="flex flex-col items-center mb-4">
                                    <h2 className="text-2xl font-bold text-primary mb-2">QR Scanner</h2>
                                    {isMobile && (
                                        <button
                                            onClick={toggleCamera}
                                            className="bg-secondary text-secondary-foreground py-2 px-4 rounded-md hover:bg-secondary/90 transition duration-300 flex items-center"
                                        >
                                            <RotateCcw className="mr-2 h-4 w-4" /> Rotate Camera
                                        </button>
                                    )}
                                </div>
                                <div className="bg-secondary p-4 rounded-lg mb-4 relative">
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
                                <p className="text-sm text-muted-foreground text-center">Position the QR code within the frame to scan</p>
                                <button
                                    onClick={() => setQrDialogOpen(false)}
                                    className="mt-4 w-full bg-primary text-primary-foreground py-2 px-4 rounded-md hover:bg-primary/90 transition duration-300"
                                >
                                    Close
                                </button>
                            </motion.div>
                        </motion.div>
                    )}

                    {transferDialogOpen && (
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
                                className="bg-card p-6 rounded-lg max-w-md w-full shadow-xl"
                            >
                                {transferring ? (
                                    <div className="text-center">
                                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
                                        <p className="text-xl text-foreground">Verifying and transferring voucher...</p>
                                    </div>
                                ) : transferSuccess ? (
                                    <div className="text-center">
                                        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                                        <h2 className="text-2xl font-bold mb-4 text-primary">Verification Successful</h2>
                                        {voucherData && (
                                            <div className="bg-secondary p-6 rounded-lg mb-4 shadow-md">
                                                <img
                                                    src={voucherData.uri}
                                                    alt={voucherData.name}
                                                    className="w-40 h-40 object-cover rounded-lg mx-auto mb-4 shadow-lg"
                                                />
                                                <h3 className="font-semibold text-xl mb-2 text-primary">{voucherData.name}</h3>
                                                <p className="text-muted-foreground mb-2">{voucherData.symbol}</p>
                                                <p className="text-sm text-muted-foreground mb-4 italic">{voucherData.description}</p>
                                                <p className="text-green-500 font-bold text-2xl mb-4">
                                                    + {currencySymbol} {convertSolToLocalCurrency(parseFloat(voucherData.escrow))}
                                                    <span className="text-sm text-muted-foreground ml-2">({voucherData.escrow} SOL)</span>
                                                </p>
                                                <button
                                                    onClick={() => handleBurn(voucherData.mintAddress, voucherData.escrowAddress)}
                                                    className="w-full bg-primary text-primary-foreground py-3 px-4 rounded-md hover:bg-primary/90 transition duration-300 text-lg font-semibold"
                                                    disabled={burning}
                                                >
                                                    {burning ? 'Burning...' : 'Burn Voucher'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center">
                                        <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
                                        <h2 className="text-2xl font-bold mb-4 text-destructive">Voucher transfer failed</h2>
                                        <p className="text-muted-foreground mb-4">Please try scanning the voucher again.</p>
                                        <button
                                            onClick={() => setTransferDialogOpen(false)}
                                            className="w-full bg-secondary text-secondary-foreground py-2 px-4 rounded-md hover:bg-secondary/90 transition duration-300 mt-4"
                                        >
                                            Close
                                        </button>
                                    </div>
                                )}
                            </motion.div>
                        </motion.div>
                    )}

                    {burnSuccessDialogOpen && (
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
                                className="bg-card p-6 rounded-lg max-w-md w-full shadow-xl"
                            >
                                <div className="text-center">
                                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                                    <h2 className="text-2xl font-bold mb-4 text-primary">Success</h2>
                                    <p className="text-muted-foreground mb-6">Voucher burned successfully, funds have been released from escrow.</p>
                                    <button
                                        onClick={() => setBurnSuccessDialogOpen(false)}
                                        className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-md hover:bg-primary/90 transition duration-300"
                                    >
                                        Close
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}

                    {burnFailureDialogOpen && (
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
                                className="bg-card p-6 rounded-lg max-w-md w-full shadow-xl"
                            >
                                <div className="text-center">
                                    <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
                                    <h2 className="text-2xl font-bold mb-4 text-destructive">Burn Failed</h2>
                                    <p className="text-muted-foreground mb-6">There was an error while burning the voucher. Please try again or contact support if the issue persists.</p>
                                    <button
                                        onClick={() => setBurnFailureDialogOpen(false)}
                                        className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-md hover:bg-primary/90 transition duration-300"
                                    >
                                        Close
                                    </button>
                                </div>
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