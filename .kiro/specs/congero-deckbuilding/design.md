
# Design Document — Area 2: Deckbuilding & Run Structure

## Overview

Area 2 defines the structural skeleton of a Congero run: the full card pool from which decks are built, the ante/round progression that escalates difficulty, the round lifecycle that sequences each scoring cycle, and the shop system that lets players acquire and remove cards between rounds. It is the authoritative source for card pool composition (every rank, suit, and special card with count), the starting deck, the ante/round progression table, the score target scaling formula, the round lifecycle phase sequence, and the shop item generation algorithm including item pool, rarity weights, slot count, and reroll cost. Area 2 depends on Area 1 (Game Rules & Core Mechanics) for canasta type definitions, meld validity rules, and scoring formulas — it references those definitions rather than redefining them.

**Out of scope for this document:** Individual card enhancement types and their effects (Area 4), modifier systems that alter shop or run rules such as House Rules, Scorepads, Trays, and Partners (Area 3), how run state is persisted and restored (Area 8), how the shop screen is rendered or how the round lifecycle is animated (Area 5 and Area 6), and Angular component or service implementation details (Area 7).

---
## 1. Data Models

All types are TypeScript. No `any`, no partial types. All fields are required unless explicitly typed as `| null`.

```typescript
// ─── Card Pool ───────────────────────────────────────────────────────────────

/**
 * A single entry in the canonical card pool table.
 * Describes one logical card type and how many copies exist in the full pool.
 */
export interface CardPoolEntry {
  /** The rank of this card type. Matches Rank from Area 1. */
  rank: Rank;
  /** The suit of this card type. null for Jokers (which have no suit). */
  suit: Suit | null;
  /** Total number of copies of this card type in the full 108-card pool. */
  count: number;
  /**
   * True if this card is a wild card (rank === '2' or rank === 'JOKER').
   * Mirrors Card.isWild from Area 1.
   */
  isWild: boolean;
  /**
   * True if this card is a red three (rank === '3', suit is 'hearts' or 'diamonds').
   * Red threes are auto-played as bonus cards and are never held in hand.
   */
  isRedThree: boolean;
  /**
   * True if this card is a black three (rank === '3', suit is 'clubs' or 'spades').
   * Black threes may only be discarded; they cannot be melded.
   */
  isBlackThree: boolean;
  /**
   * True if this card is included in the player's starting deck.
   * See Section 3.2 for starting deck composition rules.
   */
  inStartingDeck: boolean;
}

// ─── Ante ────────────────────────────────────────────────────────────────────

/**
 * One ante in the run progression.
 * An ante is a grouping of rounds that escalates difficulty.
 * The final round of each ante is a boss round.
 */
export interface Ante {
  /** Ante number, 1-indexed. */
  anteNumber: number;
  /** Total number of rounds in this ante. */
  roundCount: number;
  /**
   * The round index (1-indexed within the ante) that is the boss round.
   * Always equals roundCount (boss round is always the last round of the ante).
   */
  bossRoundIndex: number;
  /**
   * Base score target for the first round of this ante.
   * Subsequent rounds within the ante use roundScoreTarget() to compute their target.
   * See Section 3.3 for the scaling formula.
   */
  baseScoreTarget: number;
}

// ─── Round ───────────────────────────────────────────────────────────────────

/**
 * One round within an ante.
 * A round is a single scoring cycle: draw, play melds, score, then shop.
 */
export interface Round {
  /** The ante this round belongs to. */
  anteNumber: number;
  /** Round number within the ante, 1-indexed. */
  roundNumber: number;
  /** Absolute round number across the entire run, 1-indexed. */
  absoluteRoundNumber: number;
  /** Score target the player must meet or exceed to advance. */
  scoreTarget: number;
  /** True if this is the boss round for its ante. */
  isBossRound: boolean;
  /**
   * The boss rule identifier active for this round, or null if not a boss round.
   * Boss rule definitions are owned by Area 3.
   */
  bossRuleId: string | null;
  /** Current phase of this round's lifecycle. */
  phase: RoundPhase;
}

// ─── Round Phase ─────────────────────────────────────────────────────────────

/**
 * The four phases of a round lifecycle.
 * Valid transitions are defined in Section 3.4.
 */
export type RoundPhase = 'Draw' | 'Play' | 'Score' | 'Shop';

// ─── Shop Item ───────────────────────────────────────────────────────────────

/**
 * One item available for purchase in the shop.
 */
export interface ShopItem {
  /** Unique identifier for this shop item instance (generated per shop refresh). */
  id: string;
  /** The category of this shop item. */
  category: ShopItemCategory;
  /**
   * The specific item type within the category.
   * For 'enhancement' items, this is an EnhancementType (Area 4).
   * For 'partner', 'houseRule', 'scorepad', 'tray' items, this is a modifier ID (Area 3).
   * For 'cardPack' items, this is a pack type identifier.
   * For 'sealItem' items, this is a seal applicator identifier.
   */
  itemTypeId: string;
  /** Rarity tier of this item. Determines base cost and appearance frequency. */
  rarity: ShopItemRarity;
  /** Gold cost to purchase this item. */
  cost: number;
  /** True if the player has already purchased this item this shop phase. */
  purchased: boolean;
}

/**
 * The six categories of shop items.
 * Enhancement and modifier definitions are owned by Areas 4 and 3 respectively.
 * Area 2 owns the category taxonomy and generation algorithm.
 */
export type ShopItemCategory =
  | 'enhancement'  // Applied to an individual card (Area 4 owns definitions)
  | 'partner'      // Passive modifier slot (Area 3 owns definitions)
  | 'houseRule'    // Global run mutation (Area 3 owns definitions)
  | 'scorepad'     // Formula modifier (Area 3 owns definitions)
  | 'tray'         // Meld-slot modifier (Area 3 owns definitions)
  | 'cardPack'     // Adds cards to the player's deck
  | 'sealItem';    // Applies an enhancement to a card in the player's deck

/**
 * Rarity tiers for shop items.
 * Weights are defined in Section 3.5.
 */
export type ShopItemRarity = 'common' | 'uncommon' | 'rare' | 'legendary';

// ─── Run Progression ─────────────────────────────────────────────────────────

/**
 * The full progression state of a run.
 * Tracks which ante and round the player is currently in,
 * and the player's current gold and deck state.
 */
export interface RunProgression {
  /** Current ante number, 1-indexed. */
  currentAnte: number;
  /** Current round number within the ante, 1-indexed. */
  currentRound: number;
  /** Absolute round number across the entire run, 1-indexed. */
  absoluteRound: number;
  /** Player's current gold balance. */
  gold: number;
  /**
   * Number of times the player has rerolled the shop this round.
   * Reroll cost increases with each reroll. See Section 3.5.
   */
  rerollCount: number;
  /**
   * The current shop state: items available for purchase.
   * null between rounds (before the shop phase begins).
   */
  currentShop: ShopState | null;
  /**
   * True if the run is over (player failed to meet a score target or completed all antes).
   */
  runOver: boolean;
  /**
   * True if the player won (completed all antes successfully).
   */
  runWon: boolean;
}

/**
 * The state of the shop for one round.
 */
export interface ShopState {
  /** Items currently displayed in the shop. Length equals the slot count for this ante. */
  items: ShopItem[];
  /** Number of times the shop has been rerolled this round. */
  rerollCount: number;
  /** Cost of the next reroll. See Section 3.5 for the formula. */
  nextRerollCost: number;
}
```

