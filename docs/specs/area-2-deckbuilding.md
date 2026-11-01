# Area 2: Deckbuilding & Run Structure — Technical Specification & Implementation Plan

## 1. Overview

Area 2 defines the structural skeleton of a Congero run. It is the authoritative source for:

- **Card pool composition** — the full 108-card pool: every rank, suit, and special card with its copy count, wild-card flags, and three-type flags.
- **Starting deck** — the 52-card deck the player begins each run with (one standard deck, no Jokers).
- **Ante/round progression** — 8 antes of 3 rounds each (24 rounds total), with exponential score target scaling and a boss round at the end of every ante.
- **Round lifecycle** — the four-phase state machine (`Draw → Play → Score → Shop`) with guarded transitions, including the initial hand deal with red-three auto-play.
- **Shop system** — slot count by ante, weighted-random item generation across 7 categories and 4 rarity tiers, base costs, and escalating reroll costs.
- **Card acquisition model** — add (packs or direct purchase), remove, and convert operations with gold costs derived from card point values and hard deck-size constraints.

**Source of truth:** [`.kiro/specs/congero-deckbuilding/design.md`](../../.kiro/specs/congero-deckbuilding/design.md)

**Out of scope for Area 2:** Individual enhancement definitions (Area 4), modifier/partner/house-rule/scorepad/tray definitions (Area 3), UI rendering (Area 5), Angular service wiring (Area 7), BabylonJS rendering (Area 6), and persistence (Area 8). Area 2 exports pure functions and types; Areas 7 and 8 wire them into the application.

---

## 2. File Structure

All files live under `src/app/core/deckbuilding/`. The directory is a self-contained DSFR domain container — every public export is a pure function or a type. No Angular imports, no side effects.

```
src/app/core/deckbuilding/
├── types.ts                  # All TypeScript interfaces and types for Area 2
├── card-pool.ts              # buildCardPool(), buildStartingDeck(), getStartingDeckCount()
├── progression.ts            # baseScoreTarget(), roundMultiplier(), roundScoreTarget(), buildAnte(), buildRound()
├── round-lifecycle.ts        # RoundPhase, RoundTransitionContext, canTransitionRoundPhase(), dealInitialHand(), INITIAL_HAND_SIZE
├── shop-generation.ts        # shopSlotCount(), rerollCost(), generateShop(), BASE_COST, RARITY_WEIGHTS, CATEGORY_WEIGHTS
├── card-acquisition.ts       # goldEarned(), cardAddCost(), cardRemoveCost(), cardConvertCost()
├── index.ts                  # Barrel re-export of all public types and functions
├── card-pool.spec.ts         # Tests for card pool and starting deck
├── progression.spec.ts       # Tests for score target formulas and progression table
├── round-lifecycle.spec.ts   # Tests for phase transitions and hand deal
├── shop-generation.spec.ts   # Tests for shop slot counts, reroll costs, generation invariants
└── card-acquisition.spec.ts  # Tests for gold income and card operation costs
```

### File Responsibilities

| File | Exports | Description |
|------|---------|-------------|
| `types.ts` | `CardPoolEntry`, `Ante`, `Round`, `RoundPhase`, `ShopItem`, `ShopItemCategory`, `ShopItemRarity`, `RunProgression`, `ShopState`, `RoundTransitionContext`, `ShopGenerationHook`, `ShopGenerationContext`, `GoldIncomeHook`, `GoldIncomeContext`, `RunStateArea2Fields` | All data models and hook interfaces |
| `card-pool.ts` | `buildCardPool`, `buildStartingDeck`, `getStartingDeckCount` | Pure functions for card pool enumeration and starting deck |
| `progression.ts` | `baseScoreTarget`, `roundMultiplier`, `roundScoreTarget`, `buildAnte`, `buildRound` | Pure functions for ante/round progression |
| `round-lifecycle.ts` | `INITIAL_HAND_SIZE`, `canTransitionRoundPhase`, `dealInitialHand` | Round phase machine and hand deal |
| `shop-generation.ts` | `shopSlotCount`, `rerollCost`, `generateShop`, `BASE_COST`, `RARITY_WEIGHTS`, `CATEGORY_WEIGHTS` | Shop slot counts, reroll costs, item generation |
| `card-acquisition.ts` | `goldEarned`, `cardAddCost`, `cardRemoveCost`, `cardConvertCost` | Gold income and card operation costs |
| `index.ts` | *(barrel)* | Re-exports everything from the above files |

---

## 3. Interfaces & Types

All types are defined in `types.ts`. No `any`, no partial types. All fields are required unless explicitly typed as `| null`.

### 3.1 Card Pool Types

```typescript
/**
 * A single entry in the canonical card pool table.
 * Describes one logical card type and how many copies exist in the full 108-card pool.
 */
export interface CardPoolEntry {
  rank: Rank;
  suit: Suit | null;        // null for Jokers
  count: number;            // copies in the full 108-card pool
  isWild: boolean;          // true for rank '2' or 'JOKER'
  isRedThree: boolean;      // true for rank '3' with hearts or diamonds
  isBlackThree: boolean;    // true for rank '3' with clubs or spades
  inStartingDeck: boolean;  // true if included in the 52-card starting deck
}
```

