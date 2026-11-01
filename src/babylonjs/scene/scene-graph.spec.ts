import { describe, expect, it } from 'vitest';
import { buildDefaultSceneGraph, SceneGraph } from './scene-graph';
import { createCardMeshNode, createRootNode, createTableNode } from './scene-node-factory';

describe('SceneGraph', () => {
  it('creates a single root node', () => {
    const graph = new SceneGraph();
    const root = graph.createNode(createRootNode());

    expect(root.nodeType).toBe('root');
    expect(root.parentNodeId).toBeNull();
  });

  it('sets parent-child relationships', () => {
    const graph = new SceneGraph();
    graph.createNode(createRootNode());
    graph.createNode(createTableNode());
    graph.setParent('table-surface', 'root');

    expect(graph.getNode('table-surface')?.parentNodeId).toBe('root');
    expect(graph.getNode('root')?.childNodeIds).toContain('table-surface');
  });

  it('removes descendants recursively', () => {
    const graph = new SceneGraph();
    graph.createNode(createRootNode());
    graph.createNode(createTableNode());
    graph.createNode(createCardMeshNode('c1'));
    graph.setParent('table-surface', 'root');
    graph.setParent('card-c1', 'table-surface');

    graph.removeNode('table-surface');

    expect(graph.getNode('table-surface')).toBeUndefined();
    expect(graph.getNode('card-c1')).toBeUndefined();
  });

  it('builds the default scene graph with five meld zones', () => {
    const graph = buildDefaultSceneGraph();

    expect(graph.getNodesByType('root')).toHaveLength(1);
    expect(graph.getNodesByType('meldZone')).toHaveLength(5);
  });
});
