/**
 * Shin's method for removing bookmaker margin from odds.
 *
 * More accurate than simple normalization because it accounts for
 * the fact that bookmakers shade odds more on favorites (insider trading model).
 */

/**
 * Remove bookmaker margin using Shin's method.
 * @param {number[]} oddsArray - Decimal odds (e.g., [2.10, 3.40, 3.60])
 * @returns {number[]} True probabilities summing to 1
 */
export function shinProbabilities(oddsArray) {
  const n = oddsArray.length;
  if (n === 0) return [];
  if (oddsArray.some(o => o <= 1)) return simpleFallback(oddsArray);

  const impliedProbs = oddsArray.map(o => 1 / o);
  const totalImplied = impliedProbs.reduce((a, b) => a + b, 0);

  // If no margin (or underround), just normalize
  if (totalImplied <= 1.001) {
    return impliedProbs.map(p => p / totalImplied);
  }

  // Solve for Shin's z parameter iteratively
  // z represents the proportion of insider trading
  let z = solveZ(impliedProbs, n);

  if (z === null) {
    // Fallback to simple normalization
    return simpleFallback(oddsArray);
  }

  // Calculate true probabilities using Shin's formula
  const trueProbs = impliedProbs.map(qi => {
    return (Math.sqrt(z * z + 4 * (1 - z) * qi * qi / totalImplied) - z) / (2 * (1 - z));
  });

  // Normalize to ensure sum = 1 (numerical safety)
  const sum = trueProbs.reduce((a, b) => a + b, 0);
  return trueProbs.map(p => p / sum);
}

/**
 * Solve for Shin's z parameter using bisection method.
 */
function solveZ(impliedProbs, n) {
  const totalImplied = impliedProbs.reduce((a, b) => a + b, 0);

  let lo = 0.0001;
  let hi = 0.5;

  for (let iter = 0; iter < 100; iter++) {
    const mid = (lo + hi) / 2;
    const probSum = impliedProbs.reduce((sum, qi) => {
      return sum + (Math.sqrt(mid * mid + 4 * (1 - mid) * qi * qi / totalImplied) - mid) / (2 * (1 - mid));
    }, 0);

    if (Math.abs(probSum - 1) < 1e-8) return mid;
    if (probSum > 1) lo = mid;
    else hi = mid;
  }

  return null; // didn't converge
}

/**
 * Simple normalization fallback.
 */
function simpleFallback(oddsArray) {
  const impliedProbs = oddsArray.map(o => 1 / o);
  const total = impliedProbs.reduce((a, b) => a + b, 0);
  return impliedProbs.map(p => p / total);
}
