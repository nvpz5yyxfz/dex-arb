import type { ExchangeRate, ExchangeName } from '../types';

// ─── Alias normalization ───────────────────────────────────────────
const ALIASES: Record<string, string> = {
  '1000PEPE': 'kPEPE', '1000PEPE2': 'kPEPE',
  '1000BONK': 'kBONK', '1000SHIB': 'kSHIB',
  '1000FLOKI': 'kFLOKI', '1000SATS': 'kSATS', '1000000MOG': 'MMOG',
  KPEPE: 'kPEPE', KBONK: 'kBONK', KSHIB: 'kSHIB',
  BONK: 'kBONK', PEPE: 'kPEPE', SHIB: 'kSHIB',
};

function normalizeAsset(name: string): string {
  const upper = name.toUpperCase();
  return ALIASES[upper] || ALIASES[name] || name;
}

type RateMap = Map<string, ExchangeRate>;

// ─── Extended ──────────────────────────────────────────────────────
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
        openInterest: string;
      };
    }> = json?.data ?? [];

    for (const m of data) {
      if (!m.active || !m.marketStats) continue;
      const rate = parseFloat(m.marketStats.fundingRate);
      if (isNaN(rate)) continue;
      const asset = normalizeAsset(m.assetName);
      const oi = parseFloat(m.marketStats.openInterest) || 0;
      map.set(asset, {
        rate: rate * 8760 * 100,
        nextFundingTime: m.marketStats.nextFundingRate,
        intervalHours: 1,
        openInterest: oi,
      });
    }
  } catch (e) { console.error('Extended fetch error:', e); }
  return map;
}

// ─── Pacifica ──────────────────────────────────────────────────────
export async function fetchPacifica(): Promise<RateMap> {
  const map: RateMap = new Map();
  try {
    const res = await fetch('/api/pacifica/v1/info/prices');
    const json = await res.json();
    const data: Array<{
      symbol: string;
      funding: string;
      timestamp: number;
      open_interest: string;
      mark: string;
    }> = json?.data ?? [];

    for (const item of data) {
      const rate = parseFloat(item.funding);
      if (isNaN(rate)) continue;
      const asset = normalizeAsset(item.symbol);
      const now = item.timestamp || Date.now();
      const nextHour = Math.ceil(now / 3600000) * 3600000;
      // OI is in base units, multiply by mark price for USD
      const oiBase = parseFloat(item.open_interest) || 0;
      const mark = parseFloat(item.mark) || 0;
      map.set(asset, {
        rate: rate * 8760 * 100,
        nextFundingTime: nextHour,
        intervalHours: 1,
        openInterest: oiBase * mark,
      });
    }
  } catch (e) { console.error('Pacifica fetch error:', e); }
  return map;
}

// ─── Variational ───────────────────────────────────────────────────
export async function fetchVariational(): Promise<RateMap> {
  const map: RateMap = new Map();
  try {
    const res = await fetch('/api/variational/metadata/stats');
    const json = await res.json();
    const listings: Array<{
      ticker: string;
      funding_rate: string;
      funding_interval_s: number;
      mark_price: string;
      open_interest: { long_open_interest: string; short_open_interest: string };
    }> = json?.listings ?? [];

    for (const item of listings) {
      const rate = parseFloat(item.funding_rate);
      if (isNaN(rate)) continue;
      const asset = normalizeAsset(item.ticker);
      const intervalS = item.funding_interval_s || 28800;
      const intervalHours = intervalS / 3600;
      const intervalMs = intervalS * 1000;
      const now = Date.now();
      const nextFunding = Math.ceil(now / intervalMs) * intervalMs;
      const longOI = parseFloat(item.open_interest?.long_open_interest) || 0;
      const shortOI = parseFloat(item.open_interest?.short_open_interest) || 0;
      const markPrice = parseFloat(item.mark_price) || 0;
      map.set(asset, {
        rate: rate * 100, // annualized decimal → %
        nextFundingTime: nextFunding,
        intervalHours,
        openInterest: (longOI + shortOI) * markPrice,
      });
    }
  } catch (e) { console.error('Variational fetch error:', e); }
  return map;
}

// ─── EdgeX ─────────────────────────────────────────────────────────
interface EdgeXContract {
  contractId: string;
  contractName: string;
  intervalMin: number;
}

let edgexContractCache: Map<string, EdgeXContract> | null = null;

async function getEdgeXContracts(): Promise<Map<string, EdgeXContract>> {
  if (edgexContractCache) return edgexContractCache;
  const map = new Map<string, EdgeXContract>();
  try {
    const res = await fetch('/api/edgex/v1/public/meta/getMetaData');
    const json = await res.json();
    const contracts = json?.data?.contractList ?? [];

    for (const c of contracts) {
      // Only use enabled, displayed, non-TEMP, non-"2" contracts
      if (!c.enableTrade || !c.enableDisplay) continue;
      if (!c.contractName?.endsWith('USD')) continue;
      const base = c.contractName.replace('USD', '');
      if (base.endsWith('2') || base.startsWith('TEMP')) continue;
      const asset = normalizeAsset(base);
      if (!map.has(asset)) {
        map.set(asset, {
          contractId: c.contractId,
          contractName: c.contractName,
          intervalMin: parseInt(c.fundingRateIntervalMin, 10) || 240,
        });
      }
    }
    edgexContractCache = map;
  } catch (e) { console.error('EdgeX metadata fetch error:', e); }
  return map;
}

