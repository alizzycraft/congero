import { describe, expect, it } from 'vitest';
import type { CardVisualState } from '../models';
import { RenderObjectAdapterService } from './render-object-adapter.service';

describe('RenderObjectAdapterService', () => {
  it('creates Babylon card render objects from visual state', () => {
    const service = new RenderObjectAdapterService();
    const visualState: CardVisualState = {
      card: {
        id: 'c1',
        rank: '2',
        suit: 'hearts',
        pointValue: 20,
        isWild: true,
        isRedThree: false,
        isBlackThree: false,
        enhancementId: null,
      },
      interactionState: 'wild',
      faceDown: false,
      ariaLabel: '2 of hearts',
      enhancementIndicator: null,
      selected: false,
    };

    const object = service.cardObject(visualState, 0, 'hand-zone');

    expect(object.target).toBe('babylon');
    expect(object.kind).toBe('card');
    expect(object.glowColorToken).toBe('color-wildGlow');
  });
});
