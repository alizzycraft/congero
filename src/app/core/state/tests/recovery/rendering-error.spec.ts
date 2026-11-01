import { describe, expect, it } from 'vitest';
import { createInitialRunState, handleRenderingError } from '../../index';

describe('Area 8 rendering error recovery', () => {
  it('logs rendering errors without changing round or deck state', () => {
    const state = createInitialRunState('run-rendering', 1000);
    const recovered = handleRenderingError(state, {
      message: 'Scene failed',
      operation: 'renderFrame',
      context: { scene: 'gameplay' },
    }, 2000);

    expect(recovered.deckState).toBe(state.deckState);
    expect(recovered.roundState).toBe(state.roundState);
    expect(recovered.errorLog[0].category).toBe('RENDERING_ERROR');
    expect(recovered.errorLog[0].recovered).toBe(true);
  });
});
