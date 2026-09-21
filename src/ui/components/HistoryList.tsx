import { formatDice } from "../../domain/dice";
import type { RoundRecord } from "../../domain/game";
import { handLabel } from "../../domain/hand";

type HistoryListProps = {
  readonly history: readonly RoundRecord[];
};

const OUTCOME_LABEL = {
  playerWin: "勝ち",
  dealerWin: "負け",
  draw: "あいこ",
} as const;

export function HistoryList({ history }: HistoryListProps) {
  if (history.length === 0) {
    return null;
  }

  // 新しいラウンドを上に出す
  const rounds = [...history].reverse();

  return (
    <section className="history">
      <h2 className="history__title">これまでのラウンド</h2>
      <ol className="history__list">
        {rounds.map((record) => (
          <li className={`history__item history__item--${record.outcome}`} key={record.round}>
            <span className="history__round">{record.round}</span>
            <span className="history__hands">
              <span className="history__side">
                自分 {formatDice(record.playerDice)}（{handLabel(record.playerHand)}）
              </span>
              <span className="history__side">
                親 {formatDice(record.dealerDice)}（{handLabel(record.dealerHand)}）
              </span>
            </span>
            <span className="history__result">
              <span className="history__outcome">{OUTCOME_LABEL[record.outcome]}</span>
              <span className="history__delta">
                {record.delta > 0 ? `+${record.delta}` : record.delta}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
