/**
 * Main controller — selector bar, match list, auto-calculate on click.
 */

import { expectedGoals, scoreMatrix } from './poisson.js';
import { applyDixonColes } from './dixon-coles.js';
import { removeMargin } from './odds.js';
import { calculateEdge, kellyFraction, kellyStake } from './kelly.js';
import { calculateTeamAverages, calculateLeagueAvg } from './sources/league-data.js';
import * as manualSource from './sources/manual.js';
import { loadMeta, loadLeagueData, triggerUpdate } from './data-loader.js';
import {
  showResults, renderScoreMatrix, renderMatchOutcome,
  renderOverUnder, renderValueBets, renderAllBets, renderMargin, setupSliders
} from './ui.js';

// Loaded data state
let currentMeta = null;
let currentLeagueData = null; // { matches, upcoming, odds }
let currentLeagueId = null;

// Round navigation state
let roundData = {};         // { [roundNumber]: matches[] }
let allRoundNumbers = [];   // sorted array of round numbers
let visibleRange = { start: 0, end: 0 };

// ── Selector logic ──────────────────────────────────────────────────

function populateSportDropdown() {
  // Currently only football — more sports added later
  const select = document.getElementById('sport-select');
  select.innerHTML = '<option value="football">Football</option>';
}

function populateLeagueDropdown(sport) {
  const select = document.getElementById('league-select');
  const leagues = (currentMeta?.leagues || []).filter(l => l.sport === sport);

  select.innerHTML = leagues.map(l =>
    `<option value="${l.id}">${l.name} (${l.country})</option>`
  ).join('');

  if (leagues.length > 0) {
    populateSeasonSelect(leagues[0]);
    loadAndShowLeague(leagues[0].id, leagues[0].season);
  }
}

function populateSeasonSelect(league) {
  const select = document.getElementById('season-select');
  select.innerHTML = `<option value="${league.season}">${league.season}</option>`;
}

async function loadAndShowLeague(leagueId, season) {
  currentLeagueId = leagueId;
  const listEl = document.getElementById('match-list');
  listEl.innerHTML = '<p class="muted">Loading matches...</p>';

  currentLeagueData = await loadLeagueData(leagueId, season);
  initRoundView(currentLeagueData);
}

// ── Round-based match list ──────────────────────────────────────────

function buildRoundData(matches, upcoming, odds) {
  const rounds = {};

  for (const m of matches) {
    const r = m.round || 'unknown';
    if (!rounds[r]) rounds[r] = [];
    rounds[r].push({ ...m, status: 'finished' });
  }

  for (const m of upcoming) {
    const r = m.round || 'unknown';
    if (!rounds[r]) rounds[r] = [];
    const matchOdds = findOdds(m, odds);
    rounds[r].push({ ...m, status: 'upcoming', odds: matchOdds });
  }

  return rounds;
}

function findDefaultRange(rounds, roundNumbers) {
  let lastFinishedIdx = -1;
  let firstUpcomingIdx = roundNumbers.length;

  for (let i = 0; i < roundNumbers.length; i++) {
    const matches = rounds[roundNumbers[i]];
    if (matches.some(m => m.status === 'finished')) lastFinishedIdx = i;
    if (matches.some(m => m.status === 'upcoming') && i < firstUpcomingIdx) firstUpcomingIdx = i;
  }

  const start = lastFinishedIdx >= 0 ? lastFinishedIdx : 0;
  const end = firstUpcomingIdx < roundNumbers.length ? firstUpcomingIdx : roundNumbers.length - 1;
  return { start, end };
}

function formatDateRange(startDate, endDate) {
  const opts = { day: 'numeric', month: 'short' };
  const start = new Date(startDate + 'T12:00:00').toLocaleDateString('en-GB', opts);
  if (startDate === endDate) return start;
  const end = new Date(endDate + 'T12:00:00').toLocaleDateString('en-GB', opts);
  return `${start} – ${end}`;
}

function initRoundView(data) {
  roundData = buildRoundData(data.matches, data.upcoming, data.odds);

  allRoundNumbers = Object.keys(roundData)
    .filter(r => r !== 'unknown')
    .map(Number)
    .sort((a, b) => a - b);

  if (allRoundNumbers.length === 0) {
    document.getElementById('match-list').innerHTML = '<p class="muted">No match data available</p>';
    return;
  }

  visibleRange = findDefaultRange(roundData, allRoundNumbers);
  renderRoundView();
}

