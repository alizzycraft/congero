# Design Document — Area 7: Angular App Architecture

## Overview

Area 7 defines the Angular application architecture for Congero using the Domain-Scoped Functional Reactivity (DSFR) pattern. It specifies the component tree with lazy-loading boundaries, the signal inventory that derives reactive state from Area 8's authoritative state schema, the service layer organized as domain containers with explicit ownership, the route definitions with guards and resolvers, and the typed BabylonJS integration boundary contract. Area 7 is the owner document for the Angular/BabylonJS integration boundary — Area 6 (BabylonJS Rendering) references this contract but must not redefine it. DSFR roles are applied throughout: **State** lives in domain-owned Angular signals, **Transforms** are pure functions isolated from instance state, **Orchestration** occurs through domain entry points that are the only code allowed to call `.set()`, and **Effects** isolate all external IO (BabylonJS scene, DOM, localStorage) and may only invoke entry points to cause state changes.

**Out of scope for this document:** BabylonJS scene internals including mesh definitions, material creation, camera setup, and render loop management (Area 6); game rule logic including meld validation and scoring formulas (Area 1); UI visual design including design tokens, color palettes, and layout wireframes (Area 5); state persistence, serialization, and migration (Area 8); modifier stacking order (Area 3); card enhancement definitions (Area 4); deckbuilding mechanics (Area 2).

---

## 1. Data Models

All types are TypeScript. No `any`, no partial types. All fields are required; prefer explicit `| null` over optional `?`.

```typescript
// ─── Imports from upstream areas ─────────────────────────────────────────────

import type {
  Card, Meld, CanastaType, TurnPhase, MeldValidationResult,
  CanastaScoreResult, BossRuleHookSet,
} from './area1-game-rules';
import type {
  RoundPhase, ShopState, ShopItem, Ante, Round,
  RunProgression, CardPoolEntry,
} from './area2-deckbuilding';
import type {
  ActiveModifierState, AppliedModifierRecord, PartnerSlot,
  HouseRule, Scorepad, TraySlot, BossRule,
} from './area3-modifier-systems';
import type {
  Enhancement, EnhancementType, WildCardEconomyState,
} from './area4-card-enhancements';
import type {
  ScreenId, ScreenLayout, CardVisualState, MeldVisualState,
  ActionButtonState, DesignToken,
} from './area5-ui-ux';
import type {
  RunState, RoundState, DeckState, DeckCardState,
  MeldState, StateErrorEntry, ErrorCategory, RecoveryStrategy,
} from './area8-state-management';

// ─── DSFR Role Tags ──────────────────────────────────────────────────────────

/**
 * DSFR role classification for all logic in the Angular application.
 * Every function, method, and signal must map to exactly one role.
 *
 * STATE:    Domain-owned reactive state positions (Angular signals).
 * TRANSFORM: Pure deterministic functions (no instance state, no signals, no IO).
 * ORCHESTRATION: Entry points coordinating legal state transitions.
 * EFFECT:   External IO boundaries (BabylonJS, DOM, localStorage, timers).
 */
export type DsfrRole = 'STATE' | 'TRANSFORM' | 'ORCHESTRATION' | 'EFFECT';

// ─── Signal Inventory Entry ──────────────────────────────────────────────────

/**
 * Describes a single signal or computed signal in the Angular signal inventory.
 * Every signal in the application is catalogued here.
 *
 * DSFR mapping:
 *   - Writable signals = STATE (source state)
 *   - Computed signals = STATE (derived state)
 *   - The owning service's entry points = ORCHESTRATION (only code that calls .set())
 */
export interface SignalInventoryEntry {
  signalName: string;
  valueType: string;
  owningService: string;
  isComputed: boolean;
  dependencies: string[] | null;
  description: string;
}

// ─── Service Definition ──────────────────────────────────────────────────────

/**
 * Describes a single Angular service acting as a DSFR domain container.
 * Each service owns a set of signals and exposes entry points that are the
 * only code allowed to mutate those signals.
 *
 * DSFR mapping:
 *   - Service class = domain boundary
 *   - signal() fields = STATE
 *   - computed() fields = STATE (derived)
 *   - public methods = ORCHESTRATION (entry points)
 *   - private pure static methods = TRANSFORM
 *   - methods touching BabylonJS/DOM/storage = EFFECT
 */
export interface ServiceDefinition {
  serviceName: string;
  injectionScope: 'root' | 'feature';
  featureModule: string | null;
  ownedSignals: string[];
  dependencies: string[];
  description: string;
}

// ─── Route Definition ────────────────────────────────────────────────────────

export interface RouteDefinition {
  path: string;
  component: string;
  lazyLoadedModule: string | null;
  guards: string[];
  resolvers: string[];
  description: string;
}

// ─── BabylonJS Boundary Contract ─────────────────────────────────────────────

/**
 * The typed contract governing Angular ↔ BabylonJS communication.
 * Area 7 owns this contract. Area 6 references it but must not redefine it.
 *
 * DSFR mapping:
 *   - Angular signal → scene update = EFFECT (Angular side writes to BabylonJS)
 *   - Scene event → Angular signal = EFFECT → ORCHESTRATION (BabylonJS event
 *     enters Angular through an entry point that calls .set())
 *
 * Key invariant: BabylonJS never reads Angular signals directly.
 * Angular effects push state into BabylonJS via explicit imperative calls.
 * BabylonJS events re-enter Angular through registered callbacks that
 * invoke domain entry points.
 */
export interface BabylonJSBoundaryContract {
  /**
   * Input side: Angular signals that drive BabylonJS scene updates.
   * Each entry describes a signal and the scene update it triggers.
   * Implemented as Angular effects (DSFR EFFECT role).
   */
  inputSignals: Array<{
    signalName: string;
    sceneUpdateFn: string;
    description: string;
  }>;
  /**
   * Output side: BabylonJS scene events that update Angular signals.
   * Each entry describes a scene event and the entry point it invokes.
   * Implemented as scene event handlers that call domain entry points
   * (DSFR EFFECT → ORCHESTRATION).
   */
  outputEvents: Array<{
    sceneEventName: string;
    entryPointService: string;
    entryPointMethod: string;
    description: string;
  }>;
}
```

