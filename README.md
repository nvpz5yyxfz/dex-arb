# Funding Arbitrage Dashboard

A web application for comparing perpetual futures funding rates across crypto exchanges to identify arbitrage opportunities.

## Features

- Real-time funding rates from **Extended** and **EdgeX** exchanges
- Tracks **BTC**, **SOL**, **BERA** perpetual contracts
- Funding rates normalized to **annualized percentage (APR)**
- Star/favorite assets to pin them to the top of the table
- Sortable columns (asset, max arbitrage, exchange rates)
- Auto-refresh every 60 seconds
- Dark theme UI

## Setup

```bash
# Install dependencies
npm install

# Development (with Vite proxy for exchange APIs)
npm run dev

# Production build
npm run build

# Run production server (serves built frontend + API proxy)
npm run server
```

## Architecture

- **Frontend**: React + TypeScript + Vite
- **Backend**: Express server proxies exchange API calls to handle CORS
- **Data Sources**:
  - EdgeX: `pro.edgex.exchange/api/v1/public/funding/getFundingRatePage`
  - Extended: `api.starknet.extended.exchange/api/v1/info/markets/{market}/stats` ([API docs](https://api.docs.extended.exchange/))

## Annualization

- **EdgeX**: Funding rate is per funding interval (typically 4 hours / 240 min). Annualized = `rate * (525600 / intervalMin) * 100`
- **Extended**: Funding rate is per 1 hour. Annualized = `rate * 8760 * 100`
