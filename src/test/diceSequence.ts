import type { Dice, DieValue, RandomSource } from "../domain/dice";

/**
 * テスト用に出目を固定する乱数。`rollDie` が `Math.floor(random() * 6) + 1`
 * を使うので、各出目の中央値を返せば狙った目が出る。
 */
export function diceSequence(...values: readonly DieValue[]): RandomSource {
  let index = 0;
  return () => {
    const value = values[index];
    index += 1;
    if (value === undefined) {
      throw new Error(`乱数の呼び出しが想定回数（${values.length}）を超えました`);
    }
    return (value - 0.5) / 6;
  };
}

/** 3 個ずつの組で出目を指定する。 */
export function diceRolls(...rolls: readonly Dice[]): RandomSource {
  return diceSequence(...rolls.flat());
}
