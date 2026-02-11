import type { ExchangeRate } from '../types';

// ─── Alias normalization ───────────────────────────────────────────
// Some exchanges use 1000PEPE, others use kPEPE or KPEPE
const ALIASES: Record<string, string> = {
  '1000PEPE': 'kPEPE',
  '1000PEPE2': 'kPEPE',
  '1000BONK': 'kBONK',
  '1000SHIB': 'kSHIB',
  '1000FLOKI': 'kFLOKI',
  '1000SATS': 'kSATS',
  '1000000MOG': 'MMOG',
  KPEPE: 'kPEPE',
  KBONK: 'kBONK',
  KSHIB: 'kSHIB',
  BONK: 'kBONK',
  PEPE: 'kPEPE',
  SHIB: 'kSHIB',
};

function normalizeAsset(name: string): string {
  const upper = name.toUpperCase();
  return ALIASES[upper] || ALIASES[name] || name;
}

type RateMap = Map<string, ExchangeRate>;

// ─── Extended ──────────────────────────────────────────────────────
// GET /api/v1/info/markets  (bulk, 1h funding interval)
// Proxied: /api/extended/v1/info/markets
export async function fetchExtended(): Promise<RateMap> {
  const map: RateMap = new Map();
  try {
    const res = await fetch('/api/extended/v1/info/markets');
    const json = await res.json();
    const data: Array<{
      assetName: string;
      active: boolean;
      marketStats: {
        fundingRate: string;
        nextFundingRate: number;
      };
    }> = json?.data ?? [];

    for (const m of data) {
      if (!m.active || !m.marketStats) continue;
      const rate = parseFloat(m.marketStats.fundingRate);
      if (isNaN(rate)) continue;
      const asset = normalizeAsset(m.assetName);
      map.set(asset, {
        rate: rate * 8760 * 100,              // decimal per 1h → annual %
        nextFundingTime: m.marketStats.nextFundingRate, // epoch ms
        intervalHours: 1,
      });
    }
  } catch (e) {
    console.error('Extended fetch error:', e);
  }
  return map;
}

// ─── Pacifica ──────────────────────────────────────────────────────
// GET /api/v1/info/prices  (bulk, 1h interval)
// Proxied: /api/pacifica/v1/info/prices
export async function fetchPacifica(): Promise<RateMap> {
  const map: RateMap = new Map();
  try {
    const res = await fetch('/api/pacifica/v1/info/prices');
    const json = await res.json();
    const data: Array<{
      symbol: string;
      funding: string;
      timestamp: number;
    }> = json?.data ?? [];

    for (const item of data) {
      const rate = parseFloat(item.funding);
      if (isNaN(rate)) continue;
      const asset = normalizeAsset(item.symbol);
      // Next funding = next hour boundary
      const now = item.timestamp || Date.now();
      const nextHour = Math.ceil(now / 3600000) * 3600000;
      map.set(asset, {
        rate: rate * 8760 * 100,  // decimal per 1h → annual %
        nextFundingTime: nextHour,
        intervalHours: 1,
      });
    }
  } catch (e) {
    console.error('Pacifica fetch error:', e);
  }
  return map;
}

// ─── Variational ───────────────────────────────────────────────────
// GET /metadata/stats  (bulk, funding_rate is annualized decimal)
// Proxied: /api/variational/metadata/stats
export async function fetchVariational(): Promise<RateMap> {
  const map: RateMap = new Map();
  try {
    const res = await fetch('/api/variational/metadata/stats');
    const json = await res.json();
    const listings: Array<{
      ticker: string;
      funding_rate: string;
      funding_interval_s: number;
    }> = json?.listings ?? [];

    for (const item of listings) {
      const rate = parseFloat(item.funding_rate);
      if (isNaN(rate)) continue;
      const asset = normalizeAsset(item.ticker);
      const intervalHours = (item.funding_interval_s || 28800) / 3600;
      // Compute next funding: next boundary aligned to interval
      const intervalMs = (item.funding_interval_s || 28800) * 1000;
      const now = Date.now();
      const nextFunding = Math.ceil(now / intervalMs) * intervalMs;
      map.set(asset, {
        rate: rate * 100,  // annualized decimal → annual %
        nextFundingTime: nextFunding,
        intervalHours,
      });
    }
  } catch (e) {
    console.error('Variational fetch error:', e);
  }
  return map;
}

// ─── EdgeX ─────────────────────────────────────────────────────────
// Need metadata first for contractId mapping, then per-contract funding
// Proxied: /api/edgex/v1/public/meta/getMetaData
//          /api/edgex/v1/public/funding/getFundingRatePage?contractId=X&size=1

interface EdgeXContract {
  contractId: string;
  contractName: string;
}

let edgexContractCache: Map<string, EdgeXContract> | null = null;

async function getEdgeXContracts(): Promise<Map<string, EdgeXContract>> {
  if (edgexContractCache) return edgexContractCache;
  const map = new Map<string, EdgeXContract>();
  try {
    const res = await fetch('/api/edgex/v1/public/meta/getMetaData');
    const json = await res.json();
    const contracts: Array<{
      contractId: string;
      contractName: string;
    }> = json?.data?.contractList ?? [];

    for (const c of contracts) {
      if (!c.contractName.endsWith('USD')) continue;
      const base = c.contractName.replace('USD', '');
      // Skip "2" suffix duplicates and TEMP contracts
      if (base.endsWith('2') || base.startsWith('TEMP')) continue;
      const asset = normalizeAsset(base);
      // Only keep first (primary) contract per asset
      if (!map.has(asset)) {
        map.set(asset, { contractId: c.contractId, contractName: c.contractName });
      }
    }
    edgexContractCache = map;
  } catch (e) {
    console.error('EdgeX metadata fetch error:', e);
  }
  return map;
}

