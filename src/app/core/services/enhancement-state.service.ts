import { Injectable } from '@angular/core';
import type { EnhancementApplication } from '../models';
import { withEnhancement, withoutEnhancements } from '@core/enhancements';
import { RunStateService } from './run-state.service';

@Injectable({ providedIn: 'root' })
export class EnhancementStateService {
  constructor(private readonly runState: RunStateService) {}

  /** ORCHESTRATION: applies an enhancement through RunStateService deck ownership. */
  applyEnhancement(application: EnhancementApplication): void {
    this.runState.modifyDeck((deck) => ({
      cards: deck.cards.map((card) =>
        card.id === application.cardId ? withEnhancement(card, application.enhancement) : card,
      ),
    }));
  }

  /** ORCHESTRATION: removes all enhancements from one deck card. */
  clearEnhancements(cardId: string): void {
    this.runState.modifyDeck((deck) => ({
      cards: deck.cards.map((card) => card.id === cardId ? withoutEnhancements(card) : card),
    }));
  }
}
