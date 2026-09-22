import type { GameState } from "../domain/game";
import {
  dealerChipsForBattle,
  latestRoll,
  maxBet,
  MAX_ROLLS,
  MIN_BET,
} from "../domain/game";
import { handLabel } from "../domain/hand";

/** 今この画面で何が起きているか / 次に何をすればよいかを 1 文で返す。 */
export function statusMessage(state: GameState): string {
  switch (state.phase) {
    case "betting":
      return `掛け金を決めてください（${MIN_BET}〜${maxBet(state.chips, state.dealerChips)}）`;

    case "dealerTurn": {
      // 親は役が付いた時点で子の手番に移るため、このフェーズに留まるのは役なしのときだけ。
      const rollsUsed = state.dealer.rolls.length;
      if (rollsUsed === 0) {
        return "親がサイコロを振ります";
      }
      return `親は役なし。振り直します（残り ${MAX_ROLLS - rollsUsed} 回）`;
    }

    case "playerTurn": {
      const rollsUsed = state.player.rolls.length;
      if (rollsUsed === 0) {
        return "あなたの番です。サイコロを振ってください";
      }
      const remaining = MAX_ROLLS - rollsUsed;
      if (!state.player.decided) {
        return `役なし。振り直します（残り ${remaining} 回）`;
      }
      const hand = latestRoll(state.player)?.hand;
      return hand
        ? `${handLabel(hand)}。この目で勝負するか、振り直せます（残り ${remaining} 回）`
        : "この目で勝負するか、振り直せます";
    }

    case "result":
      return state.settlement?.reason ?? "清算しました";

    case "battleWon": {
      // 次の親は所持金が多い。チップは持ち越すので、どこまで来たかと次の相手を添える。
      const won = `Battle ${state.battle} の親を撃破！次の親は ${dealerChipsForBattle(state.battle + 1)} 持っています`;
      return state.settlement ? `${state.settlement.reason}。${won}` : won;
    }

    case "gameOver": {
      const over = `チップが尽きました（Battle ${state.battle} で終了）`;
      return state.settlement ? `${state.settlement.reason}。${over}` : over;
    }
  }
}
