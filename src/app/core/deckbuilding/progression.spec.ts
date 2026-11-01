import { describe, it, expect } from "vitest";
import {
  baseScoreTarget,
  roundMultiplier,
  roundScoreTarget,
  buildAnte,
  buildRound,
} from "./progression";

describe("baseScoreTarget", () => {
  it("returns correct values for antes 1-8", () => {
    const expected = [100, 200, 400, 800, 1600, 3200, 6400, 12800];
    for (let i = 1; i <= 8; i++) {
      expect(baseScoreTarget(i)).toBe(expected[i - 1]);
    }
  });
});

describe("roundMultiplier", () => {
  it("round 1 returns 1.0", () => {
    expect(roundMultiplier(1)).toBe(1.0);
  });

  it("round 2 returns 1.5", () => {
    expect(roundMultiplier(2)).toBe(1.5);
  });

  it("round 3 returns 2.0", () => {
    expect(roundMultiplier(3)).toBe(2.0);
  });

  it("throws for invalid input (0)", () => {
    expect(() => roundMultiplier(0)).toThrow();
  });

  it("throws for invalid input (4)", () => {
    expect(() => roundMultiplier(4)).toThrow();
  });

  it("throws for invalid input (-1)", () => {
    expect(() => roundMultiplier(-1)).toThrow();
  });
});

describe("roundScoreTarget", () => {
  it("matches all 24 values in the progression table", () => {
    expect(roundScoreTarget(1, 1)).toBe(100);
    expect(roundScoreTarget(1, 2)).toBe(150);
    expect(roundScoreTarget(1, 3)).toBe(200);
    expect(roundScoreTarget(2, 1)).toBe(200);
    expect(roundScoreTarget(2, 2)).toBe(300);
    expect(roundScoreTarget(2, 3)).toBe(400);
    expect(roundScoreTarget(3, 1)).toBe(400);
    expect(roundScoreTarget(3, 2)).toBe(600);
    expect(roundScoreTarget(3, 3)).toBe(800);
    expect(roundScoreTarget(4, 1)).toBe(800);
    expect(roundScoreTarget(4, 2)).toBe(1200);
    expect(roundScoreTarget(4, 3)).toBe(1600);
    expect(roundScoreTarget(5, 1)).toBe(1600);
    expect(roundScoreTarget(5, 2)).toBe(2400);
    expect(roundScoreTarget(5, 3)).toBe(3200);
    expect(roundScoreTarget(6, 1)).toBe(3200);
    expect(roundScoreTarget(6, 2)).toBe(4800);
    expect(roundScoreTarget(6, 3)).toBe(6400);
    expect(roundScoreTarget(7, 1)).toBe(6400);
    expect(roundScoreTarget(7, 2)).toBe(9600);
    expect(roundScoreTarget(7, 3)).toBe(12800);
    expect(roundScoreTarget(8, 1)).toBe(12800);
    expect(roundScoreTarget(8, 2)).toBe(19200);
    expect(roundScoreTarget(8, 3)).toBe(25600);
  });
});

describe("buildAnte", () => {
  it("buildAnte(1) returns correct structure", () => {
    const ante = buildAnte(1);
    expect(ante).toEqual({
      anteNumber: 1,
      roundCount: 3,
      bossRoundIndex: 3,
      baseScoreTarget: 100,
    });
  });

  it("buildAnte(8) returns correct structure", () => {
    const ante = buildAnte(8);
    expect(ante).toEqual({
      anteNumber: 8,
      roundCount: 3,
      bossRoundIndex: 3,
      baseScoreTarget: 12800,
    });
  });
});

describe("buildRound", () => {
  const stubSelectBossRule = (ante: number) => `stub-boss-${ante}`;
  const stubPool = [{ id: "boss-1" }];

  it("buildRound(2, 3, 6) returns boss round with correct scoreTarget", () => {
    const round = buildRound(2, 3, 6, stubSelectBossRule, stubPool);
    expect(round.anteNumber).toBe(2);
    expect(round.roundNumber).toBe(3);
    expect(round.absoluteRoundNumber).toBe(6);
    expect(round.scoreTarget).toBe(400);
    expect(round.isBossRound).toBe(true);
    expect(round.bossRuleId).toBe("stub-boss-2");
    expect(round.phase).toBe("Draw");
  });

  it("buildRound(1, 1, 1) returns non-boss round", () => {
    const round = buildRound(1, 1, 1, stubSelectBossRule, stubPool);
    expect(round.isBossRound).toBe(false);
    expect(round.bossRuleId).toBeNull();
    expect(round.scoreTarget).toBe(100);
  });
});
