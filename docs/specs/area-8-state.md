# Area 8: Game State Management — Technical Specification & Implementation Plan

## 1. Overview

Area 8 defines the **game state management layer** for Congero: the authoritative data schemas that represent every mutable game state (round, deck, meld, and run), the phase transition tables and state invariants that govern valid state changes, the persistence and save/load lifecycle, and the error handling and recovery model that all other areas depend on.

Area 8 is the **sink for computed results** owned by other areas — it stores outputs from Area 1 (Game Rules & Core Mechanics) and Area 3 (Modifier Systems) without redefining them, and it provides the state schema that Area 7 (Angular App Architecture) uses as the source of truth for Angular signals. Area 8 owns the error handling and recovery model for the entire system; all other areas cite this document for error handling behavior.

**What this spec covers:**

- All TypeScript interfaces and types for state schemas (`RoundState`, `DeckState`, `DeckCardState`, `MeldState`, `MeldScoreRecord`, `RunState`, `StateErrorEntry`, `ErrorCategory`, `RecoveryStrategy`)
- Round-level and turn-level phase transition tables with guard conditions and `canTransition()` functions
- All 10 state invariants as runtime check functions
- Persistence layer: localStorage MVP, IndexedDB future path, serialization format, schema versioning, and migration strategy
- Error handling & recovery model: error categories, recovery strategies (rollback, reset, retry), persistence failure handling, rendering error fallback
- DSFR integration: how state schemas map to Angular signals in Area 7
- Unit test plan, dependencies, implementation order, and acceptance criteria

**Out of scope:**

- Game rule logic including meld validation and scoring formulas (Area 1)
- Modifier application pipeline and stacking order (Area 3)
- Card enhancement definitions (Area 4)
- Deckbuilding and run progression mechanics (Area 2)
- UI rendering and design tokens (Area 5)
- BabylonJS scene internals (Area 6)
- Angular signal consumption patterns and component architecture (Area 7)

**Design document:** `.kiro/specs/congero-state-management/design.md` (all sections referenced below).

---

## 2. File Structure

All source files live under `src/app/core/state/`. Tests mirror the source structure under `src/app/core/state/**/*.spec.ts`.

```
src/app/core/state/
├── models/
│   ├── round-state.model.ts       # RoundState interface
│   ├── deck-state.model.ts        # DeckState, DeckCardState interfaces
│   ├── meld-state.model.ts        # MeldState, MeldCardEntry, MeldScoreRecord interfaces
│   ├── run-state.model.ts         # RunState interface
│   ├── error.model.ts             # StateErrorEntry, ErrorCategory, RecoveryStrategy
│   └── index.ts                   # Barrel re-export of all model files
├── constants/
│   ├── schema-version.ts          # CURRENT_SCHEMA_VERSION constant
│   ├── phase-transitions.ts       # RoundPhase, TurnPhase enums & transition tables
│   └── invariants.ts              # Invariant check function registry
├── transitions/
│   ├── round-phase.ts             # Round phase transition logic & guards
│   ├── turn-phase.ts              # Turn phase transition logic & guards
│   └── can-transition.ts          # canTransition() unified entry point
├── invariants/
│   ├── deck-size.invariant.ts     # Invariant 1 — deck size bounds
│   ├── card-location.invariant.ts # Invariant 2 — card location exclusivity
│   ├── hand-size.invariant.ts     # Invariant 3 — hand size during Play
│   ├── card-count.invariant.ts    # Invariant 4 — total card accounting
│   ├── meld-consistency.invariant.ts # Invariant 5 — meld card consistency
│   ├── sealed-minimum.invariant.ts # Invariant 6 — sealed meld minimum size
│   ├── score-nonneg.invariant.ts  # Invariant 7 — score non-negativity
│   ├── phase-validity.invariant.ts # Invariant 8 — turn phase valid for round phase
│   ├── wild-economy.invariant.ts  # Invariant 9 — wild card economy consistency
│   ├── schema-version.invariant.ts # Invariant 10 — schema version
│   └── validate-all.ts            # validateAllInvariants() orchestrator
├── persistence/
│   ├── serialize.ts               # serializeRunState(), deserializeRunState()
│   ├── auto-save.ts               # autoSave(), saveWithRetry(), debounce logic
│   ├── load.ts                    # loadRunState() with migration & validation
│   ├── storage.ts                 # localStorage read/write, IndexedDB stub
│   ├── migration.ts               # migrateState(), migrations registry
│   └── index.ts                   # Barrel re-export of persistence functions
├── recovery/
│   ├── rollback.ts                # rollbackToLastValid()
│   ├── reset.ts                   # resetToRoundStart()
│   ├── strategy-selector.ts       # selectRecoveryStrategy() decision table
│   ├── rendering-error.ts         # handleRenderingError()
│   └── index.ts                   # Barrel re-export of recovery functions
├── index.ts                       # Public API barrel export
└── tests/
    ├── models/
    │   └── run-state.model.spec.ts
    ├── transitions/
    │   ├── round-phase.spec.ts
    │   ├── turn-phase.spec.ts
    │   └── can-transition.spec.ts
    ├── invariants/
    │   ├── deck-size.invariant.spec.ts
    │   ├── card-location.invariant.spec.ts
    │   ├── hand-size.invariant.spec.ts
    │   ├── card-count.invariant.spec.ts
    │   ├── meld-consistency.invariant.spec.ts
    │   ├── sealed-minimum.invariant.spec.ts
    │   ├── score-nonneg.invariant.spec.ts
    │   ├── phase-validity.invariant.spec.ts
    │   ├── wild-economy.invariant.spec.ts
    │   ├── schema-version.invariant.spec.ts
    │   └── validate-all.spec.ts
    ├── persistence/
    │   ├── serialize.spec.ts
    │   ├── auto-save.spec.ts
    │   ├── load.spec.ts
    │   ├── migration.spec.ts
    │   └── round-trip.spec.ts
    └── recovery/
        ├── rollback.spec.ts
        ├── reset.spec.ts
        ├── strategy-selector.spec.ts
        └── rendering-error.spec.ts
```

---

## 3. State Schemas

All types are TypeScript. No `any`, no partial types. All fields are required; prefer explicit `| null` over optional `?`.

### 3.1 Imports from Upstream Areas

```typescript
// src/app/core/state/models/*.model.ts

import type {
  Card,
  Meld,
  CanastaType,
  CanastaScoreResult,
  TurnPhase,
  MeldValidationResult,
  GoOutCondition,
  BossRuleHookSet,
  MeldValidationContext,
} from '../area1-game-rules';

import type {
  RoundPhase,
  ShopState,
  Ante,
  Round,
  RunProgression,
  CardPoolEntry,
} from '../area2-deckbuilding';

import type {
  ActiveModifierState,
  PartnerSlot,
  HouseRule,
  Scorepad,
  TraySlot,
  BossRule,
  AppliedModifierRecord,
} from '../area3-modifier-systems';

import type {
  Enhancement,
  WildCardEconomyState,
} from '../area4-card-enhancements';
```

### 3.2 Schema Version Constant

```typescript
// src/app/core/state/constants/schema-version.ts

/**
 * Current schema version for the run state serialization format.
 * Incremented when a breaking schema change is introduced.
 * Used by the migration strategy to handle schema evolution.
 */
export const CURRENT_SCHEMA_VERSION = 1;
```

### 3.3 `RoundState`

Represents the complete mutable state of the current round. Created at the start of each round (Draw phase entry) and destroyed when the round ends (Shop phase exit or run over).

