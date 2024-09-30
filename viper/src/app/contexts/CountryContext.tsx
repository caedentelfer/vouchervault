"use client"

import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react'

type CountryData = {
    code: string
    currency: string
    currencySymbol: string
    name: string
    flag: string
}

type CountryContextType = {
    country: CountryData
    setCountry: (countryCode: string) => void
    exchangeRate: number
    setExchangeRate: (rate: number) => void
}

const defaultCountry: CountryData = {
    code: 'US',
    currency: 'USD',
    currencySymbol: '$',
    name: 'United States',
    flag: '🇺🇸'
}

const CountryContext = createContext<CountryContextType | undefined>(undefined)

export function CountryProvider({ children }: { children: ReactNode }) {
    const [country, setCountryState] = useState<CountryData>(defaultCountry)
    const [exchangeRate, setExchangeRate] = useState<number>(1)

    const setCountry = (countryCode: string) => {
        const newCountry = getCountryData(countryCode)
        setCountryState(newCountry)
    }

    useEffect(() => {
        fetchExchangeRate(country.currency)
    }, [country])

    const fetchExchangeRate = async (currency: string) => {
        try {
            const response = await fetch(`https://api.exchangerate-api.com/v4/latest/USD`)
            const data = await response.json()
            const solToUsd = 20 // Assuming 1 SOL = $20 USD, replace with actual rate
            const usdToLocalCurrency = data.rates[currency]
            setExchangeRate(solToUsd * usdToLocalCurrency)
        } catch (error) {
            console.error('Failed to fetch exchange rate:', error)
        }
    }

    return (
        <CountryContext.Provider value={{ country, setCountry, exchangeRate, setExchangeRate }}>
            {children}
        </CountryContext.Provider>
    )
}

export function useCountry() {
    const context = useContext(CountryContext)
    if (context === undefined) {
        throw new Error('useCountry must be used within a CountryProvider')
    }
    return context
}

function getCountryData(countryCode: string): CountryData {
    const countryMap: { [key: string]: CountryData } = {
        'US': { code: 'US', currency: 'USD', currencySymbol: '$', name: 'United States', flag: '🇺🇸' },
        'GB': { code: 'GB', currency: 'GBP', currencySymbol: '£', name: 'United Kingdom', flag: '🇬🇧' },
        'EU': { code: 'EU', currency: 'EUR', currencySymbol: '€', name: 'European Union', flag: '🇪🇺' },
        'JP': { code: 'JP', currency: 'JPY', currencySymbol: '¥', name: 'Japan', flag: '🇯🇵' },
        'CA': { code: 'CA', currency: 'CAD', currencySymbol: 'C$', name: 'Canada', flag: '🇨🇦' },
        'AU': { code: 'AU', currency: 'AUD', currencySymbol: 'A$', name: 'Australia', flag: '🇦🇺' },
        'ZA': { code: 'ZA', currency: 'ZAR', currencySymbol: 'R', name: 'South Africa', flag: '🇿🇦' },
        'IN': { code: 'IN', currency: 'INR', currencySymbol: '₹', name: 'India', flag: '🇮🇳' },
        'CN': { code: 'CN', currency: 'CNY', currencySymbol: '¥', name: 'China', flag: '🇨🇳' },
        'BR': { code: 'BR', currency: 'BRL', currencySymbol: 'R$', name: 'Brazil', flag: '🇧🇷' },
    }

    return countryMap[countryCode] || defaultCountry
}