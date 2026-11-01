# Area 7 — Angular App Architecture: Technical Specification & Implementation Plan

## 1. Overview

This document is the technical specification and implementation plan for **Area 7: Angular App Architecture** of the Congero project. It defines the complete Angular application structure using the **Domain-Scoped Functional Reactivity (DSFR)** pattern — a reactive architecture where every piece of logic is classified into one of four roles: **STATE**, **TRANSFORM**, **ORCHESTRATION**, or **EFFECT**.

### What Needs to Be Implemented

The Angular application serves as the reactive UI layer for Congero, a Neon Space Canasta roguelike built with Angular 17+ and BabylonJS. Area 7 owns:

1. **Angular Module Structure** — A root `AppModule`, a `CoreModule` for singleton services/guards/resolvers, lazy-loaded feature modules (`gameplay`, `deck-inventory`, `shop`, `score-results`), and a `SharedModule` for reusable components/directives/pipes.

2. **DSFR Domain Containers** — 10 Angular services organized as domain containers, each owning its signals, exposing entry points for state transitions, containing pure transforms, and isolating effects. Every method in the application is classified under exactly one DSFR role.

3. **Signal Inventory** — 24 signals (8 writable source signals, 16 computed/derived signals) that form the complete reactive state graph. Components read signals directly in templates with no manual subscription management.

4. **Routing** — 6 routes with 3 route guards and 3 route resolvers, enforcing phase-based navigation (e.g., the shop is only accessible during the Shop phase).

5. **BabylonJS Integration Boundary** — A typed `BabylonJSBoundaryContract` that governs all Angular ↔ BabylonJS communication: 6 input signals that push state into the BabylonJS scene via Angular effects, and 5 output events that route BabylonJS scene events back into Angular through domain entry points.

### DSFR Role Summary

| Role | What It Is | Where It Lives |
|------|-----------|----------------|
| **STATE** | Writable signals (`signal()`) and derived signals (`computed()`) | Domain service fields |
| **TRANSFORM** | Pure deterministic functions — no instance state, no signals, no IO | `static` methods on domain services |
| **ORCHESTRATION** | Entry points that coordinate legal state transitions via `.set()` / `.update()` | Public methods on domain services |
| **EFFECT** | External IO boundaries — BabylonJS scene, DOM, localStorage, timers | `SceneBridgeService`, persistence, `ErrorRecoveryService` |

### Out of Scope

- BabylonJS scene internals (mesh definitions, materials, camera, render loop) — **Area 6**
- Game rule logic (meld validation, scoring formulas) — **Area 1**
- UI visual design (design tokens, color palettes, wireframes) — **Area 5**
- State persistence, serialization, migration — **Area 8**
- Modifier stacking order — **Area 3**
- Card enhancement definitions — **Area 4**
- Deckbuilding mechanics — **Area 2**

### References

- Design document: `.kiro/specs/congero-angular-architecture/design.md`
- Area 1 (Game Rules): `docs/specs/area-1-game-rules.md`
- Area 5 (UI/UX Design): `docs/specs/area-5-ui-ux.md`
- Area 6 (BabylonJS Rendering): `docs/specs/area-6-babylonjs.md`
- Area 8 (State Management): `docs/specs/area-8-state-management.md`

---

## 2. File Structure

Complete directory tree under `src/app/`:

```
src/app/
├── app.module.ts                          # Root module — imports CoreModule, SharedModule, AppRoutingModule
├── app.component.ts                       # Root layout component — design token provider, router-outlet
├── app.component.html
├── app.component.scss
├── app-routing.module.ts                  # Route definitions with lazy-loading loadChildren
│
├── core/                                  # Singleton services, guards, resolvers (providedIn: 'root')
│   ├── core.module.ts                     # CoreModule — imports CommonModule, HttpClientModule
│   ├── services/
│   │   ├── game-rules.service.ts          # TRANSFORM domain — pure static methods
│   │   ├── run-state.service.ts           # STATE + ORCHESTRATION — RunState, DeckState
│   │   ├── round-state.service.ts         # STATE + ORCHESTRATION — RoundState, derived signals
│   │   ├── meld-state.service.ts          # STATE + ORCHESTRATION — MeldState[]
│   │   ├── modifier-state.service.ts      # STATE + ORCHESTRATION — ActiveModifierState
│   │   ├── enhancement-state.service.ts   # STATE + ORCHESTRATION — enhances DeckState
│   │   ├── shop-state.service.ts          # STATE + ORCHESTRATION — ShopState
│   │   ├── scoring.service.ts             # ORCHESTRATION — scoring pipeline coordinator
│   │   ├── error-recovery.service.ts      # STATE + ORCHESTRATION + EFFECT — error log, rollback
│   │   └── scene-bridge.service.ts        # EFFECT — BabylonJS boundary implementation
│   ├── guards/
│   │   ├── run-active.guard.ts            # TRANSFORM — checks run-state.runOver === false
│   │   ├── shop-phase.guard.ts            # TRANSFORM — checks round-state.phase === 'Shop'
│   │   └── score-phase.guard.ts           # TRANSFORM — checks round-state.phase === 'Score'
│   ├── resolvers/
│   │   ├── run-state.resolver.ts          # EFFECT → ORCHESTRATION — loads persisted run, invokes loadRun()
│   │   ├── round-state.resolver.ts        # TRANSFORM — derives round from run-state
│   │   └── shop-state.resolver.ts         # TRANSFORM — derives shop from shop-state
│   └── models/
│       ├── signal-inventory-entry.ts      # SignalInventoryEntry interface
│       ├── service-definition.ts          # ServiceDefinition interface
│       ├── route-definition.ts            # RouteDefinition interface
│       └── babylonjs-boundary-contract.ts # BabylonJSBoundaryContract interface + const
│
├── features/
│   ├── gameplay/                          # Lazy-loaded: loadChildren: () => import('./features/gameplay')
│   │   ├── gameplay.module.ts             # GameplayModule — declares gameplay components, provides UiStateService
│   │   ├── gameplay-routing.module.ts     # Child route: path: '', component: GameplayComponent
│   │   ├── gameplay.component.ts          # Root gameplay layout — HUD + hand + table + action bar
│   │   ├── gameplay.component.html
│   │   ├── gameplay.component.scss
│   │   ├── services/
│   │   │   └── ui-state.service.ts        # STATE + ORCHESTRATION — feature-scoped UI state
│   │   └── components/
│   │       ├── hud/
│   │       │   ├── hud.component.ts       # Score display, turn indicator, phase indicator
│   │       │   ├── hud.component.html
│   │       │   └── hud.component.scss
│   │       ├── hand/
│   │       │   ├── hand.component.ts      # Card list, drag source
│   │       │   ├── hand.component.html
│   │       │   └── hand.component.scss
│   │       ├── table/
│   │       │   ├── table.component.ts     # Meld zones, tray slots
│   │       │   ├── table.component.html
│   │       │   └── table.component.scss
│   │       ├── discard-pile/
│   │       │   ├── discard-pile.component.ts  # Top card display, freeze indicator
│   │       │   ├── discard-pile.component.html
│   │       │   └── discard-pile.component.scss
│   │       ├── draw-pile/
│   │       │   ├── draw-pile.component.ts # Card count, draw action trigger
│   │       │   ├── draw-pile.component.html
│   │       │   └── draw-pile.component.scss
│   │       ├── action-bar/
│   │       │   ├── action-bar.component.ts    # Draw, meld, discard, go-out buttons
│   │       │   ├── action-bar.component.html
│   │       │   └── action-bar.component.scss
│   │       └── modifier-bar/
│   │           ├── modifier-bar.component.ts  # Partner slots, active modifiers display
│   │           ├── modifier-bar.component.html
│   │           └── modifier-bar.component.scss
│   │
│   ├── deck-inventory/                    # Lazy-loaded: loadChildren: () => import('./features/deck-inventory')
│   │   ├── deck-inventory.module.ts
│   │   ├── deck-inventory-routing.module.ts
│   │   ├── deck-inventory.component.ts    # Full deck view root
│   │   ├── deck-inventory.component.html
│   │   ├── deck-inventory.component.scss
│   │   └── components/
│   │       ├── card-list/
│   │       │   ├── card-list.component.ts # Full deck grid, enhancement badges
│   │       │   ├── card-list.component.html
│   │       │   └── card-list.component.scss
│   │       ├── rank-density-chart/
│   │       │   ├── rank-density-chart.component.ts  # Visual rank distribution
│   │       │   ├── rank-density-chart.component.html
│   │       │   └── rank-density-chart.component.scss
│   │       └── wild-card-summary/
│   │           ├── wild-card-summary.component.ts  # Wild card economy display
│   │           ├── wild-card-summary.component.html
│   │           └── wild-card-summary.component.scss
│   │
│   ├── shop/                              # Lazy-loaded: loadChildren: () => import('./features/shop')
│   │   ├── shop.module.ts
│   │   ├── shop-routing.module.ts
│   │   ├── shop.component.ts              # Shop rewards screen root
│   │   ├── shop.component.html
│   │   ├── shop.component.scss
│   │   └── components/
│   │       ├── shop-slots/
│   │       │   ├── shop-slots.component.ts    # Item cards, purchase buttons
│   │       │   ├── shop-slots.component.html
│   │       │   └── shop-slots.component.scss
│   │       ├── card-acquisition/
│   │       │   ├── card-acquisition.component.ts  # Add/remove/convert cards
│   │       │   ├── card-acquisition.component.html
│   │       │   └── card-acquisition.component.scss
│   │       └── gold-display/
│   │           ├── gold-display.component.ts  # Current gold amount
│   │           ├── gold-display.component.html
│   │           └── gold-display.component.scss
│   │
│   └── score-results/                     # Lazy-loaded: loadChildren: () => import('./features/score-results')
│       ├── score-results.module.ts
│       ├── score-results-routing.module.ts
│       ├── score-results.component.ts      # Score results screen root
│       ├── score-results.component.html
│       ├── score-results.component.scss
│       └── components/
│           ├── score-breakdown/
│           │   ├── score-breakdown.component.ts  # Per-canasta scores, modifier log
│           │   ├── score-breakdown.component.html
│           │   └── score-breakdown.component.scss
│           ├── round-summary/
│           │   ├── round-summary.component.ts    # Total score, target, advance/fail
│           │   ├── round-summary.component.html
│           │   └── round-summary.component.scss
│           └── run-summary/
│               ├── run-summary.component.ts     # Ante progression, deck stats
│               ├── run-summary.component.html
│               └── run-summary.component.scss
│
├── shared/                                # SharedModule — imported by all feature modules
│   ├── shared.module.ts
│   ├── components/
│   │   ├── card-visual/
│   │   │   ├── card-visual.component.ts   # Reusable card mesh + Angular overlay
│   │   │   ├── card-visual.component.html
│   │   │   └── card-visual.component.scss
│   │   ├── meld-zone/
│   │   │   ├── meld-zone.component.ts     # Reusable meld zone with drop target
│   │   │   ├── meld-zone.component.html
│   │   │   └── meld-zone.component.scss
│   │   ├── action-button/
│   │   │   ├── action-button.component.ts # Reusable action button
│   │   │   ├── action-button.component.html
│   │   │   └── action-button.component.scss
│   │   └── design-token-provider/
│   │       ├── design-token-provider.component.ts  # Injects CSS custom properties from Area 5 tokens
│   │       ├── design-token-provider.component.html
│   │       └── design-token-provider.component.scss
│   ├── directives/
│   │   ├── drag-and-drop.directive.ts     # @HostListener-based drag-and-drop with BabylonJS sync
│   │   └── keyboard-navigation.directive.ts  # @HostListener-based keyboard nav per Area 5 spec
│   └── pipes/
│       ├── score-format.pipe.ts           # Formats score numbers with neon styling
│       ├── phase-label.pipe.ts            # Maps TurnPhase → display label
│       └── enhancement-icon.pipe.ts       # Maps EnhancementType → icon class
│
└── assets/
    └── ...                                # Static assets (images, fonts, etc.)
```

