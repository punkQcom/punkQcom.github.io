/**
 * Dixon-Coles correction for low-scoring outcomes.
 * Adjusts the independent Poisson probabilities for 0-0, 1-0, 0-1, 1-1 scorelines.
 */

export function dixonColesCorrection(homeGoals, awayGoals, lambdaHome, lambdaAway, rho) {
  if (homeGoals === 0 && awayGoals === 0) {
    return 1 - lambdaHome * lambdaAway * rho;
  }
  if (homeGoals === 0 && awayGoals === 1) {
    return 1 + lambdaHome * rho;
  }
  if (homeGoals === 1 && awayGoals === 0) {
    return 1 + lambdaAway * rho;
  }
  if (homeGoals === 1 && awayGoals === 1) {
    return 1 - rho;
  }
  return 1.0;
}

export function applyDixonColes(matrix, lambdaHome, lambdaAway, rho) {
  const adjusted = matrix.map(row => [...row]);
  for (let i = 0; i < Math.min(2, adjusted.length); i++) {
    for (let j = 0; j < Math.min(2, adjusted[i].length); j++) {
      const tau = dixonColesCorrection(i, j, lambdaHome, lambdaAway, rho);
      adjusted[i][j] = matrix[i][j] * tau;
    }
  }
  return adjusted;
}