export async function fetchEdgeX(assets: string[]): Promise<RateMap> {
  const map: RateMap = new Map();
  const contracts = await getEdgeXContracts();

  // Only fetch for assets we care about
  const toFetch = assets.filter(a => contracts.has(a));

  // Batch in groups of 10 to avoid too many parallel requests
  const BATCH_SIZE = 10;
  for (let i = 0; i < toFetch.length; i += BATCH_SIZE) {
    const batch = toFetch.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(async (asset) => {
      const contract = contracts.get(asset);
      if (!contract) return;
      try {
        const res = await fetch(
          `/api/edgex/v1/public/funding/getFundingRatePage?contractId=${contract.contractId}&size=1`
        );
        const json = await res.json();
        const item = json?.data?.dataList?.[0];
        if (!item) return;
        const rate = parseFloat(item.fundingRate);
        const intervalMin = parseInt(item.fundingRateIntervalMin, 10) || 240;
        if (isNaN(rate)) return;
        const periodsPerYear = (365 * 24 * 60) / intervalMin;
        const fundingTimeMs = parseInt(item.fundingTime, 10);
        const nextFunding = fundingTimeMs + intervalMin * 60 * 1000;
        map.set(asset, {
          rate: rate * periodsPerYear * 100,
          nextFundingTime: nextFunding,
          intervalHours: intervalMin / 60,
        });
      } catch (e) {
        console.error(`EdgeX fetch error for ${asset}:`, e);
      }
    }));
  }
  return map;
}

// ─── GRVT ──────────────────────────────────────────────────────────
// POST /full/v1/ticker  {"instrument":"X_USDT_Perp"}
// 8h funding interval, rate is % per 8h
// next_funding_time in nanoseconds
// Proxied: /api/grvt/full/v1/ticker

let grvtInstrumentCache: Map<string, string> | null = null;

async function getGRVTInstruments(): Promise<Map<string, string>> {
  if (grvtInstrumentCache) return grvtInstrumentCache;
  const map = new Map<string, string>();
  try {
    const res = await fetch('/api/grvt/full/v1/all_instruments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    const json = await res.json();
    const instruments: Array<{
      instrument: string;
      base: string;
      kind: string;
    }> = json?.result ?? [];

    for (const inst of instruments) {
      if (inst.kind !== 'PERPETUAL') continue;
      const asset = normalizeAsset(inst.base);
      if (!map.has(asset)) {
        map.set(asset, inst.instrument);
      }
    }
    grvtInstrumentCache = map;
  } catch (e) {
    console.error('GRVT instruments fetch error:', e);
  }
  return map;
}

export async function fetchGRVT(assets: string[]): Promise<RateMap> {
  const map: RateMap = new Map();
  const instruments = await getGRVTInstruments();

  const toFetch = assets.filter(a => instruments.has(a));

  const BATCH_SIZE = 10;
  for (let i = 0; i < toFetch.length; i += BATCH_SIZE) {
    const batch = toFetch.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(async (asset) => {
      const instrument = instruments.get(asset);
      if (!instrument) return;
      try {
        const res = await fetch('/api/grvt/full/v1/ticker', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ instrument }),
        });
        const json = await res.json();
        const r = json?.result;
        if (!r) return;
        const rate = parseFloat(r.funding_rate);
        if (isNaN(rate)) return;
        // next_funding_time is in nanoseconds
        const nextNs = parseInt(r.next_funding_time, 10);
        const nextMs = Math.floor(nextNs / 1_000_000);
        map.set(asset, {
          rate: rate * 1095,    // % per 8h → annual % (1095 = 365*3)
          nextFundingTime: nextMs,
          intervalHours: 8,
        });
      } catch (e) {
        console.error(`GRVT fetch error for ${asset}:`, e);
      }
    }));
  }
  return map;
}

// ─── Orchestrator ──────────────────────────────────────────────────
export async function fetchAllFundingRates(): Promise<{
  ratesByExchange: Record<string, RateMap>;
  allAssets: string[];
}> {
  // Phase 1: fetch bulk endpoints in parallel
  const [extended, pacifica, variational] = await Promise.all([
    fetchExtended(),
    fetchPacifica(),
    fetchVariational(),
  ]);

  // Build union of all assets
  const assetSet = new Set<string>();
  for (const m of [extended, pacifica, variational]) {
    for (const key of m.keys()) assetSet.add(key);
  }

  const allAssets = [...assetSet].sort();

  // Phase 2: fetch per-instrument endpoints only for known assets
  const [edgex, grvt] = await Promise.all([
    fetchEdgeX(allAssets),
    fetchGRVT(allAssets),
  ]);

  // Add any assets only on EdgeX/GRVT
  for (const m of [edgex, grvt]) {
    for (const key of m.keys()) assetSet.add(key);
  }

  return {
    ratesByExchange: {
      Extended: extended,
      EdgeX: edgex,
      Pacifica: pacifica,
      GRVT: grvt,
      Variational: variational,
    },
    allAssets: [...assetSet].sort(),
  };
}
