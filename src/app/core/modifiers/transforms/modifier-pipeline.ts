import type { CanastaType } from "@core/game-rules/models/meld.model";
import type { Meld } from "@core/game-rules/models/meld.model";
import type { CanastaScoreResult } from "@core/game-rules/models/scoring.model";
import type { ModifierEffect } from "../types/modifier-effect.types";
import type {
  ModifierPipeline,
  AppliedModifierRecord,
  ActiveModifierState,
} from "../types/pipeline.types";
import type { Partner } from "../types/partner.types";
import type { Scorepad } from "../types/scorepad.types";
import type { Tray } from "../types/tray.types";
import type { BossRule } from "../types/boss-rule.types";
import type { HouseRule } from "../types/house-rule.types";

type ModifierWithEffects = Partner | Scorepad | Tray | BossRule | HouseRule;

function getTriggerEvents(modifier: ModifierWithEffects): string[] {
  if ("triggerEvents" in modifier) {
    const m = modifier as unknown as { triggerEvents?: string[] };
    return m.triggerEvents ?? [];
  }
  return [];
}

function alwaysFires(modifier: ModifierWithEffects): boolean {
  return (
    "targetCanastaTypes" in modifier ||
    "trayType" in modifier ||
    "injectionPoints" in modifier
  );
}

/**
 * Collects scoring effects from modifiers that match the given canasta type.
 * Filters by canastaTypeFilter and trigger events.
 * Excludes score_cap effects (handled separately by applyScoreCap).
 */
export function collectScoringEffects(
  modifiers: ModifierWithEffects[],
  canastaType: CanastaType,
  _meld: Meld,
): ModifierEffect[] {
  const effects: ModifierEffect[] = [];

  for (const modifier of modifiers) {
    const triggerEvents = getTriggerEvents(modifier);
    const hasScoredTrigger = triggerEvents.includes("ON_CANASTA_SCORED");

    if (!hasScoredTrigger && !alwaysFires(modifier)) continue;

    for (const effect of modifier.effects) {
      if (effect.target === "score_cap") continue;
      if (
        effect.canastaTypeFilter !== null &&
        effect.canastaTypeFilter !== canastaType
      )
        continue;
      effects.push(effect);
    }
  }

  return effects;
}

/**
 * Collects all score_cap effects from modifiers.
 */
function collectScoreCapEffects(
  modifiers: ModifierWithEffects[],
): ModifierEffect[] {
  const caps: ModifierEffect[] = [];
  for (const modifier of modifiers) {
    for (const effect of modifier.effects) {
      if (effect.target === "score_cap") {
        caps.push(effect);
      }
    }
  }
  return caps;
}

/**
 * Applies a list of modifier effects to the running score using conflict resolution rules.
 */
export function applyModifierEffects(
  currentScore: number,
  effects: ModifierEffect[],
  modifierType: AppliedModifierRecord["modifierType"],
  log: AppliedModifierRecord[],
): number {
  const groups = new Map<string, ModifierEffect[]>();

  for (const effect of effects) {
    if (effect.target === "score_cap") continue;
    const existing = groups.get(effect.target) ?? [];
    existing.push(effect);
    groups.set(effect.target, existing);
  }

  let score = currentScore;

  for (const [target, targetEffects] of groups) {
    const additive = targetEffects.filter((e) => e.mode === "additive");
    const multiplicative = targetEffects.filter(
      (e) => e.mode === "multiplicative",
    );
    const override = targetEffects.filter((e) => e.mode === "override");

    if (additive.length > 0) {
      const sum = additive.reduce((s, e) => s + e.value, 0);
      const before = score;
      score += sum;
      log.push({
        modifierType,
        modifierId: additive.map((e) => `${e.target}:${e.value}`).join("+"),
        target: target as AppliedModifierRecord["target"],
        mode: "additive",
        value: sum,
        scoreBefore: before,
        scoreAfter: score,
      });
    }

    if (multiplicative.length > 0) {
      const product = multiplicative.reduce((p, e) => p * e.value, 1);
      const before = score;
      score = Math.round(score * product);
      log.push({
        modifierType,
        modifierId: multiplicative
          .map((e) => `${e.target}:${e.value}`)
          .join("*"),
        target: target as AppliedModifierRecord["target"],
        mode: "multiplicative",
        value: product,
        scoreBefore: before,
        scoreAfter: score,
      });
    }

    if (override.length > 0) {
      const lastOverride = override[override.length - 1];
      const before = score;
      score = lastOverride.value;
      log.push({
        modifierType,
        modifierId: `${lastOverride.target}:${lastOverride.value}`,
        target: target as AppliedModifierRecord["target"],
        mode: "override",
        value: lastOverride.value,
        scoreBefore: before,
        scoreAfter: score,
      });
    }
  }

  return score;
}

