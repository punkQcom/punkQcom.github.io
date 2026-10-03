/**
 * Sport-specific configuration defaults.
 * Frontend version — same values as backend sport-config.js.
 */

export const SPORT_DEFAULTS = {
  football: {
    maxGoals: 7,
    ouLines: [1.5, 2.5, 3.5],
    rho: -0.13,
    homeAdvantage: 50,
    pointsForWin: 3,
    pointsForDraw: 1,
    pointsForOTWin: null,
    pointsForOTLoss: null,
    standingsColumns: ['P', 'W', 'D', 'L', 'GF', 'GA', 'GD', 'Pts'],
    goalLabel: 'Goals',
  },
  ice_hockey: {
    maxGoals: 10,
    ouLines: [4.5, 5.5, 6.5],
    rho: 0,
    homeAdvantage: 35,
    pointsForWin: 3,
    pointsForDraw: null,
    pointsForOTWin: 2,
    pointsForOTLoss: 1,
    standingsColumns: ['P', 'W', 'OTW', 'OTL', 'L', 'GF', 'GA', 'GD', 'Pts'],
    goalLabel: 'Goals',
  },
};

// Per-league rules that differ from the sport default. Defaults are keyed by sport, but
// the two ice-hockey leagues do not score the same way: Liiga uses the IIHF three-point
// system (regulation win 3, OT/SO win 2, OT/SO loss 1) while the NHL awards 2 for any
// win, 1 for an OT/SO loss and 0 for a regulation loss. Without this the NHL inherited
// Liiga's rules and every NHL points total was wrong — NY Rangers on 2026-10-03 showed 6
// against an official 4.
const LEAGUE_OVERRIDES = {
  nhl: { pointsForWin: 2, pointsForOTWin: 2, pointsForOTLoss: 1 },
};

/**
 * Look up sport defaults for a league config / sport string, with any league-specific
 * rule applied on top.
 * @param {string|{sport?: string}} sportOrConfig
 * @param {string} [leagueId] league id, for rules that differ within a sport
 */
export function getSportDefaults(sportOrConfig, leagueId) {
  const sport = typeof sportOrConfig === 'string' ? sportOrConfig : (sportOrConfig?.sport || 'football');
  const base = SPORT_DEFAULTS[sport] || SPORT_DEFAULTS.football;
  const override = leagueId && LEAGUE_OVERRIDES[leagueId];
  return override ? { ...base, ...override } : base;
}
