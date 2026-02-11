import { useState, useEffect, useCallback } from 'react';
import { fetchAllFundingRates } from '../api/exchanges';
import type { AssetRow, ExchangeName } from '../types';

const REFRESH_INTERVAL = 60_000;

function computeMaxArbitrage(row: AssetRow): number | null {
  const rates: number[] = [];
  for (const key of (['Extended', 'EdgeX', 'Pacifica', 'GRVT', 'Variational'] as ExchangeName[])) {
    const ex = row.exchanges[key];
    if (ex) rates.push(ex.rate);
  }
  if (rates.length < 2) return null;
  const max = Math.max(...rates);
  const min = Math.min(...rates);
  return Math.abs(max - min);
}

export function useFundingData() {
  const [data, setData] = useState<AssetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const { ratesByExchange, allAssets } = await fetchAllFundingRates();

      const rows: AssetRow[] = allAssets.map((asset) => {
        const exchanges: AssetRow['exchanges'] = {};
        for (const exName of (['Extended', 'EdgeX', 'Pacifica', 'GRVT', 'Variational'] as const)) {
          const rateMap = ratesByExchange[exName];
          if (rateMap) {
            const entry = rateMap.get(asset);
            if (entry) {
              exchanges[exName] = entry;
            }
          }
        }

        const row: AssetRow = { asset, exchanges, maxArbitrage: null };
        row.maxArbitrage = computeMaxArbitrage(row);
        return row;
      });

      // Filter: only show assets that appear on at least 1 exchange
      const filtered = rows.filter(
        (r) => Object.keys(r.exchanges).length > 0
      );

      setData(filtered);
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
