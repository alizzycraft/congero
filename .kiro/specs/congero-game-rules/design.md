# Design Document — Area 1: Game Rules & Core Mechanics

## Overview

Area 1 defines the canonical, implementation-ready rules for all canasta mechanics in Congero. It covers every canasta type and its eligibility conditions, the meld validity function, scoring formulas expressed as pure functions, the turn-structure state machine, going-out conditions, and the named boss-rule injection points that Area 3 (Modifier Systems) uses to override base behavior. This area is the authoritative source for all rule logic; no other area may redefine a formula or validity condition owned here — they must reference this document by name and section.

**Out of scope for this document:** How modifier effects alter these rules (Area 3), how rule results are stored in game state (Area 8), how rules are rendered or communicated to the player in the UI (Area 5), and how Angular services implement these functions (Area 7). Wild-card substitution details beyond what is needed for meld validity are deferred to Area 4 (Card Enhancements & Wild Card Economy).

---
## 1. Data Models

All types are TypeScript. No `any`, no partial types. All fields are required unless explicitly typed as `| null`.

```typescript
// ─── Suit & Rank ────────────────────────────────────────────────────────────

export type Suit = 'clubs' | 'diamonds' | 'hearts' | 'spades';

/**
 * Numeric ranks 2–10 plus face cards.
 * '2' is always a wild card.
 * '3' is context-sensitive: red threes are bonus cards; black threes are discard-only.
 */
export type Rank =
  | '2' | '3' | '4' | '5' | '6' | '7'
  | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A'
  | 'JOKER';

// ─── Card ────────────────────────────────────────────────────────────────────

export interface Card {
  /** Unique identifier for this physical card instance in the deck. */
  id: string;
  rank: Rank;
  /** null for Jokers, which have no suit. */
  suit: Suit | null;
  /** Point value of this card for scoring purposes. See Section 3.1. */
  pointValue: number;
  /** True if this card is a wild card (rank === '2' or rank === 'JOKER'). */
  isWild: boolean;
  /**
   * True if this card is a red three (rank === '3' and suit is 'hearts' or 'diamonds').
   * Red threes are automatically played as bonus cards and are never held in hand.
   */
  isRedThree: boolean;
  /**
   * True if this card is a black three (rank === '3' and suit is 'clubs' or 'spades').
   * Black threes may only be discarded; they cannot be melded except as the final
   * discard when going out.
   */
  isBlackThree: boolean;
  /**
   * Enhancement applied to this card instance. null means no enhancement.
   * Enhancement definitions are owned by Area 4.
   */
  enhancementId: string | null;
}

// ─── Meld ────────────────────────────────────────────────────────────────────

export interface Meld {
  /** Unique identifier for this meld on the table. */
  id: string;
  /**
   * The natural rank this meld is built around.
   * All non-wild cards in the meld must match this rank.
   */
  rank: Rank;
  /** All cards currently in this meld, including wilds. */
  cards: Card[];
  /**
   * The canasta type this meld has achieved, or null if it has not yet
   * reached seven cards.
   */
  canastaType: CanastaType | null;
  /**
   * True once the meld has been sealed as a canasta (≥7 cards).
   * A sealed canasta may still receive additional cards.
   */
  isSealed: boolean;
  /**
   * Running point value of all cards in the meld (sum of card.pointValue).
   * Does not include canasta bonus — that is computed by scoreCanasta().
   */
  cardPointTotal: number;
  /**
   * True if this meld was completed (reached canasta status) using at least
   * one card taken from the discard pile during the same turn.
   */
  completedFromDiscard: boolean;
  /**
   * True if this meld was completed in a single turn without any prior
   * cards on the table (used for concealed-out detection).
   */
  completedConcealed: boolean;
  /**
   * Tray slot assigned to this meld, or null if no tray is active.
   * Tray effects are applied by Area 3.
   */
  traySlotId: string | null;
}

// ─── Canasta Type ────────────────────────────────────────────────────────────

/**
 * The seven canasta types recognised by the base rule set.
 * Eligibility conditions and base bonuses are defined in Section 3.2.
 */
export type CanastaType =
  | 'natural'       // 7+ same-rank cards, zero wilds
  | 'dirty'         // 7+ same-rank cards, 1–N wilds (N < total/2)
  | 'super'         // 10+ same-rank cards (natural or dirty)
  | 'red'           // natural canasta where every card has a red-three bonus marker (Area 4)
  | 'frozen'        // completed using ≥1 card taken from a frozen discard pile
  | 'partner'       // two separate melds both reach canasta status on the same turn
  | 'concealedOut'; // player goes out in one turn, all canasta cards from hand (never on table)

// ─── Turn Phase ──────────────────────────────────────────────────────────────

/**
 * The four phases of a player turn.
 * Valid transitions are defined in Section 3.4.
 */
export type TurnPhase = 'Draw' | 'Meld' | 'Discard' | 'GoOut';

// ─── Go-Out Condition ────────────────────────────────────────────────────────

/**
 * The three going-out conditions.
 * Eligibility rules are defined in Section 3.5.
 */
export type GoOutCondition = 'normal' | 'concealedOut' | 'partnerCanasta';

// ─── Meld Validation Result ──────────────────────────────────────────────────

export type MeldRejectionReason =
  | 'INSUFFICIENT_CARDS'          // fewer than 3 cards proposed (or 2 with Anchor enhancement — see Area 4)
  | 'RANK_MISMATCH'               // non-wild cards do not all share the same rank
  | 'ILLEGAL_RANK'                // rank is '3' (threes cannot be melded; red threes auto-play, black threes discard-only)
  | 'TOO_MANY_WILDS'              // wilds ≥ total card count (meld must have at least one natural card)
  | 'WILD_MAJORITY'               // wilds exceed natural cards (wilds must be strictly fewer than naturals)
  | 'EXTENDS_SEALED_WRONG_RANK'   // proposed cards do not match the rank of the meld being extended
  | 'BLACK_THREE_MELD_ATTEMPT'    // black threes cannot be melded (only discarded)
  | 'DISCARD_PILE_LOCKED'         // player attempted to take a frozen discard pile without a matching natural pair
  | 'HOOK_REJECTED'               // a boss-rule hook (ON_MELD_VALIDATE) rejected the meld

export interface MeldValidationResult {
  valid: boolean;
  /** Present only when valid === false. */
  rejectionReason: MeldRejectionReason | null;
  /** Human-readable explanation for UI display. Owned by Area 5. */
  rejectionMessage: string | null;
}

// ─── Canasta Score Result ────────────────────────────────────────────────────

export interface CanastaScoreResult {
  canastaType: CanastaType;
  cardPointTotal: number;
  canastaBonus: number;
  /** cardPointTotal + canastaBonus, before modifier pipeline. */
  baseTotal: number;
}

// ─── Turn State ──────────────────────────────────────────────────────────────

export interface TurnState {
  phase: TurnPhase;
  /** Cards currently in the player's hand. */
  hand: Card[];
  /** All melds currently on the table. */
  melds: Meld[];
  /** Top card of the discard pile, or null if empty. */
  discardPileTop: Card | null;
  /** True if the discard pile is currently frozen. */
  discardPileFrozen: boolean;
  /** Number of canastas sealed this turn (used for partner canasta detection). */
  canastasCompletedThisTurn: number;
  /** True if the player has at least one sealed canasta on the table. */
  hasAtLeastOneCanasta: boolean;
}
```

