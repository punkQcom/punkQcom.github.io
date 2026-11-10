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

/**
 * What the confidence column means, for its "?" help in the column header.
 *
 * It used to sit under the table — first as a five-row block, then as a line with a
 * hover-only tooltip that did nothing on click or touch. The shared help modal opens
 * on click everywhere and keeps the section clean.
 */
export function confidenceExplanationHtml(t) {
  const row = (lvl) => {
    const suffix = lvl[0].toUpperCase() + lvl.slice(1);
    return `<li><span class="conf-dot conf-${lvl}"></span> ` +
      `<strong>${t('sb.conf' + suffix)}</strong>: ${t('sb.conf' + suffix + 'Tip')}</li>`;
  };
  return `<p>${t('sb.confLegendLead')}</p>` +
    `<ul class="conf-help-list">${['warm', 'warming', 'cold'].map(row).join('')}</ul>`;
}

/** Split picks into the reliable core and the flagged high-risk overrides. */
export function splitPicks(picks) {
  const list = picks || [];
  return {
    reliable: list.filter(p => !p.highRisk),
    speculative: list.filter(p => p.highRisk),
  };
}