---
## 2. Card Point Values Reference

Area 2 references card point values defined in Area 1 (Game Rules & Core Mechanics, Section 2). They are not redefined here. The card pool enumeration in Section 3.1 uses `Rank` and `Suit` types from Area 1.

---

## 3. Core Algorithms

### 3.1 Full Card Pool Enumeration

The full Congero card pool is two standard 52-card decks plus 4 jokers = **108 cards total**.

**Standard ranks per suit (non-special):**

Each of the ranks A, 4, 5, 6, 7, 8, 9, 10, J, Q, K appears in all 4 suits across 2 decks = **8 copies per rank per suit group** (2 copies per suit).

**Special cards:**

| Card Type | Rank | Suit | Count | Notes |
|-----------|------|------|-------|-------|
| Red Three | 3 | ♥ | 2 | Auto-played as bonus card; 1 per deck |
| Red Three | 3 | ♦ | 2 | Auto-played as bonus card; 1 per deck |
| Black Three | 3 | ♣ | 2 | Discard-only; 1 per deck |
| Black Three | 3 | ♠ | 2 | Discard-only; 1 per deck |
| Two (wild) | 2 | ♥ | 2 | Wild card; 1 per deck |
| Two (wild) | 2 | ♦ | 2 | Wild card; 1 per deck |
| Two (wild) | 2 | ♣ | 2 | Wild card; 1 per deck |
| Two (wild) | 2 | ♠ | 2 | Wild card; 1 per deck |
| Joker | JOKER | null | 4 | Wild card; 2 per deck |

**Complete card pool table (108 cards):**

| Rank | ♠ | ♥ | ♦ | ♣ | Count | Special |
|------|---|---|---|---|-------|---------|
| A | 2 | 2 | 2 | 2 | 8 | — |
| K | 2 | 2 | 2 | 2 | 8 | — |
| Q | 2 | 2 | 2 | 2 | 8 | — |
| J | 2 | 2 | 2 | 2 | 8 | — |
| 10 | 2 | 2 | 2 | 2 | 8 | — |
| 9 | 2 | 2 | 2 | 2 | 8 | — |
| 8 | 2 | 2 | 2 | 2 | 8 | — |
| 7 | 2 | 2 | 2 | 2 | 8 | — |
| 6 | 2 | 2 | 2 | 2 | 8 | — |
| 5 | 2 | 2 | 2 | 2 | 8 | — |
| 4 | 2 | 2 | 2 | 2 | 8 | — |
| 3 | 2 (black) | 2 (red) | 2 (red) | 2 (black) | 8 | Red threes auto-play; black threes discard-only |
| 2 | 2 (wild) | 2 (wild) | 2 (wild) | 2 (wild) | 8 | Wild cards |
| JOKER | — | — | — | — | 4 | Wild cards; no suit |
| **Total** | | | | | **108** | |

**Pool verification:**
- 11 standard ranks (A, K, Q, J, 10, 9, 8, 7, 6, 5, 4) × 4 suits × 2 copies = 88 cards
- Rank 3: 4 suits × 2 copies = 8 cards (4 red threes + 4 black threes)
- Rank 2: 4 suits × 2 copies = 8 cards (all wild)
- Jokers: 4 cards
- **Total: 88 + 8 + 8 + 4 = 108 ✓**

**Wild card summary:**
- Twos: 8 total (4 suits × 2 decks)
- Jokers: 4 total (2 per deck)
- **Total wilds: 12 out of 108 cards (11.1%)**

**Pure function to build the card pool:**

```typescript
function buildCardPool(): CardPoolEntry[] {
  const suits: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
  const standardRanks: Rank[] = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4'];
  const pool: CardPoolEntry[] = [];

  // Standard ranks: 2 copies per suit (2 decks)
  for (const rank of standardRanks) {
    for (const suit of suits) {
      pool.push({
        rank, suit, count: 2,
        isWild: false, isRedThree: false, isBlackThree: false,
        inStartingDeck: false, // set by buildStartingDeck()
      });
    }
  }

  // Rank 3: red threes (hearts, diamonds) and black threes (clubs, spades)
  for (const suit of suits) {
    const isRed = suit === 'hearts' || suit === 'diamonds';
    pool.push({
      rank: '3', suit, count: 2,
      isWild: false,
      isRedThree: isRed,
      isBlackThree: !isRed,
      inStartingDeck: false,
    });
  }

  // Rank 2: wild cards, 2 copies per suit
  for (const suit of suits) {
    pool.push({
      rank: '2', suit, count: 2,
      isWild: true, isRedThree: false, isBlackThree: false,
      inStartingDeck: false,
    });
  }

  // Jokers: 4 total, no suit
  pool.push({
    rank: 'JOKER', suit: null, count: 4,
    isWild: true, isRedThree: false, isBlackThree: false,
    inStartingDeck: false,
  });

  return pool;
}
```

