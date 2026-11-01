# Area 3: Modifier Systems — Technical Specification & Implementation Plan

## 1. Overview

Area 3 implements the **modifier application pipeline** for Congero — the layer that sits between Area 1's base scoring formulas and the final score presented to the player. It is the authoritative source for five modifier types:

| Modifier Type | Description |
|---|---|
| **Partners** | Persistent passive-effect entities that occupy one of 5 partner slots. Effects fire on declared trigger events throughout the run. |
| **House Rules** | Global or round-scoped rule mutations purchased in the shop. May inject hook overrides into Area 1's `BossRuleHookSet` or apply `ModifierEffect` entries. |
| **Scorepads** | Formula-level scoring adjustments applied in the first pipeline stage, immediately after Area 1 computes `baseTotal`. |
| **Trays** | Meld-slot bonuses and constraints. A meld placed in a tray slot receives the tray's bonus if its constraint is satisfied. |
| **Boss Rules** | Hostile table rules active during boss rounds. Injected last into the pipeline and into Area 1's hook set. |

**What this spec covers:**
- All TypeScript interfaces and types for the modifier system
- The canonical modifier stacking order (`base_score → scorepad → partner → tray → boss`)
- Conflict resolution rules (additive summation, multiplicative product, override last-write-wins)
- Pure transform functions (DSFR TRANSFORM role) with no side effects
- Canonical definitions for all 7 boss rules, 12 partners, 6 scorepads, 6 trays, and 8 house rules
- Contracts with Areas 1, 2, 4, and 8
- Unit test plan and implementation order

**Out of scope:**
- Base scoring formulas and meld validity logic (Area 1)
- Shop generation and gold economy internals (Area 2)
- Card enhancement types (Area 4)
- UI display and interaction (Area 5)
- Angular service/component implementation (Area 7)
- State persistence and restoration (Area 8)

**Design document:** `.kiro/specs/congero-modifier-systems/design.md` (all sections referenced below).

---

## 2. File Structure

All files live under `src/app/core/modifiers/`. The directory is organized into types, pure transforms, canonical data, and tests.

```
src/app/core/modifiers/
├── types/
│   ├── modifier-effect.types.ts       # ModifierEffect, ModifierEffectTarget, ModifierApplicationMode, ModifierTriggerEvent
│   ├── partner.types.ts               # Partner, PartnerSlot
│   ├── house-rule.types.ts            # HouseRule
│   ├── scorepad.types.ts              # Scorepad
│   ├── tray.types.ts                  # Tray, TraySlot, TrayConstraint
│   ├── boss-rule.types.ts             # BossRule
│   ├── pipeline.types.ts              # ModifierPipeline, AppliedModifierRecord, ActiveModifierState
│   └── index.ts                       # Barrel re-export of all type files
├── transforms/
│   ├── modifier-pipeline.ts           # runModifierPipeline, applyModifierEffects, applyScoreCap, collectScoringEffects
│   ├── partner-transforms.ts         # draftPartner, unlockPartnerSlot
│   ├── house-rule-transforms.ts       # mergeHouseRuleHooks
│   ├── tray-transforms.ts             # traySlotCount, getCanastaBonus (modifier-aware wrapper)
│   ├── boss-rule-transforms.ts        # selectBossRule
│   └── index.ts                       # Barrel re-export of all transform files
├── data/
│   ├── partners.ts                    # All 12 canonical Partner definitions
│   ├── house-rules.ts                 # All 8 canonical HouseRule definitions
│   ├── scorepads.ts                   # All 6 canonical Scorepad definitions
│   ├── trays.ts                       # All 6 canonical Tray definitions
│   ├── boss-rules.ts                  # All 7 canonical BossRule definitions
│   └── index.ts                       # Barrel re-export of all data files
├── contracts/
│   ├── area1-contract.ts              # buildCanastaScoreHook, activeHookSet builder
│   ├── area2-contract.ts              # modifierShopHook, modifierGoldHook
│   ├── area4-contract.ts              # EnhancementPipelineContract
│   └── index.ts                       # Barrel re-export
├── modifiers.ts                       # Top-level barrel export for the entire modifiers module
└── index.ts                           # Public API barrel (re-exports modifiers.ts)
```

**Test files (co-located with source):**

```
src/app/core/modifiers/
├── transforms/
│   ├── modifier-pipeline.spec.ts
│   ├── partner-transforms.spec.ts
│   ├── house-rule-transforms.spec.ts
│   ├── tray-transforms.spec.ts
│   └── boss-rule-transforms.spec.ts
└── data/
    ├── partners.spec.ts
    ├── house-rules.spec.ts
    ├── scorepads.spec.ts
    ├── trays.spec.ts
    └── boss-rules.spec.ts
```

---

## 3. Interfaces & Types

All types are defined in `src/app/core/modifiers/types/`. No `any`, no partial types. All fields are required unless explicitly typed as `| null`.

### 3.1 Imports from Upstream Areas

```typescript
// types/*.ts files import from Area 1:
import type {
  CanastaType,
  CanastaScoreResult,
  BossRuleHookSet,
  TurnState,
  Meld,
  Card,
  MeldValidationContext,
} from '../game-rules/game-rules.types';
```

