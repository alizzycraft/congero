# Area 4: Card Enhancements & Wild Card Economy — Technical Specification

**Design doc:** `.kiro/specs/congero-card-enhancements/design.md`
**Project plan:** `docs/specs/project-plan.md` (Wave 4)

## 1. Overview

Area 4 defines the card enhancement system and the wild card substitution rules for Congero. This spec covers:

- **10 enhancement types** — Gilded, Echo, Sticky, Marked, Pure, Hot, Frozen, Partner, Buried, Anchor — each with trigger conditions, effects, and constraints.
- **Wild card substitution rules** — how 2s and Jokers count toward meld size, wild count, natural count, and point value across four wild treatments (normal, pure, gilded, gilded+pure).
- **Wild card economy invariants** — 6 invariants that prevent degenerate strategies, enforced as runtime checks.
- **Enhancement interaction matrix** — a complete 10×10 lookup table describing synergistic, neutral, conflicting, and no-interaction pairs.
- **Enhancement acquisition** — seal item application, modifier grants, and constraints on valid targets.

Enhancement effects are part of `base_score`. They are computed **before** Area 1's `scoreCanasta()` is called. The modifier pipeline (Area 3) receives the already-enhancement-adjusted `CanastaScoreResult`.

**Dependencies:** Area 1 (meld validation, canasta scoring), Area 3 (modifier pipeline contract), Area 8 (per-card enhancement state storage).

**Out of scope:** UI rendering (Area 5), Angular service wiring (Area 7), persistence schema (Area 8 owns storage; Area 4 owns data shapes only).

---

## 2. File Structure

All files live under `src/app/core/enhancements/`:

```
src/app/core/enhancements/
├── models/
│   ├── enhancement-type.ts          # EnhancementType union, Enhancement interface, RED_ENHANCEMENT_MARKER_ID
│   ├── wild-card-rule.ts            # WildCardRule interface, WILD_CARD_RULES constant
│   ├── enhancement-interaction.ts   # EnhancementInteraction interface
│   ├── wild-card-economy-state.ts   # WildCardEconomyState interface
│   └── index.ts                     # Barrel re-export of all models
├── transforms/
│   ├── apply-enhancement.ts         # Enhancement application functions (one per type)
│   ├── wild-card-counting.ts        # Wild card counting logic for all four treatments
│   ├── economy-invariants.ts        # 6 invariant check functions
│   ├── interaction-matrix.ts        # 10×10 interaction matrix lookup table
│   └── index.ts                     # Barrel re-export of all transforms
├── definitions/
│   ├── enhancement-definitions.ts   # All 10 enhancement definitions (trigger/effect/constraints)
│   └── index.ts                     # Barrel re-export
├── acquisition/
│   ├── seal-application.ts          # Seal item application logic and validation
│   ├── modifier-grants.ts           # Modifier-granted enhancement logic
│   └── index.ts                     # Barrel re-export
├── enhancements.module.ts           # Angular module (if needed for DI)
├── index.ts                         # Top-level barrel re-export
└── __tests__/
    ├── apply-enhancement.spec.ts    # Tests for each enhancement application function
    ├── wild-card-counting.spec.ts   # Tests for wild card counting in all contexts
    ├── economy-invariants.spec.ts   # Tests for all 6 invariants
    ├── interaction-matrix.spec.ts   # Tests for interaction lookup (symmetric, diagonal, each non-neutral pair)
    ├── seal-application.spec.ts     # Tests for seal item constraints
    └── modifier-grants.spec.ts      # Tests for modifier-granted enhancements
```

---

## 3. Interfaces & Types

### 3.1 EnhancementType

```typescript
// models/enhancement-type.ts

/**
 * The ten enhancement types in Congero.
 * Each enhancement is applied to a single card and modifies its behavior
 * during melding, scoring, or discard.
 */
export type EnhancementType =
  | 'gilded'      // Card counts as 2 cards for meld size
  | 'echo'        // When this card is melded, draw 1 card
  | 'sticky'      // Card cannot be discarded
  | 'marked'      // Card carries the red canasta marker
  | 'pure'        // Card counts as a natural even if it is a wild
  | 'hot'         // Card adds +50 bonus points when scored
  | 'frozen'      // Card freezes the discard pile when discarded
  | 'partner'     // Card counts toward partner canasta detection
  | 'buried'      // Card is hidden from hand display until melded
  | 'anchor';     // Reduces minimum meld size from 3 to 2
```

### 3.2 Enhancement

```typescript
// models/enhancement-type.ts

/**
 * An enhancement applied to a single card instance.
 */
export interface Enhancement {
  /** The type of enhancement. */
  type: EnhancementType;
  /** Unique identifier for this enhancement instance. */
  instanceId: string;
  /**
   * True if applied via a seal item (shop purchase).
   * False if granted by a modifier or boss rule.
   */
  appliedViaSeal: boolean;
  /**
   * Optional configuration value.
   * Used by 'marked' (marker color) and 'partner' (partner group ID).
   * null for all other types.
   */
  configValue: string | null;
}

/**
 * Constant identifier used by Area 1 to check red canasta eligibility.
 * Area 1 references this in determineCanastaType().
 */
export const RED_ENHANCEMENT_MARKER_ID: EnhancementType = 'marked';
```

### 3.3 WildCardRule

```typescript
// models/wild-card-rule.ts

/**
 * Defines how wild cards (2s and Jokers) behave in meld construction
 * and canasta type determination.
 */
export interface WildCardRule {
  /** The rank this rule applies to. */
  rank: '2' | 'JOKER';
  /** True if this card is treated as a wild card. */
  isWild: boolean;
  /**
   * Maximum number of this wild card type allowed in a single meld.
   * null means "enforced by Area 1's validateMeld()".
   */
  maxPerMeld: number | null;
  /** Point value of this wild card for scoring purposes. */
  pointValue: number;
  /** True if this wild card can be affected by the 'pure' enhancement. */
  canBePurified: boolean;
}
```

