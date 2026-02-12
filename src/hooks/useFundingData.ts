import { useState, useEffect, useCallback } from 'react';
import { fetchAllFundingRates } from '../api/exchanges';
import type { AssetRow, ExchangeName } from '../types';

const REFRESH_INTERVAL = 60_000;

function computeMaxArbitrage(row: AssetRow): number | null {
  const rates: number[] = [];
  for (const ex of Object.values(row.exchanges)) {
    if (ex) rates.push(ex.rate);
  }
  if (rates.length < 2) return null;
  return Math.abs(Math.max(...rates) - Math.min(...rates));
}

function computeTotalOI(row: AssetRow): number {
  let total = 0;
  for (const ex of Object.values(row.exchanges)) {
    if (ex) total += ex.openInterest;
  }
  return total;
}

export function useFundingData(enabledExchanges: Set<ExchangeName>) {
  const [data, setData] = useState<AssetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Serialize enabledExchanges to a string for useCallback/useEffect deps
  const enabledKey = [...enabledExchanges].sort().join(',');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const { ratesByExchange, allAssets } = await fetchAllFundingRates(enabledExchanges);

      const rows: AssetRow[] = allAssets.map((asset) => {
        const exchanges: AssetRow['exchanges'] = {};
        for (const [exName, rateMap] of Object.entries(ratesByExchange)) {
          if (rateMap) {
            const entry = rateMap.get(asset);
            if (entry) {
              exchanges[exName as ExchangeName] = entry;
            }
          }
        }

        const row: AssetRow = { asset, exchanges, maxArbitrage: null, totalOI: 0 };
        row.maxArbitrage = computeMaxArbitrage(row);
        row.totalOI = computeTotalOI(row);
        return row;
      });

      const filtered = rows.filter(r => Object.keys(r.exchanges).length > 0);
      setData(filtered);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      setError('Failed to fetch funding rate data');
      console.error(err);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabledKey]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  return { data, loading, error, lastUpdated, refresh: fetchData };
}
