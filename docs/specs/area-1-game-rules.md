# Area 1: Game Rules & Core Mechanics — Technical Specification & Implementation Plan

## 1. Overview

This document specifies the implementation of **Area 1 — Game Rules & Core Mechanics** for Congero, a canasta-style card game built with Angular and TypeScript.

Area 1 is the **authoritative source of truth** for all canasta rule logic. It owns:

- **Data models** — `Card`, `Meld`, `TurnState`, and all supporting types.
- **Card point values** — the fixed mapping from rank/suit to point value.
- **Meld validity** — a pure function that determines whether a proposed meld is legal, with a 9-condition decision table evaluated in order.
- **Canasta type eligibility** — a pure function that classifies a sealed meld into one of seven types (`natural`, `dirty`, `super`, `red`, `frozen`, `partner`, `concealedOut`).
- **Scoring formulas** — pure functions that compute card point totals, canasta bonuses, and base scores.
- **Turn structure state machine** — four phases (`Draw`, `Meld`, `Discard`, `GoOut`) with valid transitions and named boss-rule injection hooks.
- **Going-out conditions** — a pure function that determines whether a player may end the round.

All functions in this area are **pure transforms** (DSFR TRANSFORM role). They accept inputs and return outputs with no side effects, no dependency on external state, and no mutation of their arguments. This makes them independently testable and free of Angular runtime dependencies.

**Out of scope:** modifier pipelines (Area 3), state persistence (Area 8), UI rendering (Area 5), Angular service wiring (Area 7), and wild-card substitution details beyond meld validity (Area 4).

**Reference design doc:** `.kiro/specs/congero-game-rules/design.md`

---

## 2. File Structure

All source files live under `src/app/core/game-rules/`. Tests mirror the source structure under `src/app/core/game-rules/**/*.spec.ts`.

```
src/app/core/game-rules/
├── models/
│   ├── card.model.ts            # Suit, Rank, Card types
│   ├── meld.model.ts            # Meld, CanastaType types
│   ├── turn.model.ts            # TurnPhase, GoOutCondition, TurnState types
│   ├── validation.model.ts      # MeldRejectionReason, MeldValidationResult, MeldValidationContext
│   ├── scoring.model.ts         # CanastaScoreResult
│   └── boss-rule-hooks.model.ts # BossRuleHookSet interface
├── constants/
│   ├── card-values.ts           # Point value lookup table, RED_ENHANCEMENT_MARKER_ID
│   └── canasta-bonuses.ts       # Canasta bonus lookup table
├── transforms/
│   ├── get-card-point-value.ts  # getCardPointValue()
│   ├── validate-meld.ts         # validateMeld()
│   ├── determine-canasta-type.ts# determineCanastaType()
│   ├── score-canasta.ts         # scoreCanasta(), getCanastaBonus(), computeCardPointTotal()
│   └── can-go-out.ts            # canGoOut()
├── state-machine/
│   └── turn-phase.ts            # Phase transition table & validation
├── index.ts                     # Public API barrel export
└── tests/
    ├── get-card-point-value.spec.ts
    ├── validate-meld.spec.ts
    ├── determine-canasta-type.spec.ts
    ├── score-canasta.spec.ts
    └── can-go-out.spec.ts
```

### Barrel Export (`index.ts`)

The barrel file re-exports every public type and function so that downstream areas (3, 4, 8) import from a single entry point:

```typescript
// Models
export type { Suit, Rank } from './models/card.model';
export type { Card } from './models/card.model';
export type { Meld, CanastaType } from './models/meld.model';
export type { TurnPhase, GoOutCondition, TurnState } from './models/turn.model';
export type { MeldRejectionReason, MeldValidationResult, MeldValidationContext } from './models/validation.model';
export type { CanastaScoreResult } from './models/scoring.model';
export type { BossRuleHookSet } from './models/boss-rule-hooks.model';

// Constants
export { RED_ENHANCEMENT_MARKER_ID } from './constants/card-values';
export { CANASTA_BONUS } from './constants/canasta-bonuses';

// Transforms
export { getCardPointValue } from './transforms/get-card-point-value';
export { validateMeld } from './transforms/validate-meld';
export { determineCanastaType } from './transforms/determine-canasta-type';
export { scoreCanasta, getCanastaBonus, computeCardPointTotal } from './transforms/score-canasta';
export { canGoOut } from './transforms/can-go-out';

// State machine
export { isValidPhaseTransition, VALID_TRANSITIONS } from './state-machine/turn-phase';
```