### 3.4 EnhancementInteraction

```typescript
// models/enhancement-interaction.ts

/**
 * Describes the result of an interaction between two enhancements
 * when both are present in the same meld.
 */
export interface EnhancementInteraction {
  /** The first enhancement in the pair (row in the matrix). */
  enhancementA: EnhancementType;
  /** The second enhancement in the pair (column in the matrix). */
  enhancementB: EnhancementType;
  /**
   * The type of interaction when both enhancements are present.
   */
  interactionType: 'synergistic' | 'neutral' | 'conflicting' | 'no_interaction';
  /** Human-readable description of the interaction effect. */
  description: string;
  /**
   * Optional numeric modifier applied when this interaction fires.
   * null for interactions that don't produce a numeric effect.
   */
  numericEffect: number | null;
}
```

### 3.5 WildCardEconomyState

```typescript
// models/wild-card-economy-state.ts

/**
 * Tracks the wild card economy for the current round.
 * Used to enforce invariants and detect degenerate strategies.
 */
export interface WildCardEconomyState {
  /** Total wild cards in the player's deck (2s + Jokers). */
  totalWildsInDeck: number;
  /** Total wild cards currently in the player's hand. */
  wildsInHand: number;
  /** Total wild cards currently in active melds on the table. */
  wildsInMelds: number;
  /** Total wild cards in the discard pile. */
  wildsInDiscard: number;
  /** Number of 'pure' enhancements currently applied to wild cards. */
  purifiedWilds: number;
  /** Number of 'gilded' enhancements currently applied to wild cards. */
  gildedWilds: number;
}
```

---

## 4. Pure Transforms (DSFR TRANSFORM Role)

All functions in `transforms/` are pure: they take inputs and return outputs with no side effects.

### 4.1 Enhancement Application Functions

Each function takes a card (or meld context) and returns the enhancement's contribution.

```typescript
// transforms/apply-enhancement.ts

/**
 * Gilded: Returns the size multiplier for the card.
 * A Gilded card counts as 2 cards for meld size calculations.
 * Returns 2 if the card has Gilded, 1 otherwise.
 */
export function getGildedSizeMultiplier(card: Card): number;

/**
 * Echo: Returns the number of cards to draw when this card is melded.
 * Returns 1 if the card has Echo, 0 otherwise.
 * Only fires when the card is first melded (not when added to sealed canasta).
 */
export function getEchoDrawCount(card: Card, isFirstMeld: boolean): number;

/**
 * Sticky: Returns whether the card can be discarded.
 * Returns false if the card has Sticky, true otherwise.
 * External forced-discard effects (boss rules) override this.
 */
export function canDiscard(card: Card, isForcedDiscard: boolean): boolean;

/**
 * Marked: Returns whether the card carries the red canasta marker.
 * Returns true if the card has Marked AND is a natural card, false otherwise.
 * Wild cards cannot carry Marked (enforced at acquisition, checked here defensively).
 */
export function hasRedMarker(card: Card): boolean;

/**
 * Pure: Returns whether the card counts as a natural for meld construction
 * and canasta type determination.
 * Returns true if the card is naturally natural OR has Pure enhancement.
 */
export function countsAsNatural(card: Card): boolean;

/**
 * Hot: Returns the bonus point contribution of this card.
 * Returns +50 if the card has Hot AND the meld is sealed (canasta), 0 otherwise.
 */
export function getHotBonus(card: Card, isMeldSealed: boolean): number;

/**
 * Frozen: Returns whether discarding this card freezes the discard pile.
 * Returns true if the card has Frozen AND is being discarded, false otherwise.
 */
export function triggersFreeze(card: Card, isDiscarded: boolean): boolean;

/**
 * Partner: Returns whether this card flags its meld as partner-eligible.
 * Returns true if the card has Partner, false otherwise.
 */
export function isPartnerEligible(card: Card): boolean;

/**
 * Buried: Returns whether the card is hidden from hand display.
 * Returns true if the card has Buried AND has not been melded yet, false otherwise.
 */
export function isBuried(card: Card, hasBeenMelded: boolean): boolean;

/**
 * Anchor: Returns the minimum meld size given the presence of Anchor cards.
 * Returns 2 if any card in the proposed meld has Anchor, 3 otherwise.
 * Only affects placing a new meld; extending an existing meld has no minimum.
 */
export function getMinimumMeldSize(proposedCards: Card[], isNewMeld: boolean): number;
```

### 4.2 Wild Card Counting Logic

```typescript
// transforms/wild-card-counting.ts

/**
 * Returns the effective meld size contribution of a card,
 * accounting for Gilded (×2) enhancement.
 */
export function getMeldSizeContribution(card: Card): number;

/**
 * Returns the effective wild count contribution of a card,
 * accounting for Pure (wild counts as 0).
 */
export function getWildCountContribution(card: Card): number;

/**
 * Returns the effective natural count contribution of a card,
 * accounting for Pure (wild counts as 1 natural).
 */
export function getNaturalCountContribution(card: Card): number;

/**
 * Returns the point value of a card.
 * Gilded does NOT double point value; Pure does NOT change wild point value.
 */
export function getEffectivePointValue(card: Card): number;

/**
 * Counts the total Gilded cards in a meld. Used for Invariant 4 check.
 */
export function countGildedInMeld(meld: Meld): number;

/**
 * Full wild card counting result for a meld.
 */
export interface WildCardCountResult {
  meldSize: number;       // Total size with Gilded multiplier
  wildCount: number;      // Wild cards minus Pure-treated wilds
  naturalCount: number;   // Natural cards plus Pure-treated wilds
  pointTotal: number;     // Sum of effective point values
}

export function countWildCardsInMeld(meld: Meld): WildCardCountResult;
```

