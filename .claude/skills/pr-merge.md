---
name: pr-merge
description: >
  PRを作成し、Claude Code Actionのレビュー完了を待ち、問題なければマージする。
  実装完了後にこのスキルを呼び出すことで、レビュー→マージの流れを自動化する。
triggers:
  - PRを作成
  - マージして
  - PRにして
  - レビューしてマージ
---

# PR作成 → レビュー待機 → マージ スキル

実装完了後、以下の手順でPRのライフサイクルを管理する。

---

## 手順

### 1. コミット & プッシュ

- 未コミットの変更があればコミットする
- リモートにプッシュする: `git push -u origin <branch-name>`

### 2. PR作成

- GitHub MCP ツール (`mcp__github__create_pull_request`) でPRを作成する
- PRテンプレートがあれば従う
- タイトルは70文字以内、本文に変更の要約を含める

### 3. PRイベントの購読

- `subscribe_pr_activity` でPRのイベントを購読する
- `send_later` で60分後にセルフチェックインをスケジュールする
  - メッセージ: `PR #<number> のレビュー状況を確認してください`

### 4. レビュー待機

- Claude Code Actionからのレビューコメントが `<github-webhook-activity>` として届くのを待つ
- ターンを終了して待機する（`sleep` やポーリングはしない）

### 5. レビュー結果の判断

レビューイベントを受信したら:

#### 問題なしの場合

- Claude Code Actionが問題を報告していないことを確認する
- CIが通っていることを確認する（`mcp__github__actions_list` で確認）
- `mcp__github__merge_pull_request` でマージする
- `unsubscribe_pr_activity` で購読を解除する
- `send_later` のチェックインがあればキャンセルする

#### 問題ありの場合

- Claude Code Actionが指摘した問題を確認する
- 問題が妥当なら修正してプッシュする（新しいレビューサイクルが始まる）
- 問題が的外れならその旨をユーザーに伝え、判断を仰ぐ

### 6. セルフチェックイン（send_later 発火時）

- PRの状態を確認する（`mcp__github__pull_request_read`）
- CIの状態を確認する（`mcp__github__actions_list`）
- まだレビューが来ていなければ再度60分後にチェックインをスケジュールする
- レビュー済みで問題なければマージする
- PRがマージ済み or クローズ済みならチェックインを停止する

---

## 注意事項

- Claude Code Actionはコメントとして指摘を投稿する（正式なAPPROVEレビューではない）
- ブランチルールセットで「Require approvals」が無効であることが前提
- マージ後、ブランチは自動削除される（GitHub設定済み）
