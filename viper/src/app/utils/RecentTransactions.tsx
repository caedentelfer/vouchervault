"use client"

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, Copy, Loader2, ExternalLink } from 'lucide-react'
import { useTransactions } from '../hooks/transactionHooks'
import { useCountry } from '../contexts/CountryContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

const PROGRAM_ID = 'gidsaNxwQbr6pyLDaqVn4pPwAypkjwFNZQvvKBJ1Rbi'
const FALLBACK_IMAGE_URL = "https://cdn-icons-png.flaticon.com/512/3514/3514447.png"

interface Company {
    name: string
    walletAddress: string
}

export const fetchCompanies = async () => {
    try {
        const response = await fetch('/api/CompanyWalletLoader'); // Replace with your actual API endpoint
        if (!response.ok) {
            throw new Error('Failed to fetch companies');
        }
        const data = await response.json();
        return data; // Assuming the response is an array of company objects
    } catch (error) {
        console.error('Error fetching companies:', error);
        throw error;
    }
};

export const RecentTransactions: React.FC = () => {
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
                className="text-center p-8 bg-card text-card-foreground rounded-lg shadow-md"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                <p className="mt-4 text-xl font-semibold">Loading transactions...</p>
            </motion.div>
        )
    }

    if (transactions.length === 0) {
        return (
            <motion.div
                className="text-center p-8 bg-card text-card-foreground rounded-lg shadow-md"
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
                            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-lg flex-shrink-0 overflow-hidden">
                                <img
                                    src={imageSrcs[tx.signature] || FALLBACK_IMAGE_URL}
                                    alt={tx.voucherInfo?.name || "Transaction"}
                                    className="w-full h-full object-cover"
                                    onError={() => handleImageError(tx.signature)}
                                />
                            </div>
                            <div>
                                <h3 className="text-lg sm:text-2xl font-semibold text-black">{tx.isCreateVoucher ? 'Create Voucher' : 'Redeem Voucher'}</h3>
                                <div className="flex items-center">
                                    <p className="text-xs sm:text-sm text-muted-foreground break-all">
                                        Performed by: {tx.performer}
                                    </p>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); copyToClipboard(tx.performer); }}
                                        className="text-primary ml-2 flex-shrink-0"
                                        aria-label="Copy performer address"
                                    >
                                        <Copy size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end sm:space-x-4 mt-2 sm:mt-0">
                            {tx.voucherInfo && (
                                <span className="text-base sm:text-lg font-medium text-black">
                                    {country.currencySymbol}{convertedValues[tx.signature]?.toFixed(2) || 'Loading...'}
                                    <span className="text-sm text-muted-foreground ml-2">
                                        ({tx.voucherInfo.escrow} SOL)
                                    </span>
                                </span>
                            )}
                            <motion.div
                                className="text-primary"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                            >
                                {expandedTxId === tx.signature ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                            </motion.div>
                        </div>
                    </div>
                    <AnimatePresence>
                        {expandedTxId === tx.signature && tx.voucherInfo && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.3 }}
                                className="mt-4 space-y-4 overflow-hidden bg-white p-4 rounded-lg"
                            >
                                <div className="flex flex-col sm:flex-row">
                                    <div className="flex-1 space-y-2 pr-4">
                                        <div className="flex items-center">
                                            <p className="mr-2 text-gray-600 break-all">
                                                <span className="font-semibold text-blue-600">Escrow Address:</span><br />
                                                {tx.voucherInfo.escrowAddress}
                                            </p>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); copyToClipboard(tx.voucherInfo.escrowAddress); }}
                                                className="text-blue-600 hover:text-blue-800 flex-shrink-0"
                                                aria-label="Copy escrow address"
                                            >
                                                <Copy size={16} />
                                            </button>
                                        </div>
                                        <div className="flex items-center">
                                            <p className="mr-2 text-gray-600 break-all">
                                                <span className="font-semibold text-blue-600">Mint Address:</span><br />
                                                {tx.voucherInfo.mintAddress}
                                            </p>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); copyToClipboard(tx.voucherInfo.mintAddress); }}
                                                className="text-blue-600 hover:text-blue-800 flex-shrink-0"
                                                aria-label="Copy mint address"
                                            >
                                                <Copy size={16} />
                                            </button>
                                        </div>
                                        {tx.voucherInfo.expiry !== 0 && (
                                            <p className="text-gray-600"><span className="font-semibold text-blue-600">Expiry:</span><br />{new Date(tx.voucherInfo.expiry).toLocaleString()}</p>
                                        )}
                                        <p className="text-gray-600"><span className="font-semibold text-blue-600">Status:</span><br />{tx.voucherInfo.isBurnt ? 'Burnt' : 'Active'}</p>
                                        <div className="flex items-center">
                                            <p className="mr-2 text-gray-600 break-all">
                                                <span className="font-semibold text-blue-600">User:</span><br />
                                                {tx.performer}
                                            </p>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); copyToClipboard(tx.performer); }}
                                                className="text-blue-600 hover:text-blue-800 flex-shrink-0"
                                                aria-label="Copy user address"
                                            >
                                                <Copy size={16} />
                                            </button>
                                        </div>
                                        {!tx.isCreateVoucher && getCompanyName(tx.performer) !== 'Unknown' && (
                                            <p className="text-gray-600"><span className="font-semibold text-blue-600">Company:</span><br />{getCompanyName(tx.performer)}</p>
                                        )}
                                        <a
                                            href={`https://explorer.solana.com/tx/${tx.signature}?cluster=devnet`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-block text-blue-600 hover:text-blue-800 transition duration-300"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            View on Solana Explorer <ExternalLink size={14} className="inline" />
                                        </a>
                                    </div>
                                    <div className="flex-shrink-0 mt-4 sm:mt-0">
                                        <div className="relative w-full sm:w-48 h-48 overflow-hidden rounded-lg">
                                            <img
                                                src={imageSrcs[tx.signature] || FALLBACK_IMAGE_URL}
                                                alt={tx.voucherInfo.name}
                                                className="w-full h-full object-cover"
                                                onError={() => handleImageError(tx.signature)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            ))}
            <div className="flex justify-center items-center space-x-4 mt-4">
                {pageNumber !== 1 && (
                    <motion.button
                        onClick={handlePreviousPage}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1 rounded-md text-sm font-medium"
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
                        className="bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1 rounded-md text-sm font-medium"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        Next
                    </motion.button>
                )}
            </div>
            <Card className="mt-8">
            <CardHeader className="justify-center text-center">
                <CardTitle>Vouchers Redeemed Over Time</CardTitle>
                <CardDescription>Number of vouchers redeemed per day</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center items-center h-[300px]">
                <ChartContainer
                config={{
                    redeemed: {
                    label: "Redeemed Vouchers",
                    color: "hsl(var(--chart-1))",
                    },
                }}
                className="h-full"
                >
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                    data={chartData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Line
                        type="monotone"
                        dataKey="count"
                        stroke="hsl(var(--primary))"
                        name="Redeemed Vouchers"
                    />
                    </LineChart>
                </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
            </Card>

        </motion.div>
    )
}