---

## 3. Interfaces & Types

Every type is fully specified with no `any` and no partial/optional fields unless explicitly noted with `| null`.

### 3.1 `Suit` and `Rank` — `models/card.model.ts`

```typescript
export type Suit = 'clubs' | 'diamonds' | 'hearts' | 'spades';

export type Rank =
  | '2' | '3' | '4' | '5' | '6' | '7'
  | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A'
  | 'JOKER';
```

### 3.2 `Card` — `models/card.model.ts`

```typescript
export interface Card {
  id: string;
  rank: Rank;
  suit: Suit | null;       // null for Jokers
  pointValue: number;
  isWild: boolean;          // true when rank === '2' or rank === 'JOKER'
  isRedThree: boolean;      // rank '3' + suit 'hearts' | 'diamonds'
  isBlackThree: boolean;    // rank '3' + suit 'clubs' | 'spades'
  enhancementId: string | null;
}
```

### 3.3 `Meld` — `models/meld.model.ts`

```typescript
export interface Meld {
  id: string;
  rank: Rank;
  cards: Card[];
  canastaType: CanastaType | null;
  isSealed: boolean;
  cardPointTotal: number;
  completedFromDiscard: boolean;
  completedConcealed: boolean;
  traySlotId: string | null;
}
```

### 3.4 `CanastaType` — `models/meld.model.ts`

```typescript
export type CanastaType =
  | 'natural'
  | 'dirty'
  | 'super'
  | 'red'
  | 'frozen'
  | 'partner'
  | 'concealedOut';
```

### 3.5 `TurnPhase` — `models/turn.model.ts`

```typescript
export type TurnPhase = 'Draw' | 'Meld' | 'Discard' | 'GoOut';
```

### 3.6 `GoOutCondition` — `models/turn.model.ts`

```typescript
export type GoOutCondition = 'normal' | 'concealedOut' | 'partnerCanasta';
```

### 3.7 `TurnState` — `models/turn.model.ts`

```typescript
export interface TurnState {
  phase: TurnPhase;
  hand: Card[];
  melds: Meld[];
  discardPileTop: Card | null;
  discardPileFrozen: boolean;
  canastasCompletedThisTurn: number;
  hasAtLeastOneCanasta: boolean;
}
```

### 3.8 `MeldRejectionReason` and `MeldValidationResult` — `models/validation.model.ts`

```typescript
export type MeldRejectionReason =
  | 'INSUFFICIENT_CARDS'
  | 'RANK_MISMATCH'
  | 'ILLEGAL_RANK'
  | 'TOO_MANY_WILDS'
  | 'WILD_MAJORITY'
  | 'EXTENDS_SEALED_WRONG_RANK'
  | 'BLACK_THREE_MELD_ATTEMPT'
  | 'DISCARD_PILE_LOCKED'
  | 'HOOK_REJECTED';

export interface MeldValidationResult {
  valid: boolean;
  rejectionReason: MeldRejectionReason | null;
  rejectionMessage: string | null;
}
```

### 3.9 `MeldValidationContext` — `models/validation.model.ts`

```typescript
export interface MeldValidationContext {
  anchorEnhancementActive: boolean;
  discardPileFrozen: boolean;
  discardPileTopCard: Card | null;
  matchingHandCards: Card[];
  hookOverrides: BossRuleHookSet;
}
```

### 3.10 `CanastaScoreResult` — `models/scoring.model.ts`

```typescript
export interface CanastaScoreResult {
  canastaType: CanastaType;
  cardPointTotal: number;
  canastaBonus: number;
  baseTotal: number;
}
```

### 3.11 `BossRuleHookSet` — `models/boss-rule-hooks.model.ts`

```typescript
export interface BossRuleHookSet {
  ON_TURN_START?: (state: TurnState) => TurnState;
  ON_DRAW_COMPLETE?: (state: TurnState, drawnCards: Card[]) => TurnState;
  ON_MELD_VALIDATE?: (
    proposedCards: Card[],
    existingMeld: Meld | null,
    context: MeldValidationContext
  ) => { allowed: boolean; reason?: string };
  ON_MELD_PLACED?: (state: TurnState, meld: Meld) => TurnState;
  ON_CANASTA_SEALED?: (meld: Meld, canastaType: CanastaType) => { meld: Meld; canastaType: CanastaType };
  ON_CANASTA_SCORED?: (result: CanastaScoreResult) => CanastaScoreResult;
  ON_DISCARD?: (state: TurnState, discardedCard: Card) => TurnState;
  ON_GO_OUT_ATTEMPT?: (state: TurnState, condition: GoOutCondition) => { allowed: boolean; reason?: string };
  ON_TURN_END?: (state: TurnState) => TurnState;
}
```

