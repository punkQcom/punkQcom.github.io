/**
 * Season P/L Simulation — walk-forward betting simulation.
 * Uses same walk-forward approach as tracker, but tracks Kelly-staked bets.
 */

import { predictMatchPure, migrateOdds, getConsensusOdds } from './prediction.js?v=1775432597';
import { shinProbabilities } from './shin.js?v=1775432597';
import { kellyFraction } from './kelly.js?v=1775432597';

const MIN_TRAINING_MATCHES = 10;

/**
 * Simulate season P/L using walk-forward predictions and Kelly staking.
 * @param {Array} allMatches - All finished matches
 * @param {Object} options
 * @returns {{ bets: Array, cumulative: Array, summary: Object }}
 */
export function simulateSeasonPL(allMatches, options = {}) {
  const {
    rho = -0.13,
    modelTrustThreshold = 30,
    halfLife = 60,
    kellyFrac = 0.25,
    bankroll = 1000,
    initialEloRatings = {},
  } = options;

  const sorted = [...allMatches]
    .filter(m => m.homeGoals != null && m.awayGoals != null && m.date)
    .sort((a, b) => a.date.localeCompare(b.date));

  const bets = [];
  const cumulative = [];
  let runningPL = 0;
  let totalStaked = 0;
  let maxDrawdown = 0;
  let peakPL = 0;
  let wins = 0;

  for (let i = MIN_TRAINING_MATCHES; i < sorted.length; i++) {
    const match = sorted[i];
    const trainingData = sorted.slice(0, i);

    const matchOdds = migrateOdds(match.odds);
    if (!matchOdds) continue; // Skip matches without odds

    const consensus = getConsensusOdds(matchOdds);
    if (!consensus || !consensus.home || !consensus.draw || !consensus.away) continue;

    const pred = predictMatchPure(match.homeTeam, match.awayTeam, trainingData, {
      rho,
      modelTrustThreshold,
      consensusOdds: matchOdds,
      halfLife,
      referenceDate: match.date,
      initialEloRatings,
    });

    if (!pred) continue;

    // Get true probabilities from odds via Shin's method
    const bookProbs = shinProbabilities([consensus.home, consensus.draw, consensus.away]);

    // Check all 3 outcomes for value
    const outcomes = [
      { label: '1', prob: pred.home, bookProb: bookProbs[0], odds: consensus.home },
      { label: 'X', prob: pred.draw, bookProb: bookProbs[1], odds: consensus.draw },
      { label: '2', prob: pred.away, bookProb: bookProbs[2], odds: consensus.away },
    ];

    const actualResult = match.homeGoals > match.awayGoals ? '1'
      : match.homeGoals === match.awayGoals ? 'X' : '2';

    for (const outcome of outcomes) {
      const edge = outcome.prob - outcome.bookProb;
      if (edge <= 0) continue; // No value

      const kf = kellyFraction(outcome.prob, outcome.odds);
      if (kf <= 0) continue;

      const stake = kf * kellyFrac * bankroll;
      if (stake < 0.01) continue; // Skip negligible bets

      const won = outcome.label === actualResult;
      const profit = won ? stake * (outcome.odds - 1) : -stake;

      totalStaked += stake;
      runningPL += profit;
      if (won) wins++;

      if (runningPL > peakPL) peakPL = runningPL;
      const drawdown = peakPL - runningPL;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;

      bets.push({
        date: match.date,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        bet: outcome.label,
        odds: outcome.odds,
        stake,
        won,
        profit,
        runningPL,
      });

      cumulative.push(runningPL);
    }
  }

  return {
    bets,
    cumulative,
    summary: {
      totalBets: bets.length,
      wins,
      winRate: bets.length > 0 ? wins / bets.length : 0,
      totalPL: runningPL,
      totalStaked,
      roi: totalStaked > 0 ? (runningPL / totalStaked) * 100 : 0,
      maxDrawdown,
    },
  };
}

/**
 * Render P/L simulation into a container element.
 */
export function renderPLSimulation(plData, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const { bets, cumulative, summary } = plData;

  if (bets.length === 0) {
    container.innerHTML = '<p class="muted">No bets to simulate (need finished matches with odds)</p>';
    return;
  }

  // Summary cards
  const plClass = summary.totalPL >= 0 ? 'value-positive' : 'value-negative';
  const roiClass = summary.roi >= 0 ? 'value-positive' : 'value-negative';

  let html = '<div class="tracker-summary">';
  html += `<div class="tracker-stat">
    <div class="tracker-stat-value ${plClass}">${summary.totalPL >= 0 ? '+' : ''}${summary.totalPL.toFixed(2)}</div>
    <div class="tracker-stat-label">Total P/L</div>
  </div>`;
  html += `<div class="tracker-stat">
    <div class="tracker-stat-value ${roiClass}">${summary.roi >= 0 ? '+' : ''}${summary.roi.toFixed(1)}%</div>
    <div class="tracker-stat-label">ROI</div>
  </div>`;
  html += `<div class="tracker-stat">
    <div class="tracker-stat-value">${(summary.winRate * 100).toFixed(1)}%</div>
    <div class="tracker-stat-label">Win Rate (${summary.wins}/${summary.totalBets})</div>
  </div>`;
  html += `<div class="tracker-stat">
    <div class="tracker-stat-value value-negative">${summary.maxDrawdown.toFixed(2)}</div>
    <div class="tracker-stat-label">Max Drawdown</div>
  </div>`;
  html += '</div>';

  // CSS bar chart for cumulative P/L
  if (cumulative.length > 1) {
    const maxAbs = Math.max(...cumulative.map(Math.abs), 1);
    html += '<div class="pl-chart">';
    // Sample bars if too many (show max 60 bars)
    const step = Math.max(1, Math.floor(cumulative.length / 60));
    for (let i = 0; i < cumulative.length; i += step) {
      const val = cumulative[i];
      const heightPct = Math.abs(val) / maxAbs * 100;
      const cls = val >= 0 ? 'pl-bar-pos' : 'pl-bar-neg';
      html += `<div class="pl-bar ${cls}" style="height:${Math.max(2, heightPct)}%" title="Bet #${i + 1}: ${val >= 0 ? '+' : ''}${val.toFixed(2)}"></div>`;
    }
    html += '</div>';
  }

  // Last 20 bets table
  const recent = bets.slice(-20).reverse();
  html += '<table class="results-table tracker-table">';
  html += '<thead><tr><th>Date</th><th>Match</th><th>Bet</th><th>Odds</th><th>Stake</th><th>P/L</th></tr></thead>';
  html += '<tbody>';

  for (const b of recent) {
    const plCls = b.profit >= 0 ? 'value-positive' : 'value-negative';
    const sign = b.profit >= 0 ? '+' : '';
    html += `<tr>
      <td>${b.date}</td>
      <td>${b.homeTeam} - ${b.awayTeam}</td>
      <td>${b.bet}</td>
      <td>${b.odds.toFixed(2)}</td>
      <td>${b.stake.toFixed(2)}</td>
      <td class="${plCls}">${sign}${b.profit.toFixed(2)}</td>
    </tr>`;
  }

  html += '</tbody></table>';
  container.innerHTML = html;
}
