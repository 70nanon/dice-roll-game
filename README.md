# dice-roll-game

チンチロをベースにした、ブラウザだけで遊べるダイスゲームです。

- 通信なし（Web フロントのみ）
- 公開先: https://70nanon.github.io/dice-roll-game/

## 遊び方

1. 掛け金を決めて「賭ける」（1〜所持チップ）
2. 親（CPU）が自動で振ります。役が付くまで最大 3 回
3. 「振る」で自分の番。役なしなら自動で振り直します（最大 3 回）
4. 役が付いたら「この目で勝負」か「振り直す」を選びます
5. 役を比べて清算。チップが 0 になるとゲームオーバーです

役の強さは ピンゾロ > アラシ > シゴロ > 通常の目 > ションベン > ヒフミ。倍率はピンゾロ 5 倍、アラシ 3 倍、シゴロ 2 倍、ヒフミは 2 倍払いです。詳細は [実装計画](docs/implementation-plan.md) のルール定義を見てください。

## ドキュメント

- [実装計画](docs/implementation-plan.md) — MVP のスコープ、ルール、技術選定、チケット
- [追加機能バックログ](docs/backlog.md) — MVP 外の機能候補と、それぞれの前提となる実装

## ローカル開発

```bash
npm install
npm run dev      # 開発サーバー
npm test         # ユニットテスト（vitest）
npm run lint     # ESLint
npm run build    # 型チェック + 本番ビルド
```

Node.js 22 以上を想定しています。

## 構成

| パス | 役割 |
| --- | --- |
| `src/domain/` | ルール。UI に依存しない純粋なロジックとテスト |
| `src/ui/` | 画面。ルールの再実装はせず、`src/domain` の reducer を呼ぶだけ |
| `src/test/` | テスト用のヘルパー（出目を固定する乱数） |
| `.github/workflows/` | CI（lint / test / build）と GitHub Pages デプロイ |

ルールを変更するときは `src/domain` とそのテスト、および [実装計画](docs/implementation-plan.md) のルール定義を合わせて更新します。

## デプロイ

`main` への push で GitHub Pages に自動デプロイされます。初回のみリポジトリ設定が必要です。

1. Settings → Pages → Build and deployment の Source を **GitHub Actions** にする
2. `main` へのマージ後、Actions の `Deploy to GitHub Pages` が成功したら公開 URL で確認する

ベースパスは `vite.config.ts` の `base: "/dice-roll-game/"` で指定しています。リポジトリ名を変えるときはここも変更が必要です。
