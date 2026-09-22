import { describe, expect, it } from "vitest";
import { diceRolls } from "../test/diceSequence";
import type { GameAction, GameState } from "./game";
import {
  canRoll,
  canStand,
  createGameReducer,
  createInitialState,
  isValidBet,
  latestRoll,
  mustReroll,
} from "./game";
import type { Dice, RandomSource } from "./dice";

function play(
  random: RandomSource,
  actions: readonly GameAction[],
  initial: GameState = createInitialState(),
): GameState {
  const reducer = createGameReducer(random);
  return actions.reduce(reducer, initial);
}

const NORMAL_2: Dice = [1, 1, 2];
const NORMAL_5: Dice = [6, 6, 5];
const MENASHI: Dice = [1, 2, 4];
const PINZORO: Dice = [1, 1, 1];

describe("isValidBet", () => {
  it("1 以上・所持チップ以下の整数だけ受け付ける", () => {
    expect(isValidBet(100, 1)).toBe(true);
    expect(isValidBet(100, 100)).toBe(true);
    expect(isValidBet(100, 0)).toBe(false);
    expect(isValidBet(100, -5)).toBe(false);
    expect(isValidBet(100, 101)).toBe(false);
    expect(isValidBet(100, 1.5)).toBe(false);
    expect(isValidBet(100, Number.NaN)).toBe(false);
  });
});

describe("placeBet", () => {
  it("掛け金を確定すると親のターンになる", () => {
    const state = play(diceRolls(), [{ type: "placeBet", bet: 10 }]);
    expect(state.phase).toBe("dealerTurn");
    expect(state.bet).toBe(10);
  });

  it("不正な掛け金は無視する", () => {
    const initial = createInitialState();
    for (const bet of [0, -1, 101, 2.5]) {
      expect(play(diceRolls(), [{ type: "placeBet", bet }], initial)).toEqual(initial);
    }
  });
});

describe("親（CPU）のターン", () => {
  it("役が付くまで振り、付いたら子のターンに移る", () => {
    const state = play(diceRolls(MENASHI, NORMAL_5), [
      { type: "placeBet", bet: 10 },
      { type: "roll" },
      { type: "roll" },
    ]);
    expect(state.dealer.rolls).toHaveLength(2);
    expect(latestRoll(state.dealer)?.hand).toEqual({ kind: "normal", pip: 5 });
    expect(state.phase).toBe("playerTurn");
  });

  it("役なしのうちは親のターンが続く", () => {
    const state = play(diceRolls(MENASHI), [
      { type: "placeBet", bet: 10 },
      { type: "roll" },
    ]);
    expect(state.phase).toBe("dealerTurn");
    expect(mustReroll(state)).toBe(true);
  });

  it("役が付いたあとは振り直さない", () => {
    const afterRoll = play(diceRolls(NORMAL_5), [
      { type: "placeBet", bet: 10 },
      { type: "roll" },
    ]);
    // 親のターンに留まっていたとしても、確定済みなら追加で振らない
    const stuckOnDealer: GameState = { ...afterRoll, phase: "dealerTurn" };
    expect(canRoll(stuckOnDealer)).toBe(false);
    // 出目を 1 つも用意していない乱数なので、振ろうとすれば例外になる
    expect(play(diceRolls(), [{ type: "roll" }], stuckOnDealer)).toEqual(stuckOnDealer);
  });

  it("3 回振って役なしなら目無しで確定する", () => {
    const state = play(diceRolls(MENASHI, MENASHI, MENASHI), [
      { type: "placeBet", bet: 10 },
      { type: "roll" },
      { type: "roll" },
      { type: "roll" },
    ]);
    expect(latestRoll(state.dealer)?.hand).toEqual({ kind: "menashi" });
    expect(state.dealer.decided).toBe(true);
    expect(state.phase).toBe("playerTurn");
  });
});

