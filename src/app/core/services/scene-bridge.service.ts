import { Injectable, computed, signal, untracked } from '@angular/core';
import type { ActionButtonState, BabylonGameObject, CardRenderObject, MeldZoneRenderObject, ScreenLayout } from '@shared/models';
import { SceneEventRaiser, SceneUpdateHandlers } from '@rendering/index';
import type { SceneEvents, SceneUpdateSnapshot } from '@rendering/index';

@Injectable({ providedIn: 'root' })
export class SceneBridgeService {
  private readonly updateHandlers = new SceneUpdateHandlers();
  private readonly eventRaiser = new SceneEventRaiser();

  readonly gameObjects = signal<readonly BabylonGameObject[]>([]);
  readonly actionButtons = signal<readonly ActionButtonState[]>([]);
  readonly layout = signal<ScreenLayout | null>(null);
  readonly snapshot = computed<SceneUpdateSnapshot>(() => {
    this.updateHandlers.syncGameObjects(this.gameObjects());
    this.updateHandlers.syncActionButtons(this.actionButtons());
    const layout = this.layout();
    if (layout) {
      this.updateHandlers.transitionScene(layout);
    }
    return this.updateHandlers.getSnapshot();
  });

  registerGameObject(gameObject: BabylonGameObject): void {
    const existing = untracked(() => this.gameObjects()).filter((object) => object.id !== gameObject.id);
    this.gameObjects.set([...existing, gameObject]);
  }

  unregisterGameObject(id: string): void {
    this.gameObjects.set(this.gameObjects().filter((object) => object.id !== id));
  }

  syncCardMeshes(cardObjects: readonly CardRenderObject[]): void {
    this.updateHandlers.syncCardMeshes(cardObjects);
  }

  syncMeldZones(zones: readonly MeldZoneRenderObject[]): void {
    this.updateHandlers.syncMeldZones(zones);
  }

  syncActionButtons(states: readonly ActionButtonState[]): void {
    this.actionButtons.set(states);
  }

  transitionScene(target: ScreenLayout): void {
    this.layout.set(target);
  }

  highlightCard(cardId: string, highlightType: string): void {
    this.updateHandlers.highlightCard(cardId, highlightType);
  }

  updateDragGhost(cardId: string, screenPos: { x: number; y: number }): void {
    this.updateHandlers.updateDragGhost(cardId, screenPos);
  }

  on<T extends keyof SceneEvents>(eventName: T, handler: (payload: SceneEvents[T]) => void): void {
    this.eventRaiser.on(eventName, handler);
  }

  raise<T extends keyof SceneEvents>(eventName: T, payload: SceneEvents[T]): void {
    this.eventRaiser.raise(eventName, payload);
  }
}
