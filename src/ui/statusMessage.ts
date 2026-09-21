import type { GameState } from "../domain/game";
import { MAX_ROLLS, MIN_BET } from "../domain/game";
import { handLabel } from "../domain/hand";

/** 今この画面で何が起きているか / 次に何をすればよいかを 1 文で返す。 */
export function statusMessage(state: GameState): string {
  switch (state.phase) {
    case "betting":
      return `掛け金を決めてください（${MIN_BET}〜${state.chips}）`;

    case "dealerTurn": {
      const { rollsUsed, hand, decided } = state.dealer;
      if (rollsUsed === 0) {
        return "親がサイコロを振ります";
      }
      if (!decided) {
        return `親は役なし。振り直します（残り ${MAX_ROLLS - rollsUsed} 回）`;
      }
      return hand ? `親は${handLabel(hand)}で確定` : "親の目が確定";
    }

    case "playerTurn": {
      const { rollsUsed, hand, decided } = state.player;
      if (rollsUsed === 0) {
        return "あなたの番です。サイコロを振ってください";
      }
      const remaining = MAX_ROLLS - rollsUsed;
      if (!decided) {
        return `役なし。振り直します（残り ${remaining} 回）`;
      }
      return hand
        ? `${handLabel(hand)}。この目で勝負するか、振り直せます（残り ${remaining} 回）`
        : "この目で勝負するか、振り直せます";
    }

    case "result":
      return state.settlement?.reason ?? "清算しました";

    case "matchOver":
      return `全 ${state.round} ラウンド終了。チップは ${state.chips} です`;

    case "gameOver":
      return state.settlement
        ? `${state.settlement.reason}。チップが尽きました`
        : "チップが尽きました";
  }
}
