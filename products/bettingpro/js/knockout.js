// js/knockout.js
//
// Single source of truth for what counts as a knockout stage.
//
// football-data.org tags matches with a `stage` field. Domestic club leagues
// use `REGULAR_SEASON`, group tournaments use `GROUP_STAGE`, and only the
// bracket rounds below are real knockout stages. Treating "anything that isn't
// GROUP_STAGE" as knockout wrongly pulls REGULAR_SEASON matches into the
// Knockout Results section — so every consumer must test against this set.

/** Real knockout-bracket stages, in bracket order. */
export const KNOCKOUT_STAGE_ORDER = ['LAST_32', 'LAST_16', 'QUARTER_FINAL', 'SEMI_FINAL', 'THIRD_PLACE', 'FINAL'];

/** Set form for membership tests. */
export const KNOCKOUT_STAGES = new Set(KNOCKOUT_STAGE_ORDER);

/** True only for actual knockout-bracket stages (not REGULAR_SEASON/GROUP_STAGE). */
export function isKnockoutStage(stage) {
  return KNOCKOUT_STAGES.has(stage);
}
