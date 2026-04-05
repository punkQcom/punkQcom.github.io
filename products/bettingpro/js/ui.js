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

  let html = '<table class="score-matrix"><tr><th>' + homeName + ' \\ ' + awayName + '</th>';
  for (let j = 0; j < maxGoals; j++) html += `<th>${j}</th>`;
  html += '</tr>';

  for (let i = 0; i < maxGoals; i++) {
    html += `<tr><th>${i}</th>`;
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
