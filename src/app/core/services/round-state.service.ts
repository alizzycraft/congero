import { Injectable, computed, signal } from '@angular/core';
import type { Card, GoOutCondition, TurnPhase, TurnState } from '@core/game-rules';
import { canGoOut, computeEffectiveMeldSize } from '@core/game-rules';
import { dealInitialHand } from '@core/deckbuilding';
import type { DealInitialHandOptions } from '@core/deckbuilding';
import type { RoundPhase } from '@core/deckbuilding';
import { canDiscard, triggersFreeze } from '@core/enhancements';
import type { RoundState } from '../models';
import { RunStateService } from './run-state.service';

function toTurnPhase(phase: TurnPhase | RoundPhase): TurnPhase {
  if (phase === 'Draw' || phase === 'Discard' || phase === 'GoOut' || phase === 'Meld') return phase;
  return phase === 'Play' ? 'Meld' : 'Draw';
}

@Injectable({ providedIn: 'root' })
export class RoundStateService {
  private readonly roundStateSource = signal<RoundState>({
    phase: 'Draw',
    hand: [],
    drawPile: [],
    discardPile: [],
    autoPlayedRedThrees: [],
    scoreTarget: 100,
    melds: [],
    discardPileFrozen: false,
    canastasCompletedThisTurn: 0,
    hasAtLeastOneCanasta: false,
    goOutCondition: null,
  });

  readonly roundState = computed(() => this.roundStateSource());
  readonly handCards = computed(() => this.roundState().hand);
  readonly discardTop = computed(() => this.roundState().discardPile[0] ?? null);
  readonly drawPileCount = computed(() => this.roundState().drawPile.length);
  readonly scoreTarget = computed(() => this.roundState().scoreTarget);
  readonly phaseLabel = computed(() => `${this.roundState().phase} Phase`);
  readonly turnState = computed<TurnState>(() => ({
    phase: toTurnPhase(this.roundState().phase),
    hand: [...this.roundState().hand],
    melds: [...this.roundState().melds],
    discardPileTop: this.discardTop(),
    discardPileFrozen: this.roundState().discardPileFrozen,
    canastasCompletedThisTurn: this.roundState().canastasCompletedThisTurn,
    hasAtLeastOneCanasta: this.roundState().hasAtLeastOneCanasta,
  }));
  readonly canGoOut = computed(() => canGoOut(this.turnState(), 'normal'));

  constructor(private readonly runState: RunStateService) {}

  /** ORCHESTRATION: starts a playable turn from the run deck. */
  beginTurn(options: DealInitialHandOptions = {}): void {
    const deck = this.runState.deckState().cards;
    const deal = dealInitialHand([...deck], [], { shuffleBeforeDeal: true, ...options });
    this.dealHand(deal.hand, deal.remainingDeck, deal.autoPlayedRedThrees);
    this.transitionPhase('Draw');
  }

  /** ORCHESTRATION: replaces hand/draw state for a new round. */
  dealHand(hand: readonly Card[], drawPile: readonly Card[], autoPlayedRedThrees: readonly Card[] = []): void {
    this.roundStateSource.update((state) => ({
      ...state,
      hand: [...hand],
      drawPile: [...drawPile],
      discardPile: [],
      autoPlayedRedThrees: [...autoPlayedRedThrees],
      scoreTarget: this.runState.runState().scoreTarget,
      melds: [],
      hasAtLeastOneCanasta: false,
      canastasCompletedThisTurn: 0,
      goOutCondition: null,
    }));
  }

  /** ORCHESTRATION: transitions the round state machine synchronously. */
  transitionPhase(phase: TurnPhase | RoundPhase): void {
    this.roundStateSource.update((state) => ({ ...state, phase }));
    this.runState.modifyRun((run) => ({
      ...run,
      roundPhase: phase === 'Meld' || phase === 'Discard' || phase === 'GoOut' ? 'Play' : phase,
    }));
  }

  /** ORCHESTRATION: completes the turn and opens the score phase. */
  goOut(condition: GoOutCondition = 'normal'): boolean {
    if (!canGoOut(this.turnState(), condition)) return false;
    this.roundStateSource.update((state) => ({ ...state, phase: 'GoOut', goOutCondition: condition }));
    this.runState.modifyRun((run) => ({ ...run, roundPhase: 'Score' }));
    return true;
  }

  /** ORCHESTRATION: moves one card from draw pile to hand. */
  drawCard(): Card | null {
    const [card, ...drawPile] = this.roundState().drawPile;
    if (!card) return null;
    this.roundStateSource.update((state) => ({
      ...state,
      hand: [...state.hand, card],
      drawPile,
    }));
    this.transitionPhase('Meld');
    return card;
  }

  /** ORCHESTRATION: moves a hand card to the discard pile. */
  discardCard(cardId: string): Card | null {
    const card = this.roundState().hand.find((candidate) => candidate.id === cardId) ?? null;
    if (!card) return null;
    if (!canDiscard(card, false)) return null;
    this.roundStateSource.update((state) => ({
      ...state,
      hand: state.hand.filter((candidate) => candidate.id !== cardId),
      discardPile: [card, ...state.discardPile],
      discardPileFrozen: state.discardPileFrozen || triggersFreeze(card, true),
    }));
    this.transitionPhase('Draw');
    return card;
  }

  /** ORCHESTRATION: updates the discard-pile frozen flag for enhancement and boss effects. */
  setDiscardPileFrozen(frozen: boolean): void {
    this.roundStateSource.update((state) => ({ ...state, discardPileFrozen: frozen }));
  }

  /** ORCHESTRATION: removes cards that moved from hand into meld state. */
  removeCardsFromHand(cardIds: readonly string[]): void {
    const ids = new Set(cardIds);
    if (ids.size === 0) return;
    this.roundStateSource.update((state) => ({
      ...state,
      hand: state.hand.filter((card) => !ids.has(card.id)),
    }));
  }

  /** ORCHESTRATION: accepts meld state emitted by the meld domain. */
  syncMelds(melds: readonly import('@core/game-rules').Meld[]): void {
    this.roundStateSource.update((state) => ({
      ...state,
      melds: [...melds],
      hasAtLeastOneCanasta: melds.some((meld) => meld.isSealed || computeEffectiveMeldSize(meld.cards) >= 7),
      canastasCompletedThisTurn: melds.filter((meld) => meld.isSealed).length,
    }));
  }
}
