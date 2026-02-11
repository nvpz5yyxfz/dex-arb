# Funding Arbitrage Dashboard

A web application for comparing perpetual futures funding rates across crypto DEX exchanges to identify arbitrage opportunities.

## Features

- Real-time funding rates from **5 exchanges**: Extended, EdgeX, Pacifica, GRVT, Variational
- Dynamically discovers **all available assets** across exchanges
- Funding rates normalized to **annualized percentage (APR)**
- **Countdown timer** next to each rate showing time until next funding payment
- Star/favorite assets to pin them to the top of the table
- Sortable columns (asset, max arbitrage, any exchange)
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
  | Exchange | API | Interval | Rate Format |
  |---|---|---|---|
  | Extended | `api.starknet.extended.exchange/api/v1/info/markets` | 1h | decimal per 1h |
  | EdgeX | `pro.edgex.exchange/api/v1/public/funding/getFundingRatePage` | 4h | decimal per interval |
  | Pacifica | `api.pacifica.fi/api/v1/info/prices` | 1h | decimal per 1h |
  | GRVT | `market-data.grvt.io/full/v1/ticker` (POST) | 8h | % per 8h |
  | Variational | `omni-client-api...variational.io/metadata/stats` | varies | annualized decimal |

## Annualization

All rates are converted to annualized percentage:
- **1h rates**: `rate * 8760 * 100`
- **4h rates**: `rate * 2190 * 100`
- **8h rates** (EdgeX): `rate * (525600 / intervalMin) * 100`
- **8h % rates** (GRVT): `rate * 1095`
- **Annualized decimal** (Variational): `rate * 100`
