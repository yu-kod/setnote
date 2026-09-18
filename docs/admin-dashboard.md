# 管理者画面（/admin）

setnote 全体の利用状況と稼働状況を見るための画面。オーナーだけが使う。

## アクセスできる人

Cognito ユーザープールの `admin` グループに入っているユーザーだけ。

判定はアクセストークンの `cognito:groups` クレームで行う。

- サーバー側: `backend/src/middleware/admin.ts` が `admin` を含まないリクエストに 403 を返す
- フロント側: `frontend/src/features/auth/adminClaim.ts` が同じクレームを見て、ヘッダーの「管理」リンクと `/admin` ルートを出し分ける

フロント側の判定は表示の出し分けだけで、アクセス制御はサーバー側が行う。フロントを直接叩いても API が 403 を返す。

管理者の identity（メールアドレスやユーザーID）はコードにも Terraform にも置かない。
グループのメンバー管理は AWS 側で行う。

## 管理者を追加する

`admin` グループ自体は Terraform（`infra/cognito.tf`）で作ってあるので、メンバーを入れるだけ。

```sh
aws cognito-idp admin-add-user-to-group \
  --user-pool-id "$(terraform -chdir=infra output -raw cognito_user_pool_id)" \
  --username 'yukkurijyuto@gmail.com' \
  --group-name admin
```

マネジメントコンソールから「Cognito → ユーザープール → setnote-users → グループ → admin → ユーザーを追加」でも同じ。

**グループに入れた後、一度ログアウトして再ログインする必要がある。**
グループは新しく発行されたアクセストークンにしか入らないため、既存のトークンでは管理者として扱われない。

## 外すとき

```sh
aws cognito-idp admin-remove-user-from-group \
  --user-pool-id <pool-id> --username <email> --group-name admin
```

こちらは即座には効かない。アクセストークンの有効期限（1時間）が切れるまでは管理画面に入れる。

## 表示している内容

### 稼働状況（直近24時間）

CloudWatch の `GetMetricData` から取得する。

| 項目 | メトリクス |
| --- | --- |
| 呼び出し | `AWS/Lambda` Invocations (Sum) |
| エラー | `AWS/Lambda` Errors (Sum) |
| エラー率 | Errors / Invocations |
| 平均応答・最大応答 | `AWS/Lambda` Duration (Average) |
| API 5xx | `AWS/ApiGateway` 5xx (Sum) |

ステータスバッジは Lambda のエラー率と API Gateway の 5xx 率のうち悪いほうで決まる。

- 1% 以下: 正常
- 1% 超: 一部エラー
- 50% 以上: 障害

### 利用者

Cognito の `ListUsers` を全ページ辿って集計する。合計・確認済み・未確認・無効と、直近7日/30日の新規登録数、
30日間のユーザー数推移（JST の日付境界で集計）。

### コンテンツ

DynamoDB の setlists テーブルを Scan して集計する。セットリスト数・公開中・下書き・総表示回数・総いいね・作成者数。

Scan を使うのはこの管理画面の全体集計だけ。ユーザー向けのリクエストパスでは使わない。

## 必要な権限と設定

`infra/lambda.tf` で Lambda のロールに付与している。

- `cognito-idp:ListUsers`（ユーザープールに対して）
- `cloudwatch:GetMetricData`（`GetMetricData` はリソース単位の権限指定に対応していないため `Resource = "*"`）

環境変数は `API_GATEWAY_ID` を追加した。Lambda の関数名は実行環境が渡す `AWS_LAMBDA_FUNCTION_NAME` を使う。
