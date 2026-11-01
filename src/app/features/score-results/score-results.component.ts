import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { DeckbuildingService } from '../../core/services/deckbuilding.service';
import { MeldStateService } from '../../core/services/meld-state.service';
import { RoundStateService } from '../../core/services/round-state.service';
import { ScoringService } from '../../core/services/scoring.service';
import { ShopStateService } from '../../core/services/shop-state.service';
import { RunStateService } from '../../core/services/run-state.service';
import { ActionButtonComponent } from '../../shared/components';
import type { ActionButtonState } from '../../shared/models';

@Component({
  selector: 'app-score-results',
  standalone: true,
  imports: [ActionButtonComponent],
  templateUrl: './score-results.component.html',
  styleUrl: './score-results.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScoreResultsComponent {
  private readonly deckbuilding = inject(DeckbuildingService);
  private readonly scoring = inject(ScoringService);
  private readonly meldState = inject(MeldStateService);
  private readonly roundState = inject(RoundStateService);
  private readonly runState = inject(RunStateService);
  private readonly shopState = inject(ShopStateService);
  private readonly router = inject(Router);

  protected readonly score = this.scoring.currentScore;
  protected readonly target = this.roundState.scoreTarget;
  protected readonly gold = () => this.deckbuilding.goldEarned(this.score(), this.target());
  protected readonly action: ActionButtonState = {
    id: 'continue',
    label: 'Continue',
    iconId: 'N',
    interactionState: 'enabled',
    shortcut: null,
    ariaLabel: 'Continue to shop',
  };

  protected handleAction(actionId: string): void {
    if (actionId !== 'continue' || this.runState.runState().roundPhase !== 'Score') return;

    if (this.score() < this.target()) {
      this.meldState.clearMelds();
      this.runState.failRun();
      void this.router.navigate(['/']);
      return;
    }

    const goldEarned = this.gold();
    this.runState.modifyRun((state) => ({
      ...state,
      gold: state.gold + goldEarned,
    }));
    this.shopState.generateCurrentShop();
    void this.router.navigate(['/shop']);
  }
}
