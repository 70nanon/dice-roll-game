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

describe("試合の長さと履歴", () => {
  it("試合の長さを選ぶとラウンド表示に反映される", () => {
    render(<App random={diceRolls()} />);
    expect(button("無制限").getAttribute("aria-pressed")).toBe("true");
    expect(scoreboard("ラウンド")).toBe("1");

    fireEvent.click(button("5 ラウンド"));

    expect(button("5 ラウンド").getAttribute("aria-pressed")).toBe("true");
    expect(button("無制限").getAttribute("aria-pressed")).toBe("false");
    expect(scoreboard("ラウンド")).toBe("1 / 5");
  });

  it("1 ラウンド終えると試合の長さは変えられなくなる", async () => {
    render(<App random={losingRolls(1)} />);
    fireEvent.click(button("5 ラウンド"));
    await playLosingRound("10");
    fireEvent.click(button("次のラウンド"));

    expect(screen.queryByText("試合の長さ")).toBeNull();
    expect(scoreboard("ラウンド")).toBe("2 / 5");
  });

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

  it("規定ラウンドを終えると戦績を出し、直前のラウンドの増減は消す", async () => {
    render(<App random={losingRolls(5)} />);
    fireEvent.click(button("5 ラウンド"));

    for (let round = 1; round < 5; round += 1) {
      await playLosingRound("10");
      fireEvent.click(button("次のラウンド"));
    }
    await playLosingRound("10");

    // 最終ラウンドの清算後はまだラウンドの結果を出している
    expect(screen.getByText("-10 チップ")).toBeDefined();

    fireEvent.click(button("試合結果を見る"));

    expect(screen.getByText("全 5 ラウンド終了。チップは 50 です")).toBeDefined();
    // ラウンドの増減は試合の収支と読み違えられるので、試合終了では出さない
    expect(screen.queryByText("-10 チップ")).toBeNull();

    expect(screen.getByRole("heading", { name: "戦績" })).toBeDefined();
    expect(summaryStat("勝ち / 負け / あいこ")).toBe("0 / 5 / 0");
    expect(summaryStat("収支")).toBe("-50");
    expect(summaryStat("最終チップ")).toBe("50");
    expect(
      within(element(".summary__hands")).getByText("通常の目 5 回"),
    ).toBeDefined();
  });

  it("試合をやり直しても選んだラウンド数は残る", async () => {
    render(<App random={losingRolls(5)} />);
    fireEvent.click(button("5 ラウンド"));

    for (let round = 1; round < 5; round += 1) {
      await playLosingRound("10");
      fireEvent.click(button("次のラウンド"));
    }
    await playLosingRound("10");
    fireEvent.click(button("試合結果を見る"));

    fireEvent.click(button("もう一度遊ぶ"));

    expect(scoreboard("ラウンド")).toBe("1 / 5");
    expect(scoreboard("チップ")).toBe("100");
    expect(screen.queryByText("これまでのラウンド")).toBeNull();
    expect(screen.queryByText("戦績")).toBeNull();
  });
});
