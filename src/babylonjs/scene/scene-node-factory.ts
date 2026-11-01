import type { SceneNode, Vector3Like } from '../types';

const ORIGIN: Vector3Like = { x: 0, y: 0, z: 0 };
const UNIT_SCALE: Vector3Like = { x: 1, y: 1, z: 1 };

function createNode(
  id: string,
  nodeName: string,
  nodeType: SceneNode['nodeType'],
  meshId: string | null = null,
  materialId: string | null = null,
): SceneNode {
  return {
    id,
    nodeName,
    nodeType,
    parentNodeId: null,
    childNodeIds: [],
    meshId,
    materialId,
    position: { ...ORIGIN },
    rotation: { ...ORIGIN },
    scale: { ...UNIT_SCALE },
  };
}

export function createRootNode(): SceneNode {
  return createNode('root', 'root', 'root');
}

export function createCameraNode(): SceneNode {
  return createNode('camera-main', 'MainCamera', 'camera');
}

export function createLightNode(id: 'ambient' | 'directional' | 'highlight'): SceneNode {
  return createNode(`light-${id}`, `Light-${id}`, 'light');
}

export function createTableNode(): SceneNode {
  return createNode('table-surface', 'TableSurface', 'table', 'mesh-table-surface', 'material-table-surface');
}

export function createMeldZoneNode(zoneIndex: number): SceneNode {
  return createNode(`zone-meld-${zoneIndex}`, `MeldZone-${zoneIndex}`, 'meldZone', `mesh-zone-meld-${zoneIndex}`, `material-zone-meld-${zoneIndex}`);
}

export function createCardMeshNode(cardId: string): SceneNode {
  return createNode(`card-${cardId}`, `Card-${cardId}`, 'cardMesh', `mesh-card-${cardId}`, `material-card-${cardId}`);
}

export function createParticleSystemNode(effectId: string): SceneNode {
  return createNode(`particle-${effectId}`, `Particle-${effectId}`, 'particleSystem');
}

export function createUIOverlayNode(overlayId: string): SceneNode {
  return createNode(`ui-${overlayId}`, `Ui-${overlayId}`, 'uiOverlay');
}
