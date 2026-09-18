# 依存ライブラリの自動更新

ライブラリ更新の当て忘れで本番が動かなくなることを防ぐため、更新の検知から適用までを自動化している。

## 全体の流れ

```
毎週月曜 09:00 (JST)
  └─ Dependabot が更新を検知して PR を作成
       ├─ patch / minor → 系統ごとに 1 本にまとめた PR
       ├─ major        → 1 ライブラリ 1 PR
       └─ major のうち peer dependency で結ばれた組 → その組で 1 本

  └─ deps-label.yml が PR を分類してラベルを付ける
       ├─ patch / minor → deps-auto
       └─ major        → deps-major

  └─ ci.yml が実行される（vitest カバレッジ100% / eslint / prettier / tsc / build）
       ├─ 成功 → ci-gate.yml
       │           ├─ deps-auto  → 自動マージ → 本番デプロイ
       │           └─ deps-major → マージせず保留。PR にコメントして人手の確認を待つ
       └─ 失敗 → ci-gate.yml が Claude に自動修復を依頼（1 PR につき 1 回まで）
                  修復後に CI が通れば自動マージ、再度失敗すれば人手の確認へ
```

## 対象

`.github/dependabot.yml` で 4 系統を見ている。

| 系統           | ディレクトリ               |
| -------------- | -------------------------- |
| frontend       | `/frontend`                |
| backend        | `/backend`                 |
| ルート         | `/`                        |
| GitHub Actions | `/` (`.github/workflows/`) |

Terraform のプロバイダは対象外。`.terraform.lock.hcl` が gitignore されていてバージョンが固定されていないため、まず固定するところからになる。

## peer dependency で結ばれたライブラリはまとめて上げる

major を 1 ライブラリ 1 PR で出すと、互いに peer dependency を張っている組が別々の PR に割れる。片方だけ上げた状態は `npm ci` が ERESOLVE で解決できず、その PR は単独では絶対に緑にならない。

```
npm error Found: vitest@5.0.0
npm error Could not resolve dependency:
npm error peer vitest@"4.1.10" from @vitest/coverage-v8@4.1.10
```

`.github/dependabot.yml` の `groups` で、次の組は major でも 1 本の PR にまとめている。

| 組             | 対象                                                     | 理由                                              |
| -------------- | -------------------------------------------------------- | ------------------------------------------------- |
| frontend-react | `react`, `react-dom`, `@types/react`, `@types/react-dom` | react と react-dom は互いに peer dependency       |
| frontend-vite  | `vite`, `@vitejs/*`, `vitest`, `@vitest/*`               | vite 8 は `@vitejs/plugin-react` 5 以上を要求する |
| backend-vitest | `vitest`, `@vitest/*`                                    | `@vitest/coverage-v8` は vitest と完全一致が必要  |

新しく peer dependency で縛られた組が出てきたら、ここに足す。目印は「CI の失敗が `npm ci` の ERESOLVE で、相手のバージョンが PR に含まれていない」こと。

`open-pull-requests-limit` は frontend / backend とも 10 にしている。5 のままだと打ち切りに当たった更新が PR にすらならず、存在に気づけない（実際に `@vitejs/plugin-react` の major がこれで出てこなかった）。

## 保留している更新

| ライブラリ   | 保留理由                                                                                                                                                                                                                                   |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `typescript` | major を `ignore` 指定。typescript-eslint が TS 7 に未対応で、上げると `eslint` が起動時にエラーで落ちる（[typescript-eslint#10940](https://github.com/typescript-eslint/typescript-eslint/issues/10940)）。対応が入ったら `ignore` を消す |

## なぜ major だけ自動マージしないのか

CI を安全弁として使えるのは、壊れたときにテストが落ちる範囲に限られる。メジャー更新には、型もテストも通るのに挙動だけが変わるものがある（React の StrictMode まわりの挙動、Tailwind の設定形式の変更など）。ここは人が動かして確認するしかないので、`deps-major` ラベルが付いた PR は ci-gate がマージを止める。

patch / minor はカバレッジ 100% のテストで受け止められる前提で、自動マージを許している。

### 既知の限界

0.x 系のライブラリ（例: `esbuild@^0.24.0`）は、`0.24` → `0.28` のような破壊的変更を伴う更新でも Dependabot は `semver-minor` として扱う。この場合は自動マージの対象になる。CI が落ちれば止まるが、挙動だけ変わる破壊的変更は素通りしうる。

## lockfile を厳密に適用する

CI・デプロイとも `npm ci` を使い、`package-lock.json` のとおりに依存を入れる。

以前は `npm install` だったため、lockfile と食い違った依存ツリーでテストが通ってしまい、「CI が緑」が「本番に入るのと同じ依存ツリーで緑」を意味していなかった。実際に backend の lockfile は壊れており、`npm ci` が通らない状態だった（`tsx` と `vite` が要求する `esbuild ~0.28` がロックに入っていなかった）。

`npm ci` にしたことで、lockfile が壊れていれば CI がその場で落ちる。

## CI が 1 つも走らないまま通ることへの対策

`ci.yml` の paths-filter は、以前は `frontend/` `backend/` `infra/` しか見ていなかった。そのためルートの `package.json` や `.github/workflows/` だけを変える PR ではテストジョブが全部スキップされ、CI が success になって ci-gate がノーチェックでマージしていた。

現在は、ルートの `package.json` / `package-lock.json` と `.github/workflows/**` を frontend / backend 両方のフィルタに含めている。

## 人手でやること

- `deps-major` ラベルの付いた PR を確認してマージする（動かして確認する）
- Claude の自動修復が 2 回目も失敗した PR（`ci-auto-fix-attempted` ラベル付き）を確認する