function renderRoundView() {
  const listEl = document.getElementById('match-list');
  let html = '';

  if (visibleRange.start > 0) {
    html += '<button class="round-nav-btn" id="show-earlier">Show earlier rounds</button>';
  }

  for (let i = visibleRange.start; i <= visibleRange.end && i < allRoundNumbers.length; i++) {
    const roundNum = allRoundNumbers[i];
    const matches = roundData[roundNum] || [];

    const allFinished = matches.every(m => m.status === 'finished');
    const allUpcoming = matches.every(m => m.status === 'upcoming');
    const statusLabel = allFinished ? 'Results' : allUpcoming ? 'Upcoming' : 'In Progress';

    const dates = matches.map(m => m.date).filter(Boolean).sort();
    const dateRange = dates.length > 0 ? formatDateRange(dates[0], dates[dates.length - 1]) : '';

    html += `<div class="match-round-header">
      <span class="round-title">Round ${roundNum}</span>
      <span class="round-meta">${dateRange} — ${statusLabel}</span>
    </div>`;

    for (const m of matches) {
      if (m.status === 'finished') {
        html += `<div class="match-row finished" data-home="${m.homeTeam}" data-away="${m.awayTeam}">
          <span class="match-teams">${m.homeTeam} vs ${m.awayTeam}</span>
          <span class="match-score">${m.homeGoals} - ${m.awayGoals}</span>
        </div>`;
      } else {
        const oddsStr = m.odds
          ? `<span class="match-odds">${m.odds.home.toFixed(2)} / ${m.odds.draw.toFixed(2)} / ${m.odds.away.toFixed(2)}</span>`
          : '<span class="match-odds muted">No odds</span>';

        html += `<div class="match-row upcoming" data-home="${m.homeTeam}" data-away="${m.awayTeam}">
          <span class="match-teams">${m.homeTeam} vs ${m.awayTeam}</span>
          ${oddsStr}
        </div>`;
      }
    }
  }

  if (visibleRange.end < allRoundNumbers.length - 1) {
    html += '<button class="round-nav-btn" id="show-later">Show later rounds</button>';
  }

  listEl.innerHTML = html;

  // Click handlers for upcoming matches (analysis)
  listEl.querySelectorAll('.match-row.upcoming').forEach(row => {
    row.addEventListener('click', () => analyzeMatch(row.dataset.home, row.dataset.away));
  });

  // Navigation handlers
  document.getElementById('show-earlier')?.addEventListener('click', () => {
    visibleRange.start = Math.max(0, visibleRange.start - 1);
    renderRoundView();
  });
  document.getElementById('show-later')?.addEventListener('click', () => {
    visibleRange.end = Math.min(allRoundNumbers.length - 1, visibleRange.end + 1);
    renderRoundView();
  });
}

function findOdds(match, odds) {
  if (!odds || odds.length === 0) return null;
  return odds.find(o =>
    (o.homeTeam.includes(match.homeTeam) || match.homeTeam.includes(o.homeTeam)) &&
    (o.awayTeam.includes(match.awayTeam) || match.awayTeam.includes(o.awayTeam))
  );
}

// ── Auto-calculate on match click ───────────────────────────────────

function analyzeMatch(homeName, awayName) {
  // Highlight selected match
  document.querySelectorAll('.match-row').forEach(r => r.classList.remove('selected'));
  const rows = document.querySelectorAll('.match-row');
  for (const r of rows) {
    if (r.dataset.home === homeName && r.dataset.away === awayName) {
      r.classList.add('selected');
    }
  }

  // Team stats from historical data
  const matches = currentLeagueData?.matches || [];
  const averages = calculateTeamAverages(matches);
  const leagueAvg = calculateLeagueAvg(matches);

  const homeStats = averages[homeName] || { homeScored: leagueAvg / 2, homeConceded: leagueAvg / 2 };
  const awayStats = averages[awayName] || { awayScored: leagueAvg / 2, awayConceded: leagueAvg / 2 };

  // Odds
  const odds = currentLeagueData?.odds || [];
  const matchOdds = findOdds({ homeTeam: homeName, awayTeam: awayName }, odds);

  const oddsData = matchOdds
    ? { home: matchOdds.home, draw: matchOdds.draw, away: matchOdds.away, overUnder: matchOdds.overUnder || {} }
    : { home: 0, draw: 0, away: 0, overUnder: {} };

  // Settings
  const rho = parseFloat(document.getElementById('rho-slider').value);
  const kellyFrac = parseFloat(document.getElementById('kelly-fraction-slider').value);
  const bankroll = parseFloat(document.getElementById('bankroll').value) || 0;

  // Run calculation
  calculate(homeName, awayName, homeStats, awayStats, leagueAvg, oddsData, rho, kellyFrac, bankroll);
}

