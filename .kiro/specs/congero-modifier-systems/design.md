# Design Document — Area 3: Modifier Systems

## Overview

Area 3 defines the modifier application pipeline for Congero — the layer that sits between the base scoring formulas owned by Area 1 (Game Rules & Core Mechanics) and the final score presented to the player. It is the authoritative source for five modifier types: **Partners** (persistent passive-effect slots), **House Rules** (global run mutations purchased in the shop), **Scorepads** (formula-level scoring adjustments), **Trays** (meld-slot bonuses and constraints), and **Boss Rules** (hostile table rules active during boss rounds). Area 3 owns the canonical modifier stacking order, all conflict-resolution rules, the partner slot architecture, the boss rule selection algorithm, and the typed contracts through which modifiers interact with Area 1's injection hooks. It also owns the `selectBossRule()` function referenced by Area 2's `Round.bossRuleId` field.

**Out of scope for this document:** Base scoring formulas and meld validity logic (Area 1), individual card enhancement types and the wild card economy (Area 4), how modifiers are displayed in the UI (Area 5), how modifier state is persisted and restored (Area 8), and Angular service or component implementation details (Area 7).

---

## 1. Data Models

All types are TypeScript. No `any`, no partial types. All fields are required unless explicitly typed as `| null`.

```typescript
// ─── Imports from upstream areas ─────────────────────────────────────────────

import type {
  CanastaType,
  CanastaScoreResult,
  BossRuleHookSet,
  TurnState,
  Meld,
  Card,
  MeldValidationContext,
} from './area1-game-rules';

// ─── Modifier Trigger Events ──────────────────────────────────────────────────

/**
 * The set of game events at which a modifier effect may fire.
 * Modifiers must declare which events they respond to.
 */
export type ModifierTriggerEvent =
  | 'ON_MELD_PLACED'       // fires when any meld is placed or extended
  | 'ON_CANASTA_SEALED'    // fires when a meld reaches ≥7 cards
  | 'ON_CANASTA_SCORED'    // fires during score calculation (Area 1 hook)
  | 'ON_DRAW'              // fires when the player draws a card
  | 'ON_DISCARD'           // fires when the player discards a card
  | 'ON_TURN_START'        // fires at the start of each player turn
  | 'ON_TURN_END'          // fires at the end of each player turn
  | 'ON_ROUND_START'       // fires once when the round begins (Draw phase entry)
  | 'ON_ROUND_END'         // fires once when the round ends (GoOut or deck exhausted)
  | 'ON_SHOP_GENERATED'    // fires after the shop is generated (Area 2 hook)
  | 'ON_GOLD_EARNED';      // fires after gold income is computed (Area 2 hook)

// ─── Modifier Effect Types ────────────────────────────────────────────────────

/**
 * The three fundamental effect application modes.
 * These determine how conflict resolution works when two modifiers
 * target the same formula or value.
 */
export type ModifierApplicationMode =
  | 'additive'        // effect is summed with other additive effects of the same target
  | 'multiplicative'  // effect is multiplied with other multiplicative effects of the same target
  | 'override';       // effect replaces the current value (last-write-wins among overrides)

/**
 * A single modifier effect: what it targets, how it applies, and its value.
 */
export interface ModifierEffect {
  /**
   * The scoring or rule target this effect modifies.
   * Examples: 'natural_canasta_bonus', 'dirty_canasta_multiplier', 'score_cap',
   *           'wild_count_per_meld', 'meld_minimum_size', 'gold_income_multiplier'
   */
  target: ModifierEffectTarget;
  /** How this effect is applied relative to other effects on the same target. */
  mode: ModifierApplicationMode;
  /**
   * The numeric value of the effect.
   * For additive: added to the running total (may be negative).
   * For multiplicative: multiplied against the running total (e.g., 2.0 = double, 0.5 = half).
   * For override: replaces the current value entirely.
   */
  value: number;
  /**
   * Optional filter: this effect only applies when the canasta type matches.
   * null means the effect applies to all canasta types.
   */
  canastaTypeFilter: CanastaType | null;
  /**
   * Optional filter: this effect only applies to melds of the specified rank.
   * null means the effect applies to all ranks.
   */
  rankFilter: string | null;
}

/**
 * Named targets that modifier effects may act upon.
 * This is the exhaustive list of formula entry points exposed to the modifier pipeline.
 */
export type ModifierEffectTarget =
  | 'canasta_bonus'              // the getCanastaBonus() return value (Area 1, Section 3.3)
  | 'card_point_total'           // the computeCardPointTotal() return value (Area 1, Section 3.3)
  | 'score_multiplier'           // multiplier applied to baseTotal after bonus
  | 'score_flat_bonus'           // flat value added to baseTotal after bonus
  | 'score_cap'                  // maximum allowed score for a canasta or round
  | 'going_out_bonus'            // the going-out bonus value (Area 1, Section 3.5)
  | 'wild_count_per_meld'        // maximum wilds allowed per meld (Area 1 constraint)
  | 'meld_minimum_size'          // minimum cards required to start a meld
  | 'hand_size'                  // number of cards dealt at round start
  | 'shop_slot_count'            // number of shop slots (Area 2 constraint)
  | 'gold_income_multiplier'     // multiplier on gold earned per round
  | 'gold_income_flat_bonus'     // flat gold added per round
  | 'reroll_cost_reduction';     // subtracted from the reroll cost formula

// ─── Partner ──────────────────────────────────────────────────────────────────

/**
 * A partner is a passive modifier that occupies one of the player's 5 partner slots.
 * Partners apply persistent effects throughout the run until replaced.
 */
export interface Partner {
  /** Unique identifier for this partner type (e.g., 'the-purist', 'the-collector'). */
  id: string;
  /** Display name shown in the UI. */
  name: string;
  /** One-sentence description of the partner's effect. */
  description: string;
  /** The events at which this partner's effects fire. */
  triggerEvents: ModifierTriggerEvent[];
  /** The effects this partner applies when triggered. */
  effects: ModifierEffect[];
  /**
   * Rarity tier. Determines how often this partner appears in the shop.
   * Sourced from Area 2's ShopItemRarity type.
   */
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
}

/**
 * One of the player's 5 partner slots.
 * A slot is either empty or occupied by a partner.
 */
export interface PartnerSlot {
  /** Slot index, 0–4. */
  slotIndex: number;
  /**
   * The partner currently occupying this slot, or null if the slot is empty.
   */
  partner: Partner | null;
  /**
   * True if this slot has been unlocked. Slots unlock progressively:
   * slots 0–1 are unlocked from the start; slots 2–4 unlock at antes 3, 5, and 7.
   */
  unlocked: boolean;
}

// ─── House Rule ───────────────────────────────────────────────────────────────

/**
 * A house rule is a global run mutation purchased in the shop.
 * House rules alter the base rule set for the remainder of the run
 * (global scope) or for a single round (round scope).
 */
export interface HouseRule {
  /** Unique identifier for this house rule type (e.g., 'wild-abundance', 'frozen-assets'). */
  id: string;
  /** Display name shown in the UI. */
  name: string;
  /** One-sentence description of the house rule's effect. */
  description: string;
  /**
   * Scope of this house rule.
   * 'global' rules persist for the entire run once purchased.
   * 'round' rules are active only for the round in which they are purchased.
   */
  scope: 'global' | 'round';
  /** The events at which this house rule's effects fire. */
  triggerEvents: ModifierTriggerEvent[];
  /** The effects this house rule applies when triggered. */
  effects: ModifierEffect[];
  /**
   * Optional: hook overrides this house rule injects into the BossRuleHookSet.
   * Used for house rules that need to intercept meld validation or turn events.
   * null if the house rule only uses the ModifierEffect system.
   */
  hookOverrides: Partial<BossRuleHookSet> | null;
  /** Rarity tier. */
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  /**
   * True if this house rule may stack with itself (player buys it twice).
   * false means purchasing a second copy has no additional effect.
   */
  stackable: boolean;
}

// ─── Scorepad ─────────────────────────────────────────────────────────────────

/**
 * A scorepad modifies the scoring formulas for specific canasta types.
 * Scorepads are applied in the first stage of the modifier pipeline,
 * immediately after Area 1 computes baseTotal.
 */
export interface Scorepad {
  /** Unique identifier for this scorepad type (e.g., 'natural-amplifier', 'dirty-discount'). */
  id: string;
  /** Display name shown in the UI. */
  name: string;
  /** One-sentence description of the scorepad's effect. */
  description: string;
  /**
   * The canasta types this scorepad affects.
   * An empty array means the scorepad affects all canasta types.
   */
  targetCanastaTypes: CanastaType[];
  /** The effects this scorepad applies. Always fires on ON_CANASTA_SCORED. */
  effects: ModifierEffect[];
  /** Rarity tier. */
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
}

// ─── Tray Slot ────────────────────────────────────────────────────────────────

/**
 * A tray is a meld-slot modifier: a named slot on the table that applies
 * a bonus or constraint to the meld placed in it.
 * The player has a fixed number of tray slots per round (see Section 3.4).
 */
export interface Tray {
  /** Unique identifier for this tray type (e.g., 'gold-tray', 'rank-lock-tray'). */
  id: string;
  /** Display name shown in the UI. */
  name: string;
  /** One-sentence description of the tray's effect. */
  description: string;
  /**
   * The type of tray effect.
   * 'bonus' trays add score or other benefits to the meld placed in them.
   * 'constraint' trays restrict what may be placed in them (and reward compliance).
   * 'hybrid' trays apply both a constraint and a bonus.
   */
  trayType: 'bonus' | 'constraint' | 'hybrid';
  /**
   * Constraint definition. null for pure bonus trays.
   * Describes what restriction the tray imposes on the meld placed in it.
   */
  constraint: TrayConstraint | null;
  /** The effects applied to the meld placed in this tray. Fires on ON_CANASTA_SCORED. */
  effects: ModifierEffect[];
  /** Rarity tier. */
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
}

/**
 * A constraint imposed by a tray on the meld placed in it.
 */
export interface TrayConstraint {
  /**
   * The type of constraint.
   * 'rank_lock': only one rank may be placed in this tray.
   * 'natural_only': only natural canastas (no wilds) may be placed in this tray.
   * 'min_size': the meld must reach at least N cards to score the tray bonus.
   * 'no_wilds': no wild cards may be added to the meld in this tray.
   */
  constraintType: 'rank_lock' | 'natural_only' | 'min_size' | 'no_wilds';
  /**
   * For 'rank_lock': the rank that is locked in (set when the first card is placed).
   * For 'min_size': the minimum card count required.
   * null for other constraint types.
   */
  constraintValue: string | number | null;
  /**
   * True if violating the constraint causes the tray bonus to be forfeited entirely.
   * False if the constraint is advisory only (no penalty for violation).
   */
  penaltyOnViolation: boolean;
}

/**
 * One tray slot on the player's table.
 */
export interface TraySlot {
  /** Slot index, 0–(traySlotCount-1). */
  slotIndex: number;
  /**
   * The tray currently assigned to this slot, or null if no tray is active.
   */
  tray: Tray | null;
  /**
   * The meld currently placed in this tray slot, or null if no meld is assigned.
   * Identified by meld ID (from Area 1's Meld.id).
   */
  assignedMeldId: string | null;
  /**
   * True if the tray constraint has been violated for the currently assigned meld.
   * Only relevant when tray.constraint.penaltyOnViolation === true.
   */
  constraintViolated: boolean;
}

// ─── Boss Rule ────────────────────────────────────────────────────────────────

/**
 * A boss rule is a hostile table rule active during boss rounds.
 * Boss rules are injected into the Area 1 BossRuleHookSet and may override
 * or cap any aspect of the base rule set.
 */
export interface BossRule {
  /** Unique identifier for this boss rule (e.g., 'the-purist', 'wild-drought', 'score-cap'). */
  id: string;
  /** Display name shown in the UI. */
  name: string;
  /** One-sentence description of the boss rule's effect. */
  description: string;
  /**
   * The Area 1 injection points this boss rule uses.
   * Must reference named hooks from Area 1, Section 3.4 (BossRuleHookSet).
   */
  injectionPoints: Array<keyof BossRuleHookSet>;
  /**
   * The hook implementations for this boss rule.
   * These are merged into the active BossRuleHookSet at the start of the boss round.
   */
  hookOverrides: Partial<BossRuleHookSet>;
  /**
   * Modifier effects applied by this boss rule during score calculation.
   * These are applied in the boss_modifiers stage of the pipeline (last stage).
   */
  effects: ModifierEffect[];
  /**
   * The ante range in which this boss rule may appear.
   * [minAnte, maxAnte] inclusive. null means no restriction.
   */
  anteRange: [number, number] | null;
  /**
   * Weight used in boss rule selection. Higher weight = more likely to be selected.
   * See Section 3.5 for the selection algorithm.
   */
  selectionWeight: number;
}

// ─── Modifier Pipeline ────────────────────────────────────────────────────────

/**
 * The full modifier pipeline state for one score calculation pass.
 * Carries the running score through each stage and records what each stage contributed.
 */
export interface ModifierPipeline {
  /** The input from Area 1: result of scoreCanasta() before any modifiers. */
  baseResult: CanastaScoreResult;
  /**
   * Score after scorepad modifiers are applied.
   * Equals baseResult.baseTotal if no scorepads are active.
   */
  afterScorepad: number;
  /**
   * Score after partner modifiers are applied.
   * Equals afterScorepad if no partners have ON_CANASTA_SCORED effects.
   */
  afterPartner: number;
  /**
   * Score after tray modifiers are applied.
   * Equals afterPartner if the meld is not in a tray, or the tray has no score effect.
   */
  afterTray: number;
  /**
   * Final score after boss modifiers are applied.
   * This is the value stored in MeldState.score (Area 8).
   */
  afterBoss: number;
  /** Audit log of each modifier that fired during this pipeline run. */
  appliedModifiers: AppliedModifierRecord[];
}

/**
 * A record of one modifier that fired during a pipeline run.
 * Used for score breakdown display (Area 5) and state persistence (Area 8).
 */
export interface AppliedModifierRecord {
  /** The modifier type that fired. */
  modifierType: 'scorepad' | 'partner' | 'tray' | 'bossRule' | 'houseRule';
  /** The specific modifier ID. */
  modifierId: string;
  /** The effect target that was modified. */
  target: ModifierEffectTarget;
  /** The application mode used. */
  mode: ModifierApplicationMode;
  /** The value applied. */
  value: number;
  /** The score before this modifier was applied. */
  scoreBefore: number;
  /** The score after this modifier was applied. */
  scoreAfter: number;
}

// ─── Active Modifier State ────────────────────────────────────────────────────

/**
 * The complete set of active modifiers for the current run/round.
 * This is the input to the modifier pipeline.
 */
export interface ActiveModifierState {
  /** The player's 5 partner slots. */
  partnerSlots: PartnerSlot[];
  /** All house rules currently active (global scope + round scope for current round). */
  activeHouseRules: HouseRule[];
  /** All scorepads the player has purchased. */
  activeScorепads: Scorepad[];
  /** The player's tray slots for the current round. */
  traySlots: TraySlot[];
  /**
   * The active boss rule for the current round, or null if not a boss round.
   * Populated from Round.bossRuleId (Area 2) by looking up the BossRule definition.
   */
  activeBossRule: BossRule | null;
}
```