### 3.2 `ModifierTriggerEvent`

**File:** `types/modifier-effect.types.ts`

```typescript
export type ModifierTriggerEvent =
  | 'ON_MELD_PLACED'
  | 'ON_CANASTA_SEALED'
  | 'ON_CANASTA_SCORED'
  | 'ON_DRAW'
  | 'ON_DISCARD'
  | 'ON_TURN_START'
  | 'ON_TURN_END'
  | 'ON_ROUND_START'
  | 'ON_ROUND_END'
  | 'ON_SHOP_GENERATED'
  | 'ON_GOLD_EARNED';
```

### 3.3 `ModifierApplicationMode`

**File:** `types/modifier-effect.types.ts`

```typescript
export type ModifierApplicationMode =
  | 'additive'
  | 'multiplicative'
  | 'override';
```

### 3.4 `ModifierEffect`

**File:** `types/modifier-effect.types.ts`

```typescript
export interface ModifierEffect {
  target: ModifierEffectTarget;
  mode: ModifierApplicationMode;
  value: number;
  canastaTypeFilter: CanastaType | null;
  rankFilter: string | null;
}
```

### 3.5 `ModifierEffectTarget`

**File:** `types/modifier-effect.types.ts`

```typescript
export type ModifierEffectTarget =
  | 'canasta_bonus'
  | 'card_point_total'
  | 'score_multiplier'
  | 'score_flat_bonus'
  | 'score_cap'
  | 'going_out_bonus'
  | 'wild_count_per_meld'
  | 'meld_minimum_size'
  | 'hand_size'
  | 'shop_slot_count'
  | 'gold_income_multiplier'
  | 'gold_income_flat_bonus'
  | 'reroll_cost_reduction';
```

### 3.6 `Partner`

**File:** `types/partner.types.ts`

```typescript
export interface Partner {
  id: string;
  name: string;
  description: string;
  triggerEvents: ModifierTriggerEvent[];
  effects: ModifierEffect[];
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
}
```

### 3.7 `PartnerSlot`

**File:** `types/partner.types.ts`

```typescript
export interface PartnerSlot {
  slotIndex: number;
  partner: Partner | null;
  unlocked: boolean;
}
```

### 3.8 `HouseRule`

**File:** `types/house-rule.types.ts`

```typescript
export interface HouseRule {
  id: string;
  name: string;
  description: string;
  scope: 'global' | 'round';
  triggerEvents: ModifierTriggerEvent[];
  effects: ModifierEffect[];
  hookOverrides: Partial<BossRuleHookSet> | null;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  stackable: boolean;
}
```

### 3.9 `Scorepad`

**File:** `types/scorepad.types.ts`

```typescript
export interface Scorepad {
  id: string;
  name: string;
  description: string;
  targetCanastaTypes: CanastaType[];
  effects: ModifierEffect[];
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
}
```

### 3.10 `Tray`

**File:** `types/tray.types.ts`

```typescript
export interface Tray {
  id: string;
  name: string;
  description: string;
  trayType: 'bonus' | 'constraint' | 'hybrid';
  constraint: TrayConstraint | null;
  effects: ModifierEffect[];
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
}
```

### 3.11 `TrayConstraint`

**File:** `types/tray.types.ts`

```typescript
export interface TrayConstraint {
  constraintType: 'rank_lock' | 'natural_only' | 'min_size' | 'no_wilds';
  constraintValue: string | number | null;
  penaltyOnViolation: boolean;
}
```

### 3.12 `TraySlot`

**File:** `types/tray.types.ts`

```typescript
export interface TraySlot {
  slotIndex: number;
  tray: Tray | null;
  assignedMeldId: string | null;
  constraintViolated: boolean;
}
```

### 3.13 `BossRule`

**File:** `types/boss-rule.types.ts`

```typescript
export interface BossRule {
  id: string;
  name: string;
  description: string;
  injectionPoints: Array<keyof BossRuleHookSet>;
  hookOverrides: Partial<BossRuleHookSet>;
  effects: ModifierEffect[];
  anteRange: [number, number] | null;
  selectionWeight: number;
}
```

### 3.14 `ModifierPipeline`

**File:** `types/pipeline.types.ts`

```typescript
export interface ModifierPipeline {
  baseResult: CanastaScoreResult;
  afterScorepad: number;
  afterPartner: number;
  afterTray: number;
  afterBoss: number;
  appliedModifiers: AppliedModifierRecord[];
}
```

### 3.15 `AppliedModifierRecord`

**File:** `types/pipeline.types.ts`

```typescript
export interface AppliedModifierRecord {
  modifierType: 'scorepad' | 'partner' | 'tray' | 'bossRule' | 'houseRule';
  modifierId: string;
  target: ModifierEffectTarget;
  mode: ModifierApplicationMode;
  value: number;
  scoreBefore: number;
  scoreAfter: number;
}
```

### 3.16 `ActiveModifierState`

**File:** `types/pipeline.types.ts`

```typescript
export interface ActiveModifierState {
  partnerSlots: PartnerSlot[];
  activeHouseRules: HouseRule[];
  activeScorерads: Scorepad[];
  traySlots: TraySlot[];
  activeBossRule: BossRule | null;
}
```

