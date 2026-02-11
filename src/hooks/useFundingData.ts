import { useState, useEffect, useCallback } from 'react';
import { fetchEdgeXFundingRates, fetchExtendedFundingRates, ASSETS } from '../api/exchanges';
import type { FundingRateData } from '../types';

const REFRESH_INTERVAL = 60_000; // 60 seconds

export function useFundingData() {
  const [data, setData] = useState<FundingRateData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [edgexRates, extendedRates] = await Promise.all([
        fetchEdgeXFundingRates(),
        fetchExtendedFundingRates(),
      ]);

      const rows: FundingRateData[] = ASSETS.map((asset) => {
        const extended = extendedRates[asset] ?? null;
        const edgex = edgexRates[asset] ?? null;

        let maxArbitrage: number | null = null;
        if (extended !== null && edgex !== null) {
          maxArbitrage = Math.abs(extended - edgex);
        }

        return {
          asset,
          extended,
          edgex,
          maxArbitrage,
          starred: false, // managed separately
        };
      });

      setData(rows);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      setError('Failed to fetch funding rate data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  return { data, loading, error, lastUpdated, refresh: fetchData };
}
