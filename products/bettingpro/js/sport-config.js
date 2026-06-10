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

/**
 * Look up sport defaults for a league config / sport string.
 */
export function getSportDefaults(sportOrConfig) {
  const sport = typeof sportOrConfig === 'string' ? sportOrConfig : (sportOrConfig?.sport || 'football');
  return SPORT_DEFAULTS[sport] || SPORT_DEFAULTS.football;
}