---

## 4. Pure Transforms (DSFR TRANSFORM Role)

All transform functions are **pure**: they take inputs and return outputs with no side effects, no mutation of arguments, and no I/O. They live under `src/app/core/modifiers/transforms/`.

### 4.1 Function Inventory

| Function | File | Signature | Purpose |
|---|---|---|---|
| `runModifierPipeline` | `modifier-pipeline.ts` | `(baseResult, meld, state) → ModifierPipeline` | Canonical entry point. Runs all 4 pipeline stages in order and returns the full pipeline with audit log. |
| `applyModifierEffects` | `modifier-pipeline.ts` | `(currentScore, effects, modifierType, log) → number` | Applies a list of `ModifierEffect` entries to the running score using conflict resolution rules. Appends to the audit log. |
| `applyScoreCap` | `modifier-pipeline.ts` | `(score, allEffects) → number` | After the pipeline completes, clamps the final score to the lowest active `score_cap` override. |
| `collectScoringEffects` | `modifier-pipeline.ts` | `(modifiers, canastaType, meld) → ModifierEffect[]` | Filters and collects all `ON_CANASTA_SCORED` effects from a list of modifiers that match the given canasta type and meld. |
| `mergeHouseRuleHooks` | `house-rule-transforms.ts` | `(houseRules) → Partial<BossRuleHookSet>` | Merges `hookOverrides` from multiple house rules by composing them in purchase order (earliest wraps innermost). |
| `selectBossRule` | `boss-rule-transforms.ts` | `(anteNumber, bossRulePool) → string` | Weighted random selection of a boss rule ID from the pool, filtered by ante eligibility. |
| `draftPartner` | `partner-transforms.ts` | `(partner, slots, replaceSlotIndex) → PartnerSlot[]` | Places a partner into the first empty unlocked slot, or replaces the specified slot. Returns a new array (no mutation). |
| `unlockPartnerSlot` | `partner-transforms.ts` | `(slots, slotIndex) → PartnerSlot[]` | Unlocks the specified partner slot. Returns a new array. |
| `traySlotCount` | `tray-transforms.ts` | `(anteNumber) → number` | Returns the number of tray slots available at the given ante (2–5). |
| `getCanastaBonus` | `tray-transforms.ts` | `(canastaType, state) → number` | Modifier-aware wrapper around Area 1's `getCanastaBonus()`. Returns the base canasta bonus adjusted by any active scorepad/tray effects that target `canasta_bonus`. |

### 4.2 `runModifierPipeline` — Detailed Behavior

```
Input:  baseResult: CanastaScoreResult  (from Area 1's scoreCanasta())
        meld: Meld                       (the meld being scored)
        state: ActiveModifierState        (all active modifiers)

Output: ModifierPipeline with all stage scores and appliedModifiers log

Steps:
  1. Initialize pipeline with baseResult and empty appliedModifiers.
  2. STAGE 1 — Scorepad:
     a. Filter state.activeScorерads to those whose targetCanastaTypes includes
        baseResult.canastaType (or has empty targetCanastaTypes = all).
     b. Call collectScoringEffects() to get matching effects.
     c. Call applyModifierEffects() → afterScorepad.
  3. STAGE 2 — Partner:
     a. Filter state.partnerSlots to unlocked slots where partner !== null.
     b. Call collectScoringEffects() on the partner list.
     c. Call applyModifierEffects() → afterPartner.
  4. STAGE 3 — Tray:
     a. Find the tray slot where assignedMeldId === meld.id.
     b. If found AND tray exists AND !constraintViolated:
          Call collectScoringEffects() on [tray].
          Call applyModifierEffects() → afterTray.
     c. Else: afterTray = afterPartner.
  5. STAGE 4 — Boss:
     a. If state.activeBossRule is not null:
          Filter effects by canastaTypeFilter.
          Call applyModifierEffects() → afterBoss.
     b. Else: afterBoss = afterTray.
  6. Return pipeline.
```

### 4.3 `applyModifierEffects` — Detailed Behavior

```
Input:  currentScore: number
        effects: ModifierEffect[]
        modifierType: AppliedModifierRecord['modifierType']
        log: AppliedModifierRecord[] (mutated via push for audit trail)

Output: new score (number)

Steps:
  1. Group effects by target (skip 'score_cap' — handled by applyScoreCap).
  2. For each target group:
     a. Partition into additive[], multiplicative[], override[].
     b. Apply additive: sum all values, add to score. Log once.
     c. Apply multiplicative: compute product, multiply score (Math.round). Log once.
     d. Apply override: take last entry in override[], set score to its value. Log once.
  3. Return final score.
```

### 4.4 `collectScoringEffects` — Detailed Behavior

```
Input:  modifiers: Array<Partner | Scorepad | Tray | BossRule | HouseRule>
        canastaType: CanastaType
        meld: Meld

Output: ModifierEffect[] — all effects from modifiers that:
  - Include 'ON_CANASTA_SCORED' in triggerEvents (or always fire for scorepads/trays/boss rules)
  - Have canastaTypeFilter === null OR canastaTypeFilter === canastaType
```

---

## 5. Modifier Pipeline — Canonical Stacking Order

