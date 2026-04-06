/**
 * Main controller — selector bar, match list, auto-calculate on click.
 * Predictions are precomputed on the backend; detailed analysis via /api/predict.
 */

import { shinProbabilities } from './shin.js?v=1775491375';
import { calculateEdge, kellyFraction, kellyStake } from './kelly.js?v=1775491375';
import { buildEloTable, renderEloTable } from './elo-display.js?v=1775491375';

import { loadMeta, loadLeagueData, loadPreviousSeasons, loadPredictions, API_BASE } from './data-loader.js?v=1775491375';
import {
  showResults, renderScoreMatrix, renderMatchOutcome,
  renderOverUnder, renderValueBets, renderAllBets, renderFades,
  renderBookmakerComparison, setupSliders, setupHelpModal,
  renderTracker, renderPLSimulation
} from './ui.js?v=1775491375';

// Loaded data state
let currentMeta = null;
let currentLeagueData = null; // { matches, upcoming, odds }
let currentLeagueId = null;
let currentSeason = null;

// Precomputed predictions from backend
let precomputedData = null; // { predictions, eloRatings, tracker, plSimulation }

// Previous season matches for Elo carryover
let previousSeasonMatches = [];

// Date-based navigation state
let dateGroups = {};        // { [date]: matches[] }
let allDates = [];          // sorted array of date strings
let visibleRange = { start: 0, end: 0 };

// Bookmaker selection
let selectedBookmaker = 'consensus';

// Currently analyzed match (for recalculate)
let currentAnalyzedMatch = null;

// Cached API response for display-only recalculations (kelly/bankroll/edge changes)
let lastApiResponse = null;
let lastAnalysisContext = null;

// ── Odds utilities (standard format handling, not model secrets) ─────

/** Migrate old flat odds { home, draw, away } to multi-bookmaker format */
function migrateOdds(odds) {
  if (!odds) return null;
  if (odds.home !== undefined && typeof odds.home === 'number') {
    return { veikkaus: { home: odds.home, draw: odds.draw, away: odds.away, overUnder: odds.overUnder || {} } };
  }
  return odds;
}

/** Average implied probabilities across bookmakers, convert back to odds */
function getConsensusOdds(oddsObj) {
  const entries = Object.values(oddsObj);
  if (entries.length === 0) return null;

  function avgOdds(values) {
    const valid = values.filter(o => o > 0);
    if (valid.length === 0) return 0;
    const avgProb = valid.reduce((s, o) => s + 1 / o, 0) / valid.length;
    return avgProb > 0 ? 1 / avgProb : 0;
  }

  const result = {
    home: avgOdds(entries.map(b => b.home || 0)),
    draw: avgOdds(entries.map(b => b.draw || 0)),
    away: avgOdds(entries.map(b => b.away || 0)),
    overUnder: {},
  };
  const allLines = new Set();
  for (const e of entries) for (const line of Object.keys(e.overUnder || {})) allLines.add(line);
  for (const line of allLines) {
    const withLine = entries.filter(e => e.overUnder?.[line]);
    if (withLine.length === 0) continue;
    result.overUnder[line] = {
      over: avgOdds(withLine.map(e => e.overUnder[line].over)),
      under: avgOdds(withLine.map(e => e.overUnder[line].under)),
    };
  }
  return result;
}

// ── Multi-bookmaker utilities ────────────────────────────────────────

/** Get odds for the currently selected bookmaker */
function getSelectedOdds(oddsObj) {
  if (!oddsObj) return null;
  const migrated = migrateOdds(oddsObj);
  if (!migrated) return null;
  if (selectedBookmaker === 'consensus') return getConsensusOdds(migrated);
  return migrated[selectedBookmaker] || null;
}

/** Find which bookmaker offers the best (highest) odds per outcome */
function findBestOdds(matchOddsMulti) {
  if (!matchOddsMulti) return {};
  const best = { home: { book: null, odds: 0 }, draw: { book: null, odds: 0 }, away: { book: null, odds: 0 } };
  for (const [bookmaker, odds] of Object.entries(matchOddsMulti)) {
    if (odds.home > best.home.odds) best.home = { book: bookmaker, odds: odds.home };
    if (odds.draw > best.draw.odds) best.draw = { book: bookmaker, odds: odds.draw };
    if (odds.away > best.away.odds) best.away = { book: bookmaker, odds: odds.away };
  }
  return best;
}

