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
  readonly playerChips: number;
  readonly dealerChips: number;
  readonly reason: string;
};

export type SettleInput = {
  readonly playerHand: Hand;
  readonly dealerHand: Hand;
  readonly bet: number;
  readonly playerChips: number;
  readonly dealerChips: number;
};

/**
 * 役を比較して清算する。
 * 倍率は「勝者の役の倍率」と「敗者が負う倍率」の大きい方を採用する。
 * 支払いは敗者の所持チップを上限とし、どちらもマイナスにはしない。
 */
export function settleRound({
  playerHand,
  dealerHand,
  bet,
  playerChips,
  dealerChips,
}: SettleInput): Settlement {
  const comparison = compareHands(playerHand, dealerHand);

  if (comparison === 0) {
    return {
      outcome: "draw",
      multiplier: 0,
      delta: 0,
      playerChips,
      dealerChips,
      reason: `どちらも${handLabel(playerHand)}であいこ`,
    };
  }

  const playerWon = comparison > 0;
  const winner = playerWon ? playerHand : dealerHand;
  const loser = playerWon ? dealerHand : playerHand;
  const multiplier = Math.max(winnerMultiplier(winner), loserMultiplier(loser));
  // 払えない分は取れない。払い切った側は 0 になる。
  const paid = Math.min(bet * multiplier, playerWon ? dealerChips : playerChips);

  if (playerWon) {
    return {
      outcome: "playerWin",
      multiplier,
      delta: paid,
      playerChips: playerChips + paid,
      dealerChips: dealerChips - paid,
      reason: `あなたの${handLabel(playerHand)}が親の${handLabel(dealerHand)}に勝ち（${multiplier}倍）`,
    };
  }

  return {
    outcome: "dealerWin",
    multiplier,
    delta: -paid,
    playerChips: playerChips - paid,
    dealerChips: dealerChips + paid,
    reason: `親の${handLabel(dealerHand)}にあなたの${handLabel(playerHand)}が負け（${multiplier}倍）`,
  };
}
