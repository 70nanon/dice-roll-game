import { useEffect, useMemo, useReducer } from "react";
import type { RandomSource } from "../domain/dice";
import {
  canStand,
  createGameReducer,
  createInitialState,
  INITIAL_CHIPS,
  maxBet,
  mustReroll,
} from "../domain/game";
import { summarizeMatch } from "../domain/stats";
import { BetForm } from "./components/BetForm";
import { HistoryList } from "./components/HistoryList";
import { MatchSummaryPanel } from "./components/MatchSummaryPanel";
import { RollPanel } from "./components/RollPanel";
import { statusMessage } from "./statusMessage";

/** 自動で振り直すまでの待ち時間。出目が変わったことが分かる程度に置く。 */
const AUTO_ROLL_DELAY_MS = 700;

type AppProps = {
  /** テストから出目を固定できるようにするための差し替え口 */
  readonly random?: RandomSource;
};

export function App({ random = Math.random }: AppProps = {}) {
  const reducer = useMemo(() => createGameReducer(random), [random]);
  const [state, dispatch] = useReducer(reducer, undefined, () =>
    createInitialState(),
  );

  // 親のターンは全自動。子は役なしのときだけ自動で振り直す（最初の 1 回は手動）。
  const autoRolling =
    state.phase === "dealerTurn" ||
    (state.phase === "playerTurn" &&
      state.player.rolls.length > 0 &&
      mustReroll(state));

  useEffect(() => {
    if (!autoRolling) {
      return;
    }
    const timer = setTimeout(() => dispatch({ type: "roll" }), AUTO_ROLL_DELAY_MS);
    return () => clearTimeout(timer);
  }, [autoRolling, state.dealer.rolls.length, state.player.rolls.length]);

  const roundResult = state.settlement;
  const statusClass = roundResult ? `status status--${roundResult.outcome}` : "status";
  const battleFinished = state.phase === "battleWon" || state.phase === "gameOver";
  const summary = battleFinished
    ? summarizeMatch(state.history, INITIAL_CHIPS)
    : null;

  return (
    <main className="app">
      <header className="app__header">
        <h1 className="app__title">チンチロ</h1>
        <dl className="scoreboard">
          <div>
            <dt>自分のチップ</dt>
            <dd>{state.chips}</dd>
          </div>
          <div>
            <dt>親のチップ</dt>
            <dd>{state.dealerChips}</dd>
          </div>
          <div>
            <dt>ラウンド</dt>
            <dd>{state.round}</dd>
          </div>
          <div>
            <dt>掛け金</dt>
            <dd>{state.bet === 0 ? "-" : state.bet}</dd>
          </div>
        </dl>
      </header>

      <div className={statusClass} role="status" aria-live="polite">
        <p className="status__message">{statusMessage(state)}</p>
        {roundResult && roundResult.delta !== 0 && (
          <p className="status__delta">
            {roundResult.delta > 0 ? `+${roundResult.delta}` : roundResult.delta} チップ
          </p>
        )}
      </div>

      <div className="app__table">
        <RollPanel
          title="親（CPU）"
          roll={state.dealer}
          active={state.phase === "dealerTurn"}
        />
        <RollPanel
          title="あなた"
          roll={state.player}
          active={state.phase === "playerTurn"}
        />
      </div>

      <div className="app__actions">
        {state.phase === "betting" && (
          <BetForm
            max={maxBet(state.chips, state.dealerChips)}
            onSubmit={(bet) => dispatch({ type: "placeBet", bet })}
          />
        )}

        {state.phase === "playerTurn" && (
          <>
            <button
              className="button button--primary"
              type="button"
              disabled={autoRolling}
              onClick={() => dispatch({ type: "roll" })}
            >
              {state.player.rolls.length === 0 ? "振る" : "振り直す"}
            </button>
            {canStand(state) && (
              <button
                className="button"
                type="button"
                onClick={() => dispatch({ type: "stand" })}
              >
                この目で勝負
              </button>
            )}
          </>
        )}

        {state.phase === "result" && (
          <button
            className="button button--primary"
            type="button"
            onClick={() => dispatch({ type: "nextRound" })}
          >
            次のラウンド
          </button>
        )}

        {battleFinished && (
          <button
            className="button button--primary"
            type="button"
            onClick={() => dispatch({ type: "restart" })}
          >
            もう一度遊ぶ
          </button>
        )}
      </div>

      {summary && <MatchSummaryPanel summary={summary} />}

      <HistoryList history={state.history} />
    </main>
  );
}
