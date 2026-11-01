import { Injectable } from '@angular/core';
import type { Resolve } from '@angular/router';
import { RunStateService } from '../services/run-state.service';

@Injectable({ providedIn: 'root' })
export class RunStateResolver implements Resolve<boolean> {
  constructor(private readonly runState: RunStateService) {}

  resolve(): boolean {
    if (!this.runState.runActive()) {
      this.runState.startRun();
    }
    return true;
  }
}