### 4.3 Economy Invariant Checks

```typescript
// transforms/economy-invariants.ts

export interface InvariantCheckResult {
  invariant: number;       // 1-6
  passed: boolean;
  message: string;
}

/**
 * Invariant 1: wildCount < naturalCount (WILD_MAJORITY).
 */
export function checkWildMajority(result: WildCardCountResult): InvariantCheckResult;

/**
 * Invariant 2: totalWildsInDeck ≤ 12.
 */
export function checkTotalWildPool(state: WildCardEconomyState): InvariantCheckResult;

/**
 * Invariant 3: purifiedWilds ≤ totalWildsInDeck.
 */
export function checkPureWildLimit(state: WildCardEconomyState): InvariantCheckResult;

/**
 * Invariant 4: gildedCountInMeld ≤ 2.
 */
export function checkGildedPerMeldLimit(meld: Meld): InvariantCheckResult;

/**
 * Invariant 5: Anchor + Pure wild interaction is valid.
 * A 2-card Anchor meld of 1 natural + 1 Pure wild is valid.
 * This is a validation helper, not a restriction.
 */
export function checkAnchorPureInteraction(
  proposedCards: Card[], isNewMeld: boolean
): InvariantCheckResult;

/**
 * Invariant 6: Wild cards cannot carry Marked.
 */
export function checkMarkedNotOnWild(card: Card): InvariantCheckResult;

/**
 * Runs all 6 invariants. Returns array of results.
 * For economy-wide invariants, pass WildCardEconomyState.
 * For meld-specific invariants, pass Meld.
 */
export function runAllInvariants(
  economyState: WildCardEconomyState,
  meld?: Meld,
  proposedCards?: Card[]
): InvariantCheckResult[];
```

### 4.4 Interaction Matrix Lookup

```typescript
// transforms/interaction-matrix.ts

/**
 * Looks up the interaction between two enhancement types.
 * The matrix is symmetric: lookup(A, B) === lookup(B, A).
 * Enhancement pairs are normalized (sorted) before lookup.
 */
export function lookupInteraction(
  a: EnhancementType,
  b: EnhancementType
): EnhancementInteraction;

/**
 * Returns the full 10×10 interaction matrix as a nested Map.
 * Key: EnhancementType → Value: Map<EnhancementType, EnhancementInteraction>
 */
export function getInteractionMatrix(): Map<EnhancementType, Map<EnhancementType, EnhancementInteraction>>;
```

---

## 5. Enhancement Definitions

All 10 enhancement types with their trigger, effect, and constraints as implementable logic.

### 5.1 Gilded

| Property | Value |
|----------|-------|
| **Trigger** | Card is placed in a meld |
| **Effect** | Card counts as **2 cards** for meld size (minimum + canasta threshold). Still 1 physical card. Point value is NOT doubled. |
| **Constraints** | Max 2 Gilded per meld (Invariant 4). Gilded wild counts as 2 for size but still wild for canasta type. |

```typescript
// Pseudocode for Gilded application
function applyGilded(card: Card, meld: Meld): MeldUpdate {
  const gildedCount = countGildedInMeld(meld);
  if (gildedCount >= 2) {
    throw new Error('Invariant 4: max 2 Gilded per meld');
  }
  return {
    sizeContribution: 2,
    pointContribution: getBasePointValue(card), // NOT doubled
    wildContribution: card.isWild ? 1 : 0,      // still wild
  };
}
```

### 5.2 Echo

| Property | Value |
|----------|-------|
| **Trigger** | Card is melded (placed from hand to table) |
| **Effect** | Player draws 1 card from draw pile. If draw pile empty, reshuffle discard. If both empty, no draw. |
| **Constraints** | Fires once per card (first meld only). Does not fire when adding to sealed canasta. Multiple Echo cards each trigger separately. |

```typescript
function applyEcho(card: Card, context: MeldActionContext): DrawResult {
  if (!context.isFirstMeld) return { cardsDrawn: 0 };
  const drawn = context.drawFromPile(1);
  return { cardsDrawn: drawn.length, cards: drawn };
}
```

### 5.3 Sticky

| Property | Value |
|----------|-------|
| **Trigger** | Player attempts to discard the card |
| **Effect** | Discard is rejected. Player must choose a different card. |
| **Constraints** | Sticky cards can be melded. If entire hand is Sticky at Discard phase, skip Discard phase. External forced-discard effects override Sticky. |

```typescript
function applySticky(card: Card, action: DiscardAction): DiscardResult {
  if (action.isForced) {
    return { allowed: true, overridden: true }; // boss rule override
  }
  if (card.enhancement?.type === 'sticky') {
    return { allowed: false, reason: 'Card is Sticky' };
  }
  return { allowed: true };
}
```

### 5.4 Marked

| Property | Value |
|----------|-------|
| **Trigger** | Canasta type determination |
| **Effect** | Card carries red marker. All-natural-Marked meld → `red` canasta (800 bonus). |
| **Constraints** | Only natural cards. ALL natural cards must be Marked for `red` eligibility. No effect on meld validity or point value. |

```typescript
function applyMarked(card: Card): MarkerResult {
  if (card.isWild) {
    return { hasMarker: false, reason: 'Wild cards cannot be Marked (Invariant 6)' };
  }
  return { hasMarker: true, markerId: RED_ENHANCEMENT_MARKER_ID };
}

function isRedCanastaEligible(meld: Meld): boolean {
  const naturals = meld.cards.filter(c => !c.isWild);
  return naturals.length > 0 && naturals.every(c => hasRedMarker(c));
}
```

### 5.5 Pure

