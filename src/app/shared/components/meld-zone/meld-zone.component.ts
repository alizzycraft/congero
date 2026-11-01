import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { MeldVisualState } from '../../models';
import { CardComponent } from '../card/card.component';
import { GhostSlotComponent } from '../ghost-slot/ghost-slot.component';
import { SealRingComponent } from '../seal-ring/seal-ring.component';
import { InteractionStateService } from '../../services';

@Component({
  selector: 'app-meld-zone',
  standalone: true,
  imports: [CardComponent, GhostSlotComponent, SealRingComponent],
  templateUrl: './meld-zone.component.html',
  styleUrl: './meld-zone.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MeldZoneComponent {
  readonly state = input.required<MeldVisualState>();
  readonly cardDropped = output<string>();
  protected readonly ghostSlots = computed(() =>
    Array.from({ length: this.interaction.computeGhostSlots(this.state()) }),
  );

  constructor(private readonly interaction: InteractionStateService) {}
}