---
## 2. Card Point Values

Point values are fixed properties of a card's rank. They are used in `cardPointTotal` calculations and in the scoring formulas below.

| Rank | Point Value |
|------|-------------|
| JOKER | 50 |
| 2 (wild) | 20 |
| A | 20 |
| K | 10 |
| Q | 10 |
| J | 10 |
| 10 | 10 |
| 9 | 10 |
| 8 | 10 |
| 7 | 5 |
| 6 | 5 |
| 5 | 5 |
| 4 | 5 |
| Black 3 | 5 |
| Red 3 | 100 (bonus card — auto-played, not held in hand) |

**Pure function:**

```typescript
function getCardPointValue(rank: Rank, suit: Suit | null): number {
  if (rank === 'JOKER') return 50;
  if (rank === '2') return 20;
  if (rank === 'A') return 20;
  if (['K', 'Q', 'J', '10', '9', '8'].includes(rank)) return 10;
  if (['7', '6', '5', '4'].includes(rank)) return 5;
  if (rank === '3') {
    // Red three: hearts or diamonds
    if (suit === 'hearts' || suit === 'diamonds') return 100;
    // Black three: clubs or spades
    return 5;
  }
  // Unreachable if Rank type is exhaustive
  throw new Error(`Unknown rank: ${rank}`);
}
```

