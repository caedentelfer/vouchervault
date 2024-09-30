"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { useCountry } from './contexts/CountryContext'
import { Shield, Lock, Zap, Coins } from 'lucide-react'

type UserType = 'Issuer' | 'Influencer' | 'Manufacturer'

export default function Home() {
    const [isLoaded, setIsLoaded] = useState(false)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [isWalletConnected, setIsWalletConnected] = useState(false)
    const router = useRouter()
    const { connected } = useWallet()
    const { country, setCountry } = useCountry()

    useEffect(() => {
        setIsLoaded(true)
    }, [])

    useEffect(() => {
        setIsWalletConnected(connected)
    }, [connected])

    const handleUserTypeSelection = (type: UserType) => {
        console.log(`Selected user type: ${type}`)
        setIsDialogOpen(false)
        switch (type) {
            case 'Influencer':
                router.push('/influencer')
                break
            case 'Issuer':
                router.push('/issuer')
                break
            case 'Manufacturer':
                router.push('/manufacturer')
                break
            default:
                console.log(`Unhandled user type: ${type}`)
        }
    }

    const handleGetStarted = () => {
        setIsDialogOpen(true)
    }

    const fadeIn = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.5 } }
    }

    const slideUp = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1, transition: { duration: 0.5 } }
    }

    const roleData = [
        { type: 'Issuer', image: '/images/issuer.png' },
        { type: 'Influencer', image: '/images/influencer.png' },
        { type: 'Manufacturer', image: '/images/manufacturer.png' }
    ]

    return (
        <motion.div
            className="min-h-screen bg-white text-gray-900"
            initial="hidden"
            animate={isLoaded ? "visible" : "hidden"}
            variants={fadeIn}
        >
            <main>
                <section className="py-20 bg-blue-50">
                    <div className="container mx-auto px-4 text-center">
                        <motion.h2
                            className="text-5xl font-bold mb-6 text-blue-600"
                            variants={slideUp}
                        >
                            Welcome to VoucherVault
                        </motion.h2>
                        <motion.p
                            className="text-xl mb-12 text-gray-600 max-w-2xl mx-auto"
                            variants={slideUp}
                        >
                            Revolutionize your affiliate marketing with our blockchain voucher technology.
                            Secure, transparent, and efficient partnerships await you.
                        </motion.p>
                        <motion.button
                            onClick={handleGetStarted}
                            className="bg-accent text-accent-foreground hover:bg-accent/80 px-6 py-3 rounded-lg text-lg font-semibold transition-colors duration-300"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            Get Started
                        </motion.button>
                    </div>
                </section>

                <section className="py-20 bg-white">
                    <div className="container mx-auto px-4 text-center">
                        <motion.h2
                            className="text-4xl font-bold mb-12 text-blue-600 relative inline-block"
                            variants={slideUp}
                        >
                            Choose Your Role
                            <span className="absolute bottom-0 left-[-10%] right-[-10%] h-1 bg-yellow-400"></span>
                        </motion.h2>
                        <div className="grid md:grid-cols-3 gap-8">
                            {[
                                {
                                    type: "Manufacturer",
                                    image: "/images/manufacturer.png",
                                    description: "Create and issue digital vouchers for your products or services, manage distribution to influencers, and track usage."
                                },
                                {
                                    type: "Influencer",
                                    image: "/images/influencer.png",
                                    description: "Receive and view vouchers to redeem in stores, enhancing your promotional campaigns and partnerships with brands."
                                },
                                {
                                    type: "Issuer",
                                    image: "/images/issuer.png",
                                    description: "Verify and redeem vouchers at your outlets, ensuring seamless transactions and secure interactions with customers."
                                }
                            ].map(({ type, image, description }) => (
                                <motion.div
                                    key={type}
                                    className="bg-gray-50 p-6 rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-all duration-300 flex flex-col items-center group relative overflow-hidden"
                                    onClick={() => handleUserTypeSelection(type as UserType)}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    variants={fadeIn}
                                >
                                    <div className="w-48 h-48 relative mb-4 overflow-hidden rounded-full z-10">
                                        <Image
                                            src={image}
                                            alt={type}
                                            fill
                                            className="object-cover transition-transform duration-300 group-hover:scale-110"
                                        />
                                    </div>
                                    <h3 className="text-2xl font-semibold mb-2 relative z-10 transition-colors duration-300 group-hover:text-white">{type}</h3>
                                    <p className="text-gray-600 group-hover:text-white relative z-10 transition-colors duration-300">{description}</p>
                                    <div className="absolute inset-0 bg-yellow-400 opacity-0 group-hover:opacity-80 transition-opacity duration-300" />
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="py-20 bg-blue-50">
                    <div className="container mx-auto px-4 text-center">
                        <motion.h3
                            className="text-3xl font-bold mb-12 text-blue-600 relative inline-block"
                            variants={slideUp}
                        >
                            How It Works
                            <span className="absolute bottom-0 left-[-10%] right-[-10%] h-1 bg-yellow-400"></span>
                        </motion.h3>
                        <div className="grid md:grid-cols-3 gap-8">
                            {[
                                {
                                    step: 1,
                                    title: "Connect Wallet",
                                    image: "/images/connect-wallet.png",
                                    description: "Securely connect your Solana wallet to access the VoucherVault platform and manage your digital vouchers."
                                },
                                {
                                    step: 2,
                                    title: "Choose Your Role",
                                    image: "/images/choose-role.png",
                                    description: "Select your role as a Manufacturer, Influencer, or Issuer to access role-specific features and functionalities."
                                },
                                {
                                    step: 3,
                                    title: "Start Collaborating",
                                    image: "/images/collaborate.png",
                                    description: "Create, transfer, verify or redeem vouchers seamlessly within the VoucherVault ecosystem, fostering collaboration between brands and influencers."
                                }
                            ].map(({ step, title, image, description }) => (
                                <motion.div key={step} className="bg-white p-6 rounded-lg shadow-md" variants={fadeIn}>
                                    <div className="w-48 h-48 relative mx-auto mb-4">
                                        <Image
                                            src={image}
                                            alt={title}
                                            fill
                                            className="rounded-lg object-cover"
                                        />
                                    </div>
                                    <div className="text-4xl font-bold text-blue-600 mb-4">{step}</div>
                                    <h4 className="text-xl font-semibold mb-2 text-center">{title}</h4>
                                    <p className="text-gray-600 text-center">{description}</p>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="py-20 bg-blue-50">
                    <div className="container mx-auto px-4">
                        <motion.h3
                            className="text-3xl font-bold mb-12 text-blue-600 relative inline-block text-center w-full"
                            variants={slideUp}
                        >
                            Why Blockchain for Smart Contract Vouchers?
                            <span className="absolute bottom-0 left-1/4 right-1/4 h-1 bg-yellow-400"></span>
                        </motion.h3>
                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                            {[
                                {
                                    icon: <Shield className="w-12 h-12 text-blue-600 mb-4" />,
                                    title: "Enhanced Security",
                                    description: "Blockchain technology provides unparalleled security for your vouchers, ensuring they cannot be duplicated or tampered with."
                                },
                                {
                                    icon: <Lock className="w-12 h-12 text-blue-600 mb-4" />,
                                    title: "Transparency",
                                    description: "All transactions are recorded on the blockchain, providing complete transparency and traceability for all parties involved."
                                },
                                {
                                    icon: <Zap className="w-12 h-12 text-blue-600 mb-4" />,
                                    title: "Efficiency",
                                    description: "Smart contracts automate the voucher process, reducing administrative overhead and speeding up transactions."
                                },
                                {
                                    icon: <Coins className="w-12 h-12 text-blue-600 mb-4" />,
                                    title: "Cost-Effective",
                                    description: "By eliminating intermediaries and reducing fraud, blockchain technology significantly lowers operational costs."
                                }
                            ].map(({ icon, title, description }, index) => (
                                <motion.div
                                    key={index}
                                    className="bg-white p-6 rounded-lg shadow-md flex flex-col items-center text-center"
                                    variants={fadeIn}
                                >
                                    {icon}
                                    <h4 className="text-xl font-semibold mb-2">{title}</h4>
                                    <p className="text-gray-600">{description}</p>
                                </motion.div>
                            ))}
                        </div>
                        <motion.p
                            className="text-xl text-gray-600 mt-12 max-w-3xl mx-auto text-center"
                            variants={slideUp}
                        >
                            Our blockchain-based smart contract vouchers revolutionize the way manufacturers, influencers, and issuers interact. By leveraging this cutting-edge technology, we ensure secure, transparent, and efficient transactions for all parties involved.
                        </motion.p>
                    </div>
                </section>

                <section className="py-20 bg-white">
                    <div className="container mx-auto px-4 text-center">
                        <motion.h3
                            className="text-3xl font-bold mb-6 text-blue-600"
                            variants={slideUp}
                        >
                            Ready to Revolutionize Your Affiliate Marketing?
                        </motion.h3>
                        <motion.p
                            className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto"
                            variants={slideUp}
                        >
                            Join our blockchain-powered voucher platform that's changing the game.
                            Experience secure transactions, transparent tracking, and seamless collaborations.
                        </motion.p>
                        <motion.button
                            onClick={handleGetStarted}
                            className="bg-accent text-accent-foreground hover:bg-accent/80 px-6 py-3 rounded-lg text-lg font-semibold transition-colors duration-300"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            Get Started Now
                        </motion.button>
                    </div>
                </section>
            </main>

            <footer className="bg-blue-600 text-white py-12">
                <div className="container mx-auto px-4 text-center">
                    <p>&copy; 2024 VoucherVault. All rights reserved.</p>
                    <div className="mt-4">
                        <Link href="/privacy" className="hover:text-blue-200 mr-4">Privacy Policy</Link>
                        <Link href="/terms" className="hover:text-blue-200">Terms of Service</Link>
                    </div>
                </div>
            </footer>

            <AnimatePresence>
                {isDialogOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                        onClick={() => setIsDialogOpen(false)}
                    >
                        <motion.div
                            initial={{ y: -50, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 50, opacity: 0 }}
                            className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h2 className="text-2xl font-bold mb-4 text-blue-600 text-center">
                                {isWalletConnected ? "Choose Your Role" : "Connect Your Wallet"}
                            </h2>
                            <p className="text-gray-600 mb-6 text-center">
                                {isWalletConnected
                                    ? "Please select your role to continue."
                                    : "Connect your Solana wallet to get started. If you are continuing as a brand, company or outlet, you should connect your company's wallet."}
                            </p>
                            {isWalletConnected ? (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {roleData.map(({ type, image }) => (
                                        <motion.button
                                            key={type}
                                            onClick={() => handleUserTypeSelection(type as UserType)}
                                            className="flex flex-col items-center p-4 bg-accent text-accent-foreground rounded-lg hover:bg-accent/80 transition-colors duration-300 relative overflow-hidden"
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                        >
                                            <div className="w-24 h-24 relative mb-2">
                                                <Image
                                                    src={image}
                                                    alt={type}
                                                    fill
                                                    className="rounded-full object-cover"
                                                />
                                            </div>
                                            <span>{type}</span>
                                            <motion.div
                                                className="absolute inset-0 bg-accent"
                                                initial={{ scale: 0, opacity: 0 }}
                                                whileHover={{ scale: 1, opacity: 1 }}
                                                transition={{ duration: 0.3 }}
                                            />
                                        </motion.button>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex justify-center">
                                    <WalletMultiButton className="wallet-adapter-button-custom" />
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}