### 3.2 Ante & Round Types

```typescript
export interface Ante {
  anteNumber: number;       // 1-indexed (1..8)
  roundCount: number;       // always 3
  bossRoundIndex: number;   // always 3 (last round of the ante)
  baseScoreTarget: number;  // 100 × 2^(anteNumber - 1)
}

export interface Round {
  anteNumber: number;
  roundNumber: number;       // 1-indexed within the ante (1..3)
  absoluteRoundNumber: number; // 1-indexed across the entire run (1..24)
  scoreTarget: number;
  isBossRound: boolean;
  bossRuleId: string | null; // populated by Area 3
  phase: RoundPhase;
}

export type RoundPhase = 'Draw' | 'Play' | 'Score' | 'Shop';
```

### 3.3 Shop Types

```typescript
export interface ShopItem {
  id: string;
  category: ShopItemCategory;
  itemTypeId: string;
  rarity: ShopItemRarity;
  cost: number;
  purchased: boolean;
}

export type ShopItemCategory =
  | 'enhancement'
  | 'partner'
  | 'houseRule'
  | 'scorepad'
  | 'tray'
  | 'cardPack'
  | 'sealItem';

export type ShopItemRarity = 'common' | 'uncommon' | 'rare' | 'legendary';

export interface ShopState {
  items: ShopItem[];
  rerollCount: number;
  nextRerollCost: number;
}
```

### 3.4 Run Progression Types

```typescript
export interface RunProgression {
  currentAnte: number;
  currentRound: number;
  absoluteRound: number;
  gold: number;
  rerollCount: number;
  currentShop: ShopState | null;
  runOver: boolean;
  runWon: boolean;
}
```

### 3.5 Round Transition Types

```typescript
export interface RoundTransitionContext {
  roundScore: number;
  scoreTarget: number;
  isFinalRound: boolean; // true when ante === 8 and roundNumber === 3
}
```

### 3.6 Hook Interfaces (Contracts with Area 3)

```typescript
export interface ShopGenerationHook {
  onShopGenerated(shop: ShopState, context: ShopGenerationContext): ShopState;
}

export interface ShopGenerationContext {
  anteNumber: number;
  roundNumber: number;
  absoluteRound: number;
  playerGold: number;
  activeHouseRuleIds: string[];
}

export interface GoldIncomeHook {
  onGoldEarned(baseGold: number, context: GoldIncomeContext): number;
}

export interface GoldIncomeContext {
  roundScore: number;
  scoreTarget: number;
  anteNumber: number;
  roundNumber: number;
  activeHouseRuleIds: string[];
}
```

### 3.7 Area 8 State Schema Fields

```typescript
/**
 * Fields that Area 8's RunState schema must include, typed from Area 2.
 * Area 8 defines the storage; Area 2 defines the shapes.
 */
export interface RunStateArea2Fields {
  currentAnte: number;
  currentRound: number;
  absoluteRound: number;
  scoreTarget: number;
  roundPhase: RoundPhase;
  isBossRound: boolean;
  bossRuleId: string | null;
  gold: number;
  rerollCount: number;
  currentShop: ShopState | null;
}
```

---

## 4. Pure Transforms (DSFR TRANSFORM Role)

Every function in Area 2 is a pure transform — no side effects, no mutations, no external state. Inputs in, outputs out. All are independently unit-testable.

### 4.1 Card Pool Functions (`card-pool.ts`)

#### `buildCardPool(): CardPoolEntry[]`

Returns the full 108-card pool as a flat array of `CardPoolEntry` objects.

**Algorithm:**
1. 11 standard ranks (A, K, Q, J, 10, 9, 8, 7, 6, 5, 4) × 4 suits × 2 copies = 88 entries with `count: 2`, all flags false.
2. Rank 3 × 4 suits × 2 copies = 8 entries. Hearts/diamonds get `isRedThree: true`; clubs/spades get `isBlackThree: true`.
3. Rank 2 × 4 suits × 2 copies = 8 entries with `isWild: true`.
4. JOKER × 1 entry with `suit: null`, `count: 4`, `isWild: true`.

**Total: 108 cards (106 two-copy entries + 1 four-copy joker entry = 107 entries, but 108 physical cards).**

#### `buildStartingDeck(pool: CardPoolEntry[]): CardPoolEntry[]`

Returns a copy of the pool with `inStartingDeck` set to `true` for every entry except Jokers. The starting deck has exactly 1 copy of each non-joker card type: 52 cards total.

#### `getStartingDeckCount(pool: CardPoolEntry[]): number`

Returns the number of card types in the starting deck (always 52). Counts 1 per `inStartingDeck: true` entry, not `entry.count`.

### 4.2 Progression Functions (`progression.ts`)

#### `baseScoreTarget(anteNumber: number): number`

Returns `100 × 2^(anteNumber - 1)`. Ante 1 → 100, Ante 8 → 12,800.

#### `roundMultiplier(roundNumberWithinAnte: number): number`

Returns `1.0` for round 1, `1.5` for round 2, `2.0` for round 3. Throws on invalid input.

#### `roundScoreTarget(anteNumber: number, roundNumberWithinAnte: number): number`