---

## 3. DSFR Domain Decomposition

Each domain service is an Angular `Injectable` that acts as a DSFR domain container. The table below classifies every service with its DSFR role, owned signals, entry points, and dependencies.

### 3.1 Domain Inventory

| # | Domain | Service | DSFR Role | Owned State |
|---|--------|---------|-----------|-------------|
| 1 | Game Rules | `GameRulesService` | TRANSFORM | None (pure static methods) |
| 2 | Run & Deck | `RunStateService` | STATE + ORCHESTRATION | `run-state`, `deck-state` |
| 3 | Round & Turn | `RoundStateService` | STATE + ORCHESTRATION | `round-state`, `hand-cards`, `discard-top`, `draw-pile-count`, `score-target`, `phase-label`, `can-go-out` |
| 4 | Meld | `MeldStateService` | STATE + ORCHESTRATION | `meld-states` |
| 5 | Modifiers | `ModifierStateService` | STATE + ORCHESTRATION | `modifier-state`, `active-boss-rule`, `partner-slots`, `tray-slots` |
| 6 | Enhancements | `EnhancementStateService` | STATE + ORCHESTRATION | (enhances `deck-state`) |
| 7 | Shop | `ShopStateService` | STATE + ORCHESTRATION | `shop-state` |
| 8 | Scoring | `ScoringService` | ORCHESTRATION + TRANSFORM | `current-score` |
| 9 | Error & Recovery | `ErrorRecoveryService` | STATE + ORCHESTRATION + EFFECT | `error-log` |
| 10 | Scene Bridge | `SceneBridgeService` | EFFECT | None |
| 11 | UI State | `UiStateService` | STATE + ORCHESTRATION | `current-screen`, `card-visual-states`, `meld-visual-states`, `action-button-states`, `selected-card-id`, `drag-state`, `design-tokens` |

### 3.2 Domain Service Details

#### 3.2.1 GameRulesService (TRANSFORM)

```typescript
@Injectable({ providedIn: 'root' })
export class GameRulesService {
  // No signals — pure static transforms only
  static validateMeld(meld: Meld, cards: Card[]): MeldValidationResult { ... }
  static scoreCanasta(type: CanastaType, cards: Card[]): CanastaScoreResult { ... }
  static canGoOut(melds: MeldState[], score: number): boolean { ... }
  static determineCanastaType(cards: Card[]): CanastaType { ... }
}
```

- **DSFR Role**: TRANSFORM — all methods are `static`, pure, deterministic
- **Owned Signals**: None
- **Entry Points**: None (called by orchestration methods)
- **Dependencies**: None (imports types from Area 1 only)
- **Invariant**: Never accesses `this`, never reads signals, never injects collaborators

#### 3.2.2 RunStateService (STATE + ORCHESTRATION)

```typescript
@Injectable({ providedIn: 'root' })
export class RunStateService {
  // STATE — source signals
  private readonly runState = signal<RunState>(initialRunState);
  private readonly deckState = signal<DeckState>(initialDeckState);

  // ORCHESTRATION — entry points (only code that calls .set()/.update())
  startRun(config: RunConfig): void { ... }
  loadRun(persisted: RunState): void { ... }
  advanceRound(): void { ... }
  modifyDeck(updater: (deck: DeckState) => DeckState): void { ... }
}
```

- **DSFR Role**: STATE (signals) + ORCHESTRATION (entry points)
- **Owned Signals**: `run-state`, `deck-state`
- **Entry Points**: `startRun`, `loadRun`, `advanceRound`, `modifyDeck`
- **Dependencies**: Area 8 `PersistenceService` (for `loadRun`)
- **Invariant**: Only `RunStateService` may call `.set()` on `run-state` or `deck-state`

#### 3.2.3 RoundStateService (STATE + ORCHESTRATION)

```typescript
@Injectable({ providedIn: 'root' })
export class RoundStateService {
  // STATE — source signal
  private readonly roundState = signal<RoundState>(initialRoundState);

  // STATE — derived signals
  readonly handCards = computed(() => this.roundState().hand);
  readonly discardTop = computed(() => this.roundState().discardPile[0] ?? null);
  readonly drawPileCount = computed(() => this.roundState().drawPile.length);
  readonly scoreTarget = computed(() => this.roundState().scoreTarget);
  readonly phaseLabel = computed(() => { /* maps TurnPhase → display string */ });
  readonly canGoOut = computed(() => GameRulesService.canGoOut(/* ... */));

  // ORCHESTRATION — entry points
  beginTurn(): void { ... }
  endTurn(): void { ... }
  transitionPhase(phase: TurnPhase): void { ... }
  dealHand(cards: Card[]): void { ... }
  drawCard(): void { ... }
  discardCard(cardId: string): void { ... }
}
```

- **DSFR Role**: STATE (signals + computed) + ORCHESTRATION (entry points)
- **Owned Signals**: `round-state` (writable), `hand-cards`, `discard-top`, `draw-pile-count`, `score-target`, `phase-label`, `can-go-out` (computed)
- **Entry Points**: `beginTurn`, `endTurn`, `transitionPhase`, `dealHand`, `drawCard`, `discardCard`
- **Dependencies**: `GameRulesService` (TRANSFORM — static calls only)
- **Invariant**: `canGoOut` computed signal calls `GameRulesService.canGoOut()` (pure transform), never mutates state

#### 3.2.4 MeldStateService (STATE + ORCHESTRATION)

```typescript
@Injectable({ providedIn: 'root' })
export class MeldStateService {
  // STATE — source signal
  private readonly meldStates = signal<MeldState[]>([]);

  // ORCHESTRATION — entry points
  placeMeld(cards: Card[], meld: Meld): void { ... }
  extendMeld(meldId: string, cards: Card[]): void { ... }
  sealCanasta(meldId: string): void { ... }
}
```

- **DSFR Role**: STATE + ORCHESTRATION
- **Owned Signals**: `meld-states`
- **Entry Points**: `placeMeld`, `extendMeld`, `sealCanasta`
- **Dependencies**: `GameRulesService` (TRANSFORM), `ScoringService` (ORCHESTRATION), `ErrorRecoveryService` (EFFECT — auto-save)
- **Invariant**: `placeMeld` calls `GameRulesService.validateMeld()` before mutating; `sealCanasta` calls `ScoringService.scoreCanasta()` then updates its own signal

#### 3.2.5 ModifierStateService (STATE + ORCHESTRATION)

```typescript
@Injectable({ providedIn: 'root' })
export class ModifierStateService {
  // STATE — source signal
  private readonly modifierState = signal<ActiveModifierState>(initialModifierState);

  // STATE — derived signals
  readonly activeBossRule = computed(() => this.modifierState().activeBossRule);
  readonly partnerSlots = computed(() => this.modifierState().partnerSlots);
  readonly traySlots = computed(() => this.modifierState().traySlots);

  // ORCHESTRATION — entry points
  draftPartner(slot: PartnerSlot): void { ... }
  activateHouseRule(rule: HouseRule): void { ... }
  assignTray(slot: TraySlot): void { ... }
  applyBossRule(rule: BossRule): void { ... }
}
```

- **DSFR Role**: STATE + ORCHESTRATION
- **Owned Signals**: `modifier-state` (writable), `active-boss-rule`, `partner-slots`, `tray-slots` (computed)
- **Entry Points**: `draftPartner`, `activateHouseRule`, `assignTray`, `applyBossRule`
- **Dependencies**: None (Area 3 types imported only)

#### 3.2.6 EnhancementStateService (STATE + ORCHESTRATION)