---

### 3.2 Starting Deck Composition

The player begins each run with a **52-card starting deck** — one copy of every card from the full pool (one standard deck, no jokers). This gives the player a balanced starting point with one copy of each rank in each suit.

**Starting deck rules:**

| Card Type | Count in Starting Deck | Notes |
|-----------|----------------------|-------|
| Standard ranks (A, K, Q, J, 10, 9, 8, 7, 6, 5, 4) | 44 (11 ranks × 4 suits × 1 copy) | One copy per suit |
| Rank 3 (red threes) | 2 (♥ + ♦) | Auto-played when drawn |
| Rank 3 (black threes) | 2 (♣ + ♠) | Discard-only |
| Rank 2 (wilds) | 4 (4 suits × 1 copy) | Wild cards |
| Jokers | 0 | Not in starting deck |
| **Total** | **52** | |

**Rationale:** Starting with one deck (no jokers) gives the player 4 copies of each standard rank (one per suit), 4 wilds (the four 2s), and the 4 threes. This is a playable but unspecialized deck — the player must use the shop to add more copies of preferred ranks, acquire jokers, and remove unwanted cards to build toward a strategy.

**Pure function:**

```typescript
function buildStartingDeck(pool: CardPoolEntry[]): CardPoolEntry[] {
  return pool.map(entry => ({
    ...entry,
    // Starting deck includes exactly 1 copy of each card type, except Jokers
    inStartingDeck: entry.rank !== 'JOKER',
  }));
}

function getStartingDeckCount(pool: CardPoolEntry[]): number {
  return pool
    .filter(e => e.inStartingDeck)
    .reduce((sum, e) => sum + 1, 0); // 1 copy per entry, not e.count
}
// Returns 52: 11 standard ranks × 4 suits + 4 threes + 4 twos = 52
```

---

### 3.3 Ante/Round Progression Table

A run consists of **8 antes**. Each ante contains **3 rounds**, with the third round always being the boss round. The run ends when the player completes Ante 8 (win) or fails to meet a score target (loss).

**Score target scaling formula:**

The base score target for Ante `a` (1-indexed) is:

```
baseScoreTarget(a) = 100 × 2^(a - 1)
```

This doubles the base target with each ante:

| Ante | Base Formula | Base Score Target |
|------|-------------|-------------------|
| 1 | 100 × 2^0 | 100 |
| 2 | 100 × 2^1 | 200 |
| 3 | 100 × 2^2 | 400 |
| 4 | 100 × 2^3 | 800 |
| 5 | 100 × 2^4 | 1,600 |
| 6 | 100 × 2^5 | 3,200 |
| 7 | 100 × 2^6 | 6,400 |
| 8 | 100 × 2^7 | 12,800 |

Within an ante, each round's score target scales by a **round multiplier**:

```
roundScoreTarget(a, r) = baseScoreTarget(a) × roundMultiplier(r)
```

Where `r` is the round number within the ante (1, 2, or 3) and:

```
roundMultiplier(1) = 1.0   // first round: base target
roundMultiplier(2) = 1.5   // second round: 50% harder
roundMultiplier(3) = 2.0   // boss round: double the base target
```

**Complete progression table (all 8 antes, all 3 rounds):**

| Ante | Round | Abs Round | Score Target | Boss? | Notes |
|------|-------|-----------|-------------|-------|-------|
| 1 | 1 | 1 | 100 | No | Tutorial difficulty |
| 1 | 2 | 2 | 150 | No | |
| 1 | 3 | 3 | 200 | **Yes** | First boss |
| 2 | 1 | 4 | 200 | No | |
| 2 | 2 | 5 | 300 | No | |
| 2 | 3 | 6 | 400 | **Yes** | |
| 3 | 1 | 7 | 400 | No | |
| 3 | 2 | 8 | 600 | No | |
| 3 | 3 | 9 | 800 | **Yes** | |
| 4 | 1 | 10 | 800 | No | |
| 4 | 2 | 11 | 1,200 | No | |
| 4 | 3 | 12 | 1,600 | **Yes** | Mid-run boss |
| 5 | 1 | 13 | 1,600 | No | |
| 5 | 2 | 14 | 2,400 | No | |
| 5 | 3 | 15 | 3,200 | **Yes** | |
| 6 | 1 | 16 | 3,200 | No | |
| 6 | 2 | 17 | 4,800 | No | |
| 6 | 3 | 18 | 6,400 | **Yes** | |
| 7 | 1 | 19 | 6,400 | No | |
| 7 | 2 | 20 | 9,600 | No | |
| 7 | 3 | 21 | 12,800 | **Yes** | |
| 8 | 1 | 22 | 12,800 | No | |
| 8 | 2 | 23 | 19,200 | No | |
| 8 | 3 | 24 | 25,600 | **Yes** | Final boss |

**Pure functions:**

```typescript
function baseScoreTarget(anteNumber: number): number {
  return 100 * Math.pow(2, anteNumber - 1);
}

function roundMultiplier(roundNumberWithinAnte: number): number {
  switch (roundNumberWithinAnte) {
    case 1: return 1.0;
    case 2: return 1.5;
    case 3: return 2.0;
    default:
      throw new Error(`Invalid round number within ante: ${roundNumberWithinAnte}`);
  }
}

function roundScoreTarget(anteNumber: number, roundNumberWithinAnte: number): number {
  return Math.round(baseScoreTarget(anteNumber) * roundMultiplier(roundNumberWithinAnte));
}

function buildAnte(anteNumber: number): Ante {
  return {
    anteNumber,
    roundCount: 3,
    bossRoundIndex: 3,
    baseScoreTarget: baseScoreTarget(anteNumber),
  };
}

function buildRound(anteNumber: number, roundNumber: number, absoluteRoundNumber: number): Round {
  return {
    anteNumber,
    roundNumber,
    absoluteRoundNumber,
    scoreTarget: roundScoreTarget(anteNumber, roundNumber),
    isBossRound: roundNumber === 3,
    bossRuleId: roundNumber === 3 ? selectBossRule(anteNumber) : null,
    phase: 'Draw',
  };
}
```

