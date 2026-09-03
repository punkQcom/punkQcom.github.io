// js/suggested-bets-format.js — pure helpers (node-testable, no DOM)
export function confidenceLevel(matchesPlayed) {
  if (matchesPlayed > 20) return 'warm';
  if (matchesPlayed >= 10) return 'warming';
  return 'cold';
}

/** Split picks into the reliable core and the flagged high-risk overrides. */
export function splitPicks(picks) {
  const list = picks || [];
  return {
    reliable: list.filter(p => !p.highRisk),
    speculative: list.filter(p => p.highRisk),
  };
}
