import { describe, expect, it } from "vitest";
import type { RoundRecord } from "./game";
import type { Hand } from "./hand";
import type { Outcome } from "./payout";
import { summarizeMatch } from "./stats";

function record(
  round: number,
  outcome: Outcome,
  delta: number,
  chipsAfter: number,
  playerHand: Hand,
): RoundRecord {
  return {
    round,
    bet: 10,
    dealerDice: [1, 1, 2],
    dealerHand: { kind: "normal", pip: 2 },
    playerDice: [6, 6, 5],
    playerHand,
    outcome,
    delta,
    chipsAfter,
  };
}

describe("summarizeMatch", () => {
  it("履歴が空なら開始時のチップだけを返す", () => {
    const summary = summarizeMatch([], 100);
    expect(summary).toEqual({
      rounds: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      netDelta: 0,
      finalChips: 100,
      maxChips: 100,
      playerHands: [],
    });
  });

  it("勝敗数と増減の合計を数える", () => {
    const summary = summarizeMatch(
      [
        record(1, "playerWin", 10, 110, { kind: "normal", pip: 5 }),
        record(2, "dealerWin", -20, 90, { kind: "hifumi" }),
        record(3, "draw", 0, 90, { kind: "normal", pip: 3 }),
      ],
      100,
    );
    expect(summary.rounds).toBe(3);
    expect(summary.wins).toBe(1);
    expect(summary.losses).toBe(1);
    expect(summary.draws).toBe(1);
    expect(summary.netDelta).toBe(-10);
    expect(summary.finalChips).toBe(90);
  });

  it("最大チップは開始時と各ラウンド後の最大を取る", () => {
    const summary = summarizeMatch(
      [
        record(1, "playerWin", 50, 150, { kind: "shigoro" }),
        record(2, "dealerWin", -100, 50, { kind: "menashi" }),
      ],
      100,
    );
    expect(summary.maxChips).toBe(150);
    expect(summary.finalChips).toBe(50);
  });

  it("負け続けても最大チップは開始時のチップを下回らない", () => {
    const summary = summarizeMatch(
      [record(1, "dealerWin", -10, 90, { kind: "menashi" })],
      100,
    );
    expect(summary.maxChips).toBe(100);
  });

  it("自分の役の内訳を強い順に、出た役だけ返す", () => {
    const summary = summarizeMatch(
      [
        record(1, "playerWin", 10, 110, { kind: "normal", pip: 5 }),
        record(2, "playerWin", 50, 160, { kind: "pinzoro" }),
        record(3, "playerWin", 10, 170, { kind: "normal", pip: 2 }),
        record(4, "dealerWin", -10, 160, { kind: "menashi" }),
      ],
      100,
    );
    expect(summary.playerHands).toEqual([
      { kind: "pinzoro", count: 1 },
      { kind: "normal", count: 2 },
      { kind: "menashi", count: 1 },
    ]);
  });
});