```
base_score → scorepad_modifiers → partner_modifiers → tray_modifiers → boss_modifiers
```

| Stage | Source | Applied By | Rationale |
|---|---|---|---|
| `base_score` | Area 1 `scoreCanasta()` → `CanastaScoreResult.baseTotal` | Area 1 (before pipeline) | Card points + raw canasta bonus. All modifiers compose on top. |
| `scorepad_modifiers` | `state.activeScorерads` | `runModifierPipeline` Stage 1 | Scorepads are persistent "scoring sheet" investments that shape the base value first. |
| `partner_modifiers` | `state.partnerSlots[].partner` (occupied + unlocked) | `runModifierPipeline` Stage 2 | Partners are passive advisors building on the scorepad-adjusted value. |
| `tray_modifiers` | `state.traySlots` (meld assignment match) | `runModifierPipeline` Stage 3 | Trays are meld-specific placement bonuses applied after persistent modifiers. |
| `boss_modifiers` | `state.activeBossRule` | `runModifierPipeline` Stage 4 | Boss rules are hostile overrides applied last — they must be able to cap or override everything else. |

**Key properties:**
- Each stage receives the output of the previous stage as its input.
- The `appliedModifiers` audit log accumulates across all stages.
- `score_cap` effects are deferred: they are collected during stages but only applied via `applyScoreCap()` after the pipeline completes.
- If a stage has no applicable modifiers, its output equals its input (identity).

---

## 6. Conflict Resolution Rules

When multiple modifiers target the same `ModifierEffectTarget` within the same pipeline stage:

### Rule 1 — Additive Stacking (Summation)

All additive effects on the same target within the same stage are summed, then applied once.

```
runningScore += Σ(effect.value) for all additive effects on target
```

**Example:** Scorepad A adds +100, Scorepad B adds +150 to `score_flat_bonus` → combined +250.

### Rule 2 — Multiplicative Stacking (Product)

All multiplicative effects on the same target within the same stage are multiplied together, then applied once.

```
runningScore *= Π(effect.value) for all multiplicative effects on target
```

**Example:** Partner A applies ×1.5, Partner B applies ×2.0 to `score_multiplier` → combined ×3.0.

### Rule 3 — Additive Before Multiplicative Composition

Within a single stage, additive effects are applied before multiplicative effects on the same target.

```
runningScore = (runningScore + Σ(additive)) * Π(multiplicative)
```

**Example:** Scorepad adds +200 (additive), Partner applies ×2.0 (multiplicative) to `score_flat_bonus`. Base 500 → (500 + 200) × 2.0 = 1400.

### Rule 4 — Override (Last-Write-Wins)

If multiple override effects target the same value within the same stage, the last one in the modifier list wins. Modifier list order is deterministic: modifiers are applied in the order they were acquired (purchase order, ascending).

```
runningScore = last(effect.value) for all override effects on target
```

### Rule 5 — Boss Overrides All Earlier Stages

Boss modifiers are applied in the final pipeline stage. An override effect from a boss rule replaces the value produced by all earlier stages.

### Rule 6 — Score Cap (Special Handling)

`score_cap` is not applied directly to the running score during stages. After all pipeline stages complete:

```
finalScore = min(afterBoss, lowest(score_cap override values across all active modifiers))
```

If no `score_cap` override exists, the score is uncapped.

---

## 7. Canonical Definitions

### 7.1 Boss Rules (7)

**File:** `data/boss-rules.ts`

| ID | Name | Injection Points | Effects | Ante Range | Weight |
|---|---|---|---|---|---|
| `the-purist` | The Purist | `ON_CANASTA_SCORED` | `{ target: 'score_multiplier', mode: 'multiplicative', value: 0.5, canastaTypeFilter: 'dirty' }` | null | 10 |
| `wild-drought` | Wild Drought | `ON_MELD_VALIDATE`, `ON_TURN_START` | *(hook-based, no score effects)* | null | 10 |
| `score-cap` | Score Cap | `ON_CANASTA_SCORED` | `{ target: 'score_cap', mode: 'override', value: 1000, canastaTypeFilter: null }` | null | 10 |
| `frozen-assets` | Frozen Assets | `ON_CANASTA_SCORED` | `{ target: 'score_multiplier', mode: 'multiplicative', value: 1.5, canastaTypeFilter: 'frozen' }`, `{ target: 'score_multiplier', mode: 'multiplicative', value: 0.75, canastaTypeFilter: null }` | null | 10 |
| `rank-embargo` | Rank Embargo | `ON_MELD_VALIDATE` | *(hook-based, no score effects)* | null | 10 |
| `last-stand` | Last Stand | `ON_GO_OUT_ATTEMPT` | *(hook-based, no score effects)* | null | 10 |
| `sticky-fingers` | Sticky Fingers | `ON_DISCARD` | `{ target: 'score_flat_bonus', mode: 'additive', value: -5, canastaTypeFilter: null }` (per discard) | null | 10 |

### 7.2 Partners (12)

**File:** `data/partners.ts`

