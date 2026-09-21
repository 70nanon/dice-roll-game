# dice-roll-game

チンチロをベースにした、ブラウザだけで遊べるダイスゲームです。

- 通信なし（Web フロントのみ）
- 公開先: https://70nanon.github.io/dice-roll-game/

## 現在の状態

ルール（役判定・配当・ラウンド進行）は実装済みで、テストで固定しています。遊べる画面はチケット T02 で実装します。現在の公開ページはプレースホルダです。

- [実装計画](docs/implementation-plan.md) — MVP のスコープ、ルール、技術選定、チケット（MVP は PR 3 本）
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
| `src/ui/` | 画面。現状はプレースホルダ |
| `src/test/` | テスト用のヘルパー（出目を固定する乱数） |
| `.github/workflows/` | CI（lint / test / build）と GitHub Pages デプロイ |

ルールを変更するときは `src/domain` とそのテスト、および [実装計画](docs/implementation-plan.md) のルール定義を合わせて更新します。

## デプロイ

`main` への push で GitHub Pages に自動デプロイされます。初回のみリポジトリ設定が必要です。

1. Settings → Pages → Build and deployment の Source を **GitHub Actions** にする
2. `main` へのマージ後、Actions の `Deploy to GitHub Pages` が成功したら公開 URL で確認する

ベースパスは `vite.config.ts` の `base: "/dice-roll-game/"` で指定しています。リポジトリ名を変えるときはここも変更が必要です。
