"use client"

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, Copy, Loader2, ExternalLink } from 'lucide-react'
import { useTransactions } from '../hooks/transactionHooks'
import { useCountry } from '../contexts/CountryContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { useWallet } from '@solana/wallet-adapter-react'
import { createReleaseExpiredEscrowInstruction } from '@/generated'
import { clusterApiUrl, Connection, PublicKey, SYSVAR_CLOCK_PUBKEY, Transaction } from '@solana/web3.js'
import SuccessBanner from './SuccessBanner'
import TokenUtils from '@/utils/TokenUtils'

const PROGRAM_ID = 'gidsaNxwQbr6pyLDaqVn4pPwAypkjwFNZQvvKBJ1Rbi'
const FALLBACK_IMAGE_URL = "https://cdn-icons-png.flaticon.com/512/3514/3514447.png"

interface Company {
    name: string
    walletAddress: string
}

export const IssuedVouchers: React.FC = () => {
    const {
        transactions,
        loading,
        imageSrcs,
        fetchTransactions,
        fetchImagesAndConvertCurrency,
        handleImageError,
    } = useTransactions()

    const { country, exchangeRate } = useCountry()

    const [expandedTxId, setExpandedTxId] = useState<string | null>(null)
    const [companies, setCompanies] = useState<Company[]>([])
    const [pageNumber, setPageNumber] = useState(1)
    const [convertedValues, setConvertedValues] = useState<{ [key: string]: number }>({})
    const [chartData, setChartData] = useState<{ date: string; count: number }[]>([])
    const [showSuccessBanner, setShowSuccessBanner] = useState(false)
    const [successMessage, setSuccessMessage] = useState('')

    const { publicKey, signTransaction } = useWallet()

    useEffect(() => {
        fetchTransactions(1)
    }, [fetchTransactions])

    useEffect(() => {
        if (transactions.length > 0) {
            fetchImagesAndConvertCurrency()
            convertAmounts()
        }
    }, [transactions, fetchImagesAndConvertCurrency, exchangeRate])

    useEffect(() => {
        fetch('/api/CompanyWalletLoader')
            .then(response => response.json())
            .then(data => setCompanies(data))
            .catch(error => console.error('Error fetching company wallets:', error))
    }, [])

    const convertAmounts = () => {
        const newConvertedValues = {}
        transactions.forEach(tx => {
            if (tx.voucherInfo && tx.voucherInfo.escrow) {
                const solAmount = parseFloat(tx.voucherInfo.escrow)
                newConvertedValues[tx.signature] = solAmount * exchangeRate
            }
        })
        setConvertedValues(newConvertedValues)
    }

    const getCompanyName = (address: string) => {
        const company = companies.find(company => company.walletAddress === address)
        return company ? company.name : 'Unknown'
    }

    const handleClick = (id: string) => {
        setExpandedTxId(expandedTxId === id ? null : id)
    }

    const handleNextPage = async () => {
        setPageNumber(pageNumber + 1)
        await fetchTransactions(pageNumber + 1)
    }

    const handlePreviousPage = async () => {
        setPageNumber(pageNumber - 1)
        await fetchTransactions(pageNumber - 1)
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
    }

    const reclaimEscrow = async (mintAccount: string, escrowAccount: string) => {
        try {
            const connection = new Connection(clusterApiUrl('devnet'), 'confirmed')
            console.log('Reclaiming escrow for: ', mintAccount + " \n " + escrowAccount)

            const ix = createReleaseExpiredEscrowInstruction({
                payer: publicKey,
                escrowAccount: new PublicKey(escrowAccount),
                mintAccount: new PublicKey(mintAccount),
                clockProgram: SYSVAR_CLOCK_PUBKEY,
            }, new PublicKey('gidsaNxwQbr6pyLDaqVn4pPwAypkjwFNZQvvKBJ1Rbi'));

            const transaction = new Transaction().add(ix)

            transaction.feePayer = publicKey

            const latestBlockhash = await connection.getLatestBlockhash()
            transaction.recentBlockhash = latestBlockhash.blockhash

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

            fetchTransactions(pageNumber)
            setSuccessMessage('Voucher reclaimed successfully!');
            setShowSuccessBanner(true);
            setTimeout(() => {
                setShowSuccessBanner(false);
            }, 3000);
        } catch (error) {
            console.error('Error reclaiming escrow:', error)
            throw new Error('Error reclaiming escrow')
        }
    }

    const checkEscrow = async (escrowAccount) => {
        return await new TokenUtils().getEscrowAccountAmount(escrowAccount) === 0;
    }

    useEffect(() => {
        if (transactions.length > 0) {
            const redeemedVouchers = transactions.filter(tx => !tx.isCreateVoucher);

            const vouchersByDate = redeemedVouchers.reduce((acc, tx) => {
                const date = new Date(tx.timestamp).toISOString().split('T')[0];
                acc[date] = (acc[date] || 0) + 1;
                return acc;
            }, {} as { [key: string]: number });

            // Get all dates from the transactions
            const allDates = redeemedVouchers.map(tx => new Date(tx.timestamp));

            // Find the oldest and newest date
            const oldestDate = new Date(Math.min(...allDates.map(date => date.getTime())));
            const newestDate = new Date(Math.max(...allDates.map(date => date.getTime())));

            // Create a date range between the oldest and newest dates
            const dateRange = [];
            for (let d = new Date(oldestDate); d <= newestDate; d.setDate(d.getDate() + 1)) {
                const dateStr = d.toISOString().split('T')[0];
                dateRange.push(dateStr);
            }

            // Fill in missing dates with 0
            const completeData = dateRange.map(date => ({
                date,
                count: vouchersByDate[date] || 0,
            }));

            setChartData(completeData);
        }
    }, [transactions]);


    if (loading) {
        return (
            <motion.div
                className="p-8 text-center rounded-lg shadow-md bg-card text-card-foreground"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" />
                <p className="mt-4 text-xl font-semibold">Loading expired vouchers...</p>
            </motion.div>
        )
    }

    if (transactions.length === 0) {
        return (
            <motion.div
                className="p-8 text-center rounded-lg shadow-md bg-card text-card-foreground"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <p className="text-xl font-semibold">No recent transactions</p>
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
            {transactions.map((tx, index) => (

                tx.isCreateVoucher
                && tx.performer === publicKey.toString()
                && checkEscrow(tx.voucherInfo.escrowAddress) && (
                    <motion.div
                        key={tx.signature}
                        className={`p-4 sm:p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 cursor-pointer ${tx.voucherInfo?.isBurnt ? 'bg-red-100' : 'bg-green-100'
                            }`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                        onClick={() => handleClick(tx.signature)}
                    >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center space-x-4">
                                <div className="relative flex-shrink-0 w-20 h-20 overflow-hidden rounded-lg sm:w-24 sm:h-24">
                                    <img
                                        src={imageSrcs[tx.signature] || FALLBACK_IMAGE_URL}
                                        alt={tx.voucherInfo?.name || "Transaction"}
                                        className="object-cover w-full h-full"
                                        onError={() => handleImageError(tx.signature)}
                                    />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-black sm:text-2xl">{tx.voucherInfo.name}</h3>
                                    <p className="text-sm text-muted-foreground">{tx.voucherInfo.symbol}</p>
                                </div>
                            </div>
                            <div className="flex items-center justify-between mt-2 sm:justify-end sm:space-x-4 sm:mt-0">
                                {tx.voucherInfo && (
                                    <span className="text-base font-medium text-black sm:text-lg">
                                        {country.currencySymbol}{convertedValues[tx.signature]?.toFixed(2) || 'Loading...'}
                                        <span className="ml-2 text-sm text-muted-foreground">
                                            ({tx.voucherInfo.escrow} SOL)
                                        </span>
                                    </span>
                                )}

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation(); // Prevent the main card click event
                                        reclaimEscrow(tx.voucherInfo.mintAddress, tx.voucherInfo.escrowAddress); // Call the reclaim function
                                    }}
                                    className="px-4 py-2 mt-2 text-white bg-blue-500 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400"
                                >
                                    Reclaim Escrow
                                </button>
                            </div>
                        </div>
                    </motion.div>)
            ))}
            <div className="flex items-center justify-center mt-4 space-x-4">
                {pageNumber !== 1 && (
                    <motion.button
                        onClick={handlePreviousPage}
                        className="px-3 py-1 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        Previous
                    </motion.button>
                )}
                <span className="text-sm font-medium text-gray-600">Page {pageNumber}</span>
                {pageNumber !== 5 && (
                    <motion.button
                        onClick={handleNextPage}
                        className="px-3 py-1 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        Next
                    </motion.button>
                )}
            </div>

            {showSuccessBanner && (
                <SuccessBanner message={successMessage} />
            )}
        </motion.div>
    )
}