// pl-simulation-format.js — pure helpers for P/L bar chart (one bar per bet)

// Running total is recomputed over exactly the bets passed, so filtered subsets get their own independent line.
export function computePLBars(bets) {
  if (!Array.isArray(bets)) bets = [];
  if (bets.length === 0) return { bars: [], maxAbs: 1 };

  let cumulative = 0;
  const bars = bets.map((bet, index) => {
    const profit = typeof bet.profit === 'number' ? bet.profit : 0;
    cumulative += profit;
    return { index, profit, runningTotal: cumulative };
  });

  const maxAbs = Math.max(1, ...bars.map(b => Math.abs(b.runningTotal)));

  for (const b of bars) {
    b.heightPct = Math.max(2, Math.abs(b.runningTotal) / maxAbs * 100);
    b.cls = b.runningTotal >= 0 ? 'pl-bar-pos' : 'pl-bar-neg';
  }

  return { bars, maxAbs };
}
