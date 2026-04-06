/**
 * Pure prediction module — no DOM access.
 * All prediction logic extracted from app.js for reuse in tracker, P/L sim, etc.
 */

import { expectedGoals, scoreMatrix } from './poisson.js?v=1775465644';
import { applyDixonColes } from './dixon-coles.js?v=1775465644';
import { shinProbabilities } from './shin.js?v=1775465644';
import { calculateEloRatings, eloToPoisson } from './elo.js?v=1775465644';
import { calculateTeamAverages, calculateLeagueAvg } from './sources/league-data.js?v=1775465644';

/**
 * Calculate outcomes (home/draw/away probabilities) from a score matrix.
 */
export function calculateOutcomes(matrix) {
  let home = 0, draw = 0, away = 0;
  for (let i = 0; i < matrix.length; i++) {
    for (let j = 0; j < matrix[i].length; j++) {
      if (i > j) home += matrix[i][j];
      else if (i === j) draw += matrix[i][j];
      else away += matrix[i][j];
    }
  }
  return { home, draw, away };
}

/**
 * Average implied probabilities across bookmakers, convert back to odds.
 */
export function getConsensusOdds(oddsObj) {
  const entries = Object.values(oddsObj);
  if (entries.length === 0) return null;

  function avgOdds(values) {
    const valid = values.filter(o => o > 0);
    if (valid.length === 0) return 0;
    const avgProb = valid.reduce((s, o) => s + 1 / o, 0) / valid.length;
    return avgProb > 0 ? 1 / avgProb : 0;
  }

  return {
    home: avgOdds(entries.map(b => b.home || 0)),
    draw: avgOdds(entries.map(b => b.draw || 0)),
    away: avgOdds(entries.map(b => b.away || 0)),
  };
}

/**
 * Migrate old flat odds { home, draw, away } to multi-bookmaker { veikkaus: {...} }.
 */
export function migrateOdds(odds) {
  if (!odds) return null;
  if (odds.home !== undefined && typeof odds.home === 'number') {
    return { veikkaus: { home: odds.home, draw: odds.draw, away: odds.away, overUnder: odds.overUnder || {} } };
  }
  return odds;
}

/**
 * Build a blended score matrix from Poisson model + Elo ratings (pure, no DOM).
 * @param {string} homeName
 * @param {string} awayName
 * @param {Array} matches - Finished matches for training
 * @param {number} leagueAvg - League average goals per game
 * @param {number} rho - Dixon-Coles correction parameter
 * @param {number} threshold - Model trust threshold
 * @param {Object} decayOptions - { halfLife, referenceDate }
 * @param {Object} initialEloRatings - Optional initial Elo ratings
 * @returns {number[][]} Score matrix
 */
export function buildBlendedMatrix(homeName, awayName, matches, leagueAvg, rho, threshold, decayOptions = {}, initialEloRatings = {}) {
  const averages = calculateTeamAverages(matches, decayOptions);
  const homeStats = averages[homeName] || { homeScored: leagueAvg / 2, homeConceded: leagueAvg / 2 };
  const awayStats = averages[awayName] || { awayScored: leagueAvg / 2, awayConceded: leagueAvg / 2 };

  // Poisson lambdas from team stats
  const poissonEg = expectedGoals(
    homeStats.homeScored, homeStats.homeConceded,
    awayStats.awayScored, awayStats.awayConceded,
    leagueAvg
  );

  // Elo lambdas from power ratings
  const eloRatings = calculateEloRatings(matches, initialEloRatings);
  const homeElo = eloRatings[homeName] || 1500;
  const awayElo = eloRatings[awayName] || 1500;
  const eloEg = eloToPoisson(homeElo, awayElo, leagueAvg);

  // Blend: early season → more Elo weight, late season → more Poisson weight
  const eloWeight = Math.max(0.2, 1 - matches.length / (matches.length + threshold));
  const lambdaHome = eloWeight * eloEg.lambdaHome + (1 - eloWeight) * poissonEg.lambdaHome;
  const lambdaAway = eloWeight * eloEg.lambdaAway + (1 - eloWeight) * poissonEg.lambdaAway;

  const rawMatrix = scoreMatrix(lambdaHome, lambdaAway, 7);
  return applyDixonColes(rawMatrix, lambdaHome, lambdaAway, rho);
}

