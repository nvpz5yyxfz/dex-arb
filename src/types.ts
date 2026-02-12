export const EXCHANGE_NAMES = ['Extended', 'EdgeX', 'Pacifica', 'GRVT', 'Variational'] as const;
export type ExchangeName = (typeof EXCHANGE_NAMES)[number];

export interface ExchangeRate {
  rate: number;              // annualized %
  nextFundingTime: number;   // epoch ms (0 if unknown)
  intervalHours: number;     // funding interval in hours for this specific coin
  openInterest: number;      // open interest in USD (0 if unknown)
}

export interface AssetRow {
  asset: string;
  exchanges: Partial<Record<ExchangeName, ExchangeRate>>;
  maxArbitrage: number | null;
  totalOI: number;           // sum of OI across exchanges (USD)
}

export type SortField = 'asset' | 'maxArbitrage' | 'totalOI' | ExchangeName;
export type SortDirection = 'asc' | 'desc';