/**
 * Clamps the final score to the lowest active score_cap override.
 */
export function applyScoreCap(
  score: number,
  scoreCapEffects: ModifierEffect[],
): number {
  const caps = scoreCapEffects
    .filter((e) => e.mode === "override")
    .map((e) => e.value);

  if (caps.length === 0) return score;
  return Math.min(score, ...caps);
}

/**
 * Runs the full modifier pipeline: scorepad → partner → tray → boss.
 */
export function runModifierPipeline(
  baseResult: CanastaScoreResult,
  meld: Meld,
  state: ActiveModifierState,
): ModifierPipeline {
  const appliedModifiers: AppliedModifierRecord[] = [];

  // Collect score_cap effects from ALL active modifiers
  const allModifiers: ModifierWithEffects[] = [
    ...state.activeScorepads,
    ...state.partnerSlots
      .filter((s) => s.unlocked && s.partner !== null)
      .map((s) => s.partner as Partner),
    ...state.traySlots
      .filter((s) => s.tray !== null)
      .map((s) => s.tray as Tray),
    ...(state.activeBossRule ? [state.activeBossRule] : []),
  ];
  const scoreCapEffects = collectScoreCapEffects(allModifiers);

  // Stage 1 — Scorepad
  const matchingScorepads = state.activeScorepads.filter(
    (sp) =>
      sp.targetCanastaTypes.length === 0 ||
      sp.targetCanastaTypes.includes(baseResult.canastaType),
  );
  const scorepadEffects = collectScoringEffects(
    matchingScorepads,
    baseResult.canastaType,
    meld,
  );
  const afterScorepad = applyModifierEffects(
    baseResult.baseTotal,
    scorepadEffects,
    "scorepad",
    appliedModifiers,
  );

  // Stage 2 — Partner
  const activePartners = state.partnerSlots
    .filter((slot) => slot.unlocked && slot.partner !== null)
    .map((slot) => slot.partner as Partner);
  const partnerEffects = collectScoringEffects(
    activePartners,
    baseResult.canastaType,
    meld,
  );
  const afterPartner = applyModifierEffects(
    afterScorepad,
    partnerEffects,
    "partner",
    appliedModifiers,
  );

  // Stage 3 — Tray
  const traySlot = state.traySlots.find(
    (slot) => slot.assignedMeldId === meld.id,
  );
  let afterTray = afterPartner;
  if (traySlot && traySlot.tray !== null && !traySlot.constraintViolated) {
    const trayEffects = collectScoringEffects(
      [traySlot.tray],
      baseResult.canastaType,
      meld,
    );
    afterTray = applyModifierEffects(
      afterPartner,
      trayEffects,
      "tray",
      appliedModifiers,
    );
  }

  // Stage 4 — Boss
  let afterBoss = afterTray;
  if (state.activeBossRule !== null) {
    const bossEffects = collectScoringEffects(
      [state.activeBossRule],
      baseResult.canastaType,
      meld,
    );
    afterBoss = applyModifierEffects(
      afterTray,
      bossEffects,
      "bossRule",
      appliedModifiers,
    );
  }

  // Apply score cap
  const finalScore = applyScoreCap(afterBoss, scoreCapEffects);

  if (finalScore !== afterBoss) {
    appliedModifiers.push({
      modifierType: "bossRule",
      modifierId: "score-cap",
      target: "score_cap",
      mode: "override",
      value: finalScore,
      scoreBefore: afterBoss,
      scoreAfter: finalScore,
    });
  }

  return {
    baseResult,
    afterScorepad,
    afterPartner,
    afterTray,
    afterBoss: finalScore,
    appliedModifiers,
  };
}
