import { useState, useMemo, useCallback } from 'react';
import { FundingTable } from './components/FundingTable';
import { useFundingData } from './hooks/useFundingData';
import { useStarred } from './hooks/useStarred';
import { EXCHANGE_NAMES } from './types';
import type { ExchangeName } from './types';

const STORAGE_EX_KEY = 'funding-arb-exchanges';
const STORAGE_OI_KEY = 'funding-arb-oi-min';

function loadExchanges(): Set<ExchangeName> {
  try {
    const v = localStorage.getItem(STORAGE_EX_KEY);
    if (v) return new Set(JSON.parse(v) as ExchangeName[]);
  } catch { /* ignore */ }
  return new Set(EXCHANGE_NAMES);
}
function loadMinOI(): number {
  try {
    const v = localStorage.getItem(STORAGE_OI_KEY);
    if (v) return parseFloat(v) || 0;
  } catch { /* ignore */ }
  return 0;
}

function App() {
  const [enabledExchanges, setEnabledExchanges] = useState<Set<ExchangeName>>(loadExchanges);
  const [minOI, setMinOI] = useState<number>(loadMinOI);
  const [showFilters, setShowFilters] = useState(false);

  const { data, loading, error, lastUpdated, refresh } = useFundingData(enabledExchanges);
  const { starred, toggleStar } = useStarred();

  const toggleExchange = useCallback((name: ExchangeName) => {
    setEnabledExchanges(prev => {
      const next = new Set(prev);
      if (next.has(name)) { if (next.size > 1) next.delete(name); }
      else next.add(name);
      localStorage.setItem(STORAGE_EX_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  const handleMinOI = useCallback((val: string) => {
    const n = parseFloat(val) || 0;
    setMinOI(n);
    localStorage.setItem(STORAGE_OI_KEY, String(n));
  }, []);

  const visibleExchanges = useMemo(
    () => EXCHANGE_NAMES.filter(n => enabledExchanges.has(n)),
    [enabledExchanges],
  );

  const filteredData = useMemo(() => {
    if (minOI <= 0) return data;
    const threshold = minOI * 1e6; // input is in millions
    return data.filter(r => r.totalOI >= threshold || starred.has(r.asset));
  }, [data, minOI, starred]);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1 className="app-title">
            <span className="title-icon">&#9651;</span>
            Funding Arbitrage
          </h1>
          <span className="app-subtitle">
            Perpetual funding rates across DEX exchanges &middot; annualized APR
          </span>
        </div>
        <div className="header-right">
          {lastUpdated && (
            <span className="last-updated">{lastUpdated.toLocaleTimeString()}</span>
          )}
          <button
            className={`filter-toggle ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(p => !p)}
            title="Filters"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
              <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
              <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
              <line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" />
              <line x1="17" y1="16" x2="23" y2="16" />
            </svg>
          </button>
          <button className="refresh-button" onClick={refresh} disabled={loading}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className={loading ? 'spinning' : ''}>
              <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </button>
        </div>
      </header>

      {showFilters && (
        <div className="filters-bar">
          <div className="filter-group">
            <label className="filter-label">Exchanges</label>
            <div className="exchange-toggles">
              {EXCHANGE_NAMES.map(name => (
                <button
                  key={name}
                  className={`ex-toggle ${enabledExchanges.has(name) ? 'on' : 'off'}`}
                  onClick={() => toggleExchange(name)}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
          <div className="filter-group">
            <label className="filter-label">Min OI ($M)</label>
            <input
              type="number"
              className="oi-input"
              value={minOI || ''}
              onChange={e => handleMinOI(e.target.value)}
              placeholder="0"
              min="0"
              step="0.1"
            />
          </div>
        </div>
      )}

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={refresh}>Retry</button>
        </div>
      )}

      <main className="app-main">
        <FundingTable
          data={filteredData}
          loading={loading}
          starred={starred}
          onToggleStar={toggleStar}
          visibleExchanges={visibleExchanges}
        />
      </main>
    </div>
  );
}

export default App;