---

## 2. Core Algorithms

### 2.1 DSFR Domain Decomposition

The Angular application is decomposed into DSFR domains. Each domain is an Angular service class that owns its state, exposes entry points for state transitions, contains pure transforms, and isolates effects.

**Domain inventory:**

| Domain | Service | DSFR Role | Owned State Summary |
|--------|---------|-----------|-------------------|
| Game Rules | `GameRulesService` | TRANSFORM + ORCHESTRATION | Pure transforms for `validateMeld`, `scoreCanasta`, `canGoOut`, `determineCanastaType`. No mutable state — these are pure functions owned by Area 1. |
| Run & Deck | `RunStateService` | STATE + ORCHESTRATION | `RunState` signal, `DeckState` signal. Entry points: `startRun`, `advanceRound`, `modifyDeck`. |
| Round & Turn | `RoundStateService` | STATE + ORCHESTRATION | `RoundState` signal. Entry points: `beginTurn`, `endTurn`, `transitionPhase`, `dealHand`. |
| Meld | `MeldStateService` | STATE + ORCHESTRATION | `MeldState[]` signal. Entry points: `placeMeld`, `extendMeld`, `sealCanasta`, `discardCard`. |
| Modifiers | `ModifierStateService` | STATE + ORCHESTRATION | `ActiveModifierState` signal. Entry points: `draftPartner`, `activateHouseRule`, `assignTray`, `applyBossRule`. |
| Enhancements | `EnhancementStateService` | STATE + ORCHESTRATION | Per-card enhancement state within `DeckState`. Entry points: `applySeal`, `removeEnhancement`. |
| Shop | `ShopStateService` | STATE + ORCHESTRATION | `ShopState` signal. Entry points: `generateShop`, `purchaseItem`, `rerollShop`. |
| Scoring | `ScoringService` | ORCHESTRATION + TRANSFORM | Orchestrates the scoring pipeline: calls Area 1 pure transforms → Area 3 modifier pipeline → updates `MeldState.score`. |
| Error & Recovery | `ErrorRecoveryService` | STATE + ORCHESTRATION + EFFECT | `StateErrorEntry[]` signal. Entry points: `detectInvalidState`, `rollbackToLastValid`, `resetToRoundStart`. |
| Scene Bridge | `SceneBridgeService` | EFFECT | Pushes state to BabylonJS scene. Listens to scene events and routes to entry points. |
| UI State | `UiStateService` | STATE + ORCHESTRATION | `ScreenId`, `CardVisualState[]`, `MeldVisualState[]`, `ActionButtonState[]` signals. Entry points: `selectCard`, `setDragState`, `transitionScreen`. |

