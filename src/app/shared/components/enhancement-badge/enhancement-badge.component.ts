import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { EnhancementVisualIndicator } from '../../models';

@Component({
  selector: 'app-enhancement-badge',
  standalone: true,
  templateUrl: './enhancement-badge.component.html',
  styleUrl: './enhancement-badge.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnhancementBadgeComponent {
  readonly indicator = input.required<EnhancementVisualIndicator>();
  protected readonly color = computed(() => `var(--congero-${this.indicator().glowColorToken})`);
}
