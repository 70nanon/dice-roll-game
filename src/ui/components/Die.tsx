import type { DieValue } from "../../domain/dice";

type PipPosition = readonly [number, number];

/** 100x100 の面に打つ点の座標。 */
const PIP_LAYOUT: Record<DieValue, readonly PipPosition[]> = {
  1: [[50, 50]],
  2: [
    [30, 30],
    [70, 70],
  ],
  3: [
    [30, 30],
    [50, 50],
    [70, 70],
  ],
  4: [
    [30, 30],
    [70, 30],
    [30, 70],
    [70, 70],
  ],
  5: [
    [30, 30],
    [70, 30],
    [50, 50],
    [30, 70],
    [70, 70],
  ],
  6: [
    [30, 30],
    [70, 30],
    [30, 50],
    [70, 50],
    [30, 70],
    [70, 70],
  ],
};

type DieProps = {
  readonly value: DieValue;
};

export function Die({ value }: DieProps) {
  return (
    <svg
      className="die"
      viewBox="0 0 100 100"
      role="img"
      aria-label={`${value}の目`}
    >
      <rect
        className="die__face"
        x="2"
        y="2"
        width="96"
        height="96"
        rx="16"
        ry="16"
      />
      {PIP_LAYOUT[value].map(([x, y]) => (
        <circle
          // 1 の目だけ赤くして、ピンゾロを見分けやすくする
          className={value === 1 ? "die__pip die__pip--one" : "die__pip"}
          key={`${x}-${y}`}
          cx={x}
          cy={y}
          r="9"
        />
      ))}
    </svg>
  );
}

/** まだ振っていないときの空の面。 */
export function EmptyDie() {
  return (
    <svg className="die die--empty" viewBox="0 0 100 100" aria-hidden="true">
      <rect x="2" y="2" width="96" height="96" rx="16" ry="16" />
    </svg>
  );
}