**DSFR invariant enforcement:**

- Only the owning service may call `.set()` or `.update()` on its signals.
- Cross-domain reads use `computed()` selectors — never raw writable signal handles.
- Effects (SceneBridgeService, persistence) invoke entry points — they never call `.set()` directly.
- Pure transforms are `static` methods on the domain service or standalone exported functions. They never access `this`, signals, or injected collaborators.

### 2.2 Component Tree and Signal Inventory

**Module and component tree:**

```
app-root
├── app.component.ts (root layout, design token provider)
├── core/ (singleton services, guards, resolvers)
│   ├── services/
│   │   ├── game-rules.service.ts (TRANSFORM domain)
│   │   ├── run-state.service.ts (STATE + ORCHESTRATION)
│   │   ├── round-state.service.ts (STATE + ORCHESTRATION)
│   │   ├── meld-state.service.ts (STATE + ORCHESTRATION)
│   │   ├── modifier-state.service.ts (STATE + ORCHESTRATION)
│   │   ├── enhancement-state.service.ts (STATE + ORCHESTRATION)
│   │   ├── shop-state.service.ts (STATE + ORCHESTRATION)
│   │   ├── scoring.service.ts (ORCHESTRATION)
│   │   ├── error-recovery.service.ts (STATE + ORCHESTRATION + EFFECT)
│   │   └── scene-bridge.service.ts (EFFECT)
│   ├── guards/
│   │   ├── round-active.guard.ts
│   │   └── run-active.guard.ts
│   └── resolvers/
│       ├── run-state.resolver.ts
│       └── round-state.resolver.ts
├── features/
│   ├── gameplay/ (lazy-loaded: 'features/gameplay')
│   │   ├── gameplay.module.ts
│   │   ├── gameplay.component.ts
│   │   ├── components/
│   │   │   ├── hud/ (score, turn indicator, phase indicator)
│   │   │   ├── hand/ (card list, drag source)
│   │   │   ├── table/ (meld zones, tray slots)
│   │   │   ├── discard-pile/ (top card, freeze indicator)
│   │   │   ├── draw-pile/ (card count, draw action)
│   │   │   ├── action-bar/ (draw, meld, discard, go-out buttons)
│   │   │   └── modifier-bar/ (partner slots, active modifiers)
│   │   └── services/
│   │       └── ui-state.service.ts (STATE + ORCHESTRATION, feature-scoped)
│   ├── deck-inventory/ (lazy-loaded: 'features/deck-inventory')
│   │   ├── deck-inventory.module.ts
│   │   ├── deck-inventory.component.ts
│   │   └── components/
│   │       ├── card-list/ (full deck view, enhancement badges)
│   │       ├── rank-density-chart/
│   │       └── wild-card-summary/
│   ├── shop/ (lazy-loaded: 'features/shop')
│   │   ├── shop.module.ts
│   │   ├── shop.component.ts
│   │   └── components/
│   │       ├── shop-slots/ (item cards, purchase buttons)
│   │       ├── card-acquisition/ (add/remove/convert)
│   │       └── gold-display/
│   └── score-results/ (lazy-loaded: 'features/score-results')
│       ├── score-results.module.ts
│       ├── score-results.component.ts
│       └── components/
│           ├── score-breakdown/ (per-canasta scores, modifier log)
│           ├── round-summary/ (total score, target, advance/fail)
│           └── run-summary/ (ante progression, deck stats)
└── shared/
    ├── components/ (card-visual, meld-zone, action-button, design-token-provider)
    ├── directives/ (drag-and-drop, keyboard-navigation)
    └── pipes/ (score-format, phase-label, enhancement-icon)
```

**Signal inventory (complete):**