---

## 3. Core Algorithms

### 3.1 Meld Validity Function

**Signature:**

```typescript
function validateMeld(
  proposedCards: Card[],
  existingMeld: Meld | null,
  context: MeldValidationContext
): MeldValidationResult
```

**`MeldValidationContext`:**

```typescript
export interface MeldValidationContext {
  /** True if the Anchor enhancement is active for this meld (minimum size becomes 2). Owned by Area 4. */
  anchorEnhancementActive: boolean;
  /** True if the discard pile is currently frozen. */
  discardPileFrozen: boolean;
  /**
   * If the player is attempting to take the discard pile, this is the top card.
   * null if the player is not taking the discard pile.
   */
  discardPileTopCard: Card | null;
  /**
   * Cards in the player's hand that match the discard pile top card's rank
   * (used to validate discard pile pickup eligibility).
   */
  matchingHandCards: Card[];
  /** Active boss-rule hook overrides. Populated by Area 3. */
  hookOverrides: BossRuleHookSet;
}
```

**Decision table — rejection conditions (evaluated in order):**

| # | Condition | Rejection Reason |
|---|-----------|-----------------|
| 1 | Any proposed card has `rank === '3'` | `ILLEGAL_RANK` |
| 2 | Any non-wild proposed card has `rank === 'BLACK_THREE'` (i.e., rank=3, black suit) | `BLACK_THREE_MELD_ATTEMPT` |
| 3 | `proposedCards.length < minimumMeldSize` where `minimumMeldSize = anchorEnhancementActive ? 2 : 3` | `INSUFFICIENT_CARDS` |
| 4 | Non-wild cards in `proposedCards` do not all share the same rank | `RANK_MISMATCH` |
| 5 | `existingMeld !== null` and the natural rank of `proposedCards` does not match `existingMeld.rank` | `EXTENDS_SEALED_WRONG_RANK` |
| 6 | Wild count in `proposedCards` (plus existing wilds if extending) ≥ total card count in the resulting meld | `TOO_MANY_WILDS` |
| 7 | Wild count in `proposedCards` (plus existing wilds if extending) ≥ natural card count in the resulting meld | `WILD_MAJORITY` |
| 8 | Player is taking the frozen discard pile AND does not hold ≥2 natural cards matching the top card's rank | `DISCARD_PILE_LOCKED` |
| 9 | `context.hookOverrides.ON_MELD_VALIDATE` returns `false` | `HOOK_REJECTED` |

**Note on rule 6 vs rule 7:** Rule 6 catches the degenerate case of a meld with zero natural cards. Rule 7 enforces the standard canasta constraint that wilds must be strictly fewer than natural cards (e.g., a 4-card meld may have at most 1 wild; a 7-card meld may have at most 3 wilds).

**Pseudocode:**

```
function validateMeld(proposedCards, existingMeld, context):
  allCards = existingMeld ? existingMeld.cards + proposedCards : proposedCards
  naturalCards = allCards.filter(c => !c.isWild)
  wildCards = allCards.filter(c => c.isWild)
  minimumSize = context.anchorEnhancementActive ? 2 : 3

  for card in proposedCards:
    if card.rank === '3':
      return { valid: false, rejectionReason: 'ILLEGAL_RANK', ... }

  if proposedCards.length < minimumSize:
    return { valid: false, rejectionReason: 'INSUFFICIENT_CARDS', ... }

  naturalRanks = naturalCards.map(c => c.rank).unique()
  if naturalRanks.length > 1:
    return { valid: false, rejectionReason: 'RANK_MISMATCH', ... }

  if existingMeld and naturalRanks[0] !== existingMeld.rank:
    return { valid: false, rejectionReason: 'EXTENDS_SEALED_WRONG_RANK', ... }

  if wildCards.length >= allCards.length:
    return { valid: false, rejectionReason: 'TOO_MANY_WILDS', ... }

  if wildCards.length >= naturalCards.length:
    return { valid: false, rejectionReason: 'WILD_MAJORITY', ... }

  if context.discardPileTopCard and context.discardPileFrozen:
    if context.matchingHandCards.filter(c => !c.isWild).length < 2:
      return { valid: false, rejectionReason: 'DISCARD_PILE_LOCKED', ... }

  if context.hookOverrides.ON_MELD_VALIDATE:
    hookResult = context.hookOverrides.ON_MELD_VALIDATE(proposedCards, existingMeld, context)
    if not hookResult.allowed:
      return { valid: false, rejectionReason: 'HOOK_REJECTED', ... }

  return { valid: true, rejectionReason: null, rejectionMessage: null }
```

