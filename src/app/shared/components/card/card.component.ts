import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { CardVisualState } from '../../models';
import { EnhancementBadgeComponent } from '../enhancement-badge/enhancement-badge.component';

export interface CardClickEvent {
  cardId: string;
  additive: boolean;
}

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [EnhancementBadgeComponent],
  templateUrl: './card.component.html',
  styleUrl: './card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardComponent {
  readonly state = input.required<CardVisualState>();
  readonly cardClicked = output<CardClickEvent>();
  readonly cardDragStart = output<string>();

  protected click(event: MouseEvent): void {
    this.cardClicked.emit({
      cardId: this.state().card.id,
      additive: event.shiftKey || event.ctrlKey || event.metaKey,
    });
  }

  protected dragStart(): void {
    this.cardDragStart.emit(this.state().card.id);
  }
}
