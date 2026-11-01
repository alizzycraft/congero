import type { CardRenderObject } from '@shared/models';
import type { CardMesh } from '../types';
import { getAtlasCoords } from './texture-atlas';

export const CARD_GEOMETRY = {
  widthMeters: 0.063,
  heightMeters: 0.088,
  subdivisions: 1,
} as const;

export function toCardMesh(renderObject: CardRenderObject): CardMesh {
  const enhancement = renderObject.visualState.enhancementIndicator?.type ?? null;
  return {
    cardId: renderObject.card.id,
    sceneNodeId: renderObject.sceneNodeId,
    faceMeshId: `mesh-card-${renderObject.card.id}-face`,
    backMeshId: `mesh-card-${renderObject.card.id}-back`,
    faceMaterialId: `material-card-${renderObject.card.rank}-${renderObject.card.suit ?? 'joker'}`,
    backMaterialId: 'material-card-back',
    visualState: renderObject.visualState.interactionState === 'ghost' ? 'default' : renderObject.visualState.interactionState,
    enhancementIndicator: enhancement,
    glowIntensity: renderObject.glowIntensity,
    glowColorToken: renderObject.glowColorToken,
    atlasCoords: getAtlasCoords(renderObject.card.rank, renderObject.card.suit),
    isFaceUp: renderObject.faceUp,
    position: { ...renderObject.transform.position },
    rotation: { ...renderObject.transform.rotation },
    scale: { ...renderObject.transform.scale },
    zOrder: renderObject.transform.zOrder,
  };
}