---

## 4. Pure Transforms (DSFR TRANSFORM Role)

Every function in this section is a **pure function**: no side effects, no mutation of inputs, no external state access. Each is independently unit-testable.

### 4.1 `getCardPointValue`

**File:** `transforms/get-card-point-value.ts`

**Signature:**

```typescript
function getCardPointValue(rank: Rank, suit: Suit | null): number
```

**Inputs:**
- `rank` — the card's rank (one of the `Rank` union members).
- `suit` — the card's suit, or `null` for Jokers.

**Output:** The fixed point value for that card.

**Logic:** Exhaustive switch/if-else on rank, with a nested check for red vs. black threes:

| Rank | Condition | Point Value |
|------|-----------|-------------|
| `JOKER` | — | 50 |
| `2` | — | 20 |
| `A` | — | 20 |
| `K`, `Q`, `J`, `10`, `9`, `8` | — | 10 |
| `7`, `6`, `5`, `4` | — | 5 |
| `3` | `suit` is `'hearts'` or `'diamonds'` | 100 |
| `3` | `suit` is `'clubs'` or `'spades'` | 5 |
| *exhaustive* | — | throws `Error` |

**Edge cases:**
- Jokers always return 50 regardless of suit (suit is `null`).
- Rank `'2'` always returns 20 (it is always wild).
- The function is total over the `Rank` union — the `throw` branch is unreachable in correct usage but serves as a TypeScript exhaustiveness guard.

---

### 4.2 `validateMeld`

**File:** `transforms/validate-meld.ts`

**Signature:**

```typescript
function validateMeld(
  proposedCards: Card[],
  existingMeld: Meld | null,
  context: MeldValidationContext
): MeldValidationResult
```

**Inputs:**
- `proposedCards` — the cards the player wants to add (to a new or existing meld).
- `existingMeld` — the meld being extended, or `null` for a brand-new meld.
- `context` — validation context (enhancement flags, discard pile state, hook overrides).

**Output:** `MeldValidationResult` — `{ valid: true, rejectionReason: null, rejectionMessage: null }` on success, or `{ valid: false, rejectionReason: <code>, rejectionMessage: <string> }` on failure.

**Logic — 9-condition decision table (evaluated in order):**

| # | Condition | Rejection Reason |
|---|-----------|-----------------|
| 1 | Any proposed card has `rank === '3'` | `ILLEGAL_RANK` |
| 2 | Any proposed card is a black three (`isBlackThree === true`) | `BLACK_THREE_MELD_ATTEMPT` |
| 3 | `proposedCards.length < minimumMeldSize` where `minimumMeldSize = anchorEnhancementActive ? 2 : 3` | `INSUFFICIENT_CARDS` |
| 4 | Non-wild cards in `proposedCards` do not all share the same rank | `RANK_MISMATCH` |
| 5 | `existingMeld !== null` and the natural rank of proposed cards does not match `existingMeld.rank` | `EXTENDS_SEALED_WRONG_RANK` |
| 6 | Wild count in the combined meld ≥ total card count (zero naturals) | `TOO_MANY_WILDS` |
| 7 | Wild count in the combined meld ≥ natural card count (wilds not strictly fewer) | `WILD_MAJORITY` |
| 8 | Taking frozen discard pile AND fewer than 2 natural matching cards in hand | `DISCARD_PILE_LOCKED` |
| 9 | `context.hookOverrides.ON_MELD_VALIDATE` exists and returns `{ allowed: false }` | `HOOK_REJECTED` |

**Key implementation details:**
- The "combined meld" for rules 6–7 is `existingMeld.cards + proposedCards` when extending, or just `proposedCards` for a new meld.
- Rule 6 catches the degenerate case of a meld with zero natural cards.
- Rule 7 enforces the standard canasta constraint: wilds must be **strictly fewer** than natural cards.
- Rule 8 only fires when `discardPileTopCard !== null` and `discardPileFrozen === true`.
- The function returns on the **first** matching rejection condition (short-circuit evaluation).

