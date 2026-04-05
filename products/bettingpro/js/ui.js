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
  html += `<tr><th></th><th class="team-header" colspan="${maxGoals}">${awayName}</th></tr>`;
  // Away goal numbers
  html += '<tr><th></th>';
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
    const edgeClass = bet.edge > 0 ? 'value-positive' : 'value-negative';
    const edgeSign = bet.edge > 0 ? '+' : '';
    html += `<tr>
      <td>${bet.label}</td>
      <td>${(bet.yourProb * 100).toFixed(1)}%</td>
      <td>${(bet.bookProb * 100).toFixed(1)}%</td>
      <td class="${edgeClass}">${edgeSign}${(bet.edge * 100).toFixed(1)}%</td>
      <td>${(bet.kellyPct * 100).toFixed(1)}%</td>
      <td>${bet.stake.toFixed(2)}</td>
    </tr>`;
  }

  html += '</tbody>';
  table.innerHTML = html;
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
          <li>At 100% (threshold=5), even a few matches make the model dominant</li>
          <li>At 0% (threshold=200), the model needs 200 matches to reach 50% weight</li>
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
  'recalculate': {
    title: 'Recalculate',
    body: `
      <p><strong>What it does:</strong> Re-runs the full analysis for the currently selected match using your updated settings. Click this after changing any slider or the bankroll to see how the changes affect the results.</p>
      <div class="help-section">
        <p><strong>What gets recalculated:</strong></p>
        <ul>
          <li><strong>Score Matrix</strong> — the 7&times;7 grid of scoreline probabilities. Affected by Market Trust (blending with odds) and Low-Score Correction (Dixon-Coles rho)</li>
          <li><strong>Match Outcome</strong> — Home / Draw / Away probabilities. Affected by Market Trust (higher trust = probabilities closer to bookmaker odds)</li>
          <li><strong>Over/Under</strong> — goal total probabilities and edge vs bookmaker. Affected by Market Trust and Low-Score Correction</li>
          <li><strong>Value Bets</strong> — which bets have a positive edge. Affected by all settings — Market Trust and rho change your probabilities, Kelly Fraction and Bankroll change the suggested stakes</li>
          <li><strong>All Bets Overview</strong> — full breakdown of every bet type with edges and stakes</li>
        </ul>
      </div>
      <div class="help-section">
        <p><strong>Which settings affect what:</strong></p>
        <ul>
          <li><strong>Market Trust</strong> &rarr; changes probabilities (score matrix, outcomes, O/U, edges)</li>
          <li><strong>Low-Score Correction</strong> &rarr; changes probabilities (especially 0-0, 1-0, 0-1, 1-1)</li>
          <li><strong>Kelly Fraction</strong> &rarr; changes stake sizes only (not probabilities or edges)</li>
          <li><strong>Bankroll</strong> &rarr; changes stake amounts only (not probabilities or edges)</li>
        </ul>
      </div>
      <div class="help-section">
        <p><strong>When is it enabled?</strong> The button activates after you select a match and then change any setting. It stays disabled when the analysis is already up to date.</p>
      </div>
      <div class="help-section">
        <p><strong>Note:</strong> The match list predictions (small scores and percentages) update automatically when you change Market Trust or Low-Score Correction. The Recalculate button only affects the detailed analysis panel below.</p>
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