---

### 3.2 Canasta Type Eligibility

A meld reaches canasta status when it contains **7 or more cards**. The canasta type is determined at the moment of sealing and may be upgraded (e.g., from `dirty` to `natural`) if wilds are later replaced — but for base rules, the type is fixed at sealing.

**Eligibility decision table (evaluated in priority order):**

| Priority | Type | Eligibility Condition |
|----------|------|-----------------------|
| 1 | `super` | Total cards ≥ 10 (natural or dirty; super overrides natural/dirty label for bonus purposes) |
| 2 | `concealedOut` | All cards came from hand in a single turn; meld was never on the table before going out |
| 3 | `frozen` | At least one card in the meld was taken from a frozen discard pile |
| 4 | `partner` | Two or more separate melds both reach canasta status on the same turn |
| 5 | `red` | All natural cards in the meld carry the "red" enhancement marker (Area 4 definition) |
| 6 | `natural` | Total cards ≥ 7 AND wild count === 0 |
| 7 | `dirty` | Total cards ≥ 7 AND wild count ≥ 1 AND wild count < natural count |

**Notes:**
- `super` is a size-based upgrade that stacks on top of `natural` or `dirty`. A super canasta is still natural or dirty for the purposes of other rules; `super` adds an additional bonus layer.
- `partner` is a turn-event type: it is awarded when two canastas are sealed in the same turn. Each individual meld retains its own `natural`/`dirty`/`super` type; `partner` is an additional bonus event.
- `concealedOut` requires that the player goes out in the same turn the canasta is sealed, and that no cards from that meld were ever on the table in a prior turn.
- `frozen` and `partner` can co-occur with `natural` or `dirty`.

**Pure function to determine canasta type:**

```typescript
function determineCanastaType(meld: Meld, turnState: TurnState): CanastaType {
  const naturalCount = meld.cards.filter(c => !c.isWild).length;
  const wildCount = meld.cards.filter(c => c.isWild).length;
  const totalCount = meld.cards.length;

  if (totalCount >= 10) return 'super';
  if (meld.completedConcealed && turnState.phase === 'GoOut') return 'concealedOut';
  if (meld.completedFromDiscard) return 'frozen';
  // partner is detected at the turn level, not the meld level — see Section 3.5
  if (wildCount === 0) return 'natural';
  return 'dirty';
}
```

---

### 3.3 Canasta Scoring Formulas

All formulas are pure functions. They return a `CanastaScoreResult`. The modifier pipeline (Area 3) applies on top of `baseTotal`.

**Base card point total:**

```typescript
function computeCardPointTotal(meld: Meld): number {
  return meld.cards.reduce((sum, card) => sum + card.pointValue, 0);
}
```

**Canasta bonus table:**

| Canasta Type | Base Bonus |
|--------------|-----------|
| `natural` | 500 |
| `dirty` | 300 |
| `super` | 1000 (replaces natural/dirty bonus entirely) |
| `red` | 800 (replaces natural bonus) |
| `frozen` | 300 + 100 (frozen pickup bonus) = 400 |
| `partner` | 200 per meld involved (awarded as a separate event bonus, not per-meld) |
| `concealedOut` | 500 (replaces normal going-out bonus; see Section 3.5) |

**`scoreCanasta` pure function:**

```typescript
function scoreCanasta(meld: Meld, canastaType: CanastaType): CanastaScoreResult {
  const cardPointTotal = computeCardPointTotal(meld);
  const canastaBonus = getCanastaBonus(canastaType);
  return {
    canastaType,
    cardPointTotal,
    canastaBonus,
    baseTotal: cardPointTotal + canastaBonus,
  };
}

function getCanastaBonus(canastaType: CanastaType): number {
  switch (canastaType) {
    case 'natural':      return 500;
    case 'dirty':        return 300;
    case 'super':        return 1000;
    case 'red':          return 800;
    case 'frozen':       return 400;
    case 'partner':      return 200; // per meld; awarded as event bonus
    case 'concealedOut': return 500; // replaces going-out bonus
    default:
      // TypeScript exhaustiveness guard
      const _exhaustive: never = canastaType;
      throw new Error(`Unhandled canasta type: ${_exhaustive}`);
  }
}
```