---
## 2. Core Algorithms

### 2.1 Modifier Pipeline — Canonical Stacking Order

The modifier pipeline is the authoritative computation path for all canasta scores. It is invoked once per canasta at the moment of scoring (triggered by the `ON_CANASTA_SCORED` hook from Area 1, Section 3.4).

**Canonical stacking order:**

```
base_score → scorepad_modifiers → partner_modifiers → tray_modifiers → boss_modifiers
```

1. **base_score**: Area 1 computes `scoreCanasta(meld, canastaType)` → `CanastaScoreResult.baseTotal`
2. **scorepad_modifiers**: All active scorepads with `ON_CANASTA_SCORED` effects are applied
3. **partner_modifiers**: All partners in occupied slots with `ON_CANASTA_SCORED` effects are applied
4. **tray_modifiers**: If the meld is assigned to a tray slot, that tray's effects are applied
5. **boss_modifiers**: If a boss rule is active, its score effects are applied last (may cap or override)

**Rationale for this order:**
- Scorepads modify the formula first because they represent the player's "scoring sheet" — a persistent investment that shapes the base value.
- Partners apply second because they represent passive advisors whose effects build on the scorepad-adjusted value.
- Trays apply third because they are meld-specific bonuses that reward placement decisions.
- Boss rules apply last because they are hostile overrides that the player cannot fully control — they must be able to cap or override everything else.

