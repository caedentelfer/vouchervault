import type { NextApiRequest, NextApiResponse } from 'next'
import path from 'path'
import fs from 'fs'

interface Influencer {
    name: string;
    walletAddress : number;
    instagram: string;
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<Influencer[] | { error: string }>
) {
  const filePath = path.join(process.cwd(), 'data', 'influencerInfo.json')
  try {
    const fileData = fs.readFileSync(filePath, 'utf-8')
    const influencers: Influencer[] = JSON.parse(fileData).influencers
    res.status(200).json(influencers)
  } catch (error) {
    console.error('Error loading influencer wallet addresses:', error)
    res.status(500).json({ error: 'Failed to load influencer wallet addresses' })
  }
}