```typescript
@Injectable({ providedIn: 'root' })
export class EnhancementStateService {
  // ORCHESTRATION — entry points (mutates deck-state via RunStateService)
  applySeal(cardId: string, enhancement: Enhancement): void { ... }
  removeEnhancement(cardId: string): void { ... }
}
```

- **DSFR Role**: STATE + ORCHESTRATION
- **Owned Signals**: None directly — enhances `deck-state` owned by `RunStateService` via `RunStateService.modifyDeck()`
- **Entry Points**: `applySeal`, `removeEnhancement`
- **Dependencies**: `RunStateService` (delegates deck mutation via `modifyDeck` entry point)
- **Invariant**: Never writes to `deck-state` directly — always calls `RunStateService.modifyDeck()`

#### 3.2.7 ShopStateService (STATE + ORCHESTRATION)

```typescript
@Injectable({ providedIn: 'root' })
export class ShopStateService {
  // STATE — source signal
  private readonly shopState = signal<ShopState | null>(null);

  // ORCHESTRATION — entry points
  generateShop(ante: Ante): void { ... }
  purchaseItem(itemId: string): void { ... }
  rerollShop(): void { ... }
}
```

- **DSFR Role**: STATE + ORCHESTRATION
- **Owned Signals**: `shop-state`
- **Entry Points**: `generateShop`, `purchaseItem`, `rerollShop`
- **Dependencies**: `RunStateService` (for gold/deck state reads via computed)

#### 3.2.8 ScoringService (ORCHESTRATION + TRANSFORM)

```typescript
@Injectable({ providedIn: 'root' })
export class ScoringService {
  // STATE — derived signal
  readonly currentScore = computed(() => {
    // Sum of all sealed canasta scores this round
  });

  // ORCHESTRATION — entry points
  scoreRound(): number { ... }
  scoreCanasta(meldState: MeldState): number { ... }
}
```

- **DSFR Role**: ORCHESTRATION + TRANSFORM
- **Owned Signals**: `current-score` (computed)
- **Entry Points**: `scoreRound`, `scoreCanasta`
- **Dependencies**: `GameRulesService` (TRANSFORM — static calls), `MeldStateService` (reads `meld-states`), `ModifierStateService` (calls `runModifierPipeline` from Area 3)
- **Invariant**: `scoreCanasta` calls `GameRulesService.scoreCanasta()` (pure transform) then `ModifierStateService.runModifierPipeline()` (orchestration)

#### 3.2.9 ErrorRecoveryService (STATE + ORCHESTRATION + EFFECT)

```typescript
@Injectable({ providedIn: 'root' })
export class ErrorRecoveryService {
  // STATE — source signal
  private readonly errorLog = signal<StateErrorEntry[]>([]);

  // ORCHESTRATION — entry points
  detectInvalidState(state: unknown): boolean { ... }
  rollbackToLastValid(): void { ... }
  resetToRoundStart(): void { ... }

  // EFFECT
  autoSave(): void { ... }  // Persists run-state to localStorage via Area 8
}
```

- **DSFR Role**: STATE + ORCHESTRATION + EFFECT
- **Owned Signals**: `error-log`
- **Entry Points**: `detectInvalidState`, `rollbackToLastValid`, `resetToRoundStart`
- **Dependencies**: `RunStateService` (invokes `loadRun` entry point for rollback — never writes signals directly), Area 8 `PersistenceService` (for `autoSave`)
- **Invariant**: DSFR Tier 1 forbids cross-domain mutation — `rollbackToLastValid` calls `RunStateService.loadRun()`, never `.set()` on `run-state` directly

#### 3.2.10 SceneBridgeService (EFFECT)

```typescript
@Injectable({ providedIn: 'root' })
export class SceneBridgeService {
  // EFFECT — BabylonJS push methods (called from Angular effects)
  syncCardMeshes(states: CardVisualState[]): void { ... }
  syncMeldZones(states: MeldVisualState[]): void { ... }
  syncActionButtons(states: ActionButtonState[]): void { ... }
  transitionScene(screen: ScreenId): void { ... }
  highlightCard(cardId: string | null): void { ... }
  updateDragGhost(state: DragState | null): void { ... }

  // BabylonJS event handlers (registered in constructor/ngOnInit)
  // Each handler invokes a domain entry point — never calls .set() directly
  private onCardClicked = (cardId: string): void => {
    this.uiStateService.selectCard(cardId);  // ORCHESTRATION entry point
  };
  private onCardDroppedOnMeldZone = (cardId: string, zoneId: string): void => {
    this.meldStateService.placeMeld(/* ... */);  // ORCHESTRATION entry point
  };
  private onDrawPileClicked = (): void => {
    this.roundStateService.drawCard();  // ORCHESTRATION entry point
  };
  private onActionButtonClicked = (action: string): void => {
    this.roundStateService.transitionPhase(/* ... */);  // ORCHESTRATION entry point
  };
  private onShopItemClicked = (itemId: string): void => {
    this.shopStateService.purchaseItem(itemId);  // ORCHESTRATION entry point
  };
}
```

- **DSFR Role**: EFFECT
- **Owned Signals**: None
- **Entry Points**: None (invokes entry points on other services)
- **Dependencies**: `UiStateService`, `MeldStateService`, `RoundStateService`, `ShopStateService` (all ORCHESTRATION entry points), BabylonJS scene reference (from Area 6)
- **Invariant**: BabylonJS never reads Angular signals directly; all updates flow through explicit imperative calls; all scene events re-enter through entry points

#### 3.2.11 UiStateService (STATE + ORCHESTRATION, feature-scoped)

```typescript
@Injectable()  // NOT providedIn: 'root' — provided in GameplayModule
export class UiStateService {
  // STATE — linked signals (writable + auto-derive from source)
  readonly currentScreen = linkedSignal<ScreenId>({
    source: this.roundPhase,
    computation: (phase) => {
      switch (phase) {
        case 'Shop': return 'shop';
        case 'Score': return 'score';
        default: return 'gameplay';
      }
    },
  });

  readonly selectedCardId = linkedSignal<string | null>({
    source: this.handCards,
    computation: (hand, previous) => {
      if (previous.value !== null && hand.some(c => c.id === previous.value)) {
        return previous.value;  // preserve selection if card still in hand
      }
      return null;  // auto-reset when card leaves hand
    },
  });

  // STATE — source signal (independent writable)
  private readonly dragState = signal<DragState | null>(null);

  // STATE — derived signals (read-only)
  readonly cardVisualStates = computed(() => { /* derived from hand-cards + enhancement state */ });
  readonly meldVisualStates = computed(() => { /* derived from meld-states + tray assignments */ });
  readonly actionButtonStates = computed(() => { /* derived from round phase + available actions */ });
  readonly designTokens = computed(() => { /* static design token table from Area 5 */ });

  // ORCHESTRATION — entry points
  selectCard(cardId: string | null): void {
    this.selectedCardId.set(cardId);  // works — linkedSignal is writable
  }
  setDragState(state: DragState | null): void {
    this.dragState.set(state);
  }
  transitionScreen(screen: ScreenId): void {
    this.currentScreen.set(screen);  // works — linkedSignal is writable
  }
}
```

- **DSFR Role**: STATE + ORCHESTRATION
- **Owned Signals**: `current-screen`, `selected-card-id`, `drag-state` (writable), `card-visual-states`, `meld-visual-states`, `action-button-states`, `design-tokens` (computed)
- **Entry Points**: `selectCard`, `setDragState`, `transitionScreen`
- **Dependencies**: `RoundStateService` (reads `round-state`), `MeldStateService` (reads `meld-states`), `ModifierStateService` (reads `modifier-state`), Area 5 design tokens (static import)
- **Scope**: Feature-scoped to `GameplayModule` — not a singleton

---

## 4. Linked Signal Analysis

Angular 21's `linkedSignal` is a writable signal that is intrinsically linked to another signal (its "source"). When the source changes, the `linkedSignal` can auto-reset its value. This is distinct from `computed()` (read-only derivation) and `signal()` (fully independent writable state).

### When to use `linkedSignal` vs `signal` vs `computed`

| Pattern | Use | Example |
|---------|-----|---------|
| `computed()` | Read-only derived state. Recalculates when dependencies change. | `handCards`, `phaseLabel`, `canGoOut` |
| `signal()` | Independent writable state. Never auto-resets. | `round-state`, `meld-states`, `deck-state` |
| `linkedSignal(computation)` | Writable derived state that auto-resets to the computation result when dependencies change. | `selected-card-id` (resets when hand changes) |
| `linkedSignal({source, computation})` | Writable derived state with access to previous value for smart preservation. | `current-screen` (linked to round phase) |

### 4.1 Signals that should use `linkedSignal`

#### `selected-card-id` — Auto-reset when hand changes

Currently defined as `signal<string | null>(null)`. Problem: if the selected card is discarded or melded, `selectedCardId` still holds the stale ID.

**Fix:** Use `linkedSignal` tied to `handCards`:

```typescript
// In UiStateService:
readonly selectedCardId = linkedSignal<string | null>({
  source: this.handCards,  // linked to the hand-cards computed
  computation: (hand, previous) => {
    // If the previously selected card is still in hand, preserve selection.
    // Otherwise, reset to null.
    if (previous.value !== null && hand.some(c => c.id === previous.value)) {
      return previous.value;
    }
    return null;
  },
});
```

This ensures:
- When a card is discarded/melded, `selectedCardId` auto-resets to `null`
- When the hand is re-dealt (new round), selection clears automatically
- User can still explicitly set/deselect via `selectCard()` entry point

#### `current-screen` — Auto-derive from round phase

Currently defined as `signal<ScreenId>('gameplay')`. Problem: screen and phase can get out of sync.

**Fix:** Use `linkedSignal` tied to the round phase:

```typescript
// In UiStateService:
readonly currentScreen = linkedSignal<ScreenId>({
  source: this.roundPhase,  // linked to the round-phase computed
  computation: (phase, previous) => {
    // Map round phase to default screen
    switch (phase) {
      case 'Shop': return 'shop';
      case 'Score': return 'score';
      default: return 'gameplay';
    }
  },
});
```

This ensures the screen always reflects the current game phase. Explicit `transitionScreen()` calls still work (the `linkedSignal` is writable), but if the phase changes without an explicit screen transition, the screen auto-corrects.

### 4.2 Signals that should remain `computed` (not `linkedSignal`)

These signals are **read-only derivations** — no user sets them directly, and they should always reflect the current source state:

- `handCards` — always derive from `roundState.hand`
- `discardTop` — always derive from `roundState.discardPile[0]`
- `drawPileCount` — always derive from `roundState.drawPile.length`
- `scoreTarget` — always derive from `roundState.scoreTarget`
- `phaseLabel` — always derive from `roundState.phase`
- `canGoOut` — always derive from `GameRulesService.canGoOut()`
- `activeBossRule` — always derive from `modifierState.activeBossRule`
- `partnerSlots` — always derive from `modifierState.partnerSlots`
- `traySlots` — always derive from `modifierState.traySlots`
- `cardVisualStates` — always derive from hand + enhancement state
- `meldVisualStates` — always derive from meld-states + tray assignments
- `actionButtonStates` — always derive from round phase
- `currentScore` — always derive from meld scores
- `designTokens` — static, never changes

### 4.3 Signals that should remain `signal` (not `linkedSignal`)

These are **source of truth** signals — they are mutated only through orchestration entry points and should never auto-reset:

- `run-state` — mutated by `RunStateService` entry points
- `deck-state` — mutated by `RunStateService.modifyDeck()`
- `round-state` — mutated by `RoundStateService` entry points
- `meld-states` — mutated by `MeldStateService` entry points
- `modifier-state` — mutated by `ModifierStateService` entry points
- `shop-state` — mutated by `ShopStateService` entry points
- `error-log` — mutated by `ErrorRecoveryService` entry points
- `drag-state` — mutated by `setDragState()` entry point (ephemeral UI state)

### 4.4 Updated Signal Classification

| Signal | Type | Reason |
|--------|------|--------|
| `selected-card-id` | **`linkedSignal`** | Writable, but should auto-reset when hand changes and selected card is no longer valid |
| `current-screen` | **`linkedSignal`** | Writable, but should auto-derive from round phase as a default |
| All other writable signals | `signal()` | Source of truth — mutated only through orchestration entry points |
| All derived signals | `computed()` | Read-only — always reflect current source state |

---

## 5. Signal Inventory

Complete inventory of all 24 signals in the Angular application. Every signal is catalogued with its name, type, owning service, computed/writable status, and DSFR role.

| # | Signal Name | Type | Writable / Computed | Owning Service | DSFR Role | Description |
|---|------------|------|---------------------|----------------|-----------|-------------|
| 1 | `run-state` | `RunState` | Writable | `RunStateService` | STATE | Full run state wrapper (ante, deck reference, round index) |
| 2 | `round-state` | `RoundState` | Writable | `RoundStateService` | STATE | Current round/turn/phase, hand, discard pile, draw pile |
| 3 | `deck-state` | `DeckState` | Writable | `RunStateService` | STATE | Full deck with per-card enhancement state |
| 4 | `meld-states` | `MeldState[]` | Writable | `MeldStateService` | STATE | All active melds on table |
| 5 | `modifier-state` | `ActiveModifierState` | Writable | `ModifierStateService` | STATE | Active partners, scorepads, trays, boss rule |
| 6 | `shop-state` | `ShopState \| null` | Writable | `ShopStateService` | STATE | Current shop items (null when not in shop phase) |
| 7 | `error-log` | `StateErrorEntry[]` | Writable | `ErrorRecoveryService` | STATE | Accumulated error entries for recovery |
| 8 | `current-screen` | `ScreenId` | **Linked** (writable + auto-derives) | `UiStateService` | STATE (linked) | Auto-derives from round phase; writable via `transitionScreen()` entry point |
| 9 | `card-visual-states` | `CardVisualState[]` | Computed | `UiStateService` | STATE (derived) | Derived from hand cards + enhancement state + selection |
| 10 | `meld-visual-states` | `MeldVisualState[]` | Computed | `UiStateService` | STATE (derived) | Derived from meld-states + tray assignments |
| 11 | `action-button-states` | `ActionButtonState[]` | Computed | `UiStateService` | STATE (derived) | Derived from round phase + available actions |
| 12 | `hand-cards` | `Card[]` | Computed | `RoundStateService` | STATE (derived) | Derived from `round-state.hand` |
| 13 | `discard-top` | `Card \| null` | Computed | `RoundStateService` | STATE (derived) | Derived from `round-state.discardPile[0]` |
| 14 | `draw-pile-count` | `number` | Computed | `RoundStateService` | STATE (derived) | Derived from `round-state.drawPile.length` |
| 15 | `current-score` | `number` | Computed | `ScoringService` | STATE (derived) | Sum of all sealed canasta scores this round |
| 16 | `score-target` | `number` | Computed | `RoundStateService` | STATE (derived) | Derived from `round-state.scoreTarget` |
| 17 | `active-boss-rule` | `BossRule \| null` | Computed | `ModifierStateService` | STATE (derived) | Derived from `modifier-state.activeBossRule` |
| 18 | `partner-slots` | `PartnerSlot[]` | Computed | `ModifierStateService` | STATE (derived) | Derived from `modifier-state.partnerSlots` |
| 19 | `tray-slots` | `TraySlot[]` | Computed | `ModifierStateService` | STATE (derived) | Derived from `modifier-state.traySlots` |
| 20 | `design-tokens` | `DesignToken[]` | Computed | `UiStateService` | STATE (derived) | Static design token table from Area 5 (constant after init) |
| 21 | `selected-card-id` | `string \| null` | **Linked** (writable + auto-resets) | `UiStateService` | STATE (linked) | Selected card; auto-resets to null when selected card leaves hand |
| 22 | `drag-state` | `DragState \| null` | Writable | `UiStateService` | STATE | Current drag-and-drop operation state |
| 23 | `phase-label` | `string` | Computed | `RoundStateService` | STATE (derived) | Human-readable phase label for HUD (e.g. "Draw Phase") |
| 24 | `can-go-out` | `boolean` | Computed | `RoundStateService` | STATE (derived) | Derived from Area 1's `canGoOut()` pure transform |

### Signal Derivation Graph

```
run-state ──────────────────────────────────────────────────────────────┐
  │                                                                     │
  ├── deck-state ────────────────────────────────────────────────────┐  │
  │     │                                                            │  │
  │     └── (EnhancementStateService.applySeal modifies via          │  │
  │          RunStateService.modifyDeck entry point)                 │  │
  │                                                                  │  │
round-state ─────────────────────────────────────────────────────────┤  │
  │                                                                  │  │
  ├── hand-cards ──→ card-visual-states ──→ [BabylonJS syncCardMeshes]
  ├── discard-top                                                    │  │
  ├── draw-pile-count                                                │  │
  ├── score-target                                                   │  │
  ├── phase-label                                                    │  │
  └── can-go-out                                                     │  │
                                                                     │  │
meld-states ──→ meld-visual-states ──→ [BabylonJS syncMeldZones]    │  │
  │                                                                  │  │
  └── (sealCanasta → ScoringService.scoreCanasta → current-score)   │  │
                                                                     │  │
modifier-state ──────────────────────────────────────────────────────┤  │
  ├── active-boss-rule                                               │  │
  ├── partner-slots                                                  │  │
  └── tray-slots                                                     │  │
                                                                     │  │
shop-state ──────────────────────────────────────────────────────────┤  │
                                                                     │  │
error-log ───────────────────────────────────────────────────────────┤  │
                                                                     │  │
current-screen ──→ [BabylonJS transitionScene]                      │  │
                                                                     │  │
selected-card-id ──→ [BabylonJS highlightCard]                     │  │
                                                                     │  │
drag-state ──→ [BabylonJS updateDragGhost]                         │  │
                                                                     │  │
action-button-states ──→ [BabylonJS syncActionButtons]             │  │
                                                                     │  │
design-tokens ──→ CSS custom properties                             ──┘
```

---

## 5. Component Tree

Full module and component tree with lazy-loading boundaries.

