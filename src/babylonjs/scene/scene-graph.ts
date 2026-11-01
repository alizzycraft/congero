import type { SceneNode } from '../types';
import {
  createCameraNode,
  createLightNode,
  createMeldZoneNode,
  createParticleSystemNode,
  createRootNode,
  createTableNode,
  createUIOverlayNode,
} from './scene-node-factory';

export class SceneGraph {
  private readonly nodes = new Map<string, SceneNode>();

  createNode(node: SceneNode): SceneNode {
    if (this.nodes.has(node.id)) {
      throw new Error(`Scene node already exists: ${node.id}`);
    }
    if (node.nodeType === 'root' && this.getNodesByType('root').length > 0) {
      throw new Error('Scene graph can only have one root node');
    }
    this.nodes.set(node.id, { ...node, childNodeIds: [...node.childNodeIds] });
    return this.getNodeOrThrow(node.id);
  }

  getNode(id: string): SceneNode | undefined {
    return this.nodes.get(id);
  }

  setParent(childId: string, parentId: string): void {
    const child = this.getNodeOrThrow(childId);
    const parent = this.getNodeOrThrow(parentId);
    if (child.parentNodeId) {
      const oldParent = this.getNodeOrThrow(child.parentNodeId);
      oldParent.childNodeIds = oldParent.childNodeIds.filter((id) => id !== childId);
    }
    child.parentNodeId = parentId;
    if (!parent.childNodeIds.includes(childId)) {
      parent.childNodeIds.push(childId);
    }
  }

  removeNode(id: string): void {
    const node = this.getNode(id);
    if (!node) return;
    for (const childId of [...node.childNodeIds]) {
      this.removeNode(childId);
    }
    if (node.parentNodeId) {
      const parent = this.getNode(node.parentNodeId);
      if (parent) {
        parent.childNodeIds = parent.childNodeIds.filter((childId) => childId !== id);
      }
    }
    this.nodes.delete(id);
  }

  getDescendants(id: string): SceneNode[] {
    const node = this.getNodeOrThrow(id);
    return node.childNodeIds.flatMap((childId) => {
      const child = this.getNodeOrThrow(childId);
      return [child, ...this.getDescendants(childId)];
    });
  }

  getChildren(id: string): SceneNode[] {
    return this.getNodeOrThrow(id).childNodeIds.map((childId) => this.getNodeOrThrow(childId));
  }

  getNodesByType(type: SceneNode['nodeType']): SceneNode[] {
    return [...this.nodes.values()].filter((node) => node.nodeType === type);
  }

  private getNodeOrThrow(id: string): SceneNode {
    const node = this.nodes.get(id);
    if (!node) throw new Error(`Scene node not found: ${id}`);
    return node;
  }
}

export function buildDefaultSceneGraph(meldZoneCount = 5): SceneGraph {
  const graph = new SceneGraph();
  graph.createNode(createRootNode());
  for (const node of [
    createCameraNode(),
    createLightNode('ambient'),
    createLightNode('directional'),
    createLightNode('highlight'),
    createTableNode(),
    createParticleSystemNode('seal-burst'),
    createParticleSystemNode('wild-glow'),
    createParticleSystemNode('frozen-shimmer'),
    createParticleSystemNode('hot-flame'),
    createUIOverlayNode('tooltip-layer'),
  ]) {
    graph.createNode(node);
    graph.setParent(node.id, 'root');
  }
  for (let index = 0; index < meldZoneCount; index += 1) {
    const zone = createMeldZoneNode(index);
    graph.createNode(zone);
    graph.setParent(zone.id, 'table-surface');
  }
  return graph;
}
