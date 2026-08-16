/**
 * NHL conference/division structure and standings grouping.
 * Pure — no DOM, no imports. Slices the flat standings into
 * conference → division tables (seeding not-yet-played teams at 0 games).
 */

export const NHL_STRUCTURE = {
  Eastern: {
    Atlantic: ['Boston Bruins', 'Buffalo Sabres', 'Detroit Red Wings', 'Florida Panthers',
               'Montreal Canadiens', 'Ottawa Senators', 'Tampa Bay Lightning', 'Toronto Maple Leafs'],
    Metropolitan: ['Carolina Hurricanes', 'Columbus Blue Jackets', 'New Jersey Devils',
               'New York Islanders', 'New York Rangers', 'Philadelphia Flyers',
               'Pittsburgh Penguins', 'Washington Capitals'],
  },
  Western: {
    Central: ['Chicago Blackhawks', 'Colorado Avalanche', 'Dallas Stars', 'Minnesota Wild',
              'Nashville Predators', 'St. Louis Blues', 'Utah Mammoth', 'Winnipeg Jets'],
    Pacific: ['Anaheim Ducks', 'Calgary Flames', 'Edmonton Oilers', 'Los Angeles Kings',
              'San Jose Sharks', 'Seattle Kraken', 'Vancouver Canucks', 'Vegas Golden Knights'],
  },
};

const RANK_CMP = (a, b) => b.points - a.points || b.goalDiff - a.goalDiff || b.goalsFor - a.goalsFor;

function zeroRow(team) {
  return { team, played: 0, won: 0, otWon: 0, otLost: 0, drawn: 0, lost: 0,
           goalsFor: 0, goalsAgainst: 0, goalDiff: 0, points: 0, rank: 0 };
}

export function computeNhlGroups(flatRows) {
  const byTeam = new Map((flatRows || []).map(r => [r.team, r]));
  const out = {};
  for (const [conf, divs] of Object.entries(NHL_STRUCTURE)) {
    out[conf] = {};
    for (const [div, teams] of Object.entries(divs)) {
      const rows = teams.map(t => ({ ...(byTeam.get(t) || zeroRow(t)) }));
      rows.sort(RANK_CMP);
      rows.forEach((r, i) => { r.rank = i + 1; });
      out[conf][div] = rows;
    }
  }
  return out;
}
