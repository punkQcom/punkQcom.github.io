/**
 * Pure helpers for Veikkausliiga-style split-stage standings.
 * No DOM, no imports — unit-testable from Node and the browser.
 */

function pairKey(a, b) { return a < b ? `${a}|${b}` : `${b}|${a}`; }

/** Count how many times each unordered team pair appears. Map<"A|B", count>. */
export function countPairMeetings(matches) {
  const counts = new Map();
  for (const m of matches || []) {
    if (!m || !m.homeTeam || !m.awayTeam) continue;
    const k = pairKey(m.homeTeam, m.awayTeam);
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  return counts;
}

/** Infer the two split groups from 3rd-meeting edges. Returns [teamsA[], teamsB[]] or null. */
export function deriveSplitComponents(matches) {
  const counts = countPairMeetings(matches);
  const adj = new Map();
  const addEdge = (a, b) => { if (!adj.has(a)) adj.set(a, new Set()); adj.get(a).add(b); };
  for (const [key, n] of counts) {
    if (n < 3) continue;
    const [a, b] = key.split('|');
    addEdge(a, b); addEdge(b, a);
  }
  if (adj.size === 0) return null;
  const seen = new Set(); const components = [];
  for (const start of adj.keys()) {
    if (seen.has(start)) continue;
    const stack = [start]; const comp = []; seen.add(start);
    while (stack.length) {
      const t = stack.pop(); comp.push(t);
      for (const nb of adj.get(t) || []) if (!seen.has(nb)) { seen.add(nb); stack.push(nb); }
    }
    components.push(comp);
  }
  if (components.length !== 2) return null;
  if (components.some(c => c.length < 2)) return null;
  return components;
}

/** Manual override map, keyed "<leagueId>:<season>". Empty by default. Wins over derivation. */
export const SPLIT_OVERRIDES = {};

const RANK_CMP = (a, b) => b.points - a.points || b.goalDiff - a.goalDiff || b.goalsFor - a.goalsFor;

function sliceAndRank(rows, teamNames) {
  const set = new Set(teamNames);
  const out = rows.filter(r => set.has(r.team)).map(r => ({ ...r }));
  out.sort(RANK_CMP);
  out.forEach((r, i) => { r.rank = i + 1; });
  return out;
}

/** Build labelled, re-ranked split tables from flat standings. Returns {..} or null. */
export function computeSplitGroups(flatRows, matches, leagueSeasonKey) {
  const rows = flatRows || [];
  if (rows.length === 0) return null;
  const allTeams = new Set(rows.map(r => r.team));
  let sets = null;
  const override = leagueSeasonKey && SPLIT_OVERRIDES[leagueSeasonKey];
  if (override && override['Championship Group'] && override['Relegation Group']) {
    sets = [override['Championship Group'], override['Relegation Group']];
  } else {
    const comps = deriveSplitComponents(matches);
    if (comps) sets = comps;
  }
  if (!sets) return null;
  const [g1, g2] = sets;
  const disjoint = g1.every(t => !g2.includes(t));
  const union = new Set([...g1, ...g2]);
  if (!disjoint) return null;
  if (union.size !== allTeams.size) return null;
  for (const t of allTeams) if (!union.has(t)) return null;
  const total = names => names.reduce((s, t) => { const r = rows.find(x => x.team === t); return s + (r ? r.points : 0); }, 0);
  const [champNames, relegNames] = total(g1) >= total(g2) ? [g1, g2] : [g2, g1];
  return {
    'Championship Group': sliceAndRank(rows, champNames),
    'Relegation Group': sliceAndRank(rows, relegNames),
  };
}
