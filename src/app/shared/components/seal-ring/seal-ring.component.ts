import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { CanastaType } from '@core/game-rules';

@Component({
  selector: 'app-seal-ring',
  standalone: true,
  templateUrl: './seal-ring.component.html',
  styleUrl: './seal-ring.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SealRingComponent {
  readonly canastaType = input<CanastaType | null>(null);
}
