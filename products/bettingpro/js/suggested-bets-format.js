// js/suggested-bets-format.js — pure helpers (node-testable, no DOM)
export function confidenceLevel(matchesPlayed) {
  if (matchesPlayed > 20) return 'warm';
  if (matchesPlayed >= 10) return 'warming';
  return 'cold';
}

/**
 * Tooltip text for the confidence column.
 *
 * The dot reports how much of the LEAGUE's season the model has seen — not how strongly
 * it likes this particular pick. Users read "cold" as "bad bet" otherwise, so the tooltip
 * says what it actually measures and shows the match count behind it.
 *
 * `t` is injected so this stays pure and node-testable.
 */
export function confidenceTitle(level, matchesPlayed, t) {
  const suffix = level[0].toUpperCase() + level.slice(1);
  const count = Number.isFinite(matchesPlayed) ? matchesPlayed : 0;
  return `${t('sb.conf' + suffix)}: ${count} ${t('sb.confMatchesPlayed')}. ${t('sb.conf' + suffix + 'Tip')}`;
}

/** Split picks into the reliable core and the flagged high-risk overrides. */
export function splitPicks(picks) {
  const list = picks || [];
  return {
    reliable: list.filter(p => !p.highRisk),
    speculative: list.filter(p => p.highRisk),
  };
}
