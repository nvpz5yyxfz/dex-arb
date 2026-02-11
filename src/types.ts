export const EXCHANGE_NAMES = ['Extended', 'EdgeX', 'Pacifica', 'GRVT', 'Variational'] as const;
export type ExchangeName = (typeof EXCHANGE_NAMES)[number];

export interface ExchangeRate {
  rate: number;              // annualized %
  nextFundingTime: number;   // epoch ms (0 if unknown)
  intervalHours: number;     // funding interval in hours
}

export interface AssetRow {
  asset: string;
  exchanges: Partial<Record<ExchangeName, ExchangeRate>>;
  maxArbitrage: number | null;
}

export type SortField = 'asset' | 'maxArbitrage' | ExchangeName;
export type SortDirection = 'asc' | 'desc';
