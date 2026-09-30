import { describe, expect, it } from 'vitest';
import { RUN_CARD_DEFINITIONS } from '../progression/runCards';
import { RUN_CARD_ICONS } from '../../phaser/ui/runCardIcons';

describe('run card icon coverage', () => {
  it('gives every active card a distinct, nonempty vector icon', () => {
    const icons = RUN_CARD_DEFINITIONS.map((card) => RUN_CARD_ICONS[card.id]);
    expect(icons.every((icon) => icon.length > 0)).toBe(true);
    expect(new Set(icons.map((icon) => JSON.stringify(icon))).size).toBe(icons.length);
  });
});
