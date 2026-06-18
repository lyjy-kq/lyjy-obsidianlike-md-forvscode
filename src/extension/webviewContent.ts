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

/* Scroll jump buttons */
.scroll-jump-container {
    position: fixed;
    right: 24px;
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
 * @returns Complete HTML string for the Webview
 *
 * Design Reference: DES-S-001, DES-F-002
 * Requirements: REQ-NF-002, REQ-F-008
 */
export function getHtmlForWebview(webview: vscode.Webview, extensionUri: vscode.Uri): string {
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
    }</style>
    <style>
${styles}
    </style>
</head>
<body>
    <div id="editor"></div>
    <div class="scroll-jump-container">
        <button class="scroll-jump-btn" id="reload-content" title="Reload from disk"><span class="btn-icon">&#8635;</span></button>
        <button class="scroll-jump-btn" id="scroll-top" title="Scroll to top">&#9650;</button>
        <button class="scroll-jump-btn" id="scroll-bottom" title="Scroll to bottom">&#9660;</button>
    </div>
    <script src="${scriptUriString}"></script>
</body>
</html>`;
}
