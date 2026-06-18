/**
 * FlowMD HTML Exporter
 *
 * Converts Markdown files to standalone HTML documents.
 * Handles math (KaTeX→MathML), Mermaid (CDN), footnotes,
 * syntax highlighting (highlight.js CDN), and GFM extensions.
 *
 * @module extension/htmlExporter
 */

import * as vscode from 'vscode';
import * as path from 'path';
import katex from 'katex';
import { LIGHT_THEME_CSS } from './htmlExportStyles.js';
import { Logger } from './logger.js';

// =============================================================================
// Constants
// =============================================================================

const MERMAID_CDN = 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
const HLJS_CDN_CSS =
    'https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11/build/styles/github.min.css';
const HLJS_CDN_JS = 'https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11/build/highlight.min.js';

// =============================================================================
// Math Preprocessing
// =============================================================================

interface MathPlaceholder {
    placeholder: string;
    html: string;
}

/**
 * Render a TeX expression to MathML via KaTeX.
 */
function renderMath(tex: string, displayMode: boolean): string {
    try {
        return katex.renderToString(tex, {
            output: 'mathml',
            displayMode,
            throwOnError: false,
        });
    } catch {
        const escaped = tex.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return `<span class="math-error">${escaped}</span>`;
    }
}

/**
 * Extract math expressions from Markdown, replacing them with placeholders.
 * Returns the modified Markdown and a list of placeholders for restoration.
 *
 * Block math: $$...$$ (single or multi-line)
 * Inline math: $...$ (not $$, not currency like $14.99)
 */
function extractMath(markdown: string): { text: string; placeholders: MathPlaceholder[] } {
    const placeholders: MathPlaceholder[] = [];
    let idx = 0;

    function makePlaceholder(html: string): string {
        const ph = `%%MATH_PH_${idx++}%%`;
        placeholders.push({ placeholder: ph, html });
        return ph;
    }

    const lines = markdown.split('\n');
    const result: string[] = [];
    let i = 0;
    let insideCodeBlock = false;

    while (i < lines.length) {
        const line = lines[i];

        // Track fenced code blocks
        if (line.trimStart().startsWith('```')) {
            insideCodeBlock = !insideCodeBlock;
            result.push(line);
            i++;
            continue;
        }

        if (insideCodeBlock) {
            result.push(line);
            i++;
            continue;
        }

        // Block math: $$ on its own line
        if (line.trimStart().startsWith('$$')) {
            // Same-line block math: $$...$$
            const sameLineMatch = line.match(/^\s*\$\$(.+?)\$\$/);
            if (sameLineMatch) {
                const tex = sameLineMatch[1].trim();
                const html = `<div class="math-block">${renderMath(tex, true)}</div>`;
                result.push(makePlaceholder(html));
                i++;
                continue;
            }

            // Multi-line block math
            let closingIdx = i + 1;
            let found = false;
            while (closingIdx < lines.length) {
                if (lines[closingIdx].trimStart().startsWith('$$')) {
                    found = true;
                    break;
                }
                closingIdx++;
            }

            if (found) {
                const texContent = lines
                    .slice(i + 1, closingIdx)
                    .join('\n')
                    .trim();
                const html = `<div class="math-block">${renderMath(texContent, true)}</div>`;
                result.push(makePlaceholder(html));
                i = closingIdx + 1;
            } else {
                // No closing $$, leave as-is
                result.push(line);
                i++;
            }
            continue;
        }

        // Inline math: $...$ (not $$, not currency)
        const processed = line.replace(
            /(?<!\$)\$(?!\$)(?!\s)(.+?)(?<!\s|\$)\$(?!\$|\d)/g,
            (_match, tex: string) => {
                if (!tex.trim()) return _match;
                // Skip if inside inline code
                const html = `<span class="math-inline">${renderMath(tex, false)}</span>`;
                return makePlaceholder(html);
            }
        );
        result.push(processed);
        i++;
    }

    return { text: result.join('\n'), placeholders };
}

/**
 * Restore math placeholders in rendered HTML.
 */
function restoreMath(html: string, placeholders: MathPlaceholder[]): string {
    let result = html;
    for (const { placeholder, html: mathHtml } of placeholders) {
        result = result.replace(placeholder, mathHtml);
    }
    return result;
}

// =============================================================================
// Footnote Preprocessing
// =============================================================================

interface FootnoteData {
    label: string;
    index: number;
    content: string;
}

/**
 * Extract footnote definitions and convert references to HTML.
 * Definitions are removed from text and rendered as a section at the end.
 */
function processFootnotes(markdown: string): { text: string; footnotesHtml: string } {
    const lines = markdown.split('\n');
    const footnotes: FootnoteData[] = [];
    const labels: string[] = [];
    const resultLines: string[] = [];

    // First pass: collect all footnote definitions
    for (const line of lines) {
        const defMatch = line.match(/^\[\^([^\]]+)\]:\s?(.*)/);
        if (defMatch) {
            const label = defMatch[1];
            const content = defMatch[2];
            if (!labels.includes(label)) {
                labels.push(label);
                footnotes.push({ label, index: labels.length, content });
            }
        } else {
            resultLines.push(line);
        }
    }

    if (footnotes.length === 0) {
        return { text: markdown, footnotesHtml: '' };
    }

    // Second pass: convert references [^label] to superscript links
    let text = resultLines.join('\n');
    for (const fn of footnotes) {
        const refPattern = new RegExp(`\\[\\^${escapeRegex(fn.label)}\\]`, 'g');
        text = text.replace(
            refPattern,
            `<sup class="footnote-ref"><a href="#fn-${fn.index}" id="fnref-${fn.index}">${fn.index}</a></sup>`
        );
    }

    // Build footnotes section HTML
    const footnotesHtml = `
<section class="footnotes-section">
<hr>
<ol>
${footnotes
    .map(
        (fn) =>
            `<li id="fn-${fn.index}">${fn.content} <a href="#fnref-${fn.index}" class="footnote-backref">\u21a9</a></li>`
    )
    .join('\n')}
</ol>
</section>`;

    return { text, footnotesHtml };
}

