/**
 * Main controller — wires inputs to math modules to UI rendering.
 */

import { expectedGoals, scoreMatrix } from './poisson.js';
import { applyDixonColes } from './dixon-coles.js';
import { removeMargin, impliedProbability } from './odds.js';
import { calculateEdge, kellyFraction, kellyStake } from './kelly.js';
import * as manualSource from './sources/manual.js';
import * as leagueDataSource from './sources/league-data.js';
import {
  fetchLeagues, fetchResults, fetchOdds,
  getCachedLeagues, getLastUpdate, getCachedOdds, getCachedUpcoming,
} from './api-client.js';
import { getTeamNames } from './sources/league-data.js';
import {
  showResults, renderScoreMatrix, renderMatchOutcome,
  renderOverUnder, renderValueBets, renderAllBets, renderMargin, setupSliders
} from './ui.js';

// Active data source — switches between manual and league-data
let activeSource = manualSource;

function setActiveSource(sourceId) {
  const manualSection = document.getElementById('manual-stats-section');
  const leagueSection = document.getElementById('league-team-section');

  if (sourceId === 'league-data') {
    activeSource = leagueDataSource;
    manualSection.classList.add('hidden');
    leagueSection.classList.remove('hidden');
    populateLeagueDropdown();
  } else {
    activeSource = manualSource;
    manualSection.classList.remove('hidden');
    leagueSection.classList.add('hidden');
  }
}

function populateLeagueDropdown() {
  const select = document.getElementById('league-select');
  const leagues = getCachedLeagues();
  select.innerHTML = leagues.map(l =>
    `<option value="${l.id}">${l.name} (${l.country})</option>`
  ).join('');
  if (leagues.length > 0) {
    populateTeamDropdowns(leagues[0].id, leagues[0].season);
  }
}

function populateTeamDropdowns(leagueId, season) {
  const teams = getTeamNames(leagueId, season);
  const upcoming = getCachedUpcoming(leagueId);
  const homeSelect = document.getElementById('home-team-select');
  const awaySelect = document.getElementById('away-team-select');

  // Merge upcoming team names into the team set (in case no historical data yet)
  const allTeams = new Set(teams);
  for (const m of upcoming) {
    allTeams.add(m.homeTeam);
    allTeams.add(m.awayTeam);
  }
  const sortedTeams = [...allTeams].sort();

  const options = sortedTeams.map(t => `<option value="${t}">${t}</option>`).join('');
  homeSelect.innerHTML = options;
  awaySelect.innerHTML = options;

  // If there's an upcoming match, pre-select its teams
  if (upcoming.length > 0) {
    const next = upcoming[0];
    homeSelect.value = next.homeTeam;
    awaySelect.value = next.awayTeam;
  } else if (sortedTeams.length > 1) {
    awaySelect.selectedIndex = 1;
  }

  autoFillOdds(leagueId);
}

function autoFillOdds(leagueId) {
  const homeName = document.getElementById('home-team-select').value;
  const awayName = document.getElementById('away-team-select').value;
  const status = document.getElementById('auto-fill-status');
  const odds = getCachedOdds(leagueId);

  const match = odds.find(o =>
    (o.homeTeam.includes(homeName) || homeName.includes(o.homeTeam)) &&
    (o.awayTeam.includes(awayName) || awayName.includes(o.awayTeam))
  );

  if (match) {
    document.getElementById('odds-home').value = match.home.toFixed(2);
    document.getElementById('odds-draw').value = match.draw.toFixed(2);
    document.getElementById('odds-away').value = match.away.toFixed(2);
    status.textContent = `Odds auto-filled from Veikkaus: ${match.home.toFixed(2)} / ${match.draw.toFixed(2)} / ${match.away.toFixed(2)}`;
    status.className = 'auto-fill-status';
    // Trigger margin display update
    renderMargin([match.home, match.draw, match.away]);
  } else {
    status.textContent = 'No cached odds for this matchup — enter manually';
    status.className = 'auto-fill-status warning';
  }
}

