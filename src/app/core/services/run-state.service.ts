import { Injectable, computed, signal } from '@angular/core';
import type { Card } from '@core/game-rules';
import { getCardPointValue } from '@core/game-rules';
import { buildCardPool, buildStartingDeck, roundScoreTarget } from '@core/deckbuilding';
import { ALL_BOSS_RULES, selectBossRule } from '@core/modifiers';
import type { DeckState, RunState } from '../models';
import { ModifierStateService } from './modifier-state.service';

const FINAL_ANTE = 8;
const FINAL_ROUND = 3;

const INITIAL_RUN_STATE: RunState = {
  currentAnte: 1,
  currentRound: 1,
  absoluteRound: 1,
  scoreTarget: 100,
  roundPhase: 'Draw',
  isBossRound: false,
  bossRuleId: null,
  gold: 0,
  rerollCount: 0,
  currentShop: null,
  runOver: false,
  runWon: false,
};

function createStartingCards(): Card[] {
  return buildStartingDeck(buildCardPool())
    .filter((entry) => entry.inStartingDeck)
    .map((entry, index) => ({
      id: `deck-${index}`,
      rank: entry.rank,
      suit: entry.suit,
      pointValue: getCardPointValue(entry.rank, entry.suit),
      isWild: entry.isWild,
      isRedThree: entry.isRedThree,
      isBlackThree: entry.isBlackThree,
      enhancementId: null,
    }));
}

@Injectable({ providedIn: 'root' })
export class RunStateService {
  private readonly runStateSource = signal<RunState>(INITIAL_RUN_STATE);
  private readonly deckStateSource = signal<DeckState>({ cards: createStartingCards() });

  readonly runState = computed(() => this.runStateSource());
  readonly deckState = computed(() => this.deckStateSource());
  readonly runActive = computed(() => !this.runState().runOver);

  constructor(private readonly modifierState: ModifierStateService | null = null) {}

  /** ORCHESTRATION: resets the run and deck to a fresh state. */
  startRun(): void {
    this.runStateSource.set({ ...INITIAL_RUN_STATE });
    this.deckStateSource.set({ cards: createStartingCards() });
    this.syncBossRule(INITIAL_RUN_STATE);
  }

  /** ORCHESTRATION: restores a persisted run snapshot. */
  loadRun(runState: RunState, deckState: DeckState): void {
    this.runStateSource.set(runState);
    this.deckStateSource.set(deckState);
    this.syncBossRule(runState);
  }

  /** ORCHESTRATION: advances ante/round metadata after a completed round. */
  advanceRound(): void {
    const next = this.nextRunProgression(this.runState());
    this.runStateSource.set(next);
    this.syncBossRule(next);
  }

  /** ORCHESTRATION: ends the run after a failed score target. */
  failRun(): void {
    const next = {
      ...this.runState(),
      runOver: true,
      runWon: false,
      currentShop: null,
    };
    this.runStateSource.set(next);
    this.syncBossRule(next);
  }

  /** ORCHESTRATION: updates owned deck state through a pure updater. */
  modifyDeck(updater: (deck: DeckState) => DeckState): void {
    this.deckStateSource.update(updater);
  }

  /** ORCHESTRATION: updates run metadata through a pure updater. */
  modifyRun(updater: (run: RunState) => RunState): void {
    const next = updater(this.runState());
    this.runStateSource.set(next);
    this.syncBossRule(next);
  }

  private nextRunProgression(state: RunState): RunState {
    if (state.currentAnte === FINAL_ANTE && state.currentRound === FINAL_ROUND) {
      return {
        ...state,
        runOver: true,
        runWon: true,
        currentShop: null,
        rerollCount: 0,
      };
    }

    const currentAnte = state.currentRound >= 3 ? state.currentAnte + 1 : state.currentAnte;
    const currentRound = state.currentRound >= 3 ? 1 : state.currentRound + 1;
    const isBossRound = currentRound === FINAL_ROUND;
    const bossRuleId = isBossRound ? selectBossRule(currentAnte, ALL_BOSS_RULES) : null;
    return {
      ...state,
      currentAnte,
      currentRound,
      absoluteRound: state.absoluteRound + 1,
      roundPhase: 'Draw',
      currentShop: null,
      rerollCount: 0,
      scoreTarget: roundScoreTarget(currentAnte, currentRound),
      isBossRound,
      bossRuleId,
    };
  }

  private syncBossRule(state: RunState): void {
    const bossRule = state.bossRuleId
      ? ALL_BOSS_RULES.find((rule) => rule.id === state.bossRuleId) ?? null
      : null;
    this.modifierState?.setBossRule(bossRule);
  }
}