/**
 * Blend model outcomes with odds-derived probabilities (pure, no DOM).
 * @param {Object} modelOutcomes - { home, draw, away }
 * @param {Object|null} oddsObj - Multi-bookmaker odds object
 * @param {number} matchCount - Number of matches played
 * @param {number} threshold - Model trust threshold
 * @returns {Object} Normalized { home, draw, away }
 */
export function blendWithOdds(modelOutcomes, oddsObj, matchCount, threshold) {
  if (!oddsObj) return modelOutcomes;

  const consensus = getConsensusOdds(oddsObj);
  if (!consensus || !consensus.home || !consensus.draw || !consensus.away) return modelOutcomes;

  const oddsProbs = shinProbabilities([consensus.home, consensus.draw, consensus.away]);
  if (!oddsProbs || oddsProbs.length !== 3) return modelOutcomes;

  const modelWeight = matchCount / (matchCount + threshold);
  const raw = {
    home: modelWeight * modelOutcomes.home + (1 - modelWeight) * oddsProbs[0],
    draw: modelWeight * modelOutcomes.draw + (1 - modelWeight) * oddsProbs[1],
    away: modelWeight * modelOutcomes.away + (1 - modelWeight) * oddsProbs[2],
  };
  const sum = raw.home + raw.draw + raw.away;
  return { home: raw.home / sum, draw: raw.draw / sum, away: raw.away / sum };
}

/**
 * Pure prediction function — no DOM access.
 * @param {string} homeName
 * @param {string} awayName
 * @param {Array} matches - Finished matches for training
 * @param {Object} options
 * @param {number} options.rho - Dixon-Coles rho (default -0.13)
 * @param {number} options.modelTrustThreshold - Trust threshold (default 30)
 * @param {Object|null} options.consensusOdds - Multi-bookmaker odds for this match
 * @param {number} options.halfLife - Time-decay half-life in days (0 = no decay)
 * @param {string} options.referenceDate - Reference date for time-decay
 * @param {Object} options.initialEloRatings - Initial Elo ratings
 * @returns {Object|null} { score, home, draw, away, matrix }
 */
export function predictMatchPure(homeName, awayName, matches, options = {}) {
  if (matches.length === 0) return null;

  const {
    rho = -0.13,
    modelTrustThreshold = 30,
    consensusOdds = null,
    halfLife = 0,
    referenceDate = null,
    initialEloRatings = {},
  } = options;

  const decayOptions = halfLife > 0 && referenceDate ? { halfLife, referenceDate } : {};
  const leagueAvg = calculateLeagueAvg(matches, decayOptions);

  const matrix = buildBlendedMatrix(homeName, awayName, matches, leagueAvg, rho, modelTrustThreshold, decayOptions, initialEloRatings);
  const modelOutcomes = calculateOutcomes(matrix);

  // Migrate odds if needed
  const oddsMulti = consensusOdds ? migrateOdds(consensusOdds) : null;
  const blended = blendWithOdds(modelOutcomes, oddsMulti, matches.length, modelTrustThreshold);

  // Rescale matrix cells to match blended 1X2 ratios, then pick best score
  const homeScale = modelOutcomes.home > 0 ? blended.home / modelOutcomes.home : 1;
  const drawScale = modelOutcomes.draw > 0 ? blended.draw / modelOutcomes.draw : 1;
  const awayScale = modelOutcomes.away > 0 ? blended.away / modelOutcomes.away : 1;

  // Pick best score consistent with the predicted outcome category
  const predictedOutcome = blended.home >= blended.draw && blended.home >= blended.away ? 'home'
    : blended.away >= blended.home && blended.away >= blended.draw ? 'away' : 'draw';

  let bestScore = { home: 0, away: 0, prob: 0 };
  const displayMatrix = matrix.map((row, i) =>
    row.map((cell, j) => {
      const scale = i > j ? homeScale : i === j ? drawScale : awayScale;
      const adjusted = cell * scale;
      const cellOutcome = i > j ? 'home' : i === j ? 'draw' : 'away';
      if (cellOutcome === predictedOutcome && adjusted > bestScore.prob) {
        bestScore = { home: i, away: j, prob: adjusted };
      }
      return adjusted;
    })
  );

  return {
    score: `${bestScore.home}-${bestScore.away}`,
    home: blended.home,
    draw: blended.draw,
    away: blended.away,
    matrix: displayMatrix,
  };
}
