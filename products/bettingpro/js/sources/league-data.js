// js/sources/league-data.js

/**
 * League Data source — reads values from league/team dropdowns
 * and calculates team averages from cached match data.
 */

import { getCachedMatches, getCachedOdds, getCachedLeagues } from '../api-client.js';

export const name = 'League Data';

/**
 * Calculate time-decay weight for a match.
 * More recent matches get higher weight. Weight = exp(-ln2 * daysSince / halfLife).
 * @param {string} matchDate - ISO date string
 * @param {string} referenceDate - ISO date string (defaults to today)
 * @param {number} halfLife - Half-life in days (default 60)
 * @returns {number} Weight between 0 and 1
 */
function decayWeight(matchDate, referenceDate, halfLife) {
  const ref = new Date(referenceDate + 'T12:00:00');
  const match = new Date(matchDate + 'T12:00:00');
  const daysSince = Math.max(0, (ref - match) / (1000 * 60 * 60 * 24));
  return Math.exp(-Math.LN2 * daysSince / halfLife);
}

/**
 * Calculate team averages from match data with optional time-decay weighting.
 * Returns { homeScored, homeConceded, awayScored, awayConceded } per team.
 * @param {Array} matches - Finished matches
 * @param {Object} options - Optional: { halfLife: number, referenceDate: string }
 */
