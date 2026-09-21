import { describe, expect, it } from "vitest";
import { diceRolls } from "../test/diceSequence";
import type { GameAction, GameState } from "./game";
import {
  canRoll,
  canStand,
  createGameReducer,
  createInitialState,
  isValidBet,
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
const SHONBEN: Dice = [1, 2, 4];
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
    const state = play(diceRolls(SHONBEN, NORMAL_5), [
      { type: "placeBet", bet: 10 },
      { type: "roll" },
      { type: "roll" },
    ]);
    expect(state.dealer.rollsUsed).toBe(2);
    expect(state.dealer.hand).toEqual({ kind: "normal", pip: 5 });
    expect(state.phase).toBe("playerTurn");
  });

  it("役なしのうちは親のターンが続く", () => {
    const state = play(diceRolls(SHONBEN), [
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
    const state = play(diceRolls(SHONBEN, SHONBEN, SHONBEN), [
      { type: "placeBet", bet: 10 },
      { type: "roll" },
      { type: "roll" },
      { type: "roll" },
    ]);
    expect(state.dealer.hand).toEqual({ kind: "menashi" });
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
    expect(afterFirst.player.hand).toEqual({ kind: "normal", pip: 2 });
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
    const state = play(diceRolls(NORMAL_2, SHONBEN), [
      { type: "placeBet", bet: 10 },
      { type: "roll" },
      { type: "roll" },
    ]);
    expect(canStand(state)).toBe(false);
    expect(play(diceRolls(), [{ type: "stand" }], state)).toEqual(state);
  });

  it("3 回振り切ると自動で清算される", () => {
    const state = play(diceRolls(NORMAL_5, SHONBEN, SHONBEN, SHONBEN), [
      { type: "placeBet", bet: 10 },
      { type: "roll" },
      { type: "roll" },
      { type: "roll" },
      { type: "roll" },
    ]);
    expect(state.player.rollsUsed).toBe(3);
    expect(state.player.hand).toEqual({ kind: "menashi" });
    expect(state.phase).toBe("result");
    expect(state.chips).toBe(90);
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
    expect(state.player.dice).toBeNull();
    expect(state.settlement).toBeNull();
  });

  it("1 ラウンドをテストだけで最後まで進められる", () => {
    const reducer = createGameReducer(diceRolls(SHONBEN, NORMAL_5, SHONBEN, PINZORO));
    let state = createInitialState();
    state = reducer(state, { type: "placeBet", bet: 20 });
    while (state.phase === "dealerTurn") {
      state = reducer(state, { type: "roll" });
    }
    while (state.phase === "playerTurn" && !canStand(state)) {
      state = reducer(state, { type: "roll" });
    }
    state = reducer(state, { type: "stand" });

    expect(state.dealer.hand).toEqual({ kind: "normal", pip: 5 });
    expect(state.player.hand).toEqual({ kind: "pinzoro" });
    expect(state.phase).toBe("result");
    expect(state.chips).toBe(200);
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
