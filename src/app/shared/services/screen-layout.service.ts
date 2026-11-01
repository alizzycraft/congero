import { Injectable } from '@angular/core';
import type { ScreenId, ScreenLayout } from '../models';

const LAYOUTS: Record<ScreenId, ScreenLayout> = {
  'gameplay-hud': {
    id: 'gameplay-hud',
    title: 'Gameplay',
    columnCount: 12,
    rowHeights: ['48px', '160px', '160px', '160px', '140px', '100px', '100px', '64px'],
    zones: [
      { id: 'status-bar', placement: { columnStart: 1, rowStart: 1, columnEnd: 13, rowEnd: 2 }, ariaRole: 'status', focusable: false },
      { id: 'opponent-melds', placement: { columnStart: 1, rowStart: 2, columnEnd: 13, rowEnd: 3 }, ariaRole: 'region', focusable: false },
      { id: 'player-melds', placement: { columnStart: 1, rowStart: 3, columnEnd: 13, rowEnd: 6 }, ariaRole: 'region', focusable: true },
      { id: 'discard-zone', placement: { columnStart: 1, rowStart: 6, columnEnd: 4, rowEnd: 7 }, ariaRole: 'region', focusable: true },
      { id: 'hand-zone', placement: { columnStart: 1, rowStart: 7, columnEnd: 13, rowEnd: 8 }, ariaRole: 'listbox', focusable: true },
      { id: 'action-bar', placement: { columnStart: 1, rowStart: 8, columnEnd: 13, rowEnd: 9 }, ariaRole: 'toolbar', focusable: true },
    ],
  },
  'deck-inventory': {
    id: 'deck-inventory',
    title: 'Deck Inventory',
    columnCount: 12,
    rowHeights: ['48px', '40px', '1fr', '1fr', '1fr', '1fr', '1fr', '64px'],
    zones: [
      { id: 'deck-header', placement: { columnStart: 1, rowStart: 1, columnEnd: 13, rowEnd: 2 }, ariaRole: 'region', focusable: false },
      { id: 'deck-summary', placement: { columnStart: 1, rowStart: 2, columnEnd: 13, rowEnd: 3 }, ariaRole: 'status', focusable: false },
      { id: 'deck-grid', placement: { columnStart: 1, rowStart: 3, columnEnd: 13, rowEnd: 8 }, ariaRole: 'listbox', focusable: true },
      { id: 'deck-actions', placement: { columnStart: 1, rowStart: 8, columnEnd: 13, rowEnd: 9 }, ariaRole: 'toolbar', focusable: true },
    ],
  },
  'shop-rewards': {
    id: 'shop-rewards',
    title: 'Shop Rewards',
    columnCount: 12,
    rowHeights: ['48px', '1fr', '1fr', '1fr', '1fr', '1fr', '1fr', '64px'],
    zones: [
      { id: 'shop-header', placement: { columnStart: 1, rowStart: 1, columnEnd: 13, rowEnd: 2 }, ariaRole: 'region', focusable: false },
      { id: 'shop-grid', placement: { columnStart: 1, rowStart: 2, columnEnd: 13, rowEnd: 8 }, ariaRole: 'list', focusable: true },
      { id: 'shop-actions', placement: { columnStart: 1, rowStart: 8, columnEnd: 13, rowEnd: 9 }, ariaRole: 'toolbar', focusable: true },
    ],
  },
  'score-results': {
    id: 'score-results',
    title: 'Score Results',
    columnCount: 12,
    rowHeights: ['48px', '1fr', '1fr', '1fr', '1fr', '1fr', '40px', '64px'],
    zones: [
      { id: 'score-header', placement: { columnStart: 1, rowStart: 1, columnEnd: 13, rowEnd: 2 }, ariaRole: 'region', focusable: false },
      { id: 'score-display', placement: { columnStart: 4, rowStart: 2, columnEnd: 10, rowEnd: 5 }, ariaRole: 'status', focusable: false },
      { id: 'score-breakdown', placement: { columnStart: 2, rowStart: 5, columnEnd: 12, rowEnd: 7 }, ariaRole: 'list', focusable: true },
      { id: 'score-gold', placement: { columnStart: 2, rowStart: 7, columnEnd: 12, rowEnd: 8 }, ariaRole: 'status', focusable: false },
      { id: 'score-actions', placement: { columnStart: 1, rowStart: 8, columnEnd: 13, rowEnd: 9 }, ariaRole: 'toolbar', focusable: true },
    ],
  },
};

@Injectable({ providedIn: 'root' })
export class ScreenLayoutService {
  getLayout(screenId: ScreenId): ScreenLayout {
    return LAYOUTS[screenId];
  }

  getAllLayouts(): readonly ScreenLayout[] {
    return Object.values(LAYOUTS);
  }
}