| # | Signal Name | Type | Computed | Owning Service | DSFR Role | Description |
|---|------------|------|----------|----------------|-----------|-------------|
| 1 | `run-state` | `RunState` | No | `RunStateService` | STATE | Full run state wrapper |
| 2 | `round-state` | `RoundState` | No | `RoundStateService` | STATE | Current round/turn/phase |
| 3 | `deck-state` | `DeckState` | No | `RunStateService` | STATE | Full deck with enhancements |
| 4 | `meld-states` | `MeldState[]` | No | `MeldStateService` | STATE | All active melds on table |
| 5 | `modifier-state` | `ActiveModifierState` | No | `ModifierStateService` | STATE | Active partners, scorepads, trays, boss rule |
| 6 | `shop-state` | `ShopState \| null` | No | `ShopStateService` | STATE | Current shop items |
| 7 | `error-log` | `StateErrorEntry[]` | No | `ErrorRecoveryService` | STATE | Accumulated error entries |
| 8 | `current-screen` | `ScreenId` | No | `UiStateService` | STATE | Active screen identifier |
| 9 | `card-visual-states` | `CardVisualState[]` | Yes | `UiStateService` | STATE (derived) | Derived from hand cards + enhancement state |
| 10 | `meld-visual-states` | `MeldVisualState[]` | Yes | `UiStateService` | STATE (derived) | Derived from meld-states + tray assignments |
| 11 | `action-button-states` | `ActionButtonState[]` | Yes | `UiStateService` | STATE (derived) | Derived from round phase + available actions |
| 12 | `hand-cards` | `Card[]` | Yes | `RoundStateService` | STATE (derived) | Derived from round-state.hand |
| 13 | `discard-top` | `Card \| null` | Yes | `RoundStateService` | STATE (derived) | Derived from round-state.discardPile[0] |
| 14 | `draw-pile-count` | `number` | Yes | `RoundStateService` | STATE (derived) | Derived from round-state.drawPile.length |
| 15 | `current-score` | `number` | Yes | `ScoringService` | STATE (derived) | Sum of all sealed canasta scores this round |
| 16 | `score-target` | `number` | Yes | `RoundStateService` | STATE (derived) | Derived from round-state.scoreTarget |
| 17 | `active-boss-rule` | `BossRule \| null` | Yes | `ModifierStateService` | STATE (derived) | Derived from modifier-state.activeBossRule |
| 18 | `partner-slots` | `PartnerSlot[]` | Yes | `ModifierStateService` | STATE (derived) | Derived from modifier-state.partnerSlots |
| 19 | `tray-slots` | `TraySlot[]` | Yes | `ModifierStateService` | STATE (derived) | Derived from modifier-state.traySlots |
| 20 | `design-tokens` | `DesignToken[]` | Yes | `UiStateService` | STATE (derived) | Static design token table from Area 5 |
| 21 | `selected-card-id` | `string \| null` | No | `UiStateService` | STATE | Currently selected card for meld/discard |
| 22 | `drag-state` | `DragState \| null` | No | `UiStateService` | STATE | Current drag-and-drop operation state |
| 23 | `phase-label` | `string` | Yes | `RoundStateService` | STATE (derived) | Human-readable phase label for HUD |
| 24 | `can-go-out` | `boolean` | Yes | `RoundStateService` | STATE (derived) | Derived from Area 1's canGoOut() pure transform |

**Functional reactivity patterns:**

All reactive derivations use Angular's `computed()`:
- Components read signals directly in templates — no manual subscription management.
- `computed()` signals are pure derivations — they contain no side effects.
- Signal values are replaced immutably (spread operators, `filter`, `map` — never in-place mutation).

```typescript
// Example: derived signal (DSFR STATE role)
// In RoundStateService:
readonly handCards = computed(() => this.roundState().hand);
readonly phaseLabel = computed(() => {
  const phase = this.roundState().phase;
  switch (phase) {
    case 'Draw': return 'Draw Phase';
    case 'Play': return 'Play Phase';
    case 'Score': return 'Score Phase';
    case 'Shop': return 'Shop Phase';
    default: return phase;
  }
});
```

### 2.3 Routing and Service Layer

**Route definitions:**

