# Asteridle Agent Instructions

## Project Commands

- Build check: `pnpm run build`
- Dev server: `pnpm run dev`

## Develop Feature Workflow

When the user prompt is `develop-feature` or asks to develop the next feature:

1. Read `BACKLOG.md`.
2. Select the first item under `Ready` unless the user names a different backlog item.
3. Implement only that item and any directly required supporting changes.
4. Keep game simulation state serializable and separate from Phaser renderer objects.
5. Update `BACKLOG.md` to mark the item complete, split remaining work, or add follow-up notes.
6. Run `pnpm run build`.
7. In the final response, summarize the implemented feature, files changed, and verification.

If the selected backlog item is too broad for one pass, split it into smaller ready items in `BACKLOG.md` first, then implement the first useful slice.

## Develop Improvement Workflow

When the user prompt is `develop-improvement` or asks to develop the next engineering improvement:

1. Read `TECHNICAL_DEBT.md`.
2. Select the first item under `Ready` unless the user names a different technical debt item.
3. Implement only that item and any directly required supporting changes.
4. Keep game simulation state serializable and separate from Phaser renderer objects.
5. Update `TECHNICAL_DEBT.md` to mark the item complete, split remaining work, or add follow-up notes.
6. Run `pnpm run build`.
7. In the final response, summarize the implemented improvement, files changed, and verification.

If the selected technical debt item is too broad for one pass, split it into smaller ready items in `TECHNICAL_DEBT.md` first, then implement the first useful slice.

## Game Direction

- This is a Phaser/Vite 2D browser game with DOM HUD and shop UI.
- Prefer small, playable idle systems over large rewrites.
- Preserve the borderless movement and camera-followed playfield.
- Death should remain a repair-cost setback with automatic respawn, not a hard game over.
