import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home.component';
import { DeckInventoryComponent } from './features/deck-inventory/deck-inventory.component';
import { GameplayHudComponent } from './features/gameplay-hud/gameplay-hud.component';
import { ScoreResultsComponent } from './features/score-results/score-results.component';
import { ShopRewardsComponent } from './features/shop-rewards/shop-rewards.component';
import { NotFoundComponent } from './not-found.component';
import { RunActiveGuard } from './core/guards/run-active.guard';
import { ScorePhaseGuard } from './core/guards/score-phase.guard';
import { ShopPhaseGuard } from './core/guards/shop-phase.guard';
import { RoundStateResolver } from './core/resolvers/round-state.resolver';
import { RunStateResolver } from './core/resolvers/run-state.resolver';
import { ShopStateResolver } from './core/resolvers/shop-state.resolver';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: HomeComponent,
  },
  { path: 'gameplay', component: GameplayHudComponent, canActivate: [RunActiveGuard], resolve: { run: RunStateResolver, round: RoundStateResolver } },
  { path: 'deck', component: DeckInventoryComponent, canActivate: [RunActiveGuard], resolve: { run: RunStateResolver } },
  { path: 'shop', component: ShopRewardsComponent, canActivate: [RunActiveGuard, ShopPhaseGuard], resolve: { shop: ShopStateResolver } },
  { path: 'score', component: ScoreResultsComponent, canActivate: [RunActiveGuard, ScorePhaseGuard], resolve: { round: RoundStateResolver } },
  { path: '**', component: NotFoundComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