| ID | Name | Trigger Events | Effects |
|---|---|---|---|
| `the-purist` | The Purist | `ON_CANASTA_SCORED` | `{ target: 'score_multiplier', mode: 'multiplicative', value: 2.0, canastaTypeFilter: 'natural' }` |
| `the-collector` | The Collector | `ON_CANASTA_SCORED` | `{ target: 'score_flat_bonus', mode: 'additive', value: 100, canastaTypeFilter: null }` (conditional: ≥4 same-rank cards) |
| `the-hoarder` | The Hoarder | `ON_CANASTA_SCORED` | `{ target: 'score_flat_bonus', mode: 'additive', value: 50, canastaTypeFilter: null }` (per card beyond 7) |
| `the-contrarian` | The Contrarian | `ON_CANASTA_SCORED` | `{ target: 'score_multiplier', mode: 'multiplicative', value: 1.5, canastaTypeFilter: 'dirty' }` |
| `the-archivist` | The Archivist | `ON_ROUND_END` | `{ target: 'score_flat_bonus', mode: 'additive', value: 200, canastaTypeFilter: null }` (conditional: ≥3 canastas) |
| `the-gambler` | The Gambler | `ON_CANASTA_SCORED` | `{ target: 'score_multiplier', mode: 'multiplicative', value: 2.0_or_0.5, canastaTypeFilter: null }` (50/50 random) |
| `the-economist` | The Economist | `ON_GOLD_EARNED` | `{ target: 'gold_income_flat_bonus', mode: 'additive', value: 1, canastaTypeFilter: null }` |
| `the-speedrunner` | The Speedrunner | `ON_CANASTA_SCORED` | `{ target: 'score_flat_bonus', mode: 'additive', value: 100, canastaTypeFilter: null }` (conditional: sealed in ≤3 turns) |
| `the-naturalist` | The Naturalist | `ON_CANASTA_SCORED` | `{ target: 'score_flat_bonus', mode: 'additive', value: 300, canastaTypeFilter: 'natural' }` |
| `the-wildling` | The Wildling | `ON_CANASTA_SCORED` | `{ target: 'score_flat_bonus', mode: 'additive', value: 30, canastaTypeFilter: null }` (per wild in meld) |
| `the-minimalist` | The Minimalist | `ON_CANASTA_SCORED` | `{ target: 'score_multiplier', mode: 'multiplicative', value: 1.25, canastaTypeFilter: null }` (conditional: exactly 7 cards) |
| `the-maximalist` | The Maximalist | `ON_CANASTA_SCORED` | `{ target: 'score_multiplier', mode: 'multiplicative', value: 1.5, canastaTypeFilter: null }` (conditional: ≥10 cards) |

### 7.3 Scorepads (6)

**File:** `data/scorepads.ts`

| ID | Name | Target Canasta Types | Effects |
|---|---|---|---|
| `natural-amplifier` | Natural Amplifier | `['natural']` | `{ target: 'canasta_bonus', mode: 'additive', value: 200, canastaTypeFilter: 'natural' }` |
| `dirty-discount` | Dirty Discount | `['dirty']` | `{ target: 'score_multiplier', mode: 'multiplicative', value: 0.75, canastaTypeFilter: 'dirty' }` |
| `super-booster` | Super Booster | `['super']` | `{ target: 'canasta_bonus', mode: 'additive', value: 500, canastaTypeFilter: 'super' }` |
| `all-rounder` | All-Rounder | `[]` (all) | `{ target: 'score_flat_bonus', mode: 'additive', value: 50, canastaTypeFilter: null }` |
| `high-value-pad` | High-Value Pad | `[]` (all) | `{ target: 'card_point_total', mode: 'multiplicative', value: 1.25, canastaTypeFilter: null }` |
| `completion-bonus` | Completion Bonus | `[]` (all) | `{ target: 'score_flat_bonus', mode: 'additive', value: 100, canastaTypeFilter: null }` (once per round, first canasta) |

### 7.4 Trays (6)

**File:** `data/trays.ts`

| ID | Name | Tray Type | Constraint | Effects |
|---|---|---|---|---|
| `gold-tray` | Gold Tray | `bonus` | null | `{ target: 'score_multiplier', mode: 'multiplicative', value: 2.0, canastaTypeFilter: null }` |
| `rank-lock-tray` | Rank Lock Tray | `hybrid` | `{ constraintType: 'rank_lock', constraintValue: null, penaltyOnViolation: true }` | `{ target: 'score_multiplier', mode: 'multiplicative', value: 1.5, canastaTypeFilter: null }` |
| `natural-tray` | Natural Tray | `hybrid` | `{ constraintType: 'natural_only', constraintValue: null, penaltyOnViolation: true }` | `{ target: 'canasta_bonus', mode: 'additive', value: 400, canastaTypeFilter: null }` |
| `mega-tray` | Mega Tray | `hybrid` | `{ constraintType: 'min_size', constraintValue: 9, penaltyOnViolation: true }` | `{ target: 'score_multiplier', mode: 'multiplicative', value: 3.0, canastaTypeFilter: null }` |
| `wild-tray` | Wild Tray | `bonus` | null | `{ target: 'score_flat_bonus', mode: 'additive', value: 30, canastaTypeFilter: null }` (per wild) |
| `purity-tray` | Purity Tray | `constraint` | `{ constraintType: 'no_wilds', constraintValue: null, penaltyOnViolation: true }` | `{ target: 'canasta_bonus', mode: 'additive', value: 600, canastaTypeFilter: null }` |

