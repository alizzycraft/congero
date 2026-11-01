export type ScreenId =
  | 'gameplay-hud'
  | 'deck-inventory'
  | 'shop-rewards'
  | 'score-results';

export interface GridPlacement {
  columnStart: number;
  rowStart: number;
  columnEnd: number;
  rowEnd: number;
}

export interface ScreenZone {
  id: string;
  placement: GridPlacement;
  ariaRole: 'application' | 'status' | 'region' | 'listbox' | 'toolbar' | 'list';
  focusable: boolean;
}

export interface ScreenLayout {
  id: ScreenId;
  title: string;
  columnCount: number;
  rowHeights: readonly string[];
  zones: readonly ScreenZone[];
}
