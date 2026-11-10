// js/season-status.js — pure helper (node-testable, no DOM)

/**
 * Is this league's season over, and who won it?
 *
 * Derived from the data, like split-stage.js: a season is over when it has results and
 * no fixture left. Internationals are excluded — their fixture list is empty between
 * every window, which is not a season end.
 *
 * The champion is named for football only, from the final table (the championship
 * group in a split-stage league such as Veikkausliiga). Ice-hockey titles are decided
 * in the playoffs, so the regular-season leader is not the champion.
 *
 * @param {{matches?: Array, upcoming?: Array, sport?: string, isInternational?: boolean,
 *          standings?: {rows?: Array, splitGroups?: Object}}} league
 * @returns {{complete: true, champion: string|null}|null}
 */
export function seasonStatus({ matches, upcoming, sport, isInternational, standings } = {}) {
  if (isInternational) return null;
  if ((upcoming || []).length > 0) return null;
  const hasResults = (matches || []).some(m => m.homeGoals != null && m.awayGoals != null);
  if (!hasResults) return null;

  let champion = null;
  if (sport !== 'ice_hockey') {
    const table = standings?.splitGroups?.['Championship Group'] || standings?.rows || [];
    champion = table[0]?.team || null;
  }
  return { complete: true, champion };
}

/**
 * Is a tournament (within the internationals) over, and who won it?
 *
 * Over once its FINAL has a score and no fixture is left — qualifiers, friendlies and
 * the Nations League have no single final, so they never qualify. The winner comes from
 * the final's score; a drawn final went to penalties, which the data does not carry, so
 * no winner is named rather than a guessed one.
 *
 * @param {Array} matches  the tournament's matches only
 * @param {Array} upcoming the tournament's fixtures only
 * @returns {{complete: true, champion: string|null}|null}
 */
export function tournamentStatus(matches, upcoming) {
  if ((upcoming || []).length > 0) return null;
  const final = (matches || []).find(m => m.stage === 'FINAL' && m.homeGoals != null && m.awayGoals != null);
  if (!final) return null;
  const champion = final.homeGoals > final.awayGoals ? final.homeTeam
    : final.awayGoals > final.homeGoals ? final.awayTeam
    : null;
  return { complete: true, champion };
}
