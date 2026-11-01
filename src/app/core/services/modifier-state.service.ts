import { Injectable, computed, signal } from '@angular/core';
import type { ActiveModifierState as PipelineModifierState } from '@core/modifiers';
import type { ActiveModifierState as AppModifierState } from '../models';

const EMPTY_MODIFIER_STATE: AppModifierState = {
  bossRule: null,
  houseRules: [],
  partners: [],
  scorepads: [],
  trays: [],
};

@Injectable({ providedIn: 'root' })
export class ModifierStateService {
  private readonly modifierStateSource = signal<AppModifierState>(EMPTY_MODIFIER_STATE);

  readonly modifierState = computed(() => this.modifierStateSource());
  readonly activeBossRule = computed(() => this.modifierState().bossRule);
  readonly partnerSlots = computed(() => this.modifierState().partners);
  readonly traySlots = computed(() => this.modifierState().trays);
  readonly pipelineState = computed<PipelineModifierState>(() => {
    const state = this.modifierState();
    return {
      partnerSlots: state.partners.map((partner, slotIndex) => ({
        slotIndex,
        partner,
        unlocked: true,
      })),
      activeHouseRules: [...state.houseRules],
      activeScorepads: [...state.scorepads],
      traySlots: state.trays.map((tray, slotIndex) => ({
        slotIndex,
        tray,
        assignedMeldId: null,
        constraintViolated: false,
      })),
      activeBossRule: state.bossRule,
    };
  });

  /** ORCHESTRATION: replaces active modifiers from run progression. */
  loadModifiers(state: AppModifierState): void {
    this.modifierStateSource.set(state);
  }

  /** ORCHESTRATION: activates a purchased partner. */
  addPartner(partner: AppModifierState['partners'][number]): void {
    this.modifierStateSource.update((state) => {
      if (state.partners.some((active) => active.id === partner.id)) return state;
      return { ...state, partners: [...state.partners, partner] };
    });
  }

  /** ORCHESTRATION: activates a purchased house rule. */
  addHouseRule(houseRule: AppModifierState['houseRules'][number]): void {
    this.modifierStateSource.update((state) => {
      if (!houseRule.stackable && state.houseRules.some((active) => active.id === houseRule.id)) return state;
      return { ...state, houseRules: [...state.houseRules, houseRule] };
    });
  }

  /** ORCHESTRATION: activates a purchased scorepad. */
  addScorepad(scorepad: AppModifierState['scorepads'][number]): void {
    this.modifierStateSource.update((state) => {
      if (state.scorepads.some((active) => active.id === scorepad.id)) return state;
      return { ...state, scorepads: [...state.scorepads, scorepad] };
    });
  }

  /** ORCHESTRATION: activates a purchased tray. */
  addTray(tray: AppModifierState['trays'][number]): void {
    this.modifierStateSource.update((state) => {
      if (state.trays.some((active) => active.id === tray.id)) return state;
      return { ...state, trays: [...state.trays, tray] };
    });
  }

  /** ORCHESTRATION: syncs the active boss rule selected by run progression. */
  setBossRule(bossRule: AppModifierState['bossRule']): void {
    this.modifierStateSource.update((state) => ({ ...state, bossRule }));
  }
}
