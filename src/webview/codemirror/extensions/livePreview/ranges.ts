/**
 * Live Preview Range Detection
 *
 * Utilities for detecting focused line ranges, Markdown block boundaries,
 * and code block ranges in the editor state.
 *
 * @module webview/codemirror/extensions/livePreview/ranges
 */

import type { EditorState } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import type { SyntaxNode } from '@lezer/common';
import type { ILineRange } from './types.js';

/**
 * Gets the line range containing the cursor or selection.
 */
export function getFocusedLineRange(state: EditorState): ILineRange {
    const { main } = state.selection;
    if (main.empty) {
        const line = state.doc.lineAt(main.head);
        return { from: line.from, to: line.to };
    }
    const startLine = state.doc.lineAt(main.from);
    const endLine = state.doc.lineAt(main.to);
    return { from: startLine.from, to: endLine.to };
}

/**
 * Gets the Markdown block range for the current cursor position.
 * Expands to include the entire block (heading, list item, etc.).
 */
export function getMarkdownBlockRange(state: EditorState): ILineRange {
    const { main } = state.selection;
    const pos = main.head;
    const tree = syntaxTree(state);
    const doc = state.doc;

    // Check if in a code block - if so, return the entire code block range
    if (isInCodeBlock(state, pos)) {
        return getCodeBlockRange(state, pos);
    }

    // For single-line cursor, try to expand to Markdown block boundaries
    const cursorLine = doc.lineAt(pos);

    // Walk up the syntax tree to find the enclosing block
    let blockFrom = cursorLine.from;
    let blockTo = cursorLine.to;

    let node: SyntaxNode | null = tree.resolveInner(pos);
    while (node) {
        const { name } = node;

        // Block-level nodes that define editing boundaries
        if (
            name === 'ATXHeading1' ||
            name === 'ATXHeading2' ||
            name === 'ATXHeading3' ||
            name === 'ATXHeading4' ||
            name === 'ATXHeading5' ||
            name === 'ATXHeading6' ||
            name === 'SetextHeading1' ||
            name === 'SetextHeading2' ||
            name === 'Paragraph' ||
            name === 'BulletList' ||
            name === 'OrderedList' ||
            name === 'ListItem' ||
            name === 'Blockquote' ||
            name === 'FencedCode' ||
            name === 'Table' ||
            name === 'HorizontalRule' ||
            name === 'HTMLBlock'
        ) {
            // For list items, include just the current item (not the whole list)
            if (name === 'ListItem') {
                blockFrom = node.from;
                blockTo = node.to;
                break;
            }
            // For BulletList/OrderedList, find the specific ListItem containing the cursor
            if (name === 'BulletList' || name === 'OrderedList') {
                let child = node.firstChild;
                while (child) {
                    if (child.name === 'ListItem' && child.from <= pos && child.to >= pos) {
                        blockFrom = child.from;
                        blockTo = child.to;
                        break;
                    }
                    child = child.nextSibling;
                }
                break;
            }
            // For Blockquote, use the whole blockquote
            if (name === 'Blockquote') {
                blockFrom = node.from;
                blockTo = node.to;
                break;
            }
            // For tables, use the whole table
            if (name === 'Table') {
                blockFrom = node.from;
                blockTo = node.to;
                break;
            }
            // For headings, include the entire heading (including setext underline)
            if (name.startsWith('SetextHeading') || name.startsWith('ATXHeading')) {
                blockFrom = node.from;
                blockTo = node.to;
                break;
            }
            // For code blocks, use the whole block
            if (name === 'FencedCode') {
                blockFrom = node.from;
                blockTo = node.to;
                break;
            }
            // Paragraph inside a ListItem: use the ListItem range so that
            // the ListMark (e.g. "- ") is included in the focused area.
            // Without this, clicking in the middle of list-item text resolves
            // to the inner Paragraph, leaving the bullet widget in place.
            if (name === 'Paragraph' && node.parent?.name === 'ListItem') {
                blockFrom = node.parent.from;
                blockTo = node.parent.to;
                break;
            }

            // For other blocks, use the node range
            blockFrom = node.from;
            blockTo = node.to;
            break;
        }

        // Skip to parent
        if (name === 'Document') break;
        node = node.parent;
    }

    return { from: blockFrom, to: blockTo };
}

/**
 * Check if a position is inside a fenced code block (``` ... ```).
 * Uses line-by-line scanning for accuracy since Lezer tree may not have the node.
 */
export function isInCodeBlock(state: EditorState, pos: number): boolean {
    const doc = state.doc;
    const line = doc.lineAt(pos);
    let inCodeBlock = false;

    for (let ln = 1; ln <= line.number; ln++) {
        const lineText = doc.line(ln).text;
        const trimmed = lineText.trimStart();
        if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
            inCodeBlock = !inCodeBlock;
        }
    }

    return inCodeBlock;
}

/**
 * Get the range of the code block containing the given position.
 * Returns the position range from opening ``` to closing ```.
 */
export function getCodeBlockRange(state: EditorState, pos: number): ILineRange {
    const doc = state.doc;
    let inCodeBlock = false;
    let codeBlockStart = 0;

    for (let ln = 1; ln <= doc.lines; ln++) {
        const currentLine = doc.line(ln);
        const trimmed = currentLine.text.trimStart();
        if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
            if (!inCodeBlock) {
                codeBlockStart = currentLine.from;
                inCodeBlock = true;
            } else {
                // Found closing fence
                if (pos >= codeBlockStart && pos <= currentLine.to) {
                    return { from: codeBlockStart, to: currentLine.to };
                }
                inCodeBlock = false;
            }
        }
    }

    // If we're still in an unclosed code block at the end
    if (inCodeBlock && pos >= codeBlockStart) {
        return { from: codeBlockStart, to: doc.length };
    }

    return { from: pos, to: pos };
}