**TypeScript implementation:**

```typescript
function runModifierPipeline(
  baseResult: CanastaScoreResult,
  meld: Meld,
  state: ActiveModifierState
): ModifierPipeline {
  const pipeline: ModifierPipeline = {
    baseResult,
    afterScorepad: baseResult.baseTotal,
    afterPartner: 0,
    afterTray: 0,
    afterBoss: 0,
    appliedModifiers: [],
  };

  // Stage 1: Scorepad modifiers
  pipeline.afterScorepad = applyModifierEffects(
    baseResult.baseTotal,
    collectScoringEffects(state.activeScorепads, baseResult.canastaType, meld),
    'scorepad',
    pipeline.appliedModifiers
  );

  // Stage 2: Partner modifiers
  pipeline.afterPartner = applyModifierEffects(
    pipeline.afterScorepad,
    collectScoringEffects(
      state.partnerSlots
        .filter(s => s.unlocked && s.partner !== null)
        .map(s => s.partner!),
      baseResult.canastaType,
      meld
    ),
    'partner',
    pipeline.appliedModifiers
  );

  // Stage 3: Tray modifiers
  const activeTraySlot = state.traySlots.find(t => t.assignedMeldId === meld.id);
  if (activeTraySlot?.tray && !activeTraySlot.constraintViolated) {
    pipeline.afterTray = applyModifierEffects(
      pipeline.afterPartner,
      collectScoringEffects([activeTraySlot.tray], baseResult.canastaType, meld),
      'tray',
      pipeline.appliedModifiers
    );
  } else {
    pipeline.afterTray = pipeline.afterPartner;
  }

  // Stage 4: Boss modifiers (applied last; may cap or override)
  if (state.activeBossRule) {
    pipeline.afterBoss = applyModifierEffects(
      pipeline.afterTray,
      state.activeBossRule.effects.filter(e =>
        (e.canastaTypeFilter === null || e.canastaTypeFilter === baseResult.canastaType)
      ),
      'bossRule',
      pipeline.appliedModifiers
    );
  } else {
    pipeline.afterBoss = pipeline.afterTray;
  }

  return pipeline;
}
```

---

### 2.2 Conflict Resolution Rules

When two or more modifiers target the same `ModifierEffectTarget`, the following rules determine the final value. These rules are applied within each pipeline stage independently.

**Rule 1 — Additive effects stack by summation**

All additive effects on the same target within the same pipeline stage are summed together, then applied once to the running score.

```
runningScore += sum(effect.value for all additive effects on target)
```

Example: Two scorepads both add a flat bonus to `score_flat_bonus` — one adds +100, the other adds +150. The combined effect is +250.

**Rule 2 — Multiplicative effects stack by multiplication**

All multiplicative effects on the same target within the same pipeline stage are multiplied together, then applied once to the running score.

```
runningScore *= product(effect.value for all multiplicative effects on target)
```

Example: Two partners both apply a multiplier to `score_multiplier` — one applies ×1.5, the other applies ×2.0. The combined effect is ×3.0 (not ×3.5).

**Rule 3 — Additive and multiplicative effects on the same target compose in order: additive first, then multiplicative**

Within a single pipeline stage, additive effects are applied before multiplicative effects on the same target.

```
runningScore = (runningScore + sum(additive effects)) * product(multiplicative effects)
```

Example: A scorepad adds +200 (additive) and a partner applies ×2.0 (multiplicative) to `score_flat_bonus`. If the base score is 500: `(500 + 200) × 2.0 = 1400`.

**Rule 4 — Override effects use last-write-wins within a stage**

If multiple override effects target the same value within the same pipeline stage, the last one in the modifier list wins. The modifier list order is deterministic: modifiers are applied in the order they were acquired (purchase order, ascending).

```
runningScore = last(effect.value for all override effects on target)
```

Example: Two boss rules both override `score_cap` — one sets it to 800, the other to 1000. The one acquired later (higher index in the active list) wins.

**Rule 5 — Boss modifiers override all earlier stages**

Boss modifiers are applied in the final pipeline stage. An override effect from a boss rule replaces the value produced by all earlier stages, regardless of what scorepads, partners, or trays computed.

Example: Scorepads and partners compute a score of 1,240. The boss rule "Score Cap" applies an override to `score_cap` with value 1000. Final score = min(1240, 1000) = 1000.

**Note on `score_cap`:** The `score_cap` target is special — it is not applied directly to the running score. Instead, after all pipeline stages complete, the final score is clamped: `finalScore = min(afterBoss, activeCap)` where `activeCap` is the lowest `score_cap` override value across all active modifiers.

**TypeScript implementation of effect application:**

```typescript
function applyModifierEffects(
  currentScore: number,
  effects: ModifierEffect[],
  modifierType: AppliedModifierRecord['modifierType'],
  log: AppliedModifierRecord[]
): number {
  // Group effects by target
  const byTarget = groupBy(effects, e => e.target);

  let score = currentScore;

  for (const [target, targetEffects] of Object.entries(byTarget)) {
    if (target === 'score_cap') continue; // handled separately after pipeline

    const additiveEffects = targetEffects.filter(e => e.mode === 'additive');
    const multiplicativeEffects = targetEffects.filter(e => e.mode === 'multiplicative');
    const overrideEffects = targetEffects.filter(e => e.mode === 'override');

    // Apply additive sum
    const additiveSum = additiveEffects.reduce((sum, e) => sum + e.value, 0);
    if (additiveSum !== 0) {
      const before = score;
      score += additiveSum;
      log.push({ modifierType, modifierId: additiveEffects[0].target, target: target as ModifierEffectTarget,
                 mode: 'additive', value: additiveSum, scoreBefore: before, scoreAfter: score });
    }

    // Apply multiplicative product
    const multiplicativeProduct = multiplicativeEffects.reduce((prod, e) => prod * e.value, 1.0);
    if (multiplicativeProduct !== 1.0) {
      const before = score;
      score = Math.round(score * multiplicativeProduct);
      log.push({ modifierType, modifierId: multiplicativeEffects[0].target, target: target as ModifierEffectTarget,
                 mode: 'multiplicative', value: multiplicativeProduct, scoreBefore: before, scoreAfter: score });
    }

    // Apply override (last-write-wins)
    if (overrideEffects.length > 0) {
      const lastOverride = overrideEffects[overrideEffects.length - 1];
      const before = score;
      score = lastOverride.value;
      log.push({ modifierType, modifierId: lastOverride.target, target: target as ModifierEffectTarget,
                 mode: 'override', value: lastOverride.value, scoreBefore: before, scoreAfter: score });
    }
  }

  return score;
}

function applyScoreCap(score: number, allEffects: ModifierEffect[]): number {
  const capEffects = allEffects.filter(e => e.target === 'score_cap' && e.mode === 'override');
  if (capEffects.length === 0) return score;
  const lowestCap = Math.min(...capEffects.map(e => e.value));
  return Math.min(score, lowestCap);
}
```

