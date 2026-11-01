import { Injectable } from '@angular/core';
import type { CardVisualState, CardRenderObject, MeldVisualState, MeldZoneRenderObject, TableRenderObject } from '../models';
import { defaultTransform } from '../models';

@Injectable({ providedIn: 'root' })
export class RenderObjectAdapterService {
  tableObject(id = 'game-table'): TableRenderObject {
    return {
      id,
      kind: 'table',
      target: 'babylon',
      sceneNodeId: `table-${id}`,
      visible: true,
      transform: defaultTransform(0),
      ariaLabel: '3D game table',
      width: 12,
      depth: 7,
      materialToken: 'panel-gameplayBg',
    };
  }

  cardObject(visualState: CardVisualState, index: number, zoneId: string): CardRenderObject {
    const selected = visualState.interactionState === 'selected' || visualState.interactionState === 'dragging';
    return {
      id: `card-object-${visualState.card.id}`,
      kind: 'card',
      target: 'babylon',
      sceneNodeId: `card-${zoneId}-${visualState.card.id}`,
      visible: true,
      transform: {
        position: { x: index * 0.72, y: selected ? 0.08 : 0.02, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
        zOrder: index,
      },
      ariaLabel: visualState.ariaLabel,
      card: visualState.card,
      visualState,
      faceUp: !visualState.faceDown,
      glowColorToken: visualState.enhancementIndicator?.glowColorToken ?? (visualState.card.isWild ? 'color-wildGlow' : null),
      glowIntensity: selected ? 1 : visualState.card.isWild || visualState.enhancementIndicator ? 0.55 : 0,
    };
  }

  meldZoneObject(visualState: MeldVisualState, index: number): MeldZoneRenderObject {
    return {
      id: `meld-zone-object-${visualState.id}-${index}`,
      kind: 'meldZone',
      target: 'babylon',
      sceneNodeId: `zone-meld-${index}`,
      visible: true,
      transform: {
        position: { x: index * 2.1 - 4.2, y: 0.01, z: 1.2 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
        zOrder: index,
      },
      ariaLabel: visualState.ariaLabel,
      visualState,
    };
  }
}
