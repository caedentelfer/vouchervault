import React, { useEffect, useState, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { transferHooks } from "../hooks/transferHooks";

const transferRateDataDefault = [
  { date: '2024-02', rate: 0 },
  { date: '2024-03', rate: 0 },
  { date: '2024-04', rate: 0 },
  { date: '2024-05', rate: 0 },
  { date: '2024-06', rate: 0 },
 ];

const ChartTooltipContent = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background p-2 border border-border rounded shadow">
        <p className="label">{`${label} : ${payload[0].value}`}</p>
      </div>
    );
  }
  return null;
};

interface AnalyticsProps {
  walletAddress: string;
}

interface Influencer {
  name: string;
  walletAddress: string;
  instagram: string;
}

interface Transfer {
  signature: string;
  timestamp: number;
  recipient: string;
  amount: number;
}


const Analytics: React.FC<AnalyticsProps> = ({ walletAddress }) => {
  const { transfers, loading, error, refetch } = transferHooks(walletAddress);
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [influencerDistributionData, setInfluencerDistributionData] = useState<{ name: string; vouchers: number }[]>([]);
  const hasFetchedInfluencers = useRef(false);
  const [transferRateData, setTransferRateData] = useState(transferRateDataDefault);

  const loadInfluencerData = async () => {
    try {
      const response = await fetch('/api/InfluencerLoader');
      const data = await response.json();
      setInfluencers(data);
      console.log('Influencer data:', influencers);
      hasFetchedInfluencers.current = true;
    } catch (error) {
      console.error('Error loading influencer data:', error);
    }
  };

  // Helper function to format timestamp into YYYY-MM string format
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  };

  const cleanTransferData = (transfers: Transfer[]) => {
    const dateMap = new Map<string, number>();

    transfers.forEach((transfer) => {
      const formattedDate = formatDate(transfer.timestamp);
      dateMap.set(formattedDate, (dateMap.get(formattedDate) || 0) + 1);
    });

    // Convert map to array and sort by date
    const cleanedData = Array.from(dateMap, ([date, amount]) => ({ date, rate: amount }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  console.log('Cleaned and sorted transfer data:', cleanedData);
    return cleanedData;
  };

  useEffect(() => {
    if (transfers) {
      const cleanedData = cleanTransferData(transfers);
      setTransferRateData(cleanedData);
    }
  }, [transfers]);

  useEffect(() => {
    if (!hasFetchedInfluencers.current) {
      loadInfluencerData();
    }
  }, []);

  useEffect(() => {
    if (transfers && influencers.length > 0) {
      const distributionMap = new Map<string, number>();
      let otherCount = 0;

      transfers.forEach(transfer => {
        const influencer = influencers.find(inf => inf.walletAddress.toLowerCase() === transfer.recipient.toLowerCase());
        if (influencer) {
          distributionMap.set(influencer.name, (distributionMap.get(influencer.name) || 0) + 1);
        } else {
          otherCount++;
        }
      });

      const distribution = Array.from(distributionMap, ([name, vouchers]) => ({ name, vouchers }));
      if (otherCount > 0) {
        distribution.push({ name: 'Other', vouchers: otherCount });
      }

      setInfluencerDistributionData(distribution);
    }
  }, [transfers, influencers]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <Card>
        <CardHeader>
          <CardTitle>Voucher Distribution by Influencer</CardTitle>
          <CardDescription>Number of vouchers distributed to each influencer</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={influencerDistributionData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip content={<ChartTooltipContent active={undefined} payload={undefined} label={undefined} />} />
                <Legend />
                <Bar dataKey="vouchers" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      <Card>
      <CardHeader>
        <CardTitle>Voucher Distribution Rate Over Time</CardTitle>
        <CardDescription>Number of vouchers transferred to influencers per month</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={transferRateData}>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip content={<ChartTooltipContent active={undefined} payload={undefined} label={undefined} />} />
              <Legend />
              <Line type="monotone" dataKey="rate" stroke="hsl(var(--primary))" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
    </div>
  );
};

export default Analytics;