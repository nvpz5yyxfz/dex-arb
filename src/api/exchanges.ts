import type { EdgeXFundingResponse, ExtendedMarketStatsResponse } from '../types';

// EdgeX contract IDs for the assets we track
const EDGEX_CONTRACTS: Record<string, string> = {
  BTC: '10000001',
  SOL: '10000003',
  BERA: '10000063',
};

// Extended market names (per https://api.docs.extended.exchange/)
const EXTENDED_MARKETS: Record<string, string> = {
  BTC: 'BTC-USD',
  SOL: 'SOL-USD',
  BERA: 'BERA-USD',
};

// Assets to track
export const ASSETS = ['BTC', 'SOL', 'BERA'];

// EdgeX: funding rate is per interval (fundingRateIntervalMin, typically 240 min = 4h)
// Annualized = rate * (365 * 24 * 60 / intervalMin) * 100
function annualizeEdgeX(rate: number, intervalMin: number): number {
  const periodsPerYear = (365 * 24 * 60) / intervalMin;
  return rate * periodsPerYear * 100;
}

// Extended: funding rate is per 1 hour (calculated every minute, applied hourly)
// Per docs: "the funding rate is calculated every minute, it is only applied once per hour"
// Annualized = rate * 8760 * 100 (365 * 24 hours/year)
function annualizeExtended(rate: number): number {
  return rate * 8760 * 100;
}

export async function fetchEdgeXFundingRates(): Promise<Record<string, number>> {
  const results: Record<string, number> = {};

  const fetches = ASSETS.map(async (asset) => {
    const contractId = EDGEX_CONTRACTS[asset];
    if (!contractId) return;

    try {
      const response = await fetch(
        `/api/edgex/v1/public/funding/getFundingRatePage?contractId=${contractId}&size=1`
      );
      const data: EdgeXFundingResponse = await response.json();

      if (data.code === 'SUCCESS' && data.data.dataList.length > 0) {
        const item = data.data.dataList[0];
        const rate = parseFloat(item.fundingRate);
        const intervalMin = parseInt(item.fundingRateIntervalMin, 10) || 240;
        results[asset] = annualizeEdgeX(rate, intervalMin);
      }
    } catch (error) {
      console.error(`Failed to fetch EdgeX funding rate for ${asset}:`, error);
    }
  });

  await Promise.all(fetches);
  return results;
}

// Extended API: GET /api/v1/info/markets/{market}/stats
// Base URL: https://api.starknet.extended.exchange
// Proxied through: /api/extended/v1/info/markets/{market}/stats
export async function fetchExtendedFundingRates(): Promise<Record<string, number>> {
  const results: Record<string, number> = {};

  const fetches = ASSETS.map(async (asset) => {
    const marketName = EXTENDED_MARKETS[asset];
    if (!marketName) return;

    try {
      const response = await fetch(
        `/api/extended/v1/info/markets/${marketName}/stats`
      );
      const data: ExtendedMarketStatsResponse = await response.json();

      if (data.status === 'OK' && data.data?.fundingRate != null) {
        const rate = parseFloat(data.data.fundingRate);
        if (!isNaN(rate)) {
          results[asset] = annualizeExtended(rate);
        }
      }
    } catch (error) {
      console.error(`Failed to fetch Extended funding rate for ${asset}:`, error);
    }
  });

  await Promise.all(fetches);
  return results;
}
