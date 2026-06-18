/**
 * Webview HTML Generation and Content Security Policy Configuration
 *
 * This module provides functions for generating secure HTML content for the
 * FlowMD Webview editor, including Content Security Policy (CSP) configuration.
 *
 * @module extension/webviewContent
 *
 * Design Reference: DES-S-001 - Content Security Policy settings
 * Design Reference: DES-A-005 - Theme integration design
 * Requirements: REQ-NF-002 - Security requirements
 * Requirements: REQ-F-008 - Dark/Light theme support
 */

import * as vscode from 'vscode';

// =============================================================================
// Constants
// =============================================================================

// =============================================================================
// Content Security Policy
// =============================================================================

/**
 * Generate the Content Security Policy string for the Webview.
 *
 * The CSP restricts resource loading to enhance security:
 * - default-src 'none': Deny all resources by default
 * - script-src: Allow scripts from VS Code webview source only
 * - style-src: Allow styles from VS Code and inline styles (for CodeMirror)
 * - img-src: Allow images from VS Code, HTTPS, and data URIs
 * - font-src: Allow fonts from VS Code
 *
 * @param webview - The VS Code Webview instance
 * @param _nonce - Unused, kept for backward compatibility
 * @returns The complete CSP string
 *
 * Design Reference: DES-S-001
 * Requirements: REQ-NF-002
 */
export function getContentSecurityPolicy(webview: vscode.Webview, _nonce: string): string {
    const directives = [
        // Deny all resource loading by default
        "default-src 'none'",

        // Allow scripts from VS Code webview source only (DES-S-001)
        `script-src ${webview.cspSource}`,

        // Allow styles from VS Code CDN and inline styles (required for CodeMirror)
        `style-src ${webview.cspSource} 'unsafe-inline'`,

        // Allow images from VS Code CDN, HTTPS URLs, and data URIs
        `img-src ${webview.cspSource} https: data:`,

        // Allow fonts from VS Code CDN
        `font-src ${webview.cspSource}`,

        // Allow connections for source maps (development) and VS Code resources
        `connect-src ${webview.cspSource} https:`,
    ];

    return directives.join('; ');
}

// =============================================================================
// CSS Styles (Inline)
// =============================================================================

/**
 * Generate inline CSS styles for the Webview.
 *
 * Combines base styles with light and dark theme variables.
 * Uses data-theme attribute selector for theme switching.
 *
 * @returns Complete CSS string for the Webview
 *
 * Design Reference: DES-A-005
 * Requirements: REQ-F-008
 */