function calculateOutcomes(matrix) {
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

function calculateOverUnder(matrix, lines) {
  const maxGoals = matrix.length;
  const totalGoalsProbs = [];

  for (let n = 0; n < maxGoals * 2; n++) {
    let prob = 0;
    for (let i = 0; i < maxGoals; i++) {
      const j = n - i;
      if (j >= 0 && j < maxGoals) {
        prob += matrix[i][j];
      }
    }
    totalGoalsProbs.push(prob);
  }

  const results = [];
  for (const line of lines) {
    const threshold = Math.ceil(line);
    let probUnder = 0;
    for (let n = 0; n < threshold; n++) {
      probUnder += totalGoalsProbs[n] || 0;
    }
    const probOver = 1 - probUnder;
    results.push({ line, probOver, probUnder });
  }
  return results;
}

function calculate() {
  const stats = activeSource.getTeamStats();
  const odds = activeSource.getOdds();
  const settings = activeSource.getSettings();

  // Expected goals
  const eg = expectedGoals(
    stats.homeScored, stats.homeConceded,
    stats.awayScored, stats.awayConceded,
    stats.leagueAvg
  );

  // Score matrix with Dixon-Coles correction
  const rawMatrix = scoreMatrix(eg.lambdaHome, eg.lambdaAway, 7);
  const matrix = applyDixonColes(rawMatrix, eg.lambdaHome, eg.lambdaAway, settings.rho);

  // Match outcomes from matrix
  const outcomes = calculateOutcomes(matrix);

  // Bookmaker 1X2 probabilities (margin removed)
  const has1x2Odds = odds.home > 0 && odds.draw > 0 && odds.away > 0;
  const bookProbs1x2 = has1x2Odds
    ? removeMargin([odds.home, odds.draw, odds.away])
    : [0, 0, 0];

  // Render score matrix
  renderScoreMatrix(matrix, stats.homeName, stats.awayName);

  // Render match outcome bars
  renderMatchOutcome(outcomes, bookProbs1x2, stats.homeName, stats.awayName);

  // Over/Under calculations
  const ouCalc = calculateOverUnder(matrix, [1.5, 2.5, 3.5]);
  const ouResults = [];
  const ouLines = [
    { line: 1.5, key: '1.5' },
    { line: 2.5, key: '2.5' },
    { line: 3.5, key: '3.5' },
  ];

  for (const { line, key } of ouLines) {
    const calc = ouCalc.find(c => c.line === line);
    const ouOdds = odds.overUnder[key];
    const hasOuOdds = ouOdds && ouOdds.over > 0 && ouOdds.under > 0;
    const bookProbs = hasOuOdds
      ? removeMargin([ouOdds.over, ouOdds.under])
      : [0, 0];

    ouResults.push({
      label: `Over ${key}`,
      yourProb: calc.probOver,
      bookProb: bookProbs[0],
      edge: bookProbs[0] > 0 ? calc.probOver - bookProbs[0] : 0,
    });
    ouResults.push({
      label: `Under ${key}`,
      yourProb: calc.probUnder,
      bookProb: bookProbs[1],
      edge: bookProbs[1] > 0 ? calc.probUnder - bookProbs[1] : 0,
    });
  }

  renderOverUnder(ouResults);

  // Build all bets list for value detection + Kelly
  const allBets = [];

  // 1X2 bets
  if (has1x2Odds) {
    const betTypes = [
      { label: `Home Win (${stats.homeName})`, prob: outcomes.home, bookProb: bookProbs1x2[0], odds: odds.home },
      { label: 'Draw', prob: outcomes.draw, bookProb: bookProbs1x2[1], odds: odds.draw },
      { label: `Away Win (${stats.awayName})`, prob: outcomes.away, bookProb: bookProbs1x2[2], odds: odds.away },
    ];
    for (const bt of betTypes) {
      const edge = calculateEdge(bt.prob, bt.bookProb);
      const kf = kellyFraction(bt.prob, bt.odds);
      const stake = kellyStake(bt.prob, bt.odds, settings.bankroll, settings.kellyFraction);
      allBets.push({ label: bt.label, yourProb: bt.prob, bookProb: bt.bookProb, edge, kellyPct: kf * settings.kellyFraction, stake });
    }
  }

  // O/U bets
  for (const { line, key } of ouLines) {
    const calc = ouCalc.find(c => c.line === line);
    const ouOdds = odds.overUnder[key];
    const hasOuOdds = ouOdds && ouOdds.over > 0 && ouOdds.under > 0;
    if (hasOuOdds) {
      const bookProbs = removeMargin([ouOdds.over, ouOdds.under]);

      const edgeOver = calculateEdge(calc.probOver, bookProbs[0]);
      const kfOver = kellyFraction(calc.probOver, ouOdds.over);
      const stakeOver = kellyStake(calc.probOver, ouOdds.over, settings.bankroll, settings.kellyFraction);
      allBets.push({ label: `Over ${key}`, yourProb: calc.probOver, bookProb: bookProbs[0], edge: edgeOver, kellyPct: kfOver * settings.kellyFraction, stake: stakeOver });

      const edgeUnder = calculateEdge(calc.probUnder, bookProbs[1]);
      const kfUnder = kellyFraction(calc.probUnder, ouOdds.under);
      const stakeUnder = kellyStake(calc.probUnder, ouOdds.under, settings.bankroll, settings.kellyFraction);
      allBets.push({ label: `Under ${key}`, yourProb: calc.probUnder, bookProb: bookProbs[1], edge: edgeUnder, kellyPct: kfUnder * settings.kellyFraction, stake: stakeUnder });
    }
  }

  renderValueBets(allBets);
  renderAllBets(allBets);
  showResults();
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  setupSliders();

  // Live margin display
  const oddsInputs = ['odds-home', 'odds-draw', 'odds-away'];
  for (const id of oddsInputs) {
    document.getElementById(id).addEventListener('input', () => {
      const vals = oddsInputs.map(oid => parseFloat(document.getElementById(oid).value) || 0);
      renderMargin(vals);
    });
  }

  // Calculate button
  document.getElementById('calculate-btn').addEventListener('click', calculate);

  // Data source switching
  document.getElementById('data-source').addEventListener('change', (e) => {
    setActiveSource(e.target.value);
  });

  // League dropdown change → repopulate teams
  document.getElementById('league-select').addEventListener('change', (e) => {
    const leagues = getCachedLeagues();
    const league = leagues.find(l => l.id === e.target.value);
    if (league) {
      populateTeamDropdowns(league.id, league.season);
    }
  });

  // Team dropdown change → try auto-fill odds
  document.getElementById('home-team-select').addEventListener('change', () => {
    const leagueId = document.getElementById('league-select').value;
    autoFillOdds(leagueId);
  });
  document.getElementById('away-team-select').addEventListener('change', () => {
    const leagueId = document.getElementById('league-select').value;
    autoFillOdds(leagueId);
  });

  // Update Data button
  document.getElementById('update-data-btn').addEventListener('click', handleUpdateData);

  // Initialize: show last update time, populate league checkboxes
  initializeUpdateBar();
});