export function calculateTeamAverages(matches, options = {}) {
  if (matches.length === 0) return {};

  const { halfLife = 0, referenceDate } = options;
  const useDecay = halfLife > 0 && referenceDate;

  // Bayesian shrinkage: PRIOR_WEIGHT = number of "virtual games" at league average.
  const PRIOR_WEIGHT = 5;

  // Calculate weighted league average
  let totalWeightedGoals = 0;
  let totalWeight = 0;
  for (const m of matches) {
    const w = useDecay ? decayWeight(m.date, referenceDate, halfLife) : 1;
    totalWeightedGoals += (m.homeGoals + m.awayGoals) * w;
    totalWeight += w;
  }
  const leagueAvg = totalWeight > 0 ? totalWeightedGoals / totalWeight : 2.5;
  const avgPerTeam = leagueAvg / 2;

  const teams = {};
  for (const match of matches) {
    const w = useDecay ? decayWeight(match.date, referenceDate, halfLife) : 1;

    if (!teams[match.homeTeam]) {
      teams[match.homeTeam] = { hFor: [], hAgainst: [], aFor: [], aAgainst: [], hWeights: [], aWeights: [], hShots: [], hShotsAg: [], aShots: [], aShotsAg: [], hShotW: [], aShotW: [] };
    }
    teams[match.homeTeam].hFor.push(match.homeGoals);
    teams[match.homeTeam].hAgainst.push(match.awayGoals);
    teams[match.homeTeam].hWeights.push(w);
    if (match.stats?.homeShots !== undefined) {
      teams[match.homeTeam].hShots.push(match.stats.homeShots);
      teams[match.homeTeam].hShotsAg.push(match.stats.awayShots || 0);
      teams[match.homeTeam].hShotW.push(w);
    }

    if (!teams[match.awayTeam]) {
      teams[match.awayTeam] = { hFor: [], hAgainst: [], aFor: [], aAgainst: [], hWeights: [], aWeights: [], hShots: [], hShotsAg: [], aShots: [], aShotsAg: [], hShotW: [], aShotW: [] };
    }
    teams[match.awayTeam].aFor.push(match.awayGoals);
    teams[match.awayTeam].aAgainst.push(match.homeGoals);
    teams[match.awayTeam].aWeights.push(w);
    if (match.stats?.awayShots !== undefined) {
      teams[match.awayTeam].aShots.push(match.stats.awayShots);
      teams[match.awayTeam].aShotsAg.push(match.stats.homeShots || 0);
      teams[match.awayTeam].aShotW.push(w);
    }
  }

  const wSum = (arr, weights) => arr.reduce((s, v, i) => s + v * weights[i], 0);
  const wTotal = (weights) => weights.reduce((a, b) => a + b, 0);
  const wAvg = (arr, weights) => {
    const tw = wTotal(weights);
    return tw > 0 ? wSum(arr, weights) / tw : null;
  };

  // League-wide shot conversion rate for xG
  let lgGoals = 0, lgShots = 0;
  for (const m of matches) {
    if (m.stats?.homeShots !== undefined) {
      lgGoals += m.homeGoals + m.awayGoals;
      lgShots += m.stats.homeShots + (m.stats.awayShots || 0);
    }
  }
  const leagueConversion = lgShots > 0 ? lgGoals / lgShots : 0;

  const averages = {};
  for (const [team, data] of Object.entries(teams)) {
    const homeEffective = wTotal(data.hWeights);
    const awayEffective = wTotal(data.aWeights);
    const totalEffective = homeEffective + awayEffective;

    const rawHS = wAvg(data.hFor, data.hWeights);
    const rawHC = wAvg(data.hAgainst, data.hWeights);
    const rawAS = wAvg(data.aFor, data.aWeights);
    const rawAC = wAvg(data.aAgainst, data.aWeights);

    // Overall averages as fallback when team hasn't played at a venue
    const allWeights = [...data.hWeights, ...data.aWeights];
    const allScored = [...data.hFor, ...data.aFor];
    const allConceded = [...data.hAgainst, ...data.aAgainst];
    const overallScored = wAvg(allScored, allWeights) || avgPerTeam;
    const overallConceded = wAvg(allConceded, allWeights) || avgPerTeam;

    const hs = rawHS !== null ? rawHS : overallScored;
    const hc = rawHC !== null ? rawHC : overallConceded;
    const as = rawAS !== null ? rawAS : overallScored;
    const ac = rawAC !== null ? rawAC : overallConceded;

    // Shrink toward league average — effective sample size replaces raw count
    const w = totalEffective / (totalEffective + PRIOR_WEIGHT);

    let homeScored = w * hs + (1 - w) * avgPerTeam;
    let homeConceded = w * hc + (1 - w) * avgPerTeam;
    let awayScored = w * as + (1 - w) * avgPerTeam;
    let awayConceded = w * ac + (1 - w) * avgPerTeam;

    // Blend with xG from shots (30% weight) if enough data
    const shotMatches = data.hShotW.length + data.aShotW.length;
    if (leagueConversion > 0 && shotMatches >= 3) {
      const xgBlend = 0.3;
      if (data.hShotW.length > 0) {
        const xgHS = w * wAvg(data.hShots, data.hShotW) * leagueConversion + (1 - w) * avgPerTeam;
        const xgHC = w * wAvg(data.hShotsAg, data.hShotW) * leagueConversion + (1 - w) * avgPerTeam;
        homeScored = (1 - xgBlend) * homeScored + xgBlend * xgHS;
        homeConceded = (1 - xgBlend) * homeConceded + xgBlend * xgHC;
      }
      if (data.aShotW.length > 0) {
        const xgAS = w * wAvg(data.aShots, data.aShotW) * leagueConversion + (1 - w) * avgPerTeam;
        const xgAC = w * wAvg(data.aShotsAg, data.aShotW) * leagueConversion + (1 - w) * avgPerTeam;
        awayScored = (1 - xgBlend) * awayScored + xgBlend * xgAS;
        awayConceded = (1 - xgBlend) * awayConceded + xgBlend * xgAC;
      }
    }

    averages[team] = {
      team,
      played: data.hFor.length + data.aFor.length,
      homeScored, homeConceded, awayScored, awayConceded,
    };
  }

  return averages;
}

/**
 * Calculate league average goals per game.
 */
export function calculateLeagueAvg(matches, options = {}) {
  if (matches.length === 0) return 2.5;
  const { halfLife = 0, referenceDate } = options;
  const useDecay = halfLife > 0 && referenceDate;
  if (!useDecay) {
    const totalGoals = matches.reduce((sum, m) => sum + m.homeGoals + m.awayGoals, 0);
    return Math.max(0.1, totalGoals / matches.length);
  }
  let totalWeightedGoals = 0;
  let totalWeight = 0;
  for (const m of matches) {
    const w = decayWeight(m.date, referenceDate, halfLife);
    totalWeightedGoals += (m.homeGoals + m.awayGoals) * w;
    totalWeight += w;
  }
  return Math.max(0.1, totalWeight > 0 ? totalWeightedGoals / totalWeight : 2.5);
}