export function getInlineStyles(): string {
    return `
/* =============================================================================
 * Base Layout - CodeMirror Editor
 * ============================================================================= */

body {
    margin: 0;
    padding: 0;
    background-color: var(--vscode-editor-background, #272b33);
    color: var(--vscode-editor-foreground, #d4d4d4);
    font-family: var(--vscode-editor-font-family, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace);
    font-size: var(--vscode-editor-font-size, 14px);
    overflow: hidden;
}

#app-shell {
    width: 100vw;
    height: 100vh;
    display: flex;
    flex-direction: row;
    overflow: hidden;
}

#editor-pane {
    flex: 1 1 auto;
    min-width: 0;
    position: relative;
}

#editor {
    width: 100%;
    height: 100vh;
}

/* CodeMirror fills the editor container */
#editor .cm-editor {
    height: 100%;
}

/* Content padding and max-width for readability */
#editor .cm-content {
    max-width: var(--flowmd-max-width, 900px);
    padding: 24px 32px !important;
}

/* Scroller */
#editor .cm-scroller {
    overflow: auto;
}

#outline-resizer {
    width: 6px;
    flex: 0 0 6px;
    cursor: col-resize;
    background: transparent;
    position: relative;
    z-index: 5;
}

#outline-resizer::before {
    content: "";
    position: absolute;
    top: 0;
    bottom: 0;
    left: 50%;
    width: 1px;
    transform: translateX(-50%);
    background: rgba(128, 128, 128, 0.22);
    transition: background-color 0.15s ease;
}

#outline-resizer:hover::before,
#outline-resizer[data-dragging="true"]::before {
    background: rgba(79, 193, 255, 0.65);
}

#outline-pane {
    width: var(--flowmd-outline-width, 280px);
    min-width: 220px;
    max-width: 480px;
    height: 100vh;
    overflow: auto;
    background: var(--vscode-editor-background, #272b33);
    color: var(--vscode-editor-foreground, #d4d4d4);
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
}

#outline-content {
    padding: 10px 10px 16px;
    font-size: var(--vscode-editor-font-size, 14px);
    line-height: var(--flowmd-line-height, 1.7em);
}

.outline-empty {
    padding: 12px 8px;
    color: var(--vscode-descriptionForeground, #999);
    font-size: inherit;
    line-height: inherit;
}

.outline-tree,
.outline-tree ul {
    list-style: none;
    margin: 0;
    padding: 0;
}

.outline-item {
    margin: 0;
    overflow: hidden;
}

.outline-item[data-level="1"] {
    --outline-accent: rgba(79, 193, 255, 0.18);
}

.outline-item[data-level="2"] {
    --outline-accent: rgba(61, 220, 151, 0.16);
}

.outline-item[data-level="3"] {
    --outline-accent: rgba(255, 199, 95, 0.16);
}

.outline-item[data-level="4"] {
    --outline-accent: rgba(194, 132, 255, 0.16);
}

.outline-item[data-level="5"] {
    --outline-accent: rgba(255, 137, 95, 0.16);
}

.outline-item[data-level="6"] {
    --outline-accent: rgba(158, 174, 255, 0.16);
}

.outline-row {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    min-height: var(--flowmd-line-height, 1.7em);
    padding: 0 10px 0 8px;
    border: none;
    background: var(--outline-accent, rgba(128, 128, 128, 0.08));
    color: inherit;
    cursor: pointer;
    text-align: left;
    font: inherit;
    line-height: var(--flowmd-line-height, 1.7em);
    transition: background-color 0.15s ease, transform 0.15s ease, color 0.15s ease;
}

.outline-row:hover {
    background: rgba(79, 193, 255, 0.18);
}

.outline-row[data-active="true"] {
    background: rgba(79, 193, 255, 0.26);
    color: var(--vscode-editor-foreground, #d4d4d4);
}

.outline-toggle {
    width: 16px;
    flex: 0 0 16px;
    font-size: 11px;
    line-height: 1;
    text-align: center;
    color: var(--vscode-focusBorder, #4fc1ff);
    user-select: none;
}

.outline-toggle[data-collapsed="true"] {
    color: var(--vscode-descriptionForeground, #999);
}

.outline-label {
    flex: 1 1 auto;
    min-width: 0;
    font: inherit;
    line-height: inherit;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.outline-meta {
    flex: 0 0 auto;
    font-size: 0.85em;
    line-height: inherit;
    color: var(--vscode-descriptionForeground, #999);
}

.outline-children {
    margin-left: 14px;
    padding-left: 10px;
    border-left: 1px solid rgba(128, 128, 128, 0.16);
}

/* Scroll jump buttons */
.scroll-jump-container {
    position: fixed;
    right: calc(var(--flowmd-outline-width, 280px) + 24px);
    bottom: 24px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    z-index: 100;
}
.scroll-jump-btn {
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 6px;
    background: rgba(128, 128, 128, 0.2);
    color: #888;
    font-size: 14px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0.6;
    transition: opacity 0.15s ease, background-color 0.15s ease;
}
.scroll-jump-btn:hover {
    opacity: 1;
    background: rgba(128, 128, 128, 0.4);
    color: #ccc;
}
@keyframes spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
}
.scroll-jump-btn.spinning {
    opacity: 1;
    pointer-events: none;
}
.scroll-jump-btn.spinning .btn-icon {
    display: inline-block;
    animation: spin 0.8s linear infinite;
    color: var(--vscode-focusBorder, #007acc);
}
`;
}

// =============================================================================
// Editor.fontWeight bridge
// =============================================================================

/**
 * Read VS Code's `editor.fontWeight` and return a CSS-safe value string for
 * injection as the `--flowmd-font-weight` custom property.
 *
 * VS Code does not expose `editor.fontWeight` as a CSS variable in webviews
 * (unlike `--vscode-editor-font-family` and `--vscode-editor-font-size`), so
 * we read it on the extension side and forward it.
 *
 * Accepted values:
 * - `'normal'` / `'bold'` — CSS keywords
 * - Numeric `1`〜`1000` (string or number) — CSS Fonts Level 4 range
 * - Anything else falls back to `'400'`
 *
 * Validation prevents unexpected values from breaking the inline `<style>`
 * block that sets `:root { --flowmd-font-weight: <value>; }`.
 */
function getEditorFontWeightCss(): string {
    const raw = vscode.workspace.getConfiguration('editor').get<string | number>('fontWeight');

    if (raw === undefined || raw === null) {
        return '400';
    }
    if (raw === 'normal' || raw === 'bold') {
        return raw;
    }
    const num = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
    if (Number.isFinite(num) && num >= 1 && num <= 1000) {
        return String(num);
    }
    return '400';
}