**Note on `selectBossRule`:** Boss rule selection is owned by Area 3 (Modifier Systems). Area 2 defines the injection point (`bossRuleId` field on `Round`) and the fact that boss rounds always occur at round 3 of each ante. Area 3 defines the pool of boss rules and the selection algorithm.

---

### 3.4 Round Lifecycle

Each round progresses through four phases in sequence. The round lifecycle is distinct from the turn structure defined in Area 1 (Game Rules & Core Mechanics, Section 3.4). The turn structure governs individual player turns within the Play phase; the round lifecycle governs the sequence of phases that make up a complete round.

**Phase definitions:**

| Phase | Description | Entry Condition | Exit Condition |
|-------|-------------|-----------------|----------------|
| `Draw` | Player's deck is shuffled (if needed) and the initial hand is dealt. Red threes are auto-played and replaced. | Round begins (previous round's Shop phase ended, or run start). | Hand has been dealt (default: 11 cards). |
| `Play` | Player takes turns: drawing, melding, discarding, going out. Multiple player turns occur in this phase. | Draw phase complete; hand is in player's possession. | Player goes out (meets going-out conditions from Area 1, Section 3.5) OR player's draw pile is exhausted and hand is empty. |
| `Score` | All melds are scored. Canasta bonuses are applied. Going-out bonus is applied. Round score is compared to score target. | Play phase complete (player has gone out or deck exhausted). | Score has been computed and compared to target. |
| `Shop` | Player spends gold to buy items, add/remove cards, and reroll the shop. | Score phase complete. Player advances only if score ≥ scoreTarget. | Player clicks "Continue" or all gold is spent. |

**Valid round phase transitions:**

```
Draw  ──► Play
Play  ──► Score
Score ──► Shop    (only if score ≥ scoreTarget — player advances)
Score ──► [Run Over]  (if score < scoreTarget — player fails)
Shop  ──► Draw    (next round begins)
Shop  ──► [Run Won]   (if ante 8, round 3 completed successfully)
```

**Round lifecycle state machine (TypeScript):**

```typescript
type RoundPhaseTransition =
  | { from: 'Draw';  to: 'Play' }
  | { from: 'Play';  to: 'Score' }
  | { from: 'Score'; to: 'Shop';     guard: 'scoreMetTarget' }
  | { from: 'Score'; to: 'RunOver';  guard: 'scoreMissedTarget' }
  | { from: 'Shop';  to: 'Draw';     guard: 'notFinalRound' }
  | { from: 'Shop';  to: 'RunWon';   guard: 'finalRoundComplete' };

function canTransitionRoundPhase(
  current: RoundPhase,
  next: RoundPhase | 'RunOver' | 'RunWon',
  context: RoundTransitionContext
): boolean {
  switch (current) {
    case 'Draw':  return next === 'Play';
    case 'Play':  return next === 'Score';
    case 'Score':
      if (next === 'Shop')    return context.roundScore >= context.scoreTarget;
      if (next === 'RunOver') return context.roundScore < context.scoreTarget;
      return false;
    case 'Shop':
      if (next === 'RunWon') return context.isFinalRound;
      if (next === 'Draw')   return !context.isFinalRound;
      return false;
    default:
      const _exhaustive: never = current;
      throw new Error(`Unhandled RoundPhase: ${_exhaustive}`);
  }
}

export interface RoundTransitionContext {
  roundScore: number;
  scoreTarget: number;
  isFinalRound: boolean; // true if ante === 8 and roundNumber === 3
}
```

**Draw phase — hand size:**

The player draws **11 cards** at the start of each round. If the draw pile has fewer than 11 cards, the discard pile is shuffled and becomes the new draw pile (standard canasta reshuffling). Red threes drawn during the initial deal are auto-played to the bonus area and replaced with additional draws until the player holds 11 non-red-three cards.

```typescript
const INITIAL_HAND_SIZE = 11;

function dealInitialHand(deck: Card[], discardPile: Card[]): {
  hand: Card[];
  remainingDeck: Card[];
  autoPlayedRedThrees: Card[];
} {
  // Reshuffle discard into deck if needed
  let drawPile = deck.length >= INITIAL_HAND_SIZE
    ? deck
    : [...deck, ...shuffle(discardPile)];

  const hand: Card[] = [];
  const autoPlayedRedThrees: Card[] = [];

  while (hand.length < INITIAL_HAND_SIZE) {
    if (drawPile.length === 0) break; // edge case: deck exhausted
    const card = drawPile.shift()!;
    if (card.isRedThree) {
      autoPlayedRedThrees.push(card);
      // Red three is auto-played; draw a replacement
    } else {
      hand.push(card);
    }
  }

  return { hand, remainingDeck: drawPile, autoPlayedRedThrees };
}
```

---

### 3.5 Shop Item Generation Algorithm

The shop appears after each round's Score phase (provided the player met the score target). It presents a set of items the player can purchase with gold.

**Shop slot count by ante:**

| Ante | Shop Slots |
|------|-----------|
| 1 | 3 |
| 2 | 3 |
| 3 | 4 |
| 4 | 4 |
| 5 | 5 |
| 6 | 5 |
| 7 | 5 |
| 8 | 5 |

```typescript
function shopSlotCount(anteNumber: number): number {
  if (anteNumber <= 2) return 3;
  if (anteNumber <= 4) return 4;
  return 5;
}
```

**Item pool by category:**

