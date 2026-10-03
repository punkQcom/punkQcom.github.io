// js/standings-core.js — pure standings accumulation (node-testable, no DOM, no module state)
//
// Extracted from app.js so the same code that renders the table can be run against an
// independent reference by scripts/verify-standings.mjs. A checker that reimplements the
// maths proves nothing: it drifts from the real thing and then agrees with itself.
//
// Only the parts that decide correctness live here — played/W/D/L/GF/GA/points and the
// ordering. Grouping (tournament groups, NHL conferences, Veikkausliiga's split stage) is
// presentation structure layered on top and stays in app.js.

/** A fresh, zeroed row. */
export function initTeam(name) {
  return {
    team: name, played: 0, won: 0, otWon: 0, otLost: 0, drawn: 0,
    goalsFor: 0, goalsAgainst: 0,
  };
}

/**
 * Fold one finished match into the table.
 *
 * Ice hockey has no draws: a tie after regulation is settled in OT/SO, so the `overtime`
 * flag splits the result into otWon/otLost instead of won/lost. Football uses drawn.
 */
export function accumulateMatch(teams, m, isHockey = false) {
  const h = teams[m.homeTeam], a = teams[m.awayTeam];
  if (!h || !a) return;
  h.played++; a.played++;
  h.goalsFor += m.homeGoals; h.goalsAgainst += m.awayGoals;
  a.goalsFor += m.awayGoals; a.goalsAgainst += m.homeGoals;
  if (m.homeGoals > m.awayGoals) {
    if (isHockey && m.overtime) { h.otWon++; a.otLost++; } else { h.won++; a.lost = (a.lost || 0) + 1; }
  } else if (m.homeGoals < m.awayGoals) {
    if (isHockey && m.overtime) { a.otWon++; h.otLost++; } else { a.won++; h.lost = (h.lost || 0) + 1; }
  } else {
    h.drawn++; a.drawn++;
  }
}

/**
 * Points for one row under a sport/league rule set.
 *
 * `sd` comes from getSportDefaults(sport, leagueId) — the leagueId matters because NHL
 * and Liiga are both ice hockey but score differently (NHL 2/2/1, IIHF 3/2/1).
 */
export function rowPoints(row, sd, adjustment = 0) {
  return row.won * sd.pointsForWin
    + row.otWon * (sd.pointsForOTWin ?? 0)
    + row.otLost * (sd.pointsForOTLoss ?? 0)
    + row.drawn * (sd.pointsForDraw ?? 0)
    + (adjustment || 0);
}

/**
 * Build a ranked table from finished matches.
 *
 * @param {Array} matches   finished and/or unfinished; only scored ones count
 * @param {Object} sd       sport/league defaults from getSportDefaults
 * @param {{isHockey?: boolean, seed?: string[], adjustments?: Object}} [opts]
 *        seed — team names to show with zero played before their first match
 *        adjustments — points deductions/awards by team name. Competitions apply these
 *        for administration, FFP and other regulatory breaches; they are league
 *        decisions and cannot be derived from results, so they have to be supplied.
 * @returns {Array} rows sorted by points, goal difference, goals for; `rank` from 1
 */
export function buildTable(matches, sd, { isHockey = false, seed = [], adjustments = {} } = {}) {
  const teams = {};
  const add = name => { if (name && !teams[name]) teams[name] = { ...initTeam(name), lost: 0 }; };

  for (const name of seed) add(name);
  const finished = (matches || []).filter(m => m.homeGoals != null && m.awayGoals != null);
  for (const m of finished) { add(m.homeTeam); add(m.awayTeam); }
  for (const m of finished) accumulateMatch(teams, m, isHockey);

  const rows = Object.values(teams).map(t => {
    const adj = adjustments[t.team] || 0;
    return {
      ...t,
      goalDiff: t.goalsFor - t.goalsAgainst,
      // Kept alongside the total so the table can show "10 (-4)" rather than an
      // unexplained number that does not match the results above it.
      pointsAdjustment: adj,
      points: rowPoints(t, sd, adj),
    };
  });
  rows.sort((a, b) => b.points - a.points || b.goalDiff - a.goalDiff || b.goalsFor - a.goalsFor);
  rows.forEach((r, i) => { r.rank = i + 1; });
  return rows;
}
