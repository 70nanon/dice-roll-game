import { describe, expect, it } from "vitest";
import type { Dice } from "./dice";
import type { Hand } from "./hand";
import {
  compareHands,
  handLabel,
  hasHand,
  judgeHand,
  loserMultiplier,
  winnerMultiplier,
} from "./hand";

describe("judgeHand", () => {
  const cases: ReadonlyArray<readonly [Dice, Hand]> = [
    [[1, 1, 1], { kind: "pinzoro" }],
    [[2, 2, 2], { kind: "arashi", value: 2 }],
    [[6, 6, 6], { kind: "arashi", value: 6 }],
    [[4, 5, 6], { kind: "shigoro" }],
    [[6, 4, 5], { kind: "shigoro" }],
    [[1, 2, 3], { kind: "hifumi" }],
    [[3, 1, 2], { kind: "hifumi" }],
    // ペア + 残り 1 個。残りが勝負の目になる
    [[1, 1, 2], { kind: "normal", pip: 2 }],
    [[2, 2, 1], { kind: "normal", pip: 1 }],
    [[6, 6, 5], { kind: "normal", pip: 5 }],
    [[3, 6, 6], { kind: "normal", pip: 3 }],
    [[1, 1, 6], { kind: "normal", pip: 6 }],
    // ペアもゾロ目も並びもない
    [[1, 2, 4], { kind: "shonben" }],
    [[2, 3, 5], { kind: "shonben" }],
    [[3, 4, 6], { kind: "shonben" }],
    [[1, 3, 5], { kind: "shonben" }],
  ];

  it.each(cases)("%j は %j と判定する", (dice, expected) => {
    expect(judgeHand(dice)).toEqual(expected);
  });

  it("出目の順番は判定に影響しない", () => {
    const permutations: readonly Dice[] = [
      [1, 2, 3],
      [1, 3, 2],
      [2, 1, 3],
      [2, 3, 1],
      [3, 1, 2],
      [3, 2, 1],
    ];
    for (const dice of permutations) {
      expect(judgeHand(dice)).toEqual({ kind: "hifumi" });
    }
  });
});

describe("hasHand", () => {
  it("ションベン以外は役が付いたものとして扱う", () => {
    expect(hasHand({ kind: "shonben" })).toBe(false);
    expect(hasHand({ kind: "hifumi" })).toBe(true);
    expect(hasHand({ kind: "normal", pip: 1 })).toBe(true);
    expect(hasHand({ kind: "pinzoro" })).toBe(true);
  });
});

describe("compareHands", () => {
  it("役の強さは ピンゾロ > アラシ > シゴロ > 通常の目 > ションベン > ヒフミ", () => {
    const strongToWeak: readonly Hand[] = [
      { kind: "pinzoro" },
      { kind: "arashi", value: 6 },
      { kind: "arashi", value: 2 },
      { kind: "shigoro" },
      { kind: "normal", pip: 6 },
      { kind: "normal", pip: 1 },
      { kind: "shonben" },
      { kind: "hifumi" },
    ];

    for (let i = 0; i < strongToWeak.length - 1; i += 1) {
      const stronger = strongToWeak[i]!;
      const weaker = strongToWeak[i + 1]!;
      expect(compareHands(stronger, weaker)).toBeGreaterThan(0);
      expect(compareHands(weaker, stronger)).toBeLessThan(0);
    }
  });

  it("アラシは出目が大きい方が強い", () => {
    expect(
      compareHands({ kind: "arashi", value: 6 }, { kind: "arashi", value: 5 }),
    ).toBeGreaterThan(0);
  });

  it("通常の目は目が大きい方が強い", () => {
    expect(
      compareHands({ kind: "normal", pip: 4 }, { kind: "normal", pip: 3 }),
    ).toBeGreaterThan(0);
  });

  it("同じ役・同じ目はあいこ", () => {
    expect(compareHands({ kind: "normal", pip: 3 }, { kind: "normal", pip: 3 })).toBe(0);
    expect(compareHands({ kind: "pinzoro" }, { kind: "pinzoro" })).toBe(0);
    expect(compareHands({ kind: "shonben" }, { kind: "shonben" })).toBe(0);
    expect(compareHands({ kind: "hifumi" }, { kind: "hifumi" })).toBe(0);
  });
});

describe("倍率", () => {
  it("勝った側の倍率は ピンゾロ 5 / アラシ 3 / シゴロ 2 / 通常 1", () => {
    expect(winnerMultiplier({ kind: "pinzoro" })).toBe(5);
    expect(winnerMultiplier({ kind: "arashi", value: 3 })).toBe(3);
    expect(winnerMultiplier({ kind: "shigoro" })).toBe(2);
    expect(winnerMultiplier({ kind: "normal", pip: 5 })).toBe(1);
  });

  it("ヒフミだけが 2 倍払い", () => {
    expect(loserMultiplier({ kind: "hifumi" })).toBe(2);
    expect(loserMultiplier({ kind: "shonben" })).toBe(1);
    expect(loserMultiplier({ kind: "normal", pip: 2 })).toBe(1);
  });
});

describe("handLabel", () => {
  it("日本語の役名を返す", () => {
    expect(handLabel({ kind: "pinzoro" })).toBe("ピンゾロ");
    expect(handLabel({ kind: "arashi", value: 4 })).toBe("4のアラシ");
    expect(handLabel({ kind: "shigoro" })).toBe("シゴロ");
    expect(handLabel({ kind: "normal", pip: 2 })).toBe("2の目");
    expect(handLabel({ kind: "hifumi" })).toBe("ヒフミ");
    expect(handLabel({ kind: "shonben" })).toBe("ションベン");
  });
});
