import type { Rank, Suit } from '../game-rules/models/card.model';

// ---------------------------------------------------------------------------
// Card Pool
// ---------------------------------------------------------------------------

export interface CardPoolEntry {
  rank: Rank;
  suit: Suit | null;
  count: number;
  isWild: boolean;
  isRedThree: boolean;
  isBlackThree: boolean;
  inStartingDeck: boolean;
}

// ---------------------------------------------------------------------------
// Ante & Round
// ---------------------------------------------------------------------------

export interface Ante {
  anteNumber: number;
  roundCount: number;
  bossRoundIndex: number;
  baseScoreTarget: number;
}

export interface Round {
  anteNumber: number;
  roundNumber: number;
  absoluteRoundNumber: number;
  scoreTarget: number;
  isBossRound: boolean;
  bossRuleId: string | null;
  phase: RoundPhase;
}

export type RoundPhase = 'Draw' | 'Play' | 'Score' | 'Shop';

// ---------------------------------------------------------------------------
// Shop
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Run Progression
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Round Transition
// ---------------------------------------------------------------------------

export interface RoundTransitionContext {
  roundScore: number;
  scoreTarget: number;
  isFinalRound: boolean;
}

// ---------------------------------------------------------------------------
// Hook Interfaces (Contracts with Area 3)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Area 8 State Schema Fields
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// selectBossRule injection type (owned by Area 3, declared here)
// ---------------------------------------------------------------------------

/** Placeholder for Area 3's BossRule type. Area 3 defines the concrete type. */
export interface BossRulePlaceholder {
  id: string;
}

/**
 * Function type for selecting a boss rule.
 * Area 3 exports the concrete implementation.
 * Area 2 declares this type and accepts it as a parameter to buildRound().
 */
export type SelectBossRuleFn = (anteNumber: number, bossRulePool: BossRulePlaceholder[]) => string;
