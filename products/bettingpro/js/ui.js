/**
 * DOM rendering — takes calculation results and renders them into the page.
 */

export function showResults() {
  const el = document.getElementById('results');
  el.classList.remove('hidden');
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function renderMargin(odds1x2) {
  const el = document.getElementById('margin-display');
  if (!odds1x2[0] || !odds1x2[1] || !odds1x2[2]) {
    el.textContent = '';
    return;
  }
  const totalImplied = odds1x2.reduce((sum, o) => sum + 1 / o, 0);
  const margin = ((totalImplied - 1) * 100).toFixed(1);
  el.textContent = `Bookmaker margin: ${margin}%`;
}

export function renderScoreMatrix(matrix, homeName, awayName) {
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

  document.getElementById('most-likely-score').textContent =
    `Most likely: ${homeName} ${maxI} - ${maxJ} ${awayName} (${(maxProb * 100).toFixed(1)}%)`;

  // Away team name spanning the top
  let html = '<table class="score-matrix">';
  html += `<tr><th></th><th></th><th class="team-header" colspan="${maxGoals}">${awayName}</th></tr>`;
  // Away goal numbers
  html += '<tr><th></th><th></th>';
  for (let j = 0; j < maxGoals; j++) html += `<th>${j}</th>`;
  html += '</tr>';

  for (let i = 0; i < maxGoals; i++) {
    html += '<tr>';
    // Home team name spanning rows (only on first data row)
    if (i === 0) {
      html += `<th class="team-header team-header-vertical" rowspan="${maxGoals}">${homeName}</th>`;
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

  container.innerHTML = data.map(d => `
    <div class="outcome-row">
      <div class="outcome-label">
        <span>${d.label}</span>
        <span>${(d.pct * 100).toFixed(1)}% (book: ${(d.bookPct * 100).toFixed(1)}%)</span>
      </div>
      <div class="outcome-bar-track">
        <div class="outcome-bar-fill ${d.cls}" style="width:${(d.pct * 100).toFixed(1)}%"></div>
        <div class="outcome-bar-fill bookmaker" style="width:${(d.bookPct * 100).toFixed(1)}%"></div>
      </div>
    </div>
  `).join('');
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

export function renderValueBets(bets) {
  const table = document.getElementById('value-bets');
  const valueBets = bets.filter(b => b.edge > 0);

  if (valueBets.length === 0) {
    table.innerHTML = '<tbody><tr><td colspan="6" style="text-align:center;color:#9ca3af;">No value bets found</td></tr></tbody>';
    return;
  }

  let html = '<thead><tr><th>Bet</th><th>Your %</th><th>Book %</th><th>Edge</th><th>Kelly %</th><th>Stake</th></tr></thead><tbody>';

  valueBets.sort((a, b) => b.edge - a.edge);
  for (const bet of valueBets) {
    html += `<tr>
      <td>${bet.label}</td>
      <td class="value-positive">${(bet.yourProb * 100).toFixed(1)}%</td>
      <td>${(bet.bookProb * 100).toFixed(1)}%</td>
      <td class="value-positive">+${(bet.edge * 100).toFixed(1)}%</td>
      <td>${(bet.kellyPct * 100).toFixed(1)}%</td>
      <td>${bet.stake.toFixed(2)}</td>
    </tr>`;
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

export function renderBookmakerComparison(rows, homeName, awayName, modelOutcomes) {
  const container = document.getElementById('bookmaker-comparison');

  if (rows.length === 0) {
    container.innerHTML = '<p class="muted" style="text-align:center;">No multi-bookmaker odds available</p>';
    return;
  }

  let html = `<table class="results-table"><thead><tr>
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
    html += `<tr>
      <td>${formatBookmaker(row.bookmaker)}</td>
      ${comparisonCell(row.home)}
      ${comparisonCell(row.draw)}
      ${comparisonCell(row.away)}
    </tr>`;
  }

  html += '</tbody></table>';
  container.innerHTML = html;
}

function formatBookmaker(key) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function comparisonCell(data) {
  const diffPct = (data.diff * 100).toFixed(1);
  const sign = data.diff > 0 ? '+' : '';
  // Positive diff = bookmaker thinks outcome more likely than consensus = worse odds for bettor
  // Negative diff = bookmaker thinks outcome less likely = better odds for bettor
  const cls = data.diff < -0.02 ? 'comp-value' : data.diff > 0.02 ? 'comp-overvalued' : '';
  return `<td><span class="comp-cell ${cls}">${data.odds.toFixed(2)}</span> <small>(${sign}${diffPct}%)</small></td>`;
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
}

/* === Help Modal System === */

const helpContent = {
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
    `,
  },
  'matches': {
    title: 'Matches',
    body: `
<p>The match list shows all matches for the selected season, grouped by date. Each match row has three columns:</p>
<p><strong>Prediction</strong> — our model's predicted most likely scoreline for the match.</p>
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
<p><strong>Result</strong> — the final score for finished matches. Click any match to open the full analysis.</p>
<p><strong>Today's matches</strong> are highlighted in green and auto-scrolled into view on page load.</p>
    `,
  },
  'score-matrix': {
    title: 'Score Matrix',
    body: `
<p>A 7x7 grid showing the predicted probability of every possible scoreline from 0-0 to 6-6.</p>
<p><strong>How it's built:</strong></p>
<ul>
  <li>Each cell = <em>P(Home scores i) x P(Away scores j)</em> using Poisson distribution</li>
  <li>Low-scoring cells (0-0, 1-0, 0-1, 1-1) are adjusted by the <strong>Dixon-Coles correction</strong> to account for defensive correlations</li>
  <li>The entire matrix is <strong>rescaled</strong> so the 1X2 totals match the blended prediction (model + market odds)</li>
</ul>
<p><strong>Reading the matrix:</strong></p>
<ul>
  <li>Home team goals are on the vertical axis (left), away team goals on the horizontal axis (top)</li>
  <li>Brighter/higher cells indicate more likely scorelines</li>
  <li>The most likely score is shown above the matrix</li>
</ul>
    `,
  },
  'match-outcome': {
    title: 'Match Outcome',
    body: `
<p>Shows the predicted probability for each match result: <strong>Home Win (1)</strong>, <strong>Draw (X)</strong>, and <strong>Away Win (2)</strong>.</p>
<p><strong>Two probability sets:</strong></p>
<ul>
  <li><strong>Model</strong> (colored bars) — our blended prediction combining Poisson model, Elo ratings, and market odds</li>
  <li><strong>Book</strong> (if available) — the bookmaker's implied probability after removing their margin using Shin's method</li>
</ul>
<p>When the model probability is higher than the book's, that outcome may be a <strong>value bet</strong> — the bookmaker is undervaluing it. When it's lower, the bookmaker is <strong>overvaluing</strong> that outcome.</p>
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
<p><strong>Tips:</strong></p>
<ul>
  <li>Edges above 5% are strong value opportunities</li>
  <li>Use quarter Kelly (25%) to manage risk — full Kelly is too aggressive in practice</li>
  <li>Value bets still lose sometimes — the edge is a long-term advantage, not a guarantee</li>
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
    `,
  },
  'bookmaker-comparison': {
    title: 'Bookmaker Comparison',
    body: `
<p>Compares each bookmaker's implied probabilities against the <strong>consensus</strong> (average across all bookmakers). Helps you find the best bookmaker to place each bet.</p>
<p><strong>Reading the table:</strong></p>
<ul>
  <li>Each cell shows the decimal odds and the deviation from consensus in parentheses</li>
  <li><span style="color:#4ade80;">Green</span> = bookmaker offers better odds than consensus (lower implied probability = more value for bettors)</li>
  <li><span style="color:#f87171;">Red</span> = bookmaker offers worse odds than consensus (higher implied probability = less value)</li>
</ul>
<p><strong>How to use:</strong></p>
<ul>
  <li>If you've found a value bet, scan the column for that outcome — find the bookmaker with the greenest cell (best odds)</li>
  <li>Large red deviations suggest a bookmaker is overconfident about an outcome — consider fading it</li>
  <li>Consistent green across a row means that bookmaker is generally offering better odds</li>
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

  document.querySelectorAll('.help-tip[data-help]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      open(btn.dataset.help);
    });
  });

  closeBtn.addEventListener('click', close);
  backdrop.addEventListener('click', close);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) close();
  });
}
