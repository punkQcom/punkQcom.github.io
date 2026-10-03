// js/odds-consensus.js — pure consensus-odds helper (node-testable, no DOM)
//
// Mirrors bettingpro-api/src/prediction/prediction.js → getConsensusOdds. The two must
// agree: the backend prices predictions with it and the frontend displays prices with it,
// so a divergence shows up as the site disagreeing with its own model.

/**
 * Average implied probabilities across bookmakers and convert back to odds.
 *
 * Only bookmakers quoting a complete 1X2 contribute. A book without a draw is pricing a
 * different market: NHL books split between 3-way regulation and 2-way moneyline, whose
 * home/away prices absorb overtime and are therefore much shorter. Blending the two
 * invented edge — Buffalo v Chicago on 2026-10-03 produced a 15.2% overround against
 * 7.7% for the 3-way books alone, at a consensus price no bookmaker offered.
 *
 * Returns null when no bookmaker qualifies: pricing nothing is safer than pricing the
 * wrong market.
 */
export function getConsensusOdds(oddsObj) {
  const entries = Object.values(oddsObj || {}).filter(b => b && b.home > 0 && b.draw > 0 && b.away > 0);
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
