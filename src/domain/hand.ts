import type { Dice, DieValue } from "./dice";

export type Hand =
  /** 1-1-1 */
  | { readonly kind: "pinzoro" }
  /** 2-2-2 〜 6-6-6 */
  | { readonly kind: "arashi"; readonly value: DieValue }
  /** 4-5-6（順不同） */
  | { readonly kind: "shigoro" }
  /** ペア + 残り 1 個。pip が勝負の目 */
  | { readonly kind: "normal"; readonly pip: DieValue }
  /** 1-2-3（順不同） */
  | { readonly kind: "hifumi" }
  /** 役なし */
  | { readonly kind: "menashi" };

export type HandKind = Hand["kind"];

/** 強い順。ヒフミは目無しより下に置く。 */
const HAND_RANK: Record<HandKind, number> = {
  pinzoro: 5,
  arashi: 4,
  shigoro: 3,
  normal: 2,
  menashi: 1,
  hifumi: 0,
};

/** 勝った側の役にかかる倍率。 */
const WINNER_MULTIPLIER: Record<HandKind, number> = {
  pinzoro: 5,
  arashi: 3,
  shigoro: 2,
  normal: 1,
  menashi: 1,
  hifumi: 1,
};

/** 負けた側が負う倍率。ヒフミだけ 2 倍払いになる。 */
const LOSER_MULTIPLIER: Record<HandKind, number> = {
  pinzoro: 1,
  arashi: 1,
  shigoro: 1,
  normal: 1,
  menashi: 1,
  hifumi: 2,
};

export function judgeHand(dice: Dice): Hand {
  const [low, mid, high] = [...dice].sort((a, b) => a - b) as [
    DieValue,
    DieValue,
    DieValue,
  ];

  if (low === mid && mid === high) {
    return low === 1 ? { kind: "pinzoro" } : { kind: "arashi", value: low };
  }
  if (low === 4 && mid === 5 && high === 6) {
    return { kind: "shigoro" };
  }
  if (low === 1 && mid === 2 && high === 3) {
    return { kind: "hifumi" };
  }
  if (low === mid) {
    return { kind: "normal", pip: high };
  }
  if (mid === high) {
    return { kind: "normal", pip: low };
  }
  return { kind: "menashi" };
}

/**
 * 役が付いたか。目無しだけが「まだ何も出ていない」扱いで、
 * 残り回数があれば自動で振り直す。
 */
export function hasHand(hand: Hand): boolean {
  return hand.kind !== "menashi";
}

/** 正なら a が強い。0 はあいこ。 */
export function compareHands(a: Hand, b: Hand): number {
  const rankDiff = HAND_RANK[a.kind] - HAND_RANK[b.kind];
  if (rankDiff !== 0) {
    return rankDiff;
  }
  return tiebreakValue(a) - tiebreakValue(b);
}

/** 同じ役どうしの強さ比較に使う値。 */
function tiebreakValue(hand: Hand): number {
  switch (hand.kind) {
    case "arashi":
      return hand.value;
    case "normal":
      return hand.pip;
    default:
      return 0;
  }
}

export function winnerMultiplier(hand: Hand): number {
  return WINNER_MULTIPLIER[hand.kind];
}

export function loserMultiplier(hand: Hand): number {
  return LOSER_MULTIPLIER[hand.kind];
}

export function handLabel(hand: Hand): string {
  switch (hand.kind) {
    case "pinzoro":
      return "ピンゾロ";
    case "arashi":
      return `${hand.value}のアラシ`;
    case "shigoro":
      return "シゴロ";
    case "normal":
      return `${hand.pip}の目`;
    case "hifumi":
      return "ヒフミ";
    case "menashi":
      return "目無し";
  }
}