| Path | Component | Lazy Module | Guards | Resolvers | Description |
|------|-----------|-------------|--------|-----------|-------------|
| `/` | `HomeComponent` | — | — | — | Landing screen, new run / continue |
| `/gameplay` | `GameplayComponent` | `features/gameplay` | `RunActiveGuard` | `RunStateResolver` | Main gameplay HUD |
| `/deck` | `DeckInventoryComponent` | `features/deck-inventory` | `RunActiveGuard` | `RunStateResolver` | Deck/inventory management |
| `/shop` | `ShopComponent` | `features/shop` | `RunActiveGuard`, `ShopPhaseGuard` | `ShopStateResolver` | Shop rewards screen |
| `/score` | `ScoreResultsComponent` | `features/score-results` | `RunActiveGuard`, `ScorePhaseGuard` | `RoundStateResolver` | Score results screen |
| `**` | `NotFoundComponent` | — | — | — | 404 fallback |

**Route guards:**

| Guard | DSFR Role | Logic |
|-------|-----------|-------|
| `RunActiveGuard` | TRANSFORM | Pure check: does `run-state` have `runOver === false`? |
| `ShopPhaseGuard` | TRANSFORM | Pure check: is `round-state.phase === 'Shop'`? |
| `ScorePhaseGuard` | TRANSFORM | Pure check: is `round-state.phase === 'Score'`? |

**Route resolvers:**

| Resolver | DSFR Role | Logic |
|----------|-----------|-------|
| `RunStateResolver` | EFFECT → ORCHESTRATION | Loads persisted run state from Area 8's persistence layer, invokes `RunStateService.loadRun()` entry point |
| `RoundStateResolver` | TRANSFORM | Derives current round from `run-state` signal |
| `ShopStateResolver` | TRANSFORM | Derives shop state from `shop-state` signal |

**Service layer:**

| Service | Scope | DSFR Role | Owned Signals | Description |
|---------|-------|-----------|---------------|-------------|
| `GameRulesService` | root | TRANSFORM | (none — pure functions) | Pure transforms: `validateMeld()`, `scoreCanasta()`, `canGoOut()`, `determineCanastaType()`. All methods are `static`. |
| `RunStateService` | root | STATE + ORCHESTRATION | `run-state`, `deck-state` | Owns run and deck state. Entry points: `startRun()`, `loadRun()`, `advanceRound()`, `modifyDeck()`. |
| `RoundStateService` | root | STATE + ORCHESTRATION | `round-state`, `hand-cards`, `phase-label`, `can-go-out` | Owns round/turn/phase state. Entry points: `beginTurn()`, `endTurn()`, `transitionPhase()`, `dealHand()`, `drawCard()`, `discardCard()`. |
| `MeldStateService` | root | STATE + ORCHESTRATION | `meld-states` | Owns meld state. Entry points: `placeMeld()`, `extendMeld()`, `sealCanasta()`. |
| `ModifierStateService` | root | STATE + ORCHESTRATION | `modifier-state`, `partner-slots`, `tray-slots`, `active-boss-rule` | Owns modifier state. Entry points: `draftPartner()`, `activateHouseRule()`, `assignTray()`, `applyBossRule()`. |
| `EnhancementStateService` | root | STATE + ORCHESTRATION | (enhances `deck-state`) | Entry points: `applySeal()`, `removeEnhancement()`. |
| `ShopStateService` | root | STATE + ORCHESTRATION | `shop-state` | Owns shop state. Entry points: `generateShop()`, `purchaseItem()`, `rerollShop()`. |
| `ScoringService` | root | ORCHESTRATION | `current-score` | Orchestrates scoring pipeline. Entry points: `scoreRound()`, `scoreCanasta()`. |
| `ErrorRecoveryService` | root | STATE + ORCHESTRATION + EFFECT | `error-log` | Owns error state. Entry points: `detectInvalidState()`, `rollbackToLastValid()`, `resetToRoundStart()`. Effect: persists error log. |
| `SceneBridgeService` | root | EFFECT | (none) | Pushes state to BabylonJS. Listens to scene events and routes to entry points. |
| `UiStateService` | feature (gameplay) | STATE + ORCHESTRATION | `current-screen`, `card-visual-states`, `meld-visual-states`, `action-button-states`, `selected-card-id`, `drag-state`, `design-tokens` | Owns UI-specific state. Entry points: `selectCard()`, `setDragState()`, `transitionScreen()`. |

### 2.4 BabylonJS Integration Boundary Contract

