import { Injectable, computed, signal } from '@angular/core';
import type { DeckState, ErrorLogEntry, RunState } from '../models';
import { RunStateService } from './run-state.service';

@Injectable({ providedIn: 'root' })
export class ErrorRecoveryService {
  private readonly errorLogSource = signal<readonly ErrorLogEntry[]>([]);
  private lastValidState: { runState: RunState; deckState: DeckState } | null = null;

  readonly errorLog = computed(() => this.errorLogSource());
  readonly hasFatalError = computed(() => this.errorLog().some((entry) => entry.severity === 'fatal'));

  constructor(private readonly runState: RunStateService) {
    this.captureValidState();
  }

  /** TRANSFORM: detects impossible run/deck state combinations. */
  detectInvalidState(): boolean {
    return this.runState.runState().scoreTarget <= 0 || this.runState.deckState().cards.length === 0;
  }

  /** ORCHESTRATION: logs an error without mutating another domain directly. */
  recordError(message: string, domain: string, severity: ErrorLogEntry['severity'] = 'recoverable'): void {
    this.errorLogSource.update((entries) => [
      ...entries,
      { id: `error-${entries.length + 1}`, message, domain, severity },
    ]);
  }

  /** EFFECT: captures the current valid state for local rollback. */
  captureValidState(): void {
    this.lastValidState = {
      runState: this.runState.runState(),
      deckState: this.runState.deckState(),
    };
  }

  /** ORCHESTRATION: restores through RunStateService's public entry point. */
  rollbackToLastValid(): boolean {
    if (!this.lastValidState) return false;
    this.runState.loadRun(this.lastValidState.runState, this.lastValidState.deckState);
    return true;
  }

  /** ORCHESTRATION: clears owned error state. */
  clearErrors(): void {
    this.errorLogSource.set([]);
  }
}
