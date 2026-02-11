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

export interface ExtendedMarketStatsResponse {
  status: string;
  data: {
    fundingRate: string;
    nextFundingRate: number;
    lastPrice: string;
    markPrice: string;
    indexPrice: string;
    openInterest: string;
    dailyVolume: string;
  };
}

export type SortField = 'asset' | 'maxArbitrage' | 'extended' | 'edgex';
export type SortDirection = 'asc' | 'desc';