### 7.5 House Rules (8)

**File:** `data/house-rules.ts`

| ID | Name | Scope | Effects / Hook Overrides | Stackable |
|---|---|---|---|---|
| `wild-abundance` | Wild Abundance | `global` | `hookOverrides.ON_MELD_PLACED` — wilds count as 2 cards for meld size | false |
| `frozen-assets-hr` | Frozen Assets | `global` | `{ target: 'score_multiplier', mode: 'multiplicative', value: 1.5, canastaTypeFilter: 'frozen' }` | false |
| `golden-round` | Golden Round | `round` | `{ target: 'gold_income_multiplier', mode: 'multiplicative', value: 2.0, canastaTypeFilter: null }` | false |
| `open-market` | Open Market | `global` | `{ target: 'shop_slot_count', mode: 'additive', value: 1, canastaTypeFilter: null }` | false |
| `quick-draw` | Quick Draw | `global` | `{ target: 'hand_size', mode: 'additive', value: 2, canastaTypeFilter: null }` | false |
| `canasta-rush` | Canasta Rush | `round` | `{ target: 'score_multiplier', mode: 'multiplicative', value: 2.0, canastaTypeFilter: null }` (first canasta only) | false |
| `discount-day` | Discount Day | `round` | `{ target: 'reroll_cost_reduction', mode: 'additive', value: 1, canastaTypeFilter: null }` | false |
| `reroll-rebate` | Reroll Rebate | `global` | `{ target: 'reroll_cost_reduction', mode: 'additive', value: 1, canastaTypeFilter: null }` | true |

---

## 8. Unit Test Plan

### 8.1 Pipeline Tests

**File:** `transforms/modifier-pipeline.spec.ts`

| Test | Description |
|---|---|
| `runModifierPipeline — base only` | No modifiers active → all stages equal `baseResult.baseTotal` |
| `runModifierPipeline — scorepad stage` | Single scorepad adds to `canasta_bonus` → `afterScorepad` reflects the bonus |
| `runModifierPipeline — partner stage` | Single partner applies ×2.0 → `afterPartner` = `afterScorepad` × 2 |
| `runModifierPipeline — tray stage` | Meld in Gold Tray → `afterTray` = `afterPartner` × 2 |
| `runModifierPipeline — boss stage` | Score Cap boss rule → `afterBoss` capped at 1000 |
| `runModifierPipeline — full pipeline` | All 4 stages active → verifies stacking order (design doc Section 4 worked example: 570→770→1540→3080→1000) |
| `runModifierPipeline — tray constraint violated` | Tray constraint violated → tray effects skipped, `afterTray` = `afterPartner` |
| `runModifierPipeline — no boss rule` | `activeBossRule` is null → `afterBoss` = `afterTray` |
| `runModifierPipeline — empty partner slots` | All partner slots empty → `afterPartner` = `afterScorepad` |
| `runModifierPipeline — audit log` | Full pipeline → `appliedModifiers` contains one entry per stage with correct `scoreBefore`/`scoreAfter` |
| `applyModifierEffects — additive stacking` | Two additive effects on same target → summed |
| `applyModifierEffects — multiplicative stacking` | Two multiplicative effects on same target → product |
| `applyModifierEffects — additive then multiplicative` | Additive + multiplicative on same target → additive applied first |
| `applyModifierEffects — override last-write-wins` | Two override effects → last one wins |
| `applyModifierEffects — score_cap skipped` | `score_cap` target → skipped in `applyModifierEffects`, handled by `applyScoreCap` |
| `applyScoreCap — no cap` | No `score_cap` effects → score unchanged |
| `applyScoreCap — single cap` | One `score_cap` override → score clamped to cap |
| `applyScoreCap — multiple caps` | Two `score_cap` overrides → lowest cap wins |
| `collectScoringEffects — canasta type filter` | Mix of natural/dirty/all effects → only matching canasta type returned |
| `collectScoringEffects — no matching effects` | No effects match canasta type → empty array |

### 8.2 Partner Transform Tests

**File:** `transforms/partner-transforms.spec.ts`

| Test | Description |
|---|---|
| `draftPartner — empty slot available` | Places partner in lowest-indexed empty unlocked slot |
| `draftPartner — all slots occupied, replace specified` | Replaces partner at given slot index |
| `draftPartner — all slots occupied, no replace index` | Throws error |
| `draftPartner — locked slot not used` | Locked slots are ignored even if empty |
| `draftPartner — immutability` | Original slots array is not mutated |
| `unlockPartnerSlot — unlocks specified slot` | Sets `unlocked: true` for target slot |
| `unlockPartnerSlot — immutability` | Original slots array is not mutated |

### 8.3 House Rule Transform Tests

**File:** `transforms/house-rule-transforms.spec.ts`