describe("子（プレイヤー）のターン", () => {
  it("役が付いても残り回数があれば振り直せる", () => {
    const afterFirst = play(diceRolls(NORMAL_2, NORMAL_2), [
      { type: "placeBet", bet: 10 },
      { type: "roll" },
      { type: "roll" },
    ]);
    expect(afterFirst.phase).toBe("playerTurn");
    expect(latestRoll(afterFirst.player)?.hand).toEqual({ kind: "normal", pip: 2 });
    expect(canRoll(afterFirst)).toBe(true);
    expect(canStand(afterFirst)).toBe(true);
  });

  it("この目で勝負すると清算される", () => {
    const state = play(diceRolls(NORMAL_2, NORMAL_5), [
      { type: "placeBet", bet: 10 },
      { type: "roll" },
      { type: "roll" },
      { type: "stand" },
    ]);
    expect(state.phase).toBe("result");
    expect(state.settlement?.outcome).toBe("playerWin");
    expect(state.chips).toBe(110);
  });

  it("役が付いていなければ勝負できない", () => {
    const state = play(diceRolls(NORMAL_2, MENASHI), [
      { type: "placeBet", bet: 10 },
      { type: "roll" },
      { type: "roll" },
    ]);
    expect(canStand(state)).toBe(false);
    expect(play(diceRolls(), [{ type: "stand" }], state)).toEqual(state);
  });

  it("3 回振り切ると自動で清算される", () => {
    const state = play(diceRolls(NORMAL_5, MENASHI, MENASHI, MENASHI), [
      { type: "placeBet", bet: 10 },
      { type: "roll" },
      { type: "roll" },
      { type: "roll" },
      { type: "roll" },
    ]);
    expect(state.player.rolls).toHaveLength(3);
    expect(latestRoll(state.player)?.hand).toEqual({ kind: "menashi" });
    expect(state.phase).toBe("result");
    expect(state.chips).toBe(90);
  });
});

describe("投ごとの出目履歴", () => {
  it("振り直しても古い出目が順に残る", () => {
    const state = play(diceRolls(MENASHI, NORMAL_5, MENASHI, NORMAL_2), [
      { type: "placeBet", bet: 10 },
      { type: "roll" },
      { type: "roll" },
      { type: "roll" },
      { type: "roll" },
    ]);
    expect(state.dealer.rolls).toEqual([
      { dice: MENASHI, hand: { kind: "menashi" } },
      { dice: NORMAL_5, hand: { kind: "normal", pip: 5 } },
    ]);
    expect(state.player.rolls).toEqual([
      { dice: MENASHI, hand: { kind: "menashi" } },
      { dice: NORMAL_2, hand: { kind: "normal", pip: 2 } },
    ]);
  });

  it("次のラウンドに入ると履歴は空に戻る", () => {
    const state = play(diceRolls(MENASHI, NORMAL_5, NORMAL_2), [
      { type: "placeBet", bet: 10 },
      { type: "roll" },
      { type: "roll" },
      { type: "roll" },
      { type: "stand" },
      { type: "nextRound" },
    ]);
    expect(state.dealer.rolls).toEqual([]);
    expect(state.player.rolls).toEqual([]);
    expect(latestRoll(state.player)).toBeNull();
  });

  it("ラウンドの記録には勝負した出目が入る", () => {
    const state = play(diceRolls(NORMAL_5, MENASHI, NORMAL_2), [
      { type: "placeBet", bet: 10 },
      { type: "roll" },
      { type: "roll" },
      { type: "roll" },
      { type: "stand" },
    ]);
    // 履歴には最後の 1 投だけが残る（途中の目無しは RollState 側に残る）
    expect(state.history).toHaveLength(1);
    expect(state.history[0]?.playerDice).toEqual(NORMAL_2);
    expect(state.player.rolls).toHaveLength(2);
  });
});

