import type { NextApiRequest, NextApiResponse } from 'next'
import path from 'path'
import fs from 'fs'

interface Company {
  name: string
  walletAddress: string
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<Company[] | { error: string }>
) {
  const filePath = path.join(process.cwd(), 'data', 'companyWalletAddresses.json')
  try {
    const fileData = fs.readFileSync(filePath, 'utf-8')
    const companies: Company[] = JSON.parse(fileData).companies
    res.status(200).json(companies)
  } catch (error) {
    console.error('Error loading company wallet addresses:', error)
    res.status(500).json({ error: 'Failed to load company wallet addresses' })
  }
}