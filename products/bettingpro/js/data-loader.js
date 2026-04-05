// js/data-loader.js

/**
 * Loads shared data from static JSON files on punkq.com.
 * Falls back to localStorage if static files are unavailable.
 */

const DATA_BASE = 'https://punkq.com/products/bettingpro/data';
const API_BASE = 'https://bettingpro-api.azurewebsites.net/api';
const STALE_MS = 6 * 60 * 60 * 1000; // 6 hours

// localStorage fallback keys
const LS_PREFIX = 'bettingpro_';

function lsGet(key) {
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function lsSet(key, data) {
  try {
    localStorage.setItem(LS_PREFIX + key, JSON.stringify(data));
  } catch {
    // localStorage full or unavailable — ignore
  }
}

/**
 * Fetch JSON with cache-busting to avoid stale CDN/browser cache.
 */
async function fetchJSON(url) {
  const res = await fetch(`${url}?t=${Date.now()}`);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.json();
}

/**
 * Load meta.json — returns { lastUpdate, leagues, isFresh }.
 * isFresh is true if lastUpdate is less than 6 hours ago.
 */
export async function loadMeta() {
  try {
    const meta = await fetchJSON(`${DATA_BASE}/meta.json`);
    const age = Date.now() - new Date(meta.lastUpdate).getTime();
    lsSet('meta', meta);
    return { ...meta, isFresh: age < STALE_MS };
  } catch {
    // Fall back to localStorage
    const cached = lsGet('meta');
    if (cached) {
      const age = Date.now() - new Date(cached.lastUpdate).getTime();
      return { ...cached, isFresh: age < STALE_MS };
    }
    return { lastUpdate: null, leagues: [], isFresh: false };
  }
}

/**
 * Load all data files for a league/season.
 * Returns { matches, upcoming, odds }.
 */
export async function loadLeagueData(leagueId, season) {
  const prefix = `${DATA_BASE}/${leagueId}-${season}`;
  const lsKey = `${leagueId}_${season}`;

  try {
    const [matches, upcoming, odds] = await Promise.all([
      fetchJSON(`${prefix}-matches.json`),
      fetchJSON(`${prefix}-upcoming.json`),
      fetchJSON(`${prefix}-odds.json`),
    ]);

    // Cache in localStorage as fallback
    lsSet(`${lsKey}_matches`, matches);
    lsSet(`${lsKey}_upcoming`, upcoming);
    lsSet(`${lsKey}_odds`, odds);

    return { matches, upcoming, odds };
  } catch {
    // Fall back to localStorage
    return {
      matches: lsGet(`${lsKey}_matches`) || [],
      upcoming: lsGet(`${lsKey}_upcoming`) || [],
      odds: lsGet(`${lsKey}_odds`) || [],
    };
  }
}

/**
 * Trigger a full data update via the Azure backend.
 * Returns the fresh data directly from the response.
 */
export async function triggerUpdate(leagueId) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

  let res;
  try {
    res = await fetch(`${API_BASE}/update-data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ league: leagueId }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') throw new Error('Update timed out — try again later');
    throw err;
  }
  clearTimeout(timeout);

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || `Update failed: ${res.status}`);
  }

  const data = await res.json();

  // Cache locally
  const lsKey = `${leagueId}_${data.season}`;
  lsSet(`${lsKey}_matches`, data.matches);
  lsSet(`${lsKey}_upcoming`, data.upcoming);
  lsSet(`${lsKey}_odds`, data.odds);
  lsSet('meta', data.meta);

  return data;
}
