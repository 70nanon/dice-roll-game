import { useEffect, useMemo, useReducer } from "react";
import {
  canSetMatchLength,
  canStand,
  createGameReducer,
  createInitialState,
  INITIAL_CHIPS,
  isFinalRound,
  mustReroll,
} from "../domain/game";
import { summarizeMatch } from "../domain/stats";
import { BetForm } from "./components/BetForm";
import { HistoryList } from "./components/HistoryList";
import { MatchLengthPicker } from "./components/MatchLengthPicker";
import { MatchSummaryPanel } from "./components/MatchSummaryPanel";
import { RollPanel } from "./components/RollPanel";
import { statusMessage } from "./statusMessage";

/** 自動で振り直すまでの待ち時間。出目が変わったことが分かる程度に置く。 */
const AUTO_ROLL_DELAY_MS = 700;

export function App() {
  const reducer = useMemo(() => createGameReducer(Math.random), []);
  const [state, dispatch] = useReducer(reducer, undefined, () =>
    createInitialState(),
  );

  // 親のターンは全自動。子は役なしのときだけ自動で振り直す（最初の 1 回は手動）。
  const autoRolling =
    state.phase === "dealerTurn" ||
    (state.phase === "playerTurn" && state.player.rollsUsed > 0 && mustReroll(state));

  useEffect(() => {
    if (!autoRolling) {
      return;
    }
    const timer = setTimeout(() => dispatch({ type: "roll" }), AUTO_ROLL_DELAY_MS);
    return () => clearTimeout(timer);
  }, [autoRolling, state.dealer.rollsUsed, state.player.rollsUsed]);

  const settlement = state.settlement;
  const outcomeClass = settlement ? `status status--${settlement.outcome}` : "status";
  const matchFinished = state.phase === "matchOver" || state.phase === "gameOver";
  const summary = matchFinished
    ? summarizeMatch(state.history, INITIAL_CHIPS)
    : null;

  return (
    <main className="app">
      <header className="app__header">
        <h1 className="app__title">チンチロ</h1>
        <dl className="scoreboard">
          <div>
            <dt>チップ</dt>
            <dd>{state.chips}</dd>
          </div>
          <div>
            <dt>ラウンド</dt>
            <dd>
              {state.round}
              {state.matchLength !== null && ` / ${state.matchLength}`}
            </dd>
          </div>
          <div>
            <dt>掛け金</dt>
            <dd>{state.bet === 0 ? "-" : state.bet}</dd>
          </div>
        </dl>
      </header>

      <div className={outcomeClass} role="status" aria-live="polite">
        <p className="status__message">{statusMessage(state)}</p>
        {settlement && settlement.delta !== 0 && (
          <p className="status__delta">
            {settlement.delta > 0 ? `+${settlement.delta}` : settlement.delta} チップ
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
          <>
            {canSetMatchLength(state) && (
              <MatchLengthPicker
                value={state.matchLength}
                onChange={(matchLength) =>
                  dispatch({ type: "setMatchLength", matchLength })
                }
              />
            )}
            <BetForm
              chips={state.chips}
              onSubmit={(bet) => dispatch({ type: "placeBet", bet })}
            />
          </>
        )}

        {state.phase === "playerTurn" && (
          <>
            <button
              className="button button--primary"
              type="button"
              disabled={autoRolling}
              onClick={() => dispatch({ type: "roll" })}
            >
              {state.player.rollsUsed === 0 ? "振る" : "振り直す"}
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
            {isFinalRound(state) ? "試合結果を見る" : "次のラウンド"}
          </button>
        )}

        {matchFinished && (
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
