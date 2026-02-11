import { useState, useMemo } from 'react';
import type { AssetRow, SortField, SortDirection, ExchangeName } from '../types';
import { EXCHANGE_NAMES } from '../types';
import { StarIcon } from './StarIcon';
import { SortIcon } from './SortIcon';
import { CountdownTimer } from './CountdownTimer';

const EXCHANGE_META: Record<ExchangeName, { icon: string; color: string }> = {
  Extended: {
    icon: 'https://pbs.twimg.com/profile_images/1825923015541927936/bplBDOLJ_200x200.jpg',
    color: '#a78bfa',
  },
  EdgeX: {
    icon: 'https://pbs.twimg.com/profile_images/1846150671562567685/mNaW2kHn_200x200.jpg',
    color: '#4a9eff',
  },
  Pacifica: {
    icon: 'https://pbs.twimg.com/profile_images/1897283862261059584/VFXnLxVv_200x200.jpg',
    color: '#00d68f',
  },
  GRVT: {
    icon: 'https://pbs.twimg.com/profile_images/1882773009729703936/c3emEb3m_200x200.jpg',
    color: '#f5c842',
  },
  Variational: {
    icon: 'https://pbs.twimg.com/profile_images/1820495773005434880/L5QLPonV_200x200.jpg',
    color: '#4af0ff',
  },
};

interface FundingTableProps {
  data: AssetRow[];
  loading: boolean;
  starred: Set<string>;
  onToggleStar: (asset: string) => void;
}

function formatRate(value: number | undefined): string {
  if (value === undefined) return '';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function getRateClass(value: number | undefined): string {
  if (value === undefined) return '';
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
    return [...data].sort((a, b) => {
      const aStarred = starred.has(a.asset) ? 1 : 0;
      const bStarred = starred.has(b.asset) ? 1 : 0;
      if (aStarred !== bStarred) return bStarred - aStarred;

      let aVal: number | string | null = null;
      let bVal: number | string | null = null;

      if (sortField === 'asset') {
        aVal = a.asset;
        bVal = b.asset;
      } else if (sortField === 'maxArbitrage') {
        aVal = a.maxArbitrage;
        bVal = b.maxArbitrage;
      } else {
        aVal = a.exchanges[sortField as ExchangeName]?.rate ?? null;
        bVal = b.exchanges[sortField as ExchangeName]?.rate ?? null;
      }

      if (aVal === null && bVal === null) return 0;
      if (aVal === null) return 1;
      if (bVal === null) return -1;

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      return sortDirection === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
  }, [data, sortField, sortDirection, starred]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <p>Loading funding rates from 5 exchanges...</p>
      </div>
    );
  }

  return (
    <div className="table-container">
      <table className="funding-table">
        <thead>
          <tr>
            <th className="th-star"></th>
            <th className="th-asset sortable" onClick={() => handleSort('asset')}>
              Asset
              <SortIcon active={sortField === 'asset'} direction={sortDirection} />
            </th>
            <th className="th-arbitrage sortable" onClick={() => handleSort('maxArbitrage')}>
              Max Arb
              <SortIcon active={sortField === 'maxArbitrage'} direction={sortDirection} />
            </th>
            {EXCHANGE_NAMES.map((name) => (
              <th
                key={name}
                className="th-exchange sortable"
                onClick={() => handleSort(name)}
              >
                <span className="exchange-header">
                  <img
                    src={EXCHANGE_META[name].icon}
                    alt={name}
                    className="exchange-icon"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  {name}
                </span>
                <SortIcon active={sortField === name} direction={sortDirection} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row) => {
            const isStarred = starred.has(row.asset);
            return (
              <tr key={row.asset} className={isStarred ? 'row-starred' : ''}>
                <td className="td-star">
                  <StarIcon filled={isStarred} onClick={() => onToggleStar(row.asset)} />
                </td>
                <td className="td-asset">
                  <span className="asset-name">{row.asset}</span>
                </td>
                <td className="td-arbitrage">
                  {row.maxArbitrage !== null ? (
                    <span
                      className={row.maxArbitrage > 20 ? 'arb-highlight' : 'arb-value'}
                    >
                      {row.maxArbitrage.toFixed(2)}%
                    </span>
                  ) : (
                    <span className="rate-empty">&mdash;</span>
                  )}
                </td>
                {EXCHANGE_NAMES.map((exName) => {
                  const ex = row.exchanges[exName];
                  return (
                    <td key={exName} className={`td-rate ${getRateClass(ex?.rate)}`}>
                      {ex ? (
                        <div className="rate-cell">
                          <span className="rate-value">{formatRate(ex.rate)}</span>
                          {ex.nextFundingTime > 0 && (
                            <CountdownTimer
                              targetTime={ex.nextFundingTime}
                              intervalHours={ex.intervalHours}
                            />
                          )}
                        </div>
                      ) : (
                        <span className="rate-empty">&mdash;</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="table-footer">
        {data.length} assets across {EXCHANGE_NAMES.length} exchanges
      </div>
    </div>
  );
}
