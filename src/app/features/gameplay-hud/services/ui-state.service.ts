import { Injectable, computed, inject, linkedSignal, signal } from '@angular/core';
import { computeEffectiveMeldSize } from '@core/game-rules';
import type { Card } from '@core/game-rules';
import { getMinimumMeldSize } from '@core/enhancements';
import type { CardVisualState, DesignToken, MeldVisualState } from '@shared/models';
import { InteractionStateService } from '../../../shared/services/interaction-state.service';
import { RenderObjectAdapterService } from '../../../shared/services/render-object-adapter.service';
import type { DragState, GameScreen } from '../../../core/models';
import { MeldStateService } from '../../../core/services/meld-state.service';
import { RoundStateService } from '../../../core/services/round-state.service';

@Injectable()
export class UiStateService {
  private readonly roundState = inject(RoundStateService);
  private readonly meldState = inject(MeldStateService);
  private readonly interaction = inject(InteractionStateService);
  private readonly renderAdapter = inject(RenderObjectAdapterService);

  private readonly selectedCardIdsSource = linkedSignal<readonly Card[], ReadonlySet<string>>({
    source: this.roundState.handCards,
    computation: (hand, previous) => {
      const validIds = new Set(hand.map((card) => card.id));
      const previousIds = previous?.value ?? new Set<string>();
      return new Set([...previousIds].filter((cardId) => validIds.has(cardId)));
    },
  });
  private readonly currentScreenSource = linkedSignal({
    source: this.roundState.roundState,
    computation: (round): GameScreen => {
      if (round.phase === 'Shop') return 'shop';
      if (round.phase === 'Score') return 'score';
      return 'gameplay';
    },
  });
  private readonly dragStateSource = signal<DragState | null>(null);

  readonly selectedCardIds = computed(() => this.selectedCardIdsSource());
  readonly selectedCardId = computed(() => {
    const first = this.selectedCardIds().values().next();
    return first.done === true ? null : first.value;
  });
  readonly selectedCards = computed(() => {
    const selectedIds = this.selectedCardIds();
    return this.roundState.handCards().filter((card) => selectedIds.has(card.id));
  });
  readonly canMeldSelected = computed(() => {
    const selected = this.selectedCards();
    return computeEffectiveMeldSize(selected) >= getMinimumMeldSize(selected, true);
  });
  readonly currentScreen = computed(() => this.currentScreenSource());
  readonly dragState = computed(() => this.dragStateSource());
  readonly cardVisualStates = computed(() =>
    this.roundState.handCards().map((card) => {
      const base = this.interaction.deriveCardVisualState(card, this.roundState.turnState(), this.roundState.turnState().phase);
      const selected = this.selectedCardIds().has(card.id);
      return {
        ...base,
        selected,
        interactionState: selected ? 'selected' : base.interactionState,
      } satisfies CardVisualState;
    }),
  );
  readonly meldVisualStates = computed<readonly MeldVisualState[]>(() => {
    const melds = this.meldState.meldStates();
    const liveZones = melds.map((meld) => this.interaction.deriveMeldVisualState(meld, this.roundState.turnState()));
    const emptySlots = Array.from({ length: Math.max(0, 5 - liveZones.length) }, () =>
      this.interaction.deriveMeldVisualState(null, this.roundState.turnState()),
    ).map((zone, index) => ({ ...zone, id: `empty-meld-${index + 1}` }));
    return [...liveZones, ...emptySlots].slice(0, 5);
  });
  readonly actionButtonStates = computed(() => [
    { id: 'draw', label: 'Draw', iconId: 'W', interactionState: this.roundState.roundState().phase === 'Draw' ? 'enabled' : 'disabled', shortcut: 'W', ariaLabel: 'Draw card' },
    { id: 'meld', label: 'Meld', iconId: 'M', interactionState: this.roundState.roundState().phase === 'Meld' && this.canMeldSelected() ? 'enabled' : 'disabled', shortcut: 'M', ariaLabel: 'Create meld' },
    { id: 'discard', label: 'Discard', iconId: 'D', interactionState: this.roundState.roundState().phase === 'Meld' && this.selectedCardIds().size === 1 ? 'enabled' : 'disabled', shortcut: 'D', ariaLabel: 'Discard selected card' },
    { id: 'go-out', label: 'Go Out', iconId: 'G', interactionState: this.roundState.canGoOut() ? 'enabled' : 'disabled', shortcut: 'G', ariaLabel: 'Go out' },
  ] as const);
  readonly designTokens = computed<readonly DesignToken[]>(() => [
    { category: 'color', name: 'neonCyan', cssVariable: '--congero-color-neonCyan', value: 'var(--congero-color-neonCyan)' },
    { category: 'color', name: 'plasmaPink', cssVariable: '--congero-color-plasmaPink', value: 'var(--congero-color-plasmaPink)' },
    { category: 'panel', name: 'gameplayBg', cssVariable: '--congero-panel-gameplayBg', value: 'var(--congero-panel-gameplayBg)' },
  ]);
  readonly babylonGameObjects = computed(() => [
    this.renderAdapter.tableObject('game-table'),
    ...this.meldVisualStates().map((zone, index) => this.renderAdapter.meldZoneObject(zone, index)),
    ...this.cardVisualStates().map((card, index) => this.renderAdapter.cardObject(card, index, 'hand-zone')),
  ]);

  /** ORCHESTRATION: selects a hand card while preserving linked validity. */
  selectCard(cardId: string | null, additive = false): void {
    if (cardId === null) {
      this.clearSelection();
      return;
    }

    const handHasCard = this.roundState.handCards().some((card) => card.id === cardId);
    if (!handHasCard) {
      this.clearSelection();
      return;
    }

    if (!additive) {
      this.selectedCardIdsSource.set(new Set([cardId]));
      return;
    }

    const next = new Set(this.selectedCardIds());
    if (next.has(cardId)) {
      next.delete(cardId);
    } else {
      next.add(cardId);
    }
    this.selectedCardIdsSource.set(next);
  }

  /** ORCHESTRATION: clears selected cards after successful actions. */
  clearSelection(): void {
    this.selectedCardIdsSource.set(new Set<string>());
  }

  /** ORCHESTRATION: updates pointer drag state for HTML/Babylon renderers. */
  setDragState(state: DragState | null): void {
    this.dragStateSource.set(state);
  }

  /** ORCHESTRATION: allows explicit UI screen transitions within route guards. */
  transitionScreen(screen: GameScreen): void {
    this.currentScreenSource.set(screen);
  }

  /** ORCHESTRATION: exposes the same action guards to click and keyboard handlers. */
  isActionEnabled(actionId: string): boolean {
    return this.actionButtonStates().some((action) => action.id === actionId && action.interactionState === 'enabled');
  }
}
