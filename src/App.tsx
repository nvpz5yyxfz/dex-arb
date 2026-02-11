import { FundingTable } from './components/FundingTable';
import { useFundingData } from './hooks/useFundingData';
import { useStarred } from './hooks/useStarred';

function App() {
  const { data, loading, error, lastUpdated, refresh } = useFundingData();
  const { starred, toggleStar } = useStarred();

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1 className="app-title">
            <span className="title-icon">&#9651;</span>
            Funding Arbitrage
          </h1>
          <span className="app-subtitle">
            Compare perpetual funding rates across exchanges
          </span>
        </div>
        <div className="header-right">
          {lastUpdated && (
            <span className="last-updated">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button className="refresh-button" onClick={refresh} disabled={loading}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={loading ? 'spinning' : ''}
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            Refresh
          </button>
        </div>
      </header>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={refresh}>Retry</button>
        </div>
      )}

      <main className="app-main">
        <div className="info-bar">
          <span className="info-text">
            Funding rates annualized (APR %). Arbitrage = spread between best long/short across exchanges.
          </span>
          <span className="info-badge">
            Live &bull; Auto-refresh 60s
          </span>
        </div>
        <FundingTable
          data={data}
          loading={loading}
          starred={starred}
          onToggleStar={toggleStar}
        />
      </main>

      <footer className="app-footer">
        <span>Data sourced from Extended &amp; EdgeX exchanges</span>
      </footer>
    </div>
  );
}

export default App;
