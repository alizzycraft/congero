import { ChangeDetectionStrategy, Component, OnDestroy, effect, inject, input, untracked } from '@angular/core';
import type { BabylonGameObject } from '../../models';
import { SceneBridgeService } from '../../../core/services/scene-bridge.service';

@Component({
  selector: 'app-babylon-object',
  standalone: true,
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BabylonObjectComponent implements OnDestroy {
  readonly object = input.required<BabylonGameObject>();
  private readonly bridge = inject(SceneBridgeService);

  constructor() {
    effect(() => {
      const gameObject = this.object();
      untracked(() => this.bridge.registerGameObject(gameObject));
    });
  }

  ngOnDestroy(): void {
    this.bridge.unregisterGameObject(this.object().id);
  }
}