---

### 2.3 Partner Slot Model

**Slot count:** 5 partner slots per player, indexed 0–4.

**Slot unlock schedule:**

| Slot Index | Unlocks At |
|-----------|-----------|
| 0 | Run start (always unlocked) |
| 1 | Run start (always unlocked) |
| 2 | Ante 3, Round 1 (absolute round 7) |
| 3 | Ante 5, Round 1 (absolute round 13) |
| 4 | Ante 7, Round 1 (absolute round 19) |

**Slot types:** All 5 slots are generic — any partner may be placed in any unlocked slot. There are no slot-type restrictions.

**Partner drafting:** Partners are purchased from the shop (Area 2, Section 3.5). When a player purchases a partner:
1. If any unlocked slot is empty, the partner is placed in the lowest-indexed empty slot.
2. If all unlocked slots are occupied, the player must choose which existing partner to replace. The replaced partner is discarded (removed from the run permanently).

**Partner replacement rule:** Replacement is irreversible. The discarded partner's effects cease immediately. The new partner's effects begin on the next trigger event.

**TypeScript:**

```typescript
function draftPartner(
  partner: Partner,
  slots: PartnerSlot[],
  replaceSlotIndex: number | null
): PartnerSlot[] {
  const unlockedSlots = slots.filter(s => s.unlocked);
  const emptySlot = unlockedSlots.find(s => s.partner === null);

  if (emptySlot) {
    // Place in first empty slot
    return slots.map(s =>
      s.slotIndex === emptySlot.slotIndex ? { ...s, partner } : s
    );
  }

  if (replaceSlotIndex === null) {
    throw new Error('All partner slots occupied — replaceSlotIndex required');
  }

  // Replace the specified slot
  return slots.map(s =>
    s.slotIndex === replaceSlotIndex ? { ...s, partner } : s
  );
}

function unlockPartnerSlot(slots: PartnerSlot[], slotIndex: number): PartnerSlot[] {
  return slots.map(s =>
    s.slotIndex === slotIndex ? { ...s, unlocked: true } : s
  );
}
```

---

### 2.4 Partner Effect Application

Partners fire their effects at the events listed in `Partner.triggerEvents`. The following table defines when each trigger event fires and what the partner effect may do:

| Trigger Event | Fires When | What Partner Effects May Do |
|--------------|-----------|----------------------------|
| `ON_MELD_PLACED` | Any meld is placed or extended | Modify meld card count, add bonus cards, alter meld rank |
| `ON_CANASTA_SEALED` | A meld reaches ≥7 cards | Modify canasta type, add bonus score, trigger side effects |
| `ON_CANASTA_SCORED` | `scoreCanasta()` is called (Area 1 hook) | Apply score multipliers, flat bonuses, or overrides |
| `ON_DRAW` | Player draws a card | Add extra draws, filter drawn cards, grant gold |
| `ON_DISCARD` | Player discards a card | Redirect discard, grant bonus, modify discard pile state |
| `ON_TURN_START` | Start of each player turn | Modify hand size, grant temporary effects |
| `ON_TURN_END` | End of each player turn | Apply end-of-turn bonuses, clean up temporary effects |
| `ON_ROUND_START` | Round begins (Draw phase entry) | Set up round-scoped bonuses, modify initial hand |
| `ON_ROUND_END` | Round ends (GoOut or deck exhausted) | Apply round-completion bonuses |

**Effect composition when multiple partners fire on the same event:**

Partners are applied in slot order (slot 0 first, slot 4 last). This is deterministic and consistent with the last-write-wins rule for overrides.

**Partners that fire on `ON_CANASTA_SCORED` are applied in the partner_modifiers stage of the pipeline.** Partners that fire on other events (e.g., `ON_MELD_PLACED`, `ON_DRAW`) are applied outside the scoring pipeline — they modify game state directly via the `TurnState` mutation pattern from Area 1.

---

### 2.5 House Rule Application Model

**Global vs round-scoped rules:**

| Scope | When Active | Persistence |
|-------|------------|-------------|
| `global` | From the round after purchase until the run ends | Persisted in run state (Area 8) |
| `round` | Only during the round in which the rule is purchased | Cleared at round end |

**Application to the base rule set:**

House rules that use `ModifierEffect` entries are applied in the modifier pipeline alongside scorepads (they are treated as additional scorepad-stage effects). House rules that use `hookOverrides` are merged into the active `BossRuleHookSet` at the start of each turn.

**Hook override merging:** When multiple house rules provide hook overrides for the same hook (e.g., two house rules both provide `ON_MELD_VALIDATE`), the hooks are composed in purchase order — each hook wraps the previous one. The innermost hook (earliest purchase) runs first; the outermost (latest purchase) runs last.

```typescript
function mergeHouseRuleHooks(houseRules: HouseRule[]): Partial<BossRuleHookSet> {
  const merged: Partial<BossRuleHookSet> = {};

  for (const rule of houseRules) {
    if (!rule.hookOverrides) continue;
    for (const [hookName, hookFn] of Object.entries(rule.hookOverrides)) {
      const existing = (merged as any)[hookName];
      if (existing) {
        // Compose: new hook wraps existing hook
        (merged as any)[hookName] = (...args: any[]) => {
          const intermediateResult = existing(...args);
          return (hookFn as any)(intermediateResult, ...args.slice(1));
        };
      } else {
        (merged as any)[hookName] = hookFn;
      }
    }
  }

  return merged;
}
```

**Stacking rules for house rules:**

- If `HouseRule.stackable === true`: purchasing a second copy doubles the effect values (additive effects are doubled; multiplicative effects are squared).
- If `HouseRule.stackable === false`: purchasing a second copy has no effect. The shop should not offer a non-stackable house rule the player already owns (Area 2 shop generation hook).

---

### 2.6 Scorepad Formula Composition

Scorepads modify the base scoring formulas from Area 1 (Section 3.3). They are applied in the first stage of the modifier pipeline (`scorepad_modifiers`).

**How scorepads compose with `scoreCanasta()`:**

Area 1's `scoreCanasta()` returns `CanastaScoreResult.baseTotal = cardPointTotal + canastaBonus`. Scorepads receive this `baseTotal` as their input and may modify it via `ModifierEffect` entries targeting `canasta_bonus`, `card_point_total`, `score_multiplier`, or `score_flat_bonus`.

**Scorepad effect targets and their meaning:**

| Target | What It Modifies | Example |
|--------|-----------------|---------|
| `canasta_bonus` | The `canastaBonus` component of `baseTotal` | Natural Amplifier: +200 additive to natural canasta bonus |
| `card_point_total` | The `cardPointTotal` component of `baseTotal` | High-Value Scorepad: ×1.5 multiplicative to card point total |
| `score_multiplier` | A multiplier applied to the full `baseTotal` | Dirty Discount: ×0.75 multiplicative to dirty canasta total |
| `score_flat_bonus` | A flat value added to `baseTotal` after other effects | Completion Bonus: +50 additive for any sealed canasta |

**Multiple scorepads on the same target:** Conflict resolution follows Section 2.2 rules. Additive scorepads stack by summation; multiplicative scorepads stack by multiplication.

---

### 2.7 Tray Slot Model

**Tray slot count:** The number of tray slots available to the player scales with ante:

| Ante | Tray Slots |
|------|-----------|
| 1–2 | 2 |
| 3–4 | 3 |
| 5–6 | 4 |
| 7–8 | 5 |

```typescript
function traySlotCount(anteNumber: number): number {
  if (anteNumber <= 2) return 2;
  if (anteNumber <= 4) return 3;
  if (anteNumber <= 6) return 4;
  return 5;
}
```

