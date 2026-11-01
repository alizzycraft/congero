import { describe, it, expect } from 'vitest';
import { lookupInteraction, getInteractionMatrix } from '../transforms/interaction-matrix';
import type { EnhancementType } from '../models/enhancement-type';

describe('interaction matrix', () => {
  it('matrix is symmetric for all 45 unique pairs', () => {
    const types: EnhancementType[] = ['gilded', 'echo', 'sticky', 'marked', 'pure', 'hot', 'frozen', 'partner', 'buried', 'anchor'];
    for (let i = 0; i < types.length; i++) {
      for (let j = i; j < types.length; j++) {
        const ab = lookupInteraction(types[i], types[j]);
        const ba = lookupInteraction(types[j], types[i]);
        expect(ab.interactionType).toBe(ba.interactionType);
      }
    }
  });

  it('diagonal entries return no_interaction', () => {
    const types: EnhancementType[] = ['gilded', 'echo', 'sticky', 'marked', 'pure', 'hot', 'frozen', 'partner', 'buried', 'anchor'];
    for (const type of types) {
      const result = lookupInteraction(type, type);
      expect(result.interactionType).toBe('no_interaction');
    }
  });

  it('gilded + pure = synergistic', () => {
    expect(lookupInteraction('gilded', 'pure').interactionType).toBe('synergistic');
  });

  it('gilded + anchor = synergistic', () => {
    expect(lookupInteraction('gilded', 'anchor').interactionType).toBe('synergistic');
  });

  it('pure + anchor = synergistic', () => {
    expect(lookupInteraction('pure', 'anchor').interactionType).toBe('synergistic');
  });

  it('pure + marked = conflicting', () => {
    expect(lookupInteraction('pure', 'marked').interactionType).toBe('conflicting');
  });

  it('sticky + frozen = synergistic', () => {
    expect(lookupInteraction('sticky', 'frozen').interactionType).toBe('synergistic');
  });

  it('all other off-diagonal pairs = neutral', () => {
    expect(lookupInteraction('echo', 'sticky').interactionType).toBe('neutral');
    expect(lookupInteraction('echo', 'marked').interactionType).toBe('neutral');
    expect(lookupInteraction('hot', 'buried').interactionType).toBe('neutral');
    expect(lookupInteraction('partner', 'buried').interactionType).toBe('neutral');
  });

  it('getInteractionMatrix returns 10x10 matrix', () => {
    const matrix = getInteractionMatrix();
    expect(matrix.size).toBe(10);
    for (const [, row] of matrix) {
      expect(row.size).toBe(10);
    }
  });
});