| Property | Value |
|----------|-------|
| **Trigger** | Meld construction and canasta type determination |
| **Effect** | Wild card counts as natural for meld construction and canasta type. Retains wild point value. |
| **Constraints** | Only applicable to wild cards (2s, Jokers). No effect on natural cards. Pure wild still occupies hand slot. |

```typescript
function applyPure(card: Card): PureResult {
  if (!card.isWild) {
    return { countsAsNatural: true, wasAlreadyNatural: true };
  }
  return {
    countsAsNatural: true,
    wasAlreadyNatural: false,
    retainsWildPointValue: true, // 20 for 2s, 50 for Jokers
  };
}
```

### 5.6 Hot

| Property | Value |
|----------|-------|
| **Trigger** | Canasta is scored (before modifier pipeline) |
| **Effect** | +50 bonus points per Hot card to `cardPointTotal`. |
| **Constraints** | Only fires when canasta is sealed. Multiple Hot cards stack additively (+50 each). Part of `cardPointTotal`, not `canastaBonus`. |

```typescript
function applyHot(card: Card, meld: Meld): HotResult {
  if (!meld.isSealed) {
    return { bonusPoints: 0, reason: 'Meld not yet sealed' };
  }
  if (card.enhancement?.type === 'hot') {
    return { bonusPoints: 50 };
  }
  return { bonusPoints: 0 };
}
```

### 5.7 Frozen

| Property | Value |
|----------|-------|
| **Trigger** | Card is discarded |
| **Effect** | Discard pile becomes frozen for the rest of the round. Player can only draw from draw pile. |
| **Constraints** | Only fires on discard (not meld). If pile already frozen, no additional effect. Freeze is permanent for the round. |

```typescript
function applyFrozen(card: Card, action: DiscardAction): FreezeResult {
  if (action.type !== 'discard') {
    return { freezeTriggered: false };
  }
  if (card.enhancement?.type === 'frozen') {
    return { freezeTriggered: true, duration: 'end_of_round' };
  }
  return { freezeTriggered: false };
}
```

### 5.8 Partner

| Property | Value |
|----------|-------|
| **Trigger** | Canasta sealing (meld reaches ≥7 cards) |
| **Effect** | Flags meld as partner-eligible. Two partner-eligible melds sealed same turn → +200 bonus per meld. |
| **Constraints** | At least 1 Partner card per meld for eligibility. Same-turn condition still enforced by Area 1. No stacking benefit from multiple Partner cards. |

```typescript
function applyPartner(card: Card, meld: Meld): PartnerResult {
  const hasPartner = meld.cards.some(c => c.enhancement?.type === 'partner');
  return {
    isPartnerEligible: hasPartner,
    bonus: 0, // awarded only when two partner-eligible melds sealed same turn
  };
}
```

### 5.9 Buried

| Property | Value |
|----------|-------|
| **Trigger** | Card is in hand (persistent) |
| **Effect** | Card is hidden from hand display. Player cannot see rank, suit, or enhancement. |
| **Constraints** | Can be discarded blindly. Cannot be targeted by shop operations until revealed. Still counts toward hand size. Revealed when melded. |

```typescript
function applyBuried(card: Card, hasBeenMelded: boolean): BuriedResult {
  return {
    isHidden: !hasBeenMelded && card.enhancement?.type === 'buried',
    canBeDiscarded: true,
    canBeShopTarget: hasBeenMelded,
  };
}
```

### 5.10 Anchor

| Property | Value |
|----------|-------|
| **Trigger** | Meld validation |
| **Effect** | Reduces minimum meld size from 3 to 2. |
| **Constraints** | At least 1 Anchor card in proposed meld. Canasta threshold unchanged (7). Only affects new meld placement, not extensions. Sets `anchorEnhancementActive` in Area 1's `MeldValidationContext`. |

```typescript
function applyAnchor(proposedCards: Card[], isNewMeld: boolean): AnchorResult {
  if (!isNewMeld) {
    return { minimumSize: 1, anchorActive: false }; // extending has no minimum
  }
  const hasAnchor = proposedCards.some(c => c.enhancement?.type === 'anchor');
  return {
    minimumSize: hasAnchor ? 2 : 3,
    anchorActive: hasAnchor,
  };
}
```

---

## 6. Wild Card Substitution Rules

### 6.1 Base Definitions

```typescript
// definitions/enhancement-definitions.ts (or models/wild-card-rule.ts)

export const WILD_CARD_RULES: Record<'2' | 'JOKER', WildCardRule> = {
  '2': {
    rank: '2',
    isWild: true,
    maxPerMeld: null,  // enforced by Area 1's WILD_MAJORITY
    pointValue: 20,
    canBePurified: true,
  },
  'JOKER': {
    rank: 'JOKER',
    isWild: true,
    maxPerMeld: null,  // enforced by Area 1's WILD_MAJORITY
    pointValue: 50,
    canBePurified: true,
  },
};
```

### 6.2 Counting Table

| Context | Normal Wild | Pure Wild | Gilded Wild | Gilded + Pure Wild |
|---------|------------|-----------|-------------|-------------------|
| Meld size | 1 | 1 | 2 | 2 |
| Wild count | 1 | 0 | 1 | 0 |
| Natural count | 0 | 1 | 0 | 1 |
| Point value | 20/50 | 20/50 | 20/50 | 20/50 |

### 6.3 Canasta Type Effects

| Wild Treatment | Canasta Type |
|---------------|-------------|
| Normal wild | `dirty` (wildCount ≥ 1) |
| Pure wild | Can contribute to `natural` |
| Gilded wild | `dirty` (still wild for type) |
| Gilded + Pure wild | Can contribute to `natural` |

### 6.4 Example Calculation