This is the owner document for the Angular/BabylonJS integration boundary. Area 6 references this contract but must not redefine it.

**Contract definition:**

```typescript
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

**DSFR effect routing for the BabylonJS boundary:**

```
BabylonJS scene event
  → SceneBridgeService event handler (EFFECT)
    → Domain entry point (ORCHESTRATION)
      → Signal .set() / .update() (STATE mutation)
        → computed() signals recalculate (derived STATE)
          → Angular effect pushes to BabylonJS (EFFECT)
            → Scene updates
```

Key invariant: BabylonJS never reads Angular signals directly. All scene updates happen through explicit imperative calls from Angular effects. All scene events re-enter Angular through entry points — never through direct signal mutation.

---

## 3. Interfaces & Contracts with Adjacent Areas

### 3.1 Contract with Area 5 — UI/UX Design

Area 7 consumes design tokens and accessibility requirements from Area 5.

**Design token consumption via CSS custom properties:**

Area 5 (Section 4) defines the Neon Space Canasta design token table. Area 7 maps these tokens to CSS custom properties that Angular components consume:

```typescript
// Area 7 maps Area 5 design tokens to CSS custom properties:
// --color-neon-cyan, --color-neon-magenta, --color-neon-gold, etc.
// --font-display, --font-body, --font-mono
// --spacing-xs through --spacing-4xl
// --panel-bg, --panel-border, --panel-glow
// --bg-starfield, --bg-nebula, --bg-grid
```

**Accessibility implementation contract:**

Area 5 (Section 3.3) defines ARIA role assignments and keyboard navigation maps. Area 7 implements these in Angular:

- All interactive elements get their ARIA roles via Angular attribute binding.
- Keyboard navigation is implemented via Angular `@HostListener` decorators on shared directives.
- Color contrast ratios from Area 5 are verified at build time using a custom stylelint plugin.

### 3.2 Contract with Area 6 — BabylonJS Rendering

Area 7 owns the `BabylonJSBoundaryContract` (Section 2.4). Area 6 implements the scene-side logic for each `sceneUpdateFn` and `sceneEventName` defined in the contract. Area 6 must not redefine the contract — it must reference this document by name and section.

### 3.3 Contract with Area 8 — Game State Management

Area 8 defines the authoritative state schemas (`RunState`, `RoundState`, `DeckState`, `MeldState`). Area 7's signals are derived from or wrap these schemas:

```typescript
// Area 7 imports state schemas from Area 8:
import type { RunState, RoundState, DeckState, MeldState } from './area8-state-management';

