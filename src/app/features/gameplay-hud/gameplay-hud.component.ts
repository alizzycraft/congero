import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MeldStateService } from '../../core/services/meld-state.service';
import { RoundStateService } from '../../core/services/round-state.service';
import { ActionButtonComponent, BabylonObjectComponent, BabylonSceneComponent, CardComponent } from '../../shared/components';
import type { CardClickEvent } from '../../shared/components/card/card.component';
import { KeyboardNavigationDirective } from '../../shared/directives';
import { UiStateService } from './services/ui-state.service';

@Component({
  selector: 'app-gameplay-hud',
  standalone: true,
  imports: [ActionButtonComponent, BabylonObjectComponent, BabylonSceneComponent, CardComponent, KeyboardNavigationDirective],
  templateUrl: './gameplay-hud.component.html',
  styleUrl: './gameplay-hud.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [UiStateService],
})
export class GameplayHudComponent {
  protected readonly roundState = inject(RoundStateService);
  protected readonly uiState = inject(UiStateService);
  private readonly meldState = inject(MeldStateService);
  private readonly router = inject(Router);

  protected readonly cards = this.uiState.cardVisualStates;
  protected readonly sceneObjects = this.uiState.babylonGameObjects;
  protected readonly actions = this.uiState.actionButtonStates;

  constructor() {
    if (this.roundState.handCards().length === 0) {
      this.roundState.beginTurn();
    }
  }

  protected selectCard(event: CardClickEvent): void {
    this.uiState.selectCard(event.cardId, event.additive);
  }

  protected handleAction(actionId: string): void {
    if (!this.uiState.isActionEnabled(actionId)) return;

    if (actionId === 'draw') {
      this.roundState.drawCard();
    }
    if (actionId === 'discard' && this.uiState.selectedCardId()) {
      this.roundState.discardCard(this.uiState.selectedCardId() ?? '');
      this.uiState.clearSelection();
    }
    if (actionId === 'meld' && this.uiState.selectedCardIds().size > 0) {
      const selectedIds = this.uiState.selectedCardIds();
      const selected = this.roundState.handCards().filter((card) => selectedIds.has(card.id));
      const meld = this.meldState.placeMeld(selected);
      if (meld) {
        this.uiState.clearSelection();
      }
    }
    if (actionId === 'go-out') {
      if (this.roundState.goOut()) {
        void this.router.navigate(['/score']);
      }
    }
  }
}