```
app-root (AppComponent)
│  ├── Provides: design-token-provider (CSS custom properties from Area 5)
│  └── Contains: <router-outlet>
│
├── [Route: /] → HomeComponent (eager)
│
├── [Route: /gameplay] → LAZY LOAD: GameplayModule
│   └── GameplayComponent
│       ├── HudComponent
│       │   ├── Reads: current-score, phase-label, score-target
│       │   └── Displays: score, turn indicator, phase indicator
│       ├── HandComponent
│       │   ├── Reads: card-visual-states, selected-card-id
│       │   ├── Uses: drag-and-drop directive
│       │   └── Displays: card list with drag source
│       ├── TableComponent
│       │   ├── Reads: meld-visual-states
│       │   └── Displays: meld zones, tray slots
│       ├── DiscardPileComponent
│       │   ├── Reads: discard-top
│       │   └── Displays: top card, freeze indicator
│       ├── DrawPileComponent
│       │   ├── Reads: draw-pile-count
│       │   └── Displays: card count, draw action trigger
│       ├── ActionBarComponent
│       │   ├── Reads: action-button-states, can-go-out
│       │   └── Displays: draw, meld, discard, go-out buttons
│       └── ModifierBarComponent
│           ├── Reads: partner-slots, active-boss-rule
│           └── Displays: partner slots, active modifiers
│
├── [Route: /deck] → LAZY LOAD: DeckInventoryModule
│   └── DeckInventoryComponent
│       ├── CardListComponent
│       │   ├── Reads: deck-state
│       │   └── Displays: full deck grid, enhancement badges
│       ├── RankDensityChartComponent
│       │   ├── Reads: deck-state
│       │   └── Displays: visual rank distribution chart
│       └── WildCardSummaryComponent
│           ├── Reads: deck-state
│           └── Displays: wild card economy summary
│
├── [Route: /shop] → LAZY LOAD: ShopModule
│   └── ShopComponent
│       ├── ShopSlotsComponent
│       │   ├── Reads: shop-state
│       │   └── Displays: item cards, purchase buttons
│       ├── CardAcquisitionComponent
│       │   ├── Reads: shop-state, deck-state
│       │   └── Displays: add/remove/convert card actions
│       └── GoldDisplayComponent
│           ├── Reads: run-state (gold)
│           └── Displays: current gold amount
│
├── [Route: /score] → LAZY LOAD: ScoreResultsModule
│   └── ScoreResultsComponent
│       ├── ScoreBreakdownComponent
│       │   ├── Reads: meld-states (scoreBreakdown field)
│       │   └── Displays: per-canasta scores, modifier log
│       ├── RoundSummaryComponent
│       │   ├── Reads: current-score, score-target, round-state
│       │   └── Displays: total score, target, advance/fail
│       └── RunSummaryComponent
│           ├── Reads: run-state
│           └── Displays: ante progression, deck stats
│
└── [Route: **] → NotFoundComponent (eager)
```

### Lazy-Loading Boundaries

| Module | Load Trigger | Route Path | Guards |
|--------|-------------|------------|--------|
| `GameplayModule` | Route navigation | `/gameplay` | `RunActiveGuard` |
| `DeckInventoryModule` | Route navigation | `/deck` | `RunActiveGuard` |
| `ShopModule` | Route navigation | `/shop` | `RunActiveGuard`, `ShopPhaseGuard` |
| `ScoreResultsModule` | Route navigation | `/score` | `RunActiveGuard`, `ScorePhaseGuard` |

Each feature module is loaded via Angular's `loadChildren` dynamic import:

```typescript
// app-routing.module.ts
{
  path: 'gameplay',
  loadChildren: () => import('./features/gameplay/gameplay.module')
    .then(m => m.GameplayModule),
  canActivate: [RunActiveGuard],
  resolve: { runState: RunStateResolver }
}
```

---

## 6. Routing

### 6.1 Route Definitions

| # | Path | Component | Lazy Module | Guards | Resolvers | Description |
|---|------|-----------|------------|--------|-----------|-------------|
| 1 | `/` | `HomeComponent` | — (eager) | — | — | Landing screen — new run / continue |
| 2 | `/gameplay` | `GameplayComponent` | `GameplayModule` | `RunActiveGuard` | `RunStateResolver` | Main gameplay HUD |
| 3 | `/deck` | `DeckInventoryComponent` | `DeckInventoryModule` | `RunActiveGuard` | `RunStateResolver` | Deck/inventory management |
| 4 | `/shop` | `ShopComponent` | `ShopModule` | `RunActiveGuard`, `ShopPhaseGuard` | `ShopStateResolver` | Shop rewards screen |
| 5 | `/score` | `ScoreResultsComponent` | `ScoreResultsModule` | `RunActiveGuard`, `ScorePhaseGuard` | `RoundStateResolver` | Score results screen |
| 6 | `**` | `NotFoundComponent` | — (eager) | — | — | 404 fallback |

### 6.2 Route Guards

| Guard | DSFR Role | Logic | Applied To |
|-------|-----------|-------|------------|
| `RunActiveGuard` | TRANSFORM | Pure check: `run-state.runOver === false` | `/gameplay`, `/deck`, `/shop`, `/score` |
| `ShopPhaseGuard` | TRANSFORM | Pure check: `round-state.phase === 'Shop'` | `/shop` |
| `ScorePhaseGuard` | TRANSFORM | Pure check: `round-state.phase === 'Score'` | `/score` |

All guards are pure functions that read signals and return `boolean | UrlTree`. No side effects, no mutations.

```typescript
// Example: RunActiveGuard
@Injectable({ providedIn: 'root' })
export class RunActiveGuard implements CanActivate {
  constructor(private runStateService: RunStateService) {}

  canActivate(): boolean | UrlTree {
    return this.runStateService.runState().runOver === false
      ? true
      : UrlTree.parse('/');
  }
}
```

### 6.3 Route Resolvers

| Resolver | DSFR Role | Logic | Applied To |
|----------|-----------|-------|------------|
| `RunStateResolver` | EFFECT → ORCHESTRATION | Loads persisted run state from Area 8's persistence layer, invokes `RunStateService.loadRun()` entry point | `/gameplay`, `/deck` |
| `RoundStateResolver` | TRANSFORM | Derives current round from `run-state` signal | `/score` |
| `ShopStateResolver` | TRANSFORM | Derives shop state from `shop-state` signal | `/shop` |

```typescript
// Example: RunStateResolver
@Injectable({ providedIn: 'root' })
export class RunStateResolver implements Resolve<void> {
  constructor(
    private runStateService: RunStateService,
    private persistence: PersistenceService,  // from Area 8
  ) {}

  resolve(): void {
    const persisted = this.persistence.load();
    if (persisted) {
      this.runStateService.loadRun(persisted);
    }
  }
}
```

---

## 7. Service Layer

Complete specification of all 10 Angular services.

| # | Service | Injection Scope | DSFR Role | Owned Signals | Dependencies |
|---|---------|----------------|-----------|---------------|-------------|
| 1 | `GameRulesService` | `providedIn: 'root'` | TRANSFORM | None (static methods only) | None (Area 1 types only) |
| 2 | `RunStateService` | `providedIn: 'root'` | STATE + ORCHESTRATION | `run-state`, `deck-state` | Area 8 `PersistenceService` |
| 3 | `RoundStateService` | `providedIn: 'root'` | STATE + ORCHESTRATION | `round-state`, `hand-cards`, `discard-top`, `draw-pile-count`, `score-target`, `phase-label`, `can-go-out` | `GameRulesService` (static) |
| 4 | `MeldStateService` | `providedIn: 'root'` | STATE + ORCHESTRATION | `meld-states` | `GameRulesService` (static), `ScoringService`, `ErrorRecoveryService` |
| 5 | `ModifierStateService` | `providedIn: 'root'` | STATE + ORCHESTRATION | `modifier-state`, `active-boss-rule`, `partner-slots`, `tray-slots` | Area 3 types only |
| 6 | `EnhancementStateService` | `providedIn: 'root'` | STATE + ORCHESTRATION | (enhances `deck-state` via `RunStateService.modifyDeck()`) | `RunStateService` |
| 7 | `ShopStateService` | `providedIn: 'root'` | STATE + ORCHESTRATION | `shop-state` | `RunStateService` (reads) |
| 8 | `ScoringService` | `providedIn: 'root'` | ORCHESTRATION + TRANSFORM | `current-score` | `GameRulesService` (static), `MeldStateService` (reads), `ModifierStateService` |
| 9 | `ErrorRecoveryService` | `providedIn: 'root'` | STATE + ORCHESTRATION + EFFECT | `error-log` | `RunStateService` (entry point), Area 8 `PersistenceService` |
| 10 | `SceneBridgeService` | `providedIn: 'root'` | EFFECT | None | `UiStateService`, `MeldStateService`, `RoundStateService`, `ShopStateService`, BabylonJS scene (Area 6) |
| 11 | `UiStateService` | `providedIn: GameplayModule` (feature-scoped) | STATE + ORCHESTRATION | `current-screen`, `selected-card-id`, `drag-state`, `card-visual-states`, `meld-visual-states`, `action-button-states`, `design-tokens` | `RoundStateService`, `MeldStateService`, `ModifierStateService`, Area 5 tokens |

### Service Dependency Graph

```
GameRulesService (TRANSFORM) ← no dependencies
  ↑ (static calls)
  ├── RoundStateService ──→ GameRulesService
  ├── MeldStateService ───→ GameRulesService
  │                          ├── ScoringService
  │                          └── ErrorRecoveryService
  └── ScoringService ──────→ GameRulesService
                             ├── MeldStateService (reads)
                             └── ModifierStateService

RunStateService ← no service deps (Area 8 PersistenceService for I/O)
  ↑ (reads)
  ├── EnhancementStateService ──→ RunStateService.modifyDeck()
  ├── ShopStateService ─────────→ RunStateService (reads)
  └── ErrorRecoveryService ─────→ RunStateService.loadRun()

SceneBridgeService (EFFECT) ← no signal deps, invokes entry points:
  ├── UiStateService.selectCard()
  ├── MeldStateService.placeMeld()
  ├── RoundStateService.drawCard()
  ├── RoundStateService.transitionPhase()
  └── ShopStateService.purchaseItem()

UiStateService (feature) reads from:
  ├── RoundStateService.roundState()
  ├── MeldStateService.meldStates()
  └── ModifierStateService.modifierState()
```

---

## 8. BabylonJS Integration Boundary Contract

The `BabylonJSBoundaryContract` is the typed contract governing all Angular ↔ BabylonJS communication. **Area 7 owns this contract.** Area 6 (BabylonJS Rendering) references it but must not redefine it.

### 8.1 Contract Definition