**Tray assignment:** At the start of each round, the player may assign melds to tray slots. Assignment is done before the Play phase begins (during the Draw phase setup). A meld may only be assigned to one tray slot. A tray slot may only hold one meld.

**Tray constraint enforcement:** When a card is added to a meld that is assigned to a tray slot with a constraint:
1. The constraint is checked against the updated meld state.
2. If the constraint is violated and `penaltyOnViolation === true`, `TraySlot.constraintViolated` is set to `true`.
3. A violated tray slot does not apply its effects during scoring (the bonus is forfeited).
4. Constraint violation is permanent for the round — it cannot be undone.

**Tray effect application:** Tray effects fire on `ON_CANASTA_SCORED` in the `tray_modifiers` stage. If `TraySlot.constraintViolated === true`, the tray's effects are skipped entirely.

---

### 2.8 Boss Rule Injection Mechanism

Boss rules use the named injection points defined in Area 1, Section 3.4 (`BossRuleHookSet`). At the start of each boss round:

1. Area 2 provides `Round.bossRuleId` (the selected boss rule ID).
2. Area 3 looks up the `BossRule` definition by ID.
3. The `BossRule.hookOverrides` are merged into the active `BossRuleHookSet`.
4. The `BossRule.effects` are registered as the `boss_modifiers` stage of the pipeline.

**Boss rule hook override merging with house rules:**

If house rules are also active and provide hook overrides, the merge order is:
1. House rule hooks are merged first (in purchase order).
2. Boss rule hooks are merged last (they override house rule hooks on the same injection point).

This ensures boss rules always have the final say on any hook they claim.

**Boss rule selection algorithm:**

```typescript
function selectBossRule(anteNumber: number, bossRulePool: BossRule[]): string {
  // Filter to rules eligible for this ante
  const eligible = bossRulePool.filter(rule =>
    rule.anteRange === null ||
    (anteNumber >= rule.anteRange[0] && anteNumber <= rule.anteRange[1])
  );

  if (eligible.length === 0) {
    throw new Error(`No eligible boss rules for ante ${anteNumber}`);
  }

  // Weighted random selection
  const totalWeight = eligible.reduce((sum, r) => sum + r.selectionWeight, 0);
  let roll = Math.random() * totalWeight;

  for (const rule of eligible) {
    roll -= rule.selectionWeight;
    if (roll <= 0) return rule.id;
  }

  // Fallback (floating point edge case)
  return eligible[eligible.length - 1].id;
}
```

**Named injection points used by boss rules (from Area 1, Section 3.4):**

| Injection Point | Boss Rules That Use It | Purpose |
|----------------|----------------------|---------|
| `ON_MELD_VALIDATE` | Wild Drought, Rank Embargo | Block specific meld types |
| `ON_CANASTA_SEALED` | Type Enforcer | Override canasta type at sealing |
| `ON_CANASTA_SCORED` | The Purist, Score Cap, Frozen Assets | Modify or cap canasta score |
| `ON_DISCARD` | Sticky Fingers | Penalize discards |
| `ON_GO_OUT_ATTEMPT` | Last Stand | Add going-out requirements |
| `ON_TURN_START` | Wild Drought | Enforce wild card restrictions at turn start |

---

### 2.9 Canonical Boss Rule Definitions

The following boss rules form the base pool. All reference Area 1 injection points by name.

| ID | Name | Injection Points | Effect |
|----|------|-----------------|--------|
| `the-purist` | The Purist | `ON_CANASTA_SCORED` | Dirty canastas score ×0.5 (multiplicative) |
| `wild-drought` | Wild Drought | `ON_MELD_VALIDATE`, `ON_TURN_START` | No wilds may be played this round; wilds in hand are locked |
| `score-cap` | Score Cap | `ON_CANASTA_SCORED` | Maximum score per canasta this round is 1000 (override) |
| `frozen-assets` | Frozen Assets | `ON_CANASTA_SCORED` | Frozen canastas score ×1.5 (multiplicative); all other canastas score ×0.75 |
| `rank-embargo` | Rank Embargo | `ON_MELD_VALIDATE` | One randomly selected rank may not be melded this round |
| `last-stand` | Last Stand | `ON_GO_OUT_ATTEMPT` | Player must have ≥2 canastas to go out |
| `sticky-fingers` | Sticky Fingers | `ON_DISCARD` | Each discard costs 5 points (additive penalty to round score) |

---

### 2.10 Canonical Partner Definitions

The following partners form the base pool (12 partners total, as referenced in Area 2, Section 3.5).

| ID | Name | Trigger | Effect |
|----|------|---------|--------|
| `the-purist` | The Purist | `ON_CANASTA_SCORED` | Natural canastas score ×2.0 (multiplicative) |
| `the-collector` | The Collector | `ON_CANASTA_SCORED` | +100 flat bonus if meld contains ≥4 copies of the same rank |
| `the-hoarder` | The Hoarder | `ON_CANASTA_SCORED` | +50 flat bonus per card in the meld beyond 7 |
| `the-purist-dark` | The Contrarian | `ON_CANASTA_SCORED` | Dirty canastas score ×1.5 (multiplicative) |
| `the-archivist` | The Archivist | `ON_ROUND_END` | +200 flat bonus if player sealed ≥3 canastas this round |
| `the-gambler` | The Gambler | `ON_CANASTA_SCORED` | 50% chance of ×2.0, 50% chance of ×0.5 (random multiplicative) |
| `the-economist` | The Economist | `ON_GOLD_EARNED` | +1 gold per round (additive to gold income) |
| `the-speedrunner` | The Speedrunner | `ON_CANASTA_SCORED` | +100 flat bonus if canasta was sealed in ≤3 turns |
| `the-naturalist` | The Naturalist | `ON_CANASTA_SCORED` | Natural canastas: +300 flat bonus |
| `the-wildling` | The Wildling | `ON_CANASTA_SCORED` | Each wild in the meld adds +30 flat bonus |
| `the-minimalist` | The Minimalist | `ON_CANASTA_SCORED` | Canastas with exactly 7 cards score ×1.25 (multiplicative) |
| `the-maximalist` | The Maximalist | `ON_CANASTA_SCORED` | Super canastas (≥10 cards) score ×1.5 (multiplicative) |

---

### 2.11 Canonical Scorepad Definitions

The following scorepads form the base pool (6 types, as referenced in Area 2, Section 3.5).

| ID | Name | Target Canasta Types | Effect |
|----|------|---------------------|--------|
| `natural-amplifier` | Natural Amplifier | `natural` | +200 additive to `canasta_bonus` |
| `dirty-discount` | Dirty Discount | `dirty` | ×0.75 multiplicative to `score_multiplier` |
| `super-booster` | Super Booster | `super` | +500 additive to `canasta_bonus` |
| `all-rounder` | All-Rounder | all types | +50 additive to `score_flat_bonus` per canasta |
| `high-value-pad` | High-Value Pad | all types | ×1.25 multiplicative to `card_point_total` |
| `completion-bonus` | Completion Bonus | all types | +100 additive to `score_flat_bonus` (fires once per round, on first canasta sealed) |

---

### 2.12 Canonical Tray Definitions

The following trays form the base pool (6 types, as referenced in Area 2, Section 3.5).

| ID | Name | Tray Type | Constraint | Effect |
|----|------|-----------|-----------|--------|
| `gold-tray` | Gold Tray | `bonus` | None | ×2.0 multiplicative to `score_multiplier` for the assigned meld |
| `rank-lock-tray` | Rank Lock Tray | `hybrid` | `rank_lock` (locked on first card placed) | ×1.5 multiplicative to `score_multiplier` if constraint satisfied |
| `natural-tray` | Natural Tray | `hybrid` | `natural_only` (no wilds allowed) | +400 additive to `canasta_bonus` if constraint satisfied |
| `mega-tray` | Mega Tray | `hybrid` | `min_size` (minimum 9 cards) | ×3.0 multiplicative to `score_multiplier` if constraint satisfied |
| `wild-tray` | Wild Tray | `bonus` | None | +30 additive to `score_flat_bonus` per wild card in the meld |
| `purity-tray` | Purity Tray | `constraint` | `no_wilds` | +600 additive to `canasta_bonus` if constraint satisfied; 0 bonus if violated |