Returns `Math.round(baseScoreTarget(anteNumber) × roundMultiplier(roundNumberWithinAnte))`.

#### `buildAnte(anteNumber: number): Ante`

Returns an `Ante` object with `roundCount: 3`, `bossRoundIndex: 3`, and the computed `baseScoreTarget`.

#### `buildRound(anteNumber: number, roundNumber: number, absoluteRoundNumber: number, selectBossRule: SelectBossRuleFn): Round`

Returns a `Round` object with computed `scoreTarget`, `isBossRound: roundNumber === 3`, `bossRuleId: roundNumber === 3 ? selectBossRule(anteNumber, bossRulePool) : null`, and `phase: 'Draw'`.

**`selectBossRule` injection point (owned by Area 3):**

```typescript
// Type declaration in Area 2 (deckbuilding.types.ts):
type SelectBossRuleFn = (anteNumber: number, bossRulePool: BossRule[]) => string;
```

**Integration contract:**
- **Area 3** exports a concrete `selectBossRule(anteNumber, bossRulePool): string` function that implements the weighted random selection algorithm (Area 3 design doc, Section 2.8).
- **Area 2** declares the `SelectBossRuleFn` type and accepts the function as a parameter to `buildRound()`.
- **Area 7** (Angular wiring) passes Area 3's `selectBossRule` implementation when calling `buildRound()`, along with the boss rule pool from `ModifierStateService`.
- **The boss rule pool** (`BossRule[]`) is owned by Area 3's canonical data (`data/boss-rules.ts`). Area 2 does not construct or filter the pool — it receives it as a parameter.

**In tests:** Pass a stub: `const stubSelectBossRule = (ante: number) => 'the-p';`

**Why this design:** Area 2 should not import Area 3's implementation directly (avoids circular dependencies and keeps Area 2 testable in isolation). The function is injected at the composition root (Area 7 service wiring) where both Area 2 and Area 3 are available.

### 4.3 Round Lifecycle Functions (`round-lifecycle.ts`)

#### `INITIAL_HAND_SIZE = 11`

Constant. The number of cards drawn at the start of each round.

#### `canTransitionRoundPhase(current: RoundPhase, next: RoundPhase | 'RunOver' | 'RunWon', context: RoundTransitionContext): boolean`

Pure state-machine guard. Valid transitions:

| From | To | Guard |
|------|-----|-------|
| `Draw` | `Play` | Always |
| `Play` | `Score` | Always |
| `Score` | `Shop` | `roundScore >= scoreTarget` |
| `Score` | `RunOver` | `roundScore < scoreTarget` |
| `Shop` | `Draw` | `!isFinalRound` |
| `Shop` | `RunWon` | `isFinalRound` |

#### `dealInitialHand(deck: Card[], discardPile: Card[]): { hand: Card[]; remainingDeck: Card[]; autoPlayedRedThrees: Card[] }`

Draws `INITIAL_HAND_SIZE` non-red-three cards. If `deck.length < INITIAL_HAND_SIZE`, the discard pile is shuffled and appended. Red threes are auto-played (moved to `autoPlayedRedThrees`) and replaced with additional draws. Returns the hand, the remaining deck, and the auto-played red threes.

**Note:** `shuffle()` is the only non-deterministic operation. In tests, pass a seeded shuffle or a deterministic stub.

### 4.4 Shop Generation Functions (`shop-generation.ts`)

#### `shopSlotCount(anteNumber: number): number`

| Ante Range | Slots |
|------------|-------|
| 1–2 | 3 |
| 3–4 | 4 |
| 5–8 | 5 |

#### `rerollCost(rerollCount: number): number`

Returns `1 + rerollCount`. First reroll costs 1 gold, second costs 2, third costs 3, etc.

#### `generateShop(anteNumber: number, rerollCount: number): ShopState`

Generates a `ShopState` with `shopSlotCount(anteNumber)` items. For each slot:
1. Select a category via weighted random from `CATEGORY_WEIGHTS`.
2. Select a rarity via weighted random from `RARITY_WEIGHTS`.
3. Select a specific `itemTypeId` from the pool for that category/rarity.
4. Set `cost` from `BASE_COST[rarity]`.
5. Set `purchased: false`.

**Note:** `weightedRandom` and `randomItemFromPool` are non-deterministic. In tests, pass seeded random functions or mock the pool lookup.

#### Constants

