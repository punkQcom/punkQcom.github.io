/**
 * Elo Ratings Display — builds and renders an Elo ratings table.
 */

const DEFAULT_RATING = 1500;
const K_FACTOR = 32;
const HOME_ADVANTAGE = 50;

/**
 * Build Elo table data from matches.
 * @param {Array} matches - Finished matches
 * @param {Object} initialRatings - Optional starting ratings { teamName: rating }
 * @returns {Array} Sorted array of { team, rating, rank, change, form, played }
 */
export function buildEloTable(matches, initialRatings = {}) {
  const ratings = { ...initialRatings };
  const history = {}; // team → array of ratings after each match
  const results = {}; // team → array of 'W', 'D', 'L'

  const sorted = [...matches]
    .filter(m => m.homeGoals != null && m.awayGoals != null)
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  for (const m of sorted) {
    const homeR = (ratings[m.homeTeam] || DEFAULT_RATING) + HOME_ADVANTAGE;
    const awayR = ratings[m.awayTeam] || DEFAULT_RATING;

    const expectedHome = 1 / (1 + Math.pow(10, (awayR - homeR) / 400));
    const expectedAway = 1 - expectedHome;

    let actualHome, actualAway, homeResult, awayResult;
    if (m.homeGoals > m.awayGoals) {
      actualHome = 1; actualAway = 0;
      homeResult = 'W'; awayResult = 'L';
    } else if (m.homeGoals === m.awayGoals) {
      actualHome = 0.5; actualAway = 0.5;
      homeResult = 'D'; awayResult = 'D';
    } else {
      actualHome = 0; actualAway = 1;
      homeResult = 'L'; awayResult = 'W';
    }

    ratings[m.homeTeam] = (ratings[m.homeTeam] || DEFAULT_RATING) + K_FACTOR * (actualHome - expectedHome);
    ratings[m.awayTeam] = (ratings[m.awayTeam] || DEFAULT_RATING) + K_FACTOR * (actualAway - expectedAway);

    if (!history[m.homeTeam]) history[m.homeTeam] = [initialRatings[m.homeTeam] || DEFAULT_RATING];
    if (!history[m.awayTeam]) history[m.awayTeam] = [initialRatings[m.awayTeam] || DEFAULT_RATING];
    history[m.homeTeam].push(ratings[m.homeTeam]);
    history[m.awayTeam].push(ratings[m.awayTeam]);

    if (!results[m.homeTeam]) results[m.homeTeam] = [];
    if (!results[m.awayTeam]) results[m.awayTeam] = [];
    results[m.homeTeam].push(homeResult);
    results[m.awayTeam].push(awayResult);
  }

  const table = Object.entries(ratings).map(([team, rating]) => {
    const hist = history[team] || [DEFAULT_RATING];
    const prevRating = hist.length >= 2 ? hist[hist.length - 2] : rating;
    const form = (results[team] || []).slice(-5);
    return {
      team,
      rating: Math.round(rating),
      change: Math.round(rating - prevRating),
      form,
      played: (results[team] || []).length,
    };
  });

  table.sort((a, b) => b.rating - a.rating);
  table.forEach((t, i) => t.rank = i + 1);

  return table;
}

/**
 * Render Elo table into a container element.
 * @param {Array} eloData - Full table from buildEloTable (pre-sorted, ranked).
 * @param {string} containerId
 * @param {Object} [options]
 * @param {number|null} [options.cap=null]         - Max rows shown before "Show all" toggle.
 * @param {string[]|null} [options.scopeTeamNames=null] - Restrict to these teams (re-ranks 1..N).
 * @param {boolean} [options.showAll=false]        - Toggle state for cap expansion.
 */
export function renderEloTable(eloData, containerId, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const { cap = null, scopeTeamNames = null, showAll = false } = options;

  let entries = eloData;

  // Scope to a subset of teams (e.g. a single tournament's participants) and re-rank.
  // When scoping, the filter IS the list — no cap is applied on top.
  const isScoped = !!scopeTeamNames;
  if (isScoped) {
    const set = new Set(scopeTeamNames);
    entries = entries.filter(e => set.has(e.team)).map((e, i) => ({ ...e, rank: i + 1 }));
  }

  const total = entries.length;

  // Cap only applies to the unscoped "All" view. Scoped views always show everything.
  const capApplies = cap && !isScoped;
  if (capApplies && !showAll && entries.length > cap) {
    entries = entries.slice(0, cap);
  }

  if (entries.length === 0) {
    container.innerHTML = '<p class="muted">No match data available</p>';
    return;
  }

  let html = '<table class="results-table elo-table">';
  html += '<thead><tr><th>#</th><th>Team</th><th>Rating</th><th>Change</th><th>Form</th><th>P</th></tr></thead>';
  html += '<tbody>';

  for (const row of entries) {
    const changeClass = row.change > 0 ? 'value-positive' : row.change < 0 ? 'value-negative' : '';
    const changeSign = row.change > 0 ? '+' : '';
    const formDots = row.form.map(r => {
      const cls = r === 'W' ? 'form-w' : r === 'D' ? 'form-d' : 'form-l';
      return `<span class="form-dot ${cls}" title="${r}">${r}</span>`;
    }).join('');

    html += `<tr>
      <td>${row.rank}</td>
      <td>${row.team}</td>
      <td><strong>${row.rating}</strong></td>
      <td class="${changeClass}">${changeSign}${row.change}</td>
      <td class="form-cell">${formDots}</td>
      <td>${row.played}</td>
    </tr>`;
  }

  html += '</tbody></table>';

  // "Show all (N)" / "Show top {cap}" toggle when capping applies (unscoped view only).
  if (capApplies && total > cap) {
    html += showAll
      ? `<button class="elo-toggle" data-action="show-top">Show top ${cap}</button>`
      : `<button class="elo-toggle" data-action="show-all">Show all (${total})</button>`;
  }

  container.innerHTML = html;

  const toggleBtn = container.querySelector('.elo-toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', (e) => {
      const nextShowAll = e.target.getAttribute('data-action') === 'show-all';
      renderEloTable(eloData, containerId, { ...options, showAll: nextShowAll });
    });
  }
}
