import { Injectable, signal } from '@angular/core';
import type { Card, Meld, MeldValidationResult, TurnPhase, TurnState } from '@core/game-rules';
import { validateMeld } from '@core/game-rules';
import { buildMeldValidationContext, getCardEnhancements } from '@core/enhancements';
import type { CardVisualState, MeldVisualState } from '../models';
import { ENHANCEMENT_VISUALS } from '../models';

@Injectable({ providedIn: 'root' })
export class InteractionStateService {
  readonly selectedCardIds = signal<ReadonlySet<string>>(new Set<string>());
  readonly lastRejection = signal<string | null>(null);

  deriveCardVisualState(card: Card, _turnState: TurnState | null, phase: TurnPhase): CardVisualState {
    const selected = this.selectedCardIds().has(card.id);
    const enhancements = getCardEnhancements(card);
    const enhancement = enhancements[0] ?? null;
    const enhancementIndicator = enhancement
      ? { type: enhancement.type, ...ENHANCEMENT_VISUALS[enhancement.type] }
      : null;
    const interactionState = selected
      ? 'selected'
      : enhancementIndicator
        ? 'enhanced'
        : card.isWild
          ? 'wild'
        : phase === 'Meld'
            ? 'playable'
            : 'default';

    return {
      card,
      interactionState,
      faceDown: false,
      ariaLabel: this.cardAriaLabel(card, interactionState, enhancementIndicator?.label ?? null),
      enhancementIndicator,
      selected,
    };
  }

  deriveMeldVisualState(meld: Meld | null, turnState: TurnState | null = null): MeldVisualState {
    const state = meld === null
      ? 'empty'
      : meld.isSealed
        ? 'sealed'
        : meld.cards.length >= 7
          ? 'complete'
          : 'partial';

    const cards = meld?.cards.map((card) =>
      this.deriveCardVisualState(card, turnState, turnState?.phase ?? 'Meld'),
    ) ?? [];

    return {
      meld,
      id: meld?.id ?? 'empty-meld',
      rank: meld?.rank ?? null,
      state,
      cardCount: meld?.cards.length ?? 0,
      isCanasta: (meld?.cards.length ?? 0) >= 7,
      canastaType: meld?.canastaType ?? null,
      ariaLabel: this.meldAriaLabel(meld, state),
      cards,
      trayIndicator: null,
    };
  }

  computeGhostSlots(meldState: MeldVisualState): number {
    if (meldState.state === 'complete' || meldState.state === 'sealed') return 0;
    if (meldState.state === 'empty') return 3;
    return Math.min(7 - meldState.cardCount, 3);
  }

  handleCardClick(cardId: string, additive: boolean): void {
    const next = new Set(this.selectedCardIds());
    if (!additive) {
      next.clear();
      next.add(cardId);
    } else if (next.has(cardId)) {
      next.delete(cardId);
    } else {
      next.add(cardId);
    }
    this.selectedCardIds.set(next);
  }

  handleCardDrop(cards: Card[], targetMeld: Meld | null): MeldValidationResult {
    const result = validateMeld(cards, targetMeld, buildMeldValidationContext(cards, {
      discardPileFrozen: false,
      discardPileTopCard: null,
      matchingHandCards: [],
      hookOverrides: {},
    }));
    this.lastRejection.set(result.valid ? null : result.rejectionMessage);
    return result;
  }

  private cardAriaLabel(card: Card, state: string, enhancementLabel: string | null): string {
    const suit = card.suit ?? 'no suit';
    const enhancement = enhancementLabel ? `, ${enhancementLabel}` : '';
    return `${card.rank} of ${suit}, ${card.pointValue} points${enhancement}, ${state}`;
  }

  private meldAriaLabel(meld: Meld | null, state: string): string {
    if (!meld) return 'Empty meld zone';
    const canasta = meld.canastaType ?? 'not canasta';
    return `${meld.rank} meld, ${meld.cards.length} cards, ${canasta}, ${state}`;
  }
}
