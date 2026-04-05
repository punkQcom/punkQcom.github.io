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

// Date-based navigation state
let dateGroups = {};        // { [date]: matches[] }
let allDates = [];          // sorted array of date strings
let visibleRange = { start: 0, end: 0 };

// Bookmaker selection
let selectedBookmaker = 'veikkaus';

// ── Multi-bookmaker utilities ────────────────────────────────────────

/** Migrate old flat odds { home, draw, away } to multi-bookmaker { veikkaus: {...} } */
function migrateOdds(odds) {
  if (!odds) return null;
  if (odds.home !== undefined && typeof odds.home === 'number') {
    return { veikkaus: { home: odds.home, draw: odds.draw, away: odds.away, overUnder: odds.overUnder || {} } };
  }
  return odds;
}

/** Get odds for the currently selected bookmaker */
function getSelectedOdds(oddsObj) {
  if (!oddsObj) return null;
  const migrated = migrateOdds(oddsObj);
  if (!migrated) return null;
  if (selectedBookmaker === 'consensus') return getConsensusOdds(migrated);
  return migrated[selectedBookmaker] || null;
}

/** Average odds across all available bookmakers */
function getConsensusOdds(oddsObj) {
  const entries = Object.values(oddsObj);
  if (entries.length === 0) return null;
  const n = entries.length;
  const result = {
    home: entries.reduce((s, b) => s + (b.home || 0), 0) / n,
    draw: entries.reduce((s, b) => s + (b.draw || 0), 0) / n,
    away: entries.reduce((s, b) => s + (b.away || 0), 0) / n,
    overUnder: {},
  };
  // Average over/under lines
  const allLines = new Set();
  for (const e of entries) for (const line of Object.keys(e.overUnder || {})) allLines.add(line);
  for (const line of allLines) {
    const withLine = entries.filter(e => e.overUnder?.[line]);
    if (withLine.length === 0) continue;
    result.overUnder[line] = {
      over: withLine.reduce((s, e) => s + e.overUnder[line].over, 0) / withLine.length,
      under: withLine.reduce((s, e) => s + e.overUnder[line].under, 0) / withLine.length,
    };
  }
  return result;
}

/** Extract all unique bookmaker keys from loaded data */
function getAvailableBookmakers(data) {
  const keys = new Set();
  for (const m of [...(data.matches || []), ...(data.upcoming || [])]) {
    const odds = migrateOdds(m.odds);
    if (odds) for (const key of Object.keys(odds)) keys.add(key);
  }
  for (const o of (data.odds || [])) {
    if (o.bookmakers) for (const key of Object.keys(o.bookmakers)) keys.add(key);
  }
  return keys;
}

const BOOKMAKER_NAMES = {
  veikkaus: 'Veikkaus', pinnacle: 'Pinnacle', bet365: 'Bet365',
  unibet: 'Unibet', betsson: 'Betsson', williamhill: 'William Hill',
  '1xbet': '1xBet', betfair: 'Betfair', marathonbet: 'Marathon Bet',
  matchbook: 'Matchbook', betclic: 'Betclic', betonlineag: 'BetOnline',
  bovada: 'Bovada', coolbet: 'Coolbet', nordicbet: 'NordicBet',
  unibet_eu: 'Unibet EU', betvictor: 'Bet Victor', winamax: 'Winamax',
  sport888: '888sport',
};

function populateBookmakerDropdown(data) {
  const select = document.getElementById('bookmaker-select');
  const bookmakers = getAvailableBookmakers(data);
  const sorted = [...bookmakers].filter(k => k !== 'veikkaus').sort();

  let html = '<option value="veikkaus">Veikkaus</option>';
  if (bookmakers.size > 1) {
    html += '<option value="consensus">Consensus (avg)</option>';
  }
  for (const key of sorted) {
    const name = BOOKMAKER_NAMES[key] || key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
    html += `<option value="${key}">${name}</option>`;
  }

  select.innerHTML = html;
  select.value = selectedBookmaker;
}

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
  populateBookmakerDropdown(currentLeagueData);
  initDateView(currentLeagueData);
}

