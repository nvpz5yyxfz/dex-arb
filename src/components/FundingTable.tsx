import { useState, useMemo } from 'react';
import type { FundingRateData, SortField, SortDirection } from '../types';
import { StarIcon } from './StarIcon';
import { SortIcon } from './SortIcon';

// Crypto icons from a reliable CDN
const ASSET_ICONS: Record<string, string> = {
  BTC: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',
  SOL: 'https://assets.coingecko.com/coins/images/4128/small/solana.png',
  BERA: 'https://assets.coingecko.com/coins/images/34580/small/bera.png',
};

interface FundingTableProps {
  data: FundingRateData[];
  loading: boolean;
  starred: Set<string>;
  onToggleStar: (asset: string) => void;
}

function formatRate(value: number | null): string {
  if (value === null) return '—';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function getRateClass(value: number | null): string {
  if (value === null) return 'rate-neutral';
  if (value > 0) return 'rate-positive';
  if (value < 0) return 'rate-negative';
  return 'rate-neutral';
}

export function FundingTable({ data, loading, starred, onToggleStar }: FundingTableProps) {
  const [sortField, setSortField] = useState<SortField>('maxArbitrage');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedData = useMemo(() => {
    const sorted = [...data].sort((a, b) => {
      // Starred items always on top
      const aStarred = starred.has(a.asset) ? 1 : 0;
      const bStarred = starred.has(b.asset) ? 1 : 0;
      if (aStarred !== bStarred) return bStarred - aStarred;

      // Then sort by selected field
      let aVal: number | string | null;
      let bVal: number | string | null;

      switch (sortField) {
        case 'asset':
          aVal = a.asset;
          bVal = b.asset;
          break;
        case 'maxArbitrage':
          aVal = a.maxArbitrage;
          bVal = b.maxArbitrage;
          break;
        case 'extended':
          aVal = a.extended;
          bVal = b.extended;
          break;
        case 'edgex':
          aVal = a.edgex;
          bVal = b.edgex;
          break;
        default:
          return 0;
      }

      if (aVal === null && bVal === null) return 0;
      if (aVal === null) return 1;
      if (bVal === null) return -1;

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      const numA = aVal as number;
      const numB = bVal as number;
      return sortDirection === 'asc' ? numA - numB : numB - numA;
    });

    return sorted;
  }, [data, sortField, sortDirection, starred]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <p>Loading funding rates...</p>
      </div>
    );
  }

  return (
    <div className="table-container">
      <table className="funding-table">
        <thead>
          <tr>
            <th className="th-star"></th>
            <th
              className="th-asset sortable"
              onClick={() => handleSort('asset')}
            >
              Asset
              <SortIcon active={sortField === 'asset'} direction={sortDirection} />
            </th>
            <th
              className="th-arbitrage sortable"
              onClick={() => handleSort('maxArbitrage')}
            >
              Max Arbitrage
              <SortIcon active={sortField === 'maxArbitrage'} direction={sortDirection} />
            </th>
            <th
              className="th-exchange sortable"
              onClick={() => handleSort('extended')}
            >
              <span className="exchange-header">
                <img
                  src="https://pbs.twimg.com/profile_images/1825923015541927936/bplBDOLJ_200x200.jpg"
                  alt="Extended"
                  className="exchange-icon"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                Extended
              </span>
              <SortIcon active={sortField === 'extended'} direction={sortDirection} />
            </th>
            <th
              className="th-exchange sortable"
              onClick={() => handleSort('edgex')}
            >
              <span className="exchange-header">
                <img
                  src="https://pbs.twimg.com/profile_images/1846150671562567685/mNaW2kHn_200x200.jpg"
                  alt="EdgeX"
                  className="exchange-icon"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                EdgeX
              </span>
              <SortIcon active={sortField === 'edgex'} direction={sortDirection} />
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row) => (
            <tr key={row.asset} className={starred.has(row.asset) ? 'row-starred' : ''}>
              <td className="td-star">
                <StarIcon
                  filled={starred.has(row.asset)}
                  onClick={() => onToggleStar(row.asset)}
                />
              </td>
              <td className="td-asset">
                <div className="asset-cell">
                  <img
                    src={ASSET_ICONS[row.asset] || ''}
                    alt={row.asset}
                    className="asset-icon"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  <span className="asset-name">{row.asset}</span>
                  <span className="asset-pair">/ USD</span>
                </div>
              </td>
              <td className="td-arbitrage">
                <span className={row.maxArbitrage !== null && row.maxArbitrage > 5 ? 'arb-highlight' : 'arb-value'}>
                  {row.maxArbitrage !== null ? `${row.maxArbitrage.toFixed(2)}%` : '—'}
                </span>
              </td>
              <td className={`td-rate ${getRateClass(row.extended)}`}>
                {formatRate(row.extended)}
              </td>
              <td className={`td-rate ${getRateClass(row.edgex)}`}>
                {formatRate(row.edgex)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
