import { Injectable } from '@angular/core';
import type { CanActivate } from '@angular/router';
import { RunStateService } from '../services/run-state.service';

@Injectable({ providedIn: 'root' })
export class ShopPhaseGuard implements CanActivate {
  constructor(private readonly runState: RunStateService) {}

  canActivate(): boolean {
    return this.runState.runState().roundPhase === 'Shop';
  }
}
