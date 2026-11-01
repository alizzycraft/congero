import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RunStateService } from '../../core/services/run-state.service';
import { ActionButtonComponent, BabylonObjectComponent, BabylonSceneComponent, CardComponent } from '../../shared/components';
import type { ActionButtonState } from '../../shared/models';
import { InteractionStateService, RenderObjectAdapterService } from '../../shared/services';

@Component({
  selector: 'app-deck-inventory',
  standalone: true,
  imports: [ActionButtonComponent, BabylonObjectComponent, BabylonSceneComponent, CardComponent],
  templateUrl: './deck-inventory.component.html',
  styleUrl: './deck-inventory.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeckInventoryComponent {
  private readonly runState = inject(RunStateService);
  private readonly interaction = inject(InteractionStateService);
  private readonly renderAdapter = inject(RenderObjectAdapterService);

  protected readonly deck = computed(() => this.runState.deckState().cards);

  protected readonly cards = computed(() =>
    this.deck().map((card) => this.interaction.deriveCardVisualState(card, null, 'Draw')),
  );

  protected readonly sceneObjects = computed(() => [
    this.renderAdapter.tableObject('deck-editor-table'),
    ...this.cards().slice(0, 20).map((card, index) => this.renderAdapter.cardObject(card, index, 'deck-grid')),
  ]);

  protected readonly actions: readonly ActionButtonState[] = [
    { id: 'sort', label: 'Sort', iconId: 'S', interactionState: 'enabled', shortcut: null, ariaLabel: 'Sort deck' },
    { id: 'filter', label: 'Filter', iconId: 'F', interactionState: 'enabled', shortcut: null, ariaLabel: 'Filter deck' },
    { id: 'back', label: 'Back', iconId: 'B', interactionState: 'enabled', shortcut: 'Escape', ariaLabel: 'Back to game' },
  ];
}
