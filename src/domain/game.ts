import type { Dice, RandomSource } from "./dice";
import { rollDice } from "./dice";
import type { Hand } from "./hand";
import { hasHand, judgeHand } from "./hand";
import type { Outcome, Settlement } from "./payout";
import { settleRound } from "./payout";

export const INITIAL_CHIPS = 100;
/** Battle 1 の親（CPU）のチップ。これを削り切ったら撃破。 */
export const DEALER_INITIAL_CHIPS = 100;
/** Battle が 1 つ進むごとに増える親のチップ。強さの基準はこれだけ。 */
export const DEALER_CHIPS_PER_BATTLE = 50;
export const MAX_ROLLS = 3;
export const MIN_BET = 1;

/** Battle 番号に対する親の初期チップ。Battle 1 は 100 で、以降 50 ずつ増える。 */
export function dealerChipsForBattle(battle: number): number {
  return DEALER_INITIAL_CHIPS + DEALER_CHIPS_PER_BATTLE * (battle - 1);
}

export type Phase =
  | "betting"
  | "dealerTurn"
  | "playerTurn"
  | "result"
  /** 親のチップが尽きた（撃破） */
  | "battleWon"
  /** 自分のチップが尽きた */
  | "gameOver";

/** 1 投の記録。 */
export type Roll = {
  readonly dice: Dice;
  readonly hand: Hand;
};

export type RollState = {
  /** このラウンドで振った順。最後が今の出目。空ならまだ振っていない */
  readonly rolls: readonly Roll[];
  /** 役が付いた、または 3 回振り切って結果が動かない状態 */
  readonly decided: boolean;
};

/** 今の出目。まだ振っていなければ null。 */
export function latestRoll(roll: RollState): Roll | null {
  return roll.rolls.at(-1) ?? null;
}

/** 終わったラウンドの記録。出目もそのまま残す。 */
export type RoundRecord = {
  readonly round: number;
  readonly bet: number;
  readonly dealerDice: Dice;
  readonly dealerHand: Hand;
  readonly playerDice: Dice;
  readonly playerHand: Hand;
  readonly outcome: Outcome;
  readonly delta: number;
  readonly chipsAfter: number;
};

export type GameState = {
  readonly phase: Phase;
  /** 何人目の親と戦っているか。1 から始まり、撃破するたびに増える */
  readonly battle: number;
  /** この Battle の中でのラウンド番号。Battle をまたぐと 1 に戻る */
  readonly round: number;
  /** 自分のチップ */
  readonly chips: number;
  /** 親（CPU）のチップ */
  readonly dealerChips: number;
  readonly bet: number;
  readonly dealer: RollState;
  readonly player: RollState;
  readonly settlement: Settlement | null;
  /** 古い順。表示は新しい順にすることが多いので、並べ替えは UI 側で行う */
  readonly history: readonly RoundRecord[];
};

export type GameAction =
  | { readonly type: "placeBet"; readonly bet: number }
  /** 現在の手番が 3 個振る */
  | { readonly type: "roll" }
  /** この目で勝負する */
  | { readonly type: "stand" }
  | { readonly type: "nextRound" }
  /** 撃破したので次の親と戦う */
  | { readonly type: "nextBattle" }
  | { readonly type: "restart" };

const EMPTY_ROLL: RollState = {
  rolls: [],
  decided: false,
};

export function createInitialState(
  chips: number = INITIAL_CHIPS,
  dealerChips: number = DEALER_INITIAL_CHIPS,
  battle: number = 1,
): GameState {
  return {
    phase: "betting",
    battle,
    round: 1,
    chips,
    dealerChips,
    bet: 0,
    dealer: EMPTY_ROLL,
    player: EMPTY_ROLL,
    settlement: null,
    history: [],
  };
}

/** 賭けられる上限。どちらかが払えない額は賭けられない。 */
export function maxBet(chips: number, dealerChips: number): number {
  return Math.min(chips, dealerChips);
}

export function isValidBet(
  chips: number,
  dealerChips: number,
  bet: number,
): boolean {
  return (
    Number.isInteger(bet) && bet >= MIN_BET && bet <= maxBet(chips, dealerChips)
  );
}

export function canRoll(state: GameState): boolean {
  if (state.phase === "dealerTurn") {
    return !state.dealer.decided;
  }
  if (state.phase === "playerTurn") {
    return state.player.rolls.length < MAX_ROLLS;
  }
  return false;
}