export async function fetchEdgeX(assets: string[]): Promise<RateMap> {
  const map: RateMap = new Map();
  const contracts = await getEdgeXContracts();
  const toFetch = assets.filter(a => contracts.has(a));

  const BATCH = 15;
  for (let i = 0; i < toFetch.length; i += BATCH) {
    const batch = toFetch.slice(i, i + BATCH);
    await Promise.all(batch.map(async (asset) => {
      const contract = contracts.get(asset)!;
      try {
        const res = await fetch(
          `/api/edgex/v1/public/funding/getFundingRatePage?contractId=${contract.contractId}&size=1`
        );
        const json = await res.json();
        const item = json?.data?.dataList?.[0];
        if (!item) return;
        const rate = parseFloat(item.fundingRate);
        if (isNaN(rate)) return;
        const intervalMin = contract.intervalMin;
        const periodsPerYear = (365 * 24 * 60) / intervalMin;
        const fundingTimeMs = parseInt(item.fundingTime, 10);
        const nextFunding = fundingTimeMs + intervalMin * 60 * 1000;
        map.set(asset, {
          rate: rate * periodsPerYear * 100,
          nextFundingTime: nextFunding,
          intervalHours: intervalMin / 60,
          openInterest: 0, // EdgeX doesn't provide OI in funding endpoint
        });
      } catch (e) { console.error(`EdgeX ${asset}:`, e); }
    }));
  }
  return map;
}

// ─── GRVT ──────────────────────────────────────────────────────────
// Store instrument name AND its funding_interval_hours from all_instruments
interface GRVTInstrument {
  name: string;
  fundingIntervalHours: number;
}

let grvtInstrumentCache: Map<string, GRVTInstrument> | null = null;

async function getGRVTInstruments(): Promise<Map<string, GRVTInstrument>> {
  if (grvtInstrumentCache) return grvtInstrumentCache;
  const map = new Map<string, GRVTInstrument>();
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
      funding_interval_hours: number;
    }> = json?.result ?? [];

    for (const inst of instruments) {
      if (inst.kind !== 'PERPETUAL') continue;
      const asset = normalizeAsset(inst.base);
      if (!map.has(asset)) {
        map.set(asset, {
          name: inst.instrument,
          fundingIntervalHours: inst.funding_interval_hours || 8,
        });
      }
    }
    grvtInstrumentCache = map;
  } catch (e) { console.error('GRVT instruments fetch error:', e); }
  return map;
}

export async function fetchGRVT(assets: string[]): Promise<RateMap> {
  const map: RateMap = new Map();
  const instruments = await getGRVTInstruments();
  const toFetch = assets.filter(a => instruments.has(a));

  const BATCH = 15;
  for (let i = 0; i < toFetch.length; i += BATCH) {
    const batch = toFetch.slice(i, i + BATCH);
    await Promise.all(batch.map(async (asset) => {
      const inst = instruments.get(asset)!;
      try {
        const res = await fetch('/api/grvt/full/v1/ticker', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ instrument: inst.name }),
        });
        const json = await res.json();
        const r = json?.result;
        if (!r) return;
        const rate = parseFloat(r.funding_rate);
        if (isNaN(rate)) return;
        const nextNs = parseInt(r.next_funding_time, 10);
        const nextMs = Math.floor(nextNs / 1_000_000);
        // Use per-instrument interval, not hardcoded 8h
        const intervalH = inst.fundingIntervalHours;
        const periodsPerYear = (365 * 24) / intervalH;
        const oi = parseFloat(r.open_interest) || 0;
        const mark = parseFloat(r.mark_price) || 0;
        map.set(asset, {
          rate: rate * periodsPerYear,   // % per interval → annual %
          nextFundingTime: nextMs,
          intervalHours: intervalH,
          openInterest: oi * mark,
        });
      } catch (e) { console.error(`GRVT ${asset}:`, e); }
    }));
  }
  return map;
}

// ─── Orchestrator ──────────────────────────────────────────────────
export async function fetchAllFundingRates(
  enabledExchanges: Set<ExchangeName>,
): Promise<{
  ratesByExchange: Partial<Record<ExchangeName, RateMap>>;
  allAssets: string[];
}> {
  const results: Partial<Record<ExchangeName, RateMap>> = {};

  // Phase 1: fetch enabled bulk endpoints in parallel
  const bulkFetchers: Promise<void>[] = [];

  if (enabledExchanges.has('Extended'))
    bulkFetchers.push(fetchExtended().then(m => { results.Extended = m; }));
  if (enabledExchanges.has('Pacifica'))
    bulkFetchers.push(fetchPacifica().then(m => { results.Pacifica = m; }));
  if (enabledExchanges.has('Variational'))
    bulkFetchers.push(fetchVariational().then(m => { results.Variational = m; }));

  await Promise.all(bulkFetchers);

  // Build union of all assets from bulk results
  const assetSet = new Set<string>();
  for (const m of Object.values(results)) {
    if (m) for (const key of m.keys()) assetSet.add(key);
  }
  const allAssets = [...assetSet].sort();

  // Phase 2: fetch per-instrument endpoints for known assets
  const perAssetFetchers: Promise<void>[] = [];
  if (enabledExchanges.has('EdgeX'))
    perAssetFetchers.push(fetchEdgeX(allAssets).then(m => { results.EdgeX = m; }));
  if (enabledExchanges.has('GRVT'))
    perAssetFetchers.push(fetchGRVT(allAssets).then(m => { results.GRVT = m; }));

  await Promise.all(perAssetFetchers);

  // Extend asset set with per-instrument results
  for (const m of Object.values(results)) {
    if (m) for (const key of m.keys()) assetSet.add(key);
  }

  return {
    ratesByExchange: results,
    allAssets: [...assetSet].sort(),
  };
}
