import type { DeckState, RecoveryStrategy, RunState } from '../models';
import { createInitialRoundState } from '../models';
import { appendErrorEntry, createErrorEntry } from './error-log';

export interface RecoveryResult {
  success: boolean;
  recoveredState: RunState | null;
  error: string | null;
}

function resetDeckLocations(deckState: DeckState): DeckState {
  return {
    ...deckState,
    cards: deckState.cards.map((entry, index) => ({
      ...entry,
      inDrawPile: index >= 11,
      inHand: index < 11,
      meldId: null,
      inDiscardPile: false,
      isAutoPlayed: false,
    })),
  };
}

export function resetToRoundStart(state: RunState): RecoveryResult {
  if (!state.roundState) {
    return { success: false, recoveredState: null, error: 'Cannot reset: no round state exists.' };
  }
  const deckState = resetDeckLocations(state.deckState);
  const recovered: RunState = {
    ...state,
    deckState,
    roundState: {
      ...createInitialRoundState(deckState),
      anteNumber: state.roundState.anteNumber,
      roundNumber: state.roundState.roundNumber,
      absoluteRoundNumber: state.roundState.absoluteRoundNumber,
      scoreTarget: state.roundState.scoreTarget,
      isBossRound: state.roundState.isBossRound,
      bossRuleId: state.roundState.bossRuleId,
    },
    isInRecovery: false,
    activeRecoveryStrategy: null,
    errorLog: appendErrorEntry(
      state.errorLog,
      createErrorEntry('INVALID_STATE', 'Reset to round start applied.', 'RESET_TO_ROUND_START', 'RESET_TO_ROUND_START' satisfies RecoveryStrategy, true),
    ),
  };
  return { success: true, recoveredState: recovered, error: null };
}
