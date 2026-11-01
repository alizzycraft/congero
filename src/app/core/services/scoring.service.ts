import { Injectable, computed } from '@angular/core';
import type { GoOutCondition, Meld } from '@core/game-rules';
import { scoreCanasta } from '@core/game-rules';
import type { ActiveModifierState } from '@core/modifiers';
import { runModifierPipeline } from '@core/modifiers';
import { MeldStateService } from './meld-state.service';
import { ModifierStateService } from './modifier-state.service';
import { RoundStateService } from './round-state.service';

@Injectable({ providedIn: 'root' })
export class ScoringService {
  readonly currentScore = computed(() =>
    this.meldState.meldStates().reduce(
      (total, meld) => total + this.scoreMeldWithModifiers(meld),
      0,
    ) + this.roundBonusScore(),
  );

  constructor(
    private readonly meldState: MeldStateService,
    private readonly modifierState: ModifierStateService,
    private readonly roundState: RoundStateService,
  ) {}

  static scoreMeld(meld: Meld): number {
    if (!meld.isSealed || !meld.canastaType) return meld.cardPointTotal;
    return scoreCanasta(meld, meld.canastaType).baseTotal;
  }

  scoreMeldWithModifiers(
    meld: Meld,
    modifierState: ActiveModifierState = this.modifierState.pipelineState(),
  ): number {
    if (!meld.isSealed || !meld.canastaType) return meld.cardPointTotal;
    const baseResult = scoreCanasta(meld, meld.canastaType);
    return runModifierPipeline(baseResult, meld, modifierState).afterBoss;
  }

  /** ORCHESTRATION: returns current round total after modifier domains are read. */
  scoreRound(): number {
    return this.currentScore();
  }

  /** ORCHESTRATION: scores a sealed canasta by id. */
  scoreCanasta(meldId: string): number {
    const meld = this.meldState.meldStates().find((candidate) => candidate.id === meldId) ?? null;
    return meld ? this.scoreMeldWithModifiers(meld) : 0;
  }

  private roundBonusScore(): number {
    const round = this.roundState.roundState();
    const redThreeBonus = round.autoPlayedRedThrees.reduce((total, card) => total + card.pointValue, 0);
    return redThreeBonus + this.goOutBonus(round.goOutCondition);
  }

  private goOutBonus(condition: GoOutCondition | null): number {
    if (condition === 'concealedOut') return 500;
    if (condition === 'normal' || condition === 'partnerCanasta') return 100;
    return 0;
  }
}
