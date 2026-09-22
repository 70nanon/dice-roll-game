import { describe, expect, it } from "vitest";
import type { Hand } from "./hand";
import type { Outcome } from "./payout";
import { settleRound } from "./payout";

const settle = (
  playerHand: Hand,
  dealerHand: Hand,
  bet = 10,
  playerChips = 100,
  dealerChips = 100,
) => settleRound({ playerHand, dealerHand, bet, playerChips, dealerChips });

describe("settleRound", () => {
  const cases: ReadonlyArray<{
    readonly title: string;
    readonly player: Hand;
    readonly dealer: Hand;
    readonly outcome: Outcome;
    readonly multiplier: number;
    readonly delta: number;
  }> = [
    {
      title: "ピンゾロ勝ちは 5 倍",
      player: { kind: "pinzoro" },
      dealer: { kind: "arashi", value: 6 },
      outcome: "playerWin",
      multiplier: 5,
      delta: 50,
    },
    {
      title: "アラシ勝ちは 3 倍",
      player: { kind: "arashi", value: 2 },
      dealer: { kind: "shigoro" },
      outcome: "playerWin",
      multiplier: 3,
      delta: 30,
    },
    {
      title: "シゴロ勝ちは 2 倍",
      player: { kind: "shigoro" },
      dealer: { kind: "normal", pip: 6 },
      outcome: "playerWin",
      multiplier: 2,
      delta: 20,
    },
    {
      title: "通常の目どうしは 1 倍",
      player: { kind: "normal", pip: 5 },
      dealer: { kind: "normal", pip: 4 },
      outcome: "playerWin",
      multiplier: 1,
      delta: 10,
    },
    {
      title: "自分がヒフミなら 2 倍払い",
      player: { kind: "hifumi" },
      dealer: { kind: "normal", pip: 1 },
      outcome: "dealerWin",
      multiplier: 2,
      delta: -20,
    },
    {
      title: "相手がヒフミなら 2 倍もらえる",
      player: { kind: "normal", pip: 1 },
      dealer: { kind: "hifumi" },
      outcome: "playerWin",
      multiplier: 2,
      delta: 20,
    },
    {
      title: "自分が目無しなら 1 倍払い",
      player: { kind: "menashi" },
      dealer: { kind: "normal", pip: 1 },
      outcome: "dealerWin",
      multiplier: 1,
      delta: -10,
    },
    {
      title: "目無しはヒフミより強い",
      player: { kind: "menashi" },
      dealer: { kind: "hifumi" },
      outcome: "playerWin",
      multiplier: 2,
      delta: 20,
    },
    {
      title: "相手のピンゾロには 5 倍払う",
      player: { kind: "normal", pip: 6 },
      dealer: { kind: "pinzoro" },
      outcome: "dealerWin",
      multiplier: 5,
      delta: -50,
    },
    {
      title: "アラシは出目で決まる",
      player: { kind: "arashi", value: 3 },
      dealer: { kind: "arashi", value: 5 },
      outcome: "dealerWin",
      multiplier: 3,
      delta: -30,
    },
  ];

  it.each(cases)("$title", ({ player, dealer, outcome, multiplier, delta }) => {
    const settlement = settle(player, dealer);
    expect(settlement.outcome).toBe(outcome);
    expect(settlement.multiplier).toBe(multiplier);
    expect(settlement.delta).toBe(delta);
    expect(settlement.playerChips).toBe(100 + delta);
    // 動いた分はそのまま相手から出入りする
    expect(settlement.dealerChips).toBe(100 - delta);
  });

  it("同じ役・同じ目はあいこでチップが動かない", () => {
    const settlement = settle({ kind: "normal", pip: 3 }, { kind: "normal", pip: 3 });
    expect(settlement.outcome).toBe("draw");
    expect(settlement.multiplier).toBe(0);
    expect(settlement.delta).toBe(0);
    expect(settlement.playerChips).toBe(100);
    expect(settlement.dealerChips).toBe(100);
  });

  it("自分の支払いは所持チップまでにする", () => {
    const settlement = settle({ kind: "hifumi" }, { kind: "normal", pip: 1 }, 20, 20);
    expect(settlement.delta).toBe(-20);
    expect(settlement.playerChips).toBe(0);
    expect(settlement.dealerChips).toBe(120);
  });

  it("自分のチップがマイナスにならない", () => {
    const settlement = settle({ kind: "normal", pip: 1 }, { kind: "pinzoro" }, 5, 3);
    expect(settlement.delta).toBe(-3);
    expect(settlement.playerChips).toBe(0);
  });

  it("親の支払いは親の所持チップまでにする", () => {
    // 5 倍で 50 取れるところ、親は 30 しか持っていない
    const settlement = settle({ kind: "pinzoro" }, { kind: "menashi" }, 10, 100, 30);
    expect(settlement.multiplier).toBe(5);
    expect(settlement.delta).toBe(30);
    expect(settlement.playerChips).toBe(130);
    expect(settlement.dealerChips).toBe(0);
  });

  it("親のチップがマイナスにならない", () => {
    const settlement = settle({ kind: "normal", pip: 6 }, { kind: "normal", pip: 1 }, 10, 100, 4);
    expect(settlement.delta).toBe(4);
    expect(settlement.dealerChips).toBe(0);
  });

  it("勝敗の理由を日本語で返す", () => {
    expect(settle({ kind: "pinzoro" }, { kind: "menashi" }).reason).toBe(
      "あなたのピンゾロが親の目無しに勝ち（5倍）",
    );
    expect(settle({ kind: "normal", pip: 1 }, { kind: "shigoro" }).reason).toBe(
      "親のシゴロにあなたの1の目が負け（2倍）",
    );
    expect(settle({ kind: "hifumi" }, { kind: "hifumi" }).reason).toBe(
      "どちらもヒフミであいこ",
    );
  });
});
