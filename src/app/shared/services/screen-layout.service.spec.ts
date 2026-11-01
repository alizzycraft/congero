import { describe, expect, it } from 'vitest';
import { ScreenLayoutService } from './screen-layout.service';

describe('ScreenLayoutService', () => {
  const service = new ScreenLayoutService();

  it('provides all four Area 5 screen layouts', () => {
    expect(service.getAllLayouts().map((layout) => layout.id)).toEqual([
      'gameplay-hud',
      'deck-inventory',
      'shop-rewards',
      'score-results',
    ]);
  });

  it('defines gameplay zones in tab order', () => {
    const layout = service.getLayout('gameplay-hud');

    expect(layout.columnCount).toBe(12);
    expect(layout.zones.map((zone) => zone.id)).toEqual([
      'status-bar',
      'opponent-melds',
      'player-melds',
      'discard-zone',
      'hand-zone',
      'action-bar',
    ]);
  });
});
