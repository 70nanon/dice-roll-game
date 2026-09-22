// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
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

function element(selector: string): HTMLElement {
  const found = document.querySelector<HTMLElement>(selector);
  if (found === null) {
    throw new Error(`${selector} が見つかりません`);
  }
  return found;
}

/**
 * dt / dd の並びから項目名で値を引く。ヘッダーと戦績で同じ項目名（ラウンド）を
 * 使っているので、どちらを見るかを指定する。
 */
function statValue(rootSelector: string, label: string): string {
  const term = within(element(rootSelector)).getByText(label, { selector: "dt" });
  return term.nextElementSibling?.textContent ?? "";
}

const scoreboard = (label: string) => statValue(".scoreboard", label);
const summaryStat = (label: string) => statValue(".summary__stats", label);

/** 見出しからパネルを特定して、投ごとの出目履歴を読む。出ていなければ null。 */
function panelLog(title: string): readonly string[] | null {
  const panel = screen.getByRole("heading", { name: title }).closest(".panel");
  if (panel === null) {
    throw new Error(`${title} のパネルが見つかりません`);
  }
  const log = panel.querySelector(".panel__log");
  if (log === null) {
    return null;
  }
  return Array.from(log.querySelectorAll("li"), (item) =>
    Array.from(item.querySelectorAll("span"), (span) => span.textContent).join(" "),
  );
}

function bet(amount: string) {
  fireEvent.change(screen.getByLabelText("掛け金"), { target: { value: amount } });
  fireEvent.click(button("賭ける"));
}

/** 親 5 の目・子 2 の目で 1 ラウンド清算する（子が掛け金と同額を失う）。 */
async function playLosingRound(amount: string) {
  bet(amount);
  await advanceAutoRoll();
  fireEvent.click(button("振る"));
  fireEvent.click(button("この目で勝負"));
}

/** `playLosingRound` を指定回数ぶん回せる出目。 */
function losingRolls(rounds: number) {
  return diceRolls(
    ...Array.from({ length: rounds }, () => [NORMAL_5, NORMAL_2] as const).flat(),
  );
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
    expect(scoreboard("自分のチップ")).toBe("100");
    expect(scoreboard("親のチップ")).toBe("100");
    expect(
      screen.getByText("掛け金を決めてください（1〜100）"),
    ).toBeDefined();
    expect(button("賭ける").getAttribute("disabled")).toBeNull();
  });

  it("賭けられる上限を超えると賭けられない", () => {
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

  it("振り直すと投ごとの出目が並ぶ", async () => {
    render(<App random={diceRolls(NORMAL_5, MENASHI, NORMAL_2)} />);
    bet("10");
    await advanceAutoRoll();

    // 1 投しかしていない親には履歴を出さない
    expect(panelLog("親（CPU）")).toBeNull();

    fireEvent.click(button("振る"));
    await advanceAutoRoll();

    expect(panelLog("あなた")).toEqual([
      "1 投目 1-2-4 目無し",
      "2 投目 1-1-2 2の目",
    ]);
  });

  it("次のラウンドに入ると投ごとの出目は消える", async () => {
    render(<App random={diceRolls(NORMAL_5, MENASHI, NORMAL_2)} />);
    bet("10");
    await advanceAutoRoll();
    fireEvent.click(button("振る"));
    await advanceAutoRoll();
    fireEvent.click(button("この目で勝負"));
    fireEvent.click(button("次のラウンド"));

    expect(panelLog("あなた")).toBeNull();
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
    expect(scoreboard("自分のチップ")).toBe("150");
    expect(scoreboard("親のチップ")).toBe("50");
  });

  it("次のラウンドで盤面が戻る", async () => {
    render(<App random={diceRolls(NORMAL_2, PINZORO)} />);
    bet("10");
    await advanceAutoRoll();
    fireEvent.click(button("振る"));
    fireEvent.click(button("この目で勝負"));

    fireEvent.click(button("次のラウンド"));

    // 上限は自分（150）ではなく、親の残り（50）で決まる
    expect(screen.getByText("掛け金を決めてください（1〜50）")).toBeDefined();
    expect(screen.getAllByText("まだ振っていません")).toHaveLength(2);
  });

  it("チップが尽きるとゲームオーバーになり、再開できる", async () => {
    render(<App random={diceRolls(PINZORO, NORMAL_2)} />);
    bet("100");
    await advanceAutoRoll();
    fireEvent.click(button("振る"));
    fireEvent.click(button("この目で勝負"));

    expect(screen.getByText(/チップが尽きました/)).toBeDefined();
    expect(scoreboard("自分のチップ")).toBe("0");

    expect(screen.getByRole("heading", { name: "戦績" })).toBeDefined();
    expect(summaryStat("勝ち / 負け / あいこ")).toBe("0 / 1 / 0");
    expect(summaryStat("収支")).toBe("-100");

    fireEvent.click(button("もう一度遊ぶ"));
    expect(screen.getByText("掛け金を決めてください（1〜100）")).toBeDefined();
  });
});