function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// =============================================================================
// Mermaid Preprocessing
// =============================================================================

/**
 * Convert ```mermaid code blocks to <pre class="mermaid"> for CDN rendering.
 */
function processMermaid(markdown: string): { text: string; hasMermaid: boolean } {
    let hasMermaid = false;
    const lines = markdown.split('\n');
    const result: string[] = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];
        const trimmed = line.trimStart();

        if (trimmed === '```mermaid' || trimmed === '``` mermaid') {
            hasMermaid = true;
            // Find closing ```
            let closingIdx = i + 1;
            while (closingIdx < lines.length && !lines[closingIdx].trimStart().startsWith('```')) {
                closingIdx++;
            }

            const mermaidContent = lines.slice(i + 1, closingIdx).join('\n');
            result.push(`<pre class="mermaid">`);
            result.push(mermaidContent);
            result.push(`</pre>`);
            i = closingIdx + 1;
        } else {
            result.push(line);
            i++;
        }
    }

    return { text: result.join('\n'), hasMermaid };
}

// =============================================================================
// HTML Generation
// =============================================================================

/**
 * Convert Markdown to rendered HTML body using marked.
 */
async function convertMarkdownToHtml(
    markdown: string
): Promise<{ body: string; hasMermaid: boolean }> {
    // 1. Extract math expressions (before marked touches them)
    const { text: afterMath, placeholders } = extractMath(markdown);

    // 2. Process footnotes
    const { text: afterFootnotes, footnotesHtml } = processFootnotes(afterMath);

    // 3. Process Mermaid blocks (before marked escapes them)
    const { text: afterMermaid, hasMermaid } = processMermaid(afterFootnotes);

    // 4. Parse remaining Markdown with marked
    // Note: marked is ESM-only; dynamic import() is the TS-sanctioned way to load
    // it from a CJS module. esbuild inlines this into the bundle at build time,
    // so runtime behavior is identical to a static import.
    const { Marked } = await import('marked');
    const marked = new Marked();
    marked.setOptions({
        gfm: true,
        breaks: false,
    });

    let html = await marked.parse(afterMermaid);

    // 5. Restore math placeholders
    html = restoreMath(html, placeholders);

    // 6. Append footnotes
    if (footnotesHtml) {
        html += footnotesHtml;
    }

    return { body: html, hasMermaid };
}

/**
 * Generate a complete standalone HTML document.
 */
function generateStandaloneHtml(body: string, title: string, hasMermaid: boolean): string {
    const mermaidScript = hasMermaid
        ? `\n<script type="module">
import mermaid from '${MERMAID_CDN}';
mermaid.initialize({ startOnLoad: true, theme: 'default' });
</script>`
        : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<link rel="stylesheet" href="${HLJS_CDN_CSS}">
<style>
${LIGHT_THEME_CSS}
</style>
</head>
<body>
<div class="markdown-body">
${body}
</div>
<script src="${HLJS_CDN_JS}"></script>
<script>hljs.highlightAll();</script>${mermaidScript}
</body>
</html>`;
}

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// =============================================================================
// Command Handler
// =============================================================================

/**
 * Export a Markdown file as standalone HTML.
 * Called from Explorer context menu, editor tab context menu, or command palette.
 *
 * @param uri - The URI of the Markdown file to export (optional; uses active editor if not provided)
 */
export async function exportMarkdownAsHtml(uri?: vscode.Uri): Promise<void> {
    try {
        // Resolve the target file URI
        if (!uri) {
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor && activeEditor.document.languageId === 'markdown') {
                uri = activeEditor.document.uri;
            } else {
                // Try to get from active custom editor tab
                const activeTab = vscode.window.tabGroups.activeTabGroup.activeTab;
                if (
                    activeTab?.input &&
                    typeof activeTab.input === 'object' &&
                    'uri' in activeTab.input
                ) {
                    uri = (activeTab.input as { uri: vscode.Uri }).uri;
                }
            }
        }

        if (!uri) {
            vscode.window.showWarningMessage('FlowMD: No Markdown file selected.');
            return;
        }

        Logger.info(`Exporting HTML: ${uri.fsPath}`);

        // Read the Markdown file
        const fileContent = await vscode.workspace.fs.readFile(uri);
        const markdown = Buffer.from(fileContent).toString('utf-8');

        // Convert to HTML
        const { body, hasMermaid } = await convertMarkdownToHtml(markdown);

        // Generate output path (foo.md → foo.html)
        const mdPath = uri.fsPath;
        const htmlPath = mdPath.replace(/\.md$/i, '.html');
        const title = path.basename(mdPath, path.extname(mdPath));

        // Generate standalone HTML
        const html = generateStandaloneHtml(body, title, hasMermaid);

        // Write the HTML file
        const htmlUri = vscode.Uri.file(htmlPath);
        await vscode.workspace.fs.writeFile(htmlUri, Buffer.from(html, 'utf-8'));

        Logger.info(`HTML exported: ${htmlPath}`);
        vscode.window.showInformationMessage(`FlowMD: Exported to ${path.basename(htmlPath)}`);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        Logger.error(
            `HTML export failed: ${errorMessage}`,
            error instanceof Error ? error : undefined
        );
        vscode.window.showErrorMessage(`FlowMD: Export failed: ${errorMessage}`);
    }
}
