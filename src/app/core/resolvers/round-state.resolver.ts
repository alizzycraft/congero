import { Injectable } from '@angular/core';
import type { Resolve } from '@angular/router';
import { RoundStateService } from '../services/round-state.service';
import { RunStateService } from '../services/run-state.service';

@Injectable({ providedIn: 'root' })
export class RoundStateResolver implements Resolve<boolean> {
  constructor(
    private readonly roundState: RoundStateService,
    private readonly runState: RunStateService,
  ) {}

  resolve(): boolean {
    if (this.runState.runState().roundPhase === 'Draw' && this.roundState.handCards().length === 0) {
      this.roundState.beginTurn();
    }
    return true;
  }
}
