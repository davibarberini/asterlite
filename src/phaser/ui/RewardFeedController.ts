import type { GameRewardEvent, GameRewardKind } from '../../game/simulation/types';

export class RewardFeedController {
  constructor(private readonly root: HTMLElement) {}

  showEvents(events: GameRewardEvent[]): void {
    events
      .splice(0, 5)
      .sort((a, b) => this.getRewardPriority(a.kind) - this.getRewardPriority(b.kind))
      .forEach((event) => this.prependEvent(event));

    this.prune();
  }

  private prependEvent(event: GameRewardEvent): void {
    const item = document.createElement('div');
    const kind = event.kind ?? 'payout';
    item.className = `reward-feed-item reward-feed-item--${kind}`;
    item.dataset.feedKind = kind;
    item.textContent = event.text;
    item.style.setProperty('--reward-feed-duration', kind === 'payout' ? '1.8s' : '3.6s');
    this.root.prepend(item);
    window.setTimeout(() => item.remove(), kind === 'payout' ? 1900 : 3700);
  }

  private getRewardPriority(kind: GameRewardKind = 'payout'): number {
    if (kind === 'payout') {
      return 0;
    }
    if (kind === 'system') {
      return 1;
    }
    if (kind === 'boss') {
      return 2;
    }
    if (kind === 'unlock') {
      return 3;
    }
    return 4;
  }

  private prune(): void {
    const payoutItems = Array.from(this.root.children).filter((child) => (child as HTMLElement).dataset.feedKind === 'payout');
    payoutItems.slice(3).forEach((child) => child.remove());

    if (this.root.children.length > 5) {
      Array.from(this.root.children).slice(5).forEach((child) => child.remove());
    }
  }
}
