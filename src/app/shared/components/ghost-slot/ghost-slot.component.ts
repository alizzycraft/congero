import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-ghost-slot',
  standalone: true,
  templateUrl: './ghost-slot.component.html',
  styleUrl: './ghost-slot.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GhostSlotComponent {}