/**
 * Get team names from cached matches for a league.
 */
export function getTeamNames(leagueId, season) {
  const matches = getCachedMatches(leagueId, season);
  const teams = new Set();
  for (const m of matches) {
    teams.add(m.homeTeam);
    teams.add(m.awayTeam);
  }
  return [...teams].sort();
}

/**
 * Data source interface — getTeamStats.
 * Reads selected league/team from dropdowns, calculates averages from cached data.
 */
export function getTeamStats() {
  const leagueId = document.getElementById('league-select').value;
  const homeName = document.getElementById('home-team-select').value;
  const awayName = document.getElementById('away-team-select').value;

  const leagues = getCachedLeagues();
  const league = leagues.find(l => l.id === leagueId);
  const season = league ? league.season : 2026;

  const matches = getCachedMatches(leagueId, season);
  const averages = calculateTeamAverages(matches);
  const leagueAvg = calculateLeagueAvg(matches);

  const fallback = leagueAvg / 2;
  const homeStats = averages[homeName] || { homeScored: fallback, homeConceded: fallback };
  const awayStats = averages[awayName] || { awayScored: fallback, awayConceded: fallback };

  return {
    homeName,
    awayName,
    homeScored: homeStats.homeScored,
    homeConceded: homeStats.homeConceded,
    awayScored: awayStats.awayScored,
    awayConceded: awayStats.awayConceded,
    leagueAvg,
  };
}

/**
 * Data source interface — getOdds.
 * Tries to find Veikkaus odds for the selected matchup.
 * Falls back to manual input fields if no odds cached.
 */
export function getOdds() {
  const leagueId = document.getElementById('league-select').value;
  const homeName = document.getElementById('home-team-select').value;
  const awayName = document.getElementById('away-team-select').value;

  const odds = getCachedOdds(leagueId);

  // Try to find odds for this matchup (fuzzy: team name contains)
  const match = odds.find(o =>
    (o.homeTeam.includes(homeName) || homeName.includes(o.homeTeam)) &&
    (o.awayTeam.includes(awayName) || awayName.includes(o.awayTeam))
  );

  if (match) {
    return {
      home: match.home,
      draw: match.draw,
      away: match.away,
      overUnder: match.overUnder || {
        1.5: { over: 0, under: 0 },
        2.5: { over: 0, under: 0 },
        3.5: { over: 0, under: 0 },
      },
    };
  }

  // Fall back to manual odds inputs (user can still enter manually)
  return {
    home: parseFloat(document.getElementById('odds-home').value) || 0,
    draw: parseFloat(document.getElementById('odds-draw').value) || 0,
    away: parseFloat(document.getElementById('odds-away').value) || 0,
    overUnder: {
      1.5: {
        over: parseFloat(document.getElementById('ou-15-over').value) || 0,
        under: parseFloat(document.getElementById('ou-15-under').value) || 0,
      },
      2.5: {
        over: parseFloat(document.getElementById('ou-25-over').value) || 0,
        under: parseFloat(document.getElementById('ou-25-under').value) || 0,
      },
      3.5: {
        over: parseFloat(document.getElementById('ou-35-over').value) || 0,
        under: parseFloat(document.getElementById('ou-35-under').value) || 0,
      },
    },
  };
}

/**
 * Data source interface — getSettings.
 * Same as manual — reads sliders and bankroll from DOM.
 */
export function getSettings() {
  return {
    rho: parseFloat(document.getElementById('rho-slider').value),
    kellyFraction: parseFloat(document.getElementById('kelly-fraction-slider').value),
    bankroll: parseFloat(document.getElementById('bankroll').value) || 0,
  };
}