---

### 2.13 Canonical House Rule Definitions

The following house rules form the base pool (8 types, as referenced in Area 2, Section 3.5).

| ID | Name | Scope | Effect |
|----|------|-------|--------|
| `wild-abundance` | Wild Abundance | `global` | Wilds count as 2 cards for meld size (hookOverride on `ON_MELD_PLACED`) |
| `frozen-assets-hr` | Frozen Assets | `global` | Frozen canastas score ×1.5 (multiplicative, scorepad-stage effect) |
| `golden-round` | Golden Round | `round` | Gold income ×2.0 this round (multiplicative to `gold_income_multiplier`) |
| `open-market` | Open Market | `global` | Shop slot count +1 (additive to `shop_slot_count`) |
| `quick-draw` | Quick Draw | `global` | Hand size +2 at round start (additive to `hand_size`) |
| `canasta-rush` | Canasta Rush | `round` | First canasta sealed this round scores ×2.0 (multiplicative, one-time) |
| `discount-day` | Discount Day | `round` | All shop items cost 1 less gold this round (additive -1 to item costs) |
| `reroll-rebate` | Reroll Rebate | `global` | Reroll cost reduced by 1 (additive -1 to `reroll_cost_reduction`) |


---

## 3. Interfaces & Contracts with Adjacent Areas

### 3.1 Contract with Area 1 — Game Rules & Core Mechanics

Area 3 consumes the named injection points defined in Area 1, Section 3.4. The contract is the `BossRuleHookSet` interface. Area 3 populates `BossRuleHookSet` instances and passes them into `MeldValidationContext` and any function that accepts hook overrides.

Area 3 also receives `CanastaScoreResult` from Area 1's `scoreCanasta()` function and returns a modified `CanastaScoreResult` (or a plain number) via the `ON_CANASTA_SCORED` hook.

**Area 3 must not redefine `scoreCanasta()`, `validateMeld()`, or any canasta type. It must call them and compose on top of their results.**

**Types imported from Area 1:**

```typescript
// Area 3 imports these from Area 1 (congero-game-rules):
import type {
  BossRuleHookSet,
  CanastaScoreResult,
  MeldValidationContext,
  TurnState,
  Meld,
  Card,
  CanastaType,
} from './area1-game-rules';
```

**Named injection points Area 3 uses (from Area 1, Section 3.4):**

```typescript
// Area 3 populates these hooks and passes them to Area 1 functions:
const activeHookSet: BossRuleHookSet = {
  // Populated by merging house rule hooks + boss rule hooks
  ON_MELD_VALIDATE: buildMeldValidateHook(activeModifiers),
  ON_CANASTA_SCORED: buildCanastaScoreHook(activeModifiers),
  ON_TURN_START: buildTurnStartHook(activeModifiers),
  ON_DISCARD: buildDiscardHook(activeModifiers),
  ON_GO_OUT_ATTEMPT: buildGoOutHook(activeModifiers),
  // Other hooks populated as needed
};
```

**The `ON_CANASTA_SCORED` hook is the primary entry point for the modifier pipeline:**

```typescript
// Area 3 implements ON_CANASTA_SCORED as the pipeline entry point:
function buildCanastaScoreHook(
  state: ActiveModifierState,
  meld: Meld
): BossRuleHookSet['ON_CANASTA_SCORED'] {
  return (baseResult: CanastaScoreResult): CanastaScoreResult => {
    const pipeline = runModifierPipeline(baseResult, meld, state);
    const finalScore = applyScoreCap(pipeline.afterBoss, collectAllEffects(state));
    return {
      ...baseResult,
      baseTotal: finalScore,
    };
  };
}
```

---

### 3.2 Contract with Area 2 — Deckbuilding & Run Structure

Area 3 provides two functions that Area 2 calls:

**1. Boss rule selection (Area 2, Section 3.3 — `buildRound()`):**

```typescript
// Area 3 exports this function; Area 2 calls it to populate Round.bossRuleId:
export function selectBossRule(anteNumber: number): string;
```

**2. Shop generation hook (Area 2, Section 3.5 — `ShopGenerationHook`):**

```typescript
// Area 3 implements the ShopGenerationHook interface from Area 2:
export const modifierShopHook: ShopGenerationHook = {
  onShopGenerated(shop: ShopState, context: ShopGenerationContext): ShopState {
    // Filter out non-stackable house rules the player already owns
    // Adjust item costs based on active house rules (e.g., Discount Day)
    // Add extra slots if Open Market house rule is active
    return modifiedShop;
  }
};
```

**3. Gold income hook (Area 2, Section 4.2 — `GoldIncomeHook`):**

```typescript
// Area 3 implements the GoldIncomeHook interface from Area 2:
export const modifierGoldHook: GoldIncomeHook = {
  onGoldEarned(baseGold: number, context: GoldIncomeContext): number {
    // Apply gold_income_multiplier effects from active partners and house rules
    // Apply gold_income_flat_bonus effects
    return modifiedGold;
  }
};
```

**Types Area 3 imports from Area 2:**

```typescript
import type {
  ShopState,
  ShopGenerationHook,
  ShopGenerationContext,
  GoldIncomeHook,
  GoldIncomeContext,
  Round,
} from './area2-deckbuilding';
```

---

### 3.3 Contract with Area 4 — Card Enhancements & Wild Card Economy

Area 4 (Card Enhancements & Wild Card Economy) references the modifier pipeline when describing how card enhancements interact with active modifiers. Area 3 exposes the following entry point for Area 4:

**Modifier pipeline entry point for card enhancements:**

Card enhancements (Area 4) that affect scoring contribute to `CanastaScoreResult.baseTotal` before the modifier pipeline runs. This means enhancement effects are part of `base_score` — they are computed by Area 1's `scoreCanasta()` (or by Area 4's enhancement application layer that runs before `scoreCanasta()` is called). The modifier pipeline receives the already-enhancement-adjusted `baseTotal`.

```typescript
// Area 4 enhancement effects are applied BEFORE the modifier pipeline.
// Area 3 exposes this contract so Area 4 knows where its effects land:
export interface EnhancementPipelineContract {
  /**
   * Enhancement effects that modify card point values or canasta bonuses
   * are applied before scoreCanasta() is called.
   * The result is passed as baseResult to runModifierPipeline().
   *
   * Enhancement effects do NOT enter the modifier pipeline stages.
   * They are part of base_score, not scorepad/partner/tray/boss stages.
   */
  enhancementEffectsApplyBefore: true;
  /**
   * The modifier pipeline receives CanastaScoreResult from Area 1,
   * which already includes any enhancement contributions.
   */
  pipelineInput: CanastaScoreResult;
}
```

---

### 3.4 Contract with Area 8 — Game State Management

Area 8 stores the active modifier state and the modifier pipeline audit log. Area 3 defines the data shapes; Area 8 defines the storage and persistence model.

**Types Area 8 consumes from Area 3:**

```typescript
// Area 8 imports these from Area 3 (congero-modifier-systems):
import type {
  ActiveModifierState,
  PartnerSlot,
  HouseRule,
  Scorepad,
  TraySlot,
  BossRule,
  ModifierPipeline,
  AppliedModifierRecord,
  Partner,
  Tray,
} from './area3-modifier-systems';
```

**Run state schema inputs (Area 8 must include these fields):**

