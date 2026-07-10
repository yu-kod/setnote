# setnote

DJセットリストを作成・共有するWebサービス。

## サービス概要

DJが自分のセットリストを作成・管理し、SNS（主にTwitter/X）で共有するためのサービスです。

- **管理側** — ログインしてセットリストを作成・編集・公開管理
- **閲覧側** — アカウント不要で誰でも見られる公開ページ（楽曲埋め込み・OGP対応）
- **分析側** — 曲の使用回数やリンククリック数の確認

各セットリストは独立したURL（`/s/{nanoid}`）を持ち、SNSに貼って共有する使い方を想定しています。

## 技術スタック

| レイヤー | 技術 |
|---|---|
| Frontend | React + Vite + TypeScript |
| Backend | Hono + TypeScript + DynamoDB |
| Infra | Terraform（S3 + CloudFront + API Gateway + Lambda） |
| 認証 | Amazon Cognito |
| テスト | Vitest |

## プロジェクト構成

```
frontend/   — React SPA
backend/    — Hono API（Lambda デプロイ）
infra/      — Terraform
docs/       — 仕様書
```

## 開発

### セットアップ

```bash
# フロントエンド
cd frontend
npm install
npm run dev

# バックエンド
cd backend
npm install
npm run dev
```

### テスト

```bash
# フロントエンド
cd frontend
npm test

# バックエンド
cd backend
npm test
```

### ブランチ戦略

トランクベース開発を採用しています。

- `main` が常にデプロイ可能なトランク
- 作業は短命のフィーチャーブランチで行い、PR経由でmainにマージ
- ブランチ命名: `feature/xxx`, `fix/xxx`, `refactor/xxx`, `chore/xxx`

## ライセンス

Private
