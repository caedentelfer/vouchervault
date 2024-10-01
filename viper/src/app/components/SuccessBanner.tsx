import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle } from 'lucide-react'

interface SuccessBannerProps {
    message: string
}

const SuccessBanner: React.FC<SuccessBannerProps> = ({ message }) => {
    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
                transition={{ duration: 0.3 }}
                className="fixed bottom-0 left-0 right-0 bg-green-500 text-white p-4 flex items-center justify-center z-50"
            >
                <CheckCircle className="w-6 h-6 mr-2" />
                <span className="text-lg font-semibold">{message}</span>
            </motion.div>
        </AnimatePresence>
    )
}

export default SuccessBanner