/** Compare each bookmaker's implied probs against consensus to find outliers */
function buildBookmakerComparison(matchOddsMulti) {
  if (!matchOddsMulti || Object.keys(matchOddsMulti).length < 2) return [];
  const consensus = getConsensusOdds(matchOddsMulti);
  if (!consensus || !consensus.home || !consensus.draw || !consensus.away) return [];
  const consensusProbs = shinProbabilities([consensus.home, consensus.draw, consensus.away]);

  const rows = [];
  for (const [bookmaker, odds] of Object.entries(matchOddsMulti)) {
    if (!odds.home || !odds.draw || !odds.away) continue;
    const probs = shinProbabilities([odds.home, odds.draw, odds.away]);
    rows.push({
      bookmaker,
      home: { odds: odds.home, prob: probs[0], diff: probs[0] - consensusProbs[0] },
      draw: { odds: odds.draw, prob: probs[1], diff: probs[1] - consensusProbs[1] },
      away: { odds: odds.away, prob: probs[2], diff: probs[2] - consensusProbs[2] },
    });
  }
  rows.sort((a, b) => a.bookmaker.localeCompare(b.bookmaker));
  return rows;
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

  let html = '';
  if (bookmakers.size > 1) {
    html += '<option value="consensus">Consensus (avg)</option>';
  }
  html += '<option value="veikkaus">Veikkaus</option>';
  for (const key of sorted) {
    const name = BOOKMAKER_NAMES[key] || key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
    html += `<option value="${key}">${name}</option>`;
  }

  select.innerHTML = html;
  select.value = selectedBookmaker;
}

// ── Selector logic ────────────────────────────────────���─────────────

