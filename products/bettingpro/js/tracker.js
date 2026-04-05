/**
 * Prediction Tracker — walk-forward evaluation of prediction accuracy.
 * Uses only past data to predict each match (no future data leakage).
 */

import { predictMatchPure } from './prediction.js?v=1775432197';

const MIN_TRAINING_MATCHES = 10;

/**
 * Generate walk-forward prediction tracker.
 * @param {Array} allMatches - All finished matches
 * @param {Object} options - { rho, modelTrustThreshold, halfLife, initialEloRatings }
 * @returns {{ records: Array, summary: Object }}
 */
export function generatePredictionTracker(allMatches, options = {}) {
  const {
    rho = -0.13,
    modelTrustThreshold = 30,
    halfLife = 60,
    initialEloRatings = {},
  } = options;

  const sorted = [...allMatches]
    .filter(m => m.homeGoals != null && m.awayGoals != null && m.date)
    .sort((a, b) => a.date.localeCompare(b.date));

  const records = [];
  let correct1x2 = 0;
  let correctScore = 0;
  let totalBrier = 0;

  for (let i = MIN_TRAINING_MATCHES; i < sorted.length; i++) {
    const match = sorted[i];
    const trainingData = sorted.slice(0, i);

    const pred = predictMatchPure(match.homeTeam, match.awayTeam, trainingData, {
      rho,
      modelTrustThreshold,
      consensusOdds: match.odds || null,
      halfLife,
      referenceDate: match.date,
      initialEloRatings,
    });

    if (!pred) continue;

    // Actual result
    const actualResult = match.homeGoals > match.awayGoals ? '1'
      : match.homeGoals === match.awayGoals ? 'X' : '2';
    const actualScore = `${match.homeGoals}-${match.awayGoals}`;

    // Predicted result
    const predResult = pred.home > pred.draw && pred.home > pred.away ? '1'
      : pred.away > pred.home && pred.away > pred.draw ? '2' : 'X';

    const is1x2Correct = predResult === actualResult;
    const isScoreCorrect = pred.score === actualScore;

    // Brier score: sum of (predicted_prob - actual_indicator)^2 for each outcome
    const actualVec = [
      actualResult === '1' ? 1 : 0,
      actualResult === 'X' ? 1 : 0,
      actualResult === '2' ? 1 : 0,
    ];
    const brier = Math.pow(pred.home - actualVec[0], 2)
      + Math.pow(pred.draw - actualVec[1], 2)
      + Math.pow(pred.away - actualVec[2], 2);

    if (is1x2Correct) correct1x2++;
    if (isScoreCorrect) correctScore++;
    totalBrier += brier;

    records.push({
      date: match.date,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      predScore: pred.score,
      predResult,
      predHome: pred.home,
      predDraw: pred.draw,
      predAway: pred.away,
      actualScore,
      actualResult,
      is1x2Correct,
      isScoreCorrect,
      brier,
    });
  }

  const n = records.length;
  return {
    records,
    summary: {
      total: n,
      accuracy1x2: n > 0 ? correct1x2 / n : 0,
      accuracyScore: n > 0 ? correctScore / n : 0,
      avgBrierScore: n > 0 ? totalBrier / n : 0,
      correct1x2,
      correctScore,
    },
  };
}

/**
 * Render prediction tracker into a container element.
 */
export function renderTracker(trackerData, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const { records, summary } = trackerData;

  if (records.length === 0) {
    container.innerHTML = '<p class="muted">Not enough matches for prediction tracking (need 10+ finished matches)</p>';
    return;
  }

  // Summary cards
  let html = '<div class="tracker-summary">';
  html += `<div class="tracker-stat">
    <div class="tracker-stat-value">${(summary.accuracy1x2 * 100).toFixed(1)}%</div>
    <div class="tracker-stat-label">1X2 Accuracy (${summary.correct1x2}/${summary.total})</div>
  </div>`;
  html += `<div class="tracker-stat">
    <div class="tracker-stat-value">${(summary.accuracyScore * 100).toFixed(1)}%</div>
    <div class="tracker-stat-label">Exact Score (${summary.correctScore}/${summary.total})</div>
  </div>`;
  html += `<div class="tracker-stat">
    <div class="tracker-stat-value">${summary.avgBrierScore.toFixed(3)}</div>
    <div class="tracker-stat-label">Avg Brier Score</div>
  </div>`;
  html += '</div>';

  // Last 20 predictions table
  const recent = records.slice(-20).reverse();
  html += '<table class="results-table tracker-table">';
  html += '<thead><tr><th>Date</th><th>Match</th><th>Pred</th><th>Actual</th><th>1X2</th><th>Score</th></tr></thead>';
  html += '<tbody>';

  for (const r of recent) {
    const ok1x2 = r.is1x2Correct ? '<span class="value-positive">OK</span>' : '<span class="value-negative">X</span>';
    const okScore = r.isScoreCorrect ? '<span class="value-positive">OK</span>' : '<span class="value-negative">X</span>';
    html += `<tr>
      <td>${r.date}</td>
      <td>${r.homeTeam} - ${r.awayTeam}</td>
      <td>${r.predScore}</td>
      <td>${r.actualScore}</td>
      <td>${ok1x2}</td>
      <td>${okScore}</td>
    </tr>`;
  }

  html += '</tbody></table>';
  container.innerHTML = html;
}
