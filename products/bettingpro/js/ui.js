/**
 * DOM rendering — takes calculation results and renders them into the page.
 */

/** Escape HTML to prevent XSS when inserting into innerHTML. */
function esc(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

export function showResults({ scroll = true } = {}) {
  const el = document.getElementById('results');
  el.classList.remove('hidden');
  if (scroll) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Render tournament filter pills for international leagues.
 * Hidden (empty) for regular leagues that have no tournaments.
 * @param {Array<{id:string,label:string}>} tournaments
 * @param {string} activeId  — 'all' or a tournament id
 * @param {(id:string)=>void} onChange
 */
export function renderTournamentFilter(tournaments, activeId, onChange) {
  const container = document.getElementById('tournament-filter');
  if (!container) return;

  if (!tournaments || tournaments.length === 0) {
    container.hidden = true;
    container.innerHTML = '';
    return;
  }
  container.hidden = false;

  const buttons = [
    { id: 'all', label: 'All' },
    ...tournaments.map(t => ({ id: t.id, label: t.label })),
  ];

  const pillsHtml = buttons
    .map(b => `<button data-tournament="${esc(b.id)}" class="${b.id === activeId ? 'active' : ''}">${esc(b.label)}</button>`)
    .join('');
  const helpHtml = `<button type="button" class="help-tip" data-help="tournament_filter">?</button>`;
  container.innerHTML = pillsHtml + helpHtml;

  container.querySelectorAll('button[data-tournament]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-tournament');
      onChange(id);
    });
  });
}

/**
 * Render a single-line context label above the score matrix for the
 * detailed analysis panel. Hidden when the match has no tournamentId
 * (e.g. Veikkausliiga).
 * @param {Object} match
 * @param {Array<{id:string,label:string}>|null} tournaments
 */
export function renderMatchContext(match, tournaments) {
  const el = document.getElementById('match-context');
  if (!el) return;
  if (!match?.tournamentId) {
    el.hidden = true;
    el.innerHTML = '';
    return;
  }
  const label = tournaments?.find(t => t.id === match.tournamentId)?.label || match.tournamentId;
  const venueLabel = match.neutralVenue ? ' · Neutral venue' : '';
  el.hidden = false;
  el.innerHTML = `${esc(label)}${esc(venueLabel)} <button type="button" class="help-tip" data-help="${match.neutralVenue ? 'neutral_venue' : 'league_mens_international'}">?</button>`;
}

export function renderScoreMatrix(matrix, homeName, awayName, predictedScore, outcomes) {
  const container = document.getElementById('score-matrix');
  const maxGoals = matrix.length;

  let maxProb = 0;
  let maxI = 0, maxJ = 0;
  for (let i = 0; i < maxGoals; i++) {
    for (let j = 0; j < maxGoals; j++) {
      if (matrix[i][j] > maxProb) {
        maxProb = matrix[i][j];
        maxI = i;
        maxJ = j;
      }
    }
  }

  const el = document.getElementById('most-likely-score');
  const mostLikely = `${maxI}-${maxJ}`;
  if (predictedScore && predictedScore !== mostLikely && outcomes) {
    // Determine the predicted outcome and the most likely scoreline's outcome
    const [pH, pA] = predictedScore.split('-').map(Number);
    const predOutcome = pH > pA ? 'home' : pH < pA ? 'away' : 'draw';
    const mlOutcome = maxI > maxJ ? 'home' : maxI < maxJ ? 'away' : 'draw';
    const outcomeLabels = {
      home: `Home Win (${(outcomes.home * 100).toFixed(0)}%)`,
      draw: `Draw (${(outcomes.draw * 100).toFixed(0)}%)`,
      away: `Away Win (${(outcomes.away * 100).toFixed(0)}%)`,
    };
    const outcomeLabelsfi = {
      home: `Kotivoitto (${(outcomes.home * 100).toFixed(0)}%)`,
      draw: `Tasapeli (${(outcomes.draw * 100).toFixed(0)}%)`,
      away: `Vierasvoitto (${(outcomes.away * 100).toFixed(0)}%)`,
    };
    const outcomeSumFi = { home: 'kotivoitto', draw: 'tasapeli', away: 'vierasvoitto' };

    let explanation;
    if (predOutcome !== mlOutcome) {
      explanation = `The prediction is the most likely score for the predicted outcome (${outcomeLabels[predOutcome]}). `
        + `${maxI}-${maxJ} has the highest individual probability, but adding up all ${predOutcome === 'home' ? 'home win' : predOutcome === 'away' ? 'away win' : 'draw'} scorelines gives a higher total. `
        + `For <strong>1X2 bets</strong>, follow the outcome probabilities below. For <strong>exact score bets</strong>, use the matrix.`
        + `<br>Ennuste on todennäköisin tulos ennustetulle lopputulokselle (${outcomeLabelsfi[predOutcome]}). `
        + `${maxI}-${maxJ}:llä on korkein yksittäinen todennäköisyys, mutta kaikkien ${outcomeSumFi[predOutcome]}tulosten summa on suurempi. `
        + `<strong>1X2-vedoissa</strong> seuraa lopputulostodennäköisyyksiä alla. <strong>Täsmätulosvedoissa</strong> käytä matriisia.`;
    } else {
      explanation = `Both scores belong to the same outcome (${outcomeLabels[predOutcome]}), but ${mostLikely} has the highest individual probability across all scorelines. `
        + `For <strong>1X2 bets</strong>, follow the outcome probabilities below. For <strong>exact score bets</strong>, use the matrix.`
        + `<br>Molemmat tulokset kuuluvat samaan lopputulokseen (${outcomeLabelsfi[predOutcome]}), mutta ${mostLikely}:llä on korkein yksittäinen todennäköisyys. `
        + `<strong>1X2-vedoissa</strong> seuraa lopputulostodennäköisyyksiä alla. <strong>Täsmätulosvedoissa</strong> käytä matriisia.`;
    }

    el.innerHTML =
      `Prediction: ${esc(homeName)} <strong>${predictedScore}</strong> ${esc(awayName)} &nbsp;·&nbsp; Most likely scoreline: ${maxI} - ${maxJ} (${(maxProb * 100).toFixed(1)}%)`
      + `<br><small class="score-matrix-note">${explanation}</small>`;
  } else {
    el.textContent =
      `Most likely: ${homeName} ${maxI} - ${maxJ} ${awayName} (${(maxProb * 100).toFixed(1)}%)`;
  }

  // Away team name spanning the top
  let html = '<table class="score-matrix">';
  html += `<tr><th></th><th></th><th class="team-header" colspan="${maxGoals}">${esc(awayName)}</th></tr>`;
  // Away goal numbers
  html += '<tr><th></th><th></th>';
  for (let j = 0; j < maxGoals; j++) html += `<th>${j}</th>`;
  html += '</tr>';

  for (let i = 0; i < maxGoals; i++) {
    html += '<tr>';
    // Home team name spanning rows (only on first data row)
    if (i === 0) {
      html += `<th class="team-header team-header-vertical" rowspan="${maxGoals}">${esc(homeName)}</th>`;
    }
    html += `<th>${i}</th>`;
    for (let j = 0; j < maxGoals; j++) {
      const pct = (matrix[i][j] * 100).toFixed(1);
      const intensity = Math.min(matrix[i][j] / maxProb, 1);
      const bg = `rgba(96, 165, 250, ${intensity * 0.6})`;
      const cls = (i === maxI && j === maxJ) ? ' class="highlight"' : '';
      html += `<td${cls} style="background:${bg}">${pct}%</td>`;
    }
    html += '</tr>';
  }
  html += '</table>';
  container.innerHTML = html;
}

export function renderMatchOutcome(outcomes, bookmakerProbs, homeName, awayName) {
  const container = document.getElementById('match-outcome');
  const data = [
    { label: `Home (${homeName})`, pct: outcomes.home, bookPct: bookmakerProbs[0], cls: 'home' },
    { label: 'Draw', pct: outcomes.draw, bookPct: bookmakerProbs[1], cls: 'draw' },
    { label: `Away (${awayName})`, pct: outcomes.away, bookPct: bookmakerProbs[2], cls: 'away' },
  ];

  container.innerHTML = data.map(d => {
    const modelOdds = d.pct > 0 ? (1 / d.pct).toFixed(2) : '-';
    const bookOdds = d.bookPct > 0 ? (1 / d.bookPct).toFixed(2) : '-';
    return `
    <div class="outcome-row">
      <div class="outcome-label">
        <span>${d.label}</span>
        <span>${(d.pct * 100).toFixed(1)}% <span class="outcome-odds" title="Model fair odds">${modelOdds}</span> (book: ${(d.bookPct * 100).toFixed(1)}% <span class="outcome-odds book" title="Bookmaker implied odds">${bookOdds}</span>)</span>
      </div>
      <div class="outcome-bar-track">
        <div class="outcome-bar-fill ${d.cls}" style="width:${(d.pct * 100).toFixed(1)}%"></div>
        <div class="outcome-bar-fill bookmaker" style="width:${(d.bookPct * 100).toFixed(1)}%"></div>
      </div>
    </div>`;
  }).join('');
}

export function renderOverUnder(ouResults) {
  const table = document.getElementById('ou-results');
  let html = '<thead><tr><th>Line</th><th>Your %</th><th>Bookmaker %</th><th>Edge</th></tr></thead><tbody>';

  for (const row of ouResults) {
    const edgeClass = row.edge > 0 ? 'value-positive' : 'value-negative';
    const edgeSign = row.edge > 0 ? '+' : '';
    html += `<tr>
      <td>${row.label}</td>
      <td>${(row.yourProb * 100).toFixed(1)}%</td>
      <td>${(row.bookProb * 100).toFixed(1)}%</td>
      <td class="${edgeClass}">${edgeSign}${(row.edge * 100).toFixed(1)}%</td>
    </tr>`;
  }

  html += '</tbody>';
  table.innerHTML = html;
}

export function renderValueBets(bets, minEdge = 0, bestOdds = {}) {
  const table = document.getElementById('value-bets');
  const minEdgeFrac = minEdge / 100;
  const valueBets = bets.filter(b => b.edge > minEdgeFrac);
  const belowThreshold = bets.filter(b => b.edge > 0 && b.edge <= minEdgeFrac).length;

  if (valueBets.length === 0 && belowThreshold === 0) {
    table.innerHTML = '<tbody><tr><td colspan="6" style="text-align:center;color:#9ca3af;">No value bets found</td></tr></tbody>';
    return;
  }

  let html = '<thead><tr><th>Bet</th><th>Your %</th><th>Book %</th><th>Edge</th><th>Kelly %</th><th>Stake</th></tr></thead><tbody>';

  valueBets.sort((a, b) => b.edge - a.edge);
  for (const bet of valueBets) {
    // Find best bookmaker for this outcome
    let bestInfo = '';
    const bo = bet.label.includes('Home Win') ? bestOdds.home
      : bet.label === 'Draw' ? bestOdds.draw
      : bet.label.includes('Away Win') ? bestOdds.away : null;
    if (bo?.book) bestInfo = `<span class="best-odds-info">Best: ${formatBookmaker(bo.book)} @ ${bo.odds.toFixed(2)}</span>`;

    html += `<tr>
      <td>${bet.label}${bestInfo}</td>
      <td class="value-positive">${(bet.yourProb * 100).toFixed(1)}%</td>
      <td>${(bet.bookProb * 100).toFixed(1)}%</td>
      <td class="value-positive">+${(bet.edge * 100).toFixed(1)}%</td>
      <td>${(bet.kellyPct * 100).toFixed(1)}%</td>
      <td>${bet.stake.toFixed(2)}</td>
    </tr>`;
  }

  if (belowThreshold > 0) {
    html += `<tr><td colspan="6" style="text-align:center;color:#9ca3af;font-size:0.85rem;">${belowThreshold} more bet${belowThreshold > 1 ? 's' : ''} below ${minEdge}% edge threshold</td></tr>`;
  }

  html += '</tbody>';
  table.innerHTML = html;
}

export function renderAllBets(bets) {
  const table = document.getElementById('all-bets');
  let html = '<thead><tr><th>Bet</th><th>Your %</th><th>Book %</th><th>Edge</th><th>Kelly %</th><th>Stake</th></tr></thead><tbody>';

  const sorted = [...bets].sort((a, b) => b.edge - a.edge);
  for (const bet of sorted) {
    const hasBook = bet.bookProb > 0;
    const edgeClass = bet.edge > 0 ? 'value-positive' : 'value-negative';
    const edgeSign = bet.edge > 0 ? '+' : '';
    html += `<tr>
      <td>${bet.label}</td>
      <td>${(bet.yourProb * 100).toFixed(1)}%</td>
      <td>${hasBook ? (bet.bookProb * 100).toFixed(1) + '%' : '—'}</td>
      <td class="${hasBook ? edgeClass : ''}">${hasBook ? edgeSign + (bet.edge * 100).toFixed(1) + '%' : '—'}${hasBook && bet.edge < -0.03 ? ' <span class="overvalued-tag">OV</span>' : ''}</td>
      <td>${hasBook ? (bet.kellyPct * 100).toFixed(1) + '%' : '—'}</td>
      <td>${hasBook ? bet.stake.toFixed(2) : '—'}</td>
    </tr>`;
  }

  html += '</tbody>';
  table.innerHTML = html;
}

export function renderFades(fades) {
  const table = document.getElementById('fades-table');

  if (fades.length === 0) {
    table.innerHTML = '<tbody><tr><td colspan="4" style="text-align:center;color:#9ca3af;">No overvalued outcomes found</td></tr></tbody>';
    return;
  }

  let html = '<thead><tr><th>Overvalued Outcome</th><th>Book %</th><th>Model %</th><th>Overvalued By</th></tr></thead><tbody>';

  for (const fade of fades) {
    html += `<tr>
      <td>${fade.label}</td>
      <td>${(fade.bookProb * 100).toFixed(1)}%</td>
      <td>${(fade.yourProb * 100).toFixed(1)}%</td>
      <td class="value-negative">${(fade.overvaluedBy * 100).toFixed(1)}%</td>
    </tr>`;

    // Show counter-bets (value bets on opposite outcomes)
    for (const cb of fade.counterBets) {
      html += `<tr class="counter-bet-row">
        <td>&nbsp;&nbsp;&#8627; ${cb.label}</td>
        <td colspan="2" class="value-positive">Edge +${(cb.edge * 100).toFixed(1)}%</td>
        <td>Stake ${cb.stake.toFixed(2)}</td>
      </tr>`;
    }
  }

  html += '</tbody>';
  table.innerHTML = html;
}

