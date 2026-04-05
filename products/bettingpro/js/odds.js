/**
 * Bookmaker odds parsing, implied probabilities, and margin removal.
 */

export function impliedProbability(decimalOdds) {
  return 1 / decimalOdds;
}

export function marginPercentage(oddsArray) {
  const totalImplied = oddsArray.reduce((sum, odds) => sum + impliedProbability(odds), 0);
  return totalImplied - 1;
}

export function removeMargin(oddsArray) {
  const impliedProbs = oddsArray.map(impliedProbability);
  const totalImplied = impliedProbs.reduce((a, b) => a + b, 0);
  return impliedProbs.map(p => p / totalImplied);
}
