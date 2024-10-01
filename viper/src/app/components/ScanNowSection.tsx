import React, { useState } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { QrCode, ArrowRight } from 'lucide-react'

interface ScanNowSectionProps {
    onScanClick: () => void
}

export function ScanNowSection({ onScanClick }: ScanNowSectionProps) {
    const [isHovered, setIsHovered] = useState(false)

    return (
        <motion.div
            className="bg-white rounded-lg shadow-md overflow-hidden max-w-2xl mx-auto flex mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="relative w-48 h-48 flex-shrink-0">
                <Image
                    src={isHovered ? "/images/voucher-shoes.png" : "/images/scan-voucher.png"}
                    alt="Scan Voucher"
                    layout="fill"
                    objectFit="cover"
                    className="transition-transform duration-300 ease-in-out"
                />
                <motion.div
                    className="absolute inset-0 bg-gradient-to-t from-blue-600 to-transparent flex items-center justify-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isHovered ? 0.7 : 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <QrCode className="h-12 w-12 text-white" />
                </motion.div>
            </div>

            <div className="flex-grow p-4 flex flex-col justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-gray-800 mb-2">Scan Your Voucher</h2>
                    <p className="text-sm text-gray-600 mb-4">Quickly and securely redeem your voucher by scanning the QR code.</p>
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-blue-600">
                        <QrCode className="h-4 w-4" />
                        <span className="text-sm font-medium">Ready to scan</span>
                    </div>
                    <motion.button
                        className="bg-blue-600 text-white px-4 py-2 rounded-full flex items-center space-x-2 text-sm font-medium"
                        whileHover={{ scale: 1.05, backgroundColor: '#2563EB' }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onScanClick}
                    >
                        <span>Scan Now</span>
                        <ArrowRight className="h-4 w-4" />
                    </motion.button>
                </div>
            </div>
        </motion.div>
    )
}