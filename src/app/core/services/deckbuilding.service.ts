import { Injectable, computed, signal } from '@angular/core';
import type { Card, Rank } from '@core/game-rules';
import type { CardPoolEntry } from '@core/deckbuilding';
import {
  buildCardPool,
  buildStartingDeck,
  cardAddCost,
  cardConvertCost,
  cardRemoveCost,
  generateShop,
  getStartingDeckCount,
  goldEarned,
} from '@core/deckbuilding';

@Injectable({ providedIn: 'root' })
export class DeckbuildingService {
  readonly cardPool = signal<CardPoolEntry[]>(buildCardPool());
  readonly startingDeck = computed(() => buildStartingDeck(this.cardPool()));

  getStartingDeckCount = getStartingDeckCount;
  generateShop = generateShop;
  goldEarned = goldEarned;
  cardAddCost = cardAddCost;
  cardRemoveCost = cardRemoveCost;

  cardConvertCost(card: Card, toRank: Rank): number {
    return cardConvertCost(card, toRank);
  }
}