A meld with 5 natural cards + 1 Pure wild + 1 Gilded natural:
- Meld size: 5 + 1 + 2 = **8** (≥7, canasta reached)
- Wild count: 0 (Pure wild counts as 0)
- Natural count: 6 (5 naturals + 1 Pure wild)
- Canasta type: **natural** (0 effective wilds)

---

## 7. Wild Card Economy Invariants

All invariants are enforced as runtime checks via `economy-invariants.ts`.

### Invariant 1 — Wild Card Cap Per Meld (WILD_MAJORITY)

```
wildCount < naturalCount
```

- For a 7-card meld: max 3 wilds (3 < 4 naturals).
- For a 10-card super canasta: max 4 wilds (4 < 6 naturals).
- Enforced by Area 1's `validateMeld()`.

### Invariant 2 — Total Wild Card Pool

```
totalWildsInDeck ≤ 12
```

- 12 wilds total: 8 twos + 4 Jokers.
- Enforced by Area 2's card acquisition model; checked by Area 8.

### Invariant 3 — Pure Wild Limit

```
purifiedWilds ≤ totalWildsInDeck
```

- Cannot have more Pure enhancements on wilds than wilds that exist.

### Invariant 4 — Gilded Card Limit Per Meld

```
gildedCountInMeld ≤ 2
```

- Prevents degenerate 4-Gilded melds (counting as 8 cards).

### Invariant 5 — Anchor + Pure Wild Interaction

- An Anchor meld of 2 cards may be 1 natural + 1 Pure wild.
- Both count as naturals → valid starting meld with no effective wilds.
- This is a validation helper, not a restriction.

### Invariant 6 — Marked Enhancement on Wilds

```
card.isWild === true → card.enhancementId cannot be 'marked'
```

- Shop must not offer Marked seal items for wild cards.
- Boss rules attempting to apply Marked to wilds are silently rejected.

---

## 8. Enhancement Interaction Matrix

### 8.1 Matrix as Lookup Table

The matrix is symmetric. Legend: **S** = Synergistic, **N** = Neutral, **C** = Conflicting, **—** = No interaction.

|  | Gilded | Echo | Sticky | Marked | Pure | Hot | Frozen | Partner | Buried | Anchor |
|---|--------|------|--------|--------|-----|-----|--------|---------|--------|--------|
| **Gilded** | — | N | N | N | S | N | N | N | N | S |
| **Echo** | N | — | N | N | N | N | N | N | N | N |
| **Sticky** | N | N | — | N | N | N | S | N | N | N |
| **Marked** | N | N | N | — | C | N | N | N | N | N |
| **Pure** | S | N | N | C | — | N | N | N | N | S |
| **Hot** | N | N | N | N | N | — | N | N | N | N |
| **Frozen** | N | N | S | N | N | N | — | N | N | N |
| **Partner** | N | N | N | N | N | N | N | — | N | N |
| **Buried** | N | N | N | N | N | N | N | N | — | N |
| **Anchor** | S | N | N | N | S | N | N | N | N | — |

### 8.2 Diagonal Notes (Same-Type Pairs)

| Pair | Type | Rule |
|------|------|------|
| Gilded + Gilded | no_interaction | Max 2 per meld (Invariant 4). 2 Gilded + 3 natural = 7 size units. |
| Echo + Echo | no_interaction | Each fires independently. 3 Echo cards = 3 draws. |
| Sticky + Sticky | no_interaction | Each card independently undiscardable. |
| Marked + Marked | no_interaction | All naturals must be Marked. No stacking beyond `red` type. |
| Pure + Pure | no_interaction | Each Pure wild counts as natural. Can convert dirty → natural. |
| Hot + Hot | no_interaction | Additive: 3 Hot cards = +150. |
| Frozen + Frozen | no_interaction | Second Frozen discard has no additional effect. |
| Partner + Partner | no_interaction | Only 1 Partner needed per meld for eligibility. |
| Buried + Buried | no_interaction | Each card independently hidden. |
| Anchor + Anchor | no_interaction | Only 1 Anchor needed for minimum reduction. |

### 8.3 Non-Neutral Interaction Details

| Pair | Type | Description |
|------|------|-------------|
| **Gilded + Pure** | Synergistic | Gilded Pure wild = 2 size units AND 0 wild count. Most efficient natural canasta builder. |
| **Gilded + Anchor** | Synergistic | 1 Gilded card (size=2) satisfies Anchor's 2-card minimum. Place meld with single Gilded card. |
| **Pure + Anchor** | Synergistic | 1 natural + 1 Pure wild = 2-card Anchor meld with 0 effective wilds. |
| **Pure + Marked** | Conflicting | Wild cards cannot be Marked (Invariant 6). Pure wild counts as natural for canasta type but cannot carry Marked. Pure wild excluded from "all naturals must be Marked" check. |
| **Sticky + Frozen** | Synergistic | Sticky prevents discard, but if external effect forces discard, Frozen fires. Creates a dilemma: avoid Sticky card normally, but boss rule forces discard → freeze penalty. |

### 8.4 Implementation as Data Structure