---

### 4.3 `determineCanastaType`

**File:** `transforms/determine-canasta-type.ts`

**Signature:**

```typescript
function determineCanastaType(meld: Meld, turnState: TurnState): CanastaType
```

**Inputs:**
- `meld` — the meld to classify (must have ≥ 7 cards and `isSealed === true`).
- `turnState` — current turn state (used for `concealedOut` detection).

**Output:** A single `CanastaType` value.

**Logic — priority-ordered decision table:**

| Priority | Type | Condition |
|----------|------|-----------|
| 1 | `super` | `totalCount >= 10` |
| 2 | `concealedOut` | `meld.completedConcealed && turnState.phase === 'GoOut'` |
| 3 | `frozen` | `meld.completedFromDiscard` |
| 4 | *(partner)* | Detected at turn level, not meld level — see `canGoOut` |
| 5 | `red` | All natural cards have `enhancementId === RED_ENHANCEMENT_MARKER_ID` |
| 6 | `natural` | `wildCount === 0` |
| 7 | `dirty` | `wildCount >= 1 && wildCount < naturalCount` |

**Key implementation details:**
- `super` is a size-based upgrade that stacks on top of `natural` or `dirty`. A super canasta is still scored as `super` (bonus 1000) rather than `natural` + `super`.
- `partner` is **not** determined at the meld level. It is a turn-level event detected by `canGoOut` when `canastasCompletedThisTurn >= 2`.
- `red` requires that **every** natural card in the meld carries the red enhancement marker.
- The function assumes the meld has already passed `validateMeld` and has ≥ 7 cards.

---

### 4.4 `scoreCanasta`

**File:** `transforms/score-canasta.ts`

**Signature:**

```typescript
function scoreCanasta(meld: Meld, canastaType: CanastaType): CanastaScoreResult
```

**Inputs:**
- `meld` — the sealed meld to score.
- `canastaType` — the type returned by `determineCanastaType`.

**Output:** `CanastaScoreResult` with `cardPointTotal`, `canastaBonus`, and `baseTotal`.

**Logic:**

```
cardPointTotal = computeCardPointTotal(meld)
canastaBonus    = getCanastaBonus(canastaType)
baseTotal       = cardPointTotal + canastaBonus
```

---

### 4.5 `getCanastaBonus`

**File:** `transforms/score-canasta.ts` (co-located with `scoreCanasta`)

**Signature:**

```typescript
function getCanastaBonus(canastaType: CanastaType): number
```

**Input:** A `CanastaType` value.

**Output:** The base bonus for that canasta type.

**Lookup table:**

| CanastaType | Base Bonus |
|-------------|-----------|
| `natural` | 500 |
| `dirty` | 300 |
| `super` | 1000 |
| `red` | 800 |
| `frozen` | 400 |
| `partner` | 200 |
| `concealedOut` | 500 |

**Key implementation details:**
- `super` replaces the natural/dirty bonus entirely (not additive).
- `partner` is awarded per meld involved as a separate event bonus.
- `concealedOut` replaces the normal going-out bonus.
- Includes a TypeScript `never` exhaustiveness guard.

---

### 4.6 `canGoOut`

**File:** `transforms/can-go-out.ts`

**Signature:**

```typescript
function canGoOut(state: TurnState, condition: GoOutCondition): boolean
```

**Inputs:**
- `state` — the current turn state.
- `condition` — the going-out condition to check.

**Output:** `true` if the player may go out under the given condition.

**Logic per condition:**

| Condition | Requirements |
|-----------|-------------|
| `normal` | `hasAtLeastOneCanasta === true` AND `hand.length === 0` |
| `concealedOut` | `melds.every(m => m.completedConcealed)` AND `canastasCompletedThisTurn >= 1` AND `hand.length === 0` |
| `partnerCanasta` | `canastasCompletedThisTurn >= 2` AND `hand.length === 0` |

**Key implementation details:**
- Going out is impossible without at least one sealed canasta (enforced by `normal`; the other conditions require canastas by definition).
- `concealedOut` requires that **every** meld on the table was completed concealed — any prior table activity disqualifies.
- `partnerCanasta` requires at least 2 canastas sealed in the **same turn** (not round).
- Black threes may be discarded as the final card to reach `hand.length === 0` — this is valid because the discard is not a meld attempt.

---

### 4.7 `computeCardPointTotal`