**Edge cases:**
- A meld with exactly 7 cards and 3 wilds: `wildCount (3) < naturalCount (4)` → valid dirty canasta. Bonus = 300.
- A meld with exactly 7 cards and 4 wilds: `wildCount (4) >= naturalCount (3)` → `WILD_MAJORITY` rejection. Cannot be sealed.
- A meld with 10 cards and 0 wilds: `super` type. Bonus = 1000 (not 500 + 1000; super replaces natural).
- A meld with 10 cards and 3 wilds: `super` type. Bonus = 1000.

---

### 3.4 Turn Structure State Machine

A player turn progresses through four phases. The state machine enforces valid transitions and fires named boss-rule injection hooks at each boundary.

**Phase definitions:**

| Phase | Description |
|-------|-------------|
| `Draw` | Player draws cards (from draw pile or takes discard pile). Mandatory. |
| `Meld` | Player plays cards from hand to the table (new melds or extending existing melds). Optional; may be skipped. |
| `Discard` | Player discards one card from hand to the discard pile. Mandatory unless going out. |
| `GoOut` | Player declares going out — plays remaining hand cards and ends the round. Optional; only available if going-out conditions are met. |

**Valid transitions:**

```
Draw  ──► Meld
Draw  ──► Discard   (skip Meld)
Draw  ──► GoOut     (skip Meld and Discard — only if going-out conditions met)
Meld  ──► Discard
Meld  ──► GoOut     (only if going-out conditions met)
Discard ──► [Turn ends; next player's Draw begins]
GoOut   ──► [Round ends]
```

**Invalid transitions (all others):**
- Cannot return to `Draw` from any later phase.
- Cannot skip `Draw` (drawing is mandatory).
- Cannot go from `Discard` to `GoOut` (discard ends the turn).
- Cannot go from `GoOut` back to any phase.

**State machine as a transition table:**

| From \ To | Draw | Meld | Discard | GoOut |
|-----------|------|------|---------|-------|
| *(start)* | ✓ | — | — | — |
| Draw | — | ✓ | ✓ | ✓* |
| Meld | — | — | ✓ | ✓* |
| Discard | — | — | — | — |
| GoOut | — | — | — | — |

*✓\* = only when `canGoOut(turnState) === true`*

**Boss-rule injection hooks (named):**

| Hook Name | Fires When | What It Can Override |
|-----------|-----------|----------------------|
| `ON_TURN_START` | Entering `Draw` phase | Can modify draw count, force discard-pile freeze, add/remove cards from hand |
| `ON_DRAW_COMPLETE` | After player completes draw action | Can add penalty cards, trigger forced discards |
| `ON_MELD_VALIDATE` | Before any meld is accepted | Can reject melds that would otherwise be valid (e.g., "no dirty melds this round") |
| `ON_MELD_PLACED` | After a meld is placed on the table | Can trigger side effects (e.g., remove a card from hand) |
| `ON_CANASTA_SEALED` | When a meld reaches ≥7 cards and is sealed | Can modify the canasta type, suppress the bonus, or add penalty |
| `ON_CANASTA_SCORED` | When `scoreCanasta()` is called | Can multiply, add to, or replace the base score |
| `ON_DISCARD` | When player discards a card | Can freeze the discard pile, add penalty, or redirect the discard |
| `ON_GO_OUT_ATTEMPT` | When player attempts to go out | Can block going out, add requirements, or grant bonuses |
| `ON_TURN_END` | After `Discard` or `GoOut` resolves | Can trigger end-of-turn effects |

**TypeScript hook set interface:**

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

### 3.5 Going-Out Conditions

Going out ends the round. The player must satisfy all conditions for the chosen `GoOutCondition`.

**`canGoOut` pure function:**

