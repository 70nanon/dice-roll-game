import { describe, expect, it } from "vitest";
import { diceRolls } from "../test/diceSequence";
import type { Dice } from "../domain/dice";
import type { GameAction, GameState } from "../domain/game";
import { createGameReducer, createInitialState } from "../domain/game";
import { statusMessage } from "./statusMessage";

const NORMAL_2: Dice = [1, 1, 2];
const NORMAL_5: Dice = [6, 6, 5];
const MENASHI: Dice = [1, 2, 4];

function play(rolls: readonly Dice[], actions: readonly GameAction[]): GameState {
  return actions.reduce(createGameReducer(diceRolls(...rolls)), createInitialState());
}

describe("statusMessage", () => {
  it("ベット中は入力できる範囲を示す", () => {
    expect(statusMessage(createInitialState())).toBe("掛け金を決めてください（1〜100）");
  });

  it("親が役なしのときは振り直しと残り回数を示す", () => {
    const state = play([MENASHI], [{ type: "placeBet", bet: 10 }, { type: "roll" }]);
    expect(statusMessage(state)).toBe("親は役なし。振り直します（残り 2 回）");
  });

  it("子の手番の最初は操作を促す", () => {
    const state = play([NORMAL_5], [{ type: "placeBet", bet: 10 }, { type: "roll" }]);
    expect(statusMessage(state)).toBe("あなたの番です。サイコロを振ってください");
  });

  it("役が付いたら勝負と振り直しの両方を示す", () => {
    const state = play(
      [NORMAL_5, NORMAL_2],
      [{ type: "placeBet", bet: 10 }, { type: "roll" }, { type: "roll" }],
    );
    expect(statusMessage(state)).toBe(
      "2の目。この目で勝負するか、振り直せます（残り 2 回）",
    );
  });

  it("結果は清算の理由をそのまま出す", () => {
    const state = play(
      [NORMAL_2, NORMAL_5],
      [
        { type: "placeBet", bet: 10 },
        { type: "roll" },
        { type: "roll" },
        { type: "stand" },
      ],
    );
    expect(statusMessage(state)).toBe(
      "あなたの5の目が親の2の目に勝ち（1倍）",
    );
  });

  it("ベット中の上限は親のチップでも決まる", () => {
    expect(statusMessage(createInitialState(100, 30))).toBe(
      "掛け金を決めてください（1〜30）",
    );
  });

  it("撃破は何人目を倒したかと次の親のチップを添える", () => {
    const reducer = createGameReducer(diceRolls(NORMAL_2, NORMAL_5));
    let state = createInitialState(100, 10);
    state = reducer(state, { type: "placeBet", bet: 10 });
    state = reducer(state, { type: "roll" });
    state = reducer(state, { type: "roll" });
    state = reducer(state, { type: "stand" });
    expect(state.phase).toBe("battleWon");
    expect(statusMessage(state)).toBe(
      "あなたの5の目が親の2の目に勝ち（1倍）。Battle 1 の親を撃破！次の親は 150 持っています",
    );
  });

  it("ゲームオーバーはチップが尽きたことを添える", () => {
    const reducer = createGameReducer(diceRolls(NORMAL_5, NORMAL_2));
    let state = createInitialState(10);
    state = reducer(state, { type: "placeBet", bet: 10 });
    state = reducer(state, { type: "roll" });
    state = reducer(state, { type: "roll" });
    state = reducer(state, { type: "stand" });
    expect(state.phase).toBe("gameOver");
    expect(statusMessage(state)).toBe(
      "親の5の目にあなたの2の目が負け（1倍）。チップが尽きました（Battle 1 で終了）",
    );
  });
});
