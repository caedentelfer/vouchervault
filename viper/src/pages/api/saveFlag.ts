import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { flagUrl } = req.body;

    if (!flagUrl) {
      return res.status(400).json({ message: 'Flag URL is required' });
    }

    // Path to saved flag file (saves country name that is selected)
    const filePath = path.join(process.cwd(), 'public', 'selectedFlag.txt');

    fs.writeFile(filePath, flagUrl, (err) => {
      if (err) {
        return res.status(500).json({ message: 'Failed to write file' });
      }
      res.status(200).json({ message: 'Flag URL saved successfully' });
    });
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
