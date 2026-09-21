import { INITIAL_CHIPS, MAX_ROLLS } from "../domain/game";

/**
 * プレースホルダ画面。遊べる UI はチケット T02 で実装する。
 * ここではビルドと公開の経路が通っていることだけを確認する。
 */
export function App() {
  return (
    <main className="placeholder">
      <h1>チンチロ</h1>
      <p className="placeholder__lead">
        ブラウザだけで遊べるチンチロです。ゲーム画面は準備中です。
      </p>
      <dl className="placeholder__rules">
        <div>
          <dt>初期チップ</dt>
          <dd>{INITIAL_CHIPS}</dd>
        </div>
        <div>
          <dt>1 ラウンドの振り回数</dt>
          <dd>最大 {MAX_ROLLS} 回</dd>
        </div>
        <div>
          <dt>役</dt>
          <dd>ピンゾロ / アラシ / シゴロ / 通常の目 / ヒフミ / ションベン</dd>
        </div>
      </dl>
      <p className="placeholder__note">
        ルールの判定・配当・進行は実装済みです（<code>src/domain</code>）。
      </p>
    </main>
  );
}