```typescript
// transforms/interaction-matrix.ts

type InteractionKey = `${EnhancementType}:${EnhancementType}`;

// Internal normalized key: types sorted alphabetically
function normalizeKey(a: EnhancementType, b: EnhancementType): InteractionKey {
  return [a, b].sort().join(':') as InteractionKey;
}

const INTERACTION_MAP: Record<InteractionKey, Omit<EnhancementInteraction, 'enhancementA' | 'enhancementB'>> = {
  'gilded:pure': {
    interactionType: 'synergistic',
    description: 'Gilded Pure wild counts as 2 size units AND 0 wild count. Most efficient natural canasta builder.',
    numericEffect: null,
  },
  'anchor:gilded': {
    interactionType: 'synergistic',
    description: '1 Gilded card (size=2) satisfies Anchor 2-card minimum. Place meld with single Gilded card.',
    numericEffect: null,
  },
  'anchor:pure': {
    interactionType: 'synergistic',
    description: '1 natural + 1 Pure wild = 2-card Anchor meld with 0 effective wilds.',
    numericEffect: null,
  },
  'marked:pure': {
    interactionType: 'conflicting',
    description: 'Wild cards cannot be Marked (Invariant 6). Pure wild excluded from Marked check for red canasta.',
    numericEffect: null,
  },
  'frozen:sticky': {
    interactionType: 'synergistic',
    description: 'Sticky prevents discard, but forced discard triggers Frozen. External override resolves both.',
    numericEffect: null,
  },
  // All other pairs default to 'neutral' or 'no_interaction' based on diagonal rules
};

export function lookupInteraction(a: EnhancementType, b: EnhancementType): EnhancementInteraction {
  const key = normalizeKey(a, b);
  const entry = INTERACTION_MAP[key];
  if (entry) {
    return { enhancementA: a, enhancementB: b, ...entry };
  }
  // Default: same type → no_interaction, different type → neutral
  if (a === b) {
    return {
      enhancementA: a, enhancementB: b,
      interactionType: 'no_interaction',
      description: `Same-type pair: ${a} + ${b}. No special interaction.`,
      numericEffect: null,
    };
  }
  return {
    enhancementA: a, enhancementB: b,
    interactionType: 'neutral',
    description: `${a} and ${b} do not affect each other.`,
    numericEffect: null,
  };
}
```

---

## 9. Enhancement Acquisition

### 9.1 Seal Item Application

When a player purchases a seal item from the shop (Area 2):

```typescript
// acquisition/seal-application.ts

export interface SealApplicationRequest {
  enhancementType: EnhancementType;
  targetCardId: string;
}

export interface SealApplicationResult {
  success: boolean;
  card?: Card;
  error?: string;
}

/**
 * Validates and applies a seal enhancement to a target card.
 */
export function applySealEnhancement(
  request: SealApplicationRequest,
  deck: Card[]
): SealApplicationResult {
  const card = deck.find(c => c.id === request.targetCardId);

  if (!card) {
    return { success: false, error: 'Card not found in deck' };
  }

  // Constraint: one enhancement per card
  if (card.enhancement) {
    return { success: false, error: 'Card already has an enhancement' };
  }

  // Constraint: cannot Mark wild cards (Invariant 6)
  if (request.enhancementType === 'marked' && card.isWild) {
    return { success: false, error: 'Cannot apply Marked to wild cards (Invariant 6)' };
  }

  // Constraint: cannot Pure natural cards (no effect)
  if (request.enhancementType === 'pure' && !card.isWild) {
    return { success: false, error: 'Cannot apply Pure to natural cards (no effect)' };
  }

  // Constraint: cannot enhance red/black threes
  if (card.rank === '3') {
    return { success: false, error: 'Cannot enhance special cards (threes)' };
  }

  const enhancement: Enhancement = {
    type: request.enhancementType,
    instanceId: generateInstanceId(),
    appliedViaSeal: true,
    configValue: null,
  };

  return {
    success: true,
    card: { ...card, enhancement },
  };
}
```

### 9.2 Modifier Grants

Enhancements granted by partners or boss rules:

```typescript
// acquisition/modifier-grants.ts

export interface ModifierGrantRequest {
  enhancementType: EnhancementType;
  targetCardId: string;
  source: 'partner' | 'boss_rule';
  duration: 'permanent' | 'end_of_round';
}

export function applyModifierGrant(
  request: ModifierGrantRequest,
  deck: Card[]
): SealApplicationResult {
  const card = deck.find(c => c.id === request.targetCardId);

  if (!card) {
    return { success: false, error: 'Card not found' };
  }

  // Invariant 6 still applies: cannot Mark wild cards
  if (request.enhancementType === 'marked' && card.isWild) {
    return { success: false, error: 'Cannot apply Marked to wild cards (Invariant 6)' };
  }

  const enhancement: Enhancement = {
    type: request.enhancementType,
    instanceId: generateInstanceId(),
    appliedViaSeal: false, // modifier-granted
    configValue: null,
  };

  return {
    success: true,
    card: { ...card, enhancement },
  };
}
```

### 9.3 Enhancement Duration Tracking

Enhancements have two duration types:

| Duration | Description | Expiry Mechanism |
|----------|-------------|------------------|
| `permanent` | Seal-applied enhancements. Last for the card's lifetime in the run. | Only removed if the card itself is removed from the deck. |
| `end_of_round` | Modifier-granted enhancements (from partners or boss rules). Expire at the end of the current round. | Area 8's `RoundStateService.endRound()` iterates all cards in deck and removes enhancements where `!enhancement.appliedViaSeal`. |

**Tracking mechanism:**

```typescript
// In Card model (Area 1), the enhancement field:
interface Card {
  // ...
  enhancement: Enhancement | null;
}

// In Enhancement model (Area 4):
interface Enhancement {
  type: EnhancementType;
  instanceId: string;
  appliedViaSeal: boolean;  // true = permanent, false = modifier-granted (temporary)
  configValue: string | null;
}
```

**Why `appliedViaSeal` doubles as duration flag:**
- `appliedViaSeal: true` → permanent (seal item purchase). Never expires automatically.
- `appliedViaSeal: false` → temporary (modifier grant). Expires at end of round.
- This avoids adding a separate `duration` field and keeps the model minimal.

**Expiry enforcement (owned by Area 8):**

```typescript
// In RoundStateService.endRound():
function expireTemporaryEnhancements(deck: Card[]): Card[] {
  return deck.map(card => {
    if (card.enhancement && !card.enhancement.appliedViaSeal) {
      return { ...card, enhancement: null };  // Enhancement expires
    }
    return card;
  });
}
```

