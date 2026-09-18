# スマホ表示 / PC 表示の確認方法

レスポンシブの崩れを見つけるための手段をまとめる。実装は `frontend/e2e/` と
`frontend/playwright.config.ts`。

## 端末プリセット

Playwright のプロジェクトとして 3 つ定義している。すべて Chromium で動く。

| プロジェクト | 画面サイズ | 想定 |
|---|---|---|
| `mobile-small` | 320 × 568 | iPhone SE 相当。いちばん先に崩れる幅 |
| `mobile` | 393 × 851 | 一般的なスマートフォン |
| `desktop` | 1280 × 800 | ノートPC |

## 自動チェック（CI でも走る）

```bash
cd frontend
npm run e2e
```

3 つの端末サイズすべてで次を検証する。壊れたら CI が落ちる。

- 主要ページで横スクロールが発生しないこと
- ヘッダーのロゴとメニューが重ならず、メニューが画面外に出ないこと
- 公開ページの一覧表示が 1 画面に収まること

バックエンドは不要。API は `frontend/e2e/fixtures.ts` で差し替えており、
Web フォントなど外部への通信も遮断しているので、どの環境でも同じ結果になる。

特定の端末サイズだけ実行する場合:

```bash
npm run e2e -- --project=mobile-small
```

## 目視での確認

### スクリーンショットを撮る

```bash
cd frontend
npm run e2e:shots
```

`frontend/e2e/screenshots/<端末>/` に主要画面の PNG が出る（Git 管理外）。
端末ごとの見え方を並べて比べたいときに使う。

### ブラウザを開いて操作する

```bash
cd frontend
npm run e2e:ui
```

Playwright の UI モードが開き、各テストの実行過程を DOM 付きで追える。
任意の画面をその場でいじりたいときは、開発サーバーを立てて Chrome の
DevTools のデバイスツールバー（Cmd+Shift+M）を使うのが早い。

```bash
npm run dev
```

実機で見る場合は `npm run dev -- --host` で LAN に公開し、
表示された Network の URL をスマートフォンで開く。

## Chromium の用意

初回は Playwright 用の Chromium が必要。

```bash
cd frontend
npx playwright install chromium
```

すでに別の Chromium がある環境（開発コンテナなど）では、ダウンロードせずに
そのパスを使わせることもできる。

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/path/to/chromium npm run e2e
```

## 一覧表示が1画面に収まる仕組み

公開ページの一覧表示（`?view=list`）は、スクリーンショットを撮って共有するための表示。
実装は `frontend/src/features/setlist/listLayout.ts` と
`frontend/src/features/setlist/listView.ts`。

- 目次の上端から画面下までの実測値を曲数で割って、1行の高さと文字サイズを決める
- 行の高さは 16px〜36px、文字サイズは 9px〜14px に収める。曲数が多すぎて 16px でも
  入りきらない場合はスクロールが残る
- サイトのヘッダーとフッターはこの表示では描画しない（`isListViewRoute`）

`npm run e2e` の「20曲のセットが1画面に収まる」「サイトのヘッダーとフッターを出さない」が
この挙動を守っている。曲数や上に置く情報を増やすときは、このテストが通るか確かめること。