| Category | Items in Pool | Notes |
|----------|--------------|-------|
| `enhancement` | 10 types (Gilded, Echo, Sticky, Marked, Pure, Hot, Frozen, Partner, Buried, Anchor) | Definitions owned by Area 4 |
| `partner` | 12 partner types | Definitions owned by Area 3 |
| `houseRule` | 8 house rule types | Definitions owned by Area 3 |
| `scorepad` | 6 scorepad types | Definitions owned by Area 3 |
| `tray` | 6 tray types | Definitions owned by Area 3 |
| `cardPack` | 4 pack types (Standard Pack, Wild Pack, Rank Pack, Special Pack) | See Section 3.6 |
| `sealItem` | 10 seal applicator types (one per enhancement type) | Applies an enhancement to a chosen card |

**Rarity weights:**

| Rarity | Weight | Approximate Frequency |
|--------|--------|----------------------|
| `common` | 60 | ~60% of slots |
| `uncommon` | 25 | ~25% of slots |
| `rare` | 12 | ~12% of slots |
| `legendary` | 3 | ~3% of slots |

**Category weights (used to select which category fills each slot):**

| Category | Weight | Notes |
|----------|--------|-------|
| `enhancement` | 30 | Most common — individual card upgrades |
| `cardPack` | 25 | Deck expansion |
| `partner` | 15 | Passive modifier slots |
| `scorepad` | 10 | Formula modifiers |
| `tray` | 10 | Meld-slot modifiers |
| `houseRule` | 7 | Global run mutations |
| `sealItem` | 3 | Rare — applies enhancement directly to a card |

**Base costs by rarity:**

| Rarity | Base Cost (gold) |
|--------|-----------------|
| `common` | 3 |
| `uncommon` | 5 |
| `rare` | 8 |
| `legendary` | 12 |

**Reroll cost formula:**

```
rerollCost(rerollCount) = 1 + rerollCount
```

The first reroll costs 1 gold, the second costs 2 gold, the third costs 3 gold, and so on.

```typescript
function rerollCost(rerollCount: number): number {
  return 1 + rerollCount;
}
```

**Shop generation algorithm (pseudocode):**

```
function generateShop(anteNumber: number, rerollCount: number): ShopState {
  slotCount = shopSlotCount(anteNumber)
  items = []

  for i in 0..slotCount:
    category = weightedRandom(CATEGORY_WEIGHTS)
    rarity = weightedRandom(RARITY_WEIGHTS)
    itemTypeId = randomFromPool(category, rarity)
    cost = baseCost(rarity)
    items.push({ id: uuid(), category, itemTypeId, rarity, cost, purchased: false })

  return {
    items,
    rerollCount,
    nextRerollCost: rerollCost(rerollCount),
  }
}
```

**TypeScript implementation:**

```typescript
function generateShop(anteNumber: number, rerollCount: number): ShopState {
  const slotCount = shopSlotCount(anteNumber);
  const items: ShopItem[] = [];

  for (let i = 0; i < slotCount; i++) {
    const category = weightedRandom<ShopItemCategory>(CATEGORY_WEIGHTS);
    const rarity = weightedRandom<ShopItemRarity>(RARITY_WEIGHTS);
    const itemTypeId = randomItemFromPool(category, rarity);
    items.push({
      id: generateId(),
      category,
      itemTypeId,
      rarity,
      cost: BASE_COST[rarity],
      purchased: false,
    });
  }

  return {
    items,
    rerollCount,
    nextRerollCost: rerollCost(rerollCount),
  };
}

const BASE_COST: Record<ShopItemRarity, number> = {
  common: 3,
  uncommon: 5,
  rare: 8,
  legendary: 12,
};

const RARITY_WEIGHTS: Array<{ value: ShopItemRarity; weight: number }> = [
  { value: 'common',    weight: 60 },
  { value: 'uncommon',  weight: 25 },
  { value: 'rare',      weight: 12 },
  { value: 'legendary', weight: 3  },
];

const CATEGORY_WEIGHTS: Array<{ value: ShopItemCategory; weight: number }> = [
  { value: 'enhancement', weight: 30 },
  { value: 'cardPack',    weight: 25 },
  { value: 'partner',     weight: 15 },
  { value: 'scorepad',    weight: 10 },
  { value: 'tray',        weight: 10 },
  { value: 'houseRule',   weight: 7  },
  { value: 'sealItem',    weight: 3  },
];
```

---

### 3.6 Card Acquisition Model

Players can modify their deck during the Shop phase through three operations: **add**, **remove**, and **convert**.

**Gold income per round:**

Players earn gold at the end of each round's Score phase:

```
goldEarned(roundScore, scoreTarget) = 4 + floor(roundScore / scoreTarget)
```

Minimum gold earned per round: 4 (even if score exactly meets target). Maximum is uncapped — a very high score earns proportionally more gold.

```typescript
function goldEarned(roundScore: number, scoreTarget: number): number {
  return 4 + Math.floor(roundScore / scoreTarget);
}
```

**Add operation — Card Packs:**

Card packs add cards to the player's deck. Four pack types are available:

| Pack Type | Cards Added | Cost | Contents |
|-----------|------------|------|----------|
| Standard Pack | 3 cards | 4 gold | 3 random cards from the full pool (any rank, any suit) |
| Wild Pack | 2 cards | 6 gold | 2 wild cards (2s or Jokers, weighted toward 2s) |
| Rank Pack | 3 cards | 5 gold | 3 cards of a chosen rank (player selects the rank) |
| Special Pack | 2 cards | 7 gold | 2 special cards (red threes, black threes, or wilds) |

**Add operation — direct purchase:**

Players may also purchase individual cards directly. The cost is based on the card's point value:

```
cardAddCost(card) = max(2, floor(card.pointValue / 5))
```

| Card Type | Point Value | Add Cost |
|-----------|------------|---------|
| JOKER | 50 | 10 gold |
| 2 (wild) | 20 | 4 gold |
| A | 20 | 4 gold |
| K, Q, J, 10, 9, 8 | 10 | 2 gold |
| 7, 6, 5, 4 | 5 | 2 gold (minimum) |
| Black 3 | 5 | 2 gold (minimum) |
| Red 3 | 100 | 20 gold |

```typescript
function cardAddCost(card: Card): number {
  return Math.max(2, Math.floor(card.pointValue / 5));
}
```