```typescript
// src/app/core/state/models/round-state.model.ts

export interface RoundState {
  /** The ante this round belongs to. Sourced from Area 2's `Round.anteNumber`. */
  anteNumber: number;
  /** Round number within the ante, 1-indexed. Sourced from Area 2's `Round.roundNumber`. */
  roundNumber: number;
  /** Absolute round number across the entire run, 1-indexed. Sourced from Area 2's `Round.absoluteRoundNumber`. */
  absoluteRoundNumber: number;
  /** Score target the player must meet or exceed to advance. Sourced from Area 2's `Round.scoreTarget`. */
  scoreTarget: number;
  /** True if this is the boss round for its ante. Sourced from Area 2's `Round.isBossRound`. */
  isBossRound: boolean;
  /** The boss rule identifier active for this round, or null if not a boss round. Sourced from Area 2's `Round.bossRuleId`. */
  bossRuleId: string | null;
  /** Current phase of the round lifecycle. Sourced from Area 2's `Round.phase`. */
  roundPhase: RoundPhase;
  /** Current turn number within the round, 1-indexed. Incremented at each turn boundary. */
  turnNumber: number;
  /** Current phase of the active player's turn. Sourced from Area 1's `TurnPhase`. */
  turnPhase: TurnPhase;
  /** Cards currently in the player's hand. Sourced from Area 1's `TurnState.hand`. */
  hand: Card[];
  /** All melds currently on the table. Sourced from Area 1's `TurnState.melds`. */
  melds: MeldState[];
  /** The discard pile as an ordered array. Index 0 is the bottom; last element is the top. */
  discardPile: Card[];
  /** Top card of the discard pile, or null if the pile is empty. Convenience accessor (last element of discardPile). */
  discardPileTop: Card | null;
  /** True if the discard pile is currently frozen. Sourced from Area 1's `TurnState.discardPileFrozen`. */
  discardPileFrozen: boolean;
  /** The draw pile as an ordered array. Index 0 is the top card. */
  drawPile: Card[];
  /** Current round score (sum of all canasta scores + bonuses scored so far this round). */
  roundScore: number;
  /** Number of canastas sealed so far this turn. Sourced from Area 1's `TurnState.canastasCompletedThisTurn`. */
  canastasCompletedThisTurn: number;
  /** True if the player has at least one sealed canasta on the table. Sourced from Area 1's `TurnState.hasAtLeastOneCanasta`. */
  hasAtLeastOneCanasta: boolean;
  /** Red threes auto-played this round. Each red three contributes +100 bonus points. */
  autoPlayedRedThrees: Card[];
  /** Wild card economy state for the current round. Sourced from Area 4's `WildCardEconomyState`. */
  wildCardEconomy: WildCardEconomyState;
  /** True if the player has gone out this round. */
  playerHasGoneOut: boolean;
  /** The going-out condition that was met, or null if the player has not gone out. */
  goOutCondition: GoOutCondition | null;
  /** Timestamp (ms since epoch) when this RoundState was last updated. Used for auto-save debounce. */
  lastUpdated: number;
}
```

### 3.4 `DeckState` and `DeckCardState`

Represents the player's deck across the entire run. Persisted between rounds; modified during the Shop phase (card add/remove/convert).

```typescript
// src/app/core/state/models/deck-state.model.ts

export interface DeckState {
  /** All cards currently in the player's deck. Each entry wraps a Card with enhancement and location data. */
  cards: DeckCardState[];
  /** Rank density map: for each rank, the count of cards in the deck with that rank. Computed from `cards`. */
  rankDensity: Record<string, number>;
  /** Total number of wild cards in the deck (cards where `Card.isWild === true`). Includes 2s and Jokers. */
  wildCount: number;
  /** Total number of natural (non-wild) cards in the deck. */
  naturalCount: number;
  /** Total number of cards in the deck. Must be >= 20 and <= 108. */
  totalCount: number;
  /** Number of red threes in the deck. Auto-played when drawn; +100 bonus points each. */
  redThreeCount: number;
  /** Number of black threes in the deck. May only be discarded; cannot be melded. */
  blackThreeCount: number;
}

export interface DeckCardState {
  /** The card instance. Matches Area 1's `Card` interface. */
  card: Card;
  /** The enhancement applied to this card, or null if no enhancement. Sourced from Area 4's `Enhancement`. */
  enhancement: Enhancement | null;
  /** True if this card is currently in the draw pile. */
  inDrawPile: boolean;
  /** True if this card is currently in the player's hand. */
  inHand: boolean;
  /** The meld ID this card belongs to, or null if the card is not in a meld. References `MeldState.meldId`. */
  meldId: string | null;
  /** True if this card is in the discard pile. */
  inDiscardPile: boolean;
  /** True if this card has been auto-played (red three). */
  isAutoPlayed: boolean;
}
```

### 3.5 `MeldState`, `MeldCardEntry`, and `MeldScoreRecord`

Represents the state of a single meld on the table. Extends Area 1's `Meld` with scoring results and tray assignment.

```typescript
// src/app/core/state/models/meld-state.model.ts

export interface MeldState {
  /** Unique identifier for this meld. Matches Area 1's `Meld.id`. */
  meldId: string;
  /** The natural rank this meld is built around. Matches Area 1's `Meld.rank`. */
  rank: string;
  /** All cards currently in this meld. Each entry references a `DeckCardState` by card ID. */
  cards: MeldCardEntry[];
  /** The canasta type this meld has achieved, or null if it has not yet reached 7 cards. */
  canastaType: CanastaType | null;
  /** True once the meld has been sealed as a canasta (>= 7 cards). */
  isSealed: boolean;
  /** Running point value of all cards in the meld (sum of card.pointValue). Does not include canasta bonus. */
  cardPointTotal: number;
  /** The canasta bonus for this meld, or null if not yet sealed. */
  canastaBonus: number | null;
  /** The base total (cardPointTotal + canastaBonus) before the modifier pipeline. */
  baseTotal: number | null;
  /** The final score after the modifier pipeline has been applied. */
  finalScore: number | null;
  /** True if this meld was completed using at least one card from the discard pile during the same turn. */
  completedFromDiscard: boolean;
  /** True if this meld was completed in a single turn without any prior cards on the table. */
  completedConcealed: boolean;
  /** Tray slot ID assigned to this meld, or null if no tray is active. */
  traySlotId: string | null;
  /** The turn number on which this meld was first created. */
  createdOnTurn: number;
  /** The turn number on which this meld was sealed, or null if not yet sealed. */
  sealedOnTurn: number | null;
  /** The most recent scoring result for this meld, or null if not yet scored. */
  lastScoreResult: MeldScoreRecord | null;
}

export interface MeldCardEntry {
  /** The card instance ID. References `DeckCardState.card.id`. */
  cardId: string;
  /** True if this card was added to the meld from the discard pile. */
  fromDiscard: boolean;
  /** The turn number on which this card was added to the meld. */
  addedOnTurn: number;
}

export interface MeldScoreRecord {
  /** The canasta type determined by Area 1's `determineCanastaType()`. */
  canastaType: CanastaType;
  /** Card point total computed by Area 1's `computeCardPointTotal()`. */
  cardPointTotal: number;
  /** Canasta bonus from Area 1's `getCanastaBonus()`. */
  canastaBonus: number;
  /** Base total from Area 1's `scoreCanasta()`. */
  baseTotal: number;
  /** The modifier pipeline audit log from Area 3. Records every modifier applied. */
  modifierLog: AppliedModifierRecord[];
  /** Final score after the modifier pipeline. */
  finalScore: number;
  /** Timestamp (ms since epoch) when this score was computed. */
  scoredAt: number;
}
```

### 3.6 `RunState`

The top-level game state that wraps all other state schemas. This is the root object serialized to persistent storage.