```typescript
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

### 4.5 Card Acquisition Functions (`card-acquisition.ts`)

#### `goldEarned(roundScore: number, scoreTarget: number): number`

Returns `4 + Math.floor(roundScore / scoreTarget)`. Minimum 4 gold per round.

#### `cardAddCost(card: Card): number`

Returns `Math.max(2, Math.floor(card.pointValue / 5))`.

| Point Value | Cost |
|-------------|------|
| 50 (Joker) | 10 |
| 20 (2, A) | 4 |
| 10 (K–8) | 2 |
| 5 (7–4, black 3) | 2 (minimum) |
| 100 (red 3) | 20 |

#### `cardRemoveCost(card: Card): number`

Returns `Math.max(1, Math.floor(card.pointValue / 10))`.

| Point Value | Cost |
|-------------|------|
| 50 (Joker) | 5 |
| 20 (2, A) | 2 |
| 10 (K–8) | 1 |
| 5 (7–4, black 3) | 1 (minimum) |
| 100 (red 3) | 10 |

#### `cardConvertCost(fromCard: Card, toRank: Rank): number`

Returns `cardAddCost(targetCard) + 1` where `targetCard` is a card of `toRank` with the same suit as `fromCard`. Uses `getCardPointValue(toRank, fromCard.suit)` from Area 1.

**Constraints (enforced by caller, not this function):**
- Cannot convert Jokers (no suit).
- Cannot convert red threes or black threes (special cards).
- Wild cards (2s) can be converted to any non-wild rank.

---

## 5. State Management

Area 2 defines the data shapes for run state but does not own the storage mechanism. Area 8 (`GameStateService`) owns the actual signal stores. Area 2's types are consumed by Area 8.

### 5.1 Run Progression State

The following fields must be stored in Area 8's `RunState`:

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| `currentAnte` | `number` | `RunProgression.currentAnte` | Current ante (1–8) |
| `currentRound` | `number` | `RunProgression.currentRound` | Round within ante (1–3) |
| `absoluteRound` | `number` | `RunProgression.absoluteRound` | Global round (1–24) |
| `scoreTarget` | `number` | `roundScoreTarget()` | Computed when round begins |
| `roundPhase` | `RoundPhase` | `Round.phase` | Current lifecycle phase |
| `isBossRound` | `boolean` | `Round.isBossRound` | Whether boss rule is active |
| `bossRuleId` | `string \| null` | `Round.bossRuleId` | Populated by Area 3 |
| `gold` | `number` | `RunProgression.gold` | Player's gold balance |
| `rerollCount` | `number` | `RunProgression.rerollCount` | Rerolls this shop phase |
| `currentShop` | `ShopState \| null` | `RunProgression.currentShop` | Current shop items |

### 5.2 Shop State

`ShopState` is created when the round enters the `Shop` phase and destroyed when the player clicks "Continue." It is not persisted across sessions (the shop is regenerated on load).

### 5.3 Deck State

The player's deck is a mutable `Card[]` managed by Area 8's `DeckState`. Area 2 provides the card pool and starting deck; Area 8 tracks additions, removals, and conversions. Area 2's `cardAddCost`, `cardRemoveCost`, and `cardConvertCost` functions are called by Area 8 to validate and price operations.

### 5.4 Computed Values (Area 8 `computed()` signals)

The following values are derived, not stored:

- `scoreTarget` — computed from `currentAnte` and `currentRound` via `roundScoreTarget()`.
- `nextRerollCost` — computed from `rerollCount` via `rerollCost()`.
- `isFinalRound` — computed as `currentAnte === 8 && currentRound === 3`.

---

## 6. Shop Generation Algorithm

### 6.1 Weighted Random Selection

The shop uses weighted random selection for both category and rarity. The algorithm:

```
function weightedRandom<T>(weights: Array<{ value: T; weight: number }>): T {
  const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
  let random = Math.random() * totalWeight;
  for (const entry of weights) {
    random -= entry.weight;
    if (random <= 0) return entry.value;
  }
  // Fallback (should not reach here with valid weights)
  return weights[weights.length - 1].value;
}
```

### 6.2 Rarity Distribution

| Rarity | Weight | Approximate % |
|--------|--------|---------------|
| `common` | 60 | 60% |
| `uncommon` | 25 | 25% |
| `rare` | 12 | 12% |
| `legendary` | 3 | 3% |
| **Total** | **100** | **100%** |

### 6.3 Category Distribution

| Category | Weight | Approximate % |
|----------|--------|---------------|
| `enhancement` | 30 | 30% |
| `cardPack` | 25 | 25% |
| `partner` | 15 | 15% |
| `scorepad` | 10 | 10% |
| `tray` | 10 | 10% |
| `houseRule` | 7 | 7% |
| `sealItem` | 3 | 3% |
| **Total** | **100** | **100%** |

### 6.4 Item Type Selection

Once a category and rarity are selected, a specific `itemTypeId` is chosen uniformly at random from the pool of items matching that category and rarity. The item pools are owned by the respective areas:

- `enhancement` pool → Area 4
- `partner`, `houseRule`, `scorepad`, `tray` pools → Area 3
- `cardPack` pool → Area 2 (4 pack types: `standardPack`, `wildPack`, `rankPack`, `specialPack`)
- `sealItem` pool → Area 4 (10 seal applicator types)

Area 2 defines the `randomItemFromPool(category, rarity)` function signature and the `cardPack` pool. Other pools are injected at the Area 7 service-wiring layer.

### 6.5 Hook Integration (Area 3)

After the default shop is generated, Area 3's `ShopGenerationHook.onShopGenerated()` is called. This allows House Rules to:
- Add extra shop slots.
- Modify item costs.
- Force specific items into slots.
- Remove items.

The hook receives the default `ShopState` and a `ShopGenerationContext` and returns a (possibly modified) `ShopState`.

---

## 7. Card Acquisition Model

### 7.1 Operations

| Operation | Description | Cost Formula | Constraints |
|-----------|-------------|--------------|-------------|
| **Add** (direct) | Purchase a single card | `cardAddCost(card)` | Deck ≤ 108 cards |
| **Add** (pack) | Purchase a card pack | Pack-specific (4–7 gold) | Deck ≤ 108 cards |
| **Remove** | Remove a card from deck | `cardRemoveCost(card)` | Deck ≥ 20 cards |
| **Convert** | Change a card's rank | `cardConvertCost(from, toRank)` | Not Joker, not red/black three |

### 7.2 Card Pack Types

| Pack Type | Cards Added | Cost | Contents |
|-----------|------------|------|----------|
| `standardPack` | 3 | 4 gold | 3 random cards from the full pool |
| `wildPack` | 2 | 6 gold | 2 wild cards (2s or Jokers, weighted toward 2s) |
| `rankPack` | 3 | 5 gold | 3 cards of a player-chosen rank |
| `specialPack` | 2 | 7 gold | 2 special cards (red threes, black threes, or wilds) |

### 7.3 Deck Size Constraints

- **Minimum deck size:** 20 cards. Removal operations that would drop below this are rejected.
- **Maximum deck size:** 108 cards (the full pool). Addition operations that would exceed this are rejected.

### 7.4 Convert Constraints

- Jokers cannot be converted (no suit to preserve).
- Red threes and black threes cannot be converted (special cards).
- Wild cards (2s) can be converted to any non-wild rank.
- The converted card retains any enhancement applied to it.

### 7.5 Gold Income

Gold is earned at the end of the Score phase (before the Shop phase):

```
goldEarned(roundScore, scoreTarget) = 4 + floor(roundScore / scoreTarget)
```

| Score / Target Ratio | Gold Earned |
|----------------------|-------------|
| 1.0× (exact target) | 4 |
| 1.5× | 4 |
| 2.0× | 5 |
| 3.0× | 7 |

Area 3's `GoldIncomeHook.onGoldEarned()` can modify the base amount (e.g., House Rules that double gold or cap gold income).

---

## 8. Unit Test Plan

### 8.1 `card-pool.spec.ts`

| Test | Description | Expected Result |
|------|-------------|-----------------|
| `buildCardPool returns 107 entries` | 11 standard ranks × 4 suits + rank 3 × 4 suits + rank 2 × 4 suits + 1 joker = 44 + 4 + 4 + 1 = 53 entries | Array length is 53 |
| `buildCardPool total card count is 108` | Sum of all `entry.count` values | 108 |
| `buildCardPool standard ranks have count 2` | Every entry with rank in `{A, K, Q, J, 10, 9, 8, 7, 6, 5, 4}` | `count === 2`, all flags false |
| `buildCardPool red threes` | Entries with rank `'3'` and suit `'hearts'` or `'diamonds'` | `isRedThree: true`, `isBlackThree: false`, `count: 2` |
| `buildCardPool black threes` | Entries with rank `'3'` and suit `'clubs'` or `'spades'` | `isBlackThree: true`, `isRedThree: false`, `count: 2` |
| `buildCardPool wild twos` | Entries with rank `'2'` | `isWild: true`, `count: 2`, all three flags false |
| `buildCardPool jokers` | Entry with rank `'JOKER'` | `suit: null`, `isWild: true`, `count: 4` |
| `buildCardPool wild card total` | All entries where `isWild: true` | 12 wild cards (8 twos + 4 jokers) |
| `buildStartingDeck marks non-jokers` | After `buildStartingDeck`, every non-joker entry | `inStartingDeck: true` |
| `buildStartingDeck excludes jokers` | After `buildStartingDeck`, joker entry | `inStartingDeck: false` |
| `getStartingDeckCount returns 52` | Count of `inStartingDeck: true` entries | 52 |

### 8.2 `progression.spec.ts`

| Test | Description | Expected Result |
|------|-------------|-----------------|
| `baseScoreTarget for antes 1–8` | `baseScoreTarget(n)` for n = 1..8 | `[100, 200, 400, 800, 1600, 3200, 6400, 12800]` |
| `roundMultiplier values` | `roundMultiplier(1)`, `(2)`, `(3)` | `1.0`, `1.5`, `2.0` |
| `roundMultiplier throws on invalid` | `roundMultiplier(0)`, `(4)` | Throws `Error` |
| `roundScoreTarget for all 24 rounds` | `roundScoreTarget(ante, round)` for all combinations | Matches the complete progression table (Section 3.3 of design doc) |
| `buildAnte structure` | `buildAnte(1)` | `{ anteNumber: 1, roundCount: 3, bossRoundIndex: 3, baseScoreTarget: 100 }` |
| `buildRound structure` | `buildRound(2, 3, 6)` with stub `selectBossRule` | `{ anteNumber: 2, roundNumber: 3, absoluteRoundNumber: 6, scoreTarget: 400, isBossRound: true, bossRuleId: 'stub-boss-2', phase: 'Draw' }` |
| `buildRound non-boss` | `buildRound(1, 1, 1)` | `isBossRound: false`, `bossRuleId: null` |

### 8.3 `round-lifecycle.spec.ts`

| Test | Description | Expected Result |
|------|-------------|-----------------|
| `INITIAL_HAND_SIZE is 11` | Constant value | `11` |
| `canTransitionRoundPhase Draw → Play` | `canTransitionRoundPhase('Draw', 'Play', ctx)` | `true` |
| `canTransitionRoundPhase Play → Score` | `canTransitionRoundPhase('Play', 'Score', ctx)` | `true` |
| `canTransitionRoundPhase Score → Shop (met target)` | `roundScore: 500, scoreTarget: 400` | `true` |
| `canTransitionRoundPhase Score → Shop (missed target)` | `roundScore: 300, scoreTarget: 400` | `false` |
| `canTransitionRoundPhase Score → RunOver (missed)` | `roundScore: 300, scoreTarget: 400` | `true` |
| `canTransitionRoundPhase Score → RunOver (met)` | `roundScore: 500, scoreTarget: 400` | `false` |
| `canTransitionRoundPhase Shop → Draw` | `isFinalRound: false` | `true` |
| `canTransitionRoundPhase Shop → RunWon` | `isFinalRound: true` | `true` |
| `canTransitionRoundPhase Shop → Draw (final round)` | `isFinalRound: true` | `false` |
| `canTransitionRoundPhase invalid` | `Draw → Score`, `Play → Shop`, etc. | `false` |
| `dealInitialHand draws 11 cards` | Deck has ≥ 11 non-red-three cards | `hand.length === 11` |
| `dealInitialHand auto-plays red threes` | Deck's first 3 cards are red threes | `autoPlayedRedThrees.length === 3`, `hand.length === 11` |
| `dealInitialHand reshuffles discard` | Deck has 5 cards, discard has 10 | `hand.length === 11`, `remainingDeck.length === 4` |
| `dealInitialHand exhausts deck` | Deck + discard < 11 cards | `hand.length < 11`, no error thrown |

### 8.4 `shop-generation.spec.ts`

| Test | Description | Expected Result |
|------|-------------|-----------------|
| `shopSlotCount by ante` | `shopSlotCount(n)` for n = 1..8 | `[3, 3, 4, 4, 5, 5, 5, 5]` |
| `rerollCost formula` | `rerollCost(n)` for n = 0..5 | `[1, 2, 3, 4, 5, 6]` |
| `generateShop slot count` | `generateShop(1, 0).items.length` | `3` |
| `generateShop slot count ante 5` | `generateShop(5, 0).items.length` | `5` |
| `generateShop reroll cost` | `generateShop(1, 2).nextRerollCost` | `3` |
| `generateShop items not purchased` | All items in generated shop | `purchased: false` |
| `generateShop items have valid categories` | All items | Category is one of the 7 valid values |
| `generateShop items have valid rarities` | All items | Rarity is one of the 4 valid values |
| `generateShop items have valid costs` | All items | Cost matches `BASE_COST[rarity]` |
| `generateShop items have unique IDs` | All items | No duplicate `id` values |
| `RARITY_WEIGHTS sum to 100` | Sum of all rarity weights | `100` |
| `CATEGORY_WEIGHTS sum to 100` | Sum of all category weights | `100` |
| `weightedRandom distribution` | Run 10,000 trials, count outcomes | Distribution approximates weight ratios (±3%) |

### 8.5 `card-acquisition.spec.ts`

| Test | Description | Expected Result |
|------|-------------|-----------------|
| `goldEarned minimum` | `goldEarned(100, 100)` (exact target) | `4` |
| `goldEarned 1.5× target` | `goldEarned(150, 100)` | `5` |
| `goldEarned 2× target` | `goldEarned(200, 100)` | `6` |
| `goldEarned worked example` | `goldEarned(420, 400)` | `5` |
| `cardAddCost Joker` | `cardAddCost({ pointValue: 50 })` | `10` |
| `cardAddCost wild 2` | `cardAddCost({ pointValue: 20 })` | `4` |
| `cardAddCost Ace` | `cardAddCost({ pointValue: 20 })` | `4` |
| `cardAddCost King` | `cardAddCost({ pointValue: 10 })` | `2` |
| `cardAddCost Seven` | `cardAddCost({ pointValue: 5 })` | `2` (minimum) |
| `cardAddCost red three` | `cardAddCost({ pointValue: 100 })` | `20` |
| `cardRemoveCost Joker` | `cardRemoveCost({ pointValue: 50 })` | `5` |
| `cardRemoveCost wild 2` | `cardRemoveCost({ pointValue: 20 })` | `2` |
| `cardRemoveCost King` | `cardRemoveCost({ pointValue: 10 })` | `1` |
| `cardRemoveCost Seven` | `cardRemoveCost({ pointValue: 5 })` | `1` (minimum) |
| `cardRemoveCost red three` | `cardRemoveCost({ pointValue: 100 })` | `10` |
| `cardConvertCost` | `cardConvertCost({ pointValue: 10, suit: 'hearts' }, 'A')` | `cardAddCost({ pointValue: 20 }) + 1 = 5` |
| `cardConvertCost Joker` | `cardConvertCost({ pointValue: 50, suit: null }, 'A')` | Throws or returns `Infinity` (caller must guard) |

---

## 9. Dependencies

### 9.1 Area 1 — Game Rules & Core Mechanics

Area 2 imports the following types and functions from Area 1:

```typescript
// From src/app/core/game-rules/types.ts (or equivalent Area 1 barrel):
import type { Rank, Suit, Card, CanastaType } from '../game-rules/types';
import type { BossRuleHookSet } from '../game-rules/types';