**Remove operation:**

Players may remove cards from their deck during the Shop phase. Removing a card costs gold (the player pays to thin their deck):

```
cardRemoveCost(card) = max(1, floor(card.pointValue / 10))
```

| Card Type | Point Value | Remove Cost |
|-----------|------------|------------|
| JOKER | 50 | 5 gold |
| 2 (wild) | 20 | 2 gold |
| A | 20 | 2 gold |
| K, Q, J, 10, 9, 8 | 10 | 1 gold |
| 7, 6, 5, 4 | 5 | 1 gold (minimum) |
| Black 3 | 5 | 1 gold (minimum) |
| Red 3 | 100 | 10 gold |

```typescript
function cardRemoveCost(card: Card): number {
  return Math.max(1, Math.floor(card.pointValue / 10));
}
```

**Convert operation:**

Players may convert a card in their deck to a different rank. This changes the card's rank while preserving any enhancement applied to it. Convert cost:

```
cardConvertCost(fromCard, toRank) = cardAddCost(targetCard) + 1
```

Where `targetCard` is a card of `toRank` with the same suit as `fromCard`.

```typescript
function cardConvertCost(fromCard: Card, toRank: Rank): number {
  const targetPointValue = getCardPointValue(toRank, fromCard.suit);
  const targetCard: Card = { ...fromCard, rank: toRank, pointValue: targetPointValue };
  return cardAddCost(targetCard) + 1;
}
```

**Constraints:**
- Players cannot remove a card if it would leave their deck with fewer than **20 cards** (minimum deck size).
- Players cannot add a card if it would bring their deck above **108 cards** (full pool size).
- Players cannot convert a Joker (Jokers have no suit and cannot be converted to a ranked card).
- Players cannot convert a red three or black three (special cards cannot be converted).
- Wild cards (2s) can be converted to any non-wild rank.

---

## 4. Interfaces & Contracts with Adjacent Areas

### 4.1 Contract with Area 1 — Game Rules & Core Mechanics

Area 2 depends on Area 1 for canasta type definitions, meld validity rules, scoring formulas, and the turn structure state machine. Area 2 does not redefine any of these — it references them.

**Types imported from Area 1:**

```typescript
// Area 2 imports these from Area 1 (congero-game-rules):
import type { Rank, Suit, Card, CanastaType, TurnPhase, GoOutCondition } from './area1-game-rules';
import type { BossRuleHookSet } from './area1-game-rules';
import { getCardPointValue } from './area1-game-rules';
```

**Scoring target reference:**

Area 2's `roundScoreTarget()` function produces the score target that the player must meet using the scoring formulas defined in Area 1. The score target is a plain number; Area 1's `scoreCanasta()` and related functions produce the player's actual score. Area 2 does not define how score is computed — only what the target is.

**Boss round injection point:**

Area 2 defines the `bossRuleId` field on `Round`. This field is populated by Area 3 (Modifier Systems) using the boss rule pool defined there. Area 1 defines the named hook injection points (`ON_MELD_VALIDATE`, `ON_CANASTA_SCORED`, etc.) that boss rules use. Area 2 connects them by providing the `bossRuleId` on the `Round` record.

```typescript
// Area 2 exposes this for Area 3 to populate:
export interface Round {
  // ...
  bossRuleId: string | null; // Area 3 selects and assigns this value
}
```

---

### 4.2 Contract with Area 3 — Modifier Systems

Area 3 extends the shop and run mechanics defined here. Area 2 exposes the following extension points:

**Shop hook — House Rules that alter shop behavior:**

```typescript
/**
 * Area 3 may provide a ShopGenerationHook that modifies the shop generation
 * algorithm. The hook receives the default ShopState and may return a modified
 * version (e.g., adding extra slots, changing item costs, forcing specific items).
 *
 * Area 2 calls this hook after generating the default shop.
 */
export interface ShopGenerationHook {
  /** Called after default shop generation. Returns the (possibly modified) shop state. */
  onShopGenerated(shop: ShopState, context: ShopGenerationContext): ShopState;
}

export interface ShopGenerationContext {
  anteNumber: number;
  roundNumber: number;
  absoluteRound: number;
  playerGold: number;
  /** Active House Rules that may affect shop generation. Populated by Area 3. */
  activeHouseRuleIds: string[];
}
```

**Boss rule selection:**

Area 3 owns the boss rule pool and selection algorithm. Area 2 calls into Area 3 to select the boss rule for each boss round:

```typescript
// Area 2 calls this function (defined in Area 3) to populate Round.bossRuleId:
// selectBossRule(anteNumber: number): string
// Area 3 must export this function.
```

**Gold income hook:**

Area 3 may define House Rules that alter gold income. Area 2 exposes the gold income calculation as a hookable function:

```typescript
export interface GoldIncomeHook {
  /** Called after base gold income is computed. Returns the (possibly modified) gold amount. */
  onGoldEarned(baseGold: number, context: GoldIncomeContext): number;
}

export interface GoldIncomeContext {
  roundScore: number;
  scoreTarget: number;
  anteNumber: number;
  roundNumber: number;
  /** Active House Rules that may affect gold income. Populated by Area 3. */
  activeHouseRuleIds: string[];
}
```

---

### 4.3 Contract with Area 8 — Game State Management

Area 8 stores the run progression state. Area 2 defines the data shapes; Area 8 defines the storage and persistence model.

**Types Area 8 consumes from Area 2:**

```typescript
// Area 8 imports these from Area 2 (congero-deckbuilding):
import type {
  Ante,
  Round,
  RoundPhase,
  RunProgression,
  ShopState,
  ShopItem,
  ShopItemCategory,
  ShopItemRarity,
  CardPoolEntry,
} from './area2-deckbuilding';

import {
  roundScoreTarget,
  baseScoreTarget,
  shopSlotCount,
  rerollCost,
  goldEarned,
  cardAddCost,
  cardRemoveCost,
  cardConvertCost,
  generateShop,
  canTransitionRoundPhase,
} from './area2-deckbuilding';
```

**Run state schema inputs:**