```typescript
// src/app/core/state/models/run-state.model.ts

export interface RunState {
  /** Schema version for this run state serialization format. Must equal `CURRENT_SCHEMA_VERSION` for direct load. */
  schemaVersion: number;
  /** Unique identifier for this run instance. Generated when the run is created. Used as the storage key. */
  runId: string;
  /** Timestamp (ms since epoch) when this run was created. */
  createdAt: number;
  /** Timestamp (ms since epoch) when this run state was last persisted to storage. */
  lastSavedAt: number;
  /** Number of times this run state has been saved to storage. */
  saveCount: number;
  /** The current round state, or null during initialization before the first round is created. */
  roundState: RoundState | null;
  /** The player's deck state. Persisted across rounds. */
  deckState: DeckState;
  /** Active modifier state. Persisted across rounds. Sourced from Area 3's `ActiveModifierState`. */
  modifierState: ActiveModifierState;
  /** Run progression state. Tracks ante, round, gold, shop, and run status. Sourced from Area 2's `RunProgression`. */
  runProgression: RunProgression;
  /** The last known valid state snapshot, captured before every state transition. Used by rollback recovery. */
  lastValidState: RunState | null;
  /** Error log for the current run. Capped at 100 entries (FIFO eviction). */
  errorLog: StateErrorEntry[];
  /** True if the run is currently in an error recovery state. Transitions are blocked while true. */
  isInRecovery: boolean;
  /** The recovery strategy currently being applied, or null if not in recovery. */
  activeRecoveryStrategy: RecoveryStrategy | null;
}
```

### 3.7 Error & Recovery Types

```typescript
// src/app/core/state/models/error.model.ts

export interface StateErrorEntry {
  /** Unique identifier for this error entry. */
  errorId: string;
  /** Timestamp (ms since epoch) when the error occurred. */
  timestamp: number;
  /** The category of error. */
  category: ErrorCategory;
  /** Human-readable error message. */
  message: string;
  /** The area that reported the error (e.g., 'Area 1', 'Area 3', 'Area 8'). */
  sourceArea: string;
  /** The state transition or operation that was in progress when the error occurred. */
  operation: string;
  /** Additional context data for debugging. Structured as a record, not `any`. */
  context: Record<string, string | number | boolean | null>;
  /** True if this error was successfully recovered from. */
  recovered: boolean;
  /** The recovery strategy applied, or null if not recovered. */
  recoveryStrategy: RecoveryStrategy | null;
}

export type ErrorCategory =
  | 'INVALID_STATE'
  | 'TRANSITION_FAILURE'
  | 'PERSISTENCE_WRITE_FAIL'
  | 'PERSISTENCE_READ_FAIL'
  | 'PERSISTENCE_CORRUPT'
  | 'MIGRATION_FAILURE'
  | 'RENDERING_ERROR'
  | 'UNKNOWN';

export type RecoveryStrategy =
  | 'ROLLBACK_TO_LAST_VALID'
  | 'RESET_TO_ROUND_START'
  | 'RESET_TO_DRAW_PHASE'
  | 'RETRY_PERSISTENCE'
  | 'DISCARD_AND_CONTINUE'
  | 'RUN_OVER';
```

---

## 4. Phase Transitions

The game operates at two levels of phase nesting. Area 8 manages both levels.

### 4.1 Phase Enums

```typescript
// src/app/core/state/constants/phase-transitions.ts

/** Round-level phases — owned by Area 2, Section 3.4. */
export enum RoundPhase {
  Draw = 'Draw',
  Play = 'Play',
  Score = 'Score',
  Shop = 'Shop',
  RunOver = 'RunOver',
  RunWon = 'RunWon',
}

/** Turn-level phases — owned by Area 1, Section 3.4. */
export enum TurnPhase {
  Draw = 'Draw',
  Meld = 'Meld',
  Discard = 'Discard',
  GoOut = 'GoOut',
}
```

### 4.2 Round Phase Transition Table

| From \ To | Draw | Play | Score | Shop | RunOver | RunWon |
|-----------|------|------|-------|------|---------|--------|
| *(start)* | ✓ | — | — | — | — | — |
| Draw | — | ✓ | — | — | — | — |
| Play | — | — | ✓ | — | — | — |
| Score | — | — | — | ✓* | ✓† | — |
| Shop | ✓‡ | — | — | — | — | ✓§ |