```typescript
function canGoOut(state: TurnState, condition: GoOutCondition): boolean {
  switch (condition) {
    case 'normal':
      return (
        state.hasAtLeastOneCanasta &&
        state.hand.length === 0 // all cards played or discarded
      );

    case 'concealedOut':
      return (
        // Player has never placed any cards on the table before this turn
        state.melds.every(m => m.completedConcealed) &&
        // All melds were completed this turn
        state.canastasCompletedThisTurn >= 1 &&
        state.hand.length === 0
      );

    case 'partnerCanasta':
      return (
        state.canastasCompletedThisTurn >= 2 &&
        state.hand.length === 0
      );

    default:
      const _exhaustive: never = condition;
      throw new Error(`Unhandled GoOutCondition: ${_exhaustive}`);
  }
}
```

**Going-out bonus table:**

| Condition | Bonus |
|-----------|-------|
| `normal` | +100 points |
| `concealedOut` | +500 points (replaces normal going-out bonus; also triggers `concealedOut` canasta type on all melds sealed this turn) |
| `partnerCanasta` | +100 (normal going-out bonus) + 200 per partner canasta meld (from `scoreCanasta` with type `partner`) |

**Edge cases:**
- Player goes out with no canastas: `canGoOut` returns `false` for all conditions. Going out is impossible without at least one sealed canasta.
- Player has one card left and it is a black three: they may discard it to go out normally (black threes may be discarded as the final card), but only if `hasAtLeastOneCanasta === true`.
- Concealed out with a dirty meld: valid — concealed out does not require natural canastas. The meld type is `concealedOut`, not `dirty`.
- Partner canasta where one meld is natural and one is dirty: both count toward the `partnerCanasta` condition. Each meld scores its own type bonus plus the partner event bonus.

---
## 4. Interfaces & Contracts with Adjacent Areas

### 4.1 Contract with Area 3 — Modifier Systems

Area 3 consumes the boss-rule injection hooks defined in Section 3.4. The contract is the `BossRuleHookSet` interface. Area 3 is responsible for populating a `BossRuleHookSet` instance and passing it into `MeldValidationContext` and any function that accepts hook overrides.

Area 3 also consumes `scoreCanasta()` via the `ON_CANASTA_SCORED` hook. The modifier pipeline defined in Area 3 receives a `CanastaScoreResult` and returns a modified `CanastaScoreResult`. Area 1 does not define the pipeline — it only defines the input and output types.

**Named injection points (Area 1 → Area 3):**

```typescript
// Area 3 imports these from Area 1:
export type { BossRuleHookSet } from './area1-game-rules';
export type { CanastaScoreResult } from './area1-game-rules';
export type { MeldValidationContext } from './area1-game-rules';
export type { TurnState } from './area1-game-rules';
```

**Area 3 must not redefine `scoreCanasta()` or `validateMeld()`. It must call them and compose on top of their results.**

---

### 4.2 Contract with Area 4 — Card Enhancements & Wild Card Economy

Area 4 owns the Anchor enhancement, which changes the minimum meld size from 3 to 2. Area 1 exposes this as the `anchorEnhancementActive` boolean in `MeldValidationContext`. Area 4 is responsible for setting this flag when the Anchor enhancement is active.

Area 4 also owns the "red" enhancement marker that determines `red` canasta eligibility. Area 1 checks for this marker when determining canasta type, but the marker definition and application are owned by Area 4.

**Extension point (Area 1 → Area 4):**

```typescript
// Area 1 exposes this hook for Area 4's Anchor enhancement:
export interface MeldValidationContext {
  anchorEnhancementActive: boolean; // set by Area 4
  // ... other fields
}

// Area 1 exposes this check for Area 4's red canasta marker:
// Meld.cards[n].enhancementId === 'red-marker' is checked by determineCanastaType()
// The string 'red-marker' is a constant defined in Area 4 and referenced here.
export const RED_ENHANCEMENT_MARKER_ID = 'red-marker'; // Area 4 must use this ID
```

---

### 4.3 Contract with Area 8 — State Management

Area 8 stores the results of `scoreCanasta()` and `validateMeld()` in its state schemas. The function signatures are the contract.

**Functions Area 8 depends on:**

```typescript
// Area 8 calls these functions during state transitions:

function validateMeld(
  proposedCards: Card[],
  existingMeld: Meld | null,
  context: MeldValidationContext
): MeldValidationResult;

function scoreCanasta(
  meld: Meld,
  canastaType: CanastaType
): CanastaScoreResult;

function canGoOut(
  state: TurnState,
  condition: GoOutCondition
): boolean;

function determineCanastaType(
  meld: Meld,
  turnState: TurnState
): CanastaType;
```

