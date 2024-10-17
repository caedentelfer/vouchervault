"use client"

import React, { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWallet } from '@solana/wallet-adapter-react'
import * as web3 from '@solana/web3.js'
import * as splToken from '@solana/spl-token'
import { createInitEscrowAndMintVoucherInstruction, InitEscrowAndMintVoucherInstructionAccounts, InitEscrowAndMintVoucherInstructionArgs } from '../../generated/instructions/InitEscrowAndMintVoucher'
import { InitEscrowArgs } from '../../generated/types/InitEscrowArgs'
import { MintVoucherArgs } from '../../generated/types/MintVoucherArgs'
import { pinFileToIPFS, pinJSONToIPFS } from '../../utils/uri'
import { CreditCard, Send, History, X, Upload, CheckCircle, AlertCircle, Coins, UserCheck, Clock, Loader2, Gift, ChevronUp, ChevronDown, BarChart, LineChart, BadgeX, Settings } from 'lucide-react'
import { TokenUtils } from '../../utils/TokenUtils'
import { VoucherData } from '../../utils/VoucherData'
import VoucherList from '../components/VoucherList'
import { TransferHistory } from '../components/TransferHistory'
import { RecentTransactions, fetchCompanies } from '../utils/RecentTransactions'
import SuccessBanner from '../components/SuccessBanner'
import { useCountry } from '../contexts/CountryContext'
import Analytics from '../components/Analytics'
import { IssuedVouchers } from '../components/IssuedVouchers'