/**
 * Read VS Code's `editor.lineHeight` and return a CSS-safe value string for
 * injection as the `--flowmd-line-height` custom property.
 *
 * VS Code does not expose `editor.lineHeight` as a CSS variable in webviews
 * (unlike `--vscode-editor-font-family` and `--vscode-editor-font-size`), so
 * we read it on the extension side and forward it.
 *
 * VS Code semantics for `editor.lineHeight`:
 * - `0` (or unset) — auto: derive from font size; we map this to the existing
 *   `1.7em` fallback to preserve prior behaviour.
 * - `< 8` — multiplier of font size. We append `em` so the parent's computed
 *   pixel value is inherited by child elements (e.g. `.cm-md-code` at
 *   `font-size: 0.9em`) instead of being re-evaluated against each child's
 *   font size, which would cause height-estimation mismatches and scroll jumps.
 * - `>= 8` — explicit pixel value.
 *
 * Anything that fails type/finiteness checks falls back to `1.7em` so a broken
 * setting cannot inject invalid CSS or open the inline `<style>` block to XSS.
 */
function getEditorLineHeightCss(): string {
    const raw = vscode.workspace.getConfiguration('editor').get<number>('lineHeight');

    if (typeof raw !== 'number' || !Number.isFinite(raw) || raw < 0) {
        return '1.7em';
    }
    if (raw === 0) {
        return '1.7em';
    }
    if (raw < 8) {
        return `${raw}em`;
    }
    return `${raw}px`;
}

// =============================================================================
// HTML Generation
// =============================================================================

/**
 * Generate the complete HTML content for the FlowMD Webview.
 *
 * Creates a secure HTML document with:
 * - Proper DOCTYPE and charset declarations
 * - Content Security Policy meta tag (DES-S-001)
 * - Viewport configuration for responsive design
 * - Inline CSS styles for theming
 * - Editor container element
 * - Script tag for webview.js (CodeMirror initialization)
 *
 * @param webview - The VS Code Webview instance
 * @param extensionUri - The URI of the extension's root directory
 * @param outlineWidth - Saved width of the outline panel in pixels
 * @returns Complete HTML string for the Webview
 *
 * Design Reference: DES-S-001, DES-F-002
 * Requirements: REQ-NF-002, REQ-F-008
 */
export function getHtmlForWebview(
    webview: vscode.Webview,
    extensionUri: vscode.Uri,
    outlineWidth: number = 280
): string {
    // Generate script URI for webview.js (contains CodeMirror initialization)
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'dist', 'webview.js'));

    // Generate Content Security Policy (nonce not used per DES-S-001)
    const csp = getContentSecurityPolicy(webview, '');

    // Get inline CSS styles
    const styles = getInlineStyles();

    // Convert script URI to string for template literal
    const scriptUriString = scriptUri.toString();

    // VS Code does not expose `editor.fontWeight` or `editor.lineHeight` as
    // CSS variables in webviews (unlike --vscode-editor-font-family /
    // --vscode-editor-font-size), so we read the settings on the extension
    // side and inject them as CSS custom properties. CodeMirror styles read
    // them via var(--flowmd-font-weight, 400) and var(--flowmd-line-height,
    // 1.7em).
    const fontWeight = getEditorFontWeightCss();
    const lineHeight = getEditorLineHeightCss();
    const safeOutlineWidth = Number.isFinite(outlineWidth) && outlineWidth > 0 ? outlineWidth : 280;

    // Return the complete HTML document
    // Note: Script tag does not use nonce - CSP uses cspSource instead (DES-S-001)
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="${csp}">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FlowMD Editor</title>
    <style>:root {
        --flowmd-font-weight: ${fontWeight};
        --flowmd-line-height: ${lineHeight};
        --flowmd-font-scale: 1;
        --flowmd-editor-font-size: var(--vscode-editor-font-size, 14px);
        --flowmd-outline-width: ${safeOutlineWidth}px;
    }</style>
    <style>
${styles}
    </style>
</head>
<body>
    <div id="app-shell">
        <div id="editor-pane">
            <div id="editor"></div>
        </div>
        <div id="outline-resizer" role="separator" aria-orientation="vertical" aria-label="Resize outline panel"></div>
        <aside id="outline-pane" aria-label="Markdown outline">
            <div id="outline-content">
                <div class="outline-empty">标题大纲会在这里显示。</div>
            </div>
        </aside>
    </div>
    
    // <div class="scroll-jump-container">
    //     <button class="scroll-jump-btn" id="reload-content" title="Reload from disk"><span class="btn-icon">&#8635;</span></button>
    //     <button class="scroll-jump-btn" id="scroll-top" title="Scroll to top">&#9650;</button>
    //     <button class="scroll-jump-btn" id="scroll-bottom" title="Scroll to bottom">&#9660;</button>
    // </div>
    <script src="${scriptUriString}"></script>
</body>
</html>`;
}