// ── Date-based match list ────────────────────────────────────────────

const DEV_ODDS = {};

function buildDateGroups(matches, upcoming, odds) {
  const groups = {};

  for (const m of matches) {
    const d = m.date || 'unknown';
    if (!groups[d]) groups[d] = [];
    const devOdds = DEV_ODDS[`${m.homeTeam} vs ${m.awayTeam}`] || null;
    const migrated = migrateOdds(m.odds) || devOdds || null;
    groups[d].push({ ...m, odds: migrated, status: 'finished' });
  }

  for (const m of upcoming) {
    const d = m.date || 'unknown';
    if (!groups[d]) groups[d] = [];
    const matchOdds = findOdds(m, odds) || migrateOdds(m.odds) || null;
    groups[d].push({ ...m, status: 'upcoming', odds: matchOdds });
  }

  return groups;
}

function findDefaultDateRange(groups, dates) {
  const today = new Date().toISOString().slice(0, 10);
  let lastFinishedIdx = -1;
  let firstUpcomingIdx = dates.length;

  for (let i = 0; i < dates.length; i++) {
    const matches = groups[dates[i]];
    if (matches.some(m => m.status === 'finished')) lastFinishedIdx = i;
    if (matches.some(m => m.status === 'upcoming') && i < firstUpcomingIdx) firstUpcomingIdx = i;
  }

  const start = lastFinishedIdx >= 0 ? lastFinishedIdx : 0;
  const end = firstUpcomingIdx < dates.length ? firstUpcomingIdx : dates.length - 1;
  return { start, end };
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isSameDay = (a, b) => a.toDateString() === b.toDateString();

  let label = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  if (isSameDay(d, today)) label = 'Today — ' + label;
  else if (isSameDay(d, yesterday)) label = 'Yesterday — ' + label;
  else if (isSameDay(d, tomorrow)) label = 'Tomorrow — ' + label;
  return label;
}

/**
 * Quick prediction for a match — returns predicted score and outcome probabilities.
 */
function predictMatch(homeName, awayName) {
  const matches = currentLeagueData?.matches || [];
  if (matches.length === 0) return null;

  const averages = calculateTeamAverages(matches);
  const leagueAvg = calculateLeagueAvg(matches);
  const homeStats = averages[homeName] || { homeScored: leagueAvg / 2, homeConceded: leagueAvg / 2 };
  const awayStats = averages[awayName] || { awayScored: leagueAvg / 2, awayConceded: leagueAvg / 2 };

  const rho = parseFloat(document.getElementById('rho-slider')?.value || -0.13);
  const eg = expectedGoals(
    homeStats.homeScored, homeStats.homeConceded,
    awayStats.awayScored, awayStats.awayConceded,
    leagueAvg
  );
  const rawMatrix = scoreMatrix(eg.lambdaHome, eg.lambdaAway, 7);
  const matrix = applyDixonColes(rawMatrix, eg.lambdaHome, eg.lambdaAway, rho);

  // Find most likely score
  let bestScore = { home: 0, away: 0, prob: 0 };
  let home = 0, draw = 0, away = 0;
  for (let i = 0; i < matrix.length; i++) {
    for (let j = 0; j < matrix[i].length; j++) {
      if (matrix[i][j] > bestScore.prob) bestScore = { home: i, away: j, prob: matrix[i][j] };
      if (i > j) home += matrix[i][j];
      else if (i === j) draw += matrix[i][j];
      else away += matrix[i][j];
    }
  }

  return { score: `${bestScore.home}-${bestScore.away}`, home, draw, away };
}

function initDateView(data) {
  dateGroups = buildDateGroups(data.matches, data.upcoming, data.odds);

  allDates = Object.keys(dateGroups)
    .filter(d => d !== 'unknown')
    .sort();

  if (allDates.length === 0) {
    document.getElementById('match-list').innerHTML = '<p class="muted">No match data available</p>';
    return;
  }

  visibleRange = findDefaultDateRange(dateGroups, allDates);
  renderDateView();
}

