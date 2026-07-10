# setnote 開発ルール

## 開発の進め方

実装を始める前に、必ず `/coding-standards` スキルを呼び出してアドバイスを受けること。
このスキルはコーディング規約のプロフェッショナルとして、TDD の進め方・テストの書き方・設計判断についてガイドする。

### スキルを呼ぶタイミング

- **新しい機能の実装を始める前** — 最初に書くテストの方針を聞く
- **設計判断に迷った時** — テスタビリティの観点から評価してもらう
- **リファクタリングの前** — 改善方針のアドバイスを受ける

### 絶対のルール

- 失敗するテストなしにプロダクションコードを書かない
- テストの実行確認を省略しない（Red で失敗、Green で成功を毎回確認）

## ブランチ戦略（トランクベース開発）

- **`main`** がトランク。常にデプロイ可能な状態を保つ
- 作業は **短命のフィーチャーブランチ** で行い、PR 経由で main にマージする
- ブランチ命名: `feature/xxx`, `fix/xxx`, `refactor/xxx`, `chore/xxx`
- 1つの PR は 1つの論理的な変更に対応させる（複数の無関係な変更を混ぜない）
- main への直接プッシュは禁止。CI が通った PR のみマージする
- マージ後のブランチは削除する

## 技術スタック

- Frontend: React + Vite + TypeScript
- Backend: Hono + TypeScript + DynamoDB
- Infra: Terraform (S3 + CloudFront + API Gateway + Lambda)
- テスト: Vitest（フロントエンド・バックエンド共通）

## プロジェクト構成

```
frontend/   — React SPA
backend/    — Hono API (Lambda デプロイ)
infra/      — Terraform
docs/       — 仕様書
```