Area 8's `RunState` schema (defined in Area 8) must include the following fields sourced from Area 2:

```typescript
// These fields in Area 8's RunState are typed using Area 2's types:
interface RunStateArea2Fields {
  currentAnte: number;           // from RunProgression.currentAnte
  currentRound: number;          // from RunProgression.currentRound
  absoluteRound: number;         // from RunProgression.absoluteRound
  scoreTarget: number;           // from Round.scoreTarget (computed by roundScoreTarget())
  roundPhase: RoundPhase;        // from Round.phase
  isBossRound: boolean;          // from Round.isBossRound
  bossRuleId: string | null;     // from Round.bossRuleId
  gold: number;                  // from RunProgression.gold
  rerollCount: number;           // from RunProgression.rerollCount
  currentShop: ShopState | null; // from RunProgression.currentShop
}
```

---

## 5. Worked Example

**Scenario:** Player completes Ante 2, Round 3 (the boss round) — from the Draw phase through the Shop phase.

### Setup

- **Ante:** 2, **Round:** 3 (boss round), **Absolute Round:** 6
- **Score target:** `roundScoreTarget(2, 3) = baseScoreTarget(2) × roundMultiplier(3) = 200 × 2.0 = 400`
- **Player's deck:** 48 cards (started with 52, removed 4 low-value cards in prior shops)
- **Player's gold:** 3 gold (carried over from previous round)
- **Active boss rule:** "The Purist" — dirty canastas score half (boss rule defined in Area 3)
- **Shop slots:** `shopSlotCount(2) = 3`

---

### Phase 1: Draw

**Entry condition:** Previous round's Shop phase ended.

1. Player's deck has 48 cards. `48 ≥ 11` → no reshuffle needed.
2. `dealInitialHand()` is called. 11 cards are drawn.
3. Among the 11 drawn cards, one is a red three (3♥). It is auto-played to the bonus area and a replacement card is drawn.
4. Final hand: 11 cards (no red threes). The auto-played red three contributes +100 bonus points (Area 1, Section 2).

**Exit condition:** Hand has been dealt (11 non-red-three cards in hand). Transition: `Draw → Play`.

---

### Phase 2: Play

**Entry condition:** Draw phase complete; player holds 11 cards.

The player takes multiple turns (Area 1 turn structure applies):

**Turn 1:**
- Player draws 1 card from the draw pile (standard draw action).
- Player plays `Q♠, Q♥, Q♦` as a new meld (rank Q).
- `validateMeld([Q♠, Q♥, Q♦], null, context)` → `{ valid: true }` (3 natural cards, no wilds, no threes).
- Player discards `4♣`.

**Turn 2:**
- Player draws 1 card.
- Player extends the Q meld: adds `Q♣, Q♠ (2nd copy), 2♥ (wild)`.
- `validateMeld([Q♣, Q♠, 2♥], existingQMeld, context)` → `{ valid: true }` (2 naturals + 1 wild; wildCount 1 < naturalCount 5 in resulting meld).
- Meld now has 6 cards (5 natural + 1 wild). Not yet a canasta.
- Player discards `5♦`.

**Turn 3:**
- Player draws 1 card: `Q♦ (2nd copy)`.
- Player adds `Q♦` to the Q meld. Meld now has 7 cards (6 natural + 1 wild).
- Meld reaches canasta status. `ON_CANASTA_SEALED` hook fires.
- `determineCanastaType(meld, turnState)`:
  - `totalCount = 7` → not ≥ 10 (not super)
  - `completedConcealed = false`
  - `completedFromDiscard = false`
  - `wildCount = 1` → not 0 → `dirty`
- **Boss rule "The Purist" is active.** The Purist fires on `ON_CANASTA_SCORED` (Area 3 hook), not on `ON_CANASTA_SEALED`. The canasta type is still `dirty`.
- Player goes out (hand is now empty after playing the last Queen). `canGoOut(state, 'normal')` → `true` (has canasta, hand empty).

**Exit condition:** Player goes out. Transition: `Play → Score`.

---

### Phase 3: Score

**Entry condition:** Player has gone out.

**Scoring computation (Area 1 formulas):**

1. **Red three bonus:** +100 (auto-played in Draw phase).
2. **Q meld (dirty canasta):**
   - `computeCardPointTotal(meld)`: 6 × Q (10 pts each) + 1 × 2♥ (20 pts) = 60 + 20 = 80
   - `getCanastaBonus('dirty')` = 300
   - `baseTotal = 80 + 300 = 380`
   - **Boss rule "The Purist" fires on `ON_CANASTA_SCORED`:** dirty canastas score half → `380 × 0.5 = 190`
3. **Going-out bonus (normal):** +100
4. **Total round score:** 100 (red three) + 190 (Q canasta after Purist) + 100 (going out) = **390**

**Score vs target:** `390 < 400` — player **fails** to meet the score target.

**Transition:** `Score → RunOver` (guard: `scoreMissedTarget`).

**Note:** The run ends here. The player does not reach the Shop phase for this round. This illustrates the consequence of the boss rule — the Purist cut the dirty canasta score in half, turning what would have been a 490-point round (390 without Purist penalty, plus the 100 that was cut) into a failing score.

---

### Alternate scenario (player wins the round)

To illustrate the Shop phase, assume the player had scored 420 instead (e.g., by completing a natural canasta instead of dirty, avoiding the Purist penalty):

**Phase 3 (alternate): Score = 420 ≥ 400 → advance.**

**Gold earned:** `goldEarned(420, 400) = 4 + floor(420 / 400) = 4 + 1 = 5 gold`

Player had 3 gold → now has **8 gold**.

---

### Phase 4: Shop (alternate scenario)

**Entry condition:** Score phase complete; player advanced (score ≥ target).

**Shop generation:** `generateShop(anteNumber=2, rerollCount=0)`

