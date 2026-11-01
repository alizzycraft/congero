import { Injectable } from '@angular/core';
import type { CanActivate, UrlTree } from '@angular/router';
import { Router } from '@angular/router';
import { RunStateService } from '../services/run-state.service';

@Injectable({ providedIn: 'root' })
export class RunActiveGuard implements CanActivate {
  constructor(
    private readonly runState: RunStateService,
    private readonly router: Router,
  ) {}

  canActivate(): true | UrlTree {
    return this.runState.runActive() ? true : this.router.createUrlTree(['/']);
  }
}