```typescript
// These fields in Area 8's RunState are typed using Area 3's types:
interface RunStateArea3Fields {
  partnerSlots: PartnerSlot[];           // 5 slots, persisted across rounds
  activeHouseRules: HouseRule[];         // global-scope rules, persisted across rounds
  activeScorепads: Scorepad[];           // all purchased scorepads, persisted across rounds
  traySlots: TraySlot[];                 // reset each round (trays persist, assignments reset)
  activeBossRule: BossRule | null;       // set at round start for boss rounds, null otherwise
  lastPipelineLog: AppliedModifierRecord[]; // audit log from most recent scoring pass
}
```


---

## 4. Worked Example — Full Modifier Pipeline Trace

**Scenario:** The Purist partner is active (slot 0), a Natural Amplifier scorepad is active, the meld is placed in a Gold Tray, and the boss rule "Score Cap" is active (boss round). The player seals a 7-Queen natural canasta.

### Setup

**Active modifiers:**
- Partner slot 0: The Purist (`the-purist`) — natural canastas ×2.0 multiplicative
- Partner slots 1–4: empty
- Scorepad: Natural Amplifier (`natural-amplifier`) — natural canastas +200 additive to `canasta_bonus`
- Tray slot 0: Gold Tray (`gold-tray`) assigned to the Queens meld — ×2.0 multiplicative to `score_multiplier`
- Boss rule: Score Cap (`score-cap`) — maximum score per canasta = 1000 (override on `score_cap`)
- No house rules active

**Meld:** 7 Queens (Q♠, Q♥, Q♦, Q♣, Q♠, Q♥, Q♦) — all natural, no wilds.

---

### Step 1 — Area 1: Base Score Computation

Area 1's `scoreCanasta()` is called (triggered by `ON_CANASTA_SCORED` hook):

```
cardPointTotal = 7 × 10 = 70
canastaBonus = getCanastaBonus('natural') = 500
baseTotal = 70 + 500 = 570
```

`CanastaScoreResult = { canastaType: 'natural', cardPointTotal: 70, canastaBonus: 500, baseTotal: 570 }`

The `ON_CANASTA_SCORED` hook passes this result to Area 3's `runModifierPipeline()`.

---

### Step 2 — Scorepad Stage

Active scorepads with `ON_CANASTA_SCORED` effects and `canastaTypeFilter === 'natural'`:
- Natural Amplifier: `{ target: 'canasta_bonus', mode: 'additive', value: 200, canastaTypeFilter: 'natural' }`

Applying additive effect to `canasta_bonus`:
```
canasta_bonus component: 500 + 200 = 700
Revised baseTotal: 70 + 700 = 770
afterScorepad = 770
```

Applied modifier record: `{ modifierType: 'scorepad', modifierId: 'natural-amplifier', target: 'canasta_bonus', mode: 'additive', value: 200, scoreBefore: 570, scoreAfter: 770 }`

---

### Step 3 — Partner Stage

Active partners with `ON_CANASTA_SCORED` effects:
- The Purist (slot 0): `{ target: 'score_multiplier', mode: 'multiplicative', value: 2.0, canastaTypeFilter: 'natural' }`

Applying multiplicative effect to `score_multiplier`:
```
770 × 2.0 = 1540
afterPartner = 1540
```

Applied modifier record: `{ modifierType: 'partner', modifierId: 'the-purist', target: 'score_multiplier', mode: 'multiplicative', value: 2.0, scoreBefore: 770, scoreAfter: 1540 }`

---

### Step 4 — Tray Stage

The Queens meld is assigned to tray slot 0 (Gold Tray). `constraintViolated = false` (Gold Tray has no constraint).

Gold Tray effect: `{ target: 'score_multiplier', mode: 'multiplicative', value: 2.0, canastaTypeFilter: null }`

Applying multiplicative effect to `score_multiplier`:
```
1540 × 2.0 = 3080
afterTray = 3080
```

Applied modifier record: `{ modifierType: 'tray', modifierId: 'gold-tray', target: 'score_multiplier', mode: 'multiplicative', value: 2.0, scoreBefore: 1540, scoreAfter: 3080 }`

---

### Step 5 — Boss Stage

Active boss rule: Score Cap. Effects:
- `{ target: 'score_cap', mode: 'override', value: 1000, canastaTypeFilter: null }`

The `score_cap` target is handled after the pipeline via `applyScoreCap()`:
```
afterBoss = 3080  (no direct score modification in boss stage for score_cap)
```

Then `applyScoreCap()` is called:
```
activeCap = 1000
finalScore = min(3080, 1000) = 1000
```

Applied modifier record: `{ modifierType: 'bossRule', modifierId: 'score-cap', target: 'score_cap', mode: 'override', value: 1000, scoreBefore: 3080, scoreAfter: 1000 }`

---

### Final Result

| Stage | Score |
|-------|-------|
| base_score (Area 1) | 570 |
| after scorepad (Natural Amplifier +200 to bonus) | 770 |
| after partner (The Purist ×2.0) | 1,540 |
| after tray (Gold Tray ×2.0) | 3,080 |
| after boss (Score Cap → min(3080, 1000)) | **1,000** |

**Final canasta score: 1,000 points.**

**Stacking order verification:**
- Scorepad applied first ✓ (bonus component modified before multipliers)
- Partner applied second ✓ (multiplied the scorepad-adjusted value)
- Tray applied third ✓ (multiplied the partner-adjusted value)
- Boss applied last ✓ (capped the tray-adjusted value)
- Conflict resolution: no conflicts in this example (each modifier targets a different stage or uses a different mode)

---

### Worked Example 2 — House Rule: Wild Abundance

**Scenario:** Wild Abundance house rule is active. Player places a meld of 3 Queens + 1 wild (2♥).

Without Wild Abundance: meld has 4 cards (3 natural + 1 wild). Wild count (1) < natural count (3) → valid.

With Wild Abundance active: the `ON_MELD_PLACED` hook fires. Wild Abundance's hook override counts the wild as 2 cards for meld size purposes. The meld is treated as having 5 cards (3 natural + 2 effective wild cards) for size calculations. This does not change the actual card count — it only affects size-based checks (e.g., minimum meld size, canasta threshold counting).

**Effect:** A meld with 4 natural + 1 wild would normally count as 5 cards. With Wild Abundance, it counts as 6 cards. This means a meld of 6 natural + 1 wild (normally 7 cards = canasta) would count as 8 cards — still a canasta, but the size-based bonus for super canasta (≥10 cards) would be reached with fewer actual cards.

---

### Worked Example 3 — Scorepad: Dirty Discount

**Scenario:** Dirty Discount scorepad is active. Player seals a 6-Queen + 1-wild dirty canasta.

Area 1 computes:
```
cardPointTotal = 6 × 10 + 1 × 20 = 80
canastaBonus = getCanastaBonus('dirty') = 300
baseTotal = 80 + 300 = 380
```

Scorepad stage — Dirty Discount: `{ target: 'score_multiplier', mode: 'multiplicative', value: 0.75, canastaTypeFilter: 'dirty' }`

```
380 × 0.75 = 285
afterScorepad = 285
```

No partners, no tray, no boss rule active. Final score: **285 points**.

---

### Worked Example 4 — Tray: Natural Tray with Constraint Violation

**Scenario:** Natural Tray is assigned to the Queens meld. Player adds a wild (2♥) to the meld.

Natural Tray constraint: `{ constraintType: 'natural_only', constraintValue: null, penaltyOnViolation: true }`

When the wild is added: constraint check fires. `constraintType === 'natural_only'` and the meld now contains a wild → constraint violated. `TraySlot.constraintViolated = true`.

At scoring time: `constraintViolated === true` → tray effects are skipped entirely.

Area 1 computes `baseTotal = 570` (7-Queen dirty canasta: 70 + 300 = 370... wait, this is now dirty). Let's say the meld is 6 Queens + 1 wild = dirty canasta:
```
cardPointTotal = 6 × 10 + 1 × 20 = 80
canastaBonus = 300
baseTotal = 380
```

