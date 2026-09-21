import type { MatchLength } from "../../domain/game";
import { MATCH_LENGTH_OPTIONS } from "../../domain/game";

type MatchLengthPickerProps = {
  readonly value: MatchLength;
  readonly onChange: (matchLength: MatchLength) => void;
};

function matchLengthLabel(matchLength: MatchLength): string {
  return matchLength === null ? "無制限" : `${matchLength} ラウンド`;
}

/** 1 ラウンドも終えていない間だけ出す、試合の長さの選択。 */
export function MatchLengthPicker({ value, onChange }: MatchLengthPickerProps) {
  return (
    <fieldset className="match-length">
      <legend className="match-length__legend">試合の長さ</legend>
      <div className="match-length__options">
        {MATCH_LENGTH_OPTIONS.map((option) => {
          const selected = option === value;
          return (
            <button
              className={selected ? "button button--ghost is-selected" : "button button--ghost"}
              key={matchLengthLabel(option)}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option)}
            >
              {matchLengthLabel(option)}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