// Area 7's signals ARE the Area 8 schemas — no transformation at rest:
// runStateService.runState() returns RunState (from Area 8)
// roundStateService.roundState() returns RoundState (from Area 8)
```

Area 8's persistence layer (save/load) is invoked by `RunStateService` entry points. Area 7 does not own persistence — it delegates to Area 8's `PersistenceService`.

---

## 4. Worked Example

**Scenario:** Player drags a card from hand to a meld zone, the meld reaches canasta, and the score updates.

### Step 1 — Player clicks card in BabylonJS scene

1. BabylonJS raises `onCardClicked(cardId: 'Q-spades-1')` event.
2. `SceneBridgeService` event handler (EFFECT) receives the event.
3. Handler invokes `UiStateService.selectCard('Q-spades-1')` (ORCHESTRATION entry point).
4. `UiStateService.selectCard()` calls `this.selectedCardId.set('Q-spades-1')` (STATE mutation).
5. `cardVisualStates` computed signal recalculates — Q♠ gets `CardInteractionState.Selected` (derived STATE).
6. Angular effect in `SceneBridgeService` fires: `syncCardMeshes(cardVisualStates())` (EFFECT).
7. BabylonJS updates Q♠ mesh: applies selection glow outline, raises card slightly.

### Step 2 — Player drags card to meld zone and drops

1. BabylonJS raises `onCardDroppedOnMeldZone(cardId: 'Q-spades-1', zoneId: 'meld-q')`.
2. `SceneBridgeService` handler invokes `MeldStateService.placeMeld([Q♠], meldQ)` (ORCHESTRATION).
3. `MeldStateService.placeMeld()` calls `GameRulesService.validateMeld()` (TRANSFORM — pure function).
4. `validateMeld()` returns `{ valid: true }`.
5. `placeMeld()` calls `this.meldStates.update(...)` to add the card (STATE mutation).
6. `meldVisualStates` computed signal recalculates (derived STATE).
7. Angular effect fires: `syncMeldZones(meldVisualStates())` (EFFECT).
8. BabylonJS updates meld zone: adds card mesh, updates zone highlight.

### Step 3 — Meld reaches canasta (7 cards)

1. After 7 cards are placed, `MeldStateService.sealCanasta()` is called (ORCHESTRATION).
2. `sealCanasta()` invokes `GameRulesService.determineCanastaType()` (TRANSFORM) → returns `'natural'`.
3. `sealCanasta()` invokes `ScoringService.scoreCanasta()` (ORCHESTRATION).
4. `ScoringService.scoreCanasta()` calls `GameRulesService.scoreCanasta()` (TRANSFORM) → `baseTotal = 570`.
5. Then calls `ModifierStateService.runModifierPipeline()` (ORCHESTRATION, Area 3) → applies modifiers → `finalScore = 1140`.
6. `sealCanasta()` updates `meldStates` with `isSealed: true, score: 1140` (STATE mutation).
7. `currentScore` computed signal recalculates (derived STATE).
8. Angular effects fire: `syncMeldZones()` triggers seal animation in BabylonJS (EFFECT).
9. BabylonJS plays: glow layer activates, particle burst fires, scene updates to sealed state.

### Step 4 — State persistence

1. After `sealCanasta()` completes, `ErrorRecoveryService.autoSave()` is called (EFFECT).
2. Auto-save serializes `run-state` to JSON and writes to localStorage (Area 8 persistence model).
3. If the player refreshes the browser, `RunStateService.loadRun()` (ORCHESTRATION) reads from localStorage and restores all signals.

**DSFR role trace:**

| Step | DSFR Role | What Happened |
|------|-----------|---------------|
| BabylonJS click | EFFECT | Scene event captured |
| selectCard() | ORCHESTRATION | Entry point mutated selectedCardId signal |
| cardVisualStates | STATE (derived) | computed() recalculated |
| syncCardMeshes() | EFFECT | Pushed state to BabylonJS |
| validateMeld() | TRANSFORM | Pure function, no state access |
| meldStates.update() | ORCHESTRATION | Entry point mutated meldStates signal |
| scoreCanasta() | TRANSFORM | Pure function from Area 1 |
| runModifierPipeline() | ORCHESTRATION | Area 3 entry point |
| autoSave() | EFFECT | Persisted state to localStorage |

---

## 5. Open Questions

### OQ-1: Signal Coarseness — Per-Card vs. Whole-Hand
**Question:** Should `card-visual-states` be a single computed signal for the entire hand, or one signal per card?

**Status:** Resolved — single computed signal for the entire hand.

**Rationale:** A single `computed()` signal for the entire hand is simpler and avoids managing N individual signals. Angular's `computed()` uses referential equality by default, so the signal only fires when the array reference changes. Components use `track` functions in `@for` loops to minimize DOM updates. Per-card signals would add significant bookkeeping overhead for marginal performance gain.

---

### OQ-2: SceneBridgeService Scope
**Question:** Should `SceneBridgeService` be a single root-scoped service, or should it be split into feature-scoped services per screen?

**Status:** Resolved — single root-scoped service with screen-specific methods.

**Rationale:** The BabylonJS scene is a single global resource. Having multiple services inject into the same scene would create coordination problems. A single `SceneBridgeService` with screen-specific methods (`syncGameplayScene`, `syncShopScene`) keeps the boundary contract unified while allowing screen-specific logic.

---

### OQ:3: Effect Cleanup on Route Change
**Question:** When the player navigates from `/gameplay` to `/shop`, should the BabylonJS scene be destroyed or preserved?

**Status:** Resolved — preserved with layout swap.

**Rationale:** Destroying and recreating the BabylonJS scene on every route change would cause visible loading delays. Instead, the scene is preserved and the camera/layout transitions between pre-built sub-scenes (gameplay layout, shop layout). This is consistent with Area 5's screen transition design.

---

### OQ-4: Error Recovery Entry Point Ownership
**Question:** Should `ErrorRecoveryService` be able to call `.set()` on other services' signals during rollback?

**Status:** Resolved — no. Error recovery invokes entry points on the owning services.

**Rationale:** DSFR Tier 1 forbids cross-domain mutation. During rollback, `ErrorRecoveryService` calls `RunStateService.rollbackToLastValid()` which is an entry point on `RunStateService` that calls `.set()` on its own `run-state` signal. This preserves domain ownership boundaries.

---

### OQ-5: Pure Transform Placement
**Question:** Should `GameRulesService` pure transforms be static methods on the class or standalone exported functions?

**Status:** Resolved — static methods on the class.

**Rationale:** DSFR Tier 2 prefers class-local pure transforms when the language supports it without coupling to instance state. Static methods on `GameRulesService` preserve domain ownership and discoverability while remaining pure (no `this` access, no signal access, no injected collaborators).

---

### OQ-6: Subscription Ownership for BabylonJS Events
**Question:** Who owns the teardown of BabylonJS event subscriptions — `SceneBridgeService` or the feature component?

**Status:** Resolved — `SceneBridgeService` owns setup and teardown.

**Rationale:** DSFR requires explicit ownership of subscription lifecycle. `SceneBridgeService` sets up BabylonJS event listeners in its constructor (or `ngOnInit` equivalent) and tears them down in `ngOnInitDestroy`. Feature components never directly subscribe to BabylonJS events — they go through the boundary contract.

---

### OQ-7: Derived State for Score Breakdown
**Question:** Should the score breakdown display (per-canasta scores, modifier log) be a computed signal or a stored field on `MeldState`?

**Resolved** — stored field on `MeldState` (from Area 8).

**Rationale:** The score breakdown includes the `AppliedModifierRecord[]` audit log from Area 3's modifier pipeline. This is not derivable from source state alone — it's a record of what happened during scoring. Area 8 stores it as `MeldState.scoreBreakdown`. Area 7 derives a display-friendly computed signal from this stored field.

---

## 6. Self-Review Against Done Criteria

### Universal Done Checklist

- [x] All required sections present: Overview, Data Models (Section 1), Core Algorithms (Section 2), Interfaces & Contracts (Section 3), Worked Example (Section 4), Open Questions (Section 5)
- [x] All data models fully typed: `SignalInventoryEntry`, `ServiceDefinition`, `RouteDefinition`, `BabylonJSBoundaryContract`, `DsfrRole` — no `any`, no partial types
- [x] All algorithms described at pseudocode or decision-table level: DSFR domain decomposition (Section 2.1, table), component tree (Section 2.2, tree diagram), signal inventory (Section 2.2, table), routing (Section 2.3, table), service layer (Section 2.3, table), BabylonJS boundary (Section 2.4, contract definition)
- [x] All interfaces between this area and adjacent areas explicitly named and typed: Area 5 (Section 3.1), Area 6 (Section 3.2), Area 8 (Section 3.3)
- [x] All open questions either resolved or explicitly deferred with rationale: OQ-1 through OQ-7
- [x] Worked example traces a concrete Angular scenario end-to-end: Section 4 (card click → drag → meld → canasta seal → score update → persistence)
- [x] No content redefines rules owned by upstream dependencies: all game rules reference Area 1; all state schemas reference Area 8; all design tokens reference Area 5; BabylonJS boundary is owned here and referenced by Area 6

### Area-Specific Done Criteria

- [x] Component tree fully specified with lazy-loading boundaries marked: Section 2.2 (tree diagram with `features/gameplay`, `features/deck-inventory`, `features/shop`, `features/score-results` as lazy-loaded modules)
- [x] Every signal and computed signal named, typed, and assigned to an owning service: Section 2.2 signal inventory table (24 signals)
- [x] BabylonJS integration boundary explicitly defined as a typed contract: Section 2.4 (`BabylonJSBoundaryContract` with 6 input signals and 5 output events)
- [x] All route definitions, guards, and resolvers named and described: Section 2.3 (6 routes, 3 guards, 3 resolvers)
- [x] All services named with responsibilities and injection scope: Section 2.3 service layer table (10 services)
- [x] DSFR roles applied throughout: STATE (signals), TRANSFORM (pure functions), ORCHESTRATION (entry points), EFFECT (BabylonJS/DOM/IO) — all classified in Section 2.1 and worked example