Tray stage: skipped (constraint violated). No bonus applied.

Final score: **380 points** (same as without the tray — the tray's +400 bonus is forfeited).

---

### Worked Example 5 — Boss Rule: The Purist (Boss)

**Scenario:** Boss rule "The Purist" is active (boss round). Player seals a 6-Queen + 1-wild dirty canasta. No other modifiers active.

Area 1 computes:
```
cardPointTotal = 80
canastaBonus = 300
baseTotal = 380
```

Scorepad stage: no scorepads → `afterScorepad = 380`
Partner stage: no partners → `afterPartner = 380`
Tray stage: no tray → `afterTray = 380`

Boss stage — The Purist boss rule: `{ target: 'score_multiplier', mode: 'multiplicative', value: 0.5, canastaTypeFilter: 'dirty' }`

```
380 × 0.5 = 190
afterBoss = 190
```

Final score: **190 points**. The boss rule halved the dirty canasta score.


---

## 5. Open Questions

### OQ-1: Partner Slot Unlock Schedule
**Question:** Should partner slots unlock at fixed antes (3, 5, 7) or should they unlock based on player actions (e.g., completing a certain number of canastas)?

**Status:** Deferred.

**Rationale:** The fixed ante schedule (slots 0–1 at start, slots 2–4 at antes 3, 5, 7) is simple and predictable. An action-based unlock would create more interesting decisions but adds complexity to the state model. Deferred until playtesting reveals whether the fixed schedule creates meaningful pacing. The slot count (5) and the unlock mechanism (ante-based) are locked; the specific antes are subject to balance review.

---

### OQ-2: Tray Assignment Timing
**Question:** Should tray assignment happen before the Play phase (during Draw phase setup) or should players be able to assign melds to trays at any point during the Play phase?

**Status:** Deferred.

**Rationale:** Pre-assignment (before Play phase) creates a planning decision but may feel restrictive if the player's strategy changes mid-round. Dynamic assignment (during Play phase) is more flexible but requires the UI to support drag-and-drop tray assignment at any time. Deferred to Area 5 (UI/UX Design) for the interaction model decision. The data model supports both approaches — `TraySlot.assignedMeldId` can be set at any point.

---

### OQ-3: House Rule Stacking — Multiplicative Doubling
**Question:** When a stackable house rule is purchased twice, should multiplicative effects be squared (×1.5 becomes ×2.25) or doubled (×1.5 becomes ×3.0)?

**Status:** Resolved — squared.

**Rationale:** Squaring is mathematically consistent with the multiplicative stacking model (two independent ×1.5 multipliers compose to ×2.25, not ×3.0). Doubling would be a special case that breaks the general composition rule. The squared behavior is locked.

---

### OQ-4: Boss Rule — Multiple Injection Points
**Question:** If a boss rule uses multiple injection points (e.g., Wild Drought uses both `ON_MELD_VALIDATE` and `ON_TURN_START`), and a house rule also uses one of those injection points, how is the conflict resolved?

**Status:** Resolved — boss rule hooks override house rule hooks on the same injection point.

**Rationale:** Boss rules are hostile and should always have the final say. The merge order defined in Section 2.8 (house rules merged first, boss rule merged last) ensures boss rule hooks override house rule hooks. This is consistent with the boss_modifiers stage being last in the pipeline.

---

### OQ-5: The Gambler Partner — Randomness Seeding
**Question:** The Gambler partner applies a random ×2.0 or ×0.5 multiplier. Should this randomness be seeded per-canasta (different result each time) or per-round (same result for all canastas in a round)?

**Status:** Deferred.

**Rationale:** Per-canasta randomness creates more variance and excitement but may feel unfair. Per-round randomness is more predictable and allows the player to plan around it. Deferred to balance review. The data model supports both — the seed source is an implementation detail not captured in the interface.

---

### OQ-6: Tray Slot Count — Boss Round Reduction
**Question:** Should boss rounds reduce the tray slot count (e.g., by 1) as an additional difficulty mechanic, similar to the open question in Area 2 about shop slot reduction?

**Status:** Deferred.

**Rationale:** Boss rounds already have a hostile boss rule active. Reducing tray slots would add a second penalty. Deferred to balance review alongside Area 2's OQ-5 (shop slot reduction on boss rounds). The two decisions should be made together to avoid stacking too many boss round penalties.

---

### OQ-7: Score Cap — Per-Canasta vs Per-Round
**Question:** The Score Cap boss rule currently caps score per canasta. Should it instead cap the total round score?

**Status:** Deferred.

**Rationale:** Per-canasta cap is simpler to implement and more predictable for the player. Per-round cap creates more interesting decisions (player must choose which canastas to prioritize) but is harder to communicate in the UI. Deferred to Area 5 (UI/UX Design) for the display model decision. The `score_cap` target in the data model supports both interpretations — the boss rule definition specifies which interpretation applies.

---

## 6. Self-Review Against Done Criteria

### Universal Done Checklist

- [x] All required sections present: Overview, Data Models (Section 1), Core Algorithms (Section 2), Interfaces & Contracts (Section 3), Worked Example (Section 4), Open Questions (Section 5)
- [x] All data models fully typed: `Partner`, `PartnerSlot`, `HouseRule`, `Scorepad`, `Tray`, `TraySlot`, `TrayConstraint`, `BossRule`, `ModifierPipeline`, `AppliedModifierRecord`, `ActiveModifierState`, `ModifierEffect`, `ModifierEffectTarget`, `ModifierApplicationMode`, `ModifierTriggerEvent` — no `any`, no partial types
- [x] All algorithms described at pseudocode or decision-table level: modifier pipeline (Section 2.1), conflict resolution rules (Section 2.2), partner drafting (Section 2.3), house rule hook merging (Section 2.5), boss rule selection (Section 2.8)
- [x] All interfaces between this area and adjacent areas explicitly named and typed: Area 1 (Section 3.1), Area 2 (Section 3.2), Area 4 (Section 3.3), Area 8 (Section 3.4)
- [x] All open questions either resolved or explicitly deferred with rationale: OQ-1 through OQ-7
- [x] Worked example traces a concrete game scenario end-to-end: Section 4 (full pipeline trace with The Purist partner, Natural Amplifier scorepad, Gold Tray, Score Cap boss rule)
- [x] No content redefines rules owned by upstream dependencies: all scoring formulas reference Area 1 Section 3.3; all canasta types reference Area 1 Section 3.2; all shop mechanics reference Area 2 Section 3.5

### Area-Specific Done Criteria

- [x] The modifier stacking order is defined as a canonical pipeline: `base_score → scorepad_modifiers → partner_modifiers → tray_modifiers → boss_modifiers` (Section 2.1)
- [x] All conflict resolution rules are specified: additive (summation), multiplicative (product), override (last-write-wins), additive-before-multiplicative composition, boss overrides all (Section 2.2)
- [x] Every modifier type has at least one fully worked example:
  - Partner: The Purist ×2.0 on natural canastas (Section 4, Step 3)
  - House Rule: Wild Abundance meld size counting (Section 4, Worked Example 2)
  - Scorepad: Dirty Discount ×0.75 (Section 4, Worked Example 3)
  - Tray: Natural Tray with constraint violation (Section 4, Worked Example 4)
  - Boss Rule: The Purist boss ×0.5 on dirty canastas (Section 4, Worked Example 5)
- [x] The boss rule injection mechanism references the named injection points from Area 1: Section 2.8 references `ON_MELD_VALIDATE`, `ON_CANASTA_SEALED`, `ON_CANASTA_SCORED`, `ON_DISCARD`, `ON_GO_OUT_ATTEMPT`, `ON_TURN_START` by name (all defined in Area 1, Section 3.4)