describe("親の撃破と連戦", () => {
  /** 親のチップ 100 に対して 100 を賭けて勝ち、1 ラウンドで撃破する。 */
  async function defeatDealer() {
    bet("100");
    await advanceAutoRoll();
    fireEvent.click(button("振る"));
    fireEvent.click(button("この目で勝負"));
  }

  it("親のチップを削り切ると撃破になり、この Battle の戦績が出る", async () => {
    render(<App random={diceRolls(NORMAL_2, NORMAL_5)} />);
    await defeatDealer();

    expect(screen.getByText(/Battle 1 の親を撃破！/)).toBeDefined();
    expect(scoreboard("自分のチップ")).toBe("200");
    expect(scoreboard("親のチップ")).toBe("0");
    expect(screen.queryByRole("button", { name: "次のラウンド" })).toBeNull();
    expect(screen.queryByRole("button", { name: "もう一度遊ぶ" })).toBeNull();

    expect(summaryStat("勝ち / 負け / あいこ")).toBe("1 / 0 / 0");
    expect(summaryStat("収支")).toBe("+100");
  });

  it("次の親へ進むとチップを持ち越し、親のチップが増える", async () => {
    render(<App random={diceRolls(NORMAL_2, NORMAL_5)} />);
    await defeatDealer();

    fireEvent.click(button("次の親と戦う"));

    expect(scoreboard("Battle")).toBe("2");
    expect(scoreboard("自分のチップ")).toBe("200");
    expect(scoreboard("親のチップ")).toBe("150");
    expect(scoreboard("ラウンド")).toBe("1");
    // 上限は自分（200）ではなく親の 150 で決まる
    expect(screen.getByText("掛け金を決めてください（1〜150）")).toBeDefined();
    // 履歴と戦績は親ごとに数え直す
    expect(screen.queryByText("これまでのラウンド")).toBeNull();
    expect(screen.queryByRole("heading", { name: "戦績" })).toBeNull();
  });

  it("持ち越したチップで負けた Battle の戦績は、その Battle の開始チップから数える", async () => {
    render(<App random={diceRolls(NORMAL_2, NORMAL_5, PINZORO, NORMAL_2)} />);
    await defeatDealer();
    fireEvent.click(button("次の親と戦う"));

    // Battle 2 を 200 で始めて、150 を賭けて親のピンゾロに負ける
    bet("150");
    await advanceAutoRoll();
    fireEvent.click(button("振る"));
    fireEvent.click(button("この目で勝負"));

    expect(screen.getByText(/チップが尽きました（Battle 2 で終了）/)).toBeDefined();
    expect(scoreboard("自分のチップ")).toBe("0");
    expect(summaryStat("収支")).toBe("-200");
    expect(summaryStat("最大チップ")).toBe("200");

    fireEvent.click(button("もう一度遊ぶ"));
    expect(scoreboard("Battle")).toBe("1");
    expect(scoreboard("自分のチップ")).toBe("100");
    expect(scoreboard("親のチップ")).toBe("100");
  });
});

describe("ラウンド履歴", () => {
  it("清算したラウンドが新しい順に履歴へ積まれる", async () => {
    render(<App random={losingRolls(2)} />);
    expect(screen.queryByText("これまでのラウンド")).toBeNull();

    await playLosingRound("10");
    fireEvent.click(button("次のラウンド"));
    await playLosingRound("20");

    const rounds = within(element(".history__list"))
      .getAllByRole("listitem")
      .map((item) => item.textContent);
    expect(rounds).toHaveLength(2);
    expect(rounds[0]).toContain("-20");
    expect(rounds[1]).toContain("自分 1-1-2（2の目）");
    expect(rounds[1]).toContain("親 6-6-5（5の目）");
    expect(rounds[1]).toContain("-10");
  });
});
