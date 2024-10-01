"use client"

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Moon, Sun } from 'lucide-react'

const pages = [
    { name: 'HOME', link: '/' },
    { name: 'VERIFY', link: '/issuer' },
    { name: 'REDEEM', link: '/influencer' },
    { name: 'CREATE', link: '/manufacturer' },
    { name: 'ABOUT', link: '/about' }
]

export default function Header() {
    const [isWalletConnected, setIsWalletConnected] = useState(false)
    const [currentPage, setCurrentPage] = useState('HOME')
    const [darkMode, setDarkMode] = useState(false)

    useEffect(() => {
        const isDarkMode = localStorage.getItem('darkMode') === 'true'
        setDarkMode(isDarkMode)
    }, [])

    useEffect(() => {
        localStorage.setItem('darkMode', darkMode.toString())
        if (darkMode) {
            document.documentElement.classList.add('dark')
        } else {
            document.documentElement.classList.remove('dark')
        }
    }, [darkMode])

    const handleConnectWallet = () => {
        setIsWalletConnected(!isWalletConnected)
    }

    const toggleDarkMode = () => {
        setDarkMode(!darkMode)
    }

    return (
        <header className="bg-primary text-primary-foreground py-6 sticky top-0 z-10">
            <div className="container mx-auto px-4">
                <nav className="flex justify-between items-center">
                    <div className="flex items-center space-x-6">
                        <Link href="/" className="text-2xl font-bold">AffiliateVault</Link>
                        <div className="hidden md:flex space-x-4">
                            {pages.map((page) => (
                                <Link
                                    key={page.name}
                                    href={page.link}
                                    className={`hover:text-secondary transition-colors ${currentPage === page.name ? 'border-b-2 border-secondary' : ''
                                        }`}
                                    onClick={() => setCurrentPage(page.name)}
                                >
                                    {page.name}
                                </Link>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        <motion.button
                            onClick={toggleDarkMode}
                            className="p-2 rounded-full bg-secondary text-secondary-foreground"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                        </motion.button>
                        <motion.button
                            onClick={handleConnectWallet}
                            className="bg-accent text-accent-foreground hover:bg-accent/90 px-4 py-2 rounded"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            {isWalletConnected ? "Wallet Connected" : "Connect Wallet"}
                        </motion.button>
                    </div>
                </nav>
            </div>
        </header>
    )
}