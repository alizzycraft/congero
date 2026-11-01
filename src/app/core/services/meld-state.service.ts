import { Injectable, computed, signal } from '@angular/core';
import type { Card, Meld } from '@core/game-rules';
import { computeCardPointTotal, computeEffectiveMeldSize, determineCanastaType, validateMeld } from '@core/game-rules';
import { buildMeldValidationContext, getEchoDrawCount } from '@core/enhancements';
import { RoundStateService } from './round-state.service';

@Injectable({ providedIn: 'root' })
export class MeldStateService {
  private readonly meldStatesSource = signal<readonly Meld[]>([]);

  readonly meldStates = computed(() => this.meldStatesSource());

  constructor(private readonly roundState: RoundStateService) {}

  /** ORCHESTRATION: validates and places a new meld. */
  placeMeld(cards: readonly Card[]): Meld | null {
    const proposed = [...cards];
    const result = validateMeld(proposed, null, this.buildHandMeldContext(proposed));
    if (!result.valid) return null;

    const rank = proposed.find((card) => !card.isWild)?.rank ?? proposed[0].rank;
    const meld = this.finalizeMeld({
      id: `meld-${this.meldStates().length + 1}`,
      rank,
      cards: proposed,
      canastaType: null,
      isSealed: false,
      cardPointTotal: computeCardPointTotal({ id: 'proposed', rank, cards: proposed, canastaType: null, isSealed: false, cardPointTotal: 0, completedFromDiscard: false, completedConcealed: false, traySlotId: null }),
      completedFromDiscard: false,
      completedConcealed: false,
      traySlotId: null,
    });
    this.meldStatesSource.update((melds) => [...melds, meld]);
    this.roundState.removeCardsFromHand(proposed.map((card) => card.id));
    this.roundState.syncMelds(this.meldStates());
    this.resolveEchoDraws(proposed, true);
    return meld;
  }

  /** ORCHESTRATION: extends an existing meld if ranks align. */
  extendMeld(meldId: string, cards: readonly Card[]): Meld | null {
    const existing = this.meldStates().find((meld) => meld.id === meldId) ?? null;
    if (!existing) return null;

    const proposed = [...cards];
    const result = validateMeld(proposed, existing, this.buildHandMeldContext(proposed));
    if (!result.valid) return null;

    const updatedCards = [...existing.cards, ...cards];
    const updated = this.finalizeMeld({
      ...existing,
      cards: updatedCards,
      cardPointTotal: updatedCards.reduce((total, card) => total + card.pointValue, 0),
    });
    this.meldStatesSource.update((melds) => melds.map((meld) => meld.id === meldId ? updated : meld));
    this.roundState.removeCardsFromHand(cards.map((card) => card.id));
    this.roundState.syncMelds(this.meldStates());
    this.resolveEchoDraws(proposed, !existing.isSealed);
    return updated;
  }

  /** ORCHESTRATION: seals a completed canasta. */
  sealCanasta(meldId: string): Meld | null {
    const existing = this.meldStates().find((meld) => meld.id === meldId) ?? null;
    if (!existing || computeEffectiveMeldSize(existing.cards) < 7) return null;
    const updated: Meld = {
      ...existing,
      canastaType: existing.canastaType ?? this.determineType(existing),
      isSealed: true,
    };
    this.meldStatesSource.update((melds) => melds.map((meld) => meld.id === meldId ? updated : meld));
    this.roundState.syncMelds(this.meldStates());
    return updated;
  }

  /** ORCHESTRATION: supports route resolution and recovery paths. */
  loadMelds(melds: readonly Meld[]): void {
    this.meldStatesSource.set([...melds]);
    this.roundState.syncMelds(melds);
  }

  /** ORCHESTRATION: clears melds when a new round starts. */
  clearMelds(): void {
    this.meldStatesSource.set([]);
    this.roundState.syncMelds([]);
  }

  private determineType(meld: Meld) {
    return determineCanastaType(meld, this.roundState.turnState());
  }

  private buildHandMeldContext(proposed: Card[]) {
    return buildMeldValidationContext(proposed, {
      discardPileFrozen: false,
      discardPileTopCard: null,
      matchingHandCards: [],
      hookOverrides: {},
    });
  }

  private finalizeMeld(meld: Meld): Meld {
    if (computeEffectiveMeldSize(meld.cards) < 7) return { ...meld, isSealed: false, canastaType: null };
    return {
      ...meld,
      isSealed: true,
      canastaType: meld.canastaType ?? this.determineType(meld),
    };
  }

  private resolveEchoDraws(cards: readonly Card[], isFirstMeld: boolean): void {
    const drawCount = cards.reduce((total, card) => total + getEchoDrawCount(card, isFirstMeld), 0);
    for (let i = 0; i < drawCount; i += 1) {
      this.roundState.drawCard();
    }
  }
}
