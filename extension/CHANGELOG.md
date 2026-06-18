# Changelog

All notable changes to the FlowMD extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.11] - 2026-06-12

### Added

- **Mode switcher button style (`flowMd.modeSwitcher`)**: New setting to choose how the mode switcher appears in the editor title bar. `cycle` (default) keeps the current single button that cycles Live → Viewer → Source. `buttons` shows two direct-jump buttons for the other modes (the current mode's button is hidden), so any mode is one click away. The setting takes effect immediately without reloading

### Fixed

- **`<br>` in table cells rendered as literal text**: HTML line breaks (`<br>`, `<br/>`, `<br />`, `<BR>`) inside GFM table cells — the only way to break lines within a cell — were displayed as escaped literal text instead of an actual line break, in both Live Preview and Viewer modes. Root cause: table cells are rendered through a lightweight inline renderer that HTML-escapes the cell text and had no rule to restore `<br>` tags. The fix restores bare `<br>` tags (attribute-less only) after escaping, so all other HTML stays escaped (XSS-safe). The same fix applies to `<details>` block content, and editor rendering now matches HTML export, which already rendered `<br>` as a line break

### Changed

- **Marketplace metadata (SEO)**: Optimized `keywords` (added "markdown editor", "table", "code block", "math"; removed "typora", "preview", "editor", "gfm"), narrowed `categories` to "Other", and reworded `description` to lead with "Obsidian-style live preview"
- **Internal housekeeping**: Resolved all 16 pre-existing `tsc --noEmit` errors (typed declarations for `@codemirror/legacy-modes`, dynamic `import()` for `marked`, definite assignment fixes — no runtime behavior changes), removed leftover codemod scripts from the repository, and added a release quality gate (typecheck + full test suite) plus Open VSX publishing support to the release process

## [0.3.10] - 2026-05-07

### Fixed

- **Live preview ignores `editor.lineHeight` (#4)**: The base text in Live Preview, Viewer, and Source modes always rendered with a `1.7em` line-height, ignoring the user's `editor.lineHeight` setting (e.g. `1.5` for compact, `2` for spacious). Root cause: `.cm-content` referenced `var(--vscode-editor-line-height, 1.7em)`, but VS Code does not expose `editor.lineHeight` as a CSS variable in webviews (only color tokens, `--vscode-editor-font-family`, and `--vscode-editor-font-size` are exposed), so the fallback always applied. Fixed by reading `editor.lineHeight` on the extension side and injecting it into the webview HTML as a custom CSS property (`--flowmd-line-height`), then referencing it from `.cm-content`. Multipliers (`< 8`) are converted to `em` units to preserve the existing pixel-inheritance contract for child elements (`.cm-md-code` at `font-size: 0.9em`), preventing height-estimation mismatches that previously caused scroll jumps. Applies to all three editing modes (Live / Viewer / Source) since they share the same `.cm-content` layer. Reported by @dg-hellotwin

## [0.3.9] - 2026-05-06

### Fixed

- **Live preview ignores `editor.fontWeight` (#3)**: The base text in Live Preview and code blocks always rendered at the browser default weight (`400`), ignoring the user's `editor.fontWeight` setting (e.g. `"200"` for thin, `"bold"`). Root cause: unlike `editor.fontFamily` and `editor.fontSize`, VS Code does not expose `editor.fontWeight` as a CSS variable in webviews, so the CSS-variable approach used in v0.3.8 was not applicable. Fixed by reading `editor.fontWeight` on the extension side and injecting it into the webview HTML as a custom CSS property (`--flowmd-font-weight`), then referencing it from `.cm-content`, `.cm-md-code`, and `.cm-md-codeblock` with `400` as fallback. Reported by @dg-hellotwin

## [0.3.8] - 2026-05-06

### Fixed

- **Code block font ignores `editor.fontFamily` (#2)**: Inline code (`.cm-md-code`) and fenced code blocks (`.cm-md-codeblock`) had hardcoded `font-family` (`"SF Mono", Monaco, Consolas, ...`) and `font-size: 0.9em`, ignoring the user's `editor.fontFamily` / `editor.fontSize` settings. The rest of the editor surface correctly used `var(--vscode-editor-font-family)`, causing inconsistent fonts between regular text and code blocks. Fixed by switching code styles to `var(--vscode-editor-font-family, ...)` and `var(--vscode-editor-font-size, 0.9em)` with the original chain as fallback. Reported by @dg-hellotwin

## [0.3.7] - 2026-04-13

### Fixed

- **Git diff view opens FlowMD instead of text diff**: When clicking a changed `.md` file in the Source Control view, VS Code opened FlowMD on both sides of the diff editor, making text-based diff comparison impossible. Fixed by restricting the custom editor selector to `file` and `untitled` URI schemes only, so `git:` scheme documents (used in diff view) fall back to the standard text editor with proper diff highlighting

## [0.3.6] - 2026-04-13

### Fixed

- **List item click not entering edit mode**: Clicking in the middle of a rendered list item's text (e.g. "• Text") did not switch to edit mode — the bullet widget remained and raw Markdown (`- Text`) was not shown. Root cause: `getMarkdownBlockRange()` resolved the click position to the inner `Paragraph` node instead of the parent `ListItem`, so the `ListMark` (`- `) fell outside the focused range. Clicking near the bullet or at the very start still worked because those positions resolved directly to `ListMark` → `ListItem`

## [0.3.5] - 2026-04-13

### Fixed

- **Selection resets focused block in Live Preview**: Drag-selecting text or using Ctrl+Shift+Arrow within a focused block would cause it to revert to preview mode. The focused block now stays in edit mode during range selection by remembering the last focused range

## [0.3.4] - 2026-04-13

### Fixed

- **Cursor/scroll reset caused by `files.trimTrailingWhitespace`**: When VS Code's auto-save triggers `trimTrailingWhitespace`, `insertFinalNewline`, or `trimFinalNewlines`, the document is modified externally. FlowMD previously treated this as an external change and sent the trimmed content back to the editor, resetting cursor position and scroll. Now, changes that only differ in trailing whitespace or final newlines are detected and silently absorbed without disrupting the editor state

## [0.3.3] - 2026-04-13

### Fixed

- **Debug log file not created on Remote SSH**: File logging initialization now uses lazy activation — if the debug config is not yet synced when `activate()` runs (common with Remote SSH), file logging starts automatically on the first debug log call

## [0.3.2] - 2026-04-13

### Added

- **Debug log file output**: When `flowMd.enableDebugLog` is enabled, all log messages are automatically saved to a timestamped file in the OS temp directory (`/tmp/flowmd-debug-*.log`). The file path is displayed in the Output Channel on startup
- **Enhanced diagnostic logging**: Added detailed logging to `onDidChangeTextDocument` handler including document dirty state, change reason, content change details, and diff position — designed to help diagnose cursor/scroll reset issues caused by external document modifications

## [0.3.1] - 2026-03-29

### Fixed

- **LICENSE link broken on Marketplace**: The `[LICENSE](https://github.com/hephaestus-workers/flow-md-issues/blob/HEAD/LICENSE)` link in README was not working on the Marketplace page because `vsce` resolves relative URLs against `repository.url` (flow-md-issues repo). Added LICENSE file to the public issues repository for correct link resolution

## [0.3.0] - 2026-03-29

### Added

- **Image paste from clipboard**: Paste screenshots directly into the editor with `Ctrl+V`. Images are automatically saved to the configured folder (default: `images/`) with timestamped filenames (`paste-YYYYMMDD-HHMMSS.png`)
- **Insert Image command**: `Ctrl+Shift+I` or Command Palette → "FlowMD: Insert Image" opens a file picker to insert image files. Selected images are copied to the save folder and Markdown syntax is inserted at cursor position
- **Explorer context menu**: Right-click any image file in VS Code Explorer → "Insert into FlowMD" to insert it into the active FlowMD editor
- **Image toolbar button**: Camera icon in the editor title bar for quick image insertion via file picker
- **Image save folder setting**: New `flowMd.imageSaveFolder` setting to configure the destination folder for saved images (relative to .md file, default: `images`)
- **Smart file handling**: Automatic filename sanitization, sequential numbering for duplicate names (`image.png` → `image-1.png`), path traversal prevention, and 10MB file size limit
- **IME-safe paste**: Image paste is automatically skipped during IME composition to prevent input disruption
- **Text paste priority**: When clipboard contains both text and image (e.g., copying from a web page), text paste takes priority over image paste

### Note

- **Drag & drop**: Not currently supported due to VS Code Custom Editor (webview/iframe) platform limitations — drag events do not reach webview iframes. VS Code's own Markdown preview has the same limitation. Will be implemented when VS Code API adds webview drop support

## [0.2.9] - 2026-03-20

### Fixed

- **Code block Copy button not working**: Clicking the "Copy" button on code blocks did not copy content to clipboard. Root cause: `navigator.clipboard` API is restricted in VS Code webview iframes. Fixed by routing clipboard writes through the Extension host via `vscode.env.clipboard.writeText()`, consistent with the existing table copy implementation

## [0.2.8] - 2026-03-20

### Changed

- **README language order**: Switched to English first, Japanese second for better global discoverability on VS Code Marketplace

## [0.2.7] - 2026-03-20

### Fixed

- **Incorrect license in README**: Changed license description from "MIT License" to "Business Source License 1.1" to match the actual LICENSE file
- **Table cell selection description**: Corrected "Live Preview or Viewer mode" to "Viewer mode" only, reflecting the v0.2.4 change where clicking a table in Live Preview now switches to source editing

## [0.2.6] - 2026-03-20

### Fixed

- **Marketplace image display**: README images were not displayed on the Marketplace page because `vsce` resolves relative image URLs against the `repository` field in package.json, which points to the public `flow-md-issues` repo. Images are now hosted in that repo for correct URL resolution

## [0.2.5] - 2026-03-20

### Added

- **README images**: Added demo GIF and feature screenshots (live preview, tables, mermaid diagrams, KaTeX math) to README for Marketplace display

## [0.2.4] - 2026-03-19

### Fixed

- **Table editing in Live Preview**: Clicking a table cell in Live Preview mode now switches to raw Markdown source (consistent with all other blocks). Cursor is placed at the clicked cell's position for immediate editing. Previously, tables were always rendered as widgets regardless of focus, preventing direct source editing

## [0.2.3] - 2026-03-19

### Fixed

- **Undo/Redo broken (Ctrl+Z)**: Pressing Ctrl+Z caused dual undo — both VS Code's WorkspaceEdit undo and CodeMirror 6's history undo fired simultaneously, resulting in content conflicts, scroll jumping to bottom, and undo becoming completely unresponsive. Fixed by overriding Ctrl+Z/Ctrl+Y/Ctrl+Shift+Z keybindings when FlowMD editor is active, letting CM6's history handle undo/redo exclusively
- **Debug log cleanup**: Removed leftover debug file logging (`debug-sync.log`) from previous focus-loss investigation that caused ENOENT errors when opening files from different workspaces

## [0.2.2] - 2026-03-13

### Fixed

- **IME auto-save**: Japanese/Chinese/Korean IME input (e.g. composing "あいうえ" then pressing Enter) was not triggering auto-save — content was lost on file close. Added `compositionend` DOM event handler to reliably detect composition completion
- **Widget click position offset**: Clicking text above widgets (math, mermaid, table, frontmatter) in Live Preview / Viewer modes selected the wrong line. Root cause: CSS `margin` was excluded from CodeMirror's height calculation. Replaced `margin` with `padding` or `transparent border + background-clip`
- **Inline widget selection visibility**: Drag-selecting across inline math or other replace-decoration widgets now shows a visible selection highlight (outline) on the widget element

## [0.2.1] - 2026-03-08

### Fixed

- **Table editing bugs**: Multiple table-related bug fixes including improved cell navigation, content sync, and widget rendering stability

## [0.2.0] - 2026-03-01

### Added

- **Table cell drag selection**: Click and drag to select rectangular cell ranges in both Live Preview and Viewer modes. Selected cells are highlighted with a rectangular border
- **Table Delete key**: With cells selected, Delete/Backspace removes entire rows, entire columns, or clears cell contents depending on the selection shape
- **Bold / Italic shortcuts**: `Ctrl+B` / `Cmd+B` toggles `**bold**`; `Ctrl+I` / `Cmd+I` toggles `*italic*` on the selected text
- New application icon (128×128px)

### Fixed

- `Ctrl+Z` no longer moves the cursor to the top of the document — external content sync no longer creates undo history entries, and identical content round-trips are skipped entirely

## [0.1.19] - 2026-02-22

### Fixed

- Large GFM tables (many columns or rows) were displayed as raw Markdown text in Viewer mode instead of rendering as a table widget

## [0.1.18] - 2026-02-20

### Fixed

- Scroll position stuck at the very end of the document — replaced CM6's internal scroll handling with a custom scrollbar implementation
- Unstable document height estimation during scroll — LivePreview plugin fully migrated from ViewPlugin to StateField for consistent height calculation

## [0.1.17] - 2026-02-18

### Fixed

- Find/Replace panel did not focus the input field on open
- `Ctrl+F` toggle now correctly closes the find panel when it is already open

## [0.1.16] - 2026-02-17

### Added

- **Light mode**: full light theme support — colors, borders, and syntax highlighting automatically adapt to VS Code's light color themes
- **Mermaid theme**: diagram colors follow VS Code's active color theme (dark/light)
- **HTML Export**: export the rendered document as a standalone styled HTML file
- **Search match counter**: the find panel now shows "N of M" result count

## [0.1.15] - 2026-02-17

### Added

- **YAML frontmatter panel**: frontmatter blocks render as an Obsidian-style key-value property panel instead of raw YAML

## [0.1.14] - 2026-02-17

### Fixed

- Scroll-to-top and scroll-to-bottom buttons now jump immediately instead of smooth-scrolling
- Reload button now shows a spinner animation during file reload

### Changed

- Mermaid widget reserves estimated height before rendering, reducing scroll jumps caused by async diagram rendering
- `ensureSyntaxTree` timeout reduced from 500 ms to 100 ms for faster initial parse
- Reduced unnecessary decoration rebuilds when only the cursor selection changes (no document change)
- Post-processing functions optimized for faster decoration collection

## [0.1.13] - 2026-02-17

### Fixed

- Selection highlight is now consistent across all three modes (Live Preview, Source, Viewer) using mark decorations
- Viewer mode selection highlight no longer bleeds into the content padding area

## [0.1.12] - 2026-02-13

### Fixed

- Viewer mode selection highlight padding bleed: selection background was visible outside the content area in the editor padding

## [0.1.11] - 2026-02-12

### Fixed

- Clicking in Viewer mode now correctly activates and focuses the editor

## [0.1.10] - 2026-02-12

### Added

- **Viewer mode Ctrl+C copy**: `Ctrl+C` / `Cmd+C` now copies selected text in Viewer mode (where `contenteditable` is disabled, the browser's native copy was not triggered)
- New icon design

## [0.1.9] - 2026-02-10

### Fixed

- **Scroll jump near large code blocks**: Root cause identified as CSS `lineHeight` inheritance — unitless `1.7` was inherited as a multiplier, causing code block lines (`font-size: 0.9em`) to be shorter than normal lines. Cumulative height mismatch across 50+ code block lines caused CodeMirror's height estimation to be off by ~150px, resulting in visible scroll jumps. Fixed by using `1.7em` (computed pixel value inheritance) instead of unitless `1.7`
- **KaTeX `$` false positives**: Currency expressions like `$14.99` were incorrectly rendered as inline math. Improved regex to require non-space characters adjacent to `$` delimiters and reject `$` followed by digits
- **Auto-save scroll reset**: When VS Code auto-save triggered a formatter, the resulting text change caused `setContent()` to reset scroll position to top. Fixed by preserving `scrollTop` across content replacements

### Changed

- Full document syntax tree parsing via `ensureSyntaxTree()` to eliminate delayed decoration application during scroll
- Simplified live preview plugin by removing scroll-event-based rebuild deferral (no longer needed with full parse)
- Removed debug logging statements

## [0.1.8] - 2026-02-10

### Added

- Line numbers setting (`flowMd.lineNumbers`: on/off/relative)
- Marketplace publishing assets (README.md, README.ja.md, CHANGELOG.md, LICENSE)

### Changed

- `buildDecorations()` refactored: extracted 4 post-processing functions (`collectFootnoteDecorations`, `collectDetailsDecorations`, `collectMathDecorations`, `collectCheckboxDecorations`) for improved maintainability
- Package metadata updated for VS Code Marketplace (keywords, categories, descriptions)
- Setting descriptions translated to English for international users

### Fixed

- 6 pre-existing test failures (RELOAD_CONTENT message type addition, onInit 5-argument signature)

## [0.1.7] - 2026-02-09

### Changed

- Horizontal rule (`---`) padding adjustments for better visual spacing
- `flowMd.readableLineLength` now accepts numeric values (e.g., `1200`) in addition to boolean, allowing custom max-width in pixels

## [0.1.6] - 2026-02-09

### Added

- Find panel toggle with `Ctrl+F` (press again to close)

### Fixed

- Search panel close button (✕) visibility improved with larger font size and hover effect

## [0.1.5] - 2026-02-09

### Added

- File reload button — re-reads the file from disk, useful when external changes occur

## [0.1.4] - 2026-02-09

### Added

- Alt+scroll for fast scrolling (3× speed multiplier)

### Fixed

- Decoration disappearance during fast scrolling — decorations are now maintained across viewport changes
- Mermaid diagram ID collision when multiple diagrams are present in the same document

## [0.1.3] - 2026-02-09

### Changed

- Increased line height for improved readability
- Added underline styling to links for better visual distinction

### Fixed

- Rectangle selection (Alt+drag) behavior corrected

## [0.1.1] - 2026-02-08

### Added

- Anchor link navigation — click `#heading` links to jump within the document
- Internal README for development reference

### Changed

- Horizontal rule padding adjustments

### Fixed

- Default editor mode setting (`flowMd.defaultMode`) now correctly applied on initial load

## [0.1.0] - 2026-02-08

### Added

#### Core Editor

- CodeMirror 6 based WYSIWYG Markdown editor with Obsidian-style live preview
- Three editing modes: Live Preview, Source, and Viewer (cycle with keyboard shortcut)
- Cursor-aware editing: focused block shows raw Markdown, other blocks show rendered content
- VS Code CustomTextEditor integration with full Undo/Redo support
- Bidirectional content sync between extension host and webview

#### Rendering

- Mermaid diagram rendering (flowcharts, sequence diagrams, class diagrams, etc.)
- KaTeX math rendering for inline (`$...$`) and block (`$$...$$`) expressions using MathML output
- Syntax highlighting for 15+ programming languages in fenced code blocks
- Footnotes with auto-numbering and click-to-jump navigation
- Nested blockquotes with colored indicator bars (up to 5 levels)
- Collapsible list sections with fold/unfold arrows
- Collapsible `<details>/<summary>` HTML elements
- Strikethrough text support (`~~text~~`)
- Image display for local files, URLs, and data URIs
- Horizontal rule rendering

#### Tables

- GFM (GitHub Flavored Markdown) table rendering
- Interactive add row/column buttons on hover
- Inline checkboxes within table cells

#### UI/UX

- Dark and Light theme synchronization with VS Code color theme
- Code block copy button for one-click code copying
- Scroll-to-top and scroll-to-bottom jump buttons
- Find and Replace panel (`Ctrl+F` / `Ctrl+H`)
- IME composition support for Japanese, Chinese, and Korean input
- Word wrap toggle
- Readable line length option (max-width constraint for comfortable reading)

#### Settings

- `flowMd.defaultMode`: Default editing mode (live/source/viewer)
- `flowMd.wordWrap`: Word wrap toggle
- `flowMd.readableLineLength`: Readable line length toggle
- `flowMd.theme`: Theme override (auto/dark/light)
- `flowMd.largeFileWarningThreshold`: Large file warning threshold in bytes
- `flowMd.syncDebounceMs`: Content sync debounce timing in milliseconds
- `flowMd.enableDebugLog`: Debug logging toggle

#### Commands

- `FlowMD: Open with FlowMD` — Open current .md file with FlowMD editor
- `FlowMD: Toggle Mode` — Cycle through Live → Viewer → Source modes
- `FlowMD: Find` — Open find dialog
- `FlowMD: Find and Replace` — Open find and replace dialog