**File:** `transforms/score-canasta.ts` (co-located with `scoreCanasta`)

**Signature:**

```typescript
function computeCardPointTotal(meld: Meld): number
```

**Input:** A `Meld` object.

**Output:** The sum of `card.pointValue` for every card in `meld.cards`.

**Logic:**

```typescript
return meld.cards.reduce((sum, card) => sum + card.pointValue, 0);
```

---

## 5. State Machine

### 5.1 Turn Phase Transitions

**File:** `state-machine/turn-phase.ts`

The turn progresses through four phases with the following valid transitions:

```
(start) ──► Draw
Draw    ──► Meld
Draw    ──► Discard     (skip Meld)
Draw    ──► GoOut       (skip Meld + Discard, only if canGoOut)
Meld    ──► Discard
Meld    ──► GoOut       (only if canGoOut)
Discard ──► [Turn ends]
GoOut   ──► [Round ends]
```

**Transition table:**

| From \ To | Draw | Meld | Discard | GoOut |
|-----------|------|------|---------|-------|
| *(start)* | ✓ | — | — | — |
| Draw | — | ✓ | ✓ | ✓* |
| Meld | — | — | ✓ | ✓* |
| Discard | — | — | — | — |
| GoOut | — | — | — | — |

*\* Only when `canGoOut(turnState) === true`.*

**Implementation:**

```typescript
export const VALID_TRANSITIONS: Record<TurnPhase, TurnPhase[]> = {
  Draw: ['Meld', 'Discard', 'GoOut'],
  Meld: ['Discard', 'GoOut'],
  Discard: [],
  GoOut: [],
};

export function isValidPhaseTransition(
  from: TurnPhase,
  to: TurnPhase,
  canGoOut: boolean
): boolean {
  const allowed = VALID_TRANSITIONS[from];
  if (!allowed.includes(to)) return false;
  if (to === 'GoOut' && !canGoOut) return false;
  return true;
}
```

### 5.2 Boss Rule Hook Firing Points

Each hook fires at a specific boundary in the turn lifecycle. The hooks are defined in `BossRuleHookSet` and consumed by the state machine orchestrator (Area 8).

| Hook Name | Fires When | Signature |
|-----------|-----------|-----------|
| `ON_TURN_START` | Entering `Draw` phase | `(state: TurnState) => TurnState` |
| `ON_DRAW_COMPLETE` | After draw action completes | `(state: TurnState, drawnCards: Card[]) => TurnState` |
| `ON_MELD_VALIDATE` | Before any meld is accepted | `(proposedCards, existingMeld, context) => { allowed: boolean; reason?: string }` |
| `ON_MELD_PLACED` | After meld is placed on table | `(state: TurnState, meld: Meld) => TurnState` |
| `ON_CANASTA_SEALED` | When meld reaches ≥7 cards | `(meld: Meld, canastaType: CanastaType) => { meld: Meld; canastaType: CanastaType }` |
| `ON_CANASTA_SCORED` | When `scoreCanasta()` is called | `(result: CanastaScoreResult) => CanastaScoreResult` |
| `ON_DISCARD` | When player discards a card | `(state: TurnState, discardedCard: Card) => TurnState` |
| `ON_GO_OUT_ATTEMPT` | When player attempts to go out | `(state: TurnState, condition: GoOutCondition) => { allowed: boolean; reason?: string }` |
| `ON_TURN_END` | After `Discard` or `GoOut` resolves | `(state: TurnState) => TurnState` |

---

## 6. Boss Rule Hooks

### 6.1 `BossRuleHookSet` Interface

Defined in `models/boss-rule-hooks.model.ts` (see Section 3.11). All fields are optional — a boss rule only provides the hooks it needs to override.

### 6.2 Consumption Pattern

Boss rules (Area 3) populate a `BossRuleHookSet` instance and pass it into the game rules engine via `MeldValidationContext.hookOverrides`. The engine calls each hook at its designated firing point **only if the hook is defined**.

**Consumption contract:**

1. `validateMeld` checks `context.hookOverrides.ON_MELD_VALIDATE` — if present, calls it and respects its `allowed` return value.
2. `scoreCanasta` does **not** call hooks directly. Instead, the orchestrator (Area 8) calls `ON_CANASTA_SCORED` on the result after `scoreCanasta` returns.
3. `canGoOut` does **not** call hooks directly. The orchestrator calls `ON_GO_OUT_ATTEMPT` before evaluating `canGoOut`.
4. All other hooks (`ON_TURN_START`, `ON_DRAW_COMPLETE`, etc.) are called by the orchestrator at phase boundaries, not by the pure transforms themselves.

