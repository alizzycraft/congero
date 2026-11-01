import { describe, expect, it } from 'vitest';
import { ALL_BOSS_RULES } from '@core/modifiers';
import { ModifierStateService } from './modifier-state.service';
import { RunStateService } from './run-state.service';

describe('RunStateService', () => {
  it('starts a run with an active run and starting deck', () => {
    const service = new RunStateService();

    service.startRun();

    expect(service.runState().runOver).toBe(false);
    expect(service.deckState().cards.length).toBe(52);
  });

  it('updates deck through the owned entry point', () => {
    const service = new RunStateService();
    const firstCard = service.deckState().cards[0];

    service.modifyDeck((deck) => ({ cards: deck.cards.filter((card) => card.id !== firstCard.id) }));

    expect(service.deckState().cards).not.toContain(firstCard);
  });

  it('advances normal rounds and recalculates the next score target', () => {
    const service = new RunStateService();

    service.advanceRound();

    expect(service.runState().currentAnte).toBe(1);
    expect(service.runState().currentRound).toBe(2);
    expect(service.runState().absoluteRound).toBe(2);
    expect(service.runState().roundPhase).toBe('Draw');
    expect(service.runState().scoreTarget).toBe(150);
    expect(service.runState().isBossRound).toBe(false);
    expect(service.runState().bossRuleId).toBeNull();
  });

  it('selects and activates a boss rule when advancing into round 3', () => {
    const modifierState = new ModifierStateService();
    const service = new RunStateService(modifierState);

    service.advanceRound();
    service.advanceRound();

    const bossRuleId = service.runState().bossRuleId;
    expect(service.runState().currentRound).toBe(3);
    expect(service.runState().isBossRound).toBe(true);
    expect(bossRuleId).not.toBeNull();
    expect(ALL_BOSS_RULES.some((rule) => rule.id === bossRuleId)).toBe(true);
    expect(modifierState.activeBossRule()?.id).toBe(bossRuleId);
  });

  it('clears the active boss rule after a boss round advances to the next ante', () => {
    const modifierState = new ModifierStateService();
    const service = new RunStateService(modifierState);

    service.modifyRun((state) => ({
      ...state,
      currentAnte: 1,
      currentRound: 3,
      absoluteRound: 3,
      isBossRound: true,
      bossRuleId: ALL_BOSS_RULES[0].id,
    }));
    service.advanceRound();

    expect(service.runState().currentAnte).toBe(2);
    expect(service.runState().currentRound).toBe(1);
    expect(service.runState().isBossRound).toBe(false);
    expect(service.runState().bossRuleId).toBeNull();
    expect(modifierState.activeBossRule()).toBeNull();
  });

  it('ends as won instead of advancing past the final round', () => {
    const service = new RunStateService();
    service.modifyRun((state) => ({
      ...state,
      currentAnte: 8,
      currentRound: 3,
      absoluteRound: 24,
      roundPhase: 'Shop',
      currentShop: {
        items: [],
        rerollCount: 0,
        nextRerollCost: 1,
      },
    }));

    service.advanceRound();

    expect(service.runState().currentAnte).toBe(8);
    expect(service.runState().currentRound).toBe(3);
    expect(service.runState().absoluteRound).toBe(24);
    expect(service.runState().runOver).toBe(true);
    expect(service.runState().runWon).toBe(true);
    expect(service.runState().currentShop).toBeNull();
  });
});
