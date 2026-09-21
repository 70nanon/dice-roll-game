import { useState } from "react";
import { isValidBet, MIN_BET } from "../../domain/game";

type BetFormProps = {
  readonly chips: number;
  readonly onSubmit: (bet: number) => void;
};

const PRESETS = [10, 50] as const;

export function BetForm({ chips, onSubmit }: BetFormProps) {
  const [input, setInput] = useState(String(Math.min(10, chips)));
  const bet = Number(input);
  const valid = isValidBet(chips, bet);

  return (
    <form
      className="bet"
      onSubmit={(event) => {
        event.preventDefault();
        if (valid) {
          onSubmit(bet);
        }
      }}
    >
      <label className="bet__label" htmlFor="bet">
        掛け金
      </label>
      <div className="bet__row">
        <input
          className="bet__input"
          id="bet"
          type="number"
          inputMode="numeric"
          min={MIN_BET}
          max={chips}
          step={1}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          aria-describedby="bet-hint"
        />
        {PRESETS.filter((preset) => preset <= chips).map((preset) => (
          <button
            className="button button--ghost"
            key={preset}
            type="button"
            onClick={() => setInput(String(preset))}
          >
            {preset}
          </button>
        ))}
        <button
          className="button button--ghost"
          type="button"
          onClick={() => setInput(String(chips))}
        >
          全額
        </button>
      </div>

      <p className="bet__hint" id="bet-hint">
        {valid
          ? `${bet} チップを賭けます`
          : `${MIN_BET}〜${chips} の整数を入力してください`}
      </p>

      <button className="button button--primary" type="submit" disabled={!valid}>
        賭ける
      </button>
    </form>
  );
}