function populateSportDropdown() {
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

/**
 * Set Market Trust slider default based on how many matches have been played.
 */
function updateMarketTrustDefault(matchCount) {
  const slider = document.getElementById('market-trust-slider');
  const label = document.getElementById('market-trust-value');
  if (!slider) return;
  const pct = Math.max(10, Math.min(85, Math.round(80 - matchCount * 0.45)));
  slider.value = pct;
  if (label) label.textContent = pct + '%';
}

/**
 * Set Previous Season slider default based on matches played.
 */
function updatePrevSeasonDefault(matchCount) {
  const slider = document.getElementById('prev-season-slider');
  const label = document.getElementById('prev-season-value');
  if (!slider) return;
  const pct = Math.max(0, Math.min(55, Math.round(50 - matchCount * 1.5)));
  slider.value = pct;
  if (label) label.textContent = pct + '%';
}

/**
 * Regress Elo ratings toward the mean (1500) between seasons.
 * factor=0 means no regression (keep as-is), factor=1 means reset to 1500.
 */
function regressToMean(ratings, factor = 0.5) {
  const result = {};
  for (const [team, r] of Object.entries(ratings))
    result[team] = 1500 + (r - 1500) * (1 - factor);
  return result;
}

/**
 * Recompute and render the Elo table based on the Previous Season slider.
 */
function updateEloTable() {
  const matches = currentLeagueData?.matches || [];
  const slider = document.getElementById('prev-season-slider');
  const sliderPct = slider ? parseInt(slider.value) : 50;

  let initialRatings = {};
  if (previousSeasonMatches.length > 0) {
    // Build end-of-previous-season ratings
    const prevTable = buildEloTable(previousSeasonMatches, {});
    const prevRatings = {};
    for (const row of prevTable) prevRatings[row.team] = row.rating;
    // Regress: 0% slider → full regression (factor=1), 100% → no regression (factor=0)
    initialRatings = regressToMean(prevRatings, 1 - sliderPct / 100);
  }

  const eloData = buildEloTable(matches, initialRatings);
  renderEloTable(eloData, 'elo-table');
}

async function loadAndShowLeague(leagueId, season) {
  currentLeagueId = leagueId;
  currentSeason = season;
  const listEl = document.getElementById('match-list');
  listEl.innerHTML = '<p class="muted">Loading matches...</p>';

  // Load data, predictions, and previous season matches in parallel
  const prevSeasons = currentMeta?.previousSeasons?.[leagueId] || [];
  const [leagueData, predData, prevMatches] = await Promise.all([
    loadLeagueData(leagueId, season),
    loadPredictions(leagueId, season),
    prevSeasons.length > 0 ? loadPreviousSeasons(leagueId, prevSeasons) : Promise.resolve([]),
  ]);

  currentLeagueData = leagueData;
  precomputedData = predData;
  previousSeasonMatches = prevMatches;

  populateBookmakerDropdown(currentLeagueData);
  const matchCount = (currentLeagueData?.matches || []).length;
  updateMarketTrustDefault(matchCount);
  updatePrevSeasonDefault(matchCount);
  initDateView(currentLeagueData);

  // Elo ratings table — computed client-side, reactive to Previous Season slider
  updateEloTable();

  // Tracker and P/L — render from precomputed data
  if (precomputedData?.tracker) {
    renderTracker(precomputedData.tracker, 'tracker-container');
  } else {
    const matches = currentLeagueData?.matches || [];
    document.getElementById('tracker-container').innerHTML =
      `<p class="muted">Prediction tracking will be available after the next data update</p>`;
  }

  if (precomputedData?.plSimulation) {
    renderPLSimulation(precomputedData.plSimulation, 'pl-container');
  } else {
    document.getElementById('pl-container').innerHTML =
      `<p class="muted">P/L simulation will be available after the next data update</p>`;
  }
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

/** Compute current W/D/L streak for each team from finished matches */
function computeStreaks(matches) {
  const sorted = [...matches].filter(m => m.homeGoals !== undefined).sort((a, b) => a.date.localeCompare(b.date));
  const teamMatches = {};
  for (const m of sorted) {
    const homeResult = m.homeGoals > m.awayGoals ? 'W' : m.homeGoals === m.awayGoals ? 'D' : 'L';
    const awayResult = m.homeGoals < m.awayGoals ? 'W' : m.homeGoals === m.awayGoals ? 'D' : 'L';
    if (!teamMatches[m.homeTeam]) teamMatches[m.homeTeam] = [];
    if (!teamMatches[m.awayTeam]) teamMatches[m.awayTeam] = [];
    teamMatches[m.homeTeam].push(homeResult);
    teamMatches[m.awayTeam].push(awayResult);
  }
  const streaks = {};
  for (const [team, results] of Object.entries(teamMatches)) {
    if (results.length === 0) { streaks[team] = { type: '-', count: 0 }; continue; }
    const last = results[results.length - 1];
    let count = 0;
    for (let i = results.length - 1; i >= 0; i--) {
      if (results[i] === last) count++;
      else break;
    }
    streaks[team] = { type: last, count };
  }
  return streaks;
}

function findDefaultDateRange(groups, dates) {
  let lastFinishedIdx = -1;
  let firstUpcomingIdx = dates.length;

  for (let i = 0; i < dates.length; i++) {
    const matches = groups[dates[i]];
    if (matches.some(m => m.status === 'finished')) lastFinishedIdx = i;
    if (matches.some(m => m.status === 'upcoming') && i < firstUpcomingIdx) firstUpcomingIdx = i;
  }

  const start = lastFinishedIdx >= 0 ? lastFinishedIdx : 0;
  let end = firstUpcomingIdx < dates.length ? firstUpcomingIdx : dates.length - 1;
  if (end + 1 < dates.length) end = end + 1;
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
  if (isSameDay(d, today)) label = 'Today ��� ' + label;
  else if (isSameDay(d, yesterday)) label = 'Yesterday — ' + label;
  else if (isSameDay(d, tomorrow)) label = 'Tomorrow — ' + label;
  return label;
}

/**
 * Look up prediction from precomputed data (fast, no model computation).
 */
function predictMatch(homeName, awayName) {
  if (!precomputedData?.predictions) return null;
  const key = `${homeName} vs ${awayName}`;
  return precomputedData.predictions[key] || null;
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

  const streaks = computeStreaks(currentLeagueData?.matches || []);
  const defaultRange = findDefaultDateRange(dateGroups, allDates);
  const canHideEarlier = visibleRange.start < defaultRange.start;
  const canHideLater = visibleRange.end > defaultRange.end;

  if (canHideEarlier) {
    html += '<button class="round-nav-btn hide-nav-btn" id="hide-earlier">Hide earlier dates</button>';
  }

  const today = new Date().toISOString().slice(0, 10);

  for (let i = visibleRange.start; i <= visibleRange.end && i < allDates.length; i++) {
    const date = allDates[i];
    const matches = dateGroups[date] || [];

    const allFinished = matches.every(m => m.status === 'finished');
    const allUpcoming = matches.every(m => m.status === 'upcoming');
    const statusLabel = allFinished ? 'Results' : allUpcoming ? 'Upcoming' : 'In Progress';
    const isToday = date === today;

    html += `<div class="match-round-header${isToday ? ' today-group' : ''}" data-date="${date}"${isToday ? ' id="today-header"' : ''}>
      <span class="round-title">${formatDate(date)}</span>
      <span class="col-headers">
        <span class="col-h">Prediction</span>
        <span class="col-h">1 X 2</span>
        <span class="col-h">${statusLabel} <span class="toggle-icon">&#x25BE;</span></span>
      </span>
    </div>`;
    html += `<div class="match-date-group" data-date-group="${date}">`;

    for (const m of matches) {
      const isFinished = m.status === 'finished';
      const pred = predictMatch(m.homeTeam, m.awayTeam);
      const selOdds = getSelectedOdds(m.odds);

      // Prediction column (score only, with outcome check for finished matches)
      let predContent = '';
      if (pred) {
        let predCls = 'pred-score';
        if (isFinished) {
          const [pH, pAw] = pred.score.split('-').map(Number);
          const exactHit = pH === m.homeGoals && pAw === m.awayGoals;
          if (exactHit) {
            predCls += ' pred-exact';
          } else {
            const predOutcome = pred.home >= pred.draw && pred.home >= pred.away ? '1'
              : pred.away >= pred.home && pred.away >= pred.draw ? '2' : 'X';
            const actualOutcome = m.homeGoals > m.awayGoals ? '1' : m.homeGoals === m.awayGoals ? 'X' : '2';
            predCls += predOutcome === actualOutcome ? ' pred-hit' : ' pred-miss';
          }
        }
        // Check if predicted score is not a draw — the most likely individual scoreline
        // is almost always a draw (e.g. 1-1), so flag when prediction differs
        const [pH, pA] = pred.score.split('-').map(Number);
        const scoreIsDraw = pH === pA;
        const asterisk = !scoreIsDraw
          ? '<span class="pred-asterisk" title="The most likely single scoreline is probably a draw — this prediction shows the best score within the predicted outcome (click for details)">*</span>'
          : '';
        predContent = `<span class="${predCls}">${pred.score}${asterisk}</span>`;
      }

      // 1 X 2 column (probabilities + odds)
      let onextwContent = '';
      if (pred) {
        const best = pred.home >= pred.draw && pred.home >= pred.away ? '1'
          : pred.away >= pred.home && pred.away >= pred.draw ? '2' : 'X';
        const bestProb = Math.max(pred.home, pred.draw, pred.away);
        const conf = bestProb >= 0.45 ? 'conf-high' : bestProb >= 0.35 ? 'conf-mid' : 'conf-low';
        onextwContent += `<span class="pred-probs">
            <span class="pred-p${best === '1' ? ` pred-best ${conf}` : ''}">${(pred.home * 100).toFixed(0)}%</span>
            <span class="pred-p${best === 'X' ? ` pred-best ${conf}` : ''}">${(pred.draw * 100).toFixed(0)}%</span>
            <span class="pred-p${best === '2' ? ` pred-best ${conf}` : ''}">${(pred.away * 100).toFixed(0)}%</span>
          </span>`;
      }
      if (selOdds && selOdds.home && selOdds.draw && selOdds.away) {
        const result = isFinished ? (m.homeGoals > m.awayGoals ? '1' : m.homeGoals === m.awayGoals ? 'X' : '2') : '';
        onextwContent += `<span class="match-odds-row">
          <span class="odds-cell${result === '1' ? ' correct' : ''}">${selOdds.home.toFixed(2)}</span>
          <span class="odds-cell${result === 'X' ? ' correct' : ''}">${selOdds.draw.toFixed(2)}</span>
          <span class="odds-cell${result === '2' ? ' correct' : ''}">${selOdds.away.toFixed(2)}</span>
        </span>`;
      }

      // Result column
      const scoreText = isFinished ? `${m.homeGoals} - ${m.awayGoals}` : '? - ?';
      const scoreTitle = isFinished ? '' : 'title="Not yet played"';
      const resultCls = isFinished ? 'match-col-result' : 'match-col-result not-played';

      // Streak badges for upcoming matches
      const homeStreak = !isFinished && streaks[m.homeTeam]?.count >= 3 ? streaks[m.homeTeam] : null;
      const awayStreak = !isFinished && streaks[m.awayTeam]?.count >= 3 ? streaks[m.awayTeam] : null;
      const homeBadge = homeStreak ? ` <span class="streak-badge streak-${homeStreak.type}">${homeStreak.type}${homeStreak.count}</span>` : '';
      const awayBadge = awayStreak ? ` <span class="streak-badge streak-${awayStreak.type}">${awayStreak.type}${awayStreak.count}</span>` : '';

      html += `<div class="match-row${isFinished ? ' finished' : ' upcoming'}" data-home="${m.homeTeam}" data-away="${m.awayTeam}">
        <span class="match-teams">${m.homeTeam}${homeBadge} vs ${m.awayTeam}${awayBadge}</span>
        <span class="match-result-group">
          <span class="match-col-pred">${predContent}</span>
          <span class="match-col-1x2">${onextwContent}</span>
          <span class="${resultCls}" ${scoreTitle}>${scoreText}</span>
        </span>
      </div>`;
    }
    html += '</div>'; // close match-date-group
  }

  if (canHideLater) {
    html += '<button class="round-nav-btn hide-nav-btn" id="hide-later">Hide later dates</button>';
  }

  if (visibleRange.end < allDates.length - 1) {
    html += '<button class="round-nav-btn" id="show-later">Show later dates</button>';
  }

  listEl.innerHTML = html;

  // Click handlers for date headers (collapse/expand)
  listEl.querySelectorAll('.match-round-header').forEach(header => {
    header.addEventListener('click', () => {
      const date = header.dataset.date;
      const group = listEl.querySelector(`[data-date-group="${date}"]`);
      const icon = header.querySelector('.toggle-icon');
      if (group.classList.toggle('collapsed')) {
        icon.textContent = '\u25B8'; // right arrow
      } else {
        icon.textContent = '\u25BE'; // down arrow
      }
    });
  });

  // Click handlers for all matches (analysis)
  listEl.querySelectorAll('.match-row').forEach(row => {
    row.addEventListener('click', () => analyzeMatch(row.dataset.home, row.dataset.away));
  });

  // Navigation handlers — also close results panel
  document.getElementById('show-earlier')?.addEventListener('click', () => {
    visibleRange.start = Math.max(0, visibleRange.start - 1);
    document.getElementById('results').classList.add('hidden');
    renderDateView();
  });
  document.getElementById('show-later')?.addEventListener('click', () => {
    visibleRange.end = Math.min(allDates.length - 1, visibleRange.end + 1);
    document.getElementById('results').classList.add('hidden');
    renderDateView();
  });
  document.getElementById('hide-earlier')?.addEventListener('click', () => {
    visibleRange.start = defaultRange.start;
    document.getElementById('results').classList.add('hidden');
    renderDateView();
  });
  document.getElementById('hide-later')?.addEventListener('click', () => {
    visibleRange.end = defaultRange.end;
    document.getElementById('results').classList.add('hidden');
    renderDateView();
  });

  // Auto-scroll to today's date or first upcoming group
  requestAnimationFrame(() => {
    const todayEl = document.getElementById('today-header');
    if (todayEl) {
      todayEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    const firstUpcoming = listEl.querySelector('.match-row.upcoming');
    if (firstUpcoming) {
      const header = firstUpcoming.closest('.match-date-group')?.previousElementSibling;
      if (header) header.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });
}

function findOdds(match, odds) {
  if (!odds || odds.length === 0) return null;
  const found = odds.find(o =>
    (o.homeTeam.includes(match.homeTeam) || match.homeTeam.includes(o.homeTeam)) &&
    (o.awayTeam.includes(match.awayTeam) || match.awayTeam.includes(o.awayTeam))
  );
  if (!found) return null;
  if (found.bookmakers) return found.bookmakers;
  return migrateOdds({ home: found.home, draw: found.draw, away: found.away, overUnder: found.overUnder });
}

let _reanalyzeTimer = null;
function reanalyzeIfNeeded() {
  if (!currentAnalyzedMatch) return;
  clearTimeout(_reanalyzeTimer);
  _reanalyzeTimer = setTimeout(() => {
    analyzeMatch(currentAnalyzedMatch.home, currentAnalyzedMatch.away);
  }, 300);
}

/** Re-render analysis from cached API response (for kelly/bankroll/edge changes) */
function rerenderAnalysis() {
  if (!lastApiResponse || !lastAnalysisContext) return;
  renderAnalysisFromApi(lastApiResponse, lastAnalysisContext);
}

// ── Detailed analysis via backend API ────────────────────────────────

async function analyzeMatch(homeName, awayName) {
  currentAnalyzedMatch = { home: homeName, away: awayName };

  // Highlight selected match
  document.querySelectorAll('.match-row').forEach(r => r.classList.remove('selected'));
  const rows = document.querySelectorAll('.match-row');
  for (const r of rows) {
    if (r.dataset.home === homeName && r.dataset.away === awayName) {
      r.classList.add('selected');
    }
  }

  // Show loading state
  document.getElementById('selected-match-title').textContent = `${homeName} vs ${awayName}`;
  showResults();

  // Resolve odds locally (odds are not secret)
  const odds = currentLeagueData?.odds || [];
  let matchOddsMulti = findOdds({ homeTeam: homeName, awayTeam: awayName }, odds);
  const allObjects = [...(currentLeagueData?.matches || []), ...(currentLeagueData?.upcoming || [])];
  const obj = allObjects.find(m => m.homeTeam === homeName && m.awayTeam === awayName);
  if (!matchOddsMulti && obj?.odds) {
    matchOddsMulti = migrateOdds(obj.odds);
  }

  let selOdds = matchOddsMulti ? getSelectedOdds(matchOddsMulti) : null;
  if (!selOdds && matchOddsMulti) {
    selOdds = getConsensusOdds(migrateOdds(matchOddsMulti));
  }
  const oddsData = selOdds
    ? { home: selOdds.home, draw: selOdds.draw, away: selOdds.away, overUnder: selOdds.overUnder || {} }
    : { home: 0, draw: 0, away: 0, overUnder: {} };

  // Read model settings from sliders
  const rho = parseFloat(document.getElementById('rho-slider').value);
  const marketTrust = parseInt(document.getElementById('market-trust-slider').value);
  const halfLife = 60;

  // Call backend API for prediction
  try {
    const res = await fetch(`${API_BASE}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        league: currentLeagueId,
        season: currentSeason,
        homeName,
        awayName,
        settings: { rho, marketTrust, halfLife },
      }),
    });

    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const apiResponse = await res.json();

    // Cache for display-only re-renders
    lastApiResponse = apiResponse;
    lastAnalysisContext = { homeName, awayName, matchOddsMulti, oddsData };

    renderAnalysisFromApi(apiResponse, lastAnalysisContext);
  } catch (err) {
    console.error('Predict API error:', err);
    // Fallback: show what we can from precomputed data
    const pred = predictMatch(homeName, awayName);
    if (pred) {
      document.getElementById('score-matrix-container').innerHTML =
        `<p class="muted">Detailed analysis unavailable — showing precomputed prediction</p>`;
      renderMatchOutcome(
        { home: pred.home, draw: pred.draw, away: pred.away },
        oddsData.home > 0 ? shinProbabilities([oddsData.home, oddsData.draw, oddsData.away]) : [0, 0, 0],
        homeName, awayName
      );
    } else {
      document.getElementById('score-matrix-container').innerHTML =
        `<p class="muted">Analysis unavailable — please try again</p>`;
    }
  }
}

/**
 * Render full analysis from API response + local odds data.
 * Called after API returns and on display-only setting changes (kelly/bankroll/edge).
 */
function renderAnalysisFromApi(apiResponse, context) {
  const { homeName, awayName, matchOddsMulti, oddsData } = context;
  const { score, outcomes, matrix, overUnder } = apiResponse;
  const odds = oddsData;

  const kellyFrac = parseFloat(document.getElementById('kelly-fraction-slider').value);
  const bankroll = parseFloat(document.getElementById('bankroll').value) || 0;

  const has1x2Odds = odds.home > 0 && odds.draw > 0 && odds.away > 0;
  const bookProbs1x2 = has1x2Odds ? shinProbabilities([odds.home, odds.draw, odds.away]) : [0, 0, 0];

  renderScoreMatrix(matrix, homeName, awayName, score);
  renderMatchOutcome(outcomes, bookProbs1x2, homeName, awayName);

  // Over/Under
  const ouLines = [
    { line: 1.5, key: '1.5' },
    { line: 2.5, key: '2.5' },
    { line: 3.5, key: '3.5' },
  ];
  const ouResults = [];

  for (const { line, key } of ouLines) {
    const calc = overUnder.find(c => c.line === line);
    if (!calc) continue;
    const ouOdds = odds.overUnder[key];
    const hasOuOdds = ouOdds && ouOdds.over > 0 && ouOdds.under > 0;
    const bookProbs = hasOuOdds ? shinProbabilities([ouOdds.over, ouOdds.under]) : [0, 0];

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

  const betTypes = [
    { label: `Home Win (${homeName})`, prob: outcomes.home, bookProb: has1x2Odds ? bookProbs1x2[0] : 0, odds: odds.home },
    { label: 'Draw', prob: outcomes.draw, bookProb: has1x2Odds ? bookProbs1x2[1] : 0, odds: odds.draw },
    { label: `Away Win (${awayName})`, prob: outcomes.away, bookProb: has1x2Odds ? bookProbs1x2[2] : 0, odds: odds.away },
  ];
  for (const bt of betTypes) {
    const edge = bt.bookProb > 0 ? calculateEdge(bt.prob, bt.bookProb) : 0;
    const kf = bt.odds > 0 ? kellyFraction(bt.prob, bt.odds) : 0;
    const stake = bt.odds > 0 ? kellyStake(bt.prob, bt.odds, bankroll, kellyFrac) : 0;
    allBets.push({ label: bt.label, yourProb: bt.prob, bookProb: bt.bookProb, edge, kellyPct: kf * kellyFrac, stake });
  }

  for (const { line, key } of ouLines) {
    const calc = overUnder.find(c => c.line === line);
    if (!calc) continue;
    const ouOdds = odds.overUnder[key];
    const hasOuOdds = ouOdds && ouOdds.over > 0 && ouOdds.under > 0;
    if (hasOuOdds) {
      const bookProbs = shinProbabilities([ouOdds.over, ouOdds.under]);
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

  // Build fades
  const fades = allBets
    .filter(b => b.bookProb > 0 && b.edge < -0.03)
    .map(b => ({
      ...b,
      overvaluedBy: Math.abs(b.edge),
      counterBets: allBets.filter(cb => cb.edge > 0 && cb.label !== b.label),
    }))
    .sort((a, b) => b.overvaluedBy - a.overvaluedBy);

  // Build cross-bookmaker comparison + best odds
  const comparison = buildBookmakerComparison(matchOddsMulti);
  const bestOdds = findBestOdds(matchOddsMulti);
  const minEdge = parseInt(document.getElementById('edge-threshold-slider')?.value || '3');

  renderValueBets(allBets, minEdge, bestOdds);
  renderFades(fades);
  renderBookmakerComparison(comparison, homeName, awayName, outcomes, bestOdds);
  renderAllBets(allBets);
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
  setupHelpModal();

  // Model sliders — only trigger re-analysis of current match (API call)
  for (const id of ['rho-slider', 'market-trust-slider']) {
    document.getElementById(id).addEventListener('input', reanalyzeIfNeeded);
  }

  // Previous Season slider — updates Elo table + detailed analysis
  document.getElementById('prev-season-slider').addEventListener('input', () => {
    const label = document.getElementById('prev-season-value');
    if (label) label.textContent = document.getElementById('prev-season-slider').value + '%';
    updateEloTable();
    reanalyzeIfNeeded();
  });

  // Display settings — re-render from cached API response (no API call)
  document.getElementById('kelly-fraction-slider').addEventListener('input', rerenderAnalysis);
  document.getElementById('bankroll').addEventListener('input', rerenderAnalysis);
  document.getElementById('edge-threshold-slider').addEventListener('input', rerenderAnalysis);

  // Close results button
  document.getElementById('close-results').addEventListener('click', () => {
    document.getElementById('results').classList.add('hidden');
    document.querySelectorAll('.match-row').forEach(r => r.classList.remove('selected'));
    currentAnalyzedMatch = null;
    lastApiResponse = null;
    lastAnalysisContext = null;
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

  // Populate selectors and load first league
  populateLeagueDropdown('football');
});
