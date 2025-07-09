import { useEffect, useState } from 'react';

type DailyEarning = {
  date: string;
  amount: number;
};

type WalletSummary = {
  currentMonthTotal: number;
  lastWeekTotal: number;
  monthlyGrowthPercent: number;
  dailyBreakdown: DailyEarning[];
};

export function useWalletSummary() {
  const [data, setData] = useState<WalletSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<null | string>(null);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await fetch('/api/dashboard/wallet/summary');
        if (!res.ok) throw new Error('Failed to load summary');
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message || 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, []);

  return { data, loading, error };
}