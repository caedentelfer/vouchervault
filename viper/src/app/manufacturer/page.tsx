"use client"

import React, { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWallet } from '@solana/wallet-adapter-react'
import * as web3 from '@solana/web3.js'
import * as splToken from '@solana/spl-token'
import { CurrencyConverter } from '../../utils/CurrencyConverter'
import { createInitEscrowAndMintVoucherInstruction, InitEscrowAndMintVoucherInstructionAccounts, InitEscrowAndMintVoucherInstructionArgs } from '../../generated/instructions/InitEscrowAndMintVoucher'
import { InitEscrowArgs } from '../../generated/types/InitEscrowArgs'
import { MintVoucherArgs } from '../../generated/types/MintVoucherArgs'
import { pinFileToIPFS, pinJSONToIPFS } from '../../utils/uri'
import { CreditCard, Send, History, X, Upload, CheckCircle, AlertCircle, Coins, UserCheck, Clock, Loader2, Gift, ChevronUp, ChevronDown } from 'lucide-react'
import { TokenUtils } from '../../utils/TokenUtils'
import { VoucherData } from '../../utils/VoucherData'
import VoucherList from '../components/VoucherList'
import { RecentTransactions } from '../utils/RecentTransactions'
import SuccessBanner from '../components/SuccessBanner'
import { useCountry } from '../contexts/CountryContext'

const companyOptions = [
    { name: 'Sportsmans Warehouse', address: '7v4szbR5y887oFLruu6TGFV7qCigAk1KXcs6gaSMjGof' },
    { name: 'Totalsports', address: 'TS_SOLANA_WALLET_ADDRESS' },
    { name: 'Mr Price Sport', address: 'MPS_SOLANA_WALLET_ADDRESS' },
    { name: 'Custom', address: '' }
]

