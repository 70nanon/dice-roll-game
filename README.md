# dice-roll-game

チンチロをベースにした、ブラウザだけで遊べるダイスゲームです。

- 通信なし（Web フロントのみ）
- 公開先: Cloudflare Pages（`main` が本番。PR / 開発ブランチは Preview Deployment）

## 遊び方

1. 最初のベット前に試合の長さを選べます（無制限 / 5 / 10 ラウンド。既定は無制限）
2. 掛け金を決めて「賭ける」（1〜所持チップ）
3. 親（CPU）が自動で振ります。役が付くまで最大 3 回
4. 「振る」で自分の番。役なしなら自動で振り直します（最大 3 回）
5. 役が付いたら「この目で勝負」か「振り直す」を選びます
6. 役を比べて清算。ラウンドの履歴は画面下に残ります
7. チップが 0 になるとゲームオーバー。ラウンド数を決めていれば、規定数を終えた時点で戦績が出ます

役の強さは ピンゾロ > アラシ > シゴロ > 通常の目 > 目無し > ヒフミ。倍率はピンゾロ 5 倍、アラシ 3 倍、シゴロ 2 倍、ヒフミは 2 倍払いです。詳細は [実装計画](docs/implementation-plan.md) のルール定義を見てください。

## ドキュメント

- [ローグライト化ロードマップ](docs/roadmap.md) — 今後どの順で発展させるか（Phase 0〜5）
- [実装計画](docs/implementation-plan.md) — MVP のスコープ、ルール定義、技術選定、チケット
- [追加機能バックログ](docs/backlog.md) — ロードマップ外の機能候補と、それぞれの前提となる実装

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
| `.github/workflows/` | CI（lint / test / build）。デプロイは Cloudflare Pages の Git 連携 |

ルールを変更するときは `src/domain` とそのテスト、および [実装計画](docs/implementation-plan.md) のルール定義を合わせて更新します。

## デプロイ

ホスティングは Cloudflare Pages です。GitHub リポジトリを Cloudflare に接続すると、次の流れになります。

1. ブランチで開発する
2. Pull Request を作る → Preview Deployment が作成される
3. Preview URL でブラウザ確認する
4. `main` へマージする → 本番（Production）へ反映される

### ビルド設定（Cloudflare Pages）

| 項目 | 値 |
| --- | --- |
| Production branch | `main` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node.js | 22（リポジトリの `.nvmrc`） |

SPA 向けに `public/_redirects` で未知のパスを `index.html` へ返しています。Vite の `base` は `/` です。

初回だけ Cloudflare Dashboard で GitHub 連携が必要です。手順は移行 PR の説明を見てください。GitHub Actions の CI（lint / test / build）はデプロイとは別に残しています。