**Key constraint:** Area 3 must **not** redefine `scoreCanasta()` or `validateMeld()`. It must call them and compose on top of their results via the hook interface.

### 6.3 Extension Points for Other Areas

| Area | Extension Point | How Area 1 Exposes It |
|------|----------------|----------------------|
| Area 3 (Modifiers) | `BossRuleHookSet` | All 9 named hooks; `MeldValidationContext.hookOverrides` |
| Area 4 (Enhancements) | `anchorEnhancementActive` | Boolean in `MeldValidationContext` |
| Area 4 (Enhancements) | `RED_ENHANCEMENT_MARKER_ID` | Constant `'red-marker'` referenced by `determineCanastaType` |
| Area 8 (State) | Function signatures | `validateMeld`, `scoreCanasta`, `canGoOut`, `determineCanastaType` |

---

## 7. Unit Test Plan

### 7.1 `tests/get-card-point-value.spec.ts`

Covers the `getCardPointValue` function:

- **Joker** returns 50 (regardless of suit).
- **Rank 2** returns 20.
- **Rank A** returns 20.
- **Ranks K, Q, J, 10, 9, 8** each return 10.
- **Ranks 7, 6, 5, 4** each return 5.
- **Red 3** (hearts, diamonds) returns 100.
- **Black 3** (clubs, spades) returns 5.
- **Exhaustiveness** — every `Rank` value is covered; no unhandled cases.

### 7.2 `tests/validate-meld.spec.ts`

Covers the `validateMeld` function with the full decision table:

- **Rule 1** — proposing any card with `rank === '3'` → `ILLEGAL_RANK`.
- **Rule 2** — proposing a black three → `BLACK_THREE_MELD_ATTEMPT`.
- **Rule 3** — fewer than 3 cards (or fewer than 2 with Anchor) → `INSUFFICIENT_CARDS`.
- **Rule 4** — mixed natural ranks → `RANK_MISMATCH`.
- **Rule 5** — extending an existing meld with wrong rank → `EXTENDS_SEALED_WRONG_RANK`.
- **Rule 6** — all-wild meld (zero naturals) → `TOO_MANY_WILDS`.
- **Rule 7** — wild count ≥ natural count → `WILD_MAJORITY`.
- **Rule 8** — frozen discard pile with insufficient matching naturals → `DISCARD_PILE_LOCKED`.
- **Rule 9** — `ON_MELD_VALIDATE` hook returns `{ allowed: false }` → `HOOK_REJECTED`.
- **Happy path** — valid 3-card natural meld → `{ valid: true }`.
- **Happy path** — valid 7-card meld with 2 wilds → `{ valid: true }`.
- **Anchor enhancement** — 2-card meld accepted when `anchorEnhancementActive === true`.
- **Anchor enhancement** — 2-card meld rejected when `anchorEnhancementActive === false`.
- **Short-circuit** — first matching rule wins (e.g., a 3-card meld containing a three rejects with `ILLEGAL_RANK`, not `INSUFFICIENT_CARDS`).

### 7.3 `tests/determine-canasta-type.spec.ts`

Covers the `determineCanastaType` function:

- **Super** — 10+ cards → `super` (regardless of wild count).
- **Super with wilds** — 10 cards, 3 wilds → `super`.
- **Concealed out** — `completedConcealed === true` and phase is `GoOut` → `concealedOut`.
- **Frozen** — `completedFromDiscard === true` → `frozen`.
- **Red** — all natural cards have red enhancement marker → `red`.
- **Natural** — 7+ cards, 0 wilds → `natural`.
- **Dirty** — 7+ cards, 1+ wilds, wilds < naturals → `dirty`.
- **Priority** — 10 cards with 0 wilds → `super` (not `natural`).
- **Priority** — concealed out takes priority over frozen when both flags are true.
- **7-card natural** — exactly 7 cards, 0 wilds → `natural`.
- **7-card dirty** — exactly 7 cards, 3 wilds (wilds < naturals) → `dirty`.

### 7.4 `tests/score-canasta.spec.ts`

Covers `scoreCanasta`, `getCanastaBonus`, and `computeCardPointTotal`:

- **Natural bonus** — `getCanastaBonus('natural')` returns 500.
- **Dirty bonus** — `getCanastaBonus('dirty')` returns 300.
- **Super bonus** — `getCanastaBonus('super')` returns 1000.
- **Red bonus** — `getCanastaBonus('red')` returns 800.
- **Frozen bonus** — `getCanastaBonus('frozen')` returns 400.
- **Partner bonus** — `getCanastaBonus('partner')` returns 200.
- **Concealed out bonus** — `getCanastaBonus('concealedOut')` returns 500.
- **Card point total** — 7 Queens → 70.
- **Full scoring** — 7 Queens, natural → `{ cardPointTotal: 70, canastaBonus: 500, baseTotal: 570 }`.
- **Full scoring** — 7 Queens + 2 Jokers, dirty → `{ cardPointTotal: 170, canastaBonus: 300, baseTotal: 470 }`.
- **Super scoring** — 10 cards, super → bonus is 1000 (not 500 + 1000).
- **Exhaustiveness** — all `CanastaType` values are handled.

### 7.5 `tests/can-go-out.spec.ts`

Covers the `canGoOut` function:

- **Normal** — has canasta + empty hand → `true`.
- **Normal** — no canasta + empty hand → `false`.
- **Normal** — has canasta + non-empty hand → `false`.
- **Concealed out** — all melds concealed + ≥1 canasta this turn + empty hand → `true`.
- **Concealed out** — one meld not concealed → `false`.
- **Concealed out** — no canastas this turn → `false`.
- **Partner canasta** — ≥2 canastas this turn + empty hand → `true`.
- **Partner canasta** — 1 canasta this turn + empty hand → `false`.
- **Black three final discard** — hand has 1 black three, has canasta → after discard, `hand.length === 0` → `true`.
- **No canastas at all** — all conditions return `false`.

### 7.6 `state-machine/turn-phase.spec.ts`

Covers the phase transition table:

- **Valid transitions** — Draw→Meld, Draw→Discard, Draw→GoOut, Meld→Discard, Meld→GoOut.
- **Invalid transitions** — Draw→Draw, Meld→Draw, Meld→Meld, Discard→any, GoOut→any.
- **GoOut gating** — Draw→GoOut and Meld→GoOut return `false` when `canGoOut` is `false`.

---

## 8. Dependencies

**None.** Area 1 is Wave 1 — it has no upstream dependencies on other areas. It uses only:

- TypeScript (type system, unions, interfaces, `never` exhaustiveness).
- No Angular imports.
- No third-party libraries.

Downstream areas depend on Area 1:
- **Area 3** imports `BossRuleHookSet`, `CanastaScoreResult`, `MeldValidationContext`, `TurnState`.
- **Area 4** imports `MeldValidationContext` (for `anchorEnhancementActive`) and `RED_ENHANCEMENT_MARKER_ID`.
- **Area 8** imports all pure transform functions and type signatures.

---

## 9. Implementation Order

Implement in the following order to respect internal dependencies (types before functions, functions before orchestration):

1. **Create model files** — `card.model.ts`, `meld.model.ts`, `turn.model.ts`, `validation.model.ts`, `scoring.model.ts`, `boss-rule-hooks.model.ts`. These have no internal dependencies on other Area 1 files.

2. **Create constants** — `card-values.ts` (point value map, `RED_ENHANCEMENT_MARKER_ID`) and `canasta-bonuses.ts` (bonus lookup table). These depend only on the `Rank` and `CanastaType` types from step 1.

3. **Implement `getCardPointValue`** — `transforms/get-card-point-value.ts`. Depends on `Rank`, `Suit` types and `card-values.ts` constants. Write its unit test in parallel.

4. **Implement `computeCardPointTotal`** — `transforms/score-canasta.ts`. Depends on `Meld` type. Simple reduce; implement before `scoreCanasta`.

5. **Implement `getCanastaBonus`** — co-located in `transforms/score-canasta.ts`. Depends on `CanastaType` and `canasta-bonuses.ts`.

6. **Implement `scoreCanasta`** — co-located in `transforms/score-canasta.ts`. Depends on `computeCardPointTotal` and `getCanastaBonus`. Write its unit test in parallel.

7. **Implement `validateMeld`** — `transforms/validate-meld.ts`. Depends on `Card`, `Meld`, `MeldValidationContext`, `MeldValidationResult`, `BossRuleHookSet`. This is the most complex transform — write its comprehensive decision-table test in parallel.