async function initializeUpdateBar() {
  // Show last update time
  const lastUpdate = getLastUpdate();
  const lastUpdateEl = document.getElementById('last-update');
  if (lastUpdate) {
    lastUpdateEl.textContent = `Last updated: ${new Date(lastUpdate).toLocaleString()}`;
  }

  // Populate league checkboxes from cache (or fetch if none cached)
  let leagues = getCachedLeagues();
  if (leagues.length === 0) {
    try {
      leagues = await fetchLeagues();
    } catch {
      // Silently fail — checkboxes stay empty until first update
    }
  }

  const container = document.getElementById('league-checkboxes');
  container.innerHTML = leagues.map(l =>
    `<label><input type="checkbox" value="${l.id}" checked> ${l.name}</label>`
  ).join('');
}

async function handleUpdateData() {
  const btn = document.getElementById('update-data-btn');
  const statusDiv = document.getElementById('update-status');
  const messageEl = document.getElementById('update-message');

  btn.disabled = true;
  statusDiv.classList.remove('hidden');

  // Get selected leagues from checkboxes
  const checkboxes = document.querySelectorAll('#league-checkboxes input[type="checkbox"]:checked');
  const selectedLeagues = [...checkboxes].map(cb => cb.value);

  if (selectedLeagues.length === 0) {
    messageEl.textContent = 'No leagues selected';
    btn.disabled = false;
    return;
  }

  let totalRequests = 0;

  try {
    // Fetch leagues config first
    await fetchLeagues();

    for (const leagueId of selectedLeagues) {
      const leagues = getCachedLeagues();
      const league = leagues.find(l => l.id === leagueId);
      if (!league) continue;

      // Fetch results
      messageEl.textContent = `Fetching ${league.name} results...`;
      const result = await fetchResults(leagueId, league.season);
      totalRequests += result.requestsUsed;

      // Fetch odds
      messageEl.textContent = `Fetching ${league.name} odds...`;
      await fetchOdds(leagueId);
    }

    messageEl.textContent = `Done! ${selectedLeagues.length} league(s) updated. API requests used: ${totalRequests}`;
    document.getElementById('last-update').textContent =
      `Last updated: ${new Date().toLocaleString()}`;

    // Re-populate dropdowns if league-data source is active
    if (activeSource === leagueDataSource) {
      populateLeagueDropdown();
    }
  } catch (err) {
    messageEl.textContent = `Error: ${err.message}`;
    messageEl.style.color = '#f87171';
  } finally {
    btn.disabled = false;
    setTimeout(() => {
      statusDiv.classList.add('hidden');
      messageEl.style.color = '';
    }, 5000);
  }
}
