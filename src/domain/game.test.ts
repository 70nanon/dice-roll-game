import { describe, expect, it } from "vitest";
import { diceRolls } from "../test/diceSequence";
import type { GameAction, GameState } from "./game";
import {
  canRoll,
  canSetMatchLength,
  canStand,
  createGameReducer,
  createInitialState,
  isFinalRound,
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
    expect(state.dealer.rollsUsed).toBe(2);
    expect(state.dealer.hand).toEqual({ kind: "normal", pip: 5 });
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

    expect(state.dealer.hand).toEqual({ kind: "normal", pip: 5 });
    expect(state.player.hand).toEqual({ kind: "pinzoro" });
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

describe("ラウンド数（試合制）", () => {
  it("既定は無制限で、規定ラウンドでは終わらない", () => {
    const initial = createInitialState();
    expect(initial.matchLength).toBeNull();
    expect(isFinalRound(initial)).toBe(false);
  });

  it("1 ラウンドも終えていなければラウンド数を変えられる", () => {
    const state = play(diceRolls(), [{ type: "setMatchLength", matchLength: 5 }]);
    expect(state.matchLength).toBe(5);
    expect(canSetMatchLength(state)).toBe(true);
  });

  it("ラウンドが終わったあとはラウンド数を変えられない", () => {
    const afterRound = play(diceRolls(NORMAL_2, NORMAL_5), [
      { type: "placeBet", bet: 10 },
      { type: "roll" },
      { type: "roll" },
      { type: "stand" },
      { type: "nextRound" },
    ]);
    expect(canSetMatchLength(afterRound)).toBe(false);
    expect(
      play(diceRolls(), [{ type: "setMatchLength", matchLength: 10 }], afterRound),
    ).toEqual(afterRound);
  });

  it("規定ラウンドを終えたら試合終了になる", () => {
    const state = play(
      diceRolls(NORMAL_2, NORMAL_5, NORMAL_2, NORMAL_5),
      [
        { type: "placeBet", bet: 10 },
        { type: "roll" },
        { type: "roll" },
        { type: "stand" },
        { type: "nextRound" },
        { type: "placeBet", bet: 10 },
        { type: "roll" },
        { type: "roll" },
        { type: "stand" },
        { type: "nextRound" },
      ],
      createInitialState(100, 2),
    );
    expect(state.phase).toBe("matchOver");
    expect(state.round).toBe(2);
    expect(state.history).toHaveLength(2);
    // 試合結果の画面で見せるので、最後の清算は残したまま
    expect(state.settlement).not.toBeNull();
  });

  it("試合終了から再開するとラウンド数の設定を引き継ぐ", () => {
    const over = play(
      diceRolls(NORMAL_2, NORMAL_5),
      [
        { type: "placeBet", bet: 10 },
        { type: "roll" },
        { type: "roll" },
        { type: "stand" },
        { type: "nextRound" },
      ],
      createInitialState(100, 1),
    );
    expect(over.phase).toBe("matchOver");
    const restarted = play(diceRolls(), [{ type: "restart" }], over);
    expect(restarted).toEqual(createInitialState(100, 1));
  });

  it("規定ラウンドの前に破産したらゲームオーバーを優先する", () => {
    const state = play(
      diceRolls(PINZORO, NORMAL_2),
      [
        { type: "placeBet", bet: 10 },
        { type: "roll" },
        { type: "roll" },
        { type: "stand" },
      ],
      createInitialState(10, 5),
    );
    expect(state.phase).toBe("gameOver");
    expect(state.history).toHaveLength(1);
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