// ── Calculation (same math, parameterized) ──────────────────────────

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
      if (j >= 0 && j < maxGoals) prob += matrix[i][j];
    }
    totalGoalsProbs.push(prob);
  }

  return lines.map(line => {
    const threshold = Math.ceil(line);
    let probUnder = 0;
    for (let n = 0; n < threshold; n++) probUnder += totalGoalsProbs[n] || 0;
    return { line, probOver: 1 - probUnder, probUnder };
  });
}

function calculate(homeName, awayName, homeStats, awayStats, leagueAvg, odds, rho, kellyFrac, bankroll) {
  document.getElementById('selected-match-title').textContent = `${homeName} vs ${awayName}`;

  const eg = expectedGoals(
    homeStats.homeScored, homeStats.homeConceded,
    awayStats.awayScored, awayStats.awayConceded,
    leagueAvg
  );

  const rawMatrix = scoreMatrix(eg.lambdaHome, eg.lambdaAway, 7);
  const matrix = applyDixonColes(rawMatrix, eg.lambdaHome, eg.lambdaAway, rho);
  const outcomes = calculateOutcomes(matrix);

  const has1x2Odds = odds.home > 0 && odds.draw > 0 && odds.away > 0;
  const bookProbs1x2 = has1x2Odds ? removeMargin([odds.home, odds.draw, odds.away]) : [0, 0, 0];

  renderScoreMatrix(matrix, homeName, awayName);
  renderMatchOutcome(outcomes, bookProbs1x2, homeName, awayName);

  // Over/Under
  const ouLines = [
    { line: 1.5, key: '1.5' },
    { line: 2.5, key: '2.5' },
    { line: 3.5, key: '3.5' },
  ];
  const ouCalc = calculateOverUnder(matrix, ouLines.map(l => l.line));
  const ouResults = [];

  for (const { line, key } of ouLines) {
    const calc = ouCalc.find(c => c.line === line);
    const ouOdds = odds.overUnder[key];
    const hasOuOdds = ouOdds && ouOdds.over > 0 && ouOdds.under > 0;
    const bookProbs = hasOuOdds ? removeMargin([ouOdds.over, ouOdds.under]) : [0, 0];

    ouResults.push({
      label: `Over ${key}`, yourProb: calc.probOver,
      bookProb: bookProbs[0], edge: bookProbs[0] > 0 ? calc.probOver - bookProbs[0] : 0,
    });
    ouResults.push({
      label: `Under ${key}`, yourProb: calc.probUnder,
      bookProb: bookProbs[1], edge: bookProbs[1] > 0 ? calc.probUnder - bookProbs[1] : 0,
    });
  }
  renderOverUnder(ouResults);

  // All bets + value bets
  const allBets = [];

  if (has1x2Odds) {
    const betTypes = [
      { label: `Home Win (${homeName})`, prob: outcomes.home, bookProb: bookProbs1x2[0], odds: odds.home },
      { label: 'Draw', prob: outcomes.draw, bookProb: bookProbs1x2[1], odds: odds.draw },
      { label: `Away Win (${awayName})`, prob: outcomes.away, bookProb: bookProbs1x2[2], odds: odds.away },
    ];
    for (const bt of betTypes) {
      const edge = calculateEdge(bt.prob, bt.bookProb);
      const kf = kellyFraction(bt.prob, bt.odds);
      const stake = kellyStake(bt.prob, bt.odds, bankroll, kellyFrac);
      allBets.push({ label: bt.label, yourProb: bt.prob, bookProb: bt.bookProb, edge, kellyPct: kf * kellyFrac, stake });
    }
  }

  for (const { line, key } of ouLines) {
    const calc = ouCalc.find(c => c.line === line);
    const ouOdds = odds.overUnder[key];
    const hasOuOdds = ouOdds && ouOdds.over > 0 && ouOdds.under > 0;
    if (hasOuOdds) {
      const bookProbs = removeMargin([ouOdds.over, ouOdds.under]);
      const edgeOver = calculateEdge(calc.probOver, bookProbs[0]);
      const kfOver = kellyFraction(calc.probOver, ouOdds.over);
      const stakeOver = kellyStake(calc.probOver, ouOdds.over, bankroll, kellyFrac);
      allBets.push({ label: `Over ${key}`, yourProb: calc.probOver, bookProb: bookProbs[0], edge: edgeOver, kellyPct: kfOver * kellyFrac, stake: stakeOver });

      const edgeUnder = calculateEdge(calc.probUnder, bookProbs[1]);
      const kfUnder = kellyFraction(calc.probUnder, ouOdds.under);
      const stakeUnder = kellyStake(calc.probUnder, ouOdds.under, bankroll, kellyFrac);
      allBets.push({ label: `Under ${key}`, yourProb: calc.probUnder, bookProb: bookProbs[1], edge: edgeUnder, kellyPct: kfUnder * kellyFrac, stake: stakeUnder });
    }
  }

  renderValueBets(allBets);
  renderAllBets(allBets);
  showResults();
}