\* Guard: `roundScore >= scoreTarget` (player met the target — advance to shop).
† Guard: `roundScore < scoreTarget` (player missed the target — run over).
‡ Guard: `notFinalRound` (more rounds remain — advance to next round's Draw).
§ Guard: `isFinalRound` (ante 8, round 3 completed — player wins).

```typescript
// src/app/core/state/constants/phase-transitions.ts (continued)

/** Valid round phase transitions. Maps `from` phase to set of allowed `to` phases. */
export const ROUND_TRANSITIONS: Record<RoundPhase, Set<RoundPhase>> = {
  [RoundPhase.Draw]: new Set([RoundPhase.Play]),
  [RoundPhase.Play]: new Set([RoundPhase.Score]),
  [RoundPhase.Score]: new Set([RoundPhase.Shop, RoundPhase.RunOver]),
  [RoundPhase.Shop]: new Set([RoundPhase.Draw, RoundPhase.RunWon]),
  [RoundPhase.RunOver]: new Set(),
  [RoundPhase.RunWon]: new Set(),
};
```

### 4.3 Turn Phase Transition Table

| From \ To | Draw | Meld | Discard | GoOut |
|-----------|------|------|---------|-------|
| *(start)* | ✓ | — | — | — |
| Draw | — | ✓ | ✓ | ✓* |
| Meld | — | — | ✓ | ✓* |
| Discard | — | — | — | — |
| GoOut | — | — | — | — |

\* Guard: `canGoOut(turnState, condition) === true` (Area 1, Section 3.5).

```typescript
// src/app/core/state/constants/phase-transitions.ts (continued)

/** Valid turn phase transitions. Maps `from` phase to set of allowed `to` phases. */
export const TURN_TRANSITIONS: Record<TurnPhase, Set<TurnPhase>> = {
  [TurnPhase.Draw]: new Set([TurnPhase.Meld, TurnPhase.Discard, TurnPhase.GoOut]),
  [TurnPhase.Meld]: new Set([TurnPhase.Discard, TurnPhase.GoOut]),
  [TurnPhase.Discard]: new Set(),
  [TurnPhase.GoOut]: new Set(),
};
```

### 4.4 `canTransition` Functions

```typescript
// src/app/core/state/transitions/can-transition.ts

/**
 * Checks whether a round phase transition is valid.
 * For Score→Shop and Score→RunOver, evaluates the score guard.
 * For Shop→Draw and Shop→RunWon, evaluates the final-round guard.
 */
export function canTransitionRoundPhase(
  from: RoundPhase,
  to: RoundPhase,
  context: RoundTransitionContext
): boolean {
  const allowedTargets = ROUND_TRANSITIONS[from];
  if (!allowedTargets.has(to)) {
    return false;
  }

  // Guard: Score → Shop requires roundScore >= scoreTarget
  if (from === RoundPhase.Score && to === RoundPhase.Shop) {
    return context.roundScore >= context.scoreTarget;
  }

  // Guard: Score → RunOver requires roundScore < scoreTarget
  if (from === RoundPhase.Score && to === RoundPhase.RunOver) {
    return context.roundScore < context.scoreTarget;
  }

  // Guard: Shop → Draw requires notFinalRound
  if (from === RoundPhase.Shop && to === RoundPhase.Draw) {
    return !context.isFinalRound;
  }

  // Guard: Shop → RunWon requires isFinalRound
  if (from === RoundPhase.Shop && to === RoundPhase.RunWon) {
    return context.isFinalRound;
  }

  return true;
}

/**
 * Checks whether a turn phase transition is valid.
 * For Draw→GoOut and Meld→GoOut, delegates to Area 1's canGoOut().
 */
export function canTransitionTurnPhase(
  from: TurnPhase,
  to: TurnPhase,
  context: TurnTransitionContext
): boolean {
  const allowedTargets = TURN_TRANSITIONS[from];
  if (!allowedTargets.has(to)) {
    return false;
  }

  // Guard: GoOut requires canGoOut() from Area 1
  if (to === TurnPhase.GoOut) {
    return canGoOut(context.turnState, context.goOutCondition);
  }

  return true;
}

/** Context required for round phase transition guards. */
export interface RoundTransitionContext {
  roundScore: number;
  scoreTarget: number;
  isFinalRound: boolean;
}

/** Context required for turn phase transition guards. */
export interface TurnTransitionContext {
  turnState: TurnState;
  goOutCondition: GoOutCondition;
}
```

---

## 5. State Invariants

The following 10 invariants must hold in every valid `RunState`. Area 8 checks these before and after every state transition. If any invariant is violated, the error handling model (Section 7) is triggered.

### Invariant 1 — Deck Size Bounds

```
deckState.totalCount >= 20 AND deckState.totalCount <= 108
```

Minimum and maximum deck sizes are enforced by Area 2, Section 3.6. Area 8 checks the invariant.

```typescript
// src/app/core/state/invariants/deck-size.invariant.ts

export function checkDeckSizeInvariant(state: RunState): InvariantViolation | null {
  const { totalCount } = state.deckState;
  if (totalCount < 20 || totalCount > 108) {
    return {
      invariant: 1,
      message: `Deck size out of bounds: ${totalCount} (expected 20–108)`,
    };
  }
  return null;
}
```

### Invariant 2 — Card Location Exclusivity

```
For every card c in deckState.cards:
  exactly one of c.inDrawPile, c.inHand, c.meldId !== null, c.inDiscardPile, c.isAutoPlayed is true.
```

A card must be in exactly one location at all times.

```typescript
// src/app/core/state/invariants/card-location.invariant.ts

export function checkCardLocationInvariant(state: RunState): InvariantViolation[] {
  const violations: InvariantViolation[] = [];
  for (const deckCard of state.deckState.cards) {
    const locations = [
      deckCard.inDrawPile,
      deckCard.inHand,
      deckCard.meldId !== null,
      deckCard.inDiscardPile,
      deckCard.isAutoPlayed,
    ];
    const locationCount = locations.filter(Boolean).length;
    if (locationCount !== 1) {
      violations.push({
        invariant: 2,
        message: `Card ${deckCard.card.id} in ${locationCount} locations (expected exactly 1)`,
      });
    }
  }
  return violations;
}
```

### Invariant 3 — Hand Size During Play Phase

```
If roundState.roundPhase === 'Play':
  roundState.hand.length >= 0 AND roundState.hand.length <= 50
```

Hand size is not bounded by a fixed maximum during play (Echo enhancements can cause large draws), but a sanity upper bound of 50 prevents degenerate accumulation.

```typescript
// src/app/core/state/invariants/hand-size.invariant.ts

export function checkHandSizeInvariant(state: RunState): InvariantViolation | null {
  if (state.roundState === null) return null;
  if (state.roundState.roundPhase !== RoundPhase.Play) return null;

  const handSize = state.roundState.hand.length;
  if (handSize < 0 || handSize > 50) {
    return {
      invariant: 3,
      message: `Hand size out of bounds during Play: ${handSize} (expected 0–50)`,
    };
  }
  return null;
}
```

### Invariant 4 — Total Card Accounting

```
roundState.drawPile.length + roundState.discardPile.length +
  roundState.hand.length +
  sum(meldState.cards.length for each meld in roundState.melds) +
  roundState.autoPlayedRedThrees.length === deckState.totalCount
```

Every card in the deck must be accounted for.

```typescript
// src/app/core/state/invariants/card-count.invariant.ts

export function checkCardCountInvariant(state: RunState): InvariantViolation | null {
  if (state.roundState === null) return null;

  const { roundState, deckState } = state;
  const meldCardCount = roundState.melds.reduce((sum, m) => sum + m.cards.length, 0);
  const accounted =
    roundState.drawPile.length +
    roundState.discardPile.length +
    roundState.hand.length +
    meldCardCount +
    roundState.autoPlayedRedThrees.length;

  if (accounted !== deckState.totalCount) {
    return {
      invariant: 4,
      message: `Card count mismatch: accounted=${accounted}, deckTotal=${deckState.totalCount}`,
    };
  }
  return null;
}
```

### Invariant 5 — Meld Card Consistency

```
For every meld m in roundState.melds:
  For every entry e in m.cards:
    deckState.cards[e.cardId].meldId === m.meldId
    AND deckState.cards[e.cardId].inHand === false
    AND deckState.cards[e.cardId].inDrawPile === false
    AND deckState.cards[e.cardId].inDiscardPile === false
```

Every card in a meld must reference that meld and must not be in any other location.

```typescript
// src/app/core/state/invariants/meld-consistency.invariant.ts

export function checkMeldConsistencyInvariant(state: RunState): InvariantViolation[] {
  if (state.roundState === null) return [];

  const violations: InvariantViolation[] = [];
  const cardMap = new Map(state.deckState.cards.map((dc) => [dc.card.id, dc]));

  for (const meld of state.roundState.melds) {
    for (const entry of meld.cards) {
      const deckCard = cardMap.get(entry.cardId);
      if (!deckCard) {
        violations.push({
          invariant: 5,
          message: `Meld ${meld.meldId} references unknown card ${entry.cardId}`,
        });
        continue;
      }
      if (deckCard.meldId !== meld.meldId) {
        violations.push({
          invariant: 5,
          message: `Card ${entry.cardId} meldId=${deckCard.meldId} does not match meld ${meld.meldId}`,
        });
      }
      if (deckCard.inHand) {
        violations.push({ invariant: 5, message: `Card ${entry.cardId} in meld but also in hand` });
      }
      if (deckCard.inDrawPile) {
        violations.push({ invariant: 5, message: `Card ${entry.cardId} in meld but also in draw pile` });
      }
      if (deckCard.inDiscardPile) {
        violations.push({ invariant: 5, message: `Card ${entry.cardId} in meld but also in discard` });
      }
    }
  }
  return violations;
}
```

### Invariant 6 — Sealed Meld Minimum Size

```
For every meld m in roundState.melds:
  If m.isSealed === true:
    m.cards.length >= 7
```

A sealed meld (canasta) must have at least 7 cards.

```typescript
// src/app/core/state/invariants/sealed-minimum.invariant.ts

export function checkSealedMinimumInvariant(state: RunState): InvariantViolation[] {
  if (state.roundState === null) return [];

  const violations: InvariantViolation[] = [];
  for (const meld of state.roundState.melds) {
    if (meld.isSealed && meld.cards.length < 7) {
      violations.push({
        invariant: 6,
        message: `Sealed meld ${meld.meldId} has only ${meld.cards.length} cards (minimum 7)`,
      });
    }
  }
  return violations;
}
```

### Invariant 7 — Score Non-Negativity

```
roundState.roundScore >= 0
```

Round score must never be negative.

```typescript
// src/app/core/state/invariants/score-nonneg.invariant.ts

export function checkScoreNonNegInvariant(state: RunState): InvariantViolation | null {
  if (state.roundState === null) return null;
  if (state.roundState.roundScore < 0) {
    return {
      invariant: 7,
      message: `Round score is negative: ${state.roundState.roundScore}`,
    };
  }
  return null;
}
```

### Invariant 8 — Turn Phase Valid for Round Phase

```
If roundState.roundPhase === 'Draw':   roundState.turnPhase === 'Draw'
If roundState.roundPhase === 'Play':   roundState.turnPhase ∈ { 'Draw', 'Meld', 'Discard', 'GoOut' }
If roundState.roundPhase === 'Score':  roundState.turnPhase === null
If roundState.roundPhase === 'Shop':   roundState.turnPhase === null
```

Turn phases are only active during the Play round phase.

```typescript
// src/app/core/state/invariants/phase-validity.invariant.ts

export function checkPhaseValidityInvariant(state: RunState): InvariantViolation | null {
  if (state.roundState === null) return null;

  const { roundPhase, turnPhase } = state.roundState;

  if (roundPhase === RoundPhase.Draw && turnPhase !== TurnPhase.Draw) {
    return { invariant: 8, message: `Draw round phase has turnPhase=${turnPhase}` };
  }
  if (roundPhase === RoundPhase.Play && !TURN_TRANSITIONS[turnPhase]) {
    return { invariant: 8, message: `Play round phase has invalid turnPhase=${turnPhase}` };
  }
  if (roundPhase === RoundPhase.Score && turnPhase !== null) {
    return { invariant: 8, message: `Score round phase has non-null turnPhase=${turnPhase}` };
  }
  if (roundPhase === RoundPhase.Shop && turnPhase !== null) {
    return { invariant: 8, message: `Shop round phase has non-null turnPhase=${turnPhase}` };
  }
  return null;
}
```

### Invariant 9 — Wild Card Economy Consistency

```
roundState.wildCardEconomy.totalWildsInDeck === deckState.wildCount
roundState.wildCardEconomy.wildsInHand === roundState.hand.filter(c => c.isWild).length
roundState.wildCardEconomy.wildsInMelds === sum(meld.cards.filter(c => c.isWild).length for each meld)
roundState.wildCardEconomy.wildsInDiscard === roundState.discardPile.filter(c => c.isWild).length
```

The wild card economy state must match the actual card locations.

```typescript
// src/app/core/state/invariants/wild-economy.invariant.ts

export function checkWildEconomyInvariant(state: RunState): InvariantViolation[] {
  if (state.roundState === null) return [];

  const violations: InvariantViolation[] = [];
  const { wildCardEconomy, hand, melds, discardPile } = state.roundState;

  const wildsInHand = hand.filter((c) => c.isWild).length;
  if (wildCardEconomy.wildsInHand !== wildsInHand) {
    violations.push({
      invariant: 9,
      message: `Wilds in hand: economy=${wildCardEconomy.wildsInHand}, actual=${wildsInHand}`,
    });
  }

  // Note: meld card wild counts require resolving MeldCardEntry.cardId → Card
  // Implementation uses the cardMap from deckState for resolution.
  // ... (similar checks for melds and discard)

  return violations;
}
```

### Invariant 10 — Schema Version

```
runState.schemaVersion > 0 AND runState.schemaVersion <= CURRENT_SCHEMA_VERSION
```

The schema version must be a positive integer no greater than the current version.

```typescript
// src/app/core/state/invariants/schema-version.invariant.ts

export function checkSchemaVersionInvariant(state: RunState): InvariantViolation | null {
  if (state.schemaVersion <= 0 || state.schemaVersion > CURRENT_SCHEMA_VERSION) {
    return {
      invariant: 10,
      message: `Schema version ${state.schemaVersion} out of range (1–${CURRENT_SCHEMA_VERSION})`,
    };
  }
  return null;
}
```

### 5.1 `validateAllInvariants` Orchestrator

```typescript
// src/app/core/state/invariants/validate-all.ts

export interface InvariantResult {
  valid: boolean;
  violations: InvariantViolation[];
}

export interface InvariantViolation {
  invariant: number;
  message: string;
}

/**
 * Runs all 10 invariants against the current RunState.
 * Called pre-transition and post-transition.
 */
export function validateAllInvariants(state: RunState): InvariantResult {
  const violations: InvariantViolation[] = [];

  const singleChecks = [
    checkDeckSizeInvariant(state),
    checkHandSizeInvariant(state),
    checkCardCountInvariant(state),
    checkSealedMinimumInvariant(state),
    checkScoreNonNegInvariant(state),
    checkPhaseValidityInvariant(state),
    checkSchemaVersionInvariant(state),
  ];

  for (const v of singleChecks) {
    if (v !== null) violations.push(v);
  }

  const multiChecks = [
    checkCardLocationInvariant(state),
    checkMeldConsistencyInvariant(state),
    checkWildEconomyInvariant(state),
  ];

  for (const vs of multiChecks) {
    violations.push(...vs);
  }

  return { valid: violations.length === 0, violations };
}
```

---

## 6. Persistence Layer

### 6.1 Storage Mechanism

| Environment | Storage Backend | Rationale |
|-------------|----------------|-----------|
| MVP / all browsers | `localStorage` | Simple key-value API; sufficient for the serialized `RunState` JSON (estimated < 2 MB for a full run). |
| Large state fallback | IndexedDB | Used if the serialized state exceeds `localStorage` quota (typically 5 MB). Supports larger payloads and asynchronous access. |

The storage key is `congero:run:{runId}` where `runId` is `RunState.runId`.

### 6.2 Serialization Format

The entire `RunState` object is serialized to JSON using `JSON.stringify()`. No custom serialization is required — all fields are plain types (strings, numbers, booleans, arrays, objects, null).

```typescript
// src/app/core/state/persistence/serialize.ts

export function serializeRunState(state: RunState): string {
  return JSON.stringify(state);
}

export function deserializeRunState(json: string): RunState {
  return JSON.parse(json) as RunState;
}
```

### 6.3 Auto-Save Triggers

| Event | When | Debounce |
|-------|------|----------|
| `STATE_TRANSITION` | After every successful state transition | 500 ms |
| `CANASTA_SEALED` | Immediately when a canasta is sealed | 0 ms (immediate) |
| `ROUND_END` | When the round transitions to Score phase | 0 ms (immediate) |
| `SHOP_PURCHASE` | After every shop purchase | 300 ms |
| `MANUAL_SAVE` | Player clicks "Save" button | 0 ms (immediate) |

```typescript
// src/app/core/state/persistence/auto-save.ts

const DEBOUNCE_MS: Record<SaveTrigger, number> = {
  STATE_TRANSITION: 500,
  CANASTA_SEALED: 0,
  ROUND_END: 0,
  SHOP_PURCHASE: 300,
  MANUAL_SAVE: 0,
};

export type SaveTrigger =
  | 'STATE_TRANSITION'
  | 'CANASTA_SEALED'
  | 'ROUND_END'
  | 'SHOP_PURCHASE'
  | 'MANUAL_SAVE';

export interface SaveResult {
  success: boolean;
  bytesWritten: number | null;
  error: string | null;
}

export function autoSave(state: RunState): SaveResult {
  state.lastSavedAt = Date.now();
  state.saveCount += 1;

  const json = serializeRunState(state);

  try {
    localStorage.setItem(`congero:run:${state.runId}`, json);
    return { success: true, bytesWritten: json.length, error: null };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      return saveToIndexedDB(state);
    }
    return { success: false, bytesWritten: null, error: 'PERSISTENCE_WRITE_FAIL' };
  }
}

export function saveWithRetry(state: RunState, maxRetries: number = 3): SaveResult {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const result = autoSave(state);
    if (result.success) return result;
    const waitMs = 100 * Math.pow(2, attempt); // 100ms, 200ms, 400ms
    // Synchronous sleep for retry backoff (uses busy-wait or setTimeout depending on context)
    sleep(waitMs);
  }
  state.errorLog.push(
    createErrorEntry('PERSISTENCE_WRITE_FAIL', `All ${maxRetries} save attempts failed`, null)
  );
  return { success: false, bytesWritten: null, error: 'PERSISTENCE_WRITE_FAIL' };
}
```

### 6.4 Load Algorithm

```typescript
// src/app/core/state/persistence/load.ts

export interface LoadResult {
  success: boolean;
  state: RunState | null;
  error: string | null;
  details: string | null;
}

export function loadRunState(runId: string): LoadResult {
  // 1. Attempt read from localStorage
  let json = localStorage.getItem(`congero:run:${runId}`);

  // 2. Attempt read from IndexedDB if localStorage miss
  if (json === null) {
    json = loadFromIndexedDB(runId);
  }

  if (json === null) {
    return { success: false, state: null, error: 'PERSISTENCE_READ_FAIL', details: 'No save found' };
  }

  // 3. Deserialize
  let state: RunState;
  try {
    state = deserializeRunState(json);
  } catch (error) {
    return { success: false, state: null, error: 'PERSISTENCE_CORRUPT', details: String(error) };
  }

  // 4. Validate schema version
  if (state.schemaVersion > CURRENT_SCHEMA_VERSION) {
    return {
      success: false,
      state: null,
      error: 'PERSISTENCE_CORRUPT',
      details: `Schema version ${state.schemaVersion} > current ${CURRENT_SCHEMA_VERSION}`,
    };
  }

  // 5. Migrate if needed
  if (state.schemaVersion < CURRENT_SCHEMA_VERSION) {
    const migrationResult = migrateState(state, state.schemaVersion, CURRENT_SCHEMA_VERSION);
    if (!migrationResult.success) {
      return { success: false, state: null, error: 'MIGRATION_FAILURE', details: migrationResult.error };
    }
    state = migrationResult.migratedState;
  }

  // 6. Validate invariants
  const invariantResult = validateAllInvariants(state);
  if (!invariantResult.valid) {
    return {
      success: false,
      state: null,
      error: 'INVALID_STATE',
      details: invariantResult.violations.map((v) => v.message).join('; '),
    };
  }

  return { success: true, state, error: null, details: null };
}
```

### 6.5 Schema Versioning & Migration Strategy

Schema migrations are versioned functions that transform a `RunState` from version N to version N+1.

```typescript
// src/app/core/state/persistence/migration.ts

export interface MigrationResult {
  success: boolean;
  migratedState: RunState | null;
  error: string | null;
}

const migrations: Record<number, (state: RunState) => RunState> = {
  // 1 → 2: example future migration
  // 1: (state) => { ... return migratedState },
};

export function migrateState(
  state: RunState,
  fromVersion: number,
  toVersion: number
): MigrationResult {
  let current = state;
  for (let v = fromVersion; v < toVersion; v++) {
    const migrate = migrations[v];
    if (!migrate) {
      return { success: false, migratedState: null, error: `No migration function for version ${v} → ${v + 1}` };
    }
    try {
      current = migrate(current);
      current.schemaVersion = v + 1;
    } catch (error) {
      return { success: false, migratedState: null, error: `Migration ${v} → ${v + 1} failed: ${error}` };
    }
  }
  return { success: true, migratedState: current, error: null };
}
```

Migrations are applied sequentially (e.g., v1 → v2 → v3, never v1 → v3 directly). Each migration function must be pure and idempotent.

### 6.6 IndexedDB Future Path

The IndexedDB layer is a stub in MVP. The interface is defined for future implementation:

```typescript
// src/app/core/state/persistence/storage.ts

/** Stub: IndexedDB save for when localStorage quota is exceeded. */
export function saveToIndexedDB(state: RunState): SaveResult {
  // Future implementation: open IndexedDB, write to object store
  return { success: false, bytesWritten: null, error: 'INDEXEDDB_NOT_IMPLEMENTED' };
}

/** Stub: IndexedDB load for fallback when localStorage misses. */
export function loadFromIndexedDB(runId: string): string | null {
  // Future implementation: open IndexedDB, read from object store
  return null;
}
```

---

## 7. Error Handling & Recovery Model

This section is the **owner document** for error handling across all areas. When any area encounters an error condition, it reports the error to Area 8, which selects and applies the recovery strategy. All other areas cite this section — they must not define their own recovery logic.

### 7.1 Invalid State Detection

Invalid state is detected by running all 10 invariants against the current `RunState`. Checks run at two points:

1. **Pre-transition check:** Before applying a state transition, validate that the current state satisfies all invariants. If not, the transition is blocked and recovery is triggered.
2. **Post-transition check:** After applying a state transition, validate that the new state satisfies all invariants. If not, the transition is reverted and recovery is triggered.

### 7.2 Recovery Strategy Decision Table

| Error Category | Round Phase | Recovery Strategy | Rationale |
|---------------|-------------|-------------------|-----------|
| `INVALID_STATE` | Any | `ROLLBACK_TO_LAST_VALID` | Restore the last known good state from `RunState.lastValidState`. |
| `TRANSITION_FAILURE` | Any | `ROLLBACK_TO_LAST_VALID` | The transition was rejected; restore the pre-transition state. |
| `PERSISTENCE_WRITE_FAIL` | Any | `RETRY_PERSISTENCE` | Retry the save up to 3 times with exponential backoff. If all retries fail, log the error and continue without saving. |
| `PERSISTENCE_READ_FAIL` | Load time | `RUN_OVER` | Cannot recover a run that cannot be loaded. End the run. |
| `PERSISTENCE_CORRUPT` | Load time | `RUN_OVER` | Corrupted data cannot be trusted. End the run. |
| `MIGRATION_FAILURE` | Load time | `RUN_OVER` | Migration failure means the state cannot be interpreted. End the run. |
| `RENDERING_ERROR` | Any | `DISCARD_AND_CONTINUE` | Rendering errors do not affect game state. Log the error and continue. |
| `INVALID_STATE` (rollback also invalid) | Any | `RESET_TO_ROUND_START` | If `lastValidState` is null or also invalid, reset to the start of the current round. |
| `INVALID_STATE` (reset also fails) | Any | `RUN_OVER` | Last resort: end the run. |

```typescript
// src/app/core/state/recovery/strategy-selector.ts

export function selectRecoveryStrategy(
  category: ErrorCategory,
  roundPhase: RoundPhase | null,
  hasValidLastState: boolean
): RecoveryStrategy {
  switch (category) {
    case 'INVALID_STATE':
      return hasValidLastState ? 'ROLLBACK_TO_LAST_VALID' : 'RESET_TO_ROUND_START';
    case 'TRANSITION_FAILURE':
      return 'ROLLBACK_TO_LAST_VALID';
    case 'PERSISTENCE_WRITE_FAIL':
      return 'RETRY_PERSISTENCE';
    case 'PERSISTENCE_READ_FAIL':
    case 'PERSISTENCE_CORRUPT':
    case 'MIGRATION_FAILURE':
      return 'RUN_OVER';
    case 'RENDERING_ERROR':
      return 'DISCARD_AND_CONTINUE';
    default:
      return 'RUN_OVER';
  }
}
```

### 7.3 Rollback Algorithm

```typescript
// src/app/core/state/recovery/rollback.ts

export interface RecoveryResult {
  success: boolean;
  recoveredState: RunState | null;
  error: string | null;
}

export function rollbackToLastValid(state: RunState): RecoveryResult {
  if (state.lastValidState === null) {
    return resetToRoundStart(state); // fallback
  }

  const check = validateAllInvariants(state.lastValidState);
  if (!check.valid) {
    return resetToRoundStart(state); // fallback if last valid is also corrupt
  }

  const restored = deepCloneRunState(state.lastValidState);
  restored.isInRecovery = false;
  restored.activeRecoveryStrategy = null;
  restored.errorLog.push(
    createErrorEntry('INVALID_STATE', 'Rollback applied', 'ROLLBACK_TO_LAST_VALID')
  );

  return { success: true, recoveredState: restored, error: null };
}

// ─── Deep Clone Implementation ─────────────────────────────────────────────

/**
 * Creates a deep clone of a RunState for rollback recovery.
 *
 * Implementation: Uses `JSON.parse(JSON.stringify(state))` — the simplest
 * approach for a pure-data object graph with no circular references,
 * no class instances, no `Date` objects (timestamps are stored as numbers),
 * and no `undefined` fields (all optional fields use explicit `| null`).
 *
 * Why this is safe for RunState:
 * - All fields are plain types: string, number, boolean, null, arrays, nested objects.
 * - No circular references: `RunState.lastValidState` is the only self-referential
 *   field, and we only clone the *current* state (not the chain of prior states).
 * - No class instances: All data is interface-typed plain objects.
 * - No `undefined`: The spec requires explicit `| null` over optional `?`.
 * - Timestamps are `number` (ms since epoch), not `Date` objects.
 *
 * Performance: A full RunState serializes to ~50-200 KB of JSON (depending on
 * deck size and meld count). `JSON.parse(JSON.stringify())` processes this in
 * <5ms on modern devices. Rollback is an infrequent operation (error recovery),
 * so this performance is acceptable.
 *
 * If performance becomes an issue (e.g., very large decks with 108 cards and
 * many melds), consider a structured clone approach:
 *   - `structuredClone(state)` — native browser API, faster than JSON round-trip,
 *     handles more types, but not available in all legacy browsers.
 *   - Manual recursive clone — more code, but allows selective shallow cloning
 *     of unchanged subtrees.
 *
 * Circular reference safety: `RunState.lastValidState` points to a prior
 * `RunState`, which itself has a `lastValidState`. The rollback algorithm only
 * clones the *immediate* `lastValidState`, not the full chain. This prevents
 * infinite recursion and keeps the clone bounded to a single snapshot.
 */
export function deepCloneRunState(state: RunState): RunState {
  return JSON.parse(JSON.stringify(state)) as RunState;
}
```

### 7.4 Reset to Round Start Algorithm

```typescript
// src/app/core/state/recovery/reset.ts

export function resetToRoundStart(state: RunState): RecoveryResult {
  if (state.roundState === null) {
    return { success: false, recoveredState: null, error: 'Cannot reset: no round state exists' };
  }

  // Preserve deck state and modifier state; reset round-specific state
  const freshRoundState = createInitialRoundState(
    state.roundState.anteNumber,
    state.roundState.roundNumber,
    state.roundState.absoluteRoundNumber,
    state.roundState.scoreTarget,
    state.deckState // re-deal hand from current deck
  );

  state.roundState = freshRoundState;
  state.isInRecovery = false;
  state.activeRecoveryStrategy = null;
  state.errorLog.push(
    createErrorEntry('INVALID_STATE', 'Reset to round start applied', 'RESET_TO_ROUND_START')
  );

  return { success: true, recoveredState: state, error: null };
}
```

### 7.5 Rendering Error Fallback

Rendering errors are reported by Area 6 (BabylonJS Rendering) to Area 8. Area 8 logs the error but does not modify game state — rendering errors do not affect the game logic.

```typescript
// src/app/core/state/recovery/rendering-error.ts

export function handleRenderingError(state: RunState, error: RenderingError): void {
  state.errorLog.push({
    errorId: generateId(),
    timestamp: Date.now(),
    category: 'RENDERING_ERROR',
    message: error.message,
    sourceArea: 'Area 6',
    operation: error.operation,
    context: error.context,
    recovered: true, // rendering errors are always "recovered" by continuing
    recoveryStrategy: 'DISCARD_AND_CONTINUE',
  });
  // No state change — the game continues with the current state.
  // Area 5 and Area 6 are responsible for rendering fallback UI.
}
```

### 7.6 Error Log Retention

The error log (`RunState.errorLog`) is capped at 100 entries with FIFO eviction. If the cap is reached, the oldest entry is removed before a new one is added.

```typescript
// src/app/core/state/recovery/error-log.ts

const MAX_ERROR_LOG_ENTRIES = 100;

export function appendErrorEntry(state: RunState, entry: StateErrorEntry): void {
  if (state.errorLog.length >= MAX_ERROR_LOG_ENTRIES) {
    state.errorLog.shift(); // evict oldest
  }
  state.errorLog.push(entry);
}
```

---

## 8. DSFR Integration

Area 8's state schema is the source of truth for Angular signals. Area 7 consumes `RunState` and derives signals from it. Area 8 does not define signals — it defines the state shape that Area 7 maps to signals.

### 8.1 Contract Summary

| Area 8 provides | Area 7 consumes |
|----------------|-----------------|
| `RunState` (full game state) | Root-level signal or signal store |
| `RoundState` (current round) | Gameplay screen signals |
| `DeckState` (player's deck) | Deck/inventory screen signals |
| `MeldState[]` (melds on table) | Meld zone visual state |
| `ActiveModifierState` (modifiers) | Modifier display signals |
| `StateErrorEntry[]` (error log) | Error notification signals |

### 8.2 Signal Mapping Pattern

Area 7 creates Angular signals by selecting from `RunState`:

```typescript
// Area 7 (not implemented by Area 8) — example signal derivation:
// runStateSignal = signal<RunState>(initialState);
// roundPhaseSignal = computed(() => runStateSignal().roundState?.roundPhase ?? null);
// handSignal = computed(() => runStateSignal().roundState?.hand ?? []);
// deckSizeSignal = computed(() => runStateSignal().deckState.totalCount);
// errorCountSignal = computed(() => runStateSignal().errorLog.length);
```

### 8.3 Boundary Rules

- **Area 8 must not** define Angular services, signals, or components.
- **Area 8 must not** import from `@angular/*`.
- **Area 8 must** export all state schemas, transition functions, invariant checks, persistence functions, and recovery functions through its barrel `index.ts`.
- **Area 7 must** be the only consumer that maps `RunState` to Angular signals.

---

## 9. Unit Test Plan

### 9.1 Model Tests

| Test File | Coverage |
|-----------|----------|
| `tests/models/run-state.model.spec.ts` | Factory functions for creating valid `RunState`, `RoundState`, `DeckState`, `MeldState` test fixtures; verifies all required fields are present |

### 9.2 Transition Tests

| Test File | Coverage |
|-----------|----------|
| `tests/transitions/round-phase.spec.ts` | All valid round transitions; invalid transitions blocked; guard conditions (score target, final round) |
| `tests/transitions/turn-phase.spec.ts` | All valid turn transitions; invalid transitions blocked; GoOut guard via `canGoOut()` |
| `tests/transitions/can-transition.spec.ts` | `canTransitionRoundPhase()` and `canTransitionTurnPhase()` with all guard contexts |

### 9.3 Invariant Tests

| Test File | Coverage |
|-----------|----------|
| `tests/invariants/deck-size.invariant.spec.ts` | Pass at 20, 108; fail at 19, 109 |
| `tests/invariants/card-location.invariant.spec.ts` | Pass with exactly one location; fail with zero or multiple locations |
| `tests/invariants/hand-size.invariant.spec.ts` | Pass at 0–50 during Play; fail at 51; skip during non-Play phases |
| `tests/invariants/card-count.invariant.spec.ts` | Pass when all cards accounted for; fail when count mismatches |
| `tests/invariants/meld-consistency.invariant.spec.ts` | Pass when meld references match deck card locations; fail on mismatches |
| `tests/invariants/sealed-minimum.invariant.spec.ts` | Pass at 7+ cards; fail at 6; skip unsealed melds |
| `tests/invariants/score-nonneg.invariant.spec.ts` | Pass at 0+; fail at negative values |
| `tests/invariants/phase-validity.invariant.spec.ts` | Pass for valid round/turn phase combinations; fail for invalid ones |
| `tests/invariants/wild-economy.invariant.spec.ts` | Pass when wild counts match actual card locations; fail on mismatch |
| `tests/invariants/schema-version.invariant.spec.ts` | Pass for versions 1–CURRENT; fail for 0 and CURRENT+1 |
| `tests/invariants/validate-all.spec.ts` | Orchestrator runs all 10 checks; aggregates violations correctly |

### 9.4 Persistence Tests

| Test File | Coverage |
|-----------|----------|
| `tests/persistence/serialize.spec.ts` | `serializeRunState` produces valid JSON; `deserializeRunState` parses it back |
| `tests/persistence/auto-save.spec.ts` | Auto-save writes to localStorage; updates `lastSavedAt` and `saveCount`; debounce timing |
| `tests/persistence/load.spec.ts` | Load from localStorage; fallback to IndexedDB stub; schema version validation; migration trigger; invariant validation on load |
| `tests/persistence/migration.spec.ts` | Sequential migration v1→v2→v3; missing migration function error; migration failure error |
| `tests/persistence/round-trip.spec.ts` | Full round-trip: serialize → deserialize → verify all fields identical; pre and post invariants pass |

### 9.5 Recovery Tests

| Test File | Coverage |
|-----------|----------|
| `tests/recovery/rollback.spec.ts` | Rollback restores `lastValidState`; fallback to reset when `lastValidState` is null; fallback when `lastValidState` is also invalid |
| `tests/recovery/reset.spec.ts` | Reset preserves deck and modifier state; resets round-specific state; handles null roundState |
| `tests/recovery/strategy-selector.spec.ts` | All 9 rows of the decision table produce the correct `RecoveryStrategy` |
| `tests/recovery/rendering-error.spec.ts` | Rendering error is logged; game state is unchanged; `recovered: true` |

---

## 10. Dependencies

### 10.1 Upstream Dependencies (Areas 1–4)

Area 8 imports types and functions from all four upstream game-logic areas:

```typescript
// Area 1 — Game Rules & Core Mechanics
import type { Card, Meld, CanastaType, CanastaScoreResult, TurnPhase, MeldValidationResult, GoOutCondition, BossRuleHookSet, MeldValidationContext } from '../area1-game-rules';
import { validateMeld, scoreCanasta, determineCanastaType, canGoOut, getCardPointValue, computeCardPointTotal, getCanastaBonus } from '../area1-game-rules';

// Area 2 — Deckbuilding & Run Structure
import type { RoundPhase, ShopState, Ante, Round, RunProgression, CardPoolEntry } from '../area2-deckbuilding';
import { roundScoreTarget, baseScoreTarget, dealInitialHand, buildRound } from '../area2-deckbuilding';

// Area 3 — Modifier Systems
import type { ActiveModifierState, PartnerSlot, HouseRule, Scorepad, TraySlot, BossRule, AppliedModifierRecord } from '../area3-modifier-systems';
import { runModifierPipeline, selectBossRule, applyScoreCap } from '../area3-modifier-systems';

// Area 4 — Card Enhancements & Wild Card Economy
import type { Enhancement, WildCardEconomyState } from '../area4-card-enhancements';
```

### 10.2 Downstream Dependency (Area 7)

Area 8 exports all state schemas, transition functions, invariant checks, persistence functions, and recovery functions. Area 7 imports from Area 8's barrel export to build Angular signals:

```typescript
// Area 7 imports from Area 8:
import type { RunState, RoundState, DeckState, MeldState, StateErrorEntry, ErrorCategory, RecoveryStrategy } from '../area8-state';
import { validateAllInvariants, canTransitionRoundPhase, canTransitionTurnPhase, autoSave, loadRunState } from '../area8-state';
```

### 10.3 No Angular Dependencies

Area 8 must not import from `@angular/*`. It is a pure TypeScript domain layer with no framework coupling.

---

## 11. Implementation Order

Implement in the following order to respect dependency chains and enable incremental testing:

1. **Schema version constant** — `constants/schema-version.ts` (no dependencies)
2. **Error & recovery types** — `models/error.model.ts` (no dependencies)
3. **Phase transition constants** — `constants/phase-transitions.ts` (depends on Area 1's `TurnPhase` and Area 2's `RoundPhase`)
4. **State model interfaces** — `models/round-state.model.ts`, `deck-state.model.ts`, `meld-state.model.ts`, `run-state.model.ts` (depends on Areas 1–4 types)
5. **Model barrel export** — `models/index.ts`
6. **Invariant check functions** — all 10 invariants in `invariants/` (depends on models)
7. **`validateAllInvariants` orchestrator** — `invariants/validate-all.ts` (depends on all 10 invariants)
8. **Phase transition functions** — `transitions/round-phase.ts`, `turn-phase.ts`, `can-transition.ts` (depends on models and constants)
9. **Serialization** — `persistence/serialize.ts` (depends on models)
10. **Storage stubs** — `persistence/storage.ts` (localStorage MVP, IndexedDB stub)
11. **Auto-save** — `persistence/auto-save.ts` (depends on serialization and storage)
12. **Migration** — `persistence/migration.ts` (depends on models)
13. **Load** — `persistence/load.ts` (depends on serialization, storage, migration, and invariants)
14. **Persistence barrel export** — `persistence/index.ts`
15. **Recovery strategy selector** — `recovery/strategy-selector.ts` (depends on error types)
16. **Rollback** — `recovery/rollback.ts` (depends on invariants and models)
17. **Reset** — `recovery/reset.ts` (depends on invariants and models)
18. **Rendering error handler** — `recovery/rendering-error.ts` (depends on error types)
19. **Error log retention** — `recovery/error-log.ts` (depends on error types)
20. **Recovery barrel export** — `recovery/index.ts`
21. **Public API barrel export** — `index.ts` (depends on all sub-modules)
22. **Unit tests** — all test files in `tests/` (depends on completed implementation)

---

## 12. Acceptance Criteria

### Schema Completeness

- [ ] All 10 TypeScript interfaces are defined: `RoundState`, `DeckState`, `DeckCardState`, `MeldState`, `MeldCardEntry`, `MeldScoreRecord`, `RunState`, `StateErrorEntry`, `ErrorCategory`, `RecoveryStrategy`
- [ ] No `any` types; no partial types; all fields required with explicit `| null` instead of optional `?`
- [ ] `CURRENT_SCHEMA_VERSION` constant is exported and equals `1`
- [ ] All imports from Areas 1–4 are correctly typed and used

### Phase Transitions

- [ ] Round phase transition table is implemented with all valid transitions and guard conditions
- [ ] Turn phase transition table is implemented with all valid transitions and guard conditions
- [ ] `canTransitionRoundPhase()` correctly evaluates score target and final round guards
- [ ] `canTransitionTurnPhase()` correctly delegates GoOut guard to Area 1's `canGoOut()`
- [ ] Invalid transitions are rejected

### State Invariants

- [ ] All 10 invariants are implemented as individual check functions
- [ ] `validateAllInvariants()` orchestrator runs all checks and aggregates violations
- [ ] Each invariant correctly passes for valid states and fails for invalid states
- [ ] Invariant checks are pure functions with no side effects

### Persistence

- [ ] `serializeRunState()` produces valid JSON via `JSON.stringify()`
- [ ] `deserializeRunState()` parses JSON back to `RunState`
- [ ] Full round-trip (serialize → deserialize) preserves all fields
- [ ] Auto-save writes to localStorage with correct key `congero:run:{runId}`
- [ ] Auto-save updates `lastSavedAt` and `saveCount`
- [ ] Debounce timing is implemented per trigger type
- [ ] `saveWithRetry()` retries up to 3 times with exponential backoff (100ms, 200ms, 400ms)
- [ ] `loadRunState()` reads from localStorage, falls back to IndexedDB stub
- [ ] `loadRunState()` rejects saves with `schemaVersion > CURRENT_SCHEMA_VERSION`
- [ ] `loadRunState()` triggers migration when `schemaVersion < CURRENT_SCHEMA_VERSION`
- [ ] `loadRunState()` validates invariants after load and migration
- [ ] Migration functions are applied sequentially (v1→v2→v3, never v1→v3 directly)
- [ ] Each migration function is pure and idempotent

### Error Handling & Recovery

- [ ] All 8 `ErrorCategory` values are defined
- [ ] All 6 `RecoveryStrategy` values are defined
- [ ] Strategy selector decision table covers all 9 rows correctly
- [ ] `rollbackToLastValid()` restores `lastValidState` snapshot
- [ ] `rollbackToLastValid()` falls back to `resetToRoundStart()` when `lastValidState` is null or invalid
- [ ] `resetToRoundStart()` preserves deck state and modifier state
- [ ] `resetToRoundStart()` resets round-specific state
- [ ] `handleRenderingError()` logs the error without mutating game state
- [ ] Error log is capped at 100 entries with FIFO eviction
- [ ] All recovery actions append a `StateErrorEntry` to the error log

### DSFR Integration

- [ ] Area 8 exports all state schemas through barrel `index.ts`
- [ ] Area 8 exports all transition, invariant, persistence, and recovery functions
- [ ] Area 8 has zero imports from `@angular/*`
- [ ] All functions are pure transforms with no framework coupling

### Test Coverage

- [ ] All 22+ test files pass
- [ ] Every invariant has a dedicated test file with pass and fail cases
- [ ] Every transition has valid and invalid test cases
- [ ] Persistence round-trip test verifies full serialize→deserialize fidelity
- [ ] Recovery tests cover all 9 decision table rows
- [ ] Error log retention test verifies FIFO eviction at 100 entries
