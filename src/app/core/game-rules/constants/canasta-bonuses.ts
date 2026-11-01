import type { CanastaType } from '../models/meld.model';

/**
 * Canasta bonus lookup table.
 * Each canasta type has a fixed base bonus.
 * `super` replaces the natural/dirty bonus entirely (not additive).
 */
export const CANASTA_BONUS: Record<CanastaType, number> = {
  natural: 500,
  dirty: 300,
  super: 1000,
  red: 800,
  frozen: 400,
  partner: 200,
  concealedOut: 500,
};
