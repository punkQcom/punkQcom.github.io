/**
 * Manual data source — reads values directly from the input forms.
 */

export const name = 'Manual Input';

export function getTeamStats() {
  return {
    homeName: document.getElementById('home-name').value || 'Home',
    awayName: document.getElementById('away-name').value || 'Away',
    homeScored: parseFloat(document.getElementById('home-scored').value) || 0,
    homeConceded: parseFloat(document.getElementById('home-conceded').value) || 0,
    awayScored: parseFloat(document.getElementById('away-scored').value) || 0,
    awayConceded: parseFloat(document.getElementById('away-conceded').value) || 0,
    leagueAvg: parseFloat(document.getElementById('league-avg').value) || 2.5,
  };
}

export function getOdds() {
  return {
    home: parseFloat(document.getElementById('odds-home').value) || 0,
    draw: parseFloat(document.getElementById('odds-draw').value) || 0,
    away: parseFloat(document.getElementById('odds-away').value) || 0,
    overUnder: {
      1.5: {
        over: parseFloat(document.getElementById('ou-15-over').value) || 0,
        under: parseFloat(document.getElementById('ou-15-under').value) || 0,
      },
      2.5: {
        over: parseFloat(document.getElementById('ou-25-over').value) || 0,
        under: parseFloat(document.getElementById('ou-25-under').value) || 0,
      },
      3.5: {
        over: parseFloat(document.getElementById('ou-35-over').value) || 0,
        under: parseFloat(document.getElementById('ou-35-under').value) || 0,
      },
    },
  };
}

export function getSettings() {
  return {
    rho: parseFloat(document.getElementById('rho-slider').value),
    kellyFraction: parseFloat(document.getElementById('kelly-fraction-slider').value),
    bankroll: parseFloat(document.getElementById('bankroll').value) || 0,
  };
}