export default function ManufacturerDashboard() {
    const [totalVouchers, setTotalVouchers] = useState(0)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [showErrorPopup, setShowErrorPopup] = useState(false)
    const [currencyAmount, setCurrencyAmount] = useState('')
    const [solEquivalent, setSolEquivalent] = useState('')
    const [itemName, setItemName] = useState('')
    const [symbol, setSymbol] = useState('')
    const [description, setDescription] = useState('')
    const [expirationDate, setExpirationDate] = useState<Date | null>(null)
    const [targetCompany, setTargetCompany] = useState('')
    const [voucherImage, setVoucherImage] = useState<File | null>(null)
    const { publicKey, signTransaction, connected } = useWallet()
    const [voucherImageHash, setVoucherImageHash] = useState<string | null>(null)
    const [selectedCompany, setSelectedCompany] = useState('')
    const [refreshTrigger, setRefreshTrigger] = useState(0)
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [activeSection, setActiveSection] = useState<'mint' | 'transfer' | 'history' | null>(null)
    const [vouchers, setVouchers] = useState<VoucherData[]>([])
    const [fetchingVouchers, setFetchingVouchers] = useState(false)
    const contentRef = useRef<HTMLDivElement>(null)
    const [showSuccessBanner, setShowSuccessBanner] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const { country, exchangeRate } = useCountry()
    const [isImageUploading, setIsImageUploading] = useState(false)

    useEffect(() => {
        if (connected && publicKey) {
            fetchVouchers()
        }
    }, [connected, publicKey, refreshTrigger])

    const fetchVouchers = async () => {
        if (!publicKey) return
        setFetchingVouchers(true)
        try {
            const tokenUtils = new TokenUtils()
            const voucherData = await tokenUtils.populateVoucherArray(publicKey.toBase58())
            setVouchers(voucherData)
            setTotalVouchers(voucherData.length)
        } catch (err) {
            console.error('Error fetching voucher data:', err)
            setErrorMessage('Failed to fetch voucher data')
        } finally {
            setFetchingVouchers(false)
        }
    }

    const handleCompanyChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const company = companyOptions.find(c => c.name === event.target.value)
        if (company) {
            setSelectedCompany(company.name)
        } else {
            setErrorMessage("Selected company not found")
            setShowErrorPopup(true)
        }
        if (company) {
            setTargetCompany(company.address)
        } else {
            setErrorMessage("Selected company not found")
            setShowErrorPopup(true)
        }
    }

    const handleRefresh = () => {
        setRefreshTrigger(prev => prev + 1)
    }

    const handleWalletAddressChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const address = event.target.value
        setTargetCompany(address)

        if (selectedCompany === 'Custom') {
            const isValid = await validateWalletAddress(address)
            if (!isValid) {
                setErrorMessage("Please enter a valid and active wallet address")
                setShowErrorPopup(true)
            } else {
                setErrorMessage(null)
                setShowErrorPopup(false)
            }
        }
    }

    const handleMintVoucher = async () => {
        if (!validateForm()) {
            return;
        }

        setLoading(true);

        try {
            setErrorMessage(null);

            await mintOnChain(
                publicKey, signTransaction, setErrorMessage, setShowErrorPopup,
                itemName, description, expirationDate, targetCompany,
                solEquivalent, voucherImageHash, symbol
            );

            setSuccessMessage('Voucher minted successfully!');
            setShowSuccessBanner(true);
            resetForm();
            handleRefresh();

            // Hide the success banner after 3 seconds
            setTimeout(() => {
                setShowSuccessBanner(false);
            }, 3000);
        } catch (error) {
            setErrorMessage('Failed to mint voucher.');
            setShowErrorPopup(true);
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const closeActiveSection = () => {
        setActiveSection(null)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const resetForm = () => {
        setItemName('')
        setDescription('')
        setExpirationDate(null)
        setTargetCompany('')
        setVoucherImage(null)
        setVoucherImageHash('')
        setCurrencyAmount('')
        setSelectedCompany('Custom')
        setSymbol('')
    }

    const validateForm = () => {
        if (!itemName || !symbol || !expirationDate || targetCompany.length !== 44 || !voucherImageHash || !currencyAmount) {
            setErrorMessage("Please fill in all required fields correctly.")
            setShowErrorPopup(true)
            return false
        }

        if (symbol.length >= 10) {
            setErrorMessage("Company name must be 10 characters or less")
            setShowErrorPopup(true)
            return false
        }

        if (expirationDate < new Date()) {
            setErrorMessage("Expiration date must be in the future")
            setShowErrorPopup(true)
            return false
        }

        if (isNaN(parseFloat(currencyAmount))) {
            setErrorMessage("Currency amount must be a number")
            setShowErrorPopup(true)
            return false
        }

        return true
    }

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0]
            setVoucherImage(file)
            setIsImageUploading(true)

            try {
                const ipfsHash = await pinFileToIPFS(file, "VoucherImage")
                console.log("File uploaded to IPFS. Hash:", ipfsHash)
                setVoucherImageHash(ipfsHash)
            } catch (error) {
                console.error("Error uploading to IPFS:", error)
                setErrorMessage("Failed to upload image to IPFS")
                setShowErrorPopup(true)
            } finally {
                setIsImageUploading(false)
            }
        }
    }

    const validateWalletAddress = async (address: string): Promise<boolean> => {
        try {
            const connection = new web3.Connection(web3.clusterApiUrl('devnet'), 'confirmed')
            const publicKey = new web3.PublicKey(address)
            const balance = await connection.getBalance(publicKey)
            return balance > 0
        } catch (error) {
            console.error('Invalid wallet address:', error)
            return false
        }
    }

    const convertCurrency = (currency: string) => {
        const sol = parseFloat(currency) / exchangeRate
        if (isNaN(sol)) {
            setSolEquivalent('0')
            return
        }
        setSolEquivalent(sol.toFixed(6))
    }

    const mintOnChain = async (
        payerPublicKey: web3.PublicKey | null,
        signTransaction: ((transaction: web3.Transaction) => Promise<web3.Transaction>) | undefined,
        setErrorMessage: (message: string) => void,
        setShowErrorPopup: (show: boolean) => void,
        title: string,
        description: string,
        expirationDate: Date | null,
        targetCompany: string,
        voucherValue: string,
        voucherImageHash: string | null,
        symbol: string
    ) => {
        try {
            if (!targetCompany) {
                setErrorMessage("Please enter a target company wallet address")
                setShowErrorPopup(true)
                return
            }

            const voucherValueBigInt = BigInt(Math.floor(parseFloat(voucherValue) * web3.LAMPORTS_PER_SOL))

            const connection = new web3.Connection(web3.clusterApiUrl('devnet'), 'confirmed')

            if (!payerPublicKey || !signTransaction) {
                setErrorMessage("Wallet not connected")
                setShowErrorPopup(true)
                return
            }

            const currentBalance = await connection.getBalance(payerPublicKey)

            if (currentBalance < voucherValueBigInt) {
                setErrorMessage("Wallet balance is too low")
                setShowErrorPopup(true)
                return
            }

            const mintKeypair = web3.Keypair.generate()

            const recipient = new web3.PublicKey(targetCompany)

            const [escrowAccount] = web3.PublicKey.findProgramAddressSync(
                [
                    Buffer.from('escrow'),
                    payerPublicKey.toBuffer(),
                    recipient.toBuffer(),
                    mintKeypair.publicKey.toBuffer(),
                ],
                new web3.PublicKey('gidsaNxwQbr6pyLDaqVn4pPwAypkjwFNZQvvKBJ1Rbi')
            )

            const [mintAuthority] = web3.PublicKey.findProgramAddressSync(
                [Buffer.from('mint_authority')],
                new web3.PublicKey('gidsaNxwQbr6pyLDaqVn4pPwAypkjwFNZQvvKBJ1Rbi')
            )

            const associatedTokenAccountAddress = await splToken.getAssociatedTokenAddress(
                mintKeypair.publicKey,
                payerPublicKey,
                false,
                splToken.TOKEN_2022_PROGRAM_ID,
                splToken.ASSOCIATED_TOKEN_PROGRAM_ID
            )

            const accounts = {
                escrowAccount: escrowAccount,
                mintAccount: mintKeypair.publicKey,
                mintAuthority: mintAuthority,
                associatedTokenAccount: associatedTokenAccountAddress,
                payer: payerPublicKey,
                rent: web3.SYSVAR_RENT_PUBKEY,
                systemProgram: web3.SystemProgram.programId,
                tokenProgram: splToken.TOKEN_2022_PROGRAM_ID,
                associatedTokenProgram: splToken.ASSOCIATED_TOKEN_PROGRAM_ID,
            } as InitEscrowAndMintVoucherInstructionAccounts
            if (!expirationDate) {
                throw new Error("Expiration date is required");
            }
            const expiry = BigInt(Math.floor(expirationDate.getTime()))

            let metadataURI = ''
            try {
                const ipfsHash = voucherImageHash
                if (!ipfsHash) {
                    throw new Error("Image not uploaded to IPFS")
                }
                const metadata = {
                    name: title,
                    symbol: symbol,
                    description: description,
                    image: `https://ipfs.io/ipfs/${ipfsHash}`,
                }
                const ipfsMetadata = await pinJSONToIPFS(metadata, title)
                metadataURI = `https://ipfs.io/ipfs/${ipfsMetadata}`
            } catch (error) {
                console.error('IPFS upload failed:', error)
                throw error
            }

            const args = {
                arg0: {
                    payer: payerPublicKey,
                    recipient: recipient,
                    amount: voucherValueBigInt,
                    voucherMint: mintKeypair.publicKey,
                } as InitEscrowArgs,
                arg1: {
                    title: title,
                    description: description,
                    symbol: symbol,
                    uri: metadataURI,
                    expiry: expiry,
                } as MintVoucherArgs,
            } as InitEscrowAndMintVoucherInstructionArgs

            const ix = createInitEscrowAndMintVoucherInstruction(
                accounts,
                args,
                new web3.PublicKey('gidsaNxwQbr6pyLDaqVn4pPwAypkjwFNZQvvKBJ1Rbi')
            )

            const transaction = new web3.Transaction().add(ix)

            transaction.feePayer = payerPublicKey

            const latestBlockhash = await connection.getLatestBlockhash()
            transaction.recentBlockhash = latestBlockhash.blockhash

            transaction.partialSign(mintKeypair)

            const signedTransaction = await signTransaction(transaction)

            const rawTransaction = signedTransaction.serialize()
            const signature = await connection.sendRawTransaction(rawTransaction, {
                skipPreflight: false,
                preflightCommitment: 'confirmed'
            })

            const confirmation = await connection.confirmTransaction({
                signature,
                blockhash: latestBlockhash.blockhash,
                lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
            })

            if (confirmation.value.err) {
                throw new Error(`Transaction failed: ${confirmation.value.err}`)
            }

            console.log('Success with Mint!')
            console.log(`Escrow Address: ${escrowAccount}`)
            console.log(`Mint Address: ${mintKeypair.publicKey}`)
            console.log(`ATA Address: ${associatedTokenAccountAddress}`)
            console.log(`Mint Authority: ${mintAuthority}`)
            console.log(`Tx Signature: ${signature}`)

            setTotalVouchers(prev => prev + 1)

            await new Promise(r => setTimeout(r, 15000))
            handleRefresh()

        } catch (error) {
            console.error('Error minting voucher:', error)
            let errorMsg = 'Failed to mint voucher'
            if (error instanceof web3.SendTransactionError) {
                const logs = await error.logs
                if (logs) {
                    console.log('Transaction logs:', logs)
                }
            }
            setErrorMessage(errorMsg)
            setShowErrorPopup(true)
        }
    }

    const toggleSection = (section: 'mint' | 'transfer' | 'history') => {
        if (activeSection === section) {
            setActiveSection(null)
            window.scrollTo({ top: 0, behavior: 'smooth' })
        } else {
            setActiveSection(section)
            setTimeout(() => {
                contentRef.current?.scrollIntoView({ behavior: 'smooth' })
            }, 100)
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
                    <h1 className="text-4xl font-bold mb-2 text-primary">Ready to Elevate Your Brand?</h1>
                    <p className="text-xl text-muted-foreground">Create, Transfer and Manage your vouchers</p>
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
                            <p className="text-xl mb-4">Please connect your wallet to access the dashboard.</p>
                            <p className="text-muted-foreground">Once connected, you'll be able to mint and manage your vouchers.</p>
                        </motion.div>
                    ) : (
                        <>
                            <motion.div
                                className="bg-card text-card-foreground p-6 rounded-lg shadow-lg mb-12"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.2 }}
                            >
                                <h2 className="text-2xl font-semibold mb-4 text-primary text-center">How It Works</h2>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="flex flex-col items-center text-center">
                                        <Coins className="w-12 h-12 mb-2 text-accent" />
                                        <h3 className="text-lg font-semibold mb-2">1. Mint Vouchers</h3>
                                        <p className="text-sm text-muted-foreground">Create new vouchers and assign them to specific target companies. These vouchers will only be valid at the designated outlets.</p>
                                    </div>
                                    <div className="flex flex-col items-center text-center">
                                        <UserCheck className="w-12 h-12 mb-2 text-accent" />
                                        <h3 className="text-lg font-semibold mb-2">2. Transfer to Influencers</h3>
                                        <p className="text-sm text-muted-foreground">Send minted vouchers to influencers using their wallet addresses. It's that simple!</p>
                                    </div>
                                    <div className="flex flex-col items-center text-center">
                                        <Clock className="w-12 h-12 mb-2 text-accent" />
                                        <h3 className="text-lg font-semibold mb-2">3. Monitor Transactions</h3>
                                        <p className="text-sm text-muted-foreground">Track all voucher transactions and exchanges on our platform. If a voucher expires, funds are automatically reclaimed to your account.</p>
                                    </div>
                                </div>
                            </motion.div>

                            <motion.div
                                className={`grid ${activeSection ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3'} gap-8 mb-12`}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.4 }}
                            >
                                {['mint', 'transfer', 'history'].map((section) => (
                                    <motion.button
                                        key={section}
                                        className={`p-6 rounded-lg shadow-md transition-all duration-300 flex flex-col items-center justify-between ${activeSection === section
                                            ? 'bg-accent text-accent-foreground col-span-3'
                                            : 'bg-primary text-primary-foreground hover:bg-primary/90'
                                            } ${activeSection && activeSection !== section ? 'hidden' : ''}`}
                                        onClick={() => toggleSection(section as 'mint' | 'transfer' | 'history')}
                                        whileHover={{ scale: activeSection === section ? 1 : 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        {section === 'mint' && <CreditCard className="w-16 h-16 mb-4" />}
                                        {section === 'transfer' && <Send className="w-16 h-16 mb-4" />}
                                        {section === 'history' && <History className="w-16 h-16 mb-4" />}
                                        <span className="text-xl font-semibold">
                                            {section === 'mint' && 'Mint New Vouchers'}
                                            {section === 'transfer' && 'Transfer to Influencers'}
                                            {section === 'history' && 'Transaction History'}
                                        </span>
                                        <p className="mt-2 text-sm text-center">
                                            {section === 'mint' && 'Create and issue new vouchers for your products or services.'}
                                            {section === 'transfer' && 'Distribute vouchers to your network of influencers.'}
                                            {section === 'history' && 'View and manage your past voucher transactions.'}
                                        </p>
                                        {activeSection === section ? (
                                            <ChevronDown className="w-6 h-6 mt-4" />
                                        ) : (
                                            <ChevronDown className="w-6 h-6 mt-4 opacity-0" />
                                        )}
                                    </motion.button>
                                ))}
                            </motion.div>

                            <AnimatePresence mode="wait">
                                {activeSection && (
                                    <motion.div
                                        ref={contentRef}
                                        key={activeSection}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        transition={{ duration: 0.5 }}
                                        className="bg-card text-card-foreground p-6 rounded-lg shadow-lg w-full relative mb-4"
                                    >
                                        {activeSection === 'mint' && (
                                            <>
                                                <h2 className="text-2xl font-semibold mb-4 text-primary text-center">Mint New Voucher</h2>
                                                <div className="max-w-2xl mx-auto border-2 border-blue-500 rounded-lg p-6">
                                                    <form className="space-y-4">
                                                        <div>
                                                            <label htmlFor="itemName" className="block text-sm font-medium text-foreground mb-1">
                                                                Item Name
                                                            </label>
                                                            <input
                                                                id="itemName"
                                                                type="text"
                                                                className="w-full p-2 border border-input bg-background text-foreground rounded-md focus:ring-ring focus:border-ring"
                                                                placeholder="Enter item name"
                                                                value={itemName}
                                                                onChange={(e) => setItemName(e.target.value)}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label htmlFor="company" className="block text-sm font-medium text-foreground mb-1">
                                                                Company
                                                            </label>
                                                            <input
                                                                id="company"
                                                                type="text"
                                                                className="w-full p-2 border border-input bg-background text-foreground rounded-md focus:ring-ring focus:border-ring"
                                                                placeholder="Enter company name"
                                                                value={symbol}
                                                                onChange={(e) => setSymbol(e.target.value)}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label htmlFor="description" className="block text-sm font-medium text-foreground mb-1">
                                                                Description
                                                            </label>
                                                            <textarea
                                                                id="description"
                                                                className="w-full p-2 border border-input bg-background text-foreground rounded-md focus:ring-ring focus:border-ring"
                                                                placeholder="Enter voucher description"
                                                                rows={4}
                                                                value={description}
                                                                onChange={(e) => setDescription(e.target.value)}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label htmlFor="expirationDate" className="block text-sm font-medium text-foreground mb-1">
                                                                Expiration Date
                                                            </label>
                                                            <input
                                                                id="expirationDate"
                                                                type="date"
                                                                className="w-full p-2 border border-input bg-background text-foreground rounded-md focus:ring-ring focus:border-ring"
                                                                value={expirationDate ? expirationDate.toISOString().split('T')[0] : ''}
                                                                onChange={(e) => setExpirationDate(new Date(e.target.value))}
                                                                min={new Date().toISOString().split('T')[0]}
                                                            />
                                                        </div>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                            <div>
                                                                <label htmlFor="companySelect" className="block text-sm font-medium text-foreground mb-1">
                                                                    Select Company
                                                                </label>
                                                                <select
                                                                    id="companySelect"
                                                                    className="w-full p-2 border border-input bg-background text-foreground rounded-md focus:ring-ring focus:border-ring"
                                                                    value={selectedCompany}
                                                                    onChange={handleCompanyChange}
                                                                >
                                                                    <option value="">Select Company</option>
                                                                    {companyOptions.map((company) => (
                                                                        <option key={company.name} value={company.name}>
                                                                            {company.name}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                            <div>
                                                                <label htmlFor="companyWallet" className="block text-sm font-medium text-foreground mb-1">
                                                                    Company Wallet Address
                                                                </label>
                                                                <input
                                                                    id="companyWallet"
                                                                    type="text"
                                                                    className="w-full p-2 border border-input bg-background text-foreground rounded-md focus:ring-ring focus:border-ring"
                                                                    placeholder="Enter wallet address"
                                                                    value={targetCompany}
                                                                    onChange={handleWalletAddressChange}
                                                                    readOnly={selectedCompany !== 'Custom'}
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="bg-secondary/20 p-4 rounded-lg">
                                                            <label htmlFor="currencyAmount" className="block text-sm font-medium text-foreground mb-1">
                                                                Amount in {country.currencySymbol}
                                                            </label>
                                                            <div className="flex items-center space-x-2">
                                                                <span>{country.currencySymbol}</span>
                                                                <input
                                                                    id="currencyAmount"
                                                                    type="number"
                                                                    className="w-full p-2 border border-input bg-background text-foreground rounded-md focus:ring-ring focus:border-ring"
                                                                    placeholder="Enter amount"
                                                                    value={currencyAmount}
                                                                    onChange={(e) => {
                                                                        setCurrencyAmount(e.target.value)
                                                                        convertCurrency(e.target.value)
                                                                    }}
                                                                />
                                                            </div>
                                                            <p className="text-sm text-muted-foreground mt-2">
                                                                SOL Equivalent: {solEquivalent} @ {country.currencySymbol}{exchangeRate.toFixed(2)}/SOL
                                                            </p>
                                                        </div>
                                                        <div className="flex flex-col items-center space-y-2">
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                id="image-upload"
                                                                className="hidden"
                                                                onChange={handleImageUpload}
                                                            />
                                                            <label
                                                                htmlFor="image-upload"
                                                                className="cursor-pointer bg-primary text-primary-foreground py-2 px-4 rounded-md hover:bg-primary/90 transition duration-300 flex items-center"
                                                            >
                                                                {isImageUploading ? (
                                                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                                                ) : (
                                                                    <Upload className="w-5 h-5 mr-2" />
                                                                )}
                                                                {isImageUploading ? 'Uploading...' : 'Upload Image'}
                                                            </label>
                                                            {voucherImage && !isImageUploading && (
                                                                <div className="mt-4 text-center">
                                                                    <p>Selected Image: {voucherImage.name}</p>
                                                                    <img
                                                                        src={URL.createObjectURL(voucherImage)}
                                                                        alt="Voucher Preview"
                                                                        className="mt-2 max-w-full h-auto max-h-48 mx-auto rounded-lg shadow-md"
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <button
                                                            type="button"
                                                            className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-md hover:bg-primary/90 transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                                            onClick={handleMintVoucher}
                                                            disabled={loading || isImageUploading}
                                                        >
                                                            {loading ? 'Minting...' : 'Mint Voucher'}
                                                        </button>
                                                    </form>
                                                </div>
                                            </>
                                        )}

                                        {activeSection === 'transfer' && (
                                            <>
                                                <h2 className="text-2xl font-semibold mb-4 text-primary text-center">Transfer Vouchers to Influencers</h2>
                                                {fetchingVouchers ? (
                                                    <div className="flex justify-center items-center h-64">
                                                        <Loader2 className="w-12 h-12 animate-spin text-primary" />
                                                    </div>
                                                ) : (
                                                    <VoucherList
                                                        vouchers={vouchers}
                                                        userType="payer"
                                                        onVoucherTransferred={() => {
                                                            handleRefresh();
                                                            setSuccessMessage('Voucher transferred successfully!');
                                                            setShowSuccessBanner(true);
                                                            setTimeout(() => {
                                                                setShowSuccessBanner(false);
                                                            }, 3000);
                                                        }}
                                                    />
                                                )}
                                            </>
                                        )}

                                        {activeSection === 'history' && (
                                            <>
                                                <h2 className="text-2xl font-semibold mb-4 text-primary text-center">Transaction History</h2>
                                                <RecentTransactions />
                                            </>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {activeSection && (
                                <motion.button
                                    onClick={closeActiveSection}
                                    className="w-full max-w-md mx-auto bg-yellow-400 text-white py-2 px-4 rounded-md hover:bg-yellow-500 transition duration-300 flex items-center justify-center mt-4"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 20 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <X className="w-5 h-5 mr-2" />
                                    Close
                                </motion.button>
                            )}

                            <AnimatePresence>
                                {loading && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50"
                                    >
                                        <motion.div
                                            initial={{ scale: 0.9, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            exit={{ scale: 0.9, opacity: 0 }}
                                            className="bg-card p-6 rounded-lg shadow-xl"
                                        >
                                            <h2 className="text-2xl font-bold mb-4 text-primary">Processing Voucher</h2>
                                            <p className="mb-4 text-muted-foreground">Please wait while we mint your voucher...</p>
                                            <div className="flex justify-center">
                                                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                                            </div>
                                        </motion.div>
                                    </motion.div>
                                )}

                                {showErrorPopup && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50"
                                    >
                                        <motion.div
                                            initial={{ scale: 0.9, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            exit={{ scale: 0.9, opacity: 0 }}
                                            className="bg-card p-6 rounded-lg shadow-xl"
                                        >
                                            <div className="flex items-center mb-4">
                                                <AlertCircle className="w-8 h-8 text-destructive mr-2" />
                                                <h2 className="text-2xl font-bold text-destructive">Error</h2>
                                            </div>
                                            <p className="mb-4 text-muted-foreground">{errorMessage || 'An error occurred'}</p>
                                            <button
                                                className="w-full bg-destructive text-destructive-foreground py-2 px-4 rounded-md hover:bg-destructive/90 transition duration-300"
                                                onClick={() => setShowErrorPopup(false)}
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
                        </>
                    )}
                </AnimatePresence>
            </main>
        </div>
    )
}