```typescript
// core/models/babylonjs-boundary-contract.ts

export interface BabylonJSBoundaryContract {
  inputSignals: Array<{
    signalName: string;
    sceneUpdateFn: string;
    description: string;
  }>;
  outputEvents: Array<{
    sceneEventName: string;
    entryPointService: string;
    entryPointMethod: string;
    description: string;
  }>;
}

export const BABYLONJS_BOUNDARY_CONTRACT: BabylonJSBoundaryContract = {
  inputSignals: [
    {
      signalName: 'card-visual-states',
      sceneUpdateFn: 'SceneBridgeService.syncCardMeshes',
      description: 'When card visual states change, update card mesh positions, materials, and glow effects in the BabylonJS scene.'
    },
    {
      signalName: 'meld-visual-states',
      sceneUpdateFn: 'SceneBridgeService.syncMeldZones',
      description: 'When meld visual states change, update meld zone highlights, canasta seal animations, and tray indicators.'
    },
    {
      signalName: 'action-button-states',
      sceneUpdateFn: 'SceneBridgeService.syncActionButtons',
      description: 'When action button states change, update button mesh materials (enabled/disabled/loading) in the scene.'
    },
    {
      signalName: 'current-screen',
      sceneUpdateFn: 'SceneBridgeService.transitionScene',
      description: 'When the active screen changes, trigger the corresponding BabylonJS scene transition (camera move, layout swap).'
    },
    {
      signalName: 'selected-card-id',
      sceneUpdateFn: 'SceneBridgeService.highlightCard',
      description: 'When a card is selected, apply the selection glow outline to its mesh in the scene.'
    },
    {
      signalName: 'drag-state',
      sceneUpdateFn: 'SceneBridgeService.updateDragGhost',
      description: 'When a drag is in progress, update the ghost card mesh position to follow the cursor.'
    },
  ],
  outputEvents: [
    {
      sceneEventName: 'onCardClicked',
      entryPointService: 'UiStateService',
      entryPointMethod: 'selectCard',
      description: 'BabylonJS card click event → UiStateService.selectCard() entry point → updates selected-card-id signal.'
    },
    {
      sceneEventName: 'onCardDroppedOnMeldZone',
      entryPointService: 'MeldStateService',
      entryPointMethod: 'placeMeld',
      description: 'BabylonJS drop event → MeldStateService.placeMeld() entry point → validates via GameRulesService.validateMeld() → updates meld-states signal.'
    },
    {
      sceneEventName: 'onDrawPileClicked',
      entryPointService: 'RoundStateService',
      entryPointMethod: 'drawCard',
      description: 'BabylonJS draw pile click → RoundStateService.drawCard() entry point → updates round-state signal.'
    },
    {
      sceneEventName: 'onActionButtonClicked',
      entryPointService: 'RoundStateService',
      entryPointMethod: 'transitionPhase',
      description: 'BabylonJS action button click → RoundStateService.transitionPhase() entry point → updates round-state.phase.'
    },
    {
      sceneEventName: 'onShopItemClicked',
      entryPointService: 'ShopStateService',
      entryPointMethod: 'purchaseItem',
      description: 'BabylonJS shop item click → ShopStateService.purchaseItem() entry point → updates shop-state signal.'
    },
  ],
};
```

### 8.2 Input Signals (Angular → BabylonJS)

| # | Signal | Scene Update Method | Effect Trigger |
|---|--------|---------------------|----------------|
| 1 | `card-visual-states` | `syncCardMeshes(states: CardVisualState[])` | Angular `effect()` watches `cardVisualStates` computed |
| 2 | `meld-visual-states` | `syncMeldZones(states: MeldVisualState[])` | Angular `effect()` watches `meldVisualStates` computed |
| 3 | `action-button-states` | `syncActionButtons(states: ActionButtonState[])` | Angular `effect()` watches `actionButtonStates` computed |
| 4 | `current-screen` | `transitionScene(screen: ScreenId)` | Angular `effect()` watches `currentScreen` signal |
| 5 | `selected-card-id` | `highlightCard(cardId: string \| null)` | Angular `effect()` watches `selectedCardId` signal |
| 6 | `drag-state` | `updateDragGhost(state: DragState \| null)` | Angular `effect()` watches `dragState` signal |

### 8.3 Output Events (BabylonJS → Angular)

| # | Scene Event | Entry Point | State Mutation |
|---|-------------|-------------|----------------|
| 1 | `onCardClicked(cardId)` | `UiStateService.selectCard(cardId)` | `selected-card-id` → `card-visual-states` (computed) |
| 2 | `onCardDroppedOnMeldZone(cardId, zoneId)` | `MeldStateService.placeMeld(cards, meld)` | `meld-states` → `meld-visual-states` (computed) |
| 3 | `onDrawPileClicked()` | `RoundStateService.drawCard()` | `round-state` → `hand-cards`, `draw-pile-count` (computed) |
| 4 | `onActionButtonClicked(action)` | `RoundStateService.transitionPhase(phase)` | `round-state` → `phase-label`, `action-button-states` (computed) |
| 5 | `onShopItemClicked(itemId)` | `ShopStateService.purchaseItem(itemId)` | `shop-state` |

### 8.4 Effect Routing Pattern

The BabylonJS boundary follows a strict DSFR effect routing pattern:

```
┌─────────────────────────────────────────────────────────────────┐
│ BabylonJS scene event                                           │
│   → SceneBridgeService event handler (EFFECT)                   │
│     → Domain entry point (ORCHESTRATION)                        │
│       → Signal .set() / .update() (STATE mutation)              │
│         → computed() signals recalculate (derived STATE)        │
│           → Angular effect pushes to BabylonJS (EFFECT)         │
│             → Scene updates                                     │
└─────────────────────────────────────────────────────────────────┘
```

**Key invariants:**
1. BabylonJS **never** reads Angular signals directly.
2. All scene updates happen through **explicit imperative calls** from Angular effects.
3. All scene events re-enter Angular through **entry points** — never through direct signal mutation.
4. `SceneBridgeService` owns setup and teardown of BabylonJS event subscriptions (in constructor/`ngOnDestroy`).
5. Feature components never directly subscribe to BabylonJS events.

### 8.5 Scene Preservation Across Routes

The BabylonJS scene is **preserved** across route changes (not destroyed/recreated). The camera and layout transition between pre-built sub-scenes (gameplay layout, shop layout, etc.). This avoids visible loading delays and is consistent with Area 5's screen transition design.

---

## 9. DSFR Invariant Enforcement

The architecture enforces DSFR invariants at multiple levels: TypeScript access modifiers, Angular injection scope, static analysis patterns, and code review rules.

### 9.1 No Cross-Domain Mutation (Tier 1)

**Rule**: Only the owning service may call `.set()` or `.update()` on its signals.

**Enforcement**:
- All source signals are `private readonly` — only the owning service class can access the `WritableSignal` handle.
- Computed signals are `public readonly` — components and other services can read but not write.
- Cross-domain state changes happen through entry points (public methods), never through direct signal access.

```typescript
// CORRECT: MeldStateService owns meld-states
@Injectable({ providedIn: 'root' })
export class MeldStateService {
  private readonly meldStates = signal<MeldState[]>([]);  // private!

  placeMeld(cards: Card[], meld: Meld): void {
    this.meldStates.update(/* ... */);  // OK — owning service
  }
}

// CORRECT: Other services read via computed or public getter
@Injectable({ providedIn: 'root' })
export class ScoringService {
  constructor(private meldStateService: MeldStateService) {}

  scoreCanasta(meldState: MeldState): number {
    // Reads meldState parameter, doesn't call .set() on meld-states
  }
}

// WRONG: Cross-domain mutation
// SomeOtherService {
//   constructor(private meldStateService: MeldStateService) {}
//   badMethod() {
//     this.meldStateService.meldStates.set(/* ... */);  // ERROR: private
//   }
// }
```

### 9.2 No Writable State Leaked (Tier 1)

**Rule**: Writable signal handles are never exposed outside the owning service.

**Enforcement**:
- Signals are declared `private readonly` — the `WritableSignal<T>` handle is never returned from any public method.
- Public exposure is through `computed()` signals (read-only) or getter methods that return the value, not the signal.

```typescript
// CORRECT: Expose computed (read-only) signal
@Injectable({ providedIn: 'root' })
export class RoundStateService {
  private readonly roundState = signal<RoundState>(initial);  // private
  readonly handCards = computed(() => this.roundState().hand);  // public, read-only
}

// WRONG: Exposing writable signal
// getRoundState(): WritableSignal<RoundState> {
//   return this.roundState;  // NEVER do this
// }
```

### 9.3 Effects Invoke Entry Points Only (Tier 2)

**Rule**: Effects (SceneBridgeService, persistence, error recovery) invoke domain entry points — they never call `.set()` directly on another service's signals.

**Enforcement**:
- `SceneBridgeService` event handlers call `uiStateService.selectCard()`, `meldStateService.placeMeld()`, etc.
- `ErrorRecoveryService.rollbackToLastValid()` calls `runStateService.loadRun()` — never `.set()` on `run-state`.
- `autoSave()` delegates to Area 8's `PersistenceService` — it doesn't serialize signals directly.

```typescript
// CORRECT: SceneBridgeService invokes entry points
private onCardClicked = (cardId: string): void => {
  this.uiStateService.selectCard(cardId);  // ORCHESTRATION entry point
};

// WRONG: Effect directly mutating state
// private onCardClicked = (cardId: string): void => {
//   this.uiStateService.selectedCardId.set(cardId);  // ERROR: private + cross-domain
// };
```

### 9.4 Pure Transforms Are Static (Tier 2)

**Rule**: Pure transforms never access `this`, signals, or injected collaborators. They are `static` methods.

**Enforcement**:
- `GameRulesService` methods are all `static` — the class is never instantiated, never injected.
- Transform methods take all inputs as parameters and return a result. No side effects.
- No `this.` access, no signal reads, no service injection in transform methods.

```typescript
// CORRECT: Pure static transform
@Injectable({ providedIn: 'root' })
export class GameRulesService {
  static validateMeld(meld: Meld, cards: Card[]): MeldValidationResult {
    // Pure function: input → output, no side effects, no `this`
    return { valid: cards.length >= 7, reason: null };
  }
}

// WRONG: Transform accessing instance state
// validateMeld(meld: Meld, cards: Card[]): MeldValidationResult {
//   const state = this.someSignal();  // ERROR: accessing instance state in transform
//   ...
// }
```

