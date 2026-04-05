// js/sources/league-data.js

/**
 * League Data source — reads values from league/team dropdowns
 * and calculates team averages from cached match data.
 */

import { getCachedMatches, getCachedOdds, getCachedLeagues } from '../api-client.js';

export const name = 'League Data';

/**
 * Calculate team averages from match data.
 * Returns { homeScored, homeConceded, awayScored, awayConceded } per team.
 */
export function calculateTeamAverages(matches) {
  const teams = {};

  for (const match of matches) {
    // Home team stats
    if (!teams[match.homeTeam]) {
      teams[match.homeTeam] = { homeGoalsFor: [], homeGoalsAgainst: [], awayGoalsFor: [], awayGoalsAgainst: [] };
    }
    teams[match.homeTeam].homeGoalsFor.push(match.homeGoals);
    teams[match.homeTeam].homeGoalsAgainst.push(match.awayGoals);

    // Away team stats
    if (!teams[match.awayTeam]) {
      teams[match.awayTeam] = { homeGoalsFor: [], homeGoalsAgainst: [], awayGoalsFor: [], awayGoalsAgainst: [] };
    }
    teams[match.awayTeam].awayGoalsFor.push(match.awayGoals);
    teams[match.awayTeam].awayGoalsAgainst.push(match.homeGoals);
  }

  const averages = {};
  for (const [team, data] of Object.entries(teams)) {
    const avg = arr => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    averages[team] = {
      team,
      played: data.homeGoalsFor.length + data.awayGoalsFor.length,
      homeScored: avg(data.homeGoalsFor),
      homeConceded: avg(data.homeGoalsAgainst),
      awayScored: avg(data.awayGoalsFor),
      awayConceded: avg(data.awayGoalsAgainst),
    };
  }

  return averages;
}

/**
 * Calculate league average goals per game.
 */
export function calculateLeagueAvg(matches) {
  if (matches.length === 0) return 2.5;
  const totalGoals = matches.reduce((sum, m) => sum + m.homeGoals + m.awayGoals, 0);
  return totalGoals / matches.length;
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

  const homeStats = averages[homeName] || { homeScored: 0, homeConceded: 0 };
  const awayStats = averages[awayName] || { awayScored: 0, awayConceded: 0 };

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