describe("ラウンドの繰り返し", () => {
  it("清算後に次のラウンドへ進める", () => {
    const state = play(diceRolls(NORMAL_2, PINZORO), [
      { type: "placeBet", bet: 10 },
      { type: "roll" },
      { type: "roll" },
      { type: "stand" },
      { type: "nextRound" },
    ]);
    expect(state.phase).toBe("betting");
    expect(state.round).toBe(2);
    expect(state.bet).toBe(0);
    expect(state.chips).toBe(150);
    expect(state.player.rolls).toEqual([]);
    expect(state.settlement).toBeNull();
  });

  it("1 ラウンドをテストだけで最後まで進められる", () => {
    const reducer = createGameReducer(diceRolls(MENASHI, NORMAL_5, MENASHI, PINZORO));
    let state = createInitialState();
    state = reducer(state, { type: "placeBet", bet: 20 });
    while (state.phase === "dealerTurn") {
      state = reducer(state, { type: "roll" });
    }
    while (state.phase === "playerTurn" && !canStand(state)) {
      state = reducer(state, { type: "roll" });
    }
    state = reducer(state, { type: "stand" });

    expect(latestRoll(state.dealer)?.hand).toEqual({ kind: "normal", pip: 5 });
    expect(latestRoll(state.player)?.hand).toEqual({ kind: "pinzoro" });
    expect(state.phase).toBe("result");
    expect(state.chips).toBe(200);
  });
});

describe("ラウンドの履歴", () => {
  it("清算のたびに出目と結果を記録する", () => {
    const state = play(diceRolls(NORMAL_2, NORMAL_5), [
      { type: "placeBet", bet: 10 },
      { type: "roll" },
      { type: "roll" },
      { type: "stand" },
    ]);
    expect(state.history).toEqual([
      {
        round: 1,
        bet: 10,
        dealerDice: NORMAL_2,
        dealerHand: { kind: "normal", pip: 2 },
        playerDice: NORMAL_5,
        playerHand: { kind: "normal", pip: 5 },
        outcome: "playerWin",
        delta: 10,
        chipsAfter: 110,
      },
    ]);
  });

  it("ラウンドをまたいで古い順に積み上がる", () => {
    const state = play(diceRolls(NORMAL_2, NORMAL_5, NORMAL_5, NORMAL_2), [
      { type: "placeBet", bet: 10 },
      { type: "roll" },
      { type: "roll" },
      { type: "stand" },
      { type: "nextRound" },
      { type: "placeBet", bet: 20 },
      { type: "roll" },
      { type: "roll" },
      { type: "stand" },
    ]);
    expect(state.history.map((record) => record.round)).toEqual([1, 2]);
    expect(state.history.map((record) => record.delta)).toEqual([10, -20]);
    expect(state.chips).toBe(90);
  });
});

describe("ゲームオーバー", () => {
  it("チップが 0 になったらゲームオーバーになる", () => {
    const state = play(
      diceRolls(PINZORO, NORMAL_2),
      [
        { type: "placeBet", bet: 10 },
        { type: "roll" },
        { type: "roll" },
        { type: "stand" },
      ],
      createInitialState(10),
    );
    expect(state.chips).toBe(0);
    expect(state.phase).toBe("gameOver");
  });

  it("ゲームオーバーから再開できる", () => {
    const over = play(
      diceRolls(PINZORO, NORMAL_2),
      [
        { type: "placeBet", bet: 10 },
        { type: "roll" },
        { type: "roll" },
        { type: "stand" },
      ],
      createInitialState(10),
    );
    const restarted = play(diceRolls(), [{ type: "restart" }], over);
    expect(restarted).toEqual(createInitialState());
  });

  it("ゲームオーバー中は振れない", () => {
    const over = play(
      diceRolls(PINZORO, NORMAL_2),
      [
        { type: "placeBet", bet: 10 },
        { type: "roll" },
        { type: "roll" },
        { type: "stand" },
      ],
      createInitialState(10),
    );
    expect(canRoll(over)).toBe(false);
    expect(play(diceRolls(), [{ type: "roll" }], over)).toEqual(over);
  });
});
