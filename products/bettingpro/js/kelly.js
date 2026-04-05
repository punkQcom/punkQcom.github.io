/**
 * Kelly criterion for optimal bet sizing.
 */

export function calculateEdge(yourProbability, bookmakerProbability) {
  return yourProbability - bookmakerProbability;
}

export function kellyFraction(probability, decimalOdds) {
  const b = decimalOdds - 1;
  const q = 1 - probability;
  const fraction = (b * probability - q) / b;
  return Math.max(0, fraction);
}

export function kellyStake(probability, decimalOdds, bankroll, kellyMultiplier) {
  const fraction = kellyFraction(probability, decimalOdds);
  return fraction * kellyMultiplier * bankroll;
}
