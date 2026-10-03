// js/match-date.js — pure helper (node-testable, no DOM)

/**
 * The calendar date a match is actually played on, in the viewer's timezone.
 *
 * `match.date` is whatever the upstream feed calls the match day, and for the NHL that
 * is the league's Eastern game-day, not a local date: a 23:00Z puck drop on the "Oct 3"
 * slate is 02:00 on Oct 4 in Helsinki. Grouping on the raw string therefore files every
 * NHL game under the previous day for a European viewer.
 *
 * `date` stays the join key everywhere else (odds matching, grading, the suggested-bets
 * window), so this is display-only: prefer the real kickoff instant when the feed
 * publishes one, and fall back to the published date otherwise — which is every league
 * except the NHL, so their grouping is untouched.
 *
 * @param {{date?: string, startTimeUTC?: string}|null} match
 * @param {string} [timeZone] IANA zone; defaults to the viewer's own.
 * @returns {string|null} YYYY-MM-DD, or null when the match has no date at all
 */
export function localMatchDate(match, timeZone) {
  if (!match) return null;
  const fallback = match.date || null;
  if (!match.startTimeUTC) return fallback;
  const t = new Date(match.startTimeUTC);
  if (Number.isNaN(t.getTime())) return fallback;
  // en-CA renders as YYYY-MM-DD, which is what the rest of the app keys on.
  try {
    return t.toLocaleDateString('en-CA', timeZone ? { timeZone } : undefined);
  } catch {
    return fallback;   // an invalid timeZone must not take the match list down
  }
}
