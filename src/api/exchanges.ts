import type { EdgeXFundingResponse, ExtendedFundingItem } from '../types';

// EdgeX contract IDs for the assets we track
const EDGEX_CONTRACTS: Record<string, string> = {
  BTC: '10000001',
  SOL: '10000003',
  BERA: '10000063',
};

// Extended market names
const EXTENDED_MARKETS: Record<string, string> = {
  BTC: 'BTC-USD',
  SOL: 'SOL-USD',
  BERA: 'BERA-USD',
};

// Assets to track
export const ASSETS = ['BTC', 'SOL', 'BERA'];

// EdgeX: funding rate is per interval (fundingRateIntervalMin, typically 240 min = 4h)
// Annualized = rate * (365 * 24 * 60 / intervalMin)
function annualizeEdgeX(rate: number, intervalMin: number): number {
  const periodsPerYear = (365 * 24 * 60) / intervalMin;
  return rate * periodsPerYear * 100; // convert to percentage
}

// Extended: funding rate is per 1 hour
// Annualized = rate * 8760 (365 * 24)
function annualizeExtended(rate: number): number {
  return rate * 8760 * 100; // convert to percentage
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

export async function fetchExtendedFundingRates(): Promise<Record<string, number>> {
  const results: Record<string, number> = {};

  try {
    const response = await fetch('/api/extended/v1/funding-rates-stats');
    const data: ExtendedFundingItem[] = await response.json();

    if (Array.isArray(data)) {
      for (const asset of ASSETS) {
        const marketName = EXTENDED_MARKETS[asset];
        const item = data.find((d) => d.market === marketName);
        if (item && item.x10FundingRate != null) {
          results[asset] = annualizeExtended(item.x10FundingRate);
        }
      }
    }
  } catch (error) {
    console.error('Failed to fetch Extended funding rates:', error);
  }

  return results;
}