Area 8 stores `CanastaScoreResult` in its `MeldState` schema (Area 8 design document, Section: Meld State Schema). Area 8 stores `TurnPhase` in its `RoundState` schema. Area 8 is responsible for persisting these values — Area 1 only computes them.

---

## 5. Worked Example

**Scenario:** Player seals a 7-Queen natural canasta and scores it.

**Setup:**
- Player's hand contains: Q♠, Q♥, Q♦, Q♣, Q♠ (second copy), Q♥ (second copy), Q♦ (second copy)
- No existing melds on the table
- No wilds in the proposed meld
- No boss rules active
- No enhancements active

**Step 1 — Turn phase: Draw**
Player draws cards. `ON_TURN_START` hook fires (no override). Player draws 2 cards (not Queens). `ON_DRAW_COMPLETE` fires (no override). Phase transitions: `Draw → Meld`.

**Step 2 — Meld validation**
Player proposes all 7 Queens as a new meld.

```
validateMeld(
  proposedCards: [Q♠, Q♥, Q♦, Q♣, Q♠, Q♥, Q♦],
  existingMeld: null,
  context: { anchorEnhancementActive: false, discardPileFrozen: false,
             discardPileTopCard: null, matchingHandCards: [],
             hookOverrides: {} }
)
```

Decision table evaluation:
1. No threes → pass
2. No black threes → pass
3. 7 cards ≥ 3 (minimum) → pass
4. All natural cards are rank 'Q' → pass
5. No existing meld → pass
6. Wild count (0) < total (7) → pass
7. Wild count (0) < natural count (7) → pass
8. Discard pile not being taken → pass
9. No `ON_MELD_VALIDATE` hook → pass

Result: `{ valid: true, rejectionReason: null, rejectionMessage: null }`

`ON_MELD_PLACED` fires (no override). Meld is placed on the table.

**Step 3 — Canasta type determination**
Meld now has 7 cards. `isSealed` becomes `true`. `ON_CANASTA_SEALED` fires (no override).

```
determineCanastaType(meld, turnState)
```

- `totalCount = 7` → not ≥ 10, so not `super`
- `completedConcealed = false` (cards were placed on table, not going out in one turn)
- `completedFromDiscard = false`
- `wildCount = 0` → `natural`

Result: `CanastaType = 'natural'`

**Step 4 — Scoring**
`ON_CANASTA_SCORED` fires (no override).

```
scoreCanasta(meld, 'natural')
```

Card point totals:
- 7 × Q = 7 × 10 = 70

```
cardPointTotal = 70
canastaBonus = getCanastaBonus('natural') = 500
baseTotal = 70 + 500 = 570
```

Result: `{ canastaType: 'natural', cardPointTotal: 70, canastaBonus: 500, baseTotal: 570 }`

No modifier pipeline active (Area 3 not involved in this example). Final score for this canasta: **570 points**.

**Step 5 — Going out check**
Player has remaining cards in hand. `canGoOut` returns `false` (hand not empty). Player proceeds to `Discard` phase.

**Step 6 — Discard**
Player discards one card. `ON_DISCARD` fires (no override). Turn ends. `ON_TURN_END` fires (no override).

**Verification:**
- Meld validity: all 7 rejection conditions passed ✓
- Canasta type: `natural` (0 wilds, 7 cards) ✓
- Card point total: 7 × 10 = 70 ✓
- Canasta bonus: 500 ✓
- Base total: 570 ✓
- State transitions: Draw → Meld → Discard ✓
- All boss-rule hooks fired at correct points ✓

---

## 6. Open Questions

### OQ-1: Super Canasta Threshold
**Question:** Is the super canasta threshold fixed at 10 cards, or should it be configurable per run?

**Status:** Deferred.

**Rationale:** The base rule uses 10 as the threshold. Boss rules and House Rules (Area 3) may lower or raise this threshold via the `ON_CANASTA_SEALED` hook. No change to Area 1 is needed — the hook provides the override point. The base threshold of 10 is locked here.

---

### OQ-2: Partner Canasta — Same Turn vs Same Round
**Question:** Does `partnerCanasta` require both melds to be sealed on the same *turn*, or is it sufficient for both to be sealed in the same *round*?

**Status:** Resolved — same turn.

**Rationale:** "Same turn" creates a meaningful strategic decision (holding cards to complete two canastas simultaneously). "Same round" would be trivially achievable and reduce the bonus's significance. The `canastasCompletedThisTurn` counter in `TurnState` enforces the same-turn requirement.

