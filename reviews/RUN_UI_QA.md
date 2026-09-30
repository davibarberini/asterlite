# Run UI QA

## Scope

Death feedback, run results, ship selection, and icons for all 18 active run cards.
Independent review by a QA subagent, followed by local browser testing and fixes.

## Findings Resolved

- Technology content replacement lost keyboard focus: focus now moves to the modal heading.
- Phaser captured Space globally: capture is disabled in menus so native buttons work.
- Reduced-motion users still received launch camera effects: launch now skips the warp animation.
- Drawer pointer capture intercepted close-button clicks: interactive header controls no longer start drag.
- Results/cards could be dragged despite being mandatory: dragging is disabled for these stages.
- Card choices displayed a nonfunctional close button: close controls are hidden.
- Death devtool reopened settings after triggering death: only rerender if settings remains active.

## Verified

- 390 x 844: ship tiles, trait text, selected checkmark, launch action, and results fit.
- 360 x 740: readable card icons/effects, zero horizontal overflow, results and preparation usable.
- 1280 x 800: ship selection, traits, and primary action remain readable and correctly framed.
- Death -> delayed results -> Continue -> ship selection -> launch -> gameplay.
- Technologies opens with heading focus; Shift+Tab remains in the dialog.
- Closing technologies by pointer returns to preparation.
- Space activates Continue and card choices.
- Ended saves reopen results without respawning.
- All active cards have unique nonempty icons (automated coverage test).

## Remaining Manual Coverage

- Real iOS/Android touch hardware and screen-reader testing.
- Reduced-motion preference behavior is code-reviewed; OS preference was not changed during QA.
- Exhaustive combinations of four-card offers and long translated text remain a device test.

## Next Product Checks

1. Tune the first five minutes: clear targets, XP pacing, boss entry, and death recovery.
2. Give each zone a readable identity without adding more menus.
3. Tune Mothership readability and difficulty, then resume the deferred card families.
