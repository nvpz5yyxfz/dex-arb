export interface FundingRateData {
  asset: string;
  extended: number | null;  // annualized %
  edgex: number | null;     // annualized %
  maxArbitrage: number | null;
  starred: boolean;
}

export interface EdgeXFundingResponse {
  code: string;
  data: {
    dataList: Array<{
      contractId: string;
      fundingRate: string;
      fundingRateIntervalMin: string;
      predictedFundingRate: string;
      previousFundingRate: string;
      forecastFundingRate: string;
      indexPrice: string;
    }>;
  };
}

export interface ExtendedFundingItem {
  market: string;
  timestamp: number;
  x10OpenInterest: number;
  x10FundingRate: number;
  binanceFundingRate: number | null;
  binanceX10FundingRate: number | null;
  bybitFundingRate: number | null;
  bybitX10FundingRate: number | null;
  okxFundingRate: number | null;
  okxX10FundingRate: number | null;
  hyperliquidFundingRate: number | null;
  hyperliquidX10FundingRate: number | null;
  lighterFundingRate: number | null;
  lighterX10FundingRate: number | null;
  paradexFundingRate: number | null;
  paradexX10FundingRate: number | null;
}

export type SortField = 'asset' | 'maxArbitrage' | 'extended' | 'edgex';
export type SortDirection = 'asc' | 'desc';
