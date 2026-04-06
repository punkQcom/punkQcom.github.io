// js/data-loader.js

/**
 * Loads shared data from static JSON files on punkq.com.
 * Falls back to localStorage if static files are unavailable.
 */

const DATA_BASE = 'https://punkq.com/products/bettingpro/data';
export const API_BASE = 'https://bettingpro-api.azurewebsites.net/api';
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
 * Load previous season matches for Elo carryover.
 * @param {string} leagueId
 * @param {number[]} seasons - Array of previous season years
 * @returns {Array} Combined array of all previous season matches
 */
export async function loadPreviousSeasons(leagueId, seasons) {
  const results = await Promise.all(seasons.map(async (season) => {
    const lsKey = `${leagueId}_${season}`;
    try {
      const matches = await fetchJSON(`${DATA_BASE}/${leagueId}-${season}-matches.json`);
      lsSet(`${lsKey}_matches`, matches);
      return matches;
    } catch {
      return lsGet(`${lsKey}_matches`) || [];
    }
  }));

  return results.flat();
}

/**
 * Load precomputed predictions for a league/season.
 * Returns { predictions, eloRatings, tracker, plSimulation } or null if unavailable.
 */
export async function loadPredictions(leagueId, season) {
  try {
    return await fetchJSON(`${DATA_BASE}/${leagueId}-${season}-predictions.json`);
  } catch {
    return null;
  }
}
