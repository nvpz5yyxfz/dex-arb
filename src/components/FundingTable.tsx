import { useState, useMemo } from 'react';
import type { AssetRow, SortField, SortDirection, ExchangeName } from '../types';
import { StarIcon } from './StarIcon';
import { SortIcon } from './SortIcon';
import { CountdownTimer } from './CountdownTimer';

const EXCHANGE_META: Record<ExchangeName, { icon: string }> = {
  Extended: { icon: 'https://pbs.twimg.com/profile_images/1825923015541927936/bplBDOLJ_200x200.jpg' },
  EdgeX:    { icon: 'https://pbs.twimg.com/profile_images/1846150671562567685/mNaW2kHn_200x200.jpg' },
  Pacifica: { icon: 'https://pbs.twimg.com/profile_images/1897283862261059584/VFXnLxVv_200x200.jpg' },
  GRVT:     { icon: 'https://pbs.twimg.com/profile_images/1882773009729703936/c3emEb3m_200x200.jpg' },
  Variational: { icon: 'https://pbs.twimg.com/profile_images/1820495773005434880/L5QLPonV_200x200.jpg' },
};

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

function formatOI(value: number): string {
  if (!value) return '';
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

interface FundingTableProps {
  data: AssetRow[];
  loading: boolean;
  starred: Set<string>;
  onToggleStar: (asset: string) => void;
  visibleExchanges: ExchangeName[];
}

export function FundingTable({
  data, loading, starred, onToggleStar, visibleExchanges,
}: FundingTableProps) {
  const [sortField, setSortField] = useState<SortField>('maxArbitrage');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      const aS = starred.has(a.asset) ? 1 : 0;
      const bS = starred.has(b.asset) ? 1 : 0;
      if (aS !== bS) return bS - aS;

      let aV: number | string | null = null;
      let bV: number | string | null = null;

      if (sortField === 'asset') { aV = a.asset; bV = b.asset; }
      else if (sortField === 'maxArbitrage') { aV = a.maxArbitrage; bV = b.maxArbitrage; }
      else if (sortField === 'totalOI') { aV = a.totalOI || null; bV = b.totalOI || null; }
      else { aV = a.exchanges[sortField as ExchangeName]?.rate ?? null; bV = b.exchanges[sortField as ExchangeName]?.rate ?? null; }

      if (aV === null && bV === null) return 0;
      if (aV === null) return 1;
      if (bV === null) return -1;

      if (typeof aV === 'string' && typeof bV === 'string')
        return sortDirection === 'asc' ? aV.localeCompare(bV) : bV.localeCompare(aV);
      return sortDirection === 'asc' ? (aV as number) - (bV as number) : (bV as number) - (aV as number);
    });
  }, [data, sortField, sortDirection, starred]);

  if (loading && data.length === 0) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <p>Loading funding rates...</p>
      </div>
    );
  }

  return (
    <div className="table-wrapper">
      <div className="table-container">
        <table className="funding-table">
          <thead>
            <tr>
              <th className="th-star sticky-col"></th>
              <th className="th-asset sticky-col sortable" onClick={() => handleSort('asset')}>
                Asset<SortIcon active={sortField === 'asset'} direction={sortDirection} />
              </th>
              <th className="th-arbitrage sortable" onClick={() => handleSort('maxArbitrage')}>
                Max Arb<SortIcon active={sortField === 'maxArbitrage'} direction={sortDirection} />
              </th>
              <th className="th-oi sortable" onClick={() => handleSort('totalOI')}>
                Open Interest<SortIcon active={sortField === 'totalOI'} direction={sortDirection} />
              </th>
              {visibleExchanges.map(name => (
                <th key={name} className="th-exchange sortable" onClick={() => handleSort(name)}>
                  <span className="exchange-header">
                    <img src={EXCHANGE_META[name].icon} alt={name} className="exchange-icon"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    {name}
                  </span>
                  <SortIcon active={sortField === name} direction={sortDirection} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.map(row => {
              const isStarred = starred.has(row.asset);
              return (
                <tr key={row.asset} className={isStarred ? 'row-starred' : ''}>
                  <td className="td-star sticky-col">
                    <StarIcon filled={isStarred} onClick={() => onToggleStar(row.asset)} />
                  </td>
                  <td className="td-asset sticky-col">
                    <span className="asset-name">{row.asset}</span>
                  </td>
                  <td className="td-arbitrage">
                    {row.maxArbitrage !== null ? (
                      <span className={row.maxArbitrage > 20 ? 'arb-highlight' : 'arb-value'}>
                        {row.maxArbitrage.toFixed(2)}%
                      </span>
                    ) : <span className="rate-empty">&mdash;</span>}
                  </td>
                  <td className="td-oi">
                    {row.totalOI > 0 ? (
                      <span className="oi-value">{formatOI(row.totalOI)}</span>
                    ) : <span className="rate-empty">&mdash;</span>}
                  </td>
                  {visibleExchanges.map(exName => {
                    const ex = row.exchanges[exName];
                    return (
                      <td key={exName} className={`td-rate ${getRateClass(ex?.rate)}`}>
                        {ex ? (
                          <div className="rate-cell">
                            <span className="rate-value">{formatRate(ex.rate)}</span>
                            {ex.nextFundingTime > 0 && (
                              <CountdownTimer targetTime={ex.nextFundingTime} intervalHours={ex.intervalHours} />
                            )}
                          </div>
                        ) : <span className="rate-empty">&mdash;</span>}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="table-footer">
        {data.length} assets across {visibleExchanges.length} exchanges
      </div>
    </div>
  );
}
