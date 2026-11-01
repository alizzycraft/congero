import { describe, expect, it } from 'vitest';
import type { CardRenderObject, CardVisualState } from '@shared/models';
import { defaultTransform } from '@shared/models';
import { toCardMesh } from './card-mesh-pipeline';

describe('toCardMesh', () => {
  it('carries render transforms into the Babylon mesh snapshot', () => {
    const visualState: CardVisualState = {
      card: {
        id: 'card-1',
        rank: 'A',
        suit: 'spades',
        pointValue: 20,
        isWild: false,
        isRedThree: false,
        isBlackThree: false,
        enhancementId: null,
      },
      interactionState: 'selected',
      faceDown: false,
      ariaLabel: 'A of spades',
      enhancementIndicator: null,
      selected: true,
    };
    const transform = defaultTransform(3);
    transform.position = { x: 2, y: 0.1, z: -1 };
    const renderObject: CardRenderObject = {
      id: 'card-object-card-1',
      kind: 'card',
      target: 'babylon',
      sceneNodeId: 'card-hand-card-1',
      visible: true,
      transform,
      ariaLabel: 'A of spades',
      card: visualState.card,
      visualState,
      faceUp: true,
      glowColorToken: null,
      glowIntensity: 1,
    };

    const mesh = toCardMesh(renderObject);

    expect(mesh.position).toEqual({ x: 2, y: 0.1, z: -1 });
    expect(mesh.scale).toEqual({ x: 1, y: 1, z: 1 });
    expect(mesh.zOrder).toBe(3);
  });
});
