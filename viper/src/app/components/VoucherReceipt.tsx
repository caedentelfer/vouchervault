import React from 'react'
import { motion } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import { X } from 'lucide-react'

interface VoucherReceiptProps {
    isOpen: boolean
    onClose: () => void
    voucherData: {
        name: string
        mintAddress: string
        escrow: string
        transferredAt: string
        transferredTo: string
    }
}

export function VoucherReceipt({ isOpen, onClose, voucherData }: VoucherReceiptProps) {
    const receiptId = `VV-${Date.now().toString(36).toUpperCase()}`
    const verificationData = JSON.stringify({
        receiptId,
        ...voucherData
    })

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full"
            >
                <div className="flex justify-between items-start mb-4">
                    <h2 className="text-2xl font-bold text-blue-600">VoucherVault</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 focus:outline-none"
                    >
                        <X className="h-6 w-6" />
                        <span className="sr-only">Close</span>
                    </button>
                </div>
                <div className="mb-4">
                    <p className="text-sm text-gray-600">Receipt ID: {receiptId}</p>
                    <p className="text-sm text-gray-600">Date: {new Date().toLocaleString()}</p>
                </div>
                <div className="mb-4">
                    <h3 className="text-lg font-semibold mb-2">Voucher Details</h3>
                    <p><strong>Name:</strong> {voucherData.name}</p>
                    <p><strong>Mint Address:</strong> {voucherData.mintAddress}</p>
                    <p><strong>Escrow Amount:</strong> {voucherData.escrow} SOL</p>
                    <p><strong>Transferred At:</strong> {voucherData.transferredAt}</p>
                    <p><strong>Transferred To:</strong> {voucherData.transferredTo}</p>
                </div>
                <div className="flex justify-center mb-4">
                    <QRCodeSVG value={verificationData} size={128} />
                </div>
                <p className="text-xs text-center text-gray-500">
                    Scan the QR code to verify this receipt
                </p>
            </motion.div>
        </div>
    )
}