function renderDateView() {
  const listEl = document.getElementById('match-list');
  let html = '';

  if (visibleRange.start > 0) {
    html += '<button class="round-nav-btn" id="show-earlier">Show earlier dates</button>';
  }

  for (let i = visibleRange.start; i <= visibleRange.end && i < allDates.length; i++) {
    const date = allDates[i];
    const matches = dateGroups[date] || [];

    const allFinished = matches.every(m => m.status === 'finished');
    const allUpcoming = matches.every(m => m.status === 'upcoming');
    const statusLabel = allFinished ? 'Results' : allUpcoming ? 'Upcoming' : 'In Progress';

    html += `<div class="match-round-header">
      <span class="round-title">${formatDate(date)}</span>
      <span class="round-meta">${statusLabel}</span>
    </div>`;

    for (const m of matches) {
      if (m.status === 'finished') {
        let oddsRow = '';
        const selOdds = getSelectedOdds(m.odds);
        if (selOdds && selOdds.home && selOdds.draw && selOdds.away) {
          const result = m.homeGoals > m.awayGoals ? '1' : m.homeGoals === m.awayGoals ? 'X' : '2';
          oddsRow = `<div class="match-odds-table">
            <span class="odds-cell${result === '1' ? ' correct' : ''}"><span class="odds-label">1</span>${selOdds.home.toFixed(2)}</span>
            <span class="odds-cell${result === 'X' ? ' correct' : ''}"><span class="odds-label">X</span>${selOdds.draw.toFixed(2)}</span>
            <span class="odds-cell${result === '2' ? ' correct' : ''}"><span class="odds-label">2</span>${selOdds.away.toFixed(2)}</span>
          </div>`;
        }
        html += `<div class="match-row finished" data-home="${m.homeTeam}" data-away="${m.awayTeam}">
          <span class="match-teams">${m.homeTeam} vs ${m.awayTeam}</span>
          <span class="match-result-group">
            ${oddsRow}
            <span class="match-score">${m.homeGoals} - ${m.awayGoals}</span>
          </span>
        </div>`;
      } else {
        const pred = predictMatch(m.homeTeam, m.awayTeam);
        let predHtml = '';
        if (pred) {
          const best = pred.home >= pred.draw && pred.home >= pred.away ? '1'
            : pred.away >= pred.home && pred.away >= pred.draw ? '2' : 'X';
          predHtml = `<span class="match-prediction">
            <span class="pred-score">${pred.score}</span>
            <span class="pred-probs">
              <span class="pred-p${best === '1' ? ' pred-best' : ''}">${(pred.home * 100).toFixed(0)}%</span>
              <span class="pred-p${best === 'X' ? ' pred-best' : ''}">${(pred.draw * 100).toFixed(0)}%</span>
              <span class="pred-p${best === '2' ? ' pred-best' : ''}">${(pred.away * 100).toFixed(0)}%</span>
            </span>
          </span>`;
        }

        const selOddsUp = getSelectedOdds(m.odds);
        const oddsStr = selOddsUp && selOddsUp.home && selOddsUp.draw && selOddsUp.away
          ? `<div class="match-odds-table">
              <span class="odds-cell"><span class="odds-label">1</span>${selOddsUp.home.toFixed(2)}</span>
              <span class="odds-cell"><span class="odds-label">X</span>${selOddsUp.draw.toFixed(2)}</span>
              <span class="odds-cell"><span class="odds-label">2</span>${selOddsUp.away.toFixed(2)}</span>
            </div>`
          : '';

        html += `<div class="match-row upcoming" data-home="${m.homeTeam}" data-away="${m.awayTeam}">
          <span class="match-teams">${m.homeTeam} vs ${m.awayTeam}</span>
          <span class="match-result-group">
            ${predHtml}
            ${oddsStr}
          </span>
        </div>`;
      }
    }
  }

  if (visibleRange.end < allDates.length - 1) {
    html += '<button class="round-nav-btn" id="show-later">Show later dates</button>';
  }

  listEl.innerHTML = html;

  // Click handlers for all matches (analysis)
  listEl.querySelectorAll('.match-row').forEach(row => {
    row.addEventListener('click', () => analyzeMatch(row.dataset.home, row.dataset.away));
  });

  // Navigation handlers — also close results panel
  document.getElementById('show-earlier')?.addEventListener('click', () => {
    visibleRange.start = Math.max(0, visibleRange.start - 1);
    document.getElementById('results').classList.add('hidden');
    document.querySelectorAll('.match-row').forEach(r => r.classList.remove('selected'));
    renderDateView();
  });
  document.getElementById('show-later')?.addEventListener('click', () => {
    visibleRange.end = Math.min(allDates.length - 1, visibleRange.end + 1);
    document.getElementById('results').classList.add('hidden');
    document.querySelectorAll('.match-row').forEach(r => r.classList.remove('selected'));
    renderDateView();
  });
}

