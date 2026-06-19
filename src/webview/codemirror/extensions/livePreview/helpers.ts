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
 * 提取 fenced code block 的语言名。
 *
 * @param node - fenced code block 对应的语法节点
 * @param state - 当前编辑器状态，用于读取代码块 info 文本
 * @returns 规范化后的语言名，没有显式语言时返回 `go`
 */
export function extractFencedCodeLanguage(node: SyntaxNode, state: EditorState): string {
    const codeInfoNode = node.getChild('CodeInfo');
    if (!codeInfoNode) return 'go';

    const rawInfo = state.doc.sliceString(codeInfoNode.from, codeInfoNode.to).trim();
    if (!rawInfo) return 'go';

    const language = rawInfo.split(/\s+/)[0].trim().toLowerCase();
    return language || 'go';
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

/**
 * 计算代码行的缩进层级，用于缩进导引渲染。
 *
 * @param lineText - 当前代码行文本
 * @returns 缩进层级，未缩进时返回 0
 */
export function getCodeBlockIndentLevel(lineText: string): number {
    let indentColumns = 0;
    let sawTab = false;
    for (let i = 0; i < lineText.length; i++) {
        const ch = lineText[i];
        if (ch === ' ') {
            if (sawTab) break;
            indentColumns += 1;
            continue;
        }
        if (ch === '\t') {
            sawTab = true;
            indentColumns += 4;
            continue;
        }
        break;
    }

    if (indentColumns <= 0) return 0;
    return Math.min(6, Math.max(1, Math.ceil(indentColumns / 4)));
}

/**
 * 生成代码块缩进导引的内联样式。
 *
 * @param indentLevel - 缩进层级，0 表示最外层
 * @returns 可直接写入 line decoration attributes.style 的样式字符串
 */
export function createCodeBlockIndentStyle(indentLevel: number): string {
    const backgroundColor = '#1e1f20';
    const palette = [
        'rgba(235, 131, 131, 0.18)',
        'rgba(174, 154, 203, 0.18)',
        'rgba(125, 181, 205, 0.18)',
        'rgba(113, 167, 150, 0.18)',
        'rgba(220, 191, 97, 0.18)',
        'rgba(221, 163, 106, 0.18)',
        'rgba(184, 245, 162, 0.18)',
    ];
    const levelCount = Math.max(0, Math.min(6, indentLevel));
    const layers: string[] = [];
    const positions: string[] = [];
    const sizes: string[] = [];

    for (let i = 0; i < levelCount; i++) {
        const color = palette[i % palette.length];
        layers.push(`linear-gradient(${color}, ${color})`);
        positions.push(`${i * 4}ch 0`);
        sizes.push('4ch 100%');
    }

    if (layers.length === 0) {
        return `background-color: ${backgroundColor}; background-image: none; background-repeat: no-repeat;`;
    }

    return [
        `background-color: ${backgroundColor}`,
        `background-image: ${layers.join(', ')}`,
        'background-repeat: no-repeat',
        // 使用 padding-box 让缩进块覆盖边缘留白，避免左右黑边露出。
        'background-origin: padding-box',
        'background-clip: padding-box',
        `background-position: ${positions.join(', ')}`,
        `background-size: ${sizes.join(', ')}`,
    ].join('; ');
}
