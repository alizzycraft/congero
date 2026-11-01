import type { Partner } from '../types/partner.types';
import type { PartnerSlot } from '../types/partner.types';

/**
 * Places a partner into the first empty unlocked slot, or replaces the specified slot.
 * Returns a new array (no mutation).
 *
 * @param partner - The partner to place.
 * @param slots - Current partner slots.
 * @param replaceSlotIndex - If specified, replace this slot. Otherwise, find first empty unlocked slot.
 * @returns New slots array with the partner placed.
 * @throws Error if all slots are occupied and no replaceSlotIndex is specified.
 */
export function draftPartner(
  partner: Partner,
  slots: PartnerSlot[],
  replaceSlotIndex?: number,
): PartnerSlot[] {
  const newSlots = slots.map(slot => ({ ...slot, partner: slot.partner ? { ...slot.partner } : null }));

  if (replaceSlotIndex !== undefined) {
    if (replaceSlotIndex < 0 || replaceSlotIndex >= newSlots.length) {
      throw new Error(`Invalid slot index: ${replaceSlotIndex}. Must be 0-${newSlots.length - 1}.`);
    }
    newSlots[replaceSlotIndex].partner = { ...partner };
    return newSlots;
  }

  // Find first empty unlocked slot
  const emptySlot = newSlots.find(slot => slot.unlocked && slot.partner === null);
  if (!emptySlot) {
    throw new Error('All partner slots are occupied. Specify a replaceSlotIndex to replace an existing partner.');
  }
  emptySlot.partner = { ...partner };
  return newSlots;
}

/**
 * Unlocks the specified partner slot.
 * Returns a new array (no mutation).
 *
 * @param slots - Current partner slots.
 * @param slotIndex - The slot to unlock.
 * @returns New slots array with the slot unlocked.
 */
export function unlockPartnerSlot(slots: PartnerSlot[], slotIndex: number): PartnerSlot[] {
  if (slotIndex < 0 || slotIndex >= slots.length) {
    throw new Error(`Invalid slot index: ${slotIndex}. Must be 0-${slots.length - 1}.`);
  }
  return slots.map((slot, i) =>
    i === slotIndex ? { ...slot, unlocked: true } : { ...slot, partner: slot.partner ? { ...slot.partner } : null },
  );
}
