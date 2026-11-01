import { describe, it, expect } from "vitest";
import {
  collectScoringEffects,
  applyModifierEffects,
  applyScoreCap,
  runModifierPipeline,
} from "./modifier-pipeline";
import type { CanastaScoreResult } from "@core/game-rules/models/scoring.model";
import type { Meld } from "@core/game-rules/models/meld.model";
import type { ModifierEffect } from "../types/modifier-effect.types";
import type { ActiveModifierState } from "../types/pipeline.types";
import type { Scorepad } from "../types/scorepad.types";
import type { Partner } from "../types/partner.types";
import type { BossRule } from "../types/boss-rule.types";
import type { AppliedModifierRecord } from "../types/pipeline.types";

function makeMeld(id: string, cardCount: number): Meld {
  return {
    id,
    rank: "K",
    cards: Array.from({ length: cardCount }, (_, i) => ({
      id: `${id}-card-${i}`,
      rank: "K" as const,
      suit: "hearts" as const,
      pointValue: 10,
      isWild: false,
      isRedThree: false,
      isBlackThree: false,
      enhancementId: null,
    })),
    canastaType: null,
    isSealed: true,
    cardPointTotal: cardCount * 10,
    completedFromDiscard: false,
    completedConcealed: false,
    traySlotId: null,
  };
}

function makeBaseResult(
  baseTotal: number,
  canastaType: CanastaScoreResult["canastaType"] = "natural",
): CanastaScoreResult {
  return {
    canastaType,
    cardPointTotal: baseTotal,
    canastaBonus: 500,
    baseTotal,
  };
}

function makeEmptyState(): ActiveModifierState {
  return {
    partnerSlots: [],
    activeHouseRules: [],
    activeScorepads: [],
    traySlots: [],
    activeBossRule: null,
  };
}

describe("collectScoringEffects", () => {
  it("filters by canasta type", () => {
    const scorepad: Scorepad = {
      id: "test",
      name: "Test",
      description: "Test",
      targetCanastaTypes: ["natural"],
      effects: [
        {
          target: "canasta_bonus",
          mode: "additive",
          value: 200,
          canastaTypeFilter: "natural",
          rankFilter: null,
        },
        {
          target: "score_multiplier",
          mode: "multiplicative",
          value: 0.75,
          canastaTypeFilter: "dirty",
          rankFilter: null,
        },
      ],
      rarity: "common",
    };

    const naturalEffects = collectScoringEffects(
      [scorepad],
      "natural",
      makeMeld("m1", 7),
    );
    expect(naturalEffects.length).toBe(1);
    expect(naturalEffects[0].target).toBe("canasta_bonus");

    const dirtyEffects = collectScoringEffects(
      [scorepad],
      "dirty",
      makeMeld("m1", 7),
    );
    expect(dirtyEffects.length).toBe(1);
    expect(dirtyEffects[0].target).toBe("score_multiplier");
  });

  it("returns empty array when no effects match", () => {
    const partner: Partner = {
      id: "archivist",
      name: "The Archivist",
      description: "Test",
      triggerEvents: ["ON_ROUND_END"],
      effects: [
        {
          target: "score_flat_bonus",
          mode: "additive",
          value: 200,
          canastaTypeFilter: null,
          rankFilter: null,
        },
      ],
      rarity: "rare",
    };

    const effects = collectScoringEffects(
      [partner],
      "natural",
      makeMeld("m1", 7),
    );
    expect(effects.length).toBe(0);
  });

  it("skips score_cap effects", () => {
    const bossRule: BossRule = {
      id: "score-cap",
      name: "Score Cap",
      description: "Test",
      injectionPoints: ["ON_CANASTA_SCORED"],
      hookOverrides: {},
      effects: [
        {
          target: "score_cap",
          mode: "override",
          value: 1000,
          canastaTypeFilter: null,
          rankFilter: null,
        },
      ],
      anteRange: null,
      selectionWeight: 10,
    };

    const effects = collectScoringEffects(
      [bossRule],
      "natural",
      makeMeld("m1", 7),
    );
    expect(effects.length).toBe(0);
  });
});