export function canStand(state: GameState): boolean {
  return state.phase === "playerTurn" && state.player.decided;
}

/** 役なしなので、残り回数の範囲で振り直すしかない状態。 */
export function mustReroll(state: GameState): boolean {
  return canRoll(state) && !activeRollState(state).decided;
}

function activeRollState(state: GameState): RollState {
  return state.phase === "dealerTurn" ? state.dealer : state.player;
}

/**
 * 乱数を差し込んで reducer を作る。テストでは出目を固定した関数を渡す。
 */
export function createGameReducer(
  random: RandomSource,
): (state: GameState, action: GameAction) => GameState {
  return function reducer(state: GameState, action: GameAction): GameState {
    switch (action.type) {
      case "placeBet": {
        if (
          state.phase !== "betting" ||
          !isValidBet(state.chips, state.dealerChips, action.bet)
        ) {
          return state;
        }
        return {
          ...state,
          phase: "dealerTurn",
          bet: action.bet,
          dealer: EMPTY_ROLL,
          player: EMPTY_ROLL,
          settlement: null,
        };
      }

      case "roll": {
        if (state.phase === "dealerTurn") {
          // 親（CPU）は役が付いたら必ず確定し、振り直さない。
          if (state.dealer.decided) {
            return state;
          }
          const dealer = applyRoll(state.dealer, random);
          return {
            ...state,
            dealer,
            phase: dealer.decided ? "playerTurn" : "dealerTurn",
          };
        }

        if (state.phase === "playerTurn") {
          if (state.player.rolls.length >= MAX_ROLLS) {
            return state;
          }
          const player = applyRoll(state.player, random);
          // 3 回振り切ったら選ぶ余地がないので、そのまま清算する。
          if (player.rolls.length >= MAX_ROLLS) {
            return settle({ ...state, player });
          }
          return { ...state, player };
        }

        return state;
      }

      case "stand": {
        if (!canStand(state)) {
          return state;
        }
        return settle(state);
      }

      case "nextRound": {
        if (state.phase !== "result") {
          return state;
        }
        return {
          ...state,
          phase: "betting",
          round: state.round + 1,
          bet: 0,
          dealer: EMPTY_ROLL,
          player: EMPTY_ROLL,
          settlement: null,
        };
      }

      case "nextBattle": {
        if (state.phase !== "battleWon") {
          return state;
        }
        const battle = state.battle + 1;
        // 持ち越すのはチップだけ。ラウンド番号と履歴は親ごとに数え直す。
        return createInitialState(state.chips, dealerChipsForBattle(battle), battle);
      }

      case "restart": {
        if (state.phase !== "gameOver") {
          return state;
        }
        return createInitialState();
      }
    }
  };
}

function applyRoll(roll: RollState, random: RandomSource): RollState {
  const dice = rollDice(random);
  const hand = judgeHand(dice);
  const rolls = [...roll.rolls, { dice, hand }];
  return {
    rolls,
    decided: hasHand(hand) || rolls.length >= MAX_ROLLS,
  };
}

function settle(state: GameState): GameState {
  const player = latestRoll(state.player);
  const dealer = latestRoll(state.dealer);
  if (!player || !dealer) {
    return state;
  }
  const settlement = settleRound({
    playerHand: player.hand,
    dealerHand: dealer.hand,
    bet: state.bet,
    playerChips: state.chips,
    dealerChips: state.dealerChips,
  });
  const record: RoundRecord = {
    round: state.round,
    bet: state.bet,
    dealerDice: dealer.dice,
    dealerHand: dealer.hand,
    playerDice: player.dice,
    playerHand: player.hand,
    outcome: settlement.outcome,
    delta: settlement.delta,
    chipsAfter: settlement.playerChips,
  };
  return {
    ...state,
    chips: settlement.playerChips,
    dealerChips: settlement.dealerChips,
    settlement,
    history: [...state.history, record],
    phase: nextPhaseAfterSettle(settlement.playerChips, settlement.dealerChips),
  };
}

/** 1 ラウンドで減るのは片方だけなので、両方が同時に 0 になることはない。 */
function nextPhaseAfterSettle(chips: number, dealerChips: number): Phase {
  if (chips <= 0) {
    return "gameOver";
  }
  if (dealerChips <= 0) {
    return "battleWon";
  }
  return "result";
}
