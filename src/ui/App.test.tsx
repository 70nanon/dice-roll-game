// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Dice } from "../domain/dice";
import { diceRolls } from "../test/diceSequence";
import { App } from "./App";

const NORMAL_2: Dice = [1, 1, 2];
const NORMAL_5: Dice = [6, 6, 5];
const MENASHI: Dice = [1, 2, 4];
const PINZORO: Dice = [1, 1, 1];

/** 自動進行のタイマーを 1 回分進める。 */
async function advanceAutoRoll() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(700);
  });
}

const button = (name: string) => screen.getByRole("button", { name });

/** ヘッダーの数値は他の表示と値がぶつかるので、項目名から引く。 */
function scoreboard(label: string): string {
  const term = screen.getByText(label, { selector: "dt" });
  return term.nextElementSibling?.textContent ?? "";
}

function bet(amount: string) {
  fireEvent.change(screen.getByLabelText("掛け金"), { target: { value: amount } });
  fireEvent.click(button("賭ける"));
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("App", () => {
  it("最初はベット画面を出す", () => {
    render(<App random={diceRolls()} />);
    expect(screen.getByRole("heading", { name: "チンチロ" })).toBeDefined();
    expect(scoreboard("チップ")).toBe("100");
    expect(
      screen.getByText("掛け金を決めてください（1〜100）"),
    ).toBeDefined();
    expect(button("賭ける").getAttribute("disabled")).toBeNull();
  });

  it("所持チップを超える掛け金では賭けられない", () => {
    render(<App random={diceRolls()} />);
    fireEvent.change(screen.getByLabelText("掛け金"), { target: { value: "500" } });
    expect(screen.getByText("1〜100 の整数を入力してください")).toBeDefined();
    expect(button("賭ける").hasAttribute("disabled")).toBe(true);
  });

  it("賭けると親が自動で振り、子の手番に移る", async () => {
    render(<App random={diceRolls(NORMAL_5, NORMAL_2)} />);
    bet("10");

    expect(screen.getByText("親がサイコロを振ります")).toBeDefined();
    await advanceAutoRoll();

    // 親は役が付いた時点で子の手番に移る
    expect(screen.getByText("5の目")).toBeDefined();
    expect(
      screen.getByText("あなたの番です。サイコロを振ってください"),
    ).toBeDefined();
    expect(button("振る")).toBeDefined();
  });

  it("役なしの間は自動で振り直す", async () => {
    render(<App random={diceRolls(NORMAL_5, MENASHI, NORMAL_2)} />);
    bet("10");
    await advanceAutoRoll();

    fireEvent.click(button("振る"));
    expect(screen.getByText("役なし。振り直します（残り 2 回）")).toBeDefined();

    await advanceAutoRoll();
    expect(screen.getByText(/2の目。この目で勝負するか/)).toBeDefined();
  });

  it("この目で勝負すると清算してチップが動く", async () => {
    render(<App random={diceRolls(NORMAL_2, PINZORO)} />);
    bet("10");
    await advanceAutoRoll();

    fireEvent.click(button("振る"));
    fireEvent.click(button("この目で勝負"));

    expect(
      screen.getByText("あなたのピンゾロが親の2の目に勝ち（5倍）"),
    ).toBeDefined();
    expect(screen.getByText("+50 チップ")).toBeDefined();
    expect(scoreboard("チップ")).toBe("150");
  });

  it("次のラウンドで盤面が戻る", async () => {
    render(<App random={diceRolls(NORMAL_2, PINZORO)} />);
    bet("10");
    await advanceAutoRoll();
    fireEvent.click(button("振る"));
    fireEvent.click(button("この目で勝負"));

    fireEvent.click(button("次のラウンド"));

    expect(screen.getByText("掛け金を決めてください（1〜150）")).toBeDefined();
    expect(screen.getAllByText("まだ振っていません")).toHaveLength(2);
  });

  it("チップが尽きるとゲームオーバーになり、再開できる", async () => {
    render(<App random={diceRolls(PINZORO, NORMAL_2)} />);
    bet("100");
    await advanceAutoRoll();
    fireEvent.click(button("振る"));
    fireEvent.click(button("この目で勝負"));

    expect(screen.getByText(/チップが尽きました/)).toBeDefined();
    expect(scoreboard("チップ")).toBe("0");

    fireEvent.click(button("もう一度遊ぶ"));
    expect(screen.getByText("掛け金を決めてください（1〜100）")).toBeDefined();
  });
});