| Test | Description |
|---|---|
| `mergeHouseRuleHooks — single rule` | One house rule with hooks → returns its hooks |
| `mergeHouseRuleHooks — multiple rules, same hook` | Two rules with `ON_MELD_VALIDATE` → hooks composed (innermost first) |
| `mergeHouseRuleHooks — multiple rules, different hooks` | Two rules with different hooks → both present in result |
| `mergeHouseRuleHooks — no hooks` | Rules with `hookOverrides: null` → empty result |
| `mergeHouseRuleHooks — boss override order` | House rule hooks merged before boss rule hooks (boss wins on same injection point) |

### 8.4 Tray Transform Tests

**File:** `transforms/tray-transforms.spec.ts`

| Test | Description |
|---|---|
| `traySlotCount — ante 1–2` | Returns 2 |
| `traySlotCount — ante 3–4` | Returns 3 |
| `traySlotCount — ante 5–6` | Returns 4 |
| `traySlotCount — ante 7–8` | Returns 5 |
| `getCanastaBonus — no modifiers` | Returns base canasta bonus from Area 1 |
| `getCanastaBonus — with scorepad` | Active scorepad adds to `canasta_bonus` component |

### 8.5 Boss Rule Transform Tests

**File:** `transforms/boss-rule-transforms.spec.ts`

| Test | Description |
|---|---|
| `selectBossRule — ante filtering` | Rules outside ante range are excluded |
| `selectBossRule — weighted distribution` | Over many calls, selection frequency approximates weight distribution |
| `selectBossRule — single eligible` | Only one rule eligible → always returns that rule's ID |
| `selectBossRule — no eligible rules` | Throws error |

### 8.6 Data Integrity Tests

**Files:** `data/*.spec.ts`

| Test File | Tests |
|---|---|
| `partners.spec.ts` | All 12 partners have unique IDs; all have valid `triggerEvents` and `effects`; no duplicate IDs |
| `house-rules.spec.ts` | All 8 house rules have unique IDs; `stackable` rules identified; no duplicate IDs |
| `scorepads.spec.ts` | All 6 scorepads have unique IDs; `targetCanastaTypes` contains valid `CanastaType` values |
| `trays.spec.ts` | All 6 trays have unique IDs; `constraint.constraintType` matches `trayType`; no duplicate IDs |
| `boss-rules.spec.ts` | All 7 boss rules have unique IDs; `injectionPoints` are valid `BossRuleHookSet` keys; no duplicate IDs |

---

## 9. Dependencies

### 9.1 Area 1 — Game Rules & Core Mechanics

Area 3 imports the following types and functions from Area 1:

```typescript
import type {
  CanastaType,          // 'natural' | 'dirty' | 'frozen' | 'super'
  CanastaScoreResult,   // { canastaType, cardPointTotal, canastaBonus, baseTotal }
  BossRuleHookSet,      // Named injection point interface (Section 3.4 of Area 1)
  TurnState,            // Full turn state for hook context
  Meld,                 // Meld entity (id, cards, rank, etc.)
  Card,                 // Card entity
  MeldValidationContext,// Context passed to meld validation hooks
} from '../game-rules/game-rules.types';

import {
  scoreCanasta,         // (meld, canastaType) → CanastaScoreResult
  getCanastaBonus,      // (canastaType) → number
  validateMeld,         // (meld, context) → boolean
} from '../game-rules/game-rules';
```

**Contract:** Area 3 must not redefine `scoreCanasta()`, `validateMeld()`, or any canasta type. It calls them and composes on top of their results.

### 9.2 Area 2 — Deckbuilding & Run Structure

Area 3 imports the following from Area 2:

```typescript
import type {
  ShopState,              // Current shop state
  ShopGenerationHook,     // Interface for shop modification
  ShopGenerationContext,  // Context for shop generation
  GoldIncomeHook,         // Interface for gold income modification
  GoldIncomeContext,      // Context for gold income
  Round,                  // Round entity (includes bossRuleId)
} from '../deckbuilding/deckbuilding.types';
```

**Contract:** Area 3 exports `selectBossRule(anteNumber, bossRulePool) → string` for Area 2 to call during `buildRound()`. Area 3 also exports `modifierShopHook` and `modifierGoldHook` for Area 2's shop/gold pipelines.

### 9.3 Area 4 — Card Enhancements & Wild Card Economy

No runtime imports. Area 4 enhancement effects are applied **before** `scoreCanasta()` is called, so they are part of `base_score` and flow into the modifier pipeline as part of `CanastaScoreResult.baseTotal`.

### 9.4 Area 8 — Game State Management

Area 8 imports `ActiveModifierState`, `PartnerSlot`, `HouseRule`, `Scorepad`, `TraySlot`, `BossRule`, `ModifierPipeline`, and `AppliedModifierRecord` from Area 3 to define its run state schema.

---

## 10. Implementation Order

Implement in the following order to respect dependency chains:

