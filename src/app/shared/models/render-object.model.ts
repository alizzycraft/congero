import type { Card } from '@core/game-rules';
import type { CardVisualState, MeldVisualState } from './index';

export type RenderTargetType = 'html' | 'babylon';
export type RenderObjectKind = 'card' | 'table' | 'deck' | 'meldZone' | 'discardPile' | 'drawPile' | 'uiOverlay';

export interface RenderVector3 {
  x: number;
  y: number;
  z: number;
}

export interface RenderTransform {
  position: RenderVector3;
  rotation: RenderVector3;
  scale: RenderVector3;
  zOrder: number;
}

export interface RenderObjectBase {
  id: string;
  kind: RenderObjectKind;
  target: RenderTargetType;
  transform: RenderTransform;
  ariaLabel: string;
}

export interface HtmlRenderObject extends RenderObjectBase {
  target: 'html';
  cssClass: string;
}

export interface BabylonRenderObject extends RenderObjectBase {
  target: 'babylon';
  sceneNodeId: string;
  visible: boolean;
}

export interface CardRenderObject extends BabylonRenderObject {
  kind: 'card';
  card: Card;
  visualState: CardVisualState;
  faceUp: boolean;
  glowColorToken: string | null;
  glowIntensity: number;
}

export interface TableRenderObject extends BabylonRenderObject {
  kind: 'table';
  width: number;
  depth: number;
  materialToken: string;
}

export interface MeldZoneRenderObject extends BabylonRenderObject {
  kind: 'meldZone';
  visualState: MeldVisualState;
}

export type BabylonGameObject =
  | CardRenderObject
  | TableRenderObject
  | MeldZoneRenderObject
  | BabylonRenderObject;

export type RenderObject = HtmlRenderObject | BabylonGameObject;

export function isBabylonRenderObject(renderObject: RenderObject): renderObject is BabylonGameObject {
  return renderObject.target === 'babylon';
}

export function defaultTransform(zOrder = 0): RenderTransform {
  return {
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    zOrder,
  };
}
