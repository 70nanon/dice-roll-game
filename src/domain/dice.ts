export type DieValue = 1 | 2 | 3 | 4 | 5 | 6;

/** チンチロは常に 3 個まとめて振る。個別キープはしない。 */
export type Dice = readonly [DieValue, DieValue, DieValue];

/** 0 以上 1 未満を返す乱数。テストから差し替えられるように引数で受け取る。 */
export type RandomSource = () => number;

export const DICE_COUNT = 3;

export function rollDie(random: RandomSource): DieValue {
  const value = Math.floor(random() * 6) + 1;
  if (value < 1 || value > 6) {
    throw new Error(`乱数が範囲外の出目を返しました: ${value}`);
  }
  return value as DieValue;
}

export function rollDice(random: RandomSource): Dice {
  return [rollDie(random), rollDie(random), rollDie(random)];
}

export function formatDice(dice: Dice): string {
  return dice.join("-");
}
