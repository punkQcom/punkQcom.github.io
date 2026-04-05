// js/api-client.js

/**
 * API client for BettingPro Azure Functions backend.
 * Handles HTTP calls and localStorage caching.
 */

const API_BASE = 'https://bettingpro-api.azurewebsites.net/api';

// localStorage keys
const KEYS = {
  leagues: 'bettingpro_leagues',
  matches: (leagueId, season) => `bettingpro_matches_${leagueId}_${season}`,
  odds: (leagueId) => `bettingpro_odds_${leagueId}`,
  upcoming: (leagueId) => `bettingpro_upcoming_${leagueId}`,
  lastUpdate: 'bettingpro_last_update',
};

function loadJSON(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveJSON(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

/**
 * Fetch available leagues from backend.
 * Caches result in localStorage.
 */
export async function fetchLeagues() {
  const res = await fetch(`${API_BASE}/leagues`);
  if (!res.ok) throw new Error(`Failed to fetch leagues: ${res.status}`);
  const leagues = await res.json();
  saveJSON(KEYS.leagues, leagues);
  return leagues;
}

/**
 * Get cached leagues from localStorage.
 */
export function getCachedLeagues() {
  return loadJSON(KEYS.leagues) || [];
}

/**
 * Fetch match results for a league. Only fetches stats for new matches.
 * Merges new matches into existing cache.
 */
export async function fetchResults(leagueId, season) {
  const cacheKey = KEYS.matches(leagueId, season);
  const existing = loadJSON(cacheKey) || [];
  const knownIds = existing.map(m => m.id);

  const res = await fetch(`${API_BASE}/fetch-results`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ league: leagueId, season, knownFixtureIds: knownIds }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || `Failed to fetch results: ${res.status}`);
  }

  const data = await res.json();

  // Merge new matches into cache
  const merged = [...existing, ...data.newMatches];
  saveJSON(cacheKey, merged);
  saveJSON(KEYS.lastUpdate, new Date().toISOString());

  // Cache upcoming fixtures if returned
  if (data.upcoming) {
    saveJSON(KEYS.upcoming(leagueId), data.upcoming);
  }

  return {
    matches: merged,
    newCount: data.newMatches.length,
    totalCount: data.totalMatches,
    requestsUsed: data.requestsUsed,
  };
}

/**
 * Fetch odds for a league from Veikkaus.
 */
export async function fetchOdds(leagueId) {
  const res = await fetch(`${API_BASE}/fetch-odds`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ league: leagueId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || `Failed to fetch odds: ${res.status}`);
  }

  const data = await res.json();

  // Cache odds
  saveJSON(KEYS.odds(leagueId), data.odds);
  saveJSON(KEYS.lastUpdate, new Date().toISOString());

  return data.odds;
}

/**
 * Get cached matches from localStorage.
 */
export function getCachedMatches(leagueId, season) {
  return loadJSON(KEYS.matches(leagueId, season)) || [];
}

/**
 * Get cached odds from localStorage.
 */
export function getCachedOdds(leagueId) {
  return loadJSON(KEYS.odds(leagueId)) || [];
}

/**
 * Get cached upcoming fixtures from localStorage.
 */
export function getCachedUpcoming(leagueId) {
  return loadJSON(KEYS.upcoming(leagueId)) || [];
}

/**
 * Get last update timestamp.
 */
export function getLastUpdate() {
  return localStorage.getItem(KEYS.lastUpdate) || null;
}
