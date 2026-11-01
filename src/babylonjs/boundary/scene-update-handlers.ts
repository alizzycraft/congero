import type { ActionButtonState, BabylonGameObject, CardRenderObject, MeldZoneRenderObject, ScreenLayout } from '@shared/models';
import type { CardMesh } from '../types';
import { toCardMesh } from '../cards/card-mesh-pipeline';

export interface SceneUpdateSnapshot {
  cardMeshes: readonly CardMesh[];
  meldZones: readonly MeldZoneRenderObject[];
  actionButtons: readonly ActionButtonState[];
  layout: ScreenLayout | null;
  highlightedCardId: string | null;
  dragGhost: { cardId: string; screenPos: { x: number; y: number } } | null;
}

export class SceneUpdateHandlers {
  private snapshot: SceneUpdateSnapshot = {
    cardMeshes: [],
    meldZones: [],
    actionButtons: [],
    layout: null,
    highlightedCardId: null,
    dragGhost: null,
  };

  syncGameObjects(gameObjects: readonly BabylonGameObject[]): void {
    const cardObjects = gameObjects.filter((object): object is CardRenderObject => object.kind === 'card');
    const meldZones = gameObjects.filter((object): object is MeldZoneRenderObject => object.kind === 'meldZone');
    this.snapshot = {
      ...this.snapshot,
      cardMeshes: cardObjects.map(toCardMesh),
      meldZones,
    };
  }

  syncCardMeshes(cardObjects: readonly CardRenderObject[]): void {
    this.snapshot = { ...this.snapshot, cardMeshes: cardObjects.map(toCardMesh) };
  }

  syncMeldZones(zones: readonly MeldZoneRenderObject[]): void {
    this.snapshot = { ...this.snapshot, meldZones: zones };
  }

  syncActionButtons(states: readonly ActionButtonState[]): void {
    this.snapshot = { ...this.snapshot, actionButtons: states };
  }

  transitionScene(target: ScreenLayout): void {
    this.snapshot = { ...this.snapshot, layout: target };
  }

  highlightCard(cardId: string, _highlightType: string): void {
    this.snapshot = { ...this.snapshot, highlightedCardId: cardId };
  }

  updateDragGhost(cardId: string, screenPos: { x: number; y: number }): void {
    this.snapshot = { ...this.snapshot, dragGhost: { cardId, screenPos } };
  }

  getSnapshot(): SceneUpdateSnapshot {
    return this.snapshot;
  }
}