const companyOptions = [
    { name: 'Sportsmans Warehouse', address: '7v4szbR5y887oFLruu6TGFV7qCigAk1KXcs6gaSMjGof' },
    { name: 'Totalsports', address: 'FwNz8HeLC36Z8Aiff9a8KEKVrqrzF9n22b8uAZBaZHZb' },
    { name: 'Mr Price Sport', address: 'FwNz8HeLC36Z8Aiff9a8KEKVrqrzF9n22b8uAZBaZHZb' },
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
    const [activeSection, setActiveSection] = useState<'mint' | 'transfer' | 'manage' | null>(null)
    const [activeManageSubsection, setActiveManageSubsection] = useState<'transactions' | 'transfers' | 'reclaim' | null>(null)
    const [vouchers, setVouchers] = useState<VoucherData[]>([])
    const [fetchingVouchers, setFetchingVouchers] = useState(false)
    const contentRef = useRef<HTMLDivElement>(null)
    const [showSuccessBanner, setShowSuccessBanner] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const { country, exchangeRate } = useCountry()
    const [isImageUploading, setIsImageUploading] = useState(false)
    const [companies, setCompanies] = useState([]);

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

    useEffect(() => {
        const loadCompanies = async () => {
            try {
                const loadedCompanies = await fetchCompanies();
                setCompanies(loadedCompanies);
            } catch (error) {
                console.error('Failed to load companies:', error);
                setErrorMessage('Failed to load companies');
            }
        };
        loadCompanies();
    }, []);

    const handleCompanyChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const company = companies.find(c => c.name === event.target.value);
        if (company) {
            setSelectedCompany(company.name);
            setTargetCompany(company.address);
        } else {
            setSelectedCompany('Custom');
            setTargetCompany('');
        }
    };

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
        setActiveManageSubsection(null)
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

            const ix =
                createInitEscrowAndMintVoucherInstruction(
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

    const toggleSection = (section: 'mint' | 'transfer' | 'manage') => {
        if (activeSection === section) {
            setActiveSection(null)
            setActiveManageSubsection(null)
            window.scrollTo({ top: 0, behavior: 'smooth' })
        } else {
            setActiveSection(section)
            setActiveManageSubsection(null)
            setTimeout(() => {
                contentRef.current?.scrollIntoView({ behavior: 'smooth' })
            }, 100)
        }
    }

    const toggleManageSubsection = (subsection: 'transactions' | 'transfers' | 'reclaim') => {
        if (activeManageSubsection === subsection) {
            setActiveManageSubsection(null)
        } else {
            setActiveManageSubsection(subsection)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-background to-secondary/10">
            <main className="container px-4 py-12 mx-auto">
                <motion.div
                    className="mb-12 text-center"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <h1 className="mb-2 text-4xl font-bold text-primary">Ready to Elevate Your Brand?</h1>
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
                            className="p-8 text-center rounded-lg shadow-lg bg-card text-card-foreground"
                        >
                            <Gift size={48} className="mx-auto mb-4 text-primary" />
                            <p className="mb-4 text-xl">Please connect your wallet to access the dashboard.</p>
                            <p className="text-muted-foreground">Once connected, you'll be able to mint and manage your vouchers.</p>
                        </motion.div>
                    ) : (
                        <>
                            <motion.div
                                className="p-6 mb-12 rounded-lg shadow-lg bg-card text-card-foreground"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.2 }}
                            >
                                <h2 className="mb-4 text-2xl font-semibold text-center text-primary">How It Works</h2>
                                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                                    <div className="flex flex-col items-center text-center">
                                        <Coins className="w-12 h-12 mb-2 text-accent" />
                                        <h3 className="mb-2 text-lg font-semibold">1. Mint Vouchers</h3>
                                        <p className="text-sm text-muted-foreground">Create new vouchers and assign them to specific target companies. These vouchers will only be valid at the designated outlets.</p>
                                    </div>
                                    <div className="flex flex-col items-center text-center">
                                        <UserCheck className="w-12 h-12 mb-2 text-accent" />
                                        <h3 className="mb-2 text-lg font-semibold">2. Transfer to Influencers</h3>
                                        <p className="text-sm text-muted-foreground">Send minted vouchers to influencers using their wallet addresses. It's that simple!</p>
                                    </div>
                                    <div className="flex flex-col items-center text-center">
                                        <Clock className="w-12 h-12 mb-2 text-accent" />
                                        <h3 className="mb-2 text-lg font-semibold">3. Monitor & Manage</h3>
                                        <p className="text-sm text-muted-foreground">Track all voucher transactions and exchanges on our platform. If a voucher expires, reclaim the funds to your account.</p>
                                    </div>
                                </div>
                            </motion.div>

                            <motion.div
                                className={`grid ${activeSection ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3'} gap-8 mb-12`}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.4 }}
                            >
                                {['mint', 'transfer', 'manage'].map((section) => (
                                    <motion.button
                                        key={section}
                                        className={`p-6 rounded-lg shadow-md transition-all duration-300 flex flex-col items-center justify-between ${activeSection === section
                                            ? 'bg-accent text-accent-foreground col-span-3'
                                            : 'bg-primary text-primary-foreground hover:bg-primary/90'
                                            } ${activeSection && activeSection !== section ? 'hidden' : ''}`}
                                        onClick={() => toggleSection(section as 'mint' | 'transfer' | 'manage')}
                                        whileHover={{ scale: activeSection === section ? 1 : 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        {section === 'mint' && <CreditCard className="w-16 h-16 mb-4" />}
                                        {section === 'transfer' && <Send className="w-16 h-16 mb-4" />}
                                        {section === 'manage' && <Settings className="w-16 h-16 mb-4" />}
                                        <span className="text-xl font-semibold">
                                            {section === 'mint' && 'Mint New Vouchers'}
                                            {section === 'transfer' && 'Transfer to Influencers'}
                                            {section === 'manage' && 'Manage Vouchers'}
                                        </span>
                                        <p className="mt-2 text-sm text-center">
                                            {section === 'mint' && 'Create and issue new vouchers for your products or services.'}
                                            {section === 'transfer' && 'Distribute vouchers to your network of influencers.'}
                                            {section === 'manage' && 'View transactions, transfer history, and reclaim expired vouchers.'}
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
                                        className="relative w-full p-6 mb-4 rounded-lg shadow-lg bg-card text-card-foreground"
                                    >
                                        {activeSection === 'mint' && (
                                            <>
                                                <h2 className="mb-4 text-2xl font-semibold text-center text-primary">Mint New Voucher</h2>
                                                <div className="max-w-2xl p-6 mx-auto border-2 border-blue-500 rounded-lg">
                                                    <form className="space-y-4">
                                                        <div>
                                                            <label htmlFor="itemName" className="block mb-1 text-sm font-medium text-foreground">
                                                                Item Name
                                                            </label>
                                                            <input
                                                                id="itemName"
                                                                type="text"
                                                                className="w-full p-2 border rounded-md border-input bg-background text-foreground focus:ring-ring focus:border-ring"
                                                                placeholder="Enter item name"
                                                                value={itemName}
                                                                onChange={(e) => setItemName(e.target.value)}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label htmlFor="company" className="block mb-1 text-sm font-medium text-foreground">
                                                                Company
                                                            </label>
                                                            <input
                                                                id="company"
                                                                type="text"
                                                                className="w-full p-2 border rounded-md border-input bg-background text-foreground focus:ring-ring focus:border-ring"
                                                                placeholder="Enter company name"
                                                                value={symbol}
                                                                onChange={(e) => setSymbol(e.target.value)}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label htmlFor="description" className="block mb-1 text-sm font-medium text-foreground">
                                                                Description
                                                            </label>
                                                            <textarea
                                                                id="description"
                                                                className="w-full p-2 border rounded-md border-input bg-background text-foreground focus:ring-ring focus:border-ring"
                                                                placeholder="Enter voucher description"
                                                                rows={4}
                                                                value={description}
                                                                onChange={(e) => setDescription(e.target.value)}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label htmlFor="expirationDate" className="block mb-1 text-sm font-medium text-foreground">
                                                                Expiration Date
                                                            </label>
                                                            <input
                                                                id="expirationDate"
                                                                type="date"
                                                                className="w-full p-2 border rounded-md border-input bg-background text-foreground focus:ring-ring focus:border-ring"
                                                                value={expirationDate ? expirationDate.toISOString().split('T')[0] : ''}
                                                                onChange={(e) => setExpirationDate(new Date(e.target.value))}
                                                            />
                                                            {expirationDate && expirationDate < new Date() && (
                                                                <p className="mt-1 text-sm text-yellow-500">
                                                                    Warning: This voucher will be created as expired.
                                                                </p>
                                                            )}
                                                        </div>
                                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                                            <div>
                                                                <label htmlFor="companySelect" className="block mb-1 text-sm font-medium text-foreground">
                                                                    Select Company
                                                                </label>
                                                                <select
                                                                    id="companySelect"
                                                                    className="w-full p-2 border rounded-md border-input bg-background text-foreground focus:ring-ring focus:border-ring"
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
                                                                <label htmlFor="companyWallet" className="block mb-1 text-sm font-medium text-foreground">
                                                                    Company Wallet Address
                                                                </label>
                                                                <input
                                                                    id="companyWallet"
                                                                    type="text"
                                                                    className="w-full p-2 border rounded-md border-input bg-background text-foreground focus:ring-ring focus:border-ring"
                                                                    placeholder="Enter wallet address"
                                                                    value={targetCompany}
                                                                    onChange={handleWalletAddressChange}
                                                                    readOnly={selectedCompany !== 'Custom'}
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="p-4 rounded-lg bg-secondary/20">
                                                            <label htmlFor="currencyAmount" className="block mb-1 text-sm font-medium text-foreground">
                                                                Amount in {country.currencySymbol}
                                                            </label>
                                                            <div className="flex items-center space-x-2">
                                                                <span>{country.currencySymbol}</span>
                                                                <input
                                                                    id="currencyAmount"
                                                                    type="number"
                                                                    className="w-full p-2 border rounded-md border-input bg-background text-foreground focus:ring-ring focus:border-ring"
                                                                    placeholder="Enter amount"
                                                                    value={currencyAmount}
                                                                    onChange={(e) => {
                                                                        setCurrencyAmount(e.target.value)
                                                                        convertCurrency(e.target.value)
                                                                    }}
                                                                />
                                                            </div>
                                                            <p className="mt-2 text-sm text-muted-foreground">
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
                                                                className="flex items-center px-4 py-2 transition duration-300 rounded-md cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
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
                                                                        className="h-auto max-w-full mx-auto mt-2 rounded-lg shadow-md max-h-48"
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <button
                                                            type="button"
                                                            className="w-full px-4 py-2 transition duration-300 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
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
                                                <h2 className="mb-4 text-2xl font-semibold text-center text-primary">Transfer Vouchers to Influencers</h2>
                                                {fetchingVouchers ? (
                                                    <div className="flex items-center justify-center h-64">
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

                                        {activeSection === 'manage' && (
                                            <>
                                                <h2 className="mb-4 text-2xl font-semibold text-center text-primary">Manage Vouchers</h2>
                                                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                                    <button
                                                        onClick={() => toggleManageSubsection('transactions')}
                                                        className={`p-4 transition-colors rounded-lg flex items-center justify-center ${activeManageSubsection === 'transactions' ? 'bg-accent text-accent-foreground' : 'bg-secondary hover:bg-secondary/80'}`}
                                                    >
                                                        <History className="w-6 h-6 mr-2" />
                                                        Transaction History
                                                    </button>
                                                    <button
                                                        onClick={() => toggleManageSubsection('transfers')}
                                                        className={`p-4 transition-colors rounded-lg flex items-center justify-center ${activeManageSubsection === 'transfers' ? 'bg-accent text-accent-foreground' : 'bg-secondary hover:bg-secondary/80'}`}
                                                    >
                                                        <Send className="w-6 h-6 mr-2" />
                                                        Transfer History
                                                    </button>
                                                    <button
                                                        onClick={() => toggleManageSubsection('reclaim')}
                                                        className={`p-4 transition-colors rounded-lg flex items-center justify-center ${activeManageSubsection === 'reclaim' ? 'bg-accent text-accent-foreground' : 'bg-secondary hover:bg-secondary/80'}`}
                                                    >
                                                        <BadgeX className="w-6 h-6 mr-2" />
                                                        Voucher Reclaim
                                                    </button>
                                                </div>
                                                <AnimatePresence mode="wait">
                                                    {activeManageSubsection && (
                                                        <motion.div
                                                            key={activeManageSubsection}
                                                            initial={{ opacity: 0, y: 20 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            exit={{ opacity: 0, y: -20 }}
                                                            transition={{ duration: 0.3 }}
                                                            className="mt-6"
                                                        >
                                                            {activeManageSubsection === 'transactions' && (
                                                                <div>
                                                                    <h3 className="mb-4 text-xl font-semibold"></h3>
                                                                    <RecentTransactions />
                                                                </div>
                                                            )}
                                                            {activeManageSubsection === 'transfers' && (
                                                                <div>
                                                                    <h3 className="mb-4 text-xl font-semibold"></h3>
                                                                    <TransferHistory />
                                                                </div>
                                                            )}
                                                            {activeManageSubsection === 'reclaim' && (
                                                                <div>
                                                                    <h3 className="mb-4 text-xl font-semibold"></h3>
                                                                    <IssuedVouchers />
                                                                </div>
                                                            )}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {activeSection && (
                                <motion.button
                                    onClick={closeActiveSection}
                                    className="flex items-center justify-center w-full max-w-md px-4 py-2 mx-auto mt-4 text-white transition duration-300 bg-yellow-400 rounded-md hover:bg-yellow-500"
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
                                        className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
                                    >
                                        <motion.div
                                            initial={{ scale: 0.9, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            exit={{ scale: 0.9, opacity: 0 }}
                                            className="p-6 rounded-lg shadow-xl bg-card"
                                        >
                                            <h2 className="mb-4 text-2xl font-bold text-primary">Processing Voucher</h2>
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
                                        className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
                                    >
                                        <motion.div
                                            initial={{ scale: 0.9, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            exit={{ scale: 0.9, opacity: 0 }}
                                            className="p-6 rounded-lg shadow-xl bg-card"
                                        >
                                            <div className="flex items-center mb-4">
                                                <AlertCircle className="w-8 h-8 mr-2 text-destructive" />
                                                <h2 className="text-2xl font-bold text-destructive">Error</h2>
                                            </div>
                                            <p className="mb-4 text-muted-foreground">{errorMessage || 'An error occurred'}</p>
                                            <button
                                                className="w-full px-4 py-2 transition duration-300 rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
                {connected && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.6 }}
                        className="mt-12"
                    >
                        <h2 className="mb-6 text-2xl font-semibold text-center text-primary">Voucher Analytics</h2>
                        <Analytics walletAddress={publicKey.toString()} />
                    </motion.div>
                )}
            </main>
        </div>
    )
}