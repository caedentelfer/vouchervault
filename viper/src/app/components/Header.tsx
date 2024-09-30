"use client"

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Menu, Globe, ChevronRight } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useCountry } from '../contexts/CountryContext'

const WalletMultiButtonDynamic = dynamic(
    async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
    { ssr: false }
)

const pages = [
    { name: 'HOME', link: '/' },
    { name: 'VERIFY', link: '/issuer' },
    { name: 'REDEEM', link: '/influencer' },
    { name: 'CREATE', link: '/manufacturer' },
]

const countries = [
    { code: 'US', name: 'United States', flag: '🇺🇸' },
    { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
    { code: 'EU', name: 'European Union', flag: '🇪🇺' },
    { code: 'JP', name: 'Japan', flag: '🇯🇵' },
    { code: 'CA', name: 'Canada', flag: '🇨🇦' },
    { code: 'AU', name: 'Australia', flag: '🇦🇺' },
    { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
    { code: 'IN', name: 'India', flag: '🇮🇳' },
    { code: 'CN', name: 'China', flag: '🇨🇳' },
    { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
]

export function Header() {
    const pathname = usePathname()
    const { country, setCountry } = useCountry()
    const [isCountryOpen, setIsCountryOpen] = useState(false)
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [isMobile, setIsMobile] = useState(false)
    const [isMobileCountryOpen, setIsMobileCountryOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768)
        }
        handleResize()
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsCountryOpen(false)
                setIsMenuOpen(false)
                setIsMobileCountryOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleCountryChange = (countryCode: string) => {
        setCountry(countryCode)
        setIsCountryOpen(false)
        setIsMenuOpen(false)
        setIsMobileCountryOpen(false)
    }

    const selectedCountry = countries.find(c => c.code === country.code) || countries[0]

    return (
        <header className="bg-primary text-primary-foreground py-2 md:py-4 sticky top-0 z-10">
            <div className="container mx-auto px-2 md:px-4">
                <nav className="flex justify-between items-center">
                    <div className="flex items-center space-x-2 md:space-x-4">
                        {isMobile && (
                            <div className="relative" ref={dropdownRef}>
                                <button
                                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                                    className="p-1 text-primary-foreground hover:bg-primary-foreground/10 rounded-md transition-colors duration-200"
                                >
                                    <Menu size={20} />
                                </button>
                                <AnimatePresence>
                                    {isMenuOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="absolute left-0 mt-2 w-48 bg-background rounded-md shadow-lg z-10 overflow-hidden"
                                        >
                                            {pages.map((page) => (
                                                <Link
                                                    key={page.name}
                                                    href={page.link}
                                                    className={`block px-4 py-2 text-sm ${pathname === page.link
                                                        ? 'text-yellow-400 font-semibold'
                                                        : 'text-foreground hover:bg-secondary/10 hover:text-secondary-foreground'
                                                        } transition-colors duration-200`}
                                                    onClick={() => setIsMenuOpen(false)}
                                                >
                                                    {page.name}
                                                </Link>
                                            ))}
                                            <div className="border-t border-gray-200 my-2"></div>
                                            <div className="px-4 py-2">
                                                <button
                                                    onClick={() => setIsMobileCountryOpen(!isMobileCountryOpen)}
                                                    className="flex items-center justify-between w-full text-sm text-foreground"
                                                >
                                                    <div className="flex items-center space-x-2">
                                                        <Globe size={16} />
                                                        <span>Select Country</span>
                                                    </div>
                                                    <ChevronRight size={16} className={`transform transition-transform ${isMobileCountryOpen ? 'rotate-90' : ''}`} />
                                                </button>
                                                <AnimatePresence>
                                                    {isMobileCountryOpen && (
                                                        <motion.div
                                                            initial={{ opacity: 0, height: 0 }}
                                                            animate={{ opacity: 1, height: 'auto' }}
                                                            exit={{ opacity: 0, height: 0 }}
                                                            className="mt-2 space-y-1"
                                                        >
                                                            {countries.map((c) => (
                                                                <button
                                                                    key={c.code}
                                                                    className={`flex items-center w-full text-left px-2 py-1 text-sm ${c.code === country.code
                                                                        ? 'bg-yellow-400 text-white font-semibold'
                                                                        : 'text-foreground hover:bg-secondary/10'
                                                                        } transition-colors duration-200 rounded`}
                                                                    onClick={() => handleCountryChange(c.code)}
                                                                >
                                                                    <span className="mr-2 text-lg">{c.flag}</span>
                                                                    <span>{c.name}</span>
                                                                </button>
                                                            ))}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}
                        <Link href="/" className="text-lg md:text-xl font-bold">VoucherVault</Link>
                        {!isMobile && (
                            <div className="flex space-x-2 ml-4">
                                {pages.map((page) => (
                                    <div
                                        key={page.name}
                                        className="relative"
                                    >
                                        <Link
                                            href={page.link}
                                            className="hover:text-secondary transition-colors px-2 py-1 text-sm"
                                        >
                                            {page.name}
                                        </Link>
                                        {pathname === page.link && (
                                            <motion.div
                                                className="absolute bottom-0 left-1/2 transform -translate-x-1/2 h-0.5 bg-yellow-400"
                                                initial={{ width: "0%" }}
                                                animate={{ width: "50%" }}
                                                transition={{ duration: 0.2 }}
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center space-x-2">
                        {!isMobile && (
                            <div className="relative" ref={dropdownRef}>
                                <button
                                    onClick={() => setIsCountryOpen(!isCountryOpen)}
                                    className={`flex items-center space-x-1 px-2 py-1 rounded-md text-sm ${isCountryOpen ? 'bg-yellow-400 text-white' : 'bg-secondary text-secondary-foreground'
                                        }`}
                                >
                                    <span className="text-lg">{selectedCountry.flag}</span>
                                    <span className="hidden md:inline">{selectedCountry.name}</span>
                                    <ChevronDown className="w-4 h-4" />
                                </button>
                                <AnimatePresence>
                                    {isCountryOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="absolute right-0 mt-2 w-48 bg-background rounded-md shadow-lg z-10 overflow-hidden"
                                        >
                                            {countries.map((c) => (
                                                <button
                                                    key={c.code}
                                                    className={`flex items-center w-full text-left px-3 py-2 text-sm ${c.code === country.code
                                                        ? 'bg-yellow-400 text-white font-semibold'
                                                        : 'text-foreground hover:bg-secondary/10'
                                                        } transition-colors duration-200`}
                                                    onClick={() => handleCountryChange(c.code)}
                                                >
                                                    <span className="mr-2 text-lg">{c.flag}</span>
                                                    <span>{c.name}</span>
                                                </button>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}
                        <WalletMultiButtonDynamic className="wallet-adapter-button-custom bg-accent text-accent-foreground hover:bg-accent/90 px-2 md:px-3 py-1 rounded text-xs md:text-sm max-w-[100px] md:max-w-none truncate" />
                    </div>
                </nav>
            </div>
        </header>
    )
}