// ── Manual calculate (fallback) ─────────────────────────────────────

function manualCalculate() {
  const stats = manualSource.getTeamStats();
  const odds = manualSource.getOdds();
  const settings = manualSource.getSettings();

  calculate(
    stats.homeName, stats.awayName,
    { homeScored: stats.homeScored, homeConceded: stats.homeConceded },
    { awayScored: stats.awayScored, awayConceded: stats.awayConceded },
    stats.leagueAvg, odds, settings.rho, settings.kellyFraction, settings.bankroll
  );
}

// ── Update Data ─────────────────────────────────────────────────────

async function handleUpdateData() {
  const btn = document.getElementById('update-data-btn');
  const statusDiv = document.getElementById('update-status');
  const messageEl = document.getElementById('update-message');

  btn.disabled = true;
  statusDiv.classList.remove('hidden');
  messageEl.textContent = 'Updating...';
  messageEl.style.color = '';

  // Safety: always hide spinner after 35s no matter what
  const safetyTimer = setTimeout(() => {
    statusDiv.classList.add('hidden');
    messageEl.style.color = '';
    btn.disabled = false;
  }, 35000);

  try {
    const leagueId = currentLeagueId || document.getElementById('league-select').value;
    messageEl.textContent = `Fetching data for ${leagueId}...`;

    const result = await triggerUpdate(leagueId);

    // Use the returned data directly
    currentLeagueData = {
      matches: result.matches,
      upcoming: result.upcoming,
      odds: result.odds,
    };
    currentMeta = result.meta;

    initRoundView(currentLeagueData);
    updateLastUpdateDisplay(result.meta.lastUpdate);

    messageEl.textContent = 'Done! Data updated.';
    btn.disabled = true; // Keep disabled — data is now fresh
  } catch (err) {
    console.error('Update failed:', err);
    messageEl.textContent = `Error: ${err.message}`;
    messageEl.style.color = '#f87171';
    btn.disabled = false;
  } finally {
    clearTimeout(safetyTimer);
    setTimeout(() => {
      statusDiv.classList.add('hidden');
      messageEl.style.color = '';
    }, 5000);
  }
}

function updateLastUpdateDisplay(isoString) {
  const el = document.getElementById('last-update');
  if (isoString) {
    el.textContent = `Last updated: ${new Date(isoString).toLocaleString('en-GB', { hour12: false })}`;
  } else {
    el.textContent = 'No data yet';
  }
}

// ── Initialize ──────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  setupSliders();

  // Manual calculate button
  document.getElementById('calculate-btn').addEventListener('click', manualCalculate);

  // Manual odds margin display
  const oddsInputs = ['odds-home', 'odds-draw', 'odds-away'];
  for (const id of oddsInputs) {
    document.getElementById(id).addEventListener('input', () => {
      const vals = oddsInputs.map(oid => parseFloat(document.getElementById(oid).value) || 0);
      renderMargin(vals);
    });
  }

  // Update button
  document.getElementById('update-data-btn').addEventListener('click', handleUpdateData);

  // Sport dropdown
  populateSportDropdown();
  document.getElementById('sport-select').addEventListener('change', (e) => {
    populateLeagueDropdown(e.target.value);
  });

  // League dropdown
  document.getElementById('league-select').addEventListener('change', (e) => {
    const league = (currentMeta?.leagues || []).find(l => l.id === e.target.value);
    if (league) {
      populateSeasonSelect(league);
      loadAndShowLeague(league.id, league.season);
    }
  });

  // Load initial data
  currentMeta = await loadMeta();
  updateLastUpdateDisplay(currentMeta.lastUpdate);

  // Enable/disable update button based on freshness
  document.getElementById('update-data-btn').disabled = currentMeta.isFresh;

  // Populate selectors and load first league
  populateLeagueDropdown('football');
});