export function renderBookmakerComparison(rows, homeName, awayName, modelOutcomes, bestOdds = {}, benchmarkSource = 'consensus', previousOddsMulti = null, initialOddsMulti = null) {
  const container = document.getElementById('bookmaker-comparison');

  if (rows.length === 0) {
    container.innerHTML = '<p class="muted" style="text-align:center;">No multi-bookmaker odds available</p>';
    return;
  }

  const isPinnacle = benchmarkSource === 'pinnacle';
  const benchLabel = isPinnacle ? 'Pinnacle (sharp)' : 'Consensus (avg)';

  let html = `<p class="benchmark-label">Compared against: <strong>${benchLabel}</strong></p>`;
  html += `<table class="results-table"><thead><tr>
    <th>Bookmaker</th>
    <th>1 ${homeName}</th>
    <th>X Draw</th>
    <th>2 ${awayName}</th>
  </tr></thead><tbody>`;

  // Model row — our predicted probabilities as reference
  if (modelOutcomes) {
    html += `<tr class="model-row">
      <td><strong>Our Model</strong></td>
      <td><strong>${(modelOutcomes.home * 100).toFixed(1)}%</strong></td>
      <td><strong>${(modelOutcomes.draw * 100).toFixed(1)}%</strong></td>
      <td><strong>${(modelOutcomes.away * 100).toFixed(1)}%</strong></td>
    </tr>`;
  }

  for (const row of rows) {
    const prev = previousOddsMulti?.[row.bookmaker];
    const init = initialOddsMulti?.[row.bookmaker];
    html += `<tr>
      <td>${formatBookmaker(row.bookmaker)}</td>
      ${comparisonCell(row.home, bestOdds.home?.book === row.bookmaker, isPinnacle, prev?.home, init?.home)}
      ${comparisonCell(row.draw, bestOdds.draw?.book === row.bookmaker, isPinnacle, prev?.draw, init?.draw)}
      ${comparisonCell(row.away, bestOdds.away?.book === row.bookmaker, isPinnacle, prev?.away, init?.away)}
    </tr>`;
  }

  html += '</tbody></table>';
  container.innerHTML = html;
}

function formatBookmaker(key) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function comparisonCell(data, isBest = false, isPinnacleBenchmark = false, prevOddsValue = null, initOddsValue = null) {
  const diffPct = (data.diff * 100).toFixed(1);
  const sign = data.diff > 0 ? '+' : '';
  // Positive diff = bookmaker thinks outcome more likely than benchmark = worse odds for bettor
  // Negative diff = bookmaker thinks outcome less likely = better odds for bettor
  const cls = data.diff < -0.02 ? 'comp-value' : data.diff > 0.02 ? 'comp-overvalued' : '';
  const bestTag = isBest ? ' <span class="best-odds-badge">BEST</span>' : '';
  const sharpTag = (isPinnacleBenchmark && data.diff < -0.03)
    ? ' <span class="sharp-value-badge">SHARP VALUE</span>' : '';
  let arrow = '', prevAttr = '';
  if (prevOddsValue != null && Math.abs(data.odds - prevOddsValue) >= 0.03) {
    let tip = 'was ' + prevOddsValue.toFixed(2);
    if (initOddsValue != null && initOddsValue.toFixed(2) !== prevOddsValue.toFixed(2)) {
      tip += ' (opened ' + initOddsValue.toFixed(2) + ')';
    }
    prevAttr = ` data-prev="${tip}"`;
    arrow = data.odds > prevOddsValue
      ? '<span class="odds-up">\u25B2</span>'
      : '<span class="odds-down">\u25BC</span>';
  }
  return `<td><span class="comp-cell ${cls}"${prevAttr}>${data.odds.toFixed(2)}${arrow}</span> <small>(${sign}${diffPct}%)</small>${bestTag}${sharpTag}</td>`;
}

export function setupSliders() {
  const marketSlider = document.getElementById('market-trust-slider');
  const marketValue = document.getElementById('market-trust-value');
  marketSlider.addEventListener('input', () => {
    marketValue.textContent = marketSlider.value + '%';
  });

  const rhoSlider = document.getElementById('rho-slider');
  const rhoValue = document.getElementById('rho-value');
  rhoSlider.addEventListener('input', () => {
    rhoValue.textContent = parseFloat(rhoSlider.value).toFixed(2);
  });

  const kellySlider = document.getElementById('kelly-fraction-slider');
  const kellyValue = document.getElementById('kelly-fraction-value');
  kellySlider.addEventListener('input', () => {
    kellyValue.textContent = Math.round(parseFloat(kellySlider.value) * 100) + '%';
  });

  const prevSeasonSlider = document.getElementById('prev-season-slider');
  const prevSeasonValue = document.getElementById('prev-season-value');
  if (prevSeasonSlider) {
    prevSeasonSlider.addEventListener('input', () => {
      prevSeasonValue.textContent = prevSeasonSlider.value + '%';
    });
  }

  const formBoostSlider = document.getElementById('form-boost-slider');
  const formBoostValue = document.getElementById('form-boost-value');
  if (formBoostSlider) {
    formBoostSlider.addEventListener('input', () => {
      formBoostValue.textContent = formBoostSlider.value + '%';
    });
  }

  const pwSlider = document.getElementById('prior-weight-slider');
  const pwValue = document.getElementById('prior-weight-value');
  if (pwSlider) {
    pwSlider.addEventListener('input', () => {
      pwValue.textContent = pwSlider.value;
    });
  }

  const edgeSlider = document.getElementById('edge-threshold-slider');
  const edgeValue = document.getElementById('edge-threshold-value');
  if (edgeSlider) {
    edgeSlider.addEventListener('input', () => {
      edgeValue.textContent = edgeSlider.value + '%';
    });
  }

  setupFloatingPanel();
}

function setupFloatingPanel() {
  const panel = document.getElementById('slider-panel');
  const body = document.getElementById('slider-panel-body');
  const toggle = document.getElementById('slider-panel-toggle');
  if (!panel || !body || !toggle) return;

  // Restore collapsed state from localStorage
  const COLLAPSE_KEY = 'bettingpro_sliderPanelCollapsed';
  if (localStorage.getItem(COLLAPSE_KEY) === 'true') {
    body.classList.add('collapsed');
    toggle.innerHTML = '&#9660;';
  }

  // Collapse / expand
  const header = panel.querySelector('.slider-panel-header');
  header.addEventListener('click', () => {
    body.classList.toggle('collapsed');
    const collapsed = body.classList.contains('collapsed');
    toggle.innerHTML = collapsed ? '&#9660;' : '&#9650;';
    localStorage.setItem(COLLAPSE_KEY, collapsed);
  });

  // 2-way sync pairs: [floatingId, settingsId, formatFn]
  const pairs = [
    ['fp-market-trust-slider', 'market-trust-slider', v => v + '%'],
    ['fp-rho-slider', 'rho-slider', v => parseFloat(v).toFixed(2)],
    ['fp-form-boost-slider', 'form-boost-slider', v => v + '%'],
    ['fp-prior-weight-slider', 'prior-weight-slider', v => v],
    ['fp-prev-season-slider', 'prev-season-slider', v => v + '%'],
  ];

  for (const [fpId, settId, fmt] of pairs) {
    const fp = document.getElementById(fpId);
    const sett = document.getElementById(settId);
    const fpLabel = document.getElementById(fpId.replace('-slider', '-value'));
    const settLabel = document.getElementById(settId.replace('-slider', '-value'));
    if (!fp || !sett) continue;

    // Floating → Settings
    fp.addEventListener('input', () => {
      sett.value = fp.value;
      if (fpLabel) fpLabel.textContent = fmt(fp.value);
      if (settLabel) settLabel.textContent = fmt(fp.value);
      sett.dispatchEvent(new Event('input', { bubbles: true }));
    });

    // Settings → Floating
    sett.addEventListener('input', () => {
      fp.value = sett.value;
      if (fpLabel) fpLabel.textContent = fmt(sett.value);
    });
  }
}

/* === Help Modal System === */

