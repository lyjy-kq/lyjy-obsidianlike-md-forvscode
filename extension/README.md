<a id="english"></a>

# FlowMD — WYSIWYG Markdown Editor for VS Code

> Obsidian-style live preview editing, right inside VS Code.

[日本語](#japanese)

![FlowMD Demo](https://github.com/hephaestus-workers/flow-md-issues/raw/HEAD/images/demo.gif)

FlowMD is a WYSIWYG Markdown editor for VS Code. The line you're editing shows raw Markdown; everything else renders beautifully in real time — no split panes, no context switching. Three modes let you switch between WYSIWYG editing, raw Markdown, and a read-only rendered view with a single click.

## Features

### Live Preview Editing

The focused block shows raw Markdown while all other blocks render inline. Switch instantly between editing and reading without leaving your file.

![Live Preview](https://github.com/hephaestus-workers/flow-md-issues/raw/HEAD/images/live-preview.png)

### Three Editing Modes

| Mode | Description |
|------|-------------|
| **Live Preview** | WYSIWYG editing — focused block shows Markdown, rest renders live |
| **Viewer** | Read-only rendered output — ideal for reading |
| **Source** | Raw Markdown with full syntax highlighting |

Click the mode icon in the editor title bar to cycle: Live Preview → Viewer → Source → Live Preview. Prefer direct access? Set `flowMd.modeSwitcher` to `buttons` to show direct-jump buttons for the other two modes instead.

### GFM Tables

Full GitHub Flavored Markdown table rendering with:

- Interactive **add row / add column** buttons on hover
- **Cell drag selection** — click and drag to select rectangular cell ranges
- **Delete key support** — with cells selected, Delete removes entire rows, entire columns, or clears cell contents
- Inline checkbox toggle within table cells

![Tables](https://github.com/hephaestus-workers/flow-md-issues/raw/HEAD/images/tables.png)

### Mermaid Diagrams

Inline rendering of flowcharts, sequence diagrams, Gantt charts, class diagrams, and more. Diagram theme follows VS Code's active color theme automatically.

![Mermaid](https://github.com/hephaestus-workers/flow-md-issues/raw/HEAD/images/mermaid.png)

### KaTeX Math

Inline math with `$...$` and display math with `$$...$$`. Full KaTeX support with MathML output — no external fonts or CSS required.

![KaTeX](https://github.com/hephaestus-workers/flow-md-issues/raw/HEAD/images/katex.png)

### YAML Frontmatter

YAML frontmatter blocks render as an Obsidian-style property panel showing key-value pairs in a clean, readable layout.

### Syntax Highlighting

20 programming languages with a copy button on every code block:
`JavaScript`, `TypeScript`, `Python`, `HTML`, `CSS`, `JSON`, `Java`, `C/C++`, `Rust`, `Go`, `SQL`, `PHP`, `XML`, `YAML`, `Shell`, `PowerShell`, `Ruby`, `Dockerfile`, `TOML`, `Diff`

### More Features

- **Bold / Italic** — `Ctrl+B` / `Ctrl+I` (`Cmd+B` / `Cmd+I` on Mac) to toggle formatting on selected text
- **Inline Checkboxes** — Click to toggle `[ ]` / `[x]`, even inside table cells
- **Footnotes** — Auto-numbered with click-to-jump navigation
- **Collapsible Sections** — HTML `<details>/<summary>` rendering
- **Strikethrough** — GFM `~~text~~` support
- **Image Paste & Insert** — Paste screenshots with `Ctrl+V`, insert from file picker with `Ctrl+Shift+I`, or right-click images in Explorer → "Insert into FlowMD"
- **Image Display** — Local files, URLs, and data URIs
- **Nested Blockquotes** — Visual indicator bars for up to 5 nesting levels
- **Collapsible Lists** — Fold/unfold nested list sections with arrow indicators
- **Anchor Links** — Click heading links to jump within the document
- **HTML Export** — Export the current file as a standalone styled HTML document
- **Find and Replace** — `Ctrl+F` / `Ctrl+H` (`Cmd+F` / `Cmd+Alt+F` on Mac) with match count
- **Theme Sync** — Automatic dark/light theme synchronization with VS Code
- **File Reload** — Re-read file from disk with one click
- **Word Wrap and Readable Line Length** — Configurable content width
- **IME Support** — Full composition support for Japanese, Chinese, and Korean

## Installation

1. Open VS Code
2. Press `Ctrl+Shift+X` to open Extensions
3. Search for **"FlowMD"**
4. Click **Install**

Or install directly from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=hephaestus-workers.flow-md).

## Usage

### Opening Files

FlowMD registers as the default editor for `.md` files. Simply open any Markdown file and it loads in Live Preview mode.

You can also right-click any `.md` file in the Explorer and select **Open with FlowMD**.

### Mode Switching

Click the mode icon in the editor title bar to cycle through modes:

| Current Mode | Icon | Next Mode |
|-------------|------|-----------|
| Live Preview | Book | Viewer |
| Viewer | Code | Source |
| Source | Edit | Live Preview |

You can also set the default mode in settings with `flowMd.defaultMode`.

Prefer jumping directly to a mode? Set `flowMd.modeSwitcher` to `buttons` to replace the cycle button with two direct-jump buttons — the current mode's button is hidden, so every visible button takes you straight to that mode. The change applies immediately, no reload required.

### Table Cell Selection

In **Viewer** mode, click and drag across table cells to select a rectangular range. With cells selected:

- **Delete** or **Backspace** — Delete selected rows (if full rows selected), delete selected columns (if full columns selected), or clear cell contents
- Click outside the table to deselect

## Keyboard Shortcuts

| Shortcut | Mac | Action |
|----------|-----|--------|
| `Ctrl+B` | `Cmd+B` | Toggle bold (`**text**`) |
| `Ctrl+I` | `Cmd+I` | Toggle italic (`*text*`) |
| `Ctrl+F` | `Cmd+F` | Find |
| `Ctrl+H` | `Cmd+Alt+F` | Find and Replace |
| `Ctrl+Shift+I` | `Cmd+Shift+I` | Insert Image |
| `Delete` / `Backspace` | Same | Delete table selection |

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `flowMd.defaultMode` | `live` | Default editing mode (`live` / `source` / `viewer`) |
| `flowMd.modeSwitcher` | `cycle` | Mode switcher style in the title bar (`cycle` / `buttons`) |
| `flowMd.wordWrap` | `true` | Enable word wrap |
| `flowMd.lineNumbers` | `true` | Show line numbers |
| `flowMd.readableLineLength` | `900` | Max content width in pixels (0 for unlimited) |
| `flowMd.theme` | `auto` | Theme (`auto` / `dark` / `light`) |
| `flowMd.largeFileWarningThreshold` | `1048576` | Large file warning threshold in bytes |
| `flowMd.syncDebounceMs` | `300` | Sync debounce time in milliseconds |
| `flowMd.imageSaveFolder` | `images` | Folder for saved images (relative to .md file) |
| `flowMd.enableDebugLog` | `false` | Enable debug logging |

## Requirements

- VS Code 1.85.0 or later

## License

Business Source License 1.1 — Free for personal and commercial use. See [LICENSE](https://github.com/hephaestus-workers/flow-md-issues/blob/HEAD/LICENSE) for details.

## Contributing

Bug reports and feature requests are welcome! Please open an issue on [GitHub Issues](https://github.com/hephaestus-workers/flow-md-issues/issues).

---

Made with care by Hephaestus Workers.

---

<a id="japanese"></a>

# FlowMD — VS Code用 WYSIWYG Markdownエディタ

> Obsidian風ライブプレビュー編集を、VS Codeで。

[English](#english)

![FlowMD Demo](https://github.com/hephaestus-workers/flow-md-issues/raw/HEAD/images/demo.gif)

FlowMDは、VS CodeをシームレスなMarkdown編集環境に変える拡張機能です。編集中の行はMarkdownソースを表示し、それ以外はリアルタイムにレンダリング。3つのモードを1クリックで切り替えられます。

## 機能

### ライブプレビュー編集

カーソルのある行はMarkdownソースを表示し、それ以外の行はリアルタイムにレンダリングされます。プレビューパネル不要のWYSIWYG編集です。

![Live Preview](https://github.com/hephaestus-workers/flow-md-issues/raw/HEAD/images/live-preview.png)

### 3つの編集モード

| モード | 説明 |
|--------|------|
| **ライブプレビュー** | リアルタイムレンダリング付きの編集モード（デフォルト） |
| **ビューアー** | 読み取り専用のレンダリング表示 |
| **ソース** | 生のMarkdownをシンタックスハイライト付きで直接編集 |

エディタのタイトルバーに表示されるモードアイコンをクリックすると順に切り替わります: ライブプレビュー → ビューアー → ソース → ライブプレビュー。設定の `flowMd.modeSwitcher` を `buttons` にすると、他の2モードへ直接ジャンプできるボタンの横並び表示に切り替えられます。

### GFMテーブル

GitHub Flavored Markdownのテーブル記法に完全対応しています。

- ホバーで表示される **行追加 / 列追加** ボタン
- **セルのドラッグ選択** — クリック＆ドラッグで矩形範囲を選択
- **Deleteキー対応** — 選択中にDeleteで行削除・列削除・セル内容クリア
- テーブルセル内のチェックボックス切り替え

![Tables](https://github.com/hephaestus-workers/flow-md-issues/raw/HEAD/images/tables.png)

### Mermaidダイアグラム

フローチャート、シーケンス図、ガントチャート、クラス図などをインラインでレンダリングします。VS Codeのカラーテーマに自動追従します。

![Mermaid](https://github.com/hephaestus-workers/flow-md-issues/raw/HEAD/images/mermaid.png)

### KaTeX数式

インライン数式 `$...$` とブロック数式 `$$...$$` に対応しています。MathML出力を採用しており、追加のCSSやフォントファイルは不要です。

![KaTeX](https://github.com/hephaestus-workers/flow-md-issues/raw/HEAD/images/katex.png)

### YAMLフロントマター

YAMLフロントマターブロックをObsidian風のプロパティパネルとして表示します。キーと値のペアが見やすいレイアウトでレンダリングされます。

### シンタックスハイライト

20のプログラミング言語に対応。各コードブロックにはコピーボタン付き:
`JavaScript`, `TypeScript`, `Python`, `HTML`, `CSS`, `JSON`, `Java`, `C/C++`, `Rust`, `Go`, `SQL`, `PHP`, `XML`, `YAML`, `Shell`, `PowerShell`, `Ruby`, `Dockerfile`, `TOML`, `Diff`

### その他の機能

- **太字 / 斜体** — `Ctrl+B` / `Ctrl+I`（Macは `Cmd+B` / `Cmd+I`）で書式を切り替え
- **インラインチェックボックス** — テーブル内でも動作するタスクリスト
- **脚注** — 自動採番とクリックによるジャンプ
- **折りたたみセクション** — `<details>/<summary>` のレンダリング対応
- **取り消し線** — GFM `~~text~~` 記法に対応
- **画像ペースト・挿入** — `Ctrl+V`でスクリーンショット貼り付け、`Ctrl+Shift+I`でファイル選択挿入、エクスプローラー右クリック→「Insert into FlowMD」で画像挿入
- **画像表示** — ローカルファイル、URL、data URIのいずれも表示可能
- **ネストされたブロック引用** — 5階層までの視覚的インジケーターバー
- **折りたたみリスト** — ネストされたリストセクションを矢印インジケーターで折りたたみ/展開
- **アンカーリンク** — 見出しへのリンクをクリックしてドキュメント内をジャンプ
- **HTMLエクスポート** — 現在のファイルをスタイル付きの単体HTMLとしてエクスポート
- **検索と置換** — `Ctrl+F` / `Ctrl+H`（Macは `Cmd+F` / `Cmd+Alt+F`）マッチ数表示付き
- **テーマ同期** — VS Codeのダーク/ライトテーマに自動追従
- **ファイル再読み込み** — ワンクリックでディスクから最新の内容を再読み込み
- **折り返し・可読幅** — コンテンツの最大幅をピクセル単位で設定可能
- **IME対応** — 日本語・中国語・韓国語のIME入力に完全対応

## インストール

1. VS Codeを開く
2. `Ctrl+Shift+X` で拡張機能パネルを開く
3. **「FlowMD」** で検索
4. **インストール** をクリック

[VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=hephaestus-workers.flow-md) からも直接インストールできます。

### VSIXファイルからインストール

1. `flow-md-x.x.x.vsix` をダウンロード
2. VS Codeで `Ctrl+Shift+P` を押してコマンドパレットを開く
3. 「Extensions: Install from VSIX...」を選択
4. ダウンロードしたファイルを指定

## 使い方

### ファイルを開く

FlowMDは `.md` ファイルのデフォルトエディタとして登録されます。Markdownファイルを開くだけでライブプレビューモードで表示されます。

`.md` ファイルをエクスプローラーで右クリックし、**「Open with FlowMD」** を選択して開くこともできます。

### モード切替

エディタのタイトルバーに表示されるアイコンをクリックすると、モードが順に切り替わります。

| 現在のモード | アイコン | クリック後 |
|-------------|---------|-----------|
| ライブプレビュー | 本のアイコン | ビューアーモードへ |
| ビューアー | コードアイコン | ソースモードへ |
| ソース | 鉛筆アイコン | ライブプレビューへ |

設定の `flowMd.defaultMode` でデフォルトモードを変更できます。

また、設定の `flowMd.modeSwitcher` を `buttons` にすると、循環式の1ボタンの代わりに、他の2モードへ直接ジャンプできるボタンが横並びで表示されます（現在のモードのボタンは非表示）。設定変更は再読み込み不要で即座に反映されます。

### テーブルセル選択

**ビューアー** モードで、テーブルセルをクリック＆ドラッグして矩形範囲を選択できます。選択中の操作:

- **Delete** または **Backspace** — 行全体選択時は行削除、列全体選択時は列削除、それ以外はセル内容のクリア
- テーブル外をクリックで選択解除

## キーボードショートカット

| 操作 | Windows / Linux | macOS |
|------|----------------|-------|
| 太字 | `Ctrl+B` | `Cmd+B` |
| 斜体 | `Ctrl+I` | `Cmd+I` |
| 検索 | `Ctrl+F` | `Cmd+F` |
| 検索と置換 | `Ctrl+H` | `Cmd+Alt+F` |
| 画像挿入 | `Ctrl+Shift+I` | `Cmd+Shift+I` |
| テーブル選択削除 | `Delete` / `Backspace` | 同じ |

## 設定

VS Codeの設定（`Ctrl+,`）から、FlowMDの動作をカスタマイズできます。

| 設定 | デフォルト | 説明 |
|------|-----------|------|
| `flowMd.defaultMode` | `live` | デフォルト編集モード (live/source/viewer) |
| `flowMd.modeSwitcher` | `cycle` | モード切替ボタンの表示スタイル (cycle/buttons) |
| `flowMd.wordWrap` | `true` | 長い行を自動的に折り返す |
| `flowMd.lineNumbers` | `true` | 行番号を表示する |
| `flowMd.readableLineLength` | `900` | コンテンツの最大幅 (px、0で無制限) |
| `flowMd.theme` | `auto` | テーマ設定 (auto/dark/light) |
| `flowMd.largeFileWarningThreshold` | `1048576` | 大規模ファイル警告の閾値 (バイト) |
| `flowMd.syncDebounceMs` | `300` | 同期デバウンス時間 (ミリ秒) |
| `flowMd.imageSaveFolder` | `images` | 画像の保存先フォルダ（.mdファイルからの相対パス） |
| `flowMd.enableDebugLog` | `false` | デバッグログを有効にする |

## 日本語入力サポート (IME対応)

FlowMDは日本語入力（IME）に完全対応しています。

Web技術ベースのエディタでは、IMEとの相性問題が起きやすく、変換中に文字が消えたり重複したりすることがあります。FlowMDではこれらの問題を根本から解決しています。

### 対策の詳細

- **変換中のデコレーション抑制** — IMEで変換中（composing状態）はライブプレビューのデコレーション再構築を抑制し、未確定文字列が消えたり崩れたりすることを防ぎます。
- **文字の重複防止** — 変換確定時にドキュメント同期が二重に走ることを防止し、「変換確定後に同じ文字が2つ入力される」問題を回避しています。
- **安定した変換候補表示** — 変換中にカーソル位置やテキストが予期せず変更されることがないため、変換候補ウィンドウが安定して表示されます。
- **全角記号・句読点の正確な入力** — 全角スペース、句読点（、。）、括弧（「」）などの全角記号も正しく処理されます。

### 対応するIME

- Microsoft IME (Windows)
- macOS日本語入力
- Google日本語入力
- IBUS / Fcitx (Linux)
- 中国語・韓国語のIMEにも対応

技術ブログの執筆やドキュメント作成など、日本語を多用する作業でも安心してお使いいただけます。Zenn、Qiita、はてなブログなどの技術記事のMarkdown執筆に最適です。

## VS Codeとの統合

FlowMDはVS Codeのネイティブ機能と密接に統合されています。

- **エクスプローラーから直接起動** — `.md` ファイルを右クリックして「Open with FlowMD」で直接開けます。
- **テーマ自動追従** — VS Codeのカラーテーマ（ダーク/ライト）を自動検出し、エディタの配色を同期します。
- **他の拡張機能との共存** — 他のVS Code拡張機能（Git、Linter等）と干渉することなく動作します。
- **1ペインで完結** — プレビューパネルを別途開く必要がありません。編集と確認が1つのエディタペインで完了します。

## 動作要件

- VS Code 1.85.0 以降

## 技術基盤

[CodeMirror 6](https://codemirror.net/)、[KaTeX](https://katex.org/)、[Mermaid](https://mermaid.js.org/) を基盤として構築されています。

## ライセンス

Business Source License 1.1 — 個人利用・商用利用ともに無料。詳細は [LICENSE](https://github.com/hephaestus-workers/flow-md-issues/blob/HEAD/LICENSE) を参照してください。

## 貢献

バグ報告や機能リクエストは [GitHub Issues](https://github.com/hephaestus-workers/flow-md-issues/issues) からお願いします。

---

Made with care by Hephaestus Workers.
