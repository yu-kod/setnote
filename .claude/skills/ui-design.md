---
name: ui-design
description: >
  UIデザインのベストプラクティスとこのプロジェクト固有のデザインルール。
  フロントエンドのUI実装・レビュー・改善時に参照する。
triggers:
  - UIを改善
  - デザイン
  - スタイル
  - CSS
  - 見た目
  - レイアウト
---

# UIデザインガイド

setnote のフロントエンドUI実装に適用するデザインルール。
ダークテーマ・モバイルファーストの DJ 向けセットリスト共有サービス。

---

## 1. デザイントークン（CSS カスタムプロパティ）

### カラーパレット

`:root` で定義済みの変数を必ず使う。ハードコードされた色値は禁止。

| 変数 | 用途 |
|---|---|
| `--bg` (#0f0f1a) | ページ背景 |
| `--bg-card` (#1a1a2e) | カード・セクション背景 |
| `--bg-input` (#16213e) | 入力フィールド背景 |
| `--primary` (#e94560) | プライマリアクション |
| `--primary-hover` (#ff6b81) | ホバー・エラーテキスト |
| `--text` (#eaeaea) | メインテキスト |
| `--text-muted` (#999) | 補助テキスト・ラベル |
| `--border` (#2a2a4a) | ボーダー |
| `--accent` (#533483) | グラデーション用 |
| `--success` (#00d2d3) | 成功状態 |
| `--radius` (12px) | 角丸 |

### コントラスト比（実測値）

| 組み合わせ | 比率 | WCAG AA |
|---|---|---|
| `--text` (#eaeaea) on `--bg` (#0f0f1a) | 14.4:1 | PASS |
| `--text` (#eaeaea) on `--bg-card` (#1a1a2e) | 12.9:1 | PASS |
| `--text-muted` (#999) on `--bg` (#0f0f1a) | 6.0:1 | PASS |
| `--text-muted` (#999) on `--bg-card` (#1a1a2e) | 5.4:1 | PASS |
| `--primary` (#e94560) on `--bg` (#0f0f1a) | 5.0:1 | PASS |
| `--primary` (#e94560) on `--bg-card` (#1a1a2e) | 4.5:1 | ギリギリ PASS |

### 追加推奨トークン

新規追加時は `:root` にまとめる。

```css
:root {
  /* スペーシング (4px基準) */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;

  /* フォントサイズ */
  --text-xs: 11px;
  --text-sm: 13px;
  --text-base: 16px;
  --text-lg: 20px;
  --text-xl: 24px;

  /* トランジション */
  --duration-fast: 100ms;
  --duration-normal: 150ms;
  --duration-slow: 200ms;
}
```

---

## 2. ダークテーマのルール

### 背景の階層（Surface Elevation）

ダークテーマでは影が見えにくいため、より明るい背景色で「浮き」を表現する。

```
--bg (#0f0f1a)  →  --bg-card (#1a1a2e)  →  --bg-input (#16213e)
 最背面              カード・セクション        入力・モーダル
```

- モーダルはカードよりさらに高い階層 — `--bg-card` より少し明るい背景を検討
- ホバー時はカード背景を 1段明るくする（例: `#24242e`）
- `box-shadow` より `border` で区切る方がダークテーマでは効果的

### 避けるべきこと

- 純白（#fff）テキスト — 眩しい。`--text`（#eaeaea）を使う
- 純黒（#000）背景 — コントラストが強すぎ。`--bg`（#0f0f1a）を使う
- 彩度の高い大面積の色 — 目が疲れる。アクセントカラーは小面積に限定
- 白テキストのボタン上の `--primary` — コントラスト比 4.97:1 なのでギリギリOK。ボタン文字は白のまま可

---

## 3. タイポグラフィ

### フォント

- ファミリー: `"Noto Sans JP", sans-serif`
- 本文: **16px**（iOS Safari ズーム防止のため入力フィールドも 16px 以上必須）

### サイズスケール

| 用途 | サイズ | weight | line-height |
|---|---|---|---|
| ページタイトル (h1) | 28px (mobile: 24px) | 700 | 1.3 |
| セクション見出し (h2) | 20px | 700 | 1.3 |
| カード見出し (h3) | 16px | 600 | 1.3 |
| 本文 | 16px | 400 | 1.5 |
| 補助テキスト | 14px | 400 | 1.5 |
| ラベル・キャプション | 13px | 400 | 1.4 |
| バッジ | 11px | 700 | 1 |

---

## 4. スペーシング

### 基本単位: 4px

すべてのスペーシングは 4px の倍数を使う。

| 値 | 用途 |
|---|---|
| 4px | アイコンとテキストの間、ラベルと入力の間 |
| 8px | 同一グループ内の要素間、バッジとテキスト間 |
| 12px | ボタン間のギャップ、入力の内側パディング |
| 16px | カード内パディング、フォームグループ間 |
| 20px | カード内パディング（現在の値） |
| 24px | セクション間、モーダル内パディング |
| 32px | ページセクション間 |

---

## 5. コンポーネントルール

### ボタン

- **最小タッチターゲット**: 44x44px（Apple HIG / WCAG 2.2 AAA）
- padding: `12px 24px` 以上
- プライマリ（`.btn`）: 塗りつぶし、1画面に1つが理想
- セカンダリ（`.btn-outline`）: 枠線のみ
- テキスト（`.btn-link`）: 装飾なし、キャンセルなど低優先度アクション
- disabled: `opacity: 0.5` + `cursor: not-allowed`
- ホバー: background の変化（150ms ease-out）
- プレス（:active）: `transform: scale(0.97)` で押し込みフィードバック

```css
.btn:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.btn:active:not(:disabled) {
  transform: scale(0.97);
}
```

### 入力フィールド

- 高さ: 最低 44px（padding 12px + font 16px で達成）
- フォーカス時: `border-color` + `box-shadow` のリング表示

```css
.input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(233, 69, 96, 0.25);
}
```

### カード

- 背景: `--bg-card`、ボーダー: `--border`
- 角丸: `--radius`（12px）
- padding: 20px
- ホバー: background を1段明るく + `border-color` 変化 + `translateY(-2px)`
- 一貫性: すべてのページコンテンツを `.card` で囲む

### モーダル（dialog）

- HTML `<dialog>` 要素 + `showModal()` を使用
- `aria-labelledby` でタイトルと紐づけ
- backdrop: `rgba(0, 0, 0, 0.6)` + `backdrop-filter: blur(4px)`
- 最大幅: 400px、モバイルでは `calc(100% - 32px)`
- 開閉アニメーション:

```css
dialog {
  opacity: 0;
  transform: translateY(16px) scale(0.96);
  transition: opacity 200ms ease-out, transform 200ms ease-out,
              overlay 200ms ease-out allow-discrete,
              display 200ms ease-out allow-discrete;
}

dialog[open] {
  opacity: 1;
  transform: translateY(0) scale(1);
}

@starting-style {
  dialog[open] {
    opacity: 0;
    transform: translateY(16px) scale(0.96);
  }
}
```

### バッジ

- 角丸: `9999px`（pill 形状）
- フォント: 11px, bold, uppercase, `letter-spacing: 0.02em`
- 背景: 対応する色の 15% 透過
- `display: inline-flex; align-items: center;` で垂直中央揃え

### エラー・成功メッセージ

- `role="alert"` でスクリーンリーダーに通知
- エラー: `--primary` 系の背景 + ボーダー（定義済み）
- 成功: `--success` 系の背景 + ボーダー

```css
.success-message {
  background: rgba(0, 210, 211, 0.15);
  border: 1px solid var(--success);
  border-radius: var(--radius);
  padding: 12px 16px;
  margin-bottom: 16px;
  color: var(--success);
  font-size: 14px;
}
```

### ローディング状態

- プレーンテキストではなくスケルトンスクリーンを推奨
- または最低限、中央配置のスピナー + テキスト

```css
.skeleton {
  background: linear-gradient(90deg, var(--bg-card) 25%, var(--border) 50%, var(--bg-card) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
  border-radius: 4px;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

---

## 6. レスポンシブデザイン

### ブレークポイント

- モバイル: ベース（デフォルトスタイル）
- タブレット: `@media (min-width: 640px)`
- コンテナ最大幅: 640px

### モバイルファーストの原則

- デフォルトスタイルはモバイル向け
- `@media (min-width: ...)` で大画面向けを追加（`max-width` は非推奨）
- タッチターゲット 44px 以上、タッチデバイスでは 48px 推奨
- 隣接するタッチターゲット間は 8px 以上の間隔

```css
@media (any-pointer: coarse) {
  .btn, .input, .setlist-item-button {
    min-height: 48px;
  }
}
```

---

## 7. アクセシビリティ

### WCAG AA 必須要件

| 要素 | 最小コントラスト比 |
|---|---|
| 通常テキスト (<18px, <14px bold) | 4.5:1 |
| 大テキスト (>=18px or >=14px bold) | 3:1 |
| 非テキスト（UI部品、アイコン、ボーダー） | 3:1 |
| フォーカスインジケーター | 3:1 |

### フォーカスリング（必須）

```css
:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

:focus:not(:focus-visible) {
  outline: none;
}
```

### セマンティックHTML

- フォーム要素には `<label>` を `htmlFor` で紐づけ
- エラー表示には `role="alert"`
- リスト表示には `<ul>` + `<li>`
- セクションには `<section aria-label="...">`
- ダイアログには `aria-labelledby` でタイトル紐づけ

### スクリーンリーダー専用テキスト

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

### 色だけに頼らない

- ステータスの区別は色 + テキスト（バッジのテキストラベル）
- エラーは色 + テキストメッセージ
- 色覚多様性を考慮（赤/緑の組み合わせを避ける）

---

## 8. トランジション・アニメーション

### 基本ルール

| 操作 | 時間 | イージング |
|---|---|---|
| 色変化（ホバー） | 150ms | ease-out |
| 浮き上がり（ホバー） | 150ms | ease-out |
| ボタン押下 | 50ms | ease-out |
| モーダル表示 | 200ms | ease-out |
| モーダル非表示 | 150ms | ease-in |

- プロパティは明示的に指定（`transition: all` は禁止）
- GPU加速プロパティ（`transform`, `opacity`）を優先
- `width`, `height`, `margin` のアニメーションは避ける

### prefers-reduced-motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
  }
}
```
