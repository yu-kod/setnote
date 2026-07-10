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
