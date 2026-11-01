import { describe, expect, it } from 'vitest';
import type { CardRenderObject, CardVisualState } from '../../shared/models';
import { defaultTransform } from '../../shared/models';
import { SceneBridgeService } from './scene-bridge.service';

function cardVisualState(id: string): CardVisualState {
  const card = {
    id,
    rank: '2',
    suit: 'hearts',
    pointValue: 20,
    isWild: true,
    isRedThree: false,
    isBlackThree: false,
    enhancementId: null,
  } as const;

  return {
    card,
    interactionState: 'wild',
    faceDown: false,
    ariaLabel: '2 of hearts',
    enhancementIndicator: null,
    selected: false,
  };
}

function cardObject(id: string, zOrder = 0): CardRenderObject {
  const visualState = cardVisualState(id);

  return {
    id,
    kind: 'card',
    target: 'babylon',
    transform: defaultTransform(zOrder),
    ariaLabel: visualState.ariaLabel,
    sceneNodeId: `card-${id}`,
    visible: true,
    card: visualState.card,
    visualState,
    faceUp: true,
    glowColorToken: null,
    glowIntensity: 0,
  };
}

describe('SceneBridgeService', () => {
  it('replaces registered objects by id without duplicating bridge entries', () => {
    const bridge = new SceneBridgeService();

    bridge.registerGameObject(cardObject('c1'));
    bridge.registerGameObject(cardObject('c1', 2));

    expect(bridge.gameObjects()).toHaveLength(1);
    expect(bridge.snapshot().cardMeshes[0]?.zOrder).toBe(2);
  });
});