describe("applyModifierEffects", () => {
  it("additive stacking: two additive effects on same target are summed", () => {
    const log: AppliedModifierRecord[] = [];
    const effects: ModifierEffect[] = [
      {
        target: "score_flat_bonus",
        mode: "additive",
        value: 100,
        canastaTypeFilter: null,
        rankFilter: null,
      },
      {
        target: "score_flat_bonus",
        mode: "additive",
        value: 150,
        canastaTypeFilter: null,
        rankFilter: null,
      },
    ];
    const result = applyModifierEffects(500, effects, "scorepad", log);
    expect(result).toBe(750);
  });

  it("multiplicative stacking: two multiplicative effects are multiplied together", () => {
    const log: AppliedModifierRecord[] = [];
    const effects: ModifierEffect[] = [
      {
        target: "score_multiplier",
        mode: "multiplicative",
        value: 1.5,
        canastaTypeFilter: null,
        rankFilter: null,
      },
      {
        target: "score_multiplier",
        mode: "multiplicative",
        value: 2.0,
        canastaTypeFilter: null,
        rankFilter: null,
      },
    ];
    const result = applyModifierEffects(500, effects, "partner", log);
    expect(result).toBe(Math.round(500 * 3.0));
  });

  it("additive before multiplicative: additive applied first", () => {
    const log: AppliedModifierRecord[] = [];
    const effects: ModifierEffect[] = [
      {
        target: "score_flat_bonus",
        mode: "additive",
        value: 200,
        canastaTypeFilter: null,
        rankFilter: null,
      },
      {
        target: "score_multiplier",
        mode: "multiplicative",
        value: 2.0,
        canastaTypeFilter: null,
        rankFilter: null,
      },
    ];
    const result = applyModifierEffects(500, effects, "scorepad", log);
    expect(result).toBe(Math.round((500 + 200) * 2.0));
  });

  it("override last-write-wins", () => {
    const log: AppliedModifierRecord[] = [];
    const effects: ModifierEffect[] = [
      {
        target: "score_flat_bonus",
        mode: "override",
        value: 300,
        canastaTypeFilter: null,
        rankFilter: null,
      },
      {
        target: "score_flat_bonus",
        mode: "override",
        value: 800,
        canastaTypeFilter: null,
        rankFilter: null,
      },
    ];
    const result = applyModifierEffects(500, effects, "bossRule", log);
    expect(result).toBe(800);
  });

  it("score_cap effects are skipped", () => {
    const log: AppliedModifierRecord[] = [];
    const effects: ModifierEffect[] = [
      {
        target: "score_cap",
        mode: "override",
        value: 1000,
        canastaTypeFilter: null,
        rankFilter: null,
      },
    ];
    const result = applyModifierEffects(500, effects, "bossRule", log);
    expect(result).toBe(500);
  });
});

describe("applyScoreCap", () => {
  it("no cap: score unchanged", () => {
    expect(applyScoreCap(500, [])).toBe(500);
  });

  it("single cap: score clamped to cap", () => {
    const effects: ModifierEffect[] = [
      {
        target: "score_cap",
        mode: "override",
        value: 1000,
        canastaTypeFilter: null,
        rankFilter: null,
      },
    ];
    expect(applyScoreCap(1500, effects)).toBe(1000);
    expect(applyScoreCap(500, effects)).toBe(500);
  });

  it("multiple caps: lowest cap wins", () => {
    const effects: ModifierEffect[] = [
      {
        target: "score_cap",
        mode: "override",
        value: 1000,
        canastaTypeFilter: null,
        rankFilter: null,
      },
      {
        target: "score_cap",
        mode: "override",
        value: 800,
        canastaTypeFilter: null,
        rankFilter: null,
      },
    ];
    expect(applyScoreCap(1500, effects)).toBe(800);
  });
});

