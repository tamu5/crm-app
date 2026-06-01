# CLAUDE.md — ひとり営業用 顧客管理アプリ

## 1. 技術スタック

| 技術 | 用途 |
|---|---|
| HTML5 | マークアップ（index.html 1枚） |
| JavaScript (Vanilla) | ロジック・DOM操作（app.js 1枚） |
| Tailwind CSS (CDN) | ユーティリティクラスによるスタイリング |
| CSS (styles.css) | Tailwindで表現できないカスタムスタイル |
| localStorage | データ永続化（サーバーなし） |

フレームワーク・ビルドツール・npm は一切使わない。

---

## 2. ディレクトリ構成

```
/
├── index.html    # 骨格HTML、Tailwind CDN読み込み、app.js/styles.css 参照
├── app.js        # 全ロジック（即時実行関数で包む）
└── styles.css    # カスタムスタイル（Tailwindで賄えない部分のみ）
```

### 各ファイルの責務

- **index.html**: `<head>` にTailwind CDN・styles.css・app.js を読み込む。`<body>` にはタブUI・左ペイン・右ペインの静的骨格のみ書く。動的コンテンツはJSで注入する。
- **app.js**: データ管理（CRUD）、ビュー切替、イベントハンドリング、初期データ投入をすべて担う。
- **styles.css**: アクセントカラー変数、ステータスバッジの左ボーダー、その他Tailwindクラスだけでは難しいスタイル。

---

## 3. コーディング規約

### ビュー・モード切替方式

- **ビュー**: `data-view="customers"` / `data-view="pipeline"` 属性でタブ切替。表示中のビュー以外は `hidden` クラスを付与。
- **右ペインモード**: `data-pane` 属性値で4種を管理。
  - `empty` — 初期空状態
  - `detail` — 顧客詳細
  - `customer-form` — 顧客フォーム（新規・編集）
  - `deal-form` — 商談フォーム（新規・編集）
- モード切替は `showPane(mode)` 関数1箇所で行い、他箇所から直接 `hidden` を操作しない。

### ID命名規則

| プレフィックス | 用途 | 例 |
|---|---|---|
| `view-*` | 大ビューのルート要素 | `view-customers`, `view-pipeline` |
| `pane-*` | 右ペインの各モード要素 | `pane-empty`, `pane-detail`, `pane-customer-form`, `pane-deal-form` |
| `input-*` | フォーム入力欄 | `input-company`, `input-name`, `input-title` |
| `btn-*` | ボタン要素 | `btn-new-customer`, `btn-save-customer`, `btn-delete-deal` |

### 関数の長さ

- **1関数50行以内**を目標とする。50行を超えそうな場合は責務を分割する。

### 変数宣言

- `const` を優先する。再代入が必要な場合のみ `let` を使う。`var` は使わない。

### グローバル汚染禁止

- `app.js` の全コードを即時実行関数（IIFE）で包む。

```js
(function () {
  'use strict';
  // ...
})();
```

### コメント方針

- WHYが非自明な場合のみ1行コメントを書く。WHATのコメントは書かない。
- セクション区切りには `// --- Section Name ---` 形式を使う。

---

## 4. データ構造

### 顧客オブジェクト

```js
{
  id: "c_1717000000000",       // "c_" + Date.now()
  company: "株式会社サンプル",
  name: "山田 太郎",
  title: "営業部長",            // 任意
  email: "yamada@example.com", // 任意
  phone: "03-0000-0000",       // 任意
  memo: "備考テキスト",         // 任意、複数行
  createdAt: "2024-01-01T00:00:00.000Z"
}
```

### 商談オブジェクト

```js
{
  id: "d_1717000000001",       // "d_" + Date.now()
  customerId: "c_1717000000000", // 顧客.id と紐付け
  dealTitle: "サービスA導入提案",
  amount: 500000,              // 任意、整数（円）
  status: "lead",              // "lead" | "proposal" | "won"
  followUpMemo: "次回アポ調整中", // 任意
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-02T00:00:00.000Z"
}
```

### localStorageキー

| キー | 型 | 内容 |
|---|---|---|
| `crm-customers` | JSON配列 | 顧客オブジェクトの配列 |
| `crm-deals` | JSON配列 | 商談オブジェクトの配列 |

### 1対多の紐付け方針

- 商談は `customerId` フィールドで顧客を参照する（外部キー方式）。
- 顧客削除時は `crm-deals` から `customerId` が一致する商談をすべて削除する（連鎖削除）。
- 顧客IDを変更することはないため、参照整合性は削除時のみ考慮する。

---

## 5. デザイン規約

### 配色

| 用途 | 値 |
|---|---|
| アクセントカラー | `#c15f3c`（Claudeオレンジ） |
| 背景 | `#ffffff`（白） |
| サイドパネル背景 | `#f9fafb`（gray-50） |
| テキスト（本文） | `#111827`（gray-900） |
| テキスト（補助） | `#6b7280`（gray-500） |

### ステータスバッジ

| ステータス | ラベル | バッジ色 | カード左ボーダー |
|---|---|---|---|
| `lead` | 見込み | gray | `#9ca3af` |
| `proposal` | 提案 | orange | `#c15f3c` |
| `won` | 成約 | green | `#10b981` |

### フォント

```css
font-family: "游ゴシック", "Yu Gothic", sans-serif;
```

### レイアウト

- 左ペイン幅: `340px` 固定（`flex-shrink-0`）
- 右ペイン幅: `flex-1`（残り全幅）
- 角丸: `rounded-lg`（8px）統一
- 影: `shadow-sm` 程度（控えめ）

### ボタンスタイル

- **プライマリ（保存・追加）**: 背景 `#c15f3c`、テキスト白
- **セカンダリ（キャンセル）**: 背景白、ボーダー gray-300
- **危険（削除）**: 背景白、テキスト red-600、ボーダー red-300

---

## 6. ワークフロー

```
1. 変更前
   - spec.md で仕様を確認する
   - 変更対象の関数・要素を特定する

2. 実装
   - app.js / index.html / styles.css を編集する
   - 関数は50行以内を守る
   - グローバル変数を増やさない

3. 動作確認
   - index.html をブラウザで直接開く（file:// で動作）
   - 対象機能のCRUDを一通り手動で確認する
   - localStorageをDevToolsで確認し、データが正しく保存・削除されているか検証する
   - 別機能にリグレッションがないか確認する
```

---

## 7. やってはいけないこと

- **npm・パッケージマネージャーの使用禁止** — `package.json` を作らない。`npm install` を実行しない。
- **ビルドツールの使用禁止** — Webpack・Vite・Rollup 等は使わない。
- **サーバーサイド処理の禁止** — バックエンドAPI・データベース・Node.jsサーバーは使わない。
- **外部APIの使用禁止** — データの取得・送信に外部サービスを使わない。
- **JSフレームワークの使用禁止** — React・Vue・Svelte 等は使わない。
- **`var` の使用禁止** — `const` / `let` のみ使う。
- **IIFE外へのグローバル変数の露出禁止** — `window.xxx = ...` は書かない。
- **ドラッグ＆ドロップ実装禁止** — ステータス移動はボタンクリックのみ対応。
- **モバイル対応不要** — レスポンシブ対応はしない。PC表示のみ考慮する。
