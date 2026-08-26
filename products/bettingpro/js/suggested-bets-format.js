// js/suggested-bets-format.js — pure helpers (node-testable, no DOM)
export function confidenceLevel(matchesPlayed) {
  if (matchesPlayed > 20) return 'warm';
  if (matchesPlayed >= 10) return 'warming';
  return 'cold';
}