describe("runModifierPipeline", () => {
  it("base only: no modifiers active", () => {
    const result = runModifierPipeline(
      makeBaseResult(570),
      makeMeld("m1", 7),
      makeEmptyState(),
    );
    expect(result.afterScorepad).toBe(570);
    expect(result.afterPartner).toBe(570);
    expect(result.afterTray).toBe(570);
    expect(result.afterBoss).toBe(570);
  });

  it("scorepad stage: Natural Amplifier adds to canasta_bonus", () => {
    const state: ActiveModifierState = {
      ...makeEmptyState(),
      activeScorepads: [
        {
          id: "natural-amplifier",
          name: "Natural Amplifier",
          description: "Test",
          targetCanastaTypes: ["natural"],
          effects: [
            {
              target: "canasta_bonus",
              mode: "additive",
              value: 200,
              canastaTypeFilter: "natural",
              rankFilter: null,
            },
          ],
          rarity: "uncommon",
        },
      ],
    };
    const result = runModifierPipeline(
      makeBaseResult(570),
      makeMeld("m1", 7),
      state,
    );
    expect(result.afterScorepad).toBe(770);
  });

  it("partner stage: The Purist doubles natural canasta score", () => {
    const state: ActiveModifierState = {
      ...makeEmptyState(),
      partnerSlots: [
        {
          slotIndex: 0,
          partner: {
            id: "the-purist",
            name: "The Purist",
            description: "Test",
            triggerEvents: ["ON_CANASTA_SCORED"],
            effects: [
              {
                target: "score_multiplier",
                mode: "multiplicative",
                value: 2.0,
                canastaTypeFilter: "natural",
                rankFilter: null,
              },
            ],
            rarity: "rare",
          },
          unlocked: true,
        },
      ],
    };
    const result = runModifierPipeline(
      makeBaseResult(770),
      makeMeld("m1", 7),
      state,
    );
    expect(result.afterPartner).toBe(1540);
  });

  it("tray stage: Gold Tray doubles score", () => {
    const meld = makeMeld("m1", 7);
    const state: ActiveModifierState = {
      ...makeEmptyState(),
      traySlots: [
        {
          slotIndex: 0,
          tray: {
            id: "gold-tray",
            name: "Gold Tray",
            description: "Test",
            trayType: "bonus",
            constraint: null,
            effects: [
              {
                target: "score_multiplier",
                mode: "multiplicative",
                value: 2.0,
                canastaTypeFilter: null,
                rankFilter: null,
              },
            ],
            rarity: "rare",
          },
          assignedMeldId: "m1",
          constraintViolated: false,
        },
      ],
    };
    const result = runModifierPipeline(makeBaseResult(1540), meld, state);
    expect(result.afterTray).toBe(3080);
  });

  it("boss stage: Score Cap clamps to 1000", () => {
    const state: ActiveModifierState = {
      ...makeEmptyState(),
      activeBossRule: {
        id: "score-cap",
        name: "Score Cap",
        description: "Test",
        injectionPoints: ["ON_CANASTA_SCORED"],
        hookOverrides: {},
        effects: [
          {
            target: "score_cap",
            mode: "override",
            value: 1000,
            canastaTypeFilter: null,
            rankFilter: null,
          },
        ],
        anteRange: null,
        selectionWeight: 10,
      },
    };
    const result = runModifierPipeline(
      makeBaseResult(3080),
      makeMeld("m1", 7),
      state,
    );
    expect(result.afterBoss).toBe(1000);
  });

  it("full pipeline worked example: 570 to 770 to 1540 to 3080 to 1000", () => {
    const meld = makeMeld("m1", 7);
    const state: ActiveModifierState = {
      partnerSlots: [
        {
          slotIndex: 0,
          partner: {
            id: "the-purist",
            name: "The Purist",
            description: "Test",
            triggerEvents: ["ON_CANASTA_SCORED"],
            effects: [
              {
                target: "score_multiplier",
                mode: "multiplicative",
                value: 2.0,
                canastaTypeFilter: "natural",
                rankFilter: null,
              },
            ],
            rarity: "rare",
          },
          unlocked: true,
        },
      ],
      activeHouseRules: [],
      activeScorepads: [
        {
          id: "natural-amplifier",
          name: "Natural Amplifier",
          description: "Test",
          targetCanastaTypes: ["natural"],
          effects: [
            {
              target: "canasta_bonus",
              mode: "additive",
              value: 200,
              canastaTypeFilter: "natural",
              rankFilter: null,
            },
          ],
          rarity: "uncommon",
        },
      ],
      traySlots: [
        {
          slotIndex: 0,
          tray: {
            id: "gold-tray",
            name: "Gold Tray",
            description: "Test",
            trayType: "bonus",
            constraint: null,
            effects: [
              {
                target: "score_multiplier",
                mode: "multiplicative",
                value: 2.0,
                canastaTypeFilter: null,
                rankFilter: null,
              },
            ],
            rarity: "rare",
          },
          assignedMeldId: "m1",
          constraintViolated: false,
        },
      ],
      activeBossRule: {
        id: "score-cap",
        name: "Score Cap",
        description: "Test",
        injectionPoints: ["ON_CANASTA_SCORED"],
        hookOverrides: {},
        effects: [
          {
            target: "score_cap",
            mode: "override",
            value: 1000,
            canastaTypeFilter: null,
            rankFilter: null,
          },
        ],
        anteRange: null,
        selectionWeight: 10,
      },
    };

    const result = runModifierPipeline(makeBaseResult(570), meld, state);
    expect(result.afterScorepad).toBe(770);
    expect(result.afterPartner).toBe(1540);
    expect(result.afterTray).toBe(3080);
    expect(result.afterBoss).toBe(1000);
  });

  it("tray constraint violated: tray effects skipped", () => {
    const meld = makeMeld("m1", 7);
    const state: ActiveModifierState = {
      ...makeEmptyState(),
      traySlots: [
        {
          slotIndex: 0,
          tray: {
            id: "gold-tray",
            name: "Gold Tray",
            description: "Test",
            trayType: "bonus",
            constraint: null,
            effects: [
              {
                target: "score_multiplier",
                mode: "multiplicative",
                value: 2.0,
                canastaTypeFilter: null,
                rankFilter: null,
              },
            ],
            rarity: "rare",
          },
          assignedMeldId: "m1",
          constraintViolated: true,
        },
      ],
    };
    const result = runModifierPipeline(makeBaseResult(500), meld, state);
    expect(result.afterTray).toBe(500);
  });

  it("no boss rule: afterBoss = afterTray", () => {
    const result = runModifierPipeline(
      makeBaseResult(500),
      makeMeld("m1", 7),
      makeEmptyState(),
    );
    expect(result.afterBoss).toBe(result.afterTray);
  });

  it("empty partner slots: afterPartner = afterScorepad", () => {
    const result = runModifierPipeline(
      makeBaseResult(500),
      makeMeld("m1", 7),
      makeEmptyState(),
    );
    expect(result.afterPartner).toBe(result.afterScorepad);
  });

  it("audit log: full pipeline has entries for each stage", () => {
    const meld = makeMeld("m1", 7);
    const state: ActiveModifierState = {
      partnerSlots: [
        {
          slotIndex: 0,
          partner: {
            id: "the-purist",
            name: "The Purist",
            description: "Test",
            triggerEvents: ["ON_CANASTA_SCORED"],
            effects: [
              {
                target: "score_multiplier",
                mode: "multiplicative",
                value: 2.0,
                canastaTypeFilter: "natural",
                rankFilter: null,
              },
            ],
            rarity: "rare",
          },
          unlocked: true,
        },
      ],
      activeHouseRules: [],
      activeScorepads: [
        {
          id: "natural-amplifier",
          name: "Natural Amplifier",
          description: "Test",
          targetCanastaTypes: ["natural"],
          effects: [
            {
              target: "canasta_bonus",
              mode: "additive",
              value: 200,
              canastaTypeFilter: "natural",
              rankFilter: null,
            },
          ],
          rarity: "uncommon",
        },
      ],
      traySlots: [],
      activeBossRule: null,
    };

    const result = runModifierPipeline(makeBaseResult(570), meld, state);
    expect(result.appliedModifiers.length).toBeGreaterThanOrEqual(2);
    const scorepadEntry = result.appliedModifiers.find(
      (m) => m.modifierType === "scorepad",
    );
    expect(scorepadEntry?.scoreBefore).toBe(570);
    expect(scorepadEntry?.scoreAfter).toBe(770);
  });
});