**Mid-round modifier deactivation:**
When a modifier is deactivated mid-round (e.g., partner replaced), its granted enhancements **do not** expire immediately. They persist until the end of the round. This prevents cascading failures where replacing one partner suddenly strips enhancements from cards that other modifiers depend on.

```typescript
// In ModifierStateService.replacePartner():
function replacePartner(slotIndex: number, newPartner: Partner): void {
  // Replace the partner slot
  this.updatePartnerSlot(slotIndex, newPartner);
  // NOTE: Do NOT expire enhancements granted by the old partner.
  // They persist until end of round via expireTemporaryEnhancements().
}
```

**Enhancement removal:**

```typescript
export function removeEnhancement(card: Card): Card {
  return { ...card, enhancement: null };
}

export function isTemporaryEnhancement(card: Card): boolean {
  return card.enhancement !== null && !card.enhancement.appliedViaSeal;
}
```

### 9.4 Instance ID Generation

```typescript
function generateInstanceId(): string {
  return `enh_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
```

---

## 10. Unit Test Plan

### 10.1 Test Files

| File | Coverage |
|------|----------|
| `__tests__/apply-enhancement.spec.ts` | All 10 enhancement application functions |
| `__tests__/wild-card-counting.spec.ts` | Wild card counting for all 4 treatments |
| `__tests__/economy-invariants.spec.ts` | All 6 invariants |
| `__tests__/interaction-matrix.spec.ts` | Matrix symmetry, diagonal, each non-neutral pair |
| `__tests__/seal-application.spec.ts` | Seal constraints (wild+marked, natural+pure, existing enhancement, threes) |
| `__tests__/modifier-grants.spec.ts` | Modifier grant flow, temporary vs permanent |

### 10.2 Test Cases by Enhancement Type

**Gilded:**
1. Gilded card returns size multiplier of 2
2. Non-Gilded card returns size multiplier of 1
3. Gilded wild counts as 2 for size but 1 for wild count
4. Gilded card point value is NOT doubled
5. Meld with 2 Gilded + 3 natural = 7 size units (canasta)
6. Meld with 3 Gilded is rejected (Invariant 4)

**Echo:**
1. Echo card on first meld returns draw count 1
2. Echo card on sealed canasta addition returns draw count 0
3. Non-Echo card returns draw count 0
4. Three Echo cards melded simultaneously = 3 draws

**Sticky:**
1. Sticky card discard is rejected (non-forced)
2. Sticky card discard is allowed when forced (boss rule override)
3. Non-Sticky card discard is allowed
4. Sticky card can be melded

**Marked:**
1. Marked natural card returns hasMarker true
2. Marked wild card returns hasMarker false (Invariant 6)
3. All-natural-Marked meld is red canasta eligible
4. Mixed Marked/unmarked natural meld is NOT red canasta eligible

**Pure:**
1. Pure wild counts as natural (countsAsNatural true)
2. Pure natural card is already natural (no-op)
3. Pure wild retains wild point value (20 for 2s, 50 for Jokers)
4. Meld with all Pure wilds has 0 wild count

**Hot:**
1. Hot card in sealed meld returns +50
2. Hot card in unsealed meld returns 0
3. Three Hot cards in sealed meld = +150
4. Hot bonus is added to cardPointTotal, not canastaBonus

**Frozen:**
1. Frozen card discard triggers freeze
2. Frozen card meld does NOT trigger freeze
3. Second Frozen discard on already-frozen pile is no-op

**Partner:**
1. Meld with ≥1 Partner card is partner-eligible
2. Meld with 0 Partner cards is not partner-eligible
3. Multiple Partner cards in same meld provide no extra benefit

**Buried:**
1. Buried card not yet melded is hidden
2. Buried card after meld is revealed
3. Buried card can be discarded blindly
4. Buried card cannot be shop target until revealed

**Anchor:**
1. Meld with Anchor: minimum size = 2 (new meld)
2. Meld without Anchor: minimum size = 3 (new meld)
3. Extending existing meld: minimum size = 1 (regardless of Anchor)
4. Anchor flag is set in MeldValidationContext

### 10.3 Wild Card Counting Tests

1. Normal wild: size=1, wild=1, natural=0, points=20/50
2. Pure wild: size=1, wild=0, natural=1, points=20/50
3. Gilded wild: size=2, wild=1, natural=0, points=20/50
4. Gilded Pure wild: size=2, wild=0, natural=1, points=20/50
5. Meld with 5 natural + 1 Pure + 1 Gilded natural = 8 size, 0 wild → natural canasta

### 10.4 Economy Invariant Tests

1. Invariant 1: 3 wilds + 4 naturals passes; 4 wilds + 3 naturals fails
2. Invariant 2: 12 wilds passes; 13 wilds fails
3. Invariant 3: purifiedWilds ≤ totalWildsInDeck
4. Invariant 4: 2 Gilded passes; 3 Gilded fails
5. Invariant 5: 1 natural + 1 Pure wild with Anchor = valid 2-card meld
6. Invariant 6: Marked on wild card is rejected

### 10.5 Interaction Matrix Tests

1. Matrix is symmetric: lookup(A, B) === lookup(B, A) for all 45 unique pairs
2. Diagonal entries return no_interaction
3. Gilded + Pure = synergistic
4. Gilded + Anchor = synergistic
5. Pure + Anchor = synergistic
6. Pure + Marked = conflicting
7. Sticky + Frozen = synergistic
8. All other off-diagonal pairs = neutral
9. Lookup returns correct description and numericEffect (null for all current pairs)

### 10.6 Seal Application Tests

1. Valid seal application succeeds
2. Seal on card with existing enhancement fails
3. Seal Marked on wild card fails (Invariant 6)
4. Seal Pure on natural card fails (no effect)
5. Seal on red/black three fails
6. Seal creates Enhancement with appliedViaSeal: true
7. Seal generates unique instanceId

### 10.7 Modifier Grant Tests

1. Valid modifier grant succeeds
2. Modifier grant on wild card with Marked fails (Invariant 6)
3. Modifier grant creates Enhancement with appliedViaSeal: false
4. Temporary enhancement is flagged correctly
5. Enhancement removal clears enhancement field

---

## 11. Dependencies

### 11.1 From Area 1 — Game Rules & Core Mechanics

```typescript
import type {
  Card,              // Core card type with id, rank, suit, isWild, enhancement
  Meld,              // Meld type with cards[], isSealed, etc.
  CanastaType,       // 'natural' | 'dirty' | 'red' | 'super' | 'partner'
  MeldValidationContext,  // Includes anchorEnhancementActive boolean
  TurnState,         // Current turn state for canasta type determination
  CanastaScoreResult, // Score result from scoreCanasta()
} from '../area1-game-rules';
```

Area 4 **must not** redefine `validateMeld()`, `scoreCanasta()`, or `determineCanastaType()`. It composes on top of them.

### 11.2 From Area 3 — Modifier Systems

```typescript
import type {
  CanastaScoreResult,          // Input to modifier pipeline
  EnhancementPipelineContract,  // Defines the scoring order contract
} from '../area3-modifier-systems';
```

Scoring order: Enhancement effects → `scoreCanasta()` (Area 1) → Modifier pipeline (Area 3).

### 11.3 To Area 8 — Game State Management

Area 8 imports from Area 4:

```typescript
import type {
  Enhancement,
  EnhancementType,
  WildCardEconomyState,
} from '../area4-card-enhancements';
```

Area 8 defines:
- `DeckCardEnhancementState` (per-card enhancement storage)
- `RoundState.wildCardEconomy` field (for invariant checking during state transitions)

---

## 12. Implementation Order

1. **Models layer** — Create all interfaces and types (`enhancement-type.ts`, `wild-card-rule.ts`, `enhancement-interaction.ts`, `wild-card-economy-state.ts`). Write barrel exports. These have no dependencies on other Area 4 code.

2. **Enhancement definitions** — Create `enhancement-definitions.ts` with the 10 enhancement definitions as data (trigger/effect/constraint descriptions) and the `WILD_CARD_RULES` constant.

3. **Wild card counting transforms** — Implement `wild-card-counting.ts` with `getMeldSizeContribution`, `getWildCountContribution`, `getNaturalCountContribution`, `getEffectivePointValue`, `countGildedInMeld`, and `countWildCardsInMeld`. These are pure functions over `Card` and `Meld`.

4. **Enhancement application transforms** — Implement `apply-enhancement.ts` with all 10 enhancement functions. Each function reads the card's enhancement and returns the appropriate contribution. Depend on models and wild card counting.

5. **Economy invariants** — Implement `economy-invariants.ts` with all 6 invariant check functions and `runAllInvariants`. Depend on wild card counting transforms.

6. **Interaction matrix** — Implement `interaction-matrix.ts` with the normalized key lookup, the `INTERACTION_MAP` constant for non-neutral pairs, and the default logic for neutral/no-interaction pairs.

7. **Seal application** — Implement `seal-application.ts` with validation logic for all constraints (Invariant 6, one-per-card, no threes, no Pure on naturals).

8. **Modifier grants** — Implement `modifier-grants.ts` with grant logic, duration tracking, and removal functions.

9. **Barrel exports and module** — Create `index.ts` files at each level and the top-level `index.ts`. Create `enhancements.module.ts` if Angular DI is needed.

10. **Unit tests** — Write all 6 test files in parallel with implementation. Each transform function should have tests written alongside it (TDD-style).

---

## 13. Acceptance Criteria

- [ ] All 5 model interfaces are fully typed with no `any` or partial types
- [ ] `EnhancementType` union covers all 10 enhancement types
- [ ] `RED_ENHANCEMENT_MARKER_ID` constant equals `'marked'`
- [ ] `WILD_CARD_RULES` constant defines both `'2'` and `'JOKER'` with correct point values (20, 50) and `canBePurified: true`
- [ ] All 10 enhancement application functions are pure transforms
- [ ] Wild card counting correctly handles all 4 treatments (normal, pure, gilded, gilded+pure)
- [ ] All 6 economy invariants are implemented as runtime check functions
- [ ] Invariant 1 enforces `wildCount < naturalCount`
- [ ] Invariant 4 enforces max 2 Gilded per meld
- [ ] Invariant 6 rejects Marked on wild cards at both acquisition and runtime
- [ ] Interaction matrix lookup is symmetric for all 45 unique pairs
- [ ] Interaction matrix returns correct type for all 5 non-neutral pairs
- [ ] Interaction matrix diagonal returns `no_interaction` for all 10 same-type pairs
- [ ] All other matrix pairs return `neutral`
- [ ] Seal application rejects: wild+marked, natural+pure, existing enhancement, threes
- [ ] Seal application creates `Enhancement` with `appliedViaSeal: true` and unique `instanceId`
- [ ] Modifier grants create `Enhancement` with `appliedViaSeal: false`
- [ ] Temporary enhancements are distinguishable from permanent ones
- [ ] Enhancement removal clears the enhancement field
- [ ] `buildMeldValidationContext` correctly sets `anchorEnhancementActive`
- [ ] All unit test files exist and pass (6 test files, ≥60 test cases)
- [ ] Barrel exports are complete at every directory level
- [ ] No Area 4 code redefines Area 1's `validateMeld()`, `scoreCanasta()`, or `determineCanastaType()`
- [ ] Area 4 code composes on top of Area 1 and Area 3 contracts correctly