// From src/app/core/game-rules/scoring.ts (or equivalent):
import { getCardPointValue } from '../game-rules/scoring';
```

| Import | Used In | Purpose |
|--------|---------|---------|
| `Rank` | `CardPoolEntry.rank`, `cardConvertCost` | Type for card ranks (`'A' \| 'K' \| ... \| 'JOKER'`) |
| `Suit` | `CardPoolEntry.suit` | Type for suits (`'spades' \| 'hearts' \| 'diamonds' \| 'clubs'`) |
| `Card` | `dealInitialHand`, `cardAddCost`, `cardRemoveCost`, `cardConvertCost` | Card instance with `isWild`, `isRedThree`, `pointValue`, etc. |
| `CanastaType` | Referenced in hook contracts | Canasta classification (`'natural' \| 'dirty' \| 'super'`) |
| `BossRuleHookSet` | Referenced in hook contracts | Boss rule hook injection points |
| `getCardPointValue` | `cardConvertCost` | Maps `(rank, suit)` → point value |

### 9.2 Area 3 — Modifier Systems (Outgoing Contracts)

Area 2 defines hook interfaces that Area 3 implements:

- `ShopGenerationHook` — Area 3 provides implementations that modify shop generation.
- `GoldIncomeHook` — Area 3 provides implementations that modify gold income.
- `selectBossRule(anteNumber: number, bossRulePool: BossRule[]): string` — Area 3 exports this function. Area 2 declares the `SelectBossRuleFn` type and accepts it as a parameter to `buildRound()`. Area 7 wires the implementation at the composition root. The boss rule pool is owned by Area 3's canonical data.

### 9.3 Area 8 — Game State Management (Outgoing Contracts)

Area 2 defines the types that Area 8 consumes:

- `RunStateArea2Fields` — the schema fragment for run state.
- All pure functions (`roundScoreTarget`, `canTransitionRoundPhase`, etc.) are called by Area 8's state service.

---

## 10. Implementation Order

Implement in this order. Each step should compile and pass its tests before moving to the next.

### Step 1: Types (`types.ts`)
1. Define all TypeScript interfaces and types listed in Section 3.
2. Verify: `tsc --noEmit` passes with no errors.

### Step 2: Card Pool (`card-pool.ts` + `card-pool.spec.ts`)
1. Implement `buildCardPool()` — enumerate all 108 cards.
2. Implement `buildStartingDeck()` — mark non-joker entries.
3. Implement `getStartingDeckCount()` — count starting deck types.
4. Write and pass all tests from Section 8.1.

### Step 3: Progression (`progression.ts` + `progression.spec.ts`)
1. Implement `baseScoreTarget()`, `roundMultiplier()`, `roundScoreTarget()`.
2. Implement `buildAnte()` and `buildRound()` (use a stub `selectBossRule`).
3. Write and pass all tests from Section 8.2.
4. **Checkpoint:** The full 24-round progression table is verified.

### Step 4: Round Lifecycle (`round-lifecycle.ts` + `round-lifecycle.spec.ts`)
1. Define `INITIAL_HAND_SIZE` constant.
2. Implement `canTransitionRoundPhase()` with exhaustive switch.
3. Implement `dealInitialHand()` with red-three auto-play and discard reshuffle.
4. Write and pass all tests from Section 8.3.

### Step 5: Shop Generation (`shop-generation.ts` + `shop-generation.spec.ts`)
1. Implement `shopSlotCount()` and `rerollCost()`.
2. Define `BASE_COST`, `RARITY_WEIGHTS`, `CATEGORY_WEIGHTS` constants.
3. Implement `weightedRandom<T>()` helper.
4. Implement `generateShop()` (accept `randomItemFromPool` as a parameter for testability).
5. Write and pass all tests from Section 8.4.

### Step 6: Card Acquisition (`card-acquisition.ts` + `card-acquisition.spec.ts`)
1. Implement `goldEarned()`.
2. Implement `cardAddCost()`, `cardRemoveCost()`, `cardConvertCost()`.
3. Write and pass all tests from Section 8.5.

### Step 7: Barrel Export (`index.ts`)
1. Re-export all public types and functions from a single barrel file.
2. Verify: Area 8 and Area 7 can import everything from `'../deckbuilding'`.

### Step 8: Integration Verification
1. Verify that `buildCardPool()` + `buildStartingDeck()` + `getStartingDeckCount()` = 52.
2. Verify that `roundScoreTarget()` matches all 24 values in the progression table.
3. Verify that `canTransitionRoundPhase()` rejects all invalid transitions.
4. Verify that `generateShop()` produces the correct slot count for each ante.
5. Verify that `goldEarned(420, 400) === 5` (worked example from design doc).

---

## 11. Acceptance Criteria

### Data Models
- [ ] `CardPoolEntry` interface has all 7 fields: `rank`, `suit`, `count`, `isWild`, `isRedThree`, `isBlackThree`, `inStartingDeck`.
- [ ] `Ante` interface has `anteNumber`, `roundCount`, `bossRoundIndex`, `baseScoreTarget`.
- [ ] `Round` interface has `anteNumber`, `roundNumber`, `absoluteRoundNumber`, `scoreTarget`, `isBossRound`, `bossRuleId`, `phase`.
- [ ] `RoundPhase` is a union of `'Draw' | 'Play' | 'Score' | 'Shop'`.
- [ ] `ShopItem` interface has `id`, `category`, `itemTypeId`, `rarity`, `cost`, `purchased`.
- [ ] `ShopItemCategory` is a union of 7 category strings.
- [ ] `ShopItemRarity` is a union of 4 rarity strings.
- [ ] `RunProgression` interface has all 8 fields.
- [ ] `ShopState` interface has `items`, `rerollCount`, `nextRerollCost`.
- [ ] Hook interfaces (`ShopGenerationHook`, `GoldIncomeHook`) are defined with correct signatures.
- [ ] `RunStateArea2Fields` interface has all 10 fields for Area 8.

### Card Pool
- [ ] `buildCardPool()` returns exactly 53 entries (44 standard + 4 red three + 4 black three + 4 wild two + 1 joker = 57 entries — wait: 11 ranks × 4 suits = 44, rank 3 × 4 = 4, rank 2 × 4 = 4, joker × 1 = 1 → 53 entries).
- [ ] Total card count across all entries sums to 108.
- [ ] Exactly 12 wild cards (8 twos + 4 jokers).
- [ ] Exactly 4 red threes (hearts × 2, diamonds × 2).
- [ ] Exactly 4 black threes (clubs × 2, spades × 2).
- [ ] `buildStartingDeck()` marks all non-joker entries with `inStartingDeck: true`.
- [ ] `buildStartingDeck()` marks joker entries with `inStartingDeck: false`.
- [ ] `getStartingDeckCount()` returns 52.

### Progression
- [ ] `baseScoreTarget(1)` = 100, `baseScoreTarget(8)` = 12,800.
- [ ] `roundMultiplier(1)` = 1.0, `roundMultiplier(2)` = 1.5, `roundMultiplier(3)` = 2.0.
- [ ] `roundMultiplier()` throws for invalid input (0, 4, -1).
- [ ] `roundScoreTarget()` matches all 24 values in the design doc progression table.
- [ ] `buildAnte(1)` returns `{ anteNumber: 1, roundCount: 3, bossRoundIndex: 3, baseScoreTarget: 100 }`.
- [ ] `buildRound(2, 3, 6)` returns scoreTarget 400, isBossRound true.
- [ ] `buildRound(1, 1, 1)` returns isBossRound false, bossRuleId null.

### Round Lifecycle
- [ ] `INITIAL_HAND_SIZE` = 11.
- [ ] `canTransitionRoundPhase` allows `Draw → Play`, `Play → Score` unconditionally.
- [ ] `canTransitionRoundPhase` allows `Score → Shop` only when `roundScore >= scoreTarget`.
- [ ] `canTransitionRoundPhase` allows `Score → RunOver` only when `roundScore < scoreTarget`.
- [ ] `canTransitionRoundPhase` allows `Shop → Draw` when `!isFinalRound`.
- [ ] `canTransitionRoundPhase` allows `Shop → RunWon` when `isFinalRound`.
- [ ] `canTransitionRoundPhase` rejects all other transitions.
- [ ] `dealInitialHand` returns 11 cards when deck has ≥ 11 non-red-three cards.
- [ ] `dealInitialHand` auto-plays red threes and draws replacements.
- [ ] `dealInitialHand` reshuffles discard pile when deck has < 11 cards.

### Shop Generation
- [ ] `shopSlotCount()` returns `[3, 3, 4, 4, 5, 5, 5, 5]` for antes 1–8.
- [ ] `rerollCost(n)` returns `1 + n`.
- [ ] `generateShop(1, 0)` produces 3 items.
- [ ] `generateShop(5, 0)` produces 5 items.
- [ ] All generated items have valid categories, rarities, and costs.
- [ ] All generated items have unique IDs.
- [ ] All generated items start with `purchased: false`.
- [ ] `RARITY_WEIGHTS` sum to 100.
- [ ] `CATEGORY_WEIGHTS` sum to 100.

### Card Acquisition
- [ ] `goldEarned(100, 100)` = 4 (minimum).
- [ ] `goldEarned(420, 400)` = 5 (worked example).
- [ ] `cardAddCost` for pointValue 50 = 10, 20 = 4, 10 = 2, 5 = 2 (minimum).
- [ ] `cardRemoveCost` for pointValue 50 = 5, 20 = 2, 10 = 1, 5 = 1 (minimum).
- [ ] `cardConvertCost` equals `cardAddCost(target) + 1`.

### Code Quality
- [ ] No `any` types anywhere in Area 2.
- [ ] No side effects in any exported function.
- [ ] No Angular imports in any Area 2 file.
- [ ] All functions are exported from the barrel `index.ts`.
- [ ] All tests pass with 100% coverage on pure functions.
- [ ] `tsc --noEmit` passes with strict mode.
