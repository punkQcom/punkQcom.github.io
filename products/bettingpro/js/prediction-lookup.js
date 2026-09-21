/**
 * Prediction lookup — pure, so it can be unit-tested outside the browser.
 *
 * Published predictions are keyed by match id. During the transition they are ALSO published
 * under the legacy `"Home vs Away"` pair key, so an id miss falls back to that (older published
 * file, or a record with no id). A third case: `predictions[key]` is only written when the
 * backend has a prediction for that match, so a match can legitimately have none. In a fully
 * id-keyed file such a match misses the id key and falls through to the pair key — which,
 * because the backend's transition shim projects with last-write-wins, holds another meeting
 * of that pairing's prediction instead. The user is silently shown a different fixture's
 * numbers: the exact collision this plan exists to remove, re-entering through the fallback.
 * Do NOT respond to this by gating the fallback on a missing id — published data today is
 * still entirely pair-keyed, so that would blank every prediction in the live app. This is a
 * note for whoever eventually deletes the fallback (see below), not a call to narrow it now.
 *
 * The pair-key fallback is transition scaffolding, not a permanent feature: it exists only
 * because published files currently carry both keys. Once every published file is id-keyed,
 * remove it — see the "Follow-up (do NOT do in this plan)" section of
 * bettingpro-api/docs/superpowers/plans/2026-09-20-prediction-key-collision.md, which also
 * says to delete the fallback tests in tests/prediction-lookup.test.mjs alongside it, so the
 * suite doesn't go red and tempt someone into restoring it.
 *
 * `pairKey` must derive the exact same string as `pairKey` in
 * bettingpro-api/src/prediction/prediction-key.js — this is a cross-repo contract. It takes a
 * match object (rather than two strings) specifically so the two functions' bodies stay
 * textually comparable; if they ever disagree, the fallback silently stops resolving and
 * predictions go blank.
 */

/** @param {{homeTeam: string, awayTeam: string}} match */
export function pairKey(match) {
  return `${match.homeTeam} vs ${match.awayTeam}`;
}

/**
 * @param {Object|null} source - the `.predictions` map from a predictions file (not the whole
 *   file — `data-loader.js` returns `{predictions, eloRatings, tracker, plSimulation}`; passing
 *   that document itself returns null for every match with no error)
 * @param {{id?: string|number, homeTeam: string, awayTeam: string}|null} match
 * @returns {Object|null} the prediction, or null on any miss (never undefined)
 */
export function lookupPrediction(source, match) {
  if (!source || !match) return null;
  // The `!== ''` clause mirrors the backend's `predictionKey` (m.id == null || m.id === '')
  // for the two sides to stay in lockstep, but it is deliberately not independently
  // observable here: the backend never emits an '' id, so source[''] is always undefined and
  // the fallback runs either way whether or not this clause is present. Don't delete it as
  // dead code — it documents the mirrored contract, not a reachable branch.
  if (match.id !== undefined && match.id !== null && match.id !== '') {
    // String() here is for clarity/intent, not load-bearing: plain object property access
    // already coerces a numeric key to a string (source[4] === source['4']), so this guards
    // only against an exotic id whose toString() isn't the default — do not remove it as
    // "redundant" without checking that case.
    const byId = source[String(match.id)];
    if (byId) return byId;
  }
  return source[pairKey(match)] || null;
}
