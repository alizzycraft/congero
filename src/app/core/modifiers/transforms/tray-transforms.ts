import type { CanastaType } from "@core/game-rules/models/meld.model";
import type { ActiveModifierState } from "../types/pipeline.types";

/** Base canasta bonus lookup (from Area 1 constants) */
const CANASTA_BONUS: Record<CanastaType, number> = {
  natural: 500,
  dirty: 300,
  super: 1000,
  red: 800,
  frozen: 400,
  partner: 200,
  concealedOut: 500,
};

function getCanastaBonus(canastaType: CanastaType): number {
  return CANASTA_BONUS[canastaType];
}

/**
 * Returns the number of tray slots available at a given ante.
 * Ante 1-2: 2, Ante 3-4: 3, Ante 5-6: 4, Ante 7-8: 5.
 */
export function traySlotCount(anteNumber: number): number {
  if (anteNumber <= 2) return 2;
  if (anteNumber <= 4) return 3;
  if (anteNumber <= 6) return 4;
  return 5;
}

/**
 * Returns the canasta bonus adjusted by active scorepad/tray effects that target canasta_bonus.
 * This is a modifier-aware wrapper around Area 1's getCanastaBonus().
 */
export function getCanastaBonusModifierAware(
  canastaType: CanastaType,
  state: ActiveModifierState,
): number {
  let bonus = getCanastaBonus(canastaType);

  for (const scorepad of state.activeScorepads) {
    if (
      scorepad.targetCanastaTypes.length > 0 &&
      !scorepad.targetCanastaTypes.includes(canastaType)
    ) {
      continue;
    }
    for (const effect of scorepad.effects) {
      if (
        effect.target === "canasta_bonus" &&
        effect.canastaTypeFilter === canastaType
      ) {
        if (effect.mode === "additive") {
          bonus += effect.value;
        } else if (effect.mode === "multiplicative") {
          bonus = Math.round(bonus * effect.value);
        } else if (effect.mode === "override") {
          bonus = effect.value;
        }
      }
    }
  }

  return bonus;
}
