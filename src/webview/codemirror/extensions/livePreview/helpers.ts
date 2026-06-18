/**
 * Live Preview Helpers
 *
 * Utility functions for table parsing, inline markdown rendering,
 * and code block content extraction.
 *
 * @module webview/codemirror/extensions/livePreview/helpers
 */

import type { EditorState } from '@codemirror/state';
import type { SyntaxNode } from '@lezer/common';
import type { TableData, FrontmatterProperty } from './types.js';

/**
 * Apply text alignment to an HTML element.
 */
export function applyAlignment(el: HTMLElement, align: string | undefined): void {
    if (align && align !== 'default') {
        el.style.textAlign = align;
    }
}

/**
 * Escape HTML special characters.
 */
export function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * Render inline Markdown to HTML (bold, italic, strikethrough, code, links).
 */
export function renderInlineMarkdown(text: string): string {
    // Unescape \| to | before HTML escaping (backslash-pipe is Markdown table escape)
    let html = escapeHtml(text.replace(/\\\|/g, '|').trim());
    if (html === '') return '&nbsp;';
    // Restore <br> tags escaped above (GFM table cells use <br> for line breaks)
    html = html.replace(/&lt;br\s*\/?\s*&gt;/gi, '<br>');
    // Inline checkboxes (before link processing to avoid conflict)
    html = html.replace(
        /\[(x|X)\]/g,
        '<input type="checkbox" checked class="cm-md-checkbox cm-md-table-checkbox" />'
    );
    html = html.replace(
        /\[ \]/g,
        '<input type="checkbox" class="cm-md-checkbox cm-md-table-checkbox" />'
    );
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/~~(.+?)~~/g, '<del class="cm-md-strikethrough">$1</del>');
    html = html.replace(/`(.+?)`/g, '<code class="cm-md-code">$1</code>');
    html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a class="cm-md-link">$1</a>');
    return html;
}

/**
 * Parse table delimiter row to extract column alignments.
 */
export function parseAlignments(
    delimiterText: string
): Array<'left' | 'center' | 'right' | 'default'> {
    return delimiterText
        .split('|')
        .filter((c) => c.trim().length > 0)
        .map((cell) => {
            const t = cell.trim();
            if (t.startsWith(':') && t.endsWith(':')) return 'center';
            if (t.endsWith(':')) return 'right';
            if (t.startsWith(':')) return 'left';
            return 'default';
        });
}

/** Split a table row text like "| A | B | C |" into cell contents ["A", "B", "C"].
 *  Handles escaped pipes (\|) which should be treated as literal pipe characters, not delimiters. */
export function splitTableRow(text: string): string[] {
    // Split on unescaped pipes: a pipe NOT preceded by a backslash
    const parts: string[] = [];
    let current = '';
    for (let i = 0; i < text.length; i++) {
        if (text[i] === '|' && (i === 0 || text[i - 1] !== '\\')) {
            parts.push(current);
            current = '';
        } else {
            current += text[i];
        }
    }
    parts.push(current);
    // Remove leading empty part (before first |) and trailing empty part (after last |)
    if (parts.length > 0 && parts[0].trim() === '') parts.shift();
    if (parts.length > 0 && parts[parts.length - 1].trim() === '') parts.pop();
    return parts;
}

/**
 * Parse a Lezer Table syntax node into structured TableData.
 */
export function parseTableNode(node: SyntaxNode, state: EditorState): TableData | null {
    const linePositions: Array<{ from: number; to: number }> = [];
    let headerText = '';
    let delimiterText = '';
    const rowTexts: string[] = [];

    let child = node.firstChild;
    while (child) {
        const line = state.doc.lineAt(child.from);
        linePositions.push({ from: line.from, to: line.to });
        // Use child.from (not line.from) for text extraction.
        // Inside blockquotes, line.from includes the "> " prefix which would
        // pollute cell contents. child.from starts at the actual table content.
        if (child.name === 'TableHeader') {
            headerText = state.doc.sliceString(child.from, line.to);
        } else if (child.name === 'TableDelimiter') {
            delimiterText = state.doc.sliceString(child.from, line.to);
        } else if (child.name === 'TableRow') {
            rowTexts.push(state.doc.sliceString(child.from, line.to));
        }
        child = child.nextSibling;
    }

    // Text-based cell parsing (handles empty cells that Lezer skips)
    const headers = splitTableRow(headerText);
    const alignments = parseAlignments(delimiterText);
    const rows = rowTexts.map((t) => splitTableRow(t));

    if (headers.length === 0) return null;
    return {
        headers,
        alignments,
        rows,
        positions: {
            tableFrom: node.from,
            tableTo: node.to,
            linePositions,
        },
    };
}

/**
 * Parse YAML frontmatter text into an array of key-value properties.
 * Handles simple values, quoted strings, and block scalars (| and >).
 */
export function parseFrontmatter(yamlText: string): FrontmatterProperty[] {
    const properties: FrontmatterProperty[] = [];
    const lines = yamlText.split('\n');
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];
        const match = line.match(/^(\w[\w\s-]*):\s*(.*)/);
        if (!match) {
            i++;
            continue;
        }

        const key = match[1].trim();
        let value = match[2].trim();

        // Block scalar (| or >)
        if (value === '|' || value === '>') {
            const blockLines: string[] = [];
            i++;
            while (i < lines.length) {
                const bLine = lines[i];
                // Continuation: indented line or empty line within block
                if (bLine.match(/^\s+/) || (bLine.trim() === '' && blockLines.length > 0)) {
                    blockLines.push(bLine.replace(/^\s{2}/, ''));
                    i++;
                } else {
                    break;
                }
            }
            // Trim trailing empty lines
            while (blockLines.length > 0 && blockLines[blockLines.length - 1].trim() === '') {
                blockLines.pop();
            }
            value = blockLines.join(value === '|' ? '\n' : ' ');
        } else {
            // Strip surrounding quotes
            if (
                (value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))
            ) {
                value = value.slice(1, -1);
            }
            i++;
        }

        properties.push({ key, value });
    }

    return properties;
}

/**
 * Extract content text from a fenced code block node (excluding opening/closing fences).
 */
export function extractFencedCodeContent(node: SyntaxNode, state: EditorState): string | null {
    const startLine = state.doc.lineAt(node.from);
    const endLine = state.doc.lineAt(node.to);
    if (endLine.number <= startLine.number + 1) return null;
    const contentStart = state.doc.line(startLine.number + 1).from;
    const contentEnd = state.doc.line(endLine.number).from;
    if (contentStart >= contentEnd) return null;
    return state.doc.sliceString(contentStart, contentEnd).trimEnd();
}