### 9.5 Summary of Invariant Enforcement

| Invariant | Enforcement Mechanism | What Prevents Violation |
|-----------|----------------------|------------------------|
| No cross-domain mutation | `private readonly` signals | TypeScript access control |
| No writable state leaked | No public signal handles | TypeScript `readonly` + API design |
| Effects invoke entry points | Code review + `private` signals | Signals are inaccessible from outside |
| Pure transforms are static | `static` keyword + no `this` | TypeScript compiler + code review |
| BabylonJS never reads signals | Explicit imperative push only | Architecture design — no signal refs passed to scene |
| Subscription lifecycle owned by service | Setup/teardown in service | DSFR ownership rule — components don't subscribe |

---

## 10. Unit Test Plan

### 10.1 Test File Structure

```
src/app/
├── core/
│   ├── services/
│   │   ├── game-rules.service.spec.ts
│   │   ├── run-state.service.spec.ts
│   │   ├── round-state.service.spec.ts
│   │   ├── meld-state.service.spec.ts
│   │   ├── modifier-state.service.spec.ts
│   │   ├── enhancement-state.service.spec.ts
│   │   ├── shop-state.service.spec.ts
│   │   ├── scoring.service.spec.ts
│   │   ├── error-recovery.service.spec.ts
│   │   └── scene-bridge.service.spec.ts
│   ├── guards/
│   │   ├── run-active.guard.spec.ts
│   │   ├── shop-phase.guard.spec.ts
│   │   └── score-phase.guard.spec.ts
│   └── resolvers/
│       ├── run-state.resolver.spec.ts
│       ├── round-state.resolver.spec.ts
│       └── shop-state.resolver.spec.ts
├── features/
│   └── gameplay/
│       ├── services/
│       │   └── ui-state.service.spec.ts
│       └── components/
│           ├── hud/hud.component.spec.ts
│           ├── hand/hand.component.spec.ts
│           ├── table/table.component.spec.ts
│           ├── discard-pile/discard-pile.component.spec.ts
│           ├── draw-pile/draw-pile.component.spec.ts
│           ├── action-bar/action-bar.component.spec.ts
│           └── modifier-bar/modifier-bar.component.spec.ts
└── shared/
    ├── pipes/
    │   ├── score-format.pipe.spec.ts
    │   ├── phase-label.pipe.spec.ts
    │   └── enhancement-icon.pipe.spec.ts
    └── directives/
        ├── drag-and-drop.directive.spec.ts
        └── keyboard-navigation.directive.spec.ts
```

### 10.2 Service Test Specifications

#### GameRulesService Tests
- `validateMeld()` — valid meld returns `{ valid: true }`, invalid meld returns `{ valid: false, reason }`
- `scoreCanasta()` — natural canasta returns 500, mixed canasta returns 300
- `canGoOut()` — returns `true` when score threshold met + canasta exists, `false` otherwise
- `determineCanastaType()` — all natural cards → `'natural'`, includes wild → `'mixed'`
- All methods are `static` — no instance creation required

#### RunStateService Tests
- `startRun()` — initializes `run-state` with correct ante and deck reference
- `loadRun()` — restores `run-state` from persisted data
- `advanceRound()` — increments ante, updates round index
- `modifyDeck()` — applies updater function to `deck-state`
- `run-state` and `deck-state` are private — tests verify via public computed signals

#### RoundStateService Tests
- `beginTurn()` — sets phase to `'Draw'`
- `drawCard()` — moves card from draw pile to hand
- `discardCard()` — moves card from hand to discard pile
- `transitionPhase()` — updates phase correctly
- `handCards` computed — reflects current hand
- `phaseLabel` computed — maps TurnPhase to display string
- `canGoOut` computed — delegates to `GameRulesService.canGoOut()`

#### MeldStateService Tests
- `placeMeld()` — validates via `GameRulesService.validateMeld()` before adding
- `placeMeld()` — rejects invalid meld (validation fails)
- `extendMeld()` — adds cards to existing meld
- `sealCanasta()` — marks meld as sealed, triggers scoring
- `meldStates` is private — tests verify via public computed

#### ScoringService Tests
- `scoreCanasta()` — calls `GameRulesService.scoreCanasta()` then modifier pipeline
- `currentScore` computed — sums all sealed canasta scores
- Score calculation with modifiers applied correctly

#### ErrorRecoveryService Tests
- `detectInvalidState()` — returns `true` for invalid state, `false` for valid
- `rollbackToLastValid()` — calls `RunStateService.loadRun()` (entry point), never `.set()` directly
- `autoSave()` — delegates to Area 8 `PersistenceService`
- `error-log` is private — tests verify via public computed

#### SceneBridgeService Tests
- `syncCardMeshes()` — calls BabylonJS scene update method with correct arguments
- `onCardClicked` handler — invokes `UiStateService.selectCard()` entry point
- `onCardDroppedOnMeldZone` handler — invokes `MeldStateService.placeMeld()` entry point
- BabylonJS event subscriptions set up on init, torn down on destroy
- BabylonJS mock used — no real scene in tests

#### UiStateService Tests
- `selectCard()` — updates `selected-card-id` signal
- `setDragState()` — updates `drag-state` signal
- `transitionScreen()` — updates `current-screen` signal
- `cardVisualStates` computed — derives from hand cards + enhancement state + selection
- `actionButtonStates` computed — derives from round phase
- `designTokens` computed — returns static Area 5 token table

### 10.3 Signal Derivation Tests

Test that computed signals recalculate correctly when source signals change:

| Test | Source Signal Change | Expected Computed Update |
|------|---------------------|-------------------------|
| `handCards` | `round-state.hand` updated | `handCards` reflects new hand |
| `cardVisualStates` | `selected-card-id` set | Selected card gets `CardInteractionState.Selected` |
| `meldVisualStates` | `meld-states` updated | Visual states reflect new meld layout |
| `actionButtonStates` | `round-state.phase` changed | Buttons enabled/disabled for new phase |
| `currentScore` | `meld-states` sealed canasta added | Score increases by canasta value |
| `phaseLabel` | `round-state.phase` = `'Draw'` | Returns `'Draw Phase'` |
| `canGoOut` | Score threshold met | Returns `true` |

### 10.4 Routing Tests

| Test | Description |
|------|-------------|
| `RunActiveGuard` — run active | Returns `true` when `runOver === false` |
| `RunActiveGuard` — run over | Returns `UrlTree` to `/` when `runOver === true` |
| `ShopPhaseGuard` — shop phase | Returns `true` when `phase === 'Shop'` |
| `ShopPhaseGuard` — wrong phase | Returns `false` when phase is not `'Shop'` |
| `ScorePhaseGuard` — score phase | Returns `true` when `phase === 'Score'` |
| `ScorePhaseGuard` — wrong phase | Returns `false` when phase is not `'Score'` |
| `RunStateResolver` — has persisted data | Calls `loadRun()` with persisted state |
| `RunStateResolver` — no persisted data | Does not call `loadRun()` |
| Lazy loading — `/gameplay` | Loads `GameplayModule` |
| Lazy loading — `/deck` | Loads `DeckInventoryModule` |
| 404 fallback | Unknown routes render `NotFoundComponent` |

### 10.5 BabylonJS Boundary Tests

| Test | Description |
|------|-------------|
| Input: `card-visual-states` change | `syncCardMeshes` called with new states |
| Input: `meld-visual-states` change | `syncMeldZones` called with new states |
| Input: `selected-card-id` change | `highlightCard` called with card ID |
| Input: `drag-state` change | `updateDragGhost` called with drag state |
| Input: `current-screen` change | `transitionScene` called with screen ID |
| Output: `onCardClicked` | `UiStateService.selectCard` invoked |
| Output: `onCardDroppedOnMeldZone` | `MeldStateService.placeMeld` invoked |
| Output: `onDrawPileClicked` | `RoundStateService.drawCard` invoked |
| Output: `onActionButtonClicked` | `RoundStateService.transitionPhase` invoked |
| Output: `onShopItemClicked` | `ShopStateService.purchaseItem` invoked |
| Scene preservation | Scene not destroyed on route change |
| Subscription teardown | All BabylonJS listeners removed on service destroy |

---

## 11. Dependencies

### 11.1 Area 5 — UI/UX Design Tokens & Accessibility

Area 7 consumes from Area 5:

| Contract | Area 5 Provides | Area 7 Consumes |
|----------|----------------|-----------------|
| Design tokens | `DesignToken[]` table (Neon Space Canasta palette) | `UiStateService.designTokens` computed signal → CSS custom properties |
| Accessibility | ARIA role assignments, keyboard navigation maps | Angular `@HostListener` directives, attribute binding |
| Screen layouts | `ScreenId`, `ScreenLayout` types | `UiStateService.currentScreen`, `SceneBridgeService.transitionScene` |
| Color contrast | Contrast ratio requirements | Verified at build time via custom stylelint plugin |

**Integration point**: Area 5's design token table is imported as a static constant and exposed via `UiStateService.designTokens`. Angular components bind to CSS custom properties injected by `DesignTokenProviderComponent`.

### 11.2 Area 8 — State Schemas & Persistence

Area 7 consumes from Area 8:

| Contract | Area 8 Provides | Area 7 Consumes |
|----------|----------------|-----------------|
| State schemas | `RunState`, `RoundState`, `DeckState`, `MeldState`, `StateErrorEntry` types | All signal types in Area 7's signal inventory |
| Persistence | `PersistenceService` with `load()` / `save()` methods | `RunStateService.loadRun()`, `ErrorRecoveryService.autoSave()` |
| Initial state | Factory functions for initial state | Signal initialization in constructors |

