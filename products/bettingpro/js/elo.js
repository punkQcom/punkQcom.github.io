/**
 * Elo rating system for football match prediction.
 */

const DEFAULT_RATING = 1500;
const K_FACTOR = 32;
const HOME_ADVANTAGE = 50;

/**
 * Calculate expected score (probability of winning) for team A vs team B.
 */
export function eloExpectedScore(ratingA, ratingB) {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

/**
 * Calculate Elo ratings from a list of finished matches.
 * Processes matches in chronological order.
 * @param {Array} matches - Finished matches with homeTeam, awayTeam, homeGoals, awayGoals, date
 * @param {Object} initialRatings - Optional starting ratings { teamName: rating }
 * @returns {Object} { teamName: rating }
 */
export function calculateEloRatings(matches, initialRatings = {}) {
  const ratings = { ...initialRatings };

  const sorted = [...matches]
    .filter(m => m.homeGoals != null && m.awayGoals != null)
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  for (const m of sorted) {
    const homeR = (ratings[m.homeTeam] || DEFAULT_RATING) + HOME_ADVANTAGE;
    const awayR = ratings[m.awayTeam] || DEFAULT_RATING;

    const expectedHome = eloExpectedScore(homeR, awayR);
    const expectedAway = 1 - expectedHome;

    // Actual result: 1 = win, 0.5 = draw, 0 = loss
    let actualHome, actualAway;
    if (m.homeGoals > m.awayGoals) {
      actualHome = 1; actualAway = 0;
    } else if (m.homeGoals === m.awayGoals) {
      actualHome = 0.5; actualAway = 0.5;
    } else {
      actualHome = 0; actualAway = 1;
    }

    // Update ratings (without home advantage bonus in stored rating)
    ratings[m.homeTeam] = (ratings[m.homeTeam] || DEFAULT_RATING) + K_FACTOR * (actualHome - expectedHome);
    ratings[m.awayTeam] = (ratings[m.awayTeam] || DEFAULT_RATING) + K_FACTOR * (actualAway - expectedAway);
  }

  return ratings;
}

/**
 * Convert Elo ratings to Poisson lambda values.
 * Maps the Elo advantage into expected goals using the league average.
 * @param {number} homeElo - Home team Elo rating
 * @param {number} awayElo - Away team Elo rating
 * @param {number} leagueAvg - Average total goals per game in league
 * @returns {{ lambdaHome: number, lambdaAway: number }}
 */
export function eloToPoisson(homeElo, awayElo, leagueAvg) {
  const avgPerTeam = leagueAvg / 2;

  // Expected score with home advantage
  const homeExpected = eloExpectedScore(homeElo + HOME_ADVANTAGE, awayElo);

  // Map win probability to goal ratio
  // A team expected to win 60% scores proportionally more than avg
  // Scale factor: ratio of expected score to 0.5 (neutral)
  const homeScale = homeExpected / 0.5;
  const awayScale = (1 - homeExpected) / 0.5;

  return {
    lambdaHome: avgPerTeam * homeScale,
    lambdaAway: avgPerTeam * awayScale,
  };
}