1. `shopSlotCount(2) = 3` → 3 slots to fill.
2. Slot 1: `weightedRandom(CATEGORY_WEIGHTS)` → `enhancement`; `weightedRandom(RARITY_WEIGHTS)` → `common`; item: Gilded enhancement; cost: 3 gold.
3. Slot 2: `weightedRandom(CATEGORY_WEIGHTS)` → `cardPack`; `weightedRandom(RARITY_WEIGHTS)` → `uncommon`; item: Rank Pack; cost: 5 gold.
4. Slot 3: `weightedRandom(CATEGORY_WEIGHTS)` → `partner`; `weightedRarity(RARITY_WEIGHTS)` → `rare`; item: The Collector partner; cost: 8 gold.

**Shop state:**
```
items: [
  { category: 'enhancement', itemTypeId: 'gilded', rarity: 'common',   cost: 3 },
  { category: 'cardPack',    itemTypeId: 'rankPack', rarity: 'uncommon', cost: 5 },
  { category: 'partner',     itemTypeId: 'theCollector', rarity: 'rare', cost: 8 },
]
nextRerollCost: rerollCost(0) = 1 gold
```

**Player actions:**
1. Player buys the Gilded enhancement (3 gold). Gold: 8 → 5.
2. Player buys the Rank Pack (5 gold). Gold: 5 → 0. Player selects rank Q → 3 more Queens added to deck.
3. Player cannot afford The Collector (8 gold) or a reroll (1 gold — wait, 0 gold). Player clicks "Continue".

**Deck after shop:** 48 cards + 3 Queens = **51 cards**.

**Exit condition:** Player clicks "Continue". Transition: `Shop → RunOver` (this was Ante 2, Round 3 — the final round of Ante 2, but not the final round of the run). Wait — `isFinalRound = (ante === 8 && round === 3) = false`. Transition: `Shop → Draw` (next round: Ante 3, Round 1).

**Next round:** `buildRound(3, 1, 7)` → `{ anteNumber: 3, roundNumber: 1, absoluteRoundNumber: 7, scoreTarget: roundScoreTarget(3, 1) = 400, isBossRound: false, bossRuleId: null, phase: 'Draw' }`.

---

### Progression table verification

| Value | Formula | Result | Matches Table? |
|-------|---------|--------|---------------|
| Ante 2 base target | `100 × 2^(2-1)` | 200 | ✓ |
| Ante 2, Round 3 target | `200 × 2.0` | 400 | ✓ |
| Ante 3, Round 1 target | `400 × 1.0` | 400 | ✓ |
| Shop slots (Ante 2) | `shopSlotCount(2)` | 3 | ✓ |
| Gold earned (420, 400) | `4 + floor(420/400)` | 5 | ✓ |
| Reroll cost (0 prior rerolls) | `1 + 0` | 1 | ✓ |

---

## 6. Open Questions

### OQ-1: Score Target Scaling — Exponential vs Linear
**Question:** Is the exponential doubling formula (`100 × 2^(a-1)`) the right scaling curve, or should a linear or polynomial formula be used to keep late-game targets more achievable?

**Status:** Deferred.

**Rationale:** The exponential formula produces targets that grow from 100 to 25,600 across 8 antes. Whether this is achievable depends on how powerful the modifier systems (Area 3) and card enhancements (Area 4) can make a deck. The formula is locked here as the baseline; balance tuning may adjust the base multiplier (currently 100) or the exponent base (currently 2) once Areas 3 and 4 are authored and playtested. The formula structure is fixed; the constants are subject to balance review.

---

### OQ-2: Minimum Deck Size
**Question:** Is 20 cards the right minimum deck size, or should it be lower (e.g., 10) to allow extreme deck-thinning strategies?

**Status:** Deferred.

**Rationale:** A minimum of 20 cards ensures the player always has enough cards to deal an 11-card hand without immediately reshuffling. A lower minimum would enable more aggressive thinning strategies (e.g., a 12-card deck of pure Queens) but could create degenerate loops. This value is a balance parameter — the structure is fixed, the constant is subject to review.

---

### OQ-3: Gold Income Formula
**Question:** Should gold income be purely score-based (`4 + floor(score / target)`) or should there be a fixed component plus a performance bonus?

**Status:** Partially resolved — current formula is `4 + floor(score / target)`.

**Rationale:** The current formula guarantees at least 4 gold per round (enough to buy one common item or reroll twice) and rewards high scores with proportionally more gold. The floor division means a score of 2× the target earns 6 gold, 3× earns 7 gold, etc. This creates a meaningful incentive to score well above the target. The formula may be adjusted during balance review; the structure is locked.

---

### OQ-4: Card Pack Contents — Rank Pack Selection
**Question:** When a player buys a Rank Pack, do they choose the rank before or after seeing the 3 cards? And can they choose any rank, or only ranks already in their deck?

**Status:** Deferred.

**Rationale:** Allowing the player to choose any rank (including ranks not yet in their deck) is more flexible but may be overpowered. Restricting to existing ranks encourages specialization. The interaction model (when the choice is made) belongs to Area 5 (UI/UX Design). The constraint rule belongs here. Deferred until Area 3 and Area 4 are authored to understand how rank density interacts with modifiers.

---

### OQ-5: Shop Slot Count — Boss Round Penalty
**Question:** Should boss rounds have a reduced shop slot count (e.g., 2 instead of 3–5) as an additional difficulty mechanic?

**Status:** Deferred.

**Rationale:** Boss rounds already have a hostile rule active. Reducing shop slots would add a second penalty. This is a balance decision that depends on how punishing boss rules are in practice. Deferred to Area 3 (which defines boss rules) and balance review. The current design gives boss rounds the same slot count as non-boss rounds in the same ante.

---

### OQ-6: Starting Deck — Joker Inclusion
**Question:** Should the starting deck include 1 or 2 Jokers to give the player immediate wild card access, rather than requiring them to buy Jokers from the shop?

**Status:** Deferred.

**Rationale:** The current design excludes Jokers from the starting deck to make wild card acquisition a meaningful early-game decision. Including Jokers would make the early game more forgiving. This is a balance decision. The starting deck composition is locked at 52 cards (no Jokers) for the baseline; this may be revisited after playtesting.

---
