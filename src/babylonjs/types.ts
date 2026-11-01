import type { CardInteractionState } from '@shared/models';

export interface Vector3Like {
  x: number;
  y: number;
  z: number;
}

export interface SceneNode {
  id: string;
  nodeName: string;
  nodeType: 'root' | 'table' | 'meldZone' | 'cardMesh' | 'uiOverlay' | 'particleSystem' | 'light' | 'camera';
  parentNodeId: string | null;
  childNodeIds: string[];
  meshId: string | null;
  materialId: string | null;
  position: Vector3Like;
  rotation: Vector3Like;
  scale: Vector3Like;
}

export interface TextureAtlasCoords {
  u0: number;
  v0: number;
  u1: number;
  v1: number;
}

export type EnhancementIndicatorType =
  | 'gilded'
  | 'echo'
  | 'sticky'
  | 'marked'
  | 'pure'
  | 'hot'
  | 'frozen'
  | 'partner'
  | 'buried'
  | 'anchor';

export interface CardMesh {
  cardId: string;
  sceneNodeId: string;
  faceMeshId: string;
  backMeshId: string;
  faceMaterialId: string;
  backMaterialId: string;
  visualState: Exclude<CardInteractionState, 'ghost'> | 'buried';
  enhancementIndicator: EnhancementIndicatorType | null;
  glowIntensity: number;
  glowColorToken: string | null;
  atlasCoords: TextureAtlasCoords;
  isFaceUp: boolean;
  position: Vector3Like;
  rotation: Vector3Like;
  scale: Vector3Like;
  zOrder: number;
}

export type AnimationStateType =
  | 'Idle'
  | 'Dealing'
  | 'Melding'
  | 'Sealing'
  | 'Discarding'
  | 'Drawing'
  | 'Selecting'
  | 'Deselecting'
  | 'Dragging'
  | 'Hovering'
  | 'Transitioning'
  | 'ScoreReveal'
  | 'ShopEntrance'
  | 'ScreenTransition';

export type EasingFunction =
  | 'linear'
  | 'easeInOutQuad'
  | 'easeOutBack'
  | 'easeInCubic'
  | 'easeOutElastic'
  | 'easeOutBounce';

export interface AnimationTargetValue {
  property: 'position' | 'rotation' | 'scale' | 'glowIntensity' | 'opacity' | 'zOrder';
  value: Vector3Like | number;
}

export interface AnimationState {
  state: AnimationStateType;
  machineId: string;
  startTime: number;
  durationMs: number;
  easing: EasingFunction;
  targetValue: AnimationTargetValue | null;
}

export interface ParticleEffectConfig {
  id: string;
  name: string;
  particleCount: number;
  emissionRate: number;
  lifetimeMs: { min: number; max: number };
  size: { min: number; max: number };
  colorToken: string;
  emissionShape: 'point' | 'sphere' | 'box' | 'ring';
  velocity: Vector3Like;
  gravity: number;
  spriteToken: string | null;
}

export interface PerformanceBudget {
  targetFps: number;
  maxDrawCalls: number;
  maxParticleSystems: number;
  maxTotalParticles: number;
  maxActiveAnimations: number;
  maxStateUpdateLatencyMs: number;
  gpuFrameTimeBudgetMs: number;
  maxTextureMemoryMb: number;
  maxMeshInstances: number;
}

export interface PerformanceMetrics {
  fps: number;
  drawCalls: number;
  activeParticleSystems: number;
  totalParticles: number;
  activeAnimations: number;
  stateUpdateLatencyMs: number;
  gpuFrameTimeMs: number;
  textureMemoryMb: number;
  meshInstances: number;
}
