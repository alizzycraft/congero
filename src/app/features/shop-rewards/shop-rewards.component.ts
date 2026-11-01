import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import type { ShopItem } from '@core/deckbuilding';
import type { Card } from '@core/game-rules';
import { getCardEnhancements } from '@core/enhancements';
import { MeldStateService } from '../../core/services/meld-state.service';
import { RoundStateService } from '../../core/services/round-state.service';
import { RunStateService } from '../../core/services/run-state.service';
import { ShopStateService } from '../../core/services/shop-state.service';
import { ActionButtonComponent } from '../../shared/components';
import type { ActionButtonState } from '../../shared/models';

@Component({
  selector: 'app-shop-rewards',
  standalone: true,
  imports: [ActionButtonComponent],
  templateUrl: './shop-rewards.component.html',
  styleUrl: './shop-rewards.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShopRewardsComponent {
  private readonly shopState = inject(ShopStateService);
  private readonly runState = inject(RunStateService);
  private readonly roundState = inject(RoundStateService);
  private readonly meldState = inject(MeldStateService);
  private readonly router = inject(Router);

  protected readonly shop = computed(() => this.shopState.shopState());
  protected readonly pendingTargetPurchase = this.shopState.pendingTargetPurchase;
  protected readonly targetCards = computed(() => {
    const pending = this.pendingTargetPurchase();
    if (!pending) return [];
    return this.runState.deckState().cards.filter((card) => this.canApplyPendingEnhancement(card));
  });
  protected readonly actions = computed<readonly ActionButtonState[]>(() => [
    {
      id: 'reroll',
      label: 'Reroll',
      iconId: 'R',
      interactionState: this.runState.runState().gold >= this.shopState.rerollCost() ? 'enabled' : 'disabled',
      shortcut: null,
      ariaLabel: 'Reroll shop',
    },
    { id: 'continue', label: 'Continue', iconId: 'N', interactionState: 'enabled', shortcut: null, ariaLabel: 'Continue run' },
  ]);

  protected handleAction(actionId: string): void {
    if (actionId === 'reroll') {
      this.shopState.reroll();
    }
    if (actionId === 'continue' && this.runState.runState().roundPhase === 'Shop') {
      this.shopState.loadShop(null);
      this.runState.advanceRound();
      this.meldState.clearMelds();
      if (this.runState.runState().runWon) {
        void this.router.navigate(['/']);
        return;
      }
      this.roundState.beginTurn();
      void this.router.navigate(['/gameplay']);
    }
  }

  protected purchase(itemId: string): void {
    this.shopState.purchaseItem(itemId);
  }

  protected applyPendingTarget(cardId: string): void {
    this.shopState.applyPendingPurchaseToCard(cardId);
  }

  protected itemAction(item: ShopItem): ActionButtonState {
    const pendingItemId = this.pendingTargetPurchase()?.item.id ?? null;
    return {
      id: item.id,
      label: 'Buy',
      iconId: 'B',
      interactionState: item.purchased || pendingItemId === item.id || this.runState.runState().gold < item.cost ? 'disabled' : 'enabled',
      shortcut: null,
      ariaLabel: 'Buy item',
    };
  }

  protected targetAction(card: Card): ActionButtonState {
    return {
      id: card.id,
      label: 'Apply',
      iconId: 'A',
      interactionState: 'enabled',
      shortcut: null,
      ariaLabel: `Apply enhancement to ${card.rank}`,
    };
  }

  private canApplyPendingEnhancement(card: Card): boolean {
    const pending = this.pendingTargetPurchase();
    if (!pending) return false;
    if (card.enhancementId !== null || getCardEnhancements(card).length > 0) return false;
    if (card.rank === '3') return false;
    if (pending.enhancementType === 'marked' && card.isWild) return false;
    if (pending.enhancementType === 'pure' && !card.isWild) return false;
    return true;
  }
}
