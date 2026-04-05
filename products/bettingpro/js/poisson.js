/**
 * Poisson distribution math for score prediction.
 */

export function factorial(n) {
  if (n <= 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

export function poissonPmf(lambda, k) {
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
}

export function attackStrength(goalsScored, leagueAvg) {
  return goalsScored / leagueAvg;
}

export function defenseStrength(goalsConceded, leagueAvg) {
  return goalsConceded / leagueAvg;
}

export function expectedGoals(homeScoredAvg, homeConcededAvg, awayScoredAvg, awayConcededAvg, leagueAvg) {
  const homeAttack = attackStrength(homeScoredAvg, leagueAvg);
  const awayDefense = defenseStrength(awayConcededAvg, leagueAvg);
  const awayAttack = attackStrength(awayScoredAvg, leagueAvg);
  const homeDefense = defenseStrength(homeConcededAvg, leagueAvg);

  return {
    lambdaHome: homeAttack * awayDefense * leagueAvg,
    lambdaAway: awayAttack * homeDefense * leagueAvg
  };
}

export function scoreMatrix(lambdaHome, lambdaAway, maxGoals = 7) {
  const matrix = [];
  for (let i = 0; i < maxGoals; i++) {
    matrix[i] = [];
    for (let j = 0; j < maxGoals; j++) {
      matrix[i][j] = poissonPmf(lambdaHome, i) * poissonPmf(lambdaAway, j);
    }
  }
  return matrix;
}