const helpContent = {
  'about': {
    title: 'About BettingPro',
    body: `
<p><strong>BettingPro</strong> is a sports betting probability calculator that uses statistical modelling to find value bets — situations where the bookmaker's odds are higher than our model suggests they should be.</p>

<div class="help-section">
  <p><strong>What the model does:</strong></p>
  <ul>
    <li>Predicts the probability of every possible scoreline for each match</li>
    <li>Compares those probabilities against bookmaker odds to identify edges</li>
    <li>Calculates optimal bet sizing using the Kelly Criterion</li>
  </ul>
</div>

<div class="help-section">
  <p><strong>Statistical methods used:</strong></p>
  <ul>
    <li><strong>Poisson regression</strong> — models expected goals for each team based on attack and defense strengths, estimated from historical match results with time-decay weighting (recent matches count more)</li>
    <li><strong>Dixon-Coles correction</strong> — adjusts for the known correlation in low-scoring games (0-0, 1-0, 0-1, 1-1 scorelines occur more often than independent Poisson predicts)</li>
    <li><strong>Elo ratings</strong> — a power ranking system where teams gain/lose points based on match results. Used to estimate relative team strength, especially useful early in the season</li>
    <li><strong>Bayesian shrinkage</strong> — prevents extreme predictions when data is limited by pulling estimates toward league averages. The model becomes more confident as more matches are played</li>
    <li><strong>Shin's method</strong> — removes the bookmaker's margin from odds to extract their true implied probabilities. Applied to both 1X2 and Over/Under markets</li>
    <li><strong>Market blending</strong> — combines the statistical model's predictions with bookmaker-implied probabilities. The blend automatically shifts from market-heavy (early season) to model-heavy (late season) as more data accumulates</li>
  </ul>
</div>

<div class="help-section">
  <p><strong>Data inputs:</strong></p>
  <ul>
    <li>Historical match results (scores, dates, venues)</li>
    <li>Bookmaker odds from multiple sources (Veikkaus, Pinnacle, Bet365, and others)</li>
    <li>Previous season results for Elo carryover between seasons</li>
  </ul>
</div>

<div class="help-section">
  <p><strong>Key features:</strong></p>
  <ul>
    <li><strong>Score matrix</strong> — 7x7 grid of predicted scoreline probabilities</li>
    <li><strong>Value bets</strong> — outcomes where our model disagrees with the bookmaker in your favor</li>
    <li><strong>Fades</strong> — outcomes the bookmaker overvalues, with suggested counter-bets</li>
    <li><strong>Bookmaker comparison</strong> — find the best odds across all available bookmakers</li>
    <li><strong>Kelly staking</strong> — mathematically optimal bet sizing scaled to your bankroll and risk tolerance</li>
    <li><strong>Prediction tracker</strong> — walk-forward accuracy evaluation (no future data leakage)</li>
    <li><strong>P/L simulation</strong> — simulated season returns from following the model's value bets</li>
  </ul>
</div>

<div class="help-section">
  <p><strong>Adjustable settings:</strong></p>
  <p>All model parameters can be tuned via sliders in the Settings panel. Market Trust and Previous Season auto-adjust based on how many matches have been played. Click the <strong>?</strong> button next to any section or setting for detailed explanations.</p>
</div>

<div class="help-section">
  <p><strong>Important:</strong> No model can predict sports with certainty. Value betting is a long-term strategy — individual bets can and will lose. Always bet responsibly and only with money you can afford to lose.</p>
</div>

<hr>
<p><strong>Suomeksi:</strong></p>

<p><strong>BettingPro</strong> on urheiluvedonlyönnin todennäköisyyslaskuri, joka käyttää tilastollista mallinnusta arvovedosten löytämiseen — tilanteisiin, joissa vedonvälittäjän kertoimet ovat korkeammat kuin mallimme ennustaa.</p>

<div class="help-section">
  <p><strong>Mitä malli tekee:</strong></p>
  <ul>
    <li>Ennustaa jokaisen mahdollisen lopputuloksen todennäköisyyden jokaiselle ottelulle</li>
    <li>Vertaa todennäköisyyksiä vedonvälittäjän kertoimiin löytääkseen etuja</li>
    <li>Laskee optimaalisen panostuksen Kelly-kriteerin avulla</li>
  </ul>
</div>

<div class="help-section">
  <p><strong>Käytetyt tilastolliset menetelmät:</strong></p>
  <ul>
    <li><strong>Poisson-regressio</strong> — mallintaa joukkueiden odotetut maalit hyökkäys- ja puolustusvahvuuksien perusteella, aikahajautetulla painotuksella (viimeaikaiset ottelut painottuvat enemmän)</li>
    <li><strong>Dixon-Coles-korjaus</strong> — korjaa tunnettua korrelaatiota vähämaalisissa otteluissa (0-0, 1-0, 0-1, 1-1 esiintyvät useammin kuin itsenäinen Poisson ennustaa)</li>
    <li><strong>Elo-luokitus</strong> — voimasuhdelista, jossa joukkueet saavat/menettävät pisteitä ottelutulosten perusteella. Erityisen hyödyllinen kauden alussa</li>
    <li><strong>Bayesiläinen kutistus</strong> — estää äärimmäiset ennusteet rajoitetulla datalla vetämällä arviot kohti sarjan keskiarvoja</li>
    <li><strong>Shinin menetelmä</strong> — poistaa vedonvälittäjän marginaalin kertoimista todellisten todennäköisyyksien selvittämiseksi</li>
    <li><strong>Markkinasekoitus</strong> — yhdistää mallin ennusteet ja vedonvälittäjän todennäköisyydet. Painotus siirtyy automaattisesti markkinapainotteisesta (kauden alku) mallipainotteiseen (kauden loppu)</li>
  </ul>
</div>

<div class="help-section">
  <p><strong>Datalähteet:</strong></p>
  <ul>
    <li>Historialliset ottelutulokset (tulokset, päivämäärät, paikat)</li>
    <li>Vedonvälittäjien kertoimet useista lähteistä (Veikkaus, Pinnacle, Bet365 ym.)</li>
    <li>Edellisen kauden tulokset Elo-siirtoa varten</li>
  </ul>
</div>

<div class="help-section">
  <p><strong>Keskeiset ominaisuudet:</strong></p>
  <ul>
    <li><strong>Tulosmatriisi</strong> — 7x7 ruudukko ennustetuista tulosten todennäköisyyksistä</li>
    <li><strong>Arvovedot</strong> — lopputulokset, joissa malli on eri mieltä vedonvälittäjän kanssa sinun eduksesi</li>
    <li><strong>Fadet</strong> — lopputulokset, jotka vedonvälittäjä yliarvostaa, vastavedosehdotuksineen</li>
    <li><strong>Vedonvälittäjävertailu</strong> — löydä parhaat kertoimet kaikilta vedonvälittäjiltä</li>
    <li><strong>Kelly-panostus</strong> — matemaattisesti optimaalinen panostus pankkisi ja riskinsietokykysi mukaan</li>
    <li><strong>Ennusteseuranta</strong> — eteenpäin kulkeva tarkkuusarviointi (ei tulevaisuuden datavuotoa)</li>
    <li><strong>Tuottosimulatio</strong> — simuloitu kauden tuotto mallin arvovetojen seuraamisesta</li>
  </ul>
</div>

<div class="help-section">
  <p><strong>Säädettävät asetukset:</strong></p>
  <p>Kaikkia mallin parametreja voi säätää liukusäätimillä Asetukset-paneelissa. Markkinoiden luottamus ja Edellinen kausi säätyvät automaattisesti pelattujen otteluiden mukaan. Klikkaa <strong>?</strong>-painiketta minkä tahansa osion vierestä saadaksesi yksityiskohtaisen selityksen.</p>
</div>

<div class="help-section">
  <p><strong>Tärkeää:</strong> Mikään malli ei voi ennustaa urheilua varmasti. Arvovedot ovat pitkän aikavälin strategia — yksittäiset vedot voivat ja tulevat häviämään. Lyö vetoa vastuullisesti ja vain rahalla, jonka voit hävitä.</p>
</div>
    `,
  },
  'market-trust': {
    title: 'Market Trust',
    body: `
      <p><strong>What it does:</strong> Controls the balance between bookmaker odds and our statistical model (Poisson + Elo) when calculating predictions.</p>
      <p><strong>Higher values (70-100%):</strong> Rely more on the betting market. Bookmaker odds reflect massive amounts of data, sharp money, and insider knowledge. Best choice <strong>early in the season</strong> when few matches have been played and our model has limited data.</p>
      <p><strong>Lower values (0-30%):</strong> Rely more on our Poisson/Elo model. As the season progresses and more match results accumulate, our model becomes more accurate and can spot edges the market may miss.</p>
      <div class="help-section">
        <p><strong>How it works under the hood:</strong></p>
        <ul>
          <li>The slider maps to a "trust threshold" — at 50%, the model needs ~30 played matches to reach equal weight with the market</li>
          <li>Formula: <code>model weight = matches / (matches + threshold)</code></li>
          <li>At 0% market trust (threshold=5), even a few matches make the model dominant</li>
          <li>At 100% market trust (threshold=200), the model needs 200 matches to reach 50% weight</li>
        </ul>
      </div>
      <div class="help-section">
        <p><strong>Auto-adjustment:</strong> The default value automatically changes as the season progresses — starts high (trust market) and decreases as more matches are played. You can override it manually at any time.</p>
      </div>
      <div class="help-section">
        <p><strong>Recommendation:</strong> Leave it on auto (default) unless you have a specific reason to override. If you believe bookmaker odds are particularly sharp for a league, increase it. If you think your model has an edge, decrease it.</p>
      </div>

      <hr>
      <p><strong>Suomeksi:</strong></p>
      <p><strong>Mitä tekee:</strong> Säätää tasapainoa vedonvälittäjän kertoimien ja tilastollisen mallimme (Poisson + Elo) välillä ennusteita laskettaessa.</p>
      <p><strong>Korkeat arvot (70-100%):</strong> Luota enemmän vedonlyöntimarkkinoihin. Vedonvälittäjän kertoimet heijastavat valtavaa datamäärää ja ammattilaisten rahaa. Paras valinta <strong>kauden alussa</strong>, kun otteluita on pelattu vähän.</p>
      <p><strong>Matalat arvot (0-30%):</strong> Luota enemmän Poisson/Elo-malliimme. Kauden edetessä mallimme tarkentuu ja voi löytää etuja, joita markkinat eivät huomaa.</p>
      <div class="help-section">
        <p><strong>Automaattisäätö:</strong> Oletusarvo muuttuu automaattisesti kauden edetessä — alkaa korkealta (luota markkinoihin) ja laskee otteluiden kertyessä. Voit ohittaa sen manuaalisesti milloin tahansa.</p>
      </div>
      <div class="help-section">
        <p><strong>Suositus:</strong> Jätä automaattiasetukselle, ellei sinulla ole erityistä syytä muuttaa. Jos uskot vedonvälittäjän kertoimien olevan erityisen tarkkoja, nosta arvoa. Jos uskot mallin löytävän etuja, laske arvoa.</p>
      </div>
    `,
  },
  'prev-season': {
    title: 'Previous Season Weight',
    body: `
      <p><strong>What it does:</strong> Controls how much last season's Elo ratings carry over to the current season. Teams that performed well last year start with higher ratings, giving them a head start in predictions.</p>
      <p><strong>Higher values (70-100%):</strong> Strong carryover — last season's top teams are clearly favored in early-season predictions. Useful at the start of the season when current data is scarce.</p>
      <p><strong>Lower values (0-20%):</strong> Minimal carryover — all teams start near equal (Elo 1500). Useful later in the season when current results tell the full story.</p>
      <div class="help-section">
        <p><strong>How it works:</strong></p>
        <ul>
          <li>End-of-season Elo ratings from last year are loaded</li>
          <li>The slider controls how much those ratings are "regressed toward the mean" (pulled back toward 1500)</li>
          <li>At 100%: full carryover, no regression — a team rated 1600 stays at 1600</li>
          <li>At 50%: half regression — a team rated 1600 becomes 1550</li>
          <li>At 0%: full regression — all teams start at 1500 regardless of last season</li>
        </ul>
      </div>
      <div class="help-section">
        <p><strong>Auto-adjustment:</strong> The default value decreases rapidly as the season progresses. With ~48 matches played (about round 8), the slider reaches 0% because the current season model has enough data to stand on its own.</p>
      </div>
      <div class="help-section">
        <p><strong>Recommendation:</strong> Leave on auto. Increase manually if you believe last season's results are strongly predictive (stable rosters). Decrease if many teams had major squad changes.</p>
      </div>

      <hr>
      <p><strong>Suomeksi:</strong></p>
      <p><strong>Mitä tekee:</strong> Säätää kuinka paljon edellisen kauden Elo-luokituksia siirretään kuluvalle kaudelle. Hyvin menestyneet joukkueet aloittavat korkeammilla luokituksilla.</p>
      <p><strong>Korkeat arvot (70-100%):</strong> Vahva siirto — edellisen kauden kärkijoukkueet ovat selvästi suosikkeja kauden alussa.</p>
      <p><strong>Matalat arvot (0-20%):</strong> Minimaalinen siirto — kaikki joukkueet aloittavat läheltä tasapisteiltä (Elo 1500).</p>
      <div class="help-section">
        <p><strong>Miten toimii:</strong></p>
        <ul>
          <li>Edellisen kauden lopulliset Elo-luokitukset ladataan</li>
          <li>Liukusäädin säätää kuinka paljon luokitukset "regressoituvat keskiarvoa kohti" (vedetään takaisin kohti 1500:aa)</li>
          <li>100%: täysi siirto — 1600-luokitteinen joukkue pysyy 1600:ssa</li>
          <li>50%: puolikas regressio — 1600:sta tulee 1550</li>
          <li>0%: täysi regressio — kaikki joukkueet aloittavat 1500:sta</li>
        </ul>
      </div>
      <div class="help-section">
        <p><strong>Automaattisäätö:</strong> Oletusarvo laskee nopeasti kauden edetessä. Noin 48 pelatun ottelun (kierros 8) kohdalla arvo on 0%, koska kuluvan kauden data riittää.</p>
      </div>
      <div class="help-section">
        <p><strong>Suositus:</strong> Jätä automaattiasetukselle. Nosta manuaalisesti, jos uskot edellisen kauden tulosten ennustavan hyvin (vakaat kokoonpanot). Laske, jos monilla joukkueilla on suuria kokoonpanomuutoksia.</p>
      </div>
    `,
  },
  'rho': {
    title: 'Low-Score Correction (Dixon-Coles)',
    body: `
      <p><strong>What it does:</strong> Adjusts the probability of low-scoring results (0-0, 1-0, 0-1, 1-1) which the basic Poisson model tends to get wrong.</p>
      <p><strong>The problem:</strong> A standard Poisson model assumes home and away goals are independent. In reality, they're correlated in low-scoring games — when one team sits back defensively, both teams tend to score fewer goals. This means 0-0 draws and 1-0 results happen more often than pure Poisson predicts.</p>
      <div class="help-section">
        <p><strong>How the rho parameter works:</strong></p>
        <ul>
          <li><strong>-0.13 (default):</strong> Standard correction calibrated for most European leagues. Increases probability of 0-0 and 1-1, slightly adjusts 1-0 and 0-1</li>
          <li><strong>More negative (-0.20 to -0.30):</strong> Stronger correction — pushes more probability toward draws and low-scoring results. Use for defensive leagues</li>
          <li><strong>0.00:</strong> No correction — pure independent Poisson. Use if you believe independence assumption holds</li>
        </ul>
      </div>
      <div class="help-section">
        <p><strong>Technical detail:</strong> This implements the Dixon & Coles (1997) correction factor that multiplies the probability of specific low scorelines:</p>
        <ul>
          <li>0-0: multiplied by <code>1 - lambdaH * lambdaA * rho</code></li>
          <li>1-0: multiplied by <code>1 + lambdaA * rho</code></li>
          <li>0-1: multiplied by <code>1 + lambdaH * rho</code></li>
          <li>1-1: multiplied by <code>1 - rho</code></li>
        </ul>
        <p>Where lambdaH and lambdaA are the expected goals for home and away teams.</p>
      </div>
      <div class="help-section">
        <p><strong>Recommendation:</strong> Keep the default -0.13 for most leagues. Only adjust if you have strong evidence that a specific league has unusually high or low draw rates.</p>
      </div>

      <hr>
      <p><strong>Suomeksi:</strong></p>
      <p><strong>Mitä tekee:</strong> Säätää vähämaalisten tulosten (0-0, 1-0, 0-1, 1-1) todennäköisyyttä, joita perus-Poisson-malli arvioi väärin.</p>
      <p><strong>Ongelma:</strong> Perus-Poisson olettaa koti- ja vierasmaalien olevan toisistaan riippumattomia. Todellisuudessa ne korreloivat vähämaalisissa peleissä — kun joukkue puolustaa matalalla, molemmat tekevät vähemmän maaleja. Siksi 0-0 ja 1-0 tulokset esiintyvät useammin kuin Poisson ennustaa.</p>
      <div class="help-section">
        <p><strong>Rho-parametri:</strong></p>
        <ul>
          <li><strong>-0.13 (oletus):</strong> Eurooppalaisille sarjoille kalibroitu vakiokorjaus</li>
          <li><strong>Negatiivisempi (-0.20 – -0.30):</strong> Vahvempi korjaus — enemmän todennäköisyyttä tasapeleille. Puolustaville sarjoille</li>
          <li><strong>0.00:</strong> Ei korjausta — puhdas itsenäinen Poisson</li>
        </ul>
      </div>
      <div class="help-section">
        <p><strong>Suositus:</strong> Pidä oletusarvo -0.13 useimmille sarjoille. Säädä vain, jos sarjassa on poikkeuksellisen korkea tai matala tasapelimäärä.</p>
      </div>
    `,
  },
  'form-boost': {
    title: 'Form Boost',
    body: `
      <p><strong>What it does:</strong> Adjusts predicted goal expectancy for teams on hot or cold streaks (3+ consecutive wins or losses).</p>
      <p><strong>The problem:</strong> Early in the season, Bayesian shrinkage weights priors heavily because there's limited match data. Teams on form streaks (e.g. a promoted team winning their first 3 games) aren't reflected quickly enough in the base model.</p>
      <div class="help-section">
        <p><strong>How it works:</strong></p>
        <ul>
          <li>Teams on a <strong>3+ win streak</strong> get their attack lambda boosted</li>
          <li>Teams on a <strong>3+ loss streak</strong> get their attack lambda penalized</li>
          <li>A single draw breaks any streak — W-W-W-D resets to no boost</li>
          <li>Draw streaks themselves have no effect</li>
          <li>Streak count is capped at 3 in the formula (W5 gives the same boost as W3)</li>
        </ul>
      </div>
      <div class="help-section">
        <p><strong>Slider values:</strong></p>
        <ul>
          <li><strong>0%:</strong> No form adjustment — pure base model</li>
          <li><strong>3% (default):</strong> +9% attack boost for W3+ streak, -9% for L3+</li>
          <li><strong>5% (max):</strong> +15% attack boost for W3+ streak, -15% for L3+</li>
        </ul>
      </div>
      <div class="help-section">
        <p><strong>Formula:</strong> <code>multiplier = 1 ± min(streakCount, 3) × formBoost%</code></p>
      </div>

      <hr>
      <p><strong>Suomeksi:</strong></p>
      <p><strong>Mitä tekee:</strong> Säätää ennustettua maalimäärää joukkueille, joilla on kuuma tai kylmä putki (3+ peräkkäistä voittoa tai tappiota).</p>
      <p><strong>Ongelma:</strong> Kauden alussa Bayesilainen kutistus painottaa ennakkotietoja voimakkaasti. Putkessa olevat joukkueet eivät näy perusmallissa tarpeeksi nopeasti.</p>
      <div class="help-section">
        <p><strong>Miten toimii:</strong></p>
        <ul>
          <li>3+ voittoputkessa oleville joukkueille hyökkäys-lambdaa nostetaan</li>
          <li>3+ tappioputkessa oleville hyökkäys-lambdaa lasketaan</li>
          <li>Yksikin tasapeli katkaisee putken — W-W-W-D nollaa boostin</li>
          <li>Tasapeliputki itsessään ei vaikuta</li>
          <li>Putken pituus rajoitetaan 3:een kaavassa (W5 = sama kuin W3)</li>
        </ul>
      </div>
      <div class="help-section">
        <p><strong>Liukusäätimen arvot:</strong></p>
        <ul>
          <li><strong>0%:</strong> Ei viresäätöä</li>
          <li><strong>3% (oletus):</strong> +9% hyökkäysboosti W3+ putkelle</li>
          <li><strong>5% (max):</strong> +15% hyökkäysboosti W3+ putkelle</li>
        </ul>
      </div>
    `,
  },
  'prior-weight': {
    title: 'Bayesian Prior Weight',
    body: `
      <p><strong>What it does:</strong> Controls how much team attack/defense estimates are pulled toward the league average when data is limited. Higher values = stronger pull toward average (safer, less extreme); lower values = trust raw data more (riskier, sharper).</p>
      <div class="help-section">
        <p><strong>How it works:</strong></p>
        <ul>
          <li>Each team's attack and defense strengths are estimated from match results</li>
          <li>With few matches, raw estimates can be wild — a team that scored 5 in their only game looks elite</li>
          <li>Bayesian shrinkage blends the raw estimate with the league average, weighted by sample size</li>
          <li>Formula: <code>effective = (raw × matches + prior × priorWeight) / (matches + priorWeight)</code></li>
          <li>As more matches are played, the raw data naturally dominates regardless of this setting</li>
        </ul>
      </div>
      <div class="help-section">
        <p><strong>Slider values:</strong></p>
        <ul>
          <li><strong>0:</strong> No shrinkage — trust raw data completely (volatile early in season)</li>
          <li><strong>5 (club default):</strong> Moderate shrinkage — good balance for domestic leagues with ~20-30 matches per team</li>
          <li><strong>8 (international default):</strong> Stronger shrinkage — compensates for sparse international fixture schedules</li>
          <li><strong>15 (max):</strong> Heavy shrinkage — predictions stay very close to league average</li>
        </ul>
      </div>
      <div class="help-section">
        <p><strong>When to adjust:</strong></p>
        <ul>
          <li>Increase early in the season to stabilize volatile predictions</li>
          <li>Decrease late in the season when you have plenty of data</li>
          <li>Decrease if you see a team whose true strength is clearly different from the league average</li>
        </ul>
      </div>
      <div class="help-section">
        <p><strong>Note:</strong> Automatically set to 0 when "Current Season Only" is active (no shrinkage in that mode).</p>
      </div>

      <hr>
      <p><strong>Suomeksi:</strong></p>
      <p><strong>Mitä tekee:</strong> Säätää kuinka paljon joukkueiden hyökkäys-/puolustusarviot vedetään kohti sarjan keskiarvoa, kun dataa on vähän. Korkeammat arvot = vahvempi veto keskiarvoa kohti (turvallisempi); matalammat arvot = luota raakadataan enemmän (jyrkempi).</p>
      <div class="help-section">
        <p><strong>Miten toimii:</strong></p>
        <ul>
          <li>Joukkueiden hyökkäys- ja puolustusvahvuudet arvioidaan ottelutuloksista</li>
          <li>Vähäisellä datalla raaka-arviot voivat olla villejä</li>
          <li>Bayesilainen kutistus sekoittaa raaka-arvion sarjan keskiarvoon ottelumäärän mukaan</li>
          <li>Kaava: <code>tehokas = (raaka × ottelut + priori × prioripaino) / (ottelut + prioripaino)</code></li>
        </ul>
      </div>
      <div class="help-section">
        <p><strong>Liukusäätimen arvot:</strong></p>
        <ul>
          <li><strong>0:</strong> Ei kutistusta — luota raakadataan (ailahteleva kauden alussa)</li>
          <li><strong>5 (seuraoletusarvo):</strong> Kohtuullinen kutistus — hyvä tasapaino kotimaisille sarjoille</li>
          <li><strong>8 (maajoukkueoletusarvo):</strong> Vahvempi kutistus — kompensoi harvojen maaotteluiden dataa</li>
          <li><strong>15 (max):</strong> Vahva kutistus — ennusteet pysyvät lähellä sarjan keskiarvoa</li>
        </ul>
      </div>
    `,
  },
  'season-only': {
    title: 'Current Season Only',
    body: `
      <p><strong>What it does:</strong> Overrides the prediction model to use <em>only</em> current season match data — no bookmaker odds, no previous season Elo carry, and no Bayesian shrinkage toward league averages.</p>
      <div class="help-section">
        <p><strong>What changes:</strong></p>
        <ul>
          <li><strong>Bookmaker odds ignored:</strong> Model probabilities come 100% from match statistics, not blended with market prices</li>
          <li><strong>No previous season:</strong> All teams start from Elo 1500 — only current season results matter</li>
          <li><strong>No Bayesian shrinkage:</strong> Team attack/defense stats are taken at face value, not pulled toward league average</li>
          <li><strong>Model-implied odds:</strong> Shown in the Match Outcome section as fair odds derived purely from the model</li>
        </ul>
      </div>
      <div class="help-section">
        <p><strong>When to use it:</strong></p>
        <ul>
          <li>A newly promoted team is outperforming bookmaker expectations</li>
          <li>You want to see what the raw data says without market influence</li>
          <li>Early season when bookmakers may be slow to adjust</li>
        </ul>
      </div>
      <div class="help-section">
        <p><strong>Caution:</strong> With few matches played, predictions will be volatile. For international leagues with very sparse fixtures, results may be unreliable.</p>
      </div>

      <hr>
      <p><strong>Suomeksi:</strong></p>
      <p><strong>Mitä tekee:</strong> Ohittaa ennustemallin ja käyttää <em>vain</em> kuluvan kauden otteludataa — ei vedonlyöntikertoimia, ei edellisen kauden Elo-siirtoa, eikä Bayesilaista kutistusta.</p>
      <div class="help-section">
        <p><strong>Mikä muuttuu:</strong></p>
        <ul>
          <li><strong>Kertoimet ohitetaan:</strong> Todennäköisyydet tulevat 100% ottelutilastoista</li>
          <li><strong>Ei edellistä kautta:</strong> Kaikki joukkueet aloittavat Elo 1500:sta</li>
          <li><strong>Ei Bayesilaista kutistusta:</strong> Hyökkäys-/puolustustilastot otetaan sellaisenaan</li>
          <li><strong>Mallin kertoimet:</strong> Näytetään Match Outcome -osiossa</li>
        </ul>
      </div>
      <div class="help-section">
        <p><strong>Milloin käyttää:</strong></p>
        <ul>
          <li>Noussut joukkue pelaa odotuksia paremmin</li>
          <li>Haluat nähdä mitä pelkkä data sanoo ilman markkinoiden vaikutusta</li>
          <li>Kauden alussa kun vedonlyöjät eivät ole vielä sopeutuneet</li>
        </ul>
      </div>
    `,
  },
  'match-depth': {
    title: 'Match Depth',
    body: `
      <p><strong>What it does:</strong> Controls how many recent matches are used to build team statistics when <em>Current Season Only</em> is active. Only available for international leagues.</p>
      <div class="help-section">
        <p><strong>Why it matters:</strong> International fixtures span multiple years and tournaments. Using all history (200+ matches) dilutes recent form. Limiting to the last 30–50 matches focuses on current team quality.</p>
      </div>
      <div class="help-section">
        <p><strong>Settings:</strong></p>
        <ul>
          <li><strong>All (200):</strong> Uses every match in the database — maximum data, slower to react to changes</li>
          <li><strong>50–100:</strong> Good balance — captures recent trends while having enough data for reliable stats</li>
          <li><strong>10–30:</strong> Very reactive — emphasises the latest form, but volatile with small samples</li>
        </ul>
      </div>

      <hr>
      <p><strong>Suomeksi:</strong></p>
      <p><strong>Mitä tekee:</strong> Säätää kuinka monta viimeisintä ottelua käytetään joukkuetilastojen laskemiseen kun <em>Vain kuluva kausi</em> on päällä. Käytettävissä vain kansainvälisissä sarjoissa.</p>
      <div class="help-section">
        <p><strong>Miksi tällä on väliä:</strong> Kansainväliset ottelut kattavat useita vuosia ja turnauksia. Kaiken historian käyttäminen laimentaa viimeaikaista virettä. Rajaaminen viimeisiin 30–50 otteluun keskittyy nykyiseen joukkueiden tasoon.</p>
      </div>
    `,
  },
  'kelly': {
    title: 'Kelly Fraction',
    body: `
      <p><strong>What it does:</strong> Controls how aggressively you bet when a value bet is found. Determines what percentage of the mathematically optimal Kelly stake to actually wager.</p>
      <p><strong>The Kelly Criterion:</strong> A formula that calculates the mathematically optimal bet size to maximize long-term bankroll growth: <code>f* = (b*p - q) / b</code> where b = decimal odds - 1, p = your probability of winning, q = 1 - p.</p>
      <div class="help-section">
        <p><strong>Why use a fraction?</strong></p>
        <ul>
          <li><strong>Full Kelly (100%):</strong> Maximizes theoretical long-term growth rate, but comes with extreme variance. Your bankroll can drop 50%+ before recovering. Requires perfectly accurate probability estimates — which we never have</li>
          <li><strong>Half Kelly (50%):</strong> 75% of full Kelly's growth rate but much smoother ride. Still aggressive for most bettors</li>
          <li><strong>Quarter Kelly (25%, default):</strong> Industry standard for professional bankroll management. Achieves ~50% of full Kelly's growth rate but with dramatically lower variance and risk of ruin</li>
          <li><strong>Tenth Kelly (10%):</strong> Very conservative. Tiny stakes, very slow growth, but virtually zero risk of significant drawdown</li>
        </ul>
      </div>
      <div class="help-section">
        <p><strong>Example:</strong> If full Kelly says bet 8% of your bankroll, and your Kelly Fraction is 25%, the suggested stake is 2% of your bankroll.</p>
      </div>
      <div class="help-section">
        <p><strong>Recommendation:</strong> 25% (quarter Kelly) is a solid default. Only increase if you have strong confidence in your probability estimates. Decrease if you want more conservative bankroll management or if you're uncertain about the model's accuracy.</p>
      </div>

      <hr>
      <p><strong>Suomeksi:</strong></p>
      <p><strong>Mitä tekee:</strong> Säätää kuinka aggressiivisesti panostat arvovedon löytyessä. Määrittää kuinka suuren osan matemaattisesti optimaalisesta Kelly-panoksesta todellisuudessa lyöt.</p>
      <p><strong>Kelly-kriteeri:</strong> Kaava, joka laskee matemaattisesti optimaalisen panostuksen pankin pitkän aikavälin kasvun maksimoimiseksi: <code>f* = (b*p - q) / b</code> missä b = kerroin - 1, p = voiton todennäköisyys, q = 1 - p.</p>
      <div class="help-section">
        <p><strong>Miksi käyttää murto-osaa?</strong></p>
        <ul>
          <li><strong>Täysi Kelly (100%):</strong> Maksimoi teoreettisen kasvuvauhdin, mutta varianssi on valtava. Pankki voi pudota yli 50% ennen palautumista</li>
          <li><strong>Puolikas Kelly (50%):</strong> 75% täyden Kellyn kasvuvauhdista, paljon tasaisempi kurvaus</li>
          <li><strong>Neljännes-Kelly (25%, oletus):</strong> Ammattilaisten standardi. ~50% kasvuvauhdista, dramaattisesti pienempi varianssi</li>
          <li><strong>Kymmenesosa-Kelly (10%):</strong> Hyvin konservatiivinen. Pienet panokset, hidas kasvu, lähes nolla riski merkittävään laskuun</li>
        </ul>
      </div>
      <div class="help-section">
        <p><strong>Esimerkki:</strong> Jos täysi Kelly sanoo panosta 8% pankistasi ja Kelly-murto-osa on 25%, ehdotettu panos on 2% pankistasi.</p>
      </div>
      <div class="help-section">
        <p><strong>Suositus:</strong> 25% (neljännes-Kelly) on hyvä oletus. Nosta vain jos luotat vahvasti todennäköisyysarvioihin. Laske konservatiivisempaan pankinhoitoon.</p>
      </div>
    `,
  },
  'bankroll': {
    title: 'Bankroll',
    body: `
      <p><strong>What it does:</strong> Your total betting budget in euros. Used exclusively to calculate the suggested stake amount for each bet.</p>
      <p><strong>Important:</strong> This setting only affects the "Stake" column in the value bets and all bets tables. It does <strong>not</strong> change any probabilities, edges, or Kelly percentages.</p>
      <div class="help-section">
        <p><strong>How stakes are calculated:</strong></p>
        <ul>
          <li>The Kelly Criterion determines what percentage of your bankroll to bet</li>
          <li>That percentage is scaled by the Kelly Fraction setting</li>
          <li>The final stake = bankroll &times; Kelly % &times; Kelly Fraction</li>
        </ul>
      </div>
      <div class="help-section">
        <p><strong>Example:</strong> With a 1000&euro; bankroll, Kelly Fraction 25%, and a bet where full Kelly recommends 8%:</p>
        <ul>
          <li>Stake = 1000 &times; 8% &times; 25% = <strong>20&euro;</strong></li>
        </ul>
      </div>
      <div class="help-section">
        <p><strong>Tip:</strong> Set this to your actual dedicated betting bankroll — the amount you've set aside specifically for betting and can afford to lose entirely. Never bet with money you can't afford to lose.</p>
      </div>

      <hr>
      <p><strong>Suomeksi:</strong></p>
      <p><strong>Mitä tekee:</strong> Vedonlyöntipankkisi euroissa. Käytetään ainoastaan ehdotetun panoksen laskemiseen.</p>
      <p><strong>Tärkeää:</strong> Tämä asetus vaikuttaa vain "Panos"-sarakkeeseen arvovedoissa. Se <strong>ei</strong> muuta todennäköisyyksiä, etuja tai Kelly-prosentteja.</p>
      <div class="help-section">
        <p><strong>Miten panokset lasketaan:</strong></p>
        <ul>
          <li>Kelly-kriteeri määrittää kuinka suuren osan pankistasi panostat</li>
          <li>Prosentti skaalataan Kelly-murto-osalla</li>
          <li>Lopullinen panos = pankki &times; Kelly-% &times; Kelly-murto-osa</li>
        </ul>
      </div>
      <div class="help-section">
        <p><strong>Esimerkki:</strong> 1000&euro; pankilla, 25% Kelly-murto-osalla, ja vedolla jossa täysi Kelly suosittelee 8%:</p>
        <ul>
          <li>Panos = 1000 &times; 8% &times; 25% = <strong>20&euro;</strong></li>
        </ul>
      </div>
      <div class="help-section">
        <p><strong>Vinkki:</strong> Aseta tämä todelliseen vedonlyöntipankkiisi — summaan, jonka olet varannut vedonlyöntiin ja jonka voit hävitä kokonaan.</p>
      </div>
    `,
  },
  'edge-threshold': {
    title: 'Minimum Edge Threshold',
    body: `
<p><strong>What it does:</strong> Filters the Value Bets table to only show bets where the edge exceeds this minimum percentage. Helps you focus on the strongest opportunities and ignore marginal edges that may be noise.</p>
<p><strong>How it works:</strong></p>
<ul>
  <li>Edge = our model's probability minus the bookmaker's fair probability</li>
  <li>At 0%: all positive-edge bets are shown (even tiny 0.1% edges)</li>
  <li>At 3% (default): only bets with 3%+ edge appear — a good balance of signal vs noise</li>
  <li>At 10%+: very selective, only strong disagreements with the bookmaker</li>
</ul>
<p><strong>Hidden bets:</strong> When bets are filtered out, a note at the bottom shows how many were hidden (e.g., "2 more bets below 5% edge threshold").</p>
<p><strong>Recommendation:</strong> Start at 3%. Increase to 5% if you want fewer, stronger bets. Decrease to 0% to see everything the model finds.</p>

<hr>
<p><strong>Suomeksi:</strong></p>
<p><strong>Mitä tekee:</strong> Suodattaa arvovedot näyttämään vain vedot, joissa etu ylittää tämän minimiprosenttirajan. Auttaa keskittymään vahvimpiin mahdollisuuksiin.</p>
<p><strong>Miten toimii:</strong></p>
<ul>
  <li>Etu = mallimme todennäköisyys miinus vedonvälittäjän reilutodennäköisyys</li>
  <li>0%: kaikki positiivisen edun vedot näytetään</li>
  <li>3% (oletus): vain 3%+ edun vedot näkyvät — hyvä tasapaino signaalin ja kohinan välillä</li>
  <li>10%+: hyvin valikoiva, vain vahvat erimielisyydet vedonvälittäjän kanssa</li>
</ul>
<p><strong>Piilotetut vedot:</strong> Suodatettujen vetojen määrä näytetään taulukon lopussa.</p>
<p><strong>Suositus:</strong> Aloita 3%:lla. Nosta 5%:iin, jos haluat vähemmän mutta vahvempia vetoja. Laske 0%:iin nähdäksesi kaiken.</p>
    `,
  },
  'settings': {
    title: 'Settings',
    body: `
<p>All sliders update predictions <strong>dynamically</strong> — the match list and analysis panel refresh in real-time as you drag. No need to press any button.</p>
<p><strong>Sliders:</strong></p>
<ul>
  <li><strong>Market Trust</strong> — controls how much weight bookmaker odds get in the blended prediction vs our statistical model. Auto-adjusts based on matches played: high early in the season (limited data), decreasing as more results come in</li>
  <li><strong>Previous Season</strong> — controls how much last season's Elo ratings carry over. Auto-adjusts: starts around 50% and drops to 0% by round 6 as current-season data takes over</li>
  <li><strong>Low-Score Correction (rho)</strong> — Dixon-Coles parameter adjusting for defensive correlations in low-scoring games. Default -0.13 is calibrated for European football leagues</li>
  <li><strong>Form Boost</strong> — adjusts predictions for teams on 3+ game win or loss streaks. Default 3% per streak game (max effect ±9%). Set to 0% to disable</li>
  <li><strong>Kelly Fraction</strong> — scales down the Kelly criterion bet sizing. Default 25% (quarter Kelly) is the industry standard for conservative bankroll management</li>
  <li><strong>Bankroll</strong> — your total betting budget. Only affects stake amounts in euros, not probabilities or edge calculations</li>
  <li><strong>Min. Edge</strong> — filters Value Bets to only show edges above this threshold. Default 3% removes noise from marginal edges</li>
</ul>
<p><strong>Auto-adjust:</strong> Market Trust and Previous Season sliders set themselves to sensible defaults when data loads. You can override them manually at any time — they won't reset until you reload the page.</p>

<hr>
<p><strong>Suomeksi:</strong></p>
<p>Kaikki liukusäätimet päivittävät ennusteet <strong>dynaamisesti</strong> — ottelulista ja analyysipaneeli päivittyvät reaaliajassa vetäessä. Ei tarvitse painaa mitään nappia.</p>
<p><strong>Liukusäätimet:</strong></p>
<ul>
  <li><strong>Markkinoiden luottamus</strong> — säätää vedonvälittäjän kertoimien painoa yhdistetyssä ennusteessa. Automaattisäätö pelattujen otteluiden mukaan</li>
  <li><strong>Edellinen kausi</strong> — säätää edellisen kauden Elo-luokitusten siirtoa. Laskee automaattisesti 0%:iin kierros 6:een mennessä</li>
  <li><strong>Vähämaalisten korjaus (rho)</strong> — Dixon-Coles-parametri puolustavien korrelaatioiden säätämiseen. Oletus -0.13</li>
  <li><strong>Vireboosti</strong> — säätää ennusteita joukkueille 3+ pelin voitto- tai tappioputkessa. Oletus 3% per putkipeli (max ±9%). Aseta 0% poistaaksesi käytöstä</li>
  <li><strong>Kelly-murto-osa</strong> — skaalaa Kelly-kriteerin panostusta. Oletus 25% on ammattilaisten standardi</li>
  <li><strong>Pankki</strong> — vedonlyöntibudjettisi. Vaikuttaa vain panosmääriin euroissa</li>
  <li><strong>Min. etu</strong> — suodattaa arvovedot näyttämään vain tämän rajan ylittävät edut. Oletus 3%</li>
</ul>
<p><strong>Automaattisäätö:</strong> Markkinoiden luottamus ja Edellinen kausi asettuvat järkeviin oletusarvoihin datan latautuessa. Voit ohittaa ne manuaalisesti milloin tahansa.</p>
    `,
  },
  'matches': {
    title: 'Matches',
    body: `
<p>The match list shows all matches for the selected season, grouped by date. Each match row has three columns:</p>
<p><strong>Prediction</strong> — our model's predicted most likely scoreline for the match. For finished matches, the prediction is color-coded:</p>
<div style="margin:12px 0;">
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
    <span style="display:inline-block;padding:2px 8px;border:1px solid rgba(251,191,36,0.5);border-radius:4px;color:#fbbf24;font-weight:700;background:rgba(251,191,36,0.18);box-shadow:0 0 6px rgba(251,191,36,0.3);font-family:monospace;">2-1</span>
    <span>Exact score — the predicted scoreline was exactly right</span>
  </div>
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
    <span style="display:inline-block;padding:2px 8px;border:1px solid rgba(16,185,129,0.4);border-radius:4px;color:#6ee7b7;font-weight:700;background:rgba(16,185,129,0.15);font-family:monospace;">2-1</span>
    <span>Correct outcome — the predicted 1X2 result matched the actual result</span>
  </div>
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
    <span style="display:inline-block;padding:2px 8px;border:1px solid rgba(239,68,68,0.3);border-radius:4px;color:#fca5a5;font-weight:700;background:rgba(239,68,68,0.15);font-family:monospace;">1-0</span>
    <span>Wrong outcome — the predicted 1X2 result did not match</span>
  </div>
</div>
<p><strong>1 X 2</strong> — predicted probabilities for Home Win (1), Draw (X), and Away Win (2). The most likely outcome is highlighted with a colored border:</p>
<div style="margin:12px 0;">
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
    <span style="display:inline-block;padding:2px 8px;border:2px solid #4ade80;border-radius:3px;color:#4ade80;font-weight:700;background:rgba(74,222,128,0.12);">45%+</span>
    <span>High confidence — our model is fairly sure about this outcome</span>
  </div>
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
    <span style="display:inline-block;padding:2px 8px;border:2px solid #fb923c;border-radius:3px;color:#fb923c;font-weight:700;background:rgba(251,146,60,0.12);">35–44%</span>
    <span>Medium confidence — competitive match, outcome less certain</span>
  </div>
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
    <span style="display:inline-block;padding:2px 8px;border:2px solid #f87171;border-radius:3px;color:#f87171;font-weight:700;background:rgba(248,113,113,0.12);">&lt;35%</span>
    <span>Low confidence — toss-up or the best outcome is still unlikely</span>
  </div>
</div>
<p>Below the probabilities, the bookmaker's decimal odds are shown (if available). On finished matches, the correct result column is highlighted in green.</p>
<p><strong>Streak badges</strong> appear next to team names on upcoming matches when a team has 3+ consecutive results of the same type:</p>
<div style="margin:12px 0;">
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
    <span style="display:inline-block;font-size:0.75rem;font-weight:700;padding:1px 6px;border-radius:3px;color:#4ade80;background:rgba(74,222,128,0.15);border:1px solid rgba(74,222,128,0.4);">W4</span>
    <span>Winning streak (4 wins in a row) — team is in strong form</span>
  </div>
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
    <span style="display:inline-block;font-size:0.75rem;font-weight:700;padding:1px 6px;border-radius:3px;color:#fbbf24;background:rgba(251,191,36,0.15);border:1px solid rgba(251,191,36,0.4);">D3</span>
    <span>Draw streak (3 draws in a row) — team is grinding out results</span>
  </div>
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
    <span style="display:inline-block;font-size:0.75rem;font-weight:700;padding:1px 6px;border-radius:3px;color:#f87171;background:rgba(248,113,113,0.15);border:1px solid rgba(248,113,113,0.4);">L3</span>
    <span>Losing streak (3 losses in a row) — team is struggling</span>
  </div>
</div>
<p>Long winning streaks can signal regression risk — even dominant teams eventually lose. When a streaking team has very short bookmaker odds, consider the Fades section for counter-bets.</p>
<p><strong>Under the hood:</strong> Predictions use a blended model incorporating goal averages, <strong>xG from shots</strong> (expected goals based on shot volume), <strong>Elo ratings</strong>, and bookmaker odds. The model also accounts for <strong>rest days</strong> — teams with shorter rest between matches get a slight penalty, while well-rested teams get a small boost.</p>
<p><strong>Result</strong> — the final score for finished matches. Click any match to open the full analysis.</p>
<p><strong>Odds movement arrows</strong> appear next to odds values on upcoming matches when the odds have changed since the last update:</p>
<div style="margin:12px 0;">
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
    <span style="color:#4ade80;font-size:0.75rem;">&#x25B2;</span>
    <span>Green up arrow — odds increased (better payout for bettors)</span>
  </div>
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
    <span style="color:#f87171;font-size:0.75rem;">&#x25BC;</span>
    <span>Red down arrow — odds decreased (worse payout for bettors)</span>
  </div>
</div>
<p>Arrows reflect changes across all bookmakers. Switch the bookmaker dropdown to see movement for each bookmaker individually.</p>
<p><strong>&#x26A1; ODDS MOVING badge</strong> appears when the consensus (average across all bookmakers) implied probability has shifted by more than 3% on any outcome, OR when any single bookmaker has moved more than 5%. A single bookmaker moving alone can be an early signal — sharp books like Pinnacle often move first before others follow.</p>
<div style="margin:12px 0;">
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
    <span style="display:inline-block;font-size:0.6rem;font-weight:700;padding:1px 5px;border-radius:3px;color:#fbbf24;background:rgba(251,191,36,0.15);border:1px solid rgba(251,191,36,0.4);">&#x26A1; ODDS MOVING</span>
    <span>Hover to see which outcomes shifted and by how much</span>
  </div>
</div>
<p><strong>Today's matches</strong> are highlighted in green and auto-scrolled into view on page load.</p>

<hr>
<p><strong>Suomeksi:</strong></p>
<p>Ottelulista näyttää kaikki kauden ottelut päivämäärän mukaan ryhmiteltyinä. Jokaisella ottelulla on kolme saraketta:</p>
<p><strong>Ennuste</strong> — mallimme ennustama todennäköisin lopputulos. Pelatuilla otteluilla ennuste on värikoodattu:</p>
<div style="margin:12px 0;">
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
    <span style="display:inline-block;padding:2px 8px;border:1px solid rgba(251,191,36,0.5);border-radius:4px;color:#fbbf24;font-weight:700;background:rgba(251,191,36,0.18);box-shadow:0 0 6px rgba(251,191,36,0.3);font-family:monospace;">2-1</span>
    <span>Täsmätulos — ennustettu tulos oli täsmälleen oikein</span>
  </div>
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
    <span style="display:inline-block;padding:2px 8px;border:1px solid rgba(16,185,129,0.4);border-radius:4px;color:#6ee7b7;font-weight:700;background:rgba(16,185,129,0.15);font-family:monospace;">2-1</span>
    <span>Oikea lopputulos — ennustettu 1X2-tulos vastasi todellista</span>
  </div>
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
    <span style="display:inline-block;padding:2px 8px;border:1px solid rgba(239,68,68,0.3);border-radius:4px;color:#fca5a5;font-weight:700;background:rgba(239,68,68,0.15);font-family:monospace;">1-0</span>
    <span>Väärä lopputulos — ennustettu 1X2-tulos ei vastannut</span>
  </div>
</div>
<p><strong>1 X 2</strong> — ennustetut todennäköisyydet kotivoidolle (1), tasapelille (X) ja vierasvoitolle (2). Todennäköisin lopputulos on korostettu värireunuksella:</p>
<div style="margin:12px 0;">
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
    <span style="display:inline-block;padding:2px 8px;border:2px solid #4ade80;border-radius:3px;color:#4ade80;font-weight:700;background:rgba(74,222,128,0.12);">45%+</span>
    <span>Korkea luottamus — malli on melko varma tästä lopputuloksesta</span>
  </div>
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
    <span style="display:inline-block;padding:2px 8px;border:2px solid #fb923c;border-radius:3px;color:#fb923c;font-weight:700;background:rgba(251,146,60,0.12);">35–44%</span>
    <span>Keskitason luottamus — tasainen ottelu, lopputulos epävarmempi</span>
  </div>
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
    <span style="display:inline-block;padding:2px 8px;border:2px solid #f87171;border-radius:3px;color:#f87171;font-weight:700;background:rgba(248,113,113,0.12);">&lt;35%</span>
    <span>Matala luottamus — tasapeli tai paras lopputulos on silti epätodennäköinen</span>
  </div>
</div>
<p>Todennäköisyyksien alla näytetään vedonvälittäjän desimaalikertoimet (jos saatavilla). Pelatuissa otteluissa oikea tulos on korostettu vihreällä.</p>
<p><strong>Putkimerkinnät</strong> näkyvät joukkueiden nimien vieressä tulevissa otteluissa, kun joukkueella on 3+ peräkkäistä samantyyppistä tulosta:</p>
<div style="margin:12px 0;">
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
    <span style="display:inline-block;font-size:0.75rem;font-weight:700;padding:1px 6px;border-radius:3px;color:#4ade80;background:rgba(74,222,128,0.15);border:1px solid rgba(74,222,128,0.4);">W4</span>
    <span>Voittoputki (4 voittoa putkeen) — joukkue on hyvässä vireessä</span>
  </div>
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
    <span style="display:inline-block;font-size:0.75rem;font-weight:700;padding:1px 6px;border-radius:3px;color:#fbbf24;background:rgba(251,191,36,0.15);border:1px solid rgba(251,191,36,0.4);">D3</span>
    <span>Tasapeliputki (3 tasapeliä putkeen)</span>
  </div>
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
    <span style="display:inline-block;font-size:0.75rem;font-weight:700;padding:1px 6px;border-radius:3px;color:#f87171;background:rgba(248,113,113,0.15);border:1px solid rgba(248,113,113,0.4);">L3</span>
    <span>Tappioputki (3 tappiota putkeen) — joukkue kärsii</span>
  </div>
</div>
<p>Pitkät voittoputket voivat ennakoida regressiota — dominoivatkin joukkueet häviävät lopulta. Kun putkijoukkueella on hyvin matalat kertoimet, harkitse Fadet-osiota vastavedoille.</p>
<p><strong>Tulos</strong> — lopputulos pelatuille otteluille. Klikkaa mitä tahansa ottelua avataksesi täyden analyysin.</p>
<p><strong>Kerroinmuutokset</strong> näkyvät nuolina kertoimien vieressä tulevissa otteluissa, kun kertoimet ovat muuttuneet edellisen päivityksen jälkeen:</p>
<div style="margin:12px 0;">
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
    <span style="color:#4ade80;font-size:0.75rem;">&#x25B2;</span>
    <span>Vihreä ylänuoli — kerroin noussut (parempi tuotto vedonlyöjälle)</span>
  </div>
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
    <span style="color:#f87171;font-size:0.75rem;">&#x25BC;</span>
    <span>Punainen alanuoli — kerroin laskenut (huonompi tuotto vedonlyöjälle)</span>
  </div>
</div>
<p>Nuolet toimivat kaikilla vedonvälittäjillä. Vaihda vedonvälittäjää pudotusvalikosta nähdäksesi kunkin välittäjän muutokset.</p>
<p><strong>&#x26A1; ODDS MOVING -merkintä</strong> ilmestyy kun konsensuksen (kaikkien vedonvälittäjien keskiarvo) todennäköisyys on muuttunut yli 3% jollakin lopputuloksella, TAI kun yksittäinen vedonvälittäjä on liikkunut yli 5%. Yksittäisen välittäjän liike voi olla varhainen signaali — terävät kirjat kuten Pinnacle liikkuvat usein ensin ennen muita.</p>
<div style="margin:12px 0;">
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
    <span style="display:inline-block;font-size:0.6rem;font-weight:700;padding:1px 5px;border-radius:3px;color:#fbbf24;background:rgba(251,191,36,0.15);border:1px solid rgba(251,191,36,0.4);">&#x26A1; ODDS MOVING</span>
    <span>Vie hiiri päälle nähdäksesi mitkä lopputulokset muuttuivat ja kuinka paljon</span>
  </div>
</div>
<p><strong>Päivän ottelut</strong> korostetaan vihreällä ja näytetään automaattisesti sivun latautuessa.</p>
    `,
  },
  'score-matrix': {
    title: 'Score Matrix',
    body: `
<p>A 7x7 grid showing the predicted probability of every possible scoreline from 0-0 to 6-6.</p>
<p><strong>How it's built:</strong></p>
<ul>
  <li>Each cell = <em>P(Home scores i) x P(Away scores j)</em> using Poisson distribution</li>
  <li>Expected goals are derived from team attack/defense strengths, blended with <strong>xG from shots</strong> (when shot data is available) and <strong>Elo ratings</strong></li>
  <li>A <strong>rest days</strong> adjustment is applied: teams with short rest get slightly lower expected goals, well-rested teams get a small boost</li>
  <li>Low-scoring cells (0-0, 1-0, 0-1, 1-1) are adjusted by the <strong>Dixon-Coles correction</strong> to account for defensive correlations</li>
  <li>The entire matrix is <strong>rescaled</strong> so the 1X2 totals match the blended prediction (model + market odds)</li>
</ul>
<p><strong>Reading the matrix:</strong></p>
<ul>
  <li>Home team goals are on the vertical axis (left), away team goals on the horizontal axis (top)</li>
  <li>Brighter/higher cells indicate more likely scorelines</li>
  <li>The highlighted cell is the single most probable scoreline</li>
</ul>
<p><strong>Why the prediction and most likely scoreline can differ:</strong></p>
<p>The predicted score (shown in the match list) is the most likely scoreline <em>within the predicted outcome</em>. For example, if the model predicts an away win (43%), the predicted score will be the most likely away-win scoreline (e.g. 1-2 at 11.2%) — even if a draw scoreline like 1-1 (12.9%) is the single most probable score overall.</p>
<p>This is because draws split their probability across fewer scorelines (0-0, 1-1, 2-2...), making individual draw scores appear high. But when you add up <em>all</em> away-win scorelines (0-1, 0-2, 1-2, 1-3...), the total away-win probability can be much higher than the total draw probability. The prediction reflects this overall picture.</p>

<hr>
<p><strong>Suomeksi:</strong></p>
<p>7x7-ruudukko, joka näyttää jokaisen mahdollisen lopputuloksen ennustetun todennäköisyyden 0-0:sta 6-6:een.</p>
<p><strong>Miten se rakennetaan:</strong></p>
<ul>
  <li>Jokainen solu = <em>P(Koti tekee i) x P(Vieras tekee j)</em> Poisson-jakaumalla</li>
  <li>Odotetut maalit johdetaan joukkueiden hyökkäys-/puolustusvahvuuksista, yhdistettynä <strong>xG:hen laukaisuista</strong> ja <strong>Elo-luokituksiin</strong></li>
  <li><strong>Lepopäivien</strong> säätö: lyhyellä levolla pelaavat joukkueet saavat hieman matalammat odotetut maalit</li>
  <li>Vähämaaliset solut (0-0, 1-0, 0-1, 1-1) säädetään <strong>Dixon-Coles-korjauksella</strong></li>
  <li>Koko matriisi <strong>skaalataan uudelleen</strong> vastaamaan yhdistettyä 1X2-ennustetta</li>
</ul>
<p><strong>Matriisin lukeminen:</strong></p>
<ul>
  <li>Kotijoukkueen maalit ovat pystyakselilla (vasemmalla), vierasjoukkueen vaakaakselilla (ylhäällä)</li>
  <li>Kirkkaammat/korkeammat solut ovat todennäköisempiä</li>
  <li>Korostettu solu on yksittäisesti todennäköisin tulos</li>
</ul>
<p><strong>Miksi ennuste ja todennäköisin tulos voivat erota:</strong></p>
<p>Ennustettu tulos (ottelulistassa) on todennäköisin lopputulos <em>ennustetun lopputuloksen sisällä</em>. Esimerkiksi jos malli ennustaa vierasvoittoa (43%), ennustettu tulos on todennäköisin vierasvoittotulos (esim. 1-2, 11.2%) — vaikka tasapelitulos kuten 1-1 (12.9%) olisi yksittäisesti todennäköisin.</p>
<p>Tämä johtuu siitä, että tasapelit jakautuvat harvempiin tuloksiin (0-0, 1-1, 2-2...), jolloin yksittäiset tasapelitulokset vaikuttavat korkeilta. Mutta kun lasketaan yhteen <em>kaikki</em> vierasvoittotulokset (0-1, 0-2, 1-2, 1-3...), vierasvoiton kokonaistodennäköisyys voi olla paljon korkeampi. Ennuste heijastaa tätä kokonaiskuvaa.</p>
    `,
  },
  'match-outcome': {
    title: 'Match Outcome',
    body: `
<p>Shows the predicted probability for each match result: <strong>Home Win (1)</strong>, <strong>Draw (X)</strong>, and <strong>Away Win (2)</strong>.</p>
<p><strong>Colored bar</strong> = our model's predicted probability (blended Poisson + Elo + market odds).</p>
<p><strong>Dotted line</strong> = the bookmaker's fair probability (margin removed via Shin's method). This is the bookmaker's true estimate of each outcome's likelihood.</p>
<p><strong>How to read the gap:</strong></p>
<ul>
  <li>Bar extends <strong>past</strong> the dotted line → our model thinks this outcome is <em>more likely</em> than the bookmaker does → potential <strong>value bet</strong></li>
  <li>Bar stops <strong>before</strong> the dotted line → the bookmaker thinks this outcome is <em>more likely</em> than our model does → bookmaker <strong>overvalues</strong> this outcome (fade candidate)</li>
  <li>Bar and dotted line <strong>align</strong> → our model and the bookmaker roughly agree</li>
</ul>
<p>The bigger the gap between the bar and the dotted line, the stronger the disagreement — and the bigger the potential edge.</p>

<hr>
<p><strong>Suomeksi:</strong></p>
<p>Näyttää ennustetun todennäköisyyden jokaiselle ottelutulokselle: <strong>Kotivoitto (1)</strong>, <strong>Tasapeli (X)</strong> ja <strong>Vierasvoitto (2)</strong>.</p>
<p><strong>Värillinen palkki</strong> = mallimme ennustama todennäköisyys (yhdistetty Poisson + Elo + markkinakertoimet).</p>
<p><strong>Pisteviiva</strong> = vedonvälittäjän reilutodennäköisyys (marginaali poistettu Shinin menetelmällä). Tämä on vedonvälittäjän todellinen arvio lopputuloksen todennäköisyydestä.</p>
<p><strong>Miten lukea eroa:</strong></p>
<ul>
  <li>Palkki ulottuu pisteviivan <strong>ohi</strong> → mallimme pitää tätä lopputulosta <em>todennäköisempänä</em> kuin vedonvälittäjä → potentiaalinen <strong>arvoveto</strong></li>
  <li>Palkki jää pisteviivan <strong>alle</strong> → vedonvälittäjä pitää tätä <em>todennäköisempänä</em> kuin mallimme → vedonvälittäjä <strong>yliarvostaa</strong> tätä lopputulosta (fade-ehdokas)</li>
  <li>Palkki ja pisteviiva <strong>kohdakkain</strong> → mallimme ja vedonvälittäjä ovat suunnilleen samaa mieltä</li>
</ul>
<p>Mitä suurempi ero palkin ja pisteviivan välillä, sitä vahvempi erimielisyys — ja sitä suurempi potentiaalinen etu.</p>
    `,
  },
  'over-under': {
    title: 'Over/Under',
    body: `
<p>Predicts whether the total goals in the match will be over or under a specific line (1.5, 2.5, 3.5 goals).</p>
<p><strong>How it works:</strong></p>
<ul>
  <li>Probabilities are calculated directly from the score matrix — summing all cells where total goals are above or below the line</li>
  <li>Bookmaker probabilities use Shin's method to remove margin from Over/Under odds</li>
  <li>Edge = your probability minus the book's fair probability</li>
</ul>
<p><strong>Common lines:</strong></p>
<ul>
  <li><strong>Over 2.5</strong> — the most popular O/U line. Typically ~50/50 in most leagues</li>
  <li><strong>Over 1.5</strong> — very likely (most matches have 2+ goals)</li>
  <li><strong>Over 3.5</strong> — less likely, but higher odds when it hits</li>
</ul>

<hr>
<p><strong>Suomeksi:</strong></p>
<p>Ennustaa ylittääkö vai alittaako ottelun maalimäärä tietyn rajan (1.5, 2.5, 3.5 maalia).</p>
<p><strong>Miten toimii:</strong></p>
<ul>
  <li>Todennäköisyydet lasketaan suoraan tulosmatriisista — summaamalla kaikki solut, joissa maalimäärä ylittää tai alittaa rajan</li>
  <li>Vedonvälittäjän todennäköisyydet käyttävät Shinin menetelmää marginaalin poistamiseen</li>
  <li>Etu = sinun todennäköisyytesi miinus vedonvälittäjän reilutodennäköisyys</li>
</ul>
<p><strong>Yleiset rajat:</strong></p>
<ul>
  <li><strong>Yli 2.5</strong> — suosituin yli/alle-raja. Tyypillisesti ~50/50 useimmissa sarjoissa</li>
  <li><strong>Yli 1.5</strong> — hyvin todennäköinen (useimmissa otteluissa 2+ maalia)</li>
  <li><strong>Yli 3.5</strong> — epätodennäköisempi, mutta korkeammat kertoimet osuessaan</li>
</ul>
    `,
  },
  'value-bets': {
    title: 'Value Bets',
    body: `
<p>A <strong>value bet</strong> exists when our model's predicted probability for an outcome is higher than the bookmaker's fair probability. This means the odds are in your favor — the bookmaker is offering better odds than they should.</p>
<p><strong>Columns:</strong></p>
<ul>
  <li><strong>Your %</strong> — our model's probability for this outcome</li>
  <li><strong>Book %</strong> — the bookmaker's fair probability (margin removed via Shin's method)</li>
  <li><strong>Edge</strong> — the difference (Your % minus Book %). Bigger edge = more value</li>
  <li><strong>Kelly %</strong> — optimal bet size as % of bankroll (scaled by Kelly Fraction setting)</li>
  <li><strong>Stake</strong> — suggested bet amount in euros based on your bankroll</li>
</ul>
<p><strong>Best odds:</strong> When multiple bookmakers are available, each value bet shows which bookmaker offers the highest odds for that outcome (e.g., "Best: Pinnacle @ 2.45"). Always place your bet at the best available odds to maximize value.</p>
<p><strong>Edge threshold:</strong> Use the <em>Min. Edge</em> slider in Settings to filter out marginal edges. Only bets above the threshold are shown; hidden bets are counted at the bottom of the table.</p>
<p><strong>Tips:</strong></p>
<ul>
  <li>Edges above 5% are strong value opportunities</li>
  <li>Use quarter Kelly (25%) to manage risk — full Kelly is too aggressive in practice</li>
  <li>Value bets still lose sometimes — the edge is a long-term advantage, not a guarantee</li>
</ul>

<hr>
<p><strong>Suomeksi:</strong></p>
<p><strong>Arvoveto</strong> syntyy, kun mallimme todennäköisyys lopputulokselle on korkeampi kuin vedonvälittäjän reilutodennäköisyys. Kertoimet ovat puolellasi — vedonvälittäjä tarjoaa paremmat kertoimet kuin pitäisi.</p>
<p><strong>Sarakkeet:</strong></p>
<ul>
  <li><strong>Your %</strong> — mallimme todennäköisyys tälle lopputulokselle</li>
  <li><strong>Book %</strong> — vedonvälittäjän reilutodennäköisyys (marginaali poistettu)</li>
  <li><strong>Edge</strong> — ero (sinun % miinus vedonvälittäjän %). Suurempi etu = enemmän arvoa</li>
  <li><strong>Kelly %</strong> — optimaalinen panoskoko prosentteina pankista</li>
  <li><strong>Stake</strong> — ehdotettu panos euroissa</li>
</ul>
<p><strong>Parhaat kertoimet:</strong> Useamman vedonvälittäjän ollessa saatavilla näytetään, kuka tarjoaa korkeimmat kertoimet (esim. "Best: Pinnacle @ 2.45"). Lyö aina parhailla saatavilla olevilla kertoimilla.</p>
<p><strong>Eturaja:</strong> Käytä <em>Min. etu</em> -liukusäädintä Asetuksissa suodattaaksesi marginaaliset edut. Piilotettujen vetojen määrä näytetään taulukon lopussa.</p>
<p><strong>Vinkit:</strong></p>
<ul>
  <li>Yli 5% edut ovat vahvoja arvomahdollisuuksia</li>
  <li>Käytä neljännes-Kellyä (25%) riskin hallintaan — täysi Kelly on käytännössä liian aggressiivinen</li>
  <li>Arvovedotkin häviävät joskus — etu on pitkän aikavälin hyöty, ei takuu</li>
</ul>
    `,
  },
  'all-bets': {
    title: 'All Bets Overview',
    body: `
<p>Shows every possible bet for this match — including both value bets and overvalued outcomes — sorted by edge.</p>
<p><strong>Reading the table:</strong></p>
<ul>
  <li><span style="color:#4ade80;">Green edge</span> — value bet. Our model gives this outcome a higher probability than the bookmaker</li>
  <li><span style="color:#f87171;">Red edge</span> — overvalued. The bookmaker thinks this is more likely than our model does</li>
  <li><span style="color:#f87171;background:#f8717130;padding:1px 4px;border-radius:3px;font-size:0.8em;font-weight:700;">OV</span> — Overvalued tag, shown when the bookmaker overvalues by more than 3%</li>
</ul>
<p>This is the complete picture — Value Bets and Fades are subsets of this table filtered by positive or negative edge.</p>

<hr>
<p><strong>Suomeksi:</strong></p>
<p>Näyttää kaikki mahdolliset vedot ottelulle — sekä arvovedot että yliarvostetut lopputulokset — edun mukaan järjestettynä.</p>
<p><strong>Taulukon lukeminen:</strong></p>
<ul>
  <li><span style="color:#4ade80;">Vihreä etu</span> — arvoveto. Mallimme antaa tälle lopputulokselle korkeamman todennäköisyyden kuin vedonvälittäjä</li>
  <li><span style="color:#f87171;">Punainen etu</span> — yliarvostettu. Vedonvälittäjä pitää tätä todennäköisempänä kuin mallimme</li>
  <li><span style="color:#f87171;background:#f8717130;padding:1px 4px;border-radius:3px;font-size:0.8em;font-weight:700;">OV</span> — Yliarvostettu-merkintä, näytetään kun vedonvälittäjä yliarvostaa yli 3%</li>
</ul>
<p>Tämä on kokonaiskuva — Arvovedot ja Fadet ovat tämän taulukon osajoukot suodatettuna positiivisen tai negatiivisen edun mukaan.</p>
    `,
  },
  'fades': {
    title: 'Fades (Overvalued by Bookmaker)',
    body: `
<p><strong>Fades</strong> are outcomes where the bookmaker's implied probability is significantly higher than our model's estimate — the bookmaker is <em>overconfident</em> about that outcome.</p>
<p>When the book overvalues one outcome, the opposite outcomes are likely undervalued — creating value betting opportunities. Each fade shows the overvalued outcome and suggests counter-bets on the opposite side.</p>
<p><strong>How to use:</strong></p>
<ul>
  <li>Look for outcomes the bookmaker overvalues by 5%+ — these suggest the book has priced that outcome too aggressively</li>
  <li>The &#8627; counter-bets show where the value lies on the other side</li>
  <li>Combine with the Bookmaker Comparison to find which bookmaker offers the best counter-bet odds</li>
</ul>
<p><strong>Threshold:</strong> Only outcomes overvalued by more than 3% are shown. Small differences are normal noise.</p>

<hr>
<p><strong>Suomeksi:</strong></p>
<p><strong>Fadet</strong> ovat lopputuloksia, joissa vedonvälittäjän todennäköisyys on merkittävästi korkeampi kuin mallimme arvio — vedonvälittäjä on <em>liian itsevarma</em> kyseisestä lopputuloksesta.</p>
<p>Kun vedonvälittäjä yliarvostaa yhtä lopputulosta, vastakkaiset lopputulokset ovat todennäköisesti aliarvostettuja — mikä luo arvovetomhdollisuuksia. Jokainen fade näyttää yliarvostetun lopputuloksen ja ehdottaa vastavetoja.</p>
<p><strong>Miten käyttää:</strong></p>
<ul>
  <li>Etsi lopputuloksia, jotka vedonvälittäjä yliarvostaa 5%+ — nämä viittaavat liian aggressiiviseen hinnoitteluun</li>
  <li>&#8627; vastavedot näyttävät missä arvo on vastapuolella</li>
  <li>Yhdistä vedonvälittäjävertailuun löytääksesi parhaat vastaveto-kertoimet</li>
</ul>
<p><strong>Raja:</strong> Vain yli 3% yliarvostetut lopputulokset näytetään. Pienet erot ovat normaalia kohinaa.</p>
    `,
  },
  'bookmaker-comparison': {
    title: 'Bookmaker Comparison',
    body: `
<p>Compares each bookmaker's implied probabilities against <strong>Pinnacle</strong> (the sharpest bookmaker with the lowest margins). When Pinnacle odds are unavailable, falls back to consensus (average). The "Compared against" label shows which benchmark is active.</p>
<p><strong>Why Pinnacle?</strong> Pinnacle accepts large bets from professional syndicates and doesn't limit winners, so their odds are closest to the true probabilities. When another bookmaker offers significantly better odds than Pinnacle, it's likely a mispriced line.</p>
<p><strong>Reading the table:</strong></p>
<ul>
  <li>Each cell shows the decimal odds and the deviation from the benchmark in parentheses</li>
  <li><span style="color:#4ade80;">Green border</span> = bookmaker offers better odds than Pinnacle (lower implied probability = more value for bettors)</li>
  <li><span style="color:#f87171;">Red border</span> = bookmaker offers worse odds than Pinnacle (higher implied probability = less value)</li>
  <li><span style="display:inline-block;font-size:0.65rem;font-weight:700;padding:1px 4px;border-radius:3px;color:#4ade80;background:rgba(74,222,128,0.15);border:1px solid rgba(74,222,128,0.4);">BEST</span> = highest odds across all bookmakers for that outcome</li>
  <li><span style="display:inline-block;font-size:0.65rem;font-weight:700;padding:1px 4px;border-radius:3px;color:#f59e0b;background:rgba(245,158,11,0.15);border:1px solid rgba(245,158,11,0.4);">SHARP VALUE</span> = odds are &gt;3% better than Pinnacle — a potential mispriced line worth betting</li>
  <li><span style="color:#4ade80;font-size:0.65rem;">&#x25B2;</span> / <span style="color:#f87171;font-size:0.65rem;">&#x25BC;</span> = odds moved up (green) or down (red) since last update</li>
</ul>
<p><strong>How to use:</strong></p>
<ul>
  <li>Look for <strong>SHARP VALUE</strong> badges — these are the strongest signals of a mispriced line</li>
  <li>The <strong>BEST</strong> badge shows which bookmaker to place your bet with</li>
  <li>Large red deviations suggest a bookmaker is overconfident about an outcome — consider fading it</li>
</ul>

<hr>
<p><strong>Suomeksi:</strong></p>
<p>Vertaa jokaisen vedonvälittäjän todennäköisyyksiä <strong>Pinnacleen</strong> (terävimpien kertoimien vedonvälittäjä, alhaisimmat marginaalit). Jos Pinnaclen kertoimia ei ole saatavilla, käytetään konsensusta (kaikkien keskiarvo).</p>
<p><strong>Miksi Pinnacle?</strong> Pinnacle hyväksyy suuret panokset ammattilaisilta eikä rajoita voittajia, joten heidän kertoimensa ovat lähimpänä todellisia todennäköisyyksiä. Kun toinen vedonvälittäjä tarjoaa selvästi parempia kertoimia kuin Pinnacle, kyseessä on todennäköisesti väärinhinnoiteltu linja.</p>
<p><strong>Taulukon lukeminen:</strong></p>
<ul>
  <li>Jokainen solu näyttää desimaalikertoimet ja poikkeaman vertailukohteesta suluissa</li>
  <li><span style="color:#4ade80;">Vihreä reunus</span> = vedonvälittäjä tarjoaa paremmat kertoimet kuin Pinnacle (enemmän arvoa vedonlyöjälle)</li>
  <li><span style="color:#f87171;">Punainen reunus</span> = vedonvälittäjä tarjoaa huonommat kertoimet kuin Pinnacle (vähemmän arvoa)</li>
  <li><span style="display:inline-block;font-size:0.65rem;font-weight:700;padding:1px 4px;border-radius:3px;color:#4ade80;background:rgba(74,222,128,0.15);border:1px solid rgba(74,222,128,0.4);">BEST</span> = korkeimmat kertoimet kyseiselle lopputulokselle</li>
  <li><span style="display:inline-block;font-size:0.65rem;font-weight:700;padding:1px 4px;border-radius:3px;color:#f59e0b;background:rgba(245,158,11,0.15);border:1px solid rgba(245,158,11,0.4);">SHARP VALUE</span> = kertoimet yli 3% paremmat kuin Pinnacle — mahdollinen väärinhinnoittelu</li>
  <li><span style="color:#4ade80;font-size:0.65rem;">&#x25B2;</span> / <span style="color:#f87171;font-size:0.65rem;">&#x25BC;</span> = kerroin noussut (vihreä) tai laskenut (punainen) edellisestä päivityksestä</li>
</ul>
<p><strong>Miten käyttää:</strong></p>
<ul>
  <li>Etsi <strong>SHARP VALUE</strong> -merkkejä — nämä ovat vahvimmat signaalit väärinhinnoittelusta</li>
  <li><strong>BEST</strong>-merkintä kertoo minkä vedonvälittäjän kautta lyödä vetoa</li>
  <li>Suuret punaiset poikkeamat viittaavat liian itsevarmoihin kertoimiin — harkitse fadea</li>
</ul>
    `,
  },
  'elo-ratings': {
    title: 'Elo Ratings',
    body: `
      <p><strong>What it is:</strong> A power ranking system that rates every team based on their match results. Teams gain points for wins and lose points for losses, with the amount depending on how surprising the result was.</p>
      <div class="help-section">
        <p><strong>How Elo works:</strong></p>
        <ul>
          <li>Every team starts at <strong>1500</strong> (or carries over from last season via the Previous Season slider)</li>
          <li>After each match, the winner gains rating points and the loser loses them</li>
          <li>Beating a strong team earns more points than beating a weak team</li>
          <li>An upset (weak team beats strong team) causes a large rating swing</li>
          <li>Home teams get a <strong>+50 point bonus</strong> in the expected score calculation, reflecting home advantage</li>
          <li>K-factor is <strong>32</strong> — each match can shift a team's rating by up to 32 points</li>
        </ul>
      </div>
      <div class="help-section">
        <p><strong>Table columns:</strong></p>
        <ul>
          <li><strong>Rating</strong> — current Elo score. Higher = stronger team</li>
          <li><strong>Change</strong> — rating gained or lost in the most recent match</li>
          <li><strong>Form</strong> — last 5 results as colored dots: green = win, amber = draw, red = loss</li>
          <li><strong>Played</strong> — total matches played this season</li>
        </ul>
      </div>
      <div class="help-section">
        <p><strong>How it's used in predictions:</strong> Elo ratings are converted to expected goal rates (Poisson lambdas) and blended with the statistical model. Early in the season, Elo has more influence since the Poisson model has limited data. As more matches are played, the statistical model takes over.</p>
      </div>

      <hr>
      <p><strong>Suomeksi:</strong></p>
      <p><strong>Mikä se on:</strong> Voimasuhdelista, joka luokittelee joukkueet ottelutulosten perusteella. Joukkueet saavat pisteitä voitoista ja menettävät tappioista, määrän riippuessa tuloksen yllättävyydestä.</p>
      <div class="help-section">
        <p><strong>Miten Elo toimii:</strong></p>
        <ul>
          <li>Jokainen joukkue aloittaa <strong>1500</strong> pisteestä (tai siirtona edelliseltä kaudelta)</li>
          <li>Jokaisen ottelun jälkeen voittaja saa pisteitä ja häviäjä menettää</li>
          <li>Vahvan joukkueen voittaminen antaa enemmän pisteitä kuin heikon</li>
          <li>Yllätystulos (heikko voittaa vahvan) aiheuttaa suuren pistemuutoksen</li>
          <li>Kotijoukkue saa <strong>+50 pisteen bonuksen</strong> odotusarvolaskennassa (kotietu)</li>
          <li>K-kerroin on <strong>32</strong> — jokainen ottelu voi siirtää luokitusta enintään 32 pistettä</li>
        </ul>
      </div>
      <div class="help-section">
        <p><strong>Taulukon sarakkeet:</strong></p>
        <ul>
          <li><strong>Rating</strong> — nykyinen Elo-pistemäärä. Korkeampi = vahvempi joukkue</li>
          <li><strong>Change</strong> — viimeisimmässä ottelussa saadut tai menetetyt pisteet</li>
          <li><strong>Form</strong> — viiden viimeisen ottelun tulokset värillisillä pisteillä: vihreä = voitto, keltainen = tasapeli, punainen = tappio</li>
          <li><strong>Played</strong> — kauden pelattujen otteluiden määrä</li>
        </ul>
      </div>
      <div class="help-section">
        <p><strong>Miten käytetään ennusteissa:</strong> Elo-luokitukset muunnetaan odotetuiksi maalimääriksi (Poisson-lambdat) ja yhdistetään tilastolliseen malliin. Kauden alussa Elolla on suurempi vaikutus, koska Poisson-mallilla on rajallisesti dataa. Otteluiden kertyessä tilastollinen malli ottaa vallan.</p>
      </div>
    `,
  },
  'prediction-tracker': {
    title: 'Prediction Tracker',
    body: `
      <p><strong>What it is:</strong> A walk-forward evaluation that measures how accurate the model's predictions have been throughout the season — without cheating by using future data.</p>
      <div class="help-section">
        <p><strong>Walk-forward methodology:</strong></p>
        <ul>
          <li>Matches are sorted chronologically</li>
          <li>For each match, the model is trained using <strong>only matches played before it</strong></li>
          <li>The prediction is then compared to the actual result</li>
          <li>This prevents "data leakage" — the model never sees the future</li>
          <li>Predictions start after 10 finished matches (minimum training data)</li>
        </ul>
      </div>
      <div class="help-section">
        <p><strong>Metrics explained:</strong></p>
        <ul>
          <li><strong>1X2 Accuracy</strong> — percentage of matches where the predicted outcome (home win / draw / away win) was correct. Typical for football: 35-50%</li>
          <li><strong>Exact Score</strong> — percentage of matches where the predicted scoreline was exactly right. Typical: 5-15%</li>
          <li><strong>Brier Score</strong> — measures how well-calibrated the probabilities are. <strong>Lower is better.</strong> 0 = perfect predictions, ~0.67 = random guessing for 3 outcomes. A good model scores 0.40-0.55</li>
        </ul>
      </div>
      <div class="help-section">
        <p><strong>Prediction table:</strong> Shows recent predictions with the predicted outcome and score vs the actual result. A checkmark means the 1X2 outcome was correct.</p>
      </div>

      <hr>
      <p><strong>Suomeksi:</strong></p>
      <p><strong>Mikä se on:</strong> Eteenpäin kulkeva arviointi, joka mittaa mallin ennusteiden tarkkuutta kauden aikana — ilman tulevaisuuden datan käyttöä.</p>
      <div class="help-section">
        <p><strong>Walk-forward-menetelmä:</strong></p>
        <ul>
          <li>Ottelut järjestetään aikajärjestykseen</li>
          <li>Jokaista ottelua varten malli koulutetaan käyttäen <strong>vain sitä ennen pelattuja otteluita</strong></li>
          <li>Ennustetta verrataan todelliseen tulokseen</li>
          <li>Tämä estää "datavuodon" — malli ei koskaan näe tulevaisuutta</li>
          <li>Ennusteet alkavat 10 pelatun ottelun jälkeen (minimikoulutusdataa)</li>
        </ul>
      </div>
      <div class="help-section">
        <p><strong>Mittarit:</strong></p>
        <ul>
          <li><strong>1X2 Accuracy</strong> — prosentti otteluista, joissa ennustettu lopputulos (kotivoitto / tasapeli / vierasvoitto) oli oikein. Tyypillinen jalkapallolle: 35-50%</li>
          <li><strong>Exact Score</strong> — prosentti otteluista, joissa ennustettu tulos oli täsmälleen oikein. Tyypillinen: 5-15%</li>
          <li><strong>Brier Score</strong> — mittaa todennäköisyyksien kalibraatiota. <strong>Matalampi on parempi.</strong> 0 = täydelliset ennusteet, ~0.67 = satunnainen arvaus. Hyvä malli saa 0.40-0.55</li>
        </ul>
      </div>
      <div class="help-section">
        <p><strong>Ennustetaulukko:</strong> Näyttää viimeaikaiset ennusteet ennustetun lopputuloksen ja tuloksen kanssa. Merkki tarkoittaa, että 1X2-lopputulos oli oikein.</p>
      </div>
    `,
  },
  'pl-simulation': {
    title: 'Season P/L Simulation',
    body: `
      <p><strong>What it is:</strong> A simulated betting season that shows what would have happened if you had followed the model's value bets with Kelly staking from the start of the season.</p>
      <div class="help-section">
        <p><strong>How it works:</strong></p>
        <ul>
          <li>Uses the same <strong>walk-forward</strong> approach as the Prediction Tracker — no future data</li>
          <li>For each match, the model identifies <strong>value bets</strong> (where model probability > bookmaker fair probability)</li>
          <li>Stakes are calculated using the <strong>Kelly Criterion</strong>, scaled by the Kelly Fraction setting</li>
          <li>Only matches with bookmaker odds are included — matches without odds are skipped</li>
        </ul>
      </div>
      <div class="help-section">
        <p><strong>Summary metrics:</strong></p>
        <ul>
          <li><strong>Total P/L</strong> — total profit or loss across all bets placed</li>
          <li><strong>ROI</strong> — return on investment: total P/L / total amount staked &times; 100. Positive = profitable</li>
          <li><strong>Win Rate</strong> — percentage of bets that won</li>
          <li><strong>Max Drawdown</strong> — the largest peak-to-trough decline in cumulative P/L. Shows the worst losing streak</li>
        </ul>
      </div>
      <div class="help-section">
        <p><strong>P/L chart:</strong> Shows cumulative profit/loss over time. Green bars = running profit, red bars = running loss. A steadily rising line suggests a profitable strategy.</p>
      </div>
      <div class="help-section">
        <p><strong>Important:</strong> Past performance does not guarantee future results. This simulation uses consensus odds available at prediction time. Actual results depend on the specific bookmaker odds you get and when you place bets.</p>
      </div>

      <hr>
      <p><strong>Suomeksi:</strong></p>
      <p><strong>Mikä se on:</strong> Simuloitu vedonlyöntikausi, joka näyttää mitä olisi tapahtunut, jos olisit seurannut mallin arvovetoja Kelly-panostuksella kauden alusta.</p>
      <div class="help-section">
        <p><strong>Miten toimii:</strong></p>
        <ul>
          <li>Käyttää samaa <strong>walk-forward</strong>-menetelmää kuin Ennusteseuranta — ei tulevaisuuden dataa</li>
          <li>Jokaiselle ottelulle malli tunnistaa <strong>arvovedot</strong> (mallin todennäköisyys > vedonvälittäjän reilutodennäköisyys)</li>
          <li>Panokset lasketaan <strong>Kelly-kriteerillä</strong>, skaalattuna Kelly-murto-osa-asetuksella</li>
          <li>Vain ottelut, joilla on kertoimet, sisällytetään — ilman kertoimia olevat ohitetaan</li>
        </ul>
      </div>
      <div class="help-section">
        <p><strong>Yhteenvetomittarit:</strong></p>
        <ul>
          <li><strong>Total P/L</strong> — kokonaisvoitto tai -tappio kaikista lyödyistä vedoista</li>
          <li><strong>ROI</strong> — sijoitetun pääoman tuotto: kokonais-P/L / kokonaispanokset &times; 100. Positiivinen = kannattava</li>
          <li><strong>Win Rate</strong> — voittaneiden vetojen prosenttiosuus</li>
          <li><strong>Max Drawdown</strong> — suurin huipusta pohjaan lasku kumulatiivisessa P/L:ssä. Näyttää pahimman tappioputken</li>
        </ul>
      </div>
      <div class="help-section">
        <p><strong>P/L-kaavio:</strong> Näyttää kumulatiivisen voiton/tappion ajan myötä. Vihreät palkit = juokseva voitto, punaiset palkit = juokseva tappio. Tasaisesti nouseva viiva viittaa kannattavaan strategiaan.</p>
      </div>
      <div class="help-section">
        <p><strong>Tärkeää:</strong> Mennyt tuotto ei takaa tulevaa. Tämä simulaatio käyttää konsensuskertoimia ennustehetkellä. Todelliset tulokset riippuvat saamistasi kertoimista ja vedon ajoituksesta.</p>
      </div>
    `,
  },

  'tournament_filter': {
    title: 'Tournament Filter',
    body: `
      <p><strong>Tournament filter:</strong> Limits the match list, tracker, and P&amp;L to one competition. "All" is the default and recommended when you want the whole picture, since Elo updates use every international match regardless of filter.</p>
      <hr>
      <p><strong>Suomeksi:</strong></p>
      <p><strong>Turnaussuodatin:</strong> Rajaa ottelulistan, seurannan ja voitto/tappio-näkymän yhteen kilpailuun. "All" on oletus ja suositeltu vaihtoehto: Elo-luvut päivittyvät joka tapauksessa kaikista maaotteluista.</p>
    `,
  },

  'fifa_prior': {
    title: 'FIFA-based Prior',
    body: `
      <p><strong>FIFA-based prior:</strong> For men's international football, team strength is seeded from FIFA rankings. Top-ranked teams start with higher expected goals for and lower expected goals against. This balances the problem of teams that only play a handful of matches per year.</p>
      <hr>
      <p><strong>Suomeksi:</strong></p>
      <p><strong>FIFA-perusteinen lähtöoletus:</strong> Miesten maajoukkueiden kohdalla joukkueen voima ennustetaan FIFA-ranking-sijoituksen perusteella. Korkealla olevat joukkueet alkavat suuremmalla odotusmaalimäärällä, huonommin sijoittuneet pienemmällä. Tämä auttaa sellaisten joukkueiden kanssa, jotka pelaavat vain muutaman ottelun vuodessa.</p>
    `,
  },

  'neutral_venue': {
    title: 'Neutral Venue',
    body: `
      <p><strong>Neutral venue:</strong> At tournaments like the World Cup, most matches are played at neutral stadiums. When a match is marked as neutral, the usual home-advantage bonus (+50 Elo, +10% expected goals) is turned off.</p>
      <hr>
      <p><strong>Suomeksi:</strong></p>
      <p><strong>Neutraali kenttä:</strong> Arvoturnauksissa (esim. MM-kisat) suurin osa otteluista pelataan neutraalilla stadionilla. Kun ottelu on merkitty neutraaliksi, tavallinen kotijoukkueen etu (+50 Elo, +10 % odotusmaalit) ei vaikuta.</p>
    `,
  },

  'league_veikkausliiga': {
    title: 'Veikkausliiga',
    body: `
      <p><strong>Veikkausliiga</strong> is the top division of Finnish football. 12 teams play 22 rounds (132 matches per season).</p>
      <p><strong>Odds:</strong> Veikkaus odds plus ~15 international bookmakers via The Odds API, updated twice daily. The <strong>Consensus</strong> view averages implied probabilities across all available bookmakers.</p>
      <p><strong>Data sources:</strong> Match fixtures and results from TheSportsDB, enriched with shot stats from veikkausliiga.com for the xG model.</p>
      <hr>
      <p><strong>Suomeksi:</strong></p>
      <p><strong>Veikkausliiga</strong> on Suomen jalkapallon pääsarja. 12 joukkuetta pelaa 22 kierrosta (132 ottelua kaudessa).</p>
      <p><strong>Kertoimet:</strong> Veikkauksen kertoimet sekä noin 15 kansainvälistä vedonvälittäjää The Odds API:n kautta, päivitetään kahdesti päivässä. <strong>Konsensus</strong>-näkymä laskee keskiarvon kaikkien vedonvälittäjien todennäköisyyksistä.</p>
      <p><strong>Datalähteet:</strong> Ottelut ja tulokset TheSportsDB:stä, laukaisutilastot veikkausliiga.comista xG-mallia varten.</p>
    `,
  },

  'league_mens_international': {
    title: "Men's International League",
    body: `
      <p><strong>Men's International:</strong> Combines friendlies, WC qualifiers, UEFA Nations League, and the World Cup into one league so national teams share Elo ratings across all competitions. The model uses a longer time-decay (730 days instead of 60) because international matches are rarer.</p>
      <hr>
      <p><strong>Suomeksi:</strong></p>
      <p><strong>Miesten maaottelut:</strong> Sisältää ystävyysottelut, MM-karsinnat, UEFA Nations Leaguen ja MM-kisat samassa liigassa, jotta maajoukkueet jakavat Elo-lukunsa kaikkien kilpailujen kesken. Malli käyttää pidempää aikapainotusta (730 päivää 60:n sijaan), koska maaottelut ovat harvinaisempia.</p>
    `,
  },
};

export function setupHelpModal() {
  const modal = document.getElementById('help-modal');
  const title = document.getElementById('help-modal-title');
  const body = document.getElementById('help-modal-body');
  const closeBtn = document.getElementById('help-modal-close');
  const backdrop = modal.querySelector('.help-modal-backdrop');

  function open(key) {
    const content = helpContent[key];
    if (!content) return;
    title.textContent = content.title;
    body.innerHTML = content.body;
    modal.classList.remove('hidden');
  }

  function close() {
    modal.classList.add('hidden');
  }

  // Event delegation so dynamically-rendered help tips (e.g. inside the
  // tournament filter) work without re-running setupHelpModal.
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.help-tip[data-help]');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    open(btn.dataset.help);
  });

  // Accessibility labels for tips present at load time.
  document.querySelectorAll('.help-tip[data-help]').forEach(btn => {
    const content = helpContent[btn.dataset.help];
    if (content) btn.setAttribute('aria-label', `Help: ${content.title}`);
  });

  closeBtn.addEventListener('click', close);
  backdrop.addEventListener('click', close);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) close();
  });
}

/* === Prediction Tracker Renderer === */

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

/* === P/L Simulation Renderer === */

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
