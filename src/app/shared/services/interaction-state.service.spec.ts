import { describe, expect, it } from 'vitest';
import type { Card } from '@core/game-rules';
import { withEnhancement } from '@core/enhancements';
import { InteractionStateService } from './interaction-state.service';

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: overrides.id ?? 'c1',
    rank: overrides.rank ?? 'K',
    suit: overrides.suit ?? 'hearts',
    pointValue: overrides.pointValue ?? 10,
    isWild: overrides.isWild ?? false,
    isRedThree: overrides.isRedThree ?? false,
    isBlackThree: overrides.isBlackThree ?? false,
    enhancementId: overrides.enhancementId ?? null,
  };
}

describe('InteractionStateService', () => {
  it('derives wild card visual state', () => {
    const service = new InteractionStateService();
    const state = service.deriveCardVisualState(
      makeCard({ rank: '2', isWild: true, pointValue: 20 }),
      null,
      'Meld',
    );

    expect(state.interactionState).toBe('wild');
    expect(state.ariaLabel).toContain('2 of hearts');
  });

  it('derives enhanced card visual state', () => {
    const service = new InteractionStateService();
    const card = withEnhancement(makeCard(), {
      type: 'gilded',
      instanceId: 'e1',
      appliedViaSeal: true,
      duration: 'permanent',
      configValue: null,
    });
    const state = service.deriveCardVisualState(card, null, 'Meld');

    expect(state.interactionState).toBe('enhanced');
    expect(state.enhancementIndicator?.label).toBe('Gilded');
  });

  it('computes ghost slots for meld states', () => {
    const service = new InteractionStateService();
    const empty = service.deriveMeldVisualState(null);

    expect(service.computeGhostSlots(empty)).toBe(3);
  });
});