| Step | Task | Files | Dependencies |
|---|---|---|---|
| 1 | Create type definitions | `types/modifier-effect.types.ts`, `types/partner.types.ts`, `types/house-rule.types.ts`, `types/scorepad.types.ts`, `types/tray.types.ts`, `types/boss-rule.types.ts`, `types/pipeline.types.ts`, `types/index.ts` | Area 1 types must exist first |
| 2 | Create barrel exports | `modifiers.ts`, `index.ts` | Step 1 |
| 3 | Implement `collectScoringEffects` | `transforms/modifier-pipeline.ts` | Step 1 |
| 4 | Implement `applyModifierEffects` and `applyScoreCap` | `transforms/modifier-pipeline.ts` | Step 1 |
| 5 | Implement `runModifierPipeline` | `transforms/modifier-pipeline.ts` | Steps 3–4 |
| 6 | Implement partner transforms | `transforms/partner-transforms.ts` | Step 1 |
| 7 | Implement house rule transforms | `transforms/house-rule-transforms.ts` | Step 1 |
| 8 | Implement tray transforms | `transforms/tray-transforms.ts` | Step 1 |
| 9 | Implement boss rule transforms | `transforms/boss-rule-transforms.ts` | Step 1 |
| 10 | Create transform barrel | `transforms/index.ts` | Steps 3–9 |
| 11 | Define canonical boss rules | `data/boss-rules.ts` | Step 1 |
| 12 | Define canonical partners | `data/partners.ts` | Step 1 |
| 13 | Define canonical scorepads | `data/scorepads.ts` | Step 1 |
| 14 | Define canonical trays | `data/trays.ts` | Step 1 |
| 15 | Define canonical house rules | `data/house-rules.ts` | Step 1 |
| 16 | Create data barrel | `data/index.ts` | Steps 11–15 |
| 17 | Implement Area 1 contracts | `contracts/area1-contract.ts` | Steps 1, 5 |
| 18 | Implement Area 2 contracts | `contracts/area2-contract.ts` | Steps 1, 9 |
| 19 | Define Area 4 contract | `contracts/area4-contract.ts` | Step 1 |
| 20 | Create contracts barrel | `contracts/index.ts` | Steps 17–19 |
| 21 | Write all unit tests | `*.spec.ts` files | Steps 1–16 |
| 22 | Run full test suite and fix issues | — | Step 21 |

---

## 11. Acceptance Criteria

### Type System

- [ ] All 13 type/interface definitions exist and match the spec exactly
- [ ] No `any` types anywhere in the modifiers module
- [ ] All fields are required unless explicitly `| null`
- [ ] Barrel exports exist at every directory level (`types/`, `transforms/`, `data/`, `contracts/`, module root)
- [ ] All types are importable from the module's public API (`modifiers.ts`)

### Pure Transforms

- [ ] `runModifierPipeline` executes all 4 stages in canonical order: scorepad → partner → tray → boss
- [ ] `runModifierPipeline` returns a complete `ModifierPipeline` with all stage scores and audit log
- [ ] `applyModifierEffects` correctly implements all 5 conflict resolution rules (Section 6)
- [ ] `applyScoreCap` clamps to the lowest `score_cap` override; passes through if none exist
- [ ] `collectScoringEffects` filters by `canastaTypeFilter` and trigger event
- [ ] `mergeHouseRuleHooks` composes hooks in purchase order (innermost first)
- [ ] `selectBossRule` filters by ante range and uses weighted random selection
- [ ] `draftPartner` places in first empty unlocked slot or replaces specified slot
- [ ] `unlockPartnerSlot` returns new array without mutating input
- [ ] `traySlotCount` returns correct count for all ante values (2–5)
- [ ] All transform functions are pure (no side effects, no mutation of inputs)

### Canonical Data

- [ ] All 7 boss rules are defined with correct IDs, injection points, effects, and weights
- [ ] All 12 partners are defined with correct IDs, trigger events, and effects
- [ ] All 6 scorepads are defined with correct IDs, target canasta types, and effects
- [ ] All 6 trays are defined with correct IDs, tray types, constraints, and effects
- [ ] All 8 house rules are defined with correct IDs, scopes, effects/hook overrides, and stackability
- [ ] All IDs are unique within each modifier type
- [ ] All `CanastaType` references use values from Area 1

### Contracts

- [ ] Area 1 contract: `buildCanastaScoreHook` wraps `runModifierPipeline` and `applyScoreCap`
- [ ] Area 2 contract: `modifierShopHook` filters non-stackable house rules and adjusts shop
- [ ] Area 2 contract: `modifierGoldHook` applies gold income modifiers
- [ ] Area 4 contract: `EnhancementPipelineContract` documents that enhancements apply before the pipeline
- [ ] Area 8 contract: All types needed for `RunStateArea3Fields` are exported

### Unit Tests

- [ ] All 20 pipeline/modifier-effects tests pass
- [ ] All 6 partner transform tests pass
- [ ] All 5 house rule transform tests pass
- [ ] All 5 tray transform tests pass
- [ ] All 4 boss rule transform tests pass
- [ ] All 5 data integrity tests pass
- [ ] The full worked example from design doc Section 4 (570→770→1540→3080→1000) passes as a test case
- [ ] Dirty Discount worked example (380→285) passes as a test case
- [ ] Tray constraint violation worked example (bonus forfeited) passes as a test case
- [ ] Boss rule The Purist worked example (380→190) passes as a test case

### Integration

- [ ] Area 3 module compiles without errors given Area 1 types
- [ ] No circular dependencies between Area 3 and Areas 1, 2, 4, or 8
- [ ] All transform functions are independently testable with mock Area 1 inputs