8. **Implement `determineCanastaType`** — `transforms/determine-canasta-type.ts`. Depends on `Meld`, `TurnState`, `CanastaType`, `RED_ENHANCEMENT_MARKER_ID`. Write its unit test in parallel.

9. **Implement `canGoOut`** — `transforms/can-go-out.ts`. Depends on `TurnState`, `GoOutCondition`. Write its unit test in parallel.

10. **Implement turn phase state machine** — `state-machine/turn-phase.ts`. Depends on `TurnPhase` type. Write its unit test in parallel.

11. **Create barrel export** — `index.ts`. Re-exports all public types and functions.

12. **Run full test suite** — verify all 6 test files pass with 100% coverage on the pure transforms.

---

## 10. Acceptance Criteria

Area 1 is complete when all of the following are satisfied:

### Data Models
- [ ] All 11 TypeScript types/interfaces are defined with no `any` and no partial types: `Suit`, `Rank`, `Card`, `Meld`, `CanastaType`, `TurnPhase`, `GoOutCondition`, `TurnState`, `MeldRejectionReason`, `MeldValidationResult`, `MeldValidationContext`, `CanastaScoreResult`, `BossRuleHookSet`.
- [ ] All fields are required unless explicitly `| null`.
- [ ] `BossRuleHookSet` has all 9 named hooks, all optional.

### Pure Transforms
- [ ] `getCardPointValue` returns correct point values for all 13 rank values (including red/black three distinction).
- [ ] `validateMeld` evaluates all 9 rejection conditions in the correct order and returns the correct `MeldRejectionReason` for each.
- [ ] `validateMeld` returns `{ valid: true }` for valid melds (3+ cards, matching rank, wild constraints satisfied).
- [ ] `validateMeld` respects `anchorEnhancementActive` (minimum size 2 vs 3).
- [ ] `validateMeld` respects `ON_MELD_VALIDATE` hook rejection.
- [ ] `determineCanastaType` correctly classifies all 7 canasta types with correct priority ordering.
- [ ] `determineCanastaType` handles `super` (10+ cards) as highest priority.
- [ ] `scoreCanasta` returns correct `cardPointTotal`, `canastaBonus`, and `baseTotal` for every canasta type.
- [ ] `getCanastaBonus` returns the correct bonus for all 7 canasta types.
- [ ] `computeCardPointTotal` correctly sums `card.pointValue` for all cards in a meld.
- [ ] `canGoOut` returns `true` only when all conditions for the given `GoOutCondition` are met.
- [ ] `canGoOut` returns `false` for `concealedOut` when any meld on the table is not concealed.
- [ ] `canGoOut` returns `false` for `partnerCanasta` when fewer than 2 canastas were completed this turn.

### State Machine
- [ ] `VALID_TRANSITIONS` correctly encodes the 5 valid transitions.
- [ ] `isValidPhaseTransition` returns `false` for all invalid transitions.
- [ ] `isValidPhaseTransition` gates `GoOut` transitions behind the `canGoOut` parameter.

### Constants
- [ ] `RED_ENHANCEMENT_MARKER_ID` is exported as the string `'red-marker'`.
- [ ] Point value and bonus lookup tables are immutable (`as const` or `Object.freeze`).

### Barrel Export
- [ ] `index.ts` re-exports all public types and functions.
- [ ] Downstream areas can import everything from `src/app/core/game-rules` (or the barrel path).

### Unit Tests
- [ ] All 6 test files pass.
- [ ] `get-card-point-value.spec.ts` covers all rank values and the red/black three distinction.
- [ ] `validate-meld.spec.ts` covers all 9 rejection conditions plus happy paths and the Anchor enhancement.
- [ ] `determine-canasta-type.spec.ts` covers all 7 canasta types and priority ordering.
- [ ] `score-canasta.spec.ts` covers all bonus values, card point totals, and full scoring results.
- [ ] `can-go-out.spec.ts` covers all 3 going-out conditions and edge cases.
- [ ] `turn-phase.spec.ts` covers valid transitions, invalid transitions, and GoOut gating.

### General
- [ ] No Angular imports in any Area 1 file.
- [ ] No side effects in any transform function.
- [ ] No mutation of input arguments.
- [ ] All functions are total (handle every possible input within their type signature).
- [ ] TypeScript compiles with `strict: true` and no errors.
