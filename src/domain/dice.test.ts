import { describe, expect, it } from "vitest";
import { diceSequence } from "../test/diceSequence";
import { formatDice, rollDice, rollDie } from "./dice";

describe("rollDie", () => {
  it("乱数の下限と上限で 1 と 6 を返す", () => {
    expect(rollDie(() => 0)).toBe(1);
    expect(rollDie(() => 0.999999)).toBe(6);
  });

  it("実際の乱数でも常に 1〜6 を返す", () => {
    for (let i = 0; i < 500; i += 1) {
      const value = rollDie(Math.random);
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(6);
    }
  });
});

describe("rollDice", () => {
  it("乱数を 3 回使って 3 個の出目を返す", () => {
    expect(rollDice(diceSequence(4, 5, 6))).toEqual([4, 5, 6]);
  });
});

describe("formatDice", () => {
  it("出目をハイフン区切りで表示する", () => {
    expect(formatDice([1, 1, 1])).toBe("1-1-1");
  });
});
