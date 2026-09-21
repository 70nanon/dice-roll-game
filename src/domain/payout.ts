import type { Hand } from "./hand";
import {
  compareHands,
  handLabel,
  loserMultiplier,
  winnerMultiplier,
} from "./hand";

export type Outcome = "playerWin" | "dealerWin" | "draw";

export type Settlement = {
  readonly outcome: Outcome;
  /** 掛け金にかかる倍率。あいこは 0 */
  readonly multiplier: number;
  /** 実際に動いたチップ（プレイヤー視点の増減） */
  readonly delta: number;
  /** 清算後のチップ */
  readonly chips: number;
  readonly reason: string;
};

export type SettleInput = {
  readonly playerHand: Hand;
  readonly dealerHand: Hand;
  readonly bet: number;
  readonly chips: number;
};

/**
 * 役を比較して清算する。
 * 倍率は「勝者の役の倍率」と「敗者が負う倍率」の大きい方を採用する。
 * 支払いは所持チップを上限とし、マイナスにはしない。
 */
export function settleRound({
  playerHand,
  dealerHand,
  bet,
  chips,
}: SettleInput): Settlement {
  const comparison = compareHands(playerHand, dealerHand);

  if (comparison === 0) {
    return {
      outcome: "draw",
      multiplier: 0,
      delta: 0,
      chips,
      reason: `どちらも${handLabel(playerHand)}であいこ`,
    };
  }

  const playerWon = comparison > 0;
  const winner = playerWon ? playerHand : dealerHand;
  const loser = playerWon ? dealerHand : playerHand;
  const multiplier = Math.max(winnerMultiplier(winner), loserMultiplier(loser));
  const amount = bet * multiplier;

  if (playerWon) {
    return {
      outcome: "playerWin",
      multiplier,
      delta: amount,
      chips: chips + amount,
      reason: `あなたの${handLabel(playerHand)}が親の${handLabel(dealerHand)}に勝ち（${multiplier}倍）`,
    };
  }

  const paid = Math.min(amount, chips);
  return {
    outcome: "dealerWin",
    multiplier,
    delta: -paid,
    chips: chips - paid,
    reason: `親の${handLabel(dealerHand)}にあなたの${handLabel(playerHand)}が負け（${multiplier}倍）`,
  };
}