function findOdds(match, odds) {
  if (!odds || odds.length === 0) return null;
  const found = odds.find(o =>
    (o.homeTeam.includes(match.homeTeam) || match.homeTeam.includes(o.homeTeam)) &&
    (o.awayTeam.includes(match.awayTeam) || match.awayTeam.includes(o.awayTeam))
  );
  if (!found) return null;
  // New format: odds array entries have .bookmakers
  if (found.bookmakers) return found.bookmakers;
  // Old format fallback
  return migrateOdds({ home: found.home, draw: found.draw, away: found.away, overUnder: found.overUnder });
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

  // Odds — resolve for selected bookmaker
  const odds = currentLeagueData?.odds || [];
  let matchOddsMulti = findOdds({ homeTeam: homeName, awayTeam: awayName }, odds);
  if (!matchOddsMulti) {
    const allObjects = [...(currentLeagueData?.matches || []), ...(currentLeagueData?.upcoming || [])];
    const obj = allObjects.find(m => m.homeTeam === homeName && m.awayTeam === awayName);
    if (obj?.odds) matchOddsMulti = migrateOdds(obj.odds);
  }

  const selOdds = matchOddsMulti ? getSelectedOdds(matchOddsMulti) : null;
  const oddsData = selOdds
    ? { home: selOdds.home, draw: selOdds.draw, away: selOdds.away, overUnder: selOdds.overUnder || {} }
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

  // Safety: always hide spinner after 130s no matter what
  const safetyTimer = setTimeout(() => {
    statusDiv.classList.add('hidden');
    messageEl.style.color = '';
    btn.disabled = false;
  }, 130000);

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

    populateBookmakerDropdown(currentLeagueData);
    initDateView(currentLeagueData);
    updateLastUpdateDisplay(result.meta.lastUpdate);

    messageEl.textContent = 'Done! Data updated.';
    btn.disabled = true; // Keep disabled — data is now fresh
    document.getElementById('update-btn-wrapper').title = 'Data is fresh (less than 6 hours old)';
  } catch (err) {
    console.error('Update failed:', err);
    messageEl.textContent = `Error: ${err.message}`;
    messageEl.style.color = '#f87171';
    btn.disabled = false;
    document.getElementById('update-btn-wrapper').title = 'Click to fetch latest data';
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

  // Re-render predictions when rho slider changes
  document.getElementById('rho-slider').addEventListener('input', () => {
    if (allDates.length > 0) renderDateView();
  });

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

  // Close results button
  document.getElementById('close-results').addEventListener('click', () => {
    document.getElementById('results').classList.add('hidden');
    document.querySelectorAll('.match-row').forEach(r => r.classList.remove('selected'));
  });

  // Bookmaker dropdown
  document.getElementById('bookmaker-select').addEventListener('change', (e) => {
    selectedBookmaker = e.target.value;
    if (allDates.length > 0) renderDateView();
  });

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
  const updateBtn = document.getElementById('update-data-btn');
  updateBtn.disabled = currentMeta.isFresh;
  document.getElementById('update-btn-wrapper').title = currentMeta.isFresh ? 'Data is fresh (less than 6 hours old)' : 'Click to fetch latest data';

  // Populate selectors and load first league
  populateLeagueDropdown('football');
});
