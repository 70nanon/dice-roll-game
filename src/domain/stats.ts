import type { RoundRecord } from "./game";
import type { HandKind } from "./hand";
import { HAND_KINDS_STRONG_TO_WEAK } from "./hand";

export type HandCount = {
  readonly kind: HandKind;
  readonly count: number;
};

export type MatchSummary = {
  readonly rounds: number;
  readonly wins: number;
  readonly losses: number;
  readonly draws: number;
  /** チップの増減の合計 */
  readonly netDelta: number;
  readonly finalChips: number;
  /** 試合中に到達した最大チップ（開始時点も含む） */
  readonly maxChips: number;
  /** 自分に出た役の内訳。強い順で、0 回の役は含めない */
  readonly playerHands: readonly HandCount[];
};

export function summarizeMatch(
  history: readonly RoundRecord[],
  initialChips: number,
): MatchSummary {
  let wins = 0;
  let losses = 0;
  let draws = 0;
  let netDelta = 0;
  let maxChips = initialChips;
  let finalChips = initialChips;
  const handCounts = new Map<HandKind, number>();

  for (const record of history) {
    if (record.outcome === "playerWin") {
      wins += 1;
    } else if (record.outcome === "dealerWin") {
      losses += 1;
    } else {
      draws += 1;
    }
    netDelta += record.delta;
    maxChips = Math.max(maxChips, record.chipsAfter);
    finalChips = record.chipsAfter;
    const kind = record.playerHand.kind;
    handCounts.set(kind, (handCounts.get(kind) ?? 0) + 1);
  }

  const playerHands = HAND_KINDS_STRONG_TO_WEAK.flatMap<HandCount>((kind) => {
    const count = handCounts.get(kind);
    return count ? [{ kind, count }] : [];
  });

  return {
    rounds: history.length,
    wins,
    losses,
    draws,
    netDelta,
    finalChips,
    maxChips,
    playerHands,
  };
}
