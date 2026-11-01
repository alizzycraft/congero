export interface SceneEvents {
  cardClicked: { cardId: string; button: 'left' | 'right' };
  cardDroppedOnMeldZone: { cardId: string; zoneIndex: number };
  drawPileClicked: Record<string, never>;
  actionButtonClicked: { action: string };
  shopItemClicked: { itemId: string };
}

type SceneEventName = keyof SceneEvents;
type SceneEventHandler<T extends SceneEventName> = (payload: SceneEvents[T]) => void;

export class SceneEventRaiser {
  private readonly handlers: { [K in SceneEventName]: SceneEventHandler<K>[] } = {
    cardClicked: [],
    cardDroppedOnMeldZone: [],
    drawPileClicked: [],
    actionButtonClicked: [],
    shopItemClicked: [],
  };

  on<T extends SceneEventName>(eventName: T, handler: SceneEventHandler<T>): void {
    this.handlers[eventName].push(handler);
  }

  raise<T extends SceneEventName>(eventName: T, payload: SceneEvents[T]): void {
    for (const handler of this.handlers[eventName]) {
      handler(payload);
    }
  }
}
