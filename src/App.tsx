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
            Perpetual funding rates across DEX exchanges &middot; annualized APR
          </span>
        </div>
        <div className="header-right">
          {lastUpdated && (
            <span className="last-updated">
              {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button className="refresh-button" onClick={refresh} disabled={loading}>
            <svg
              width="14"
              height="14"
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
        <FundingTable
          data={data}
          loading={loading}
          starred={starred}
          onToggleStar={toggleStar}
        />
      </main>
    </div>
  );
}

export default App;