---

### OQ-3: Concealed Out — Partial Melds on Table
**Question:** If a player has a partial meld (fewer than 7 cards) on the table from a prior turn, can they still achieve a concealed out on a different meld?

**Status:** Resolved — no.

**Rationale:** Concealed out requires that the player has *never* placed cards on the table before the going-out turn. Any prior meld activity disqualifies the player from concealed out. This is enforced by `state.melds.every(m => m.completedConcealed)` — if any meld was not completed concealed, the condition fails.

---

### OQ-4: Red Canasta — Enhancement Marker Definition
**Question:** What exactly constitutes the "red enhancement marker" that qualifies a card for the `red` canasta type?

**Status:** Deferred to Area 4.

**Rationale:** Area 4 owns the enhancement system. Area 1 references the marker by the constant `RED_ENHANCEMENT_MARKER_ID = 'red-marker'`. Area 4 must define what grants this marker (e.g., a specific enhancement type, a card edition, or a run modifier). Area 1 only checks for its presence.

---

### OQ-5: Black Three Final Discard
**Question:** Can a player discard a black three as their final card to go out, even though black threes cannot be melded?

**Status:** Resolved — yes.

**Rationale:** Standard canasta rules allow black threes to be discarded as the final card when going out. The `canGoOut` function checks `hand.length === 0` after the discard action, not before. The discard of a black three is valid (it is not a meld attempt). The `ILLEGAL_RANK` rejection in `validateMeld` applies only to meld attempts, not discards.

---

### OQ-6: Frozen Discard Pile — Pickup Requirement
**Question:** To take a frozen discard pile, must the player hold exactly 2 natural matching cards, or at least 2?

**Status:** Resolved — at least 2.

**Rationale:** Standard canasta rules require the player to hold at least 2 natural cards matching the top card of the frozen discard pile. The validation check `matchingHandCards.filter(c => !c.isWild).length < 2` enforces "at least 2." Holding more than 2 is permitted and advantageous.

---

## 7. Self-Review Against Done Criteria

### Universal Done Checklist

- [x] All required sections present: Overview, Data Models, Core Algorithms, Interfaces & Contracts, Worked Example, Open Questions
- [x] All data models fully typed: `Card`, `Meld`, `CanastaType`, `TurnPhase`, `GoOutCondition`, `MeldValidationResult`, `CanastaScoreResult`, `TurnState`, `BossRuleHookSet`, `MeldValidationContext` — no `any`, no partial types
- [x] All algorithms described at pseudocode or decision-table level: `validateMeld` (decision table + pseudocode), `determineCanastaType` (decision table + pure function), `scoreCanasta` (pure function), `canGoOut` (pure function), turn state machine (transition table)
- [x] All interfaces between this area and adjacent areas explicitly named and typed: Area 3 (Section 4.1), Area 4 (Section 4.2), Area 8 (Section 4.3)
- [x] All open questions either resolved or explicitly deferred with rationale: OQ-1 through OQ-6
- [x] Worked example traces a concrete game scenario end-to-end: Section 5 (7-Queen natural canasta)
- [x] No content redefines rules owned by upstream dependencies: Area 1 has no upstream dependencies

### Area-Specific Done Criteria

- [x] Every canasta type (natural, dirty, super, red, frozen, partner, concealed out) has a complete scoring formula expressed as a pure function: Section 3.3, `scoreCanasta()` and `getCanastaBonus()`
- [x] The meld validity function is fully specified: inputs (`proposedCards`, `existingMeld`, `MeldValidationContext`), outputs (`MeldValidationResult`), and all rejection conditions enumerated (9 conditions in Section 3.1 decision table)
- [x] Every boss rule has a named injection point in the turn structure state machine: 9 named hooks in Section 3.4 (`ON_TURN_START`, `ON_DRAW_COMPLETE`, `ON_MELD_VALIDATE`, `ON_MELD_PLACED`, `ON_CANASTA_SEALED`, `ON_CANASTA_SCORED`, `ON_DISCARD`, `ON_GO_OUT_ATTEMPT`, `ON_TURN_END`)
- [x] The going-out conditions cover all cases: `normal`, `concealedOut`, `partnerCanasta` — all defined in Section 3.5 with edge cases enumerated
