import { handKindLabel } from "../../domain/hand";
import type { MatchSummary } from "../../domain/stats";

type MatchSummaryPanelProps = {
  readonly summary: MatchSummary;
};

export function MatchSummaryPanel({ summary }: MatchSummaryPanelProps) {
  const { rounds, wins, losses, draws, netDelta, finalChips, maxChips, playerHands } =
    summary;

  return (
    <section className="summary">
      <h2 className="summary__title">戦績</h2>
      <dl className="summary__stats">
        <div>
          <dt>ラウンド</dt>
          <dd>{rounds}</dd>
        </div>
        <div>
          <dt>勝ち / 負け / あいこ</dt>
          <dd>
            {wins} / {losses} / {draws}
          </dd>
        </div>
        <div>
          <dt>収支</dt>
          <dd>{netDelta > 0 ? `+${netDelta}` : netDelta}</dd>
        </div>
        <div>
          <dt>最終チップ</dt>
          <dd>{finalChips}</dd>
        </div>
        <div>
          <dt>最大チップ</dt>
          <dd>{maxChips}</dd>
        </div>
      </dl>

      {playerHands.length > 0 && (
        <>
          <h3 className="summary__subtitle">自分に出た役</h3>
          <ul className="summary__hands">
            {playerHands.map(({ kind, count }) => (
              <li key={kind}>
                {handKindLabel(kind)} {count} 回
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
