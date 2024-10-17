"use client"

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, Copy, Loader2, ExternalLink } from 'lucide-react'
import { useTransfers } from '../hooks/transferHistoryHooks'
import { useCountry } from '../contexts/CountryContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

const FALLBACK_IMAGE_URL = "https://cdn-icons-png.flaticon.com/512/3514/3514447.png"

interface Company {
    name: string
    walletAddress: string
}

export const TransferHistory: React.FC = () => {
    const {
        transfers,
        loading,
        imageSrcs,
        currentPage,
        totalPages,
        refreshTransfers,
        handleImageError,
        goToPage,
    } = useTransfers(10)

    const { country } = useCountry()

    const [expandedTxId, setExpandedTxId] = useState<string | null>(null)
    const [companies, setCompanies] = useState<Company[]>([])
    const [chartData, setChartData] = useState<{ date: string; count: number }[]>([])

    useEffect(() => {
        fetch('/api/CompanyWalletLoader')
            .then(response => response.json())
            .then(data => setCompanies(data))
            .catch(error => console.error('Error fetching company wallets:', error))
    }, [])

    const getCompanyName = (address: string) => {
        const company = companies.find(company => company.walletAddress === address)
        return company ? company.name : 'Unknown'
    }

    const handleClick = (id: string) => {
        setExpandedTxId(expandedTxId === id ? null : id)
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
    }

    useEffect(() => {
        if (transfers.length > 0) {
            const transfersByDate = transfers.reduce((acc, transfer) => {
                const date = transfer.date.split(' ')[0];
                acc[date] = (acc[date] || 0) + 1;
                return acc;
            }, {} as { [key: string]: number });

            const allDates = transfers.map(transfer => transfer.date.split(' ')[0]);
            const oldestDate = new Date(Math.min(...allDates.map(date => new Date(date).getTime())));
            const newestDate = new Date(Math.max(...allDates.map(date => new Date(date).getTime())));

            const dateRange = [];
            for (let d = new Date(oldestDate); d <= newestDate; d.setDate(d.getDate() + 1)) {
                const dateStr = d.toISOString().split('T')[0];
                dateRange.push(dateStr);
            }

            const completeData = dateRange.map(date => ({
                date,
                count: transfersByDate[date] || 0,
            }));

            setChartData(completeData);
        }
    }, [transfers]);

    if (loading) {
        return (
            <motion.div
                className="text-center p-8 bg-card text-card-foreground rounded-lg shadow-md"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                <p className="mt-4 text-xl font-semibold">Loading transfers...</p>
            </motion.div>
        )
    }

    if (transfers.length === 0) {
        return (
            <motion.div
                className="text-center p-8 bg-card text-card-foreground rounded-lg shadow-md"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <p className="text-xl font-semibold">No recent transfers</p>
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
            {transfers.map((transfer, index) => (
                <motion.div
                    key={transfer.transactionSignature}
                    className="p-4 sm:p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 cursor-pointer bg-green-100"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    onClick={() => handleClick(transfer.transactionSignature)}
                >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center space-x-4">
                            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-lg flex-shrink-0 overflow-hidden">
                                <img
                                    src={imageSrcs[transfer.transactionSignature] || FALLBACK_IMAGE_URL}
                                    alt={transfer.voucherName || "Transfer"}
                                    className="w-full h-full object-cover"
                                    onError={() => handleImageError(transfer.transactionSignature)}
                                />
                            </div>
                            <div>
                                <h3 className="text-lg sm:text-2xl font-semibold text-black">Transfer Voucher</h3>
                                <div className="flex items-center">
                                    <p className="text-xs sm:text-sm text-muted-foreground break-all">
                                        From: {transfer.source}
                                    </p>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); copyToClipboard(transfer.source); }}
                                        className="text-primary ml-2 flex-shrink-0"
                                        aria-label="Copy source address"
                                    >
                                        <Copy size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                        <motion.div
                            className="text-primary"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                        >
                            {expandedTxId === transfer.transactionSignature ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                        </motion.div>
                    </div>
                    <AnimatePresence>
                        {expandedTxId === transfer.transactionSignature && (
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
                                                <span className="font-semibold text-blue-600">From:</span><br />
                                                {transfer.source}
                                            </p>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); copyToClipboard(transfer.source); }}
                                                className="text-blue-600 hover:text-blue-800 flex-shrink-0"
                                                aria-label="Copy source address"
                                            >
                                                <Copy size={16} />
                                            </button>
                                        </div>
                                        <div className="flex items-center">
                                            <p className="mr-2 text-gray-600 break-all">
                                                <span className="font-semibold text-blue-600">To:</span><br />
                                                {transfer.destination}
                                            </p>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); copyToClipboard(transfer.destination); }}
                                                className="text-blue-600 hover:text-blue-800 flex-shrink-0"
                                                aria-label="Copy destination address"
                                            >
                                                <Copy size={16} />
                                            </button>
                                        </div>
                                        <p className="text-gray-600"><span className="font-semibold text-blue-600">Date:</span><br />{transfer.date}</p>
                                        <p className="text-gray-600"><span className="font-semibold text-blue-600">Status:</span><br />{transfer.success ? 'Success' : 'Failed'}</p>
                                        <p className="text-gray-600"><span className="font-semibold text-blue-600">Voucher Name:</span><br />{transfer.voucherName}</p>
                                        <a
                                            href={`https://explorer.solana.com/tx/${transfer.transactionSignature}?cluster=devnet`}
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
                                                src={imageSrcs[transfer.transactionSignature] || FALLBACK_IMAGE_URL}
                                                alt={transfer.voucherName}
                                                className="w-full h-full object-cover"
                                                onError={() => handleImageError(transfer.transactionSignature)}
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
                <motion.button
                    onClick={() => goToPage(currentPage - 1)}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1 rounded-md text-sm font-medium disabled:opacity-50"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    disabled={currentPage === 1}
                >
                    Previous
                </motion.button>
                <span className="text-sm font-medium text-gray-600">Page {currentPage} of {totalPages}</span>
                <motion.button
                    onClick={() => goToPage(currentPage + 1)}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1 rounded-md text-sm font-medium disabled:opacity-50"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    disabled={currentPage === totalPages}
                >
                    Next
                </motion.button>
            </div>
            <Card className="mt-8">
                <CardHeader className="justify-center text-center">
                    <CardTitle>Vouchers Transferred Over Time</CardTitle>
                    <CardDescription>Number of vouchers transferred per day</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center items-center h-[300px]">
                    <ChartContainer
                        config={{
                            transferred: {
                                label: "Transferred Vouchers",
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
                                    name="Transferred Vouchers"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                </CardContent>
            </Card>
        </motion.div>
    )
}