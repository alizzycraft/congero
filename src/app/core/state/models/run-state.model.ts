import type { RunProgression } from '@core/deckbuilding';
import type { ActiveModifierState } from '@core/modifiers';
import type { DeckState } from './deck-state.model';
import type { RoundState } from './round-state.model';
import type { RecoveryStrategy, StateErrorEntry } from './error.model';

export interface RunState {
  schemaVersion: number;
  runId: string;
  createdAt: number;
  lastSavedAt: number;
  saveCount: number;
  roundState: RoundState | null;
  deckState: DeckState;
  modifierState: ActiveModifierState;
  runProgression: RunProgression;
  lastValidState: RunState | null;
  errorLog: StateErrorEntry[];
  isInRecovery: boolean;
  activeRecoveryStrategy: RecoveryStrategy | null;
}