**Integration point**: Area 7's signals **are** the Area 8 schemas — no transformation at rest. `runStateService.runState()` returns `RunState` (from Area 8). Area 7 does not own persistence — it delegates to Area 8's `PersistenceService`.

### 11.3 Other Upstream Dependencies

| Area | What Area 7 Imports | Used By |
|------|---------------------|---------|
| Area 1 (Game Rules) | `Card`, `Meld`, `CanastaType`, `TurnPhase`, `MeldValidationResult`, `CanastaScoreResult` | `GameRulesService`, `RoundStateService`, `MeldStateService` |
| Area 2 (Deckbuilding) | `RoundPhase`, `ShopState`, `ShopItem`, `Ante`, `Round`, `RunProgression`, `CardPoolEntry` | `ShopStateService`, `RunStateService` |
| Area 3 (Modifiers) | `ActiveModifierState`, `AppliedModifierRecord`, `PartnerSlot`, `HouseRule`, `Scorepad`, `TraySlot`, `BossRule` | `ModifierStateService`, `ScoringService` |
| Area 4 (Enhancements) | `Enhancement`, `EnhancementType`, `WildCardEconomyState` | `EnhancementStateService` |

---

## 12. Implementation Order

Implement in the following order to respect dependencies and enable incremental testing:

### Phase 1: Foundation
1. **Create `core/models/`** — Define all TypeScript interfaces: `SignalInventoryEntry`, `ServiceDefinition`, `RouteDefinition`, `BabylonJSBoundaryContract`, `DsfrRole` type. Define the `BABYLONJS_BOUNDARY_CONTRACT` constant.
2. **Create `core/services/game-rules.service.ts`** — Pure static transforms. No dependencies. Unit test first.
3. **Create `core/services/run-state.service.ts`** — `run-state` and `deck-state` signals with entry points. Depends on Area 8 types only.
4. **Create `core/services/round-state.service.ts`** — `round-state` signal + computed signals (`hand-cards`, `phase-label`, `can-go-out`). Depends on `GameRulesService` (static calls).

### Phase 2: Domain Services
5. **Create `core/services/meld-state.service.ts`** — `meld-states` signal with `placeMeld`, `extendMeld`, `sealCanasta` entry points. Depends on `GameRulesService`.
6. **Create `core/services/modifier-state.service.ts`** — `modifier-state` signal + computed signals. Depends on Area 3 types.
7. **Create `core/services/enhancement-state.service.ts`** — Delegates to `RunStateService.modifyDeck()`. Depends on `RunStateService`.
8. **Create `core/services/shop-state.service.ts`** — `shop-state` signal with entry points. Depends on `RunStateService` (reads).
9. **Create `core/services/scoring.service.ts`** — `current-score` computed + `scoreRound`/`scoreCanasta` orchestration. Depends on `GameRulesService`, `MeldStateService`, `ModifierStateService`.
10. **Create `core/services/error-recovery.service.ts`** — `error-log` signal + rollback/auto-save. Depends on `RunStateService` (entry point), Area 8 `PersistenceService`.

### Phase 3: BabylonJS Boundary
11. **Create `core/services/scene-bridge.service.ts`** — BabylonJS boundary implementation. All 6 input signal effects + 5 output event handlers. Depends on `UiStateService`, `MeldStateService`, `RoundStateService`, `ShopStateService`.
12. **Create `core/models/babylonjs-boundary-contract.ts`** — If not already created in step 1, define the contract constant with all input/output mappings.

### Phase 4: Routing & Guards
13. **Create `core/guards/`** — `RunActiveGuard`, `ShopPhaseGuard`, `ScorePhaseGuard`. Pure transform guards.
14. **Create `core/resolvers/`** — `RunStateResolver`, `RoundStateResolver`, `ShopStateResolver`.
15. **Create `app-routing.module.ts`** — All 6 routes with `loadChildren` lazy-loading, guards, and resolvers.

### Phase 5: Shared Module
16. **Create `shared/pipes/`** — `score-format.pipe.ts`, `phase-label.pipe.ts`, `enhancement-icon.pipe.ts`.
17. **Create `shared/directives/`** — `drag-and-drop.directive.ts`, `keyboard-navigation.directive.ts`.
18. **Create `shared/components/`** — `card-visual`, `meld-zone`, `action-button`, `design-token-provider`.
19. **Create `shared/shared.module.ts`** — Declares and exports all shared components/directives/pipes.

### Phase 6: Feature Modules
20. **Create `features/gameplay/`** — `GameplayModule`, `UiStateService` (feature-scoped), `GameplayComponent`, and all child components (`hud`, `hand`, `table`, `discard-pile`, `draw-pile`, `action-bar`, `modifier-bar`).
21. **Create `features/deck-inventory/`** — `DeckInventoryModule`, `DeckInventoryComponent`, and child components (`card-list`, `rank-density-chart`, `wild-card-summary`).
22. **Create `features/shop/`** — `ShopModule`, `ShopComponent`, and child components (`shop-slots`, `card-acquisition`, `gold-display`).
23. **Create `features/score-results/`** — `ScoreResultsModule`, `ScoreResultsComponent`, and child components (`score-breakdown`, `round-summary`, `run-summary`).

### Phase 7: Root & Integration
24. **Create `app.module.ts`** — Root module importing `CoreModule`, `SharedModule`, `AppRoutingModule`.
25. **Create `app.component.ts`** — Root layout with `DesignTokenProviderComponent` and `<router-outlet>`.
26. **Create `HomeComponent`** — Landing screen with new run / continue options.
27. **Create `NotFoundComponent`** — 404 fallback.

### Phase 8: Testing & Validation
28. **Write all service unit tests** — One `.spec.ts` per service, covering all entry points, computed signals, and DSFR invariants.
29. **Write all guard/resolver tests** — Verify route protection and data resolution.
30. **Write BabylonJS boundary tests** — Verify all 6 input effects and 5 output event handlers with mocked BabylonJS scene.
31. **Write component tests** — Verify components read correct signals and render correctly.
32. **Integration test** — Full workflow: card click → drag → meld → canasta seal → score update → persistence (mirrors Section 4 worked example).

---

## 13. Acceptance Criteria

### Architecture
- [ ] All 10 services created with correct DSFR role classification
- [ ] All 24 signals implemented (8 writable, 16 computed) with correct types
- [ ] All signals are `private readonly` — no writable signal handle leaks outside owning service
- [ ] All computed signals use Angular `computed()` — no manual derivation
- [ ] All pure transforms are `static` methods — no `this` access, no signal reads, no injection

### DSFR Invariant Enforcement
- [ ] No cross-domain mutation: only owning service calls `.set()` / `.update()` on its signals
- [ ] No writable state leaked: no public `WritableSignal` handles
- [ ] Effects invoke entry points only: `SceneBridgeService` and `ErrorRecoveryService` never call `.set()` on other services' signals
- [ ] Pure transforms are static: `GameRulesService` methods are all `static`
- [ ] BabylonJS never reads Angular signals directly — all updates via explicit imperative calls

### BabylonJS Boundary
- [ ] `BabylonJSBoundaryContract` defined with all 6 input signals and 5 output events
- [ ] All 6 input signal effects implemented in `SceneBridgeService`
- [ ] All 5 output event handlers route to correct domain entry points
- [ ] BabylonJS event subscriptions set up on service init and torn down on destroy
- [ ] Scene preserved across route changes (not destroyed/recreated)

### Routing
- [ ] All 6 routes defined with correct paths and components
- [ ] Lazy-loading configured for all 4 feature modules via `loadChildren`
- [ ] `RunActiveGuard` applied to `/gameplay`, `/deck`, `/shop`, `/score`
- [ ] `ShopPhaseGuard` applied to `/shop`
- [ ] `ScorePhaseGuard` applied to `/score`
- [ ] `RunStateResolver` applied to `/gameplay`, `/deck`
- [ ] `ShopStateResolver` applied to `/shop`
- [ ] `RoundStateResolver` applied to `/score`
- [ ] 404 fallback route (`**`) renders `NotFoundComponent`

### Component Tree
- [ ] All feature modules created with correct component declarations
- [ ] `UiStateService` is feature-scoped (provided in `GameplayModule`, not root)
- [ ] All child components created under `features/gameplay/components/`
- [ ] Shared components/directives/pipes created and exported via `SharedModule`
- [ ] Components read signals directly in templates — no manual subscription management

### Testing
- [ ] All 10 services have unit tests covering entry points and computed signals
- [ ] All 3 route guards have tests for allow/deny cases
- [ ] All 3 route resolvers have tests for data resolution
- [ ] BabylonJS boundary contract tests verify all 6 inputs and 5 outputs
- [ ] Signal derivation tests verify computed signals recalculate on source changes
- [ ] Integration test traces full workflow: card click → drag → meld → canasta → score → persistence

### Dependencies
- [ ] Area 5 design tokens consumed via `UiStateService.designTokens` and CSS custom properties
- [ ] Area 5 accessibility requirements implemented via Angular directives
- [ ] Area 8 state schemas used as signal types (no transformation at rest)
- [ ] Area 8 `PersistenceService` delegated to for save/load (not reimplemented)
- [ ] Area 1 game rule types imported and used by `GameRulesService`
- [ ] Area 2, 3, 4 types imported and used by respective domain services

### Code Quality
- [ ] No `any` types — all types are explicit or imported from upstream areas
- [ ] No optional `?` fields without justification — prefer explicit `| null`
- [ ] All public methods have JSDoc comments describing DSFR role
- [ ] All signals have JSDoc comments describing derivation (for computed) or purpose (for writable)
- [ ] Consistent naming: signals use kebab-case in inventory, camelCase in code; services use `*.service.ts`; components use `*.component.ts`
