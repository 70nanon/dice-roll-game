import { DICE_COUNT, formatDice } from "../../domain/dice";
import { latestRoll, MAX_ROLLS } from "../../domain/game";
import type { RollState } from "../../domain/game";
import { handLabel } from "../../domain/hand";
import { Die, EmptyDie } from "./Die";

type RollPanelProps = {
  readonly title: string;
  readonly roll: RollState;
  /** 今この人の手番かどうか */
  readonly active: boolean;
};

export function RollPanel({ title, roll, active }: RollPanelProps) {
  const rollsUsed = roll.rolls.length;
  const latest = latestRoll(roll);

  return (
    <section className={active ? "panel panel--active" : "panel"}>
      <header className="panel__header">
        <h2 className="panel__title">{title}</h2>
        <span className="panel__rolls">
          {rollsUsed} / {MAX_ROLLS} 回
        </span>
      </header>

      {/* 出目が変わるたびに key が変わり、軽い表示の切り替えが起きる */}
      <div className="panel__dice" key={rollsUsed}>
        {latest
          ? latest.dice.map((value, index) => <Die key={index} value={value} />)
          : Array.from({ length: DICE_COUNT }, (_, index) => (
              <EmptyDie key={index} />
            ))}
      </div>

      <p className="panel__hand">
        {latest ? handLabel(latest.hand) : "まだ振っていません"}
      </p>

      {/* 振り直したときだけ、このラウンドで何を振ってきたかを出す */}
      {rollsUsed > 1 && (
        <ol className="panel__log">
          {roll.rolls.map((entry, index) => (
            <li className="panel__logItem" key={index}>
              <span className="panel__logRound">{index + 1} 投目</span>
              <span className="panel__logDice">{formatDice(entry.dice)}</span>
              <span className="panel__logHand">{handLabel(entry.hand)}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
