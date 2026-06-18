/**
 * CodeMirror Keymap Extension
 *
 * This module provides the keymap configuration for the FlowMD editor,
 * including default keybindings, history (undo/redo), and Markdown-specific
 * shortcuts like Bold (Ctrl/Cmd+B) and Italic (Ctrl/Cmd+I).
 *
 * @module webview/codemirror/extensions/keymap
 *
 * Design References:
 * - DES-A-004: CodeMirror 6 editor design
 * - DES-F-003: Webview file responsibilities
 *
 * Requirements:
 * - REQ-F-002: Webview CodeMirror initialization
 */

import { type Extension } from '@codemirror/state';
import { EditorView, keymap, type KeyBinding } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { syntaxTree } from '@codemirror/language';
import { tableCellSelections, tableCellSelectEffect } from './livePreview/state.js';
import { parseTableNode, splitTableRow } from './livePreview/helpers.js';

// =============================================================================
// Table Cell Selection Delete Handler
// =============================================================================

/**
 * Delete/clear the currently active table cell selection.
 *
 * Behavior (Obsidian-compatible):
 * - All columns selected  → delete the selected data rows (header rows get cleared)
 * - All rows selected     → delete the selected columns
 * - Partial selection     → clear the content of selected cells
 *
 * Returns false (passes through) when no table cell selection is active.
 */
function deleteTableSelection(view: EditorView): boolean {
    if (tableCellSelections.size === 0) return false;

    const entry = tableCellSelections.entries().next();
    if (entry.done) return false;
    const [tableFrom, sel] = entry.value;

    // Find the Table syntax node at tableFrom
    const tree = syntaxTree(view.state);
    let node = tree.resolve(tableFrom, 1);
    while (node && node.name !== 'Table') {
        if (!node.parent) {
            node = null!;
            break;
        }
        node = node.parent;
    }
    if (!node || node.name !== 'Table') return false;

    const data = parseTableNode(node, view.state);
    if (!data) return false;

    const totalCols = data.headers.length;
    const totalRows = data.rows.length + 1; // header (0) + data rows (1+)
    const minRow = Math.min(sel.startRow, sel.endRow);
    const maxRow = Math.max(sel.startRow, sel.endRow);
    const minCol = Math.min(sel.startCol, sel.endCol);
    const maxCol = Math.max(sel.startCol, sel.endCol);

    const isFullRow = minCol === 0 && maxCol >= totalCols - 1;
    const isFullCol = minRow === 0 && maxRow >= totalRows - 1;

    const changes: Array<{ from: number; to: number; insert: string }> = [];
    const { linePositions } = data.positions;

    if (isFullRow) {
        // Delete rows bottom-to-top (preserves positions during single dispatch)
        for (let r = maxRow; r >= minRow; r--) {
            if (r === 0) {
                // Header: clear content rather than removing the line
                const { from, to } = linePositions[0];
                const empty = Array(totalCols).fill('   ');
                changes.push({ from, to, insert: '|' + empty.join('|') + '|' });
            } else {
                // linePositions index: [0]=header, [1]=delimiter, [2+]=data rows
                const lineIdx = r + 1;
                if (lineIdx >= linePositions.length) continue;
                const { from: lineFrom, to: lineTo } = linePositions[lineIdx];
                // Delete line together with its preceding newline
                const delFrom = Math.max(0, lineFrom - 1);
                changes.push({ from: delFrom, to: lineTo, insert: '' });
            }
        }
    } else if (isFullCol) {
        // Delete columns: rebuild every line without the selected columns
        const colsToKeep = Array.from({ length: totalCols }, (_, i) => i).filter(
            (i) => i < minCol || i > maxCol
        );
        if (colsToKeep.length === 0) return false; // can't delete all columns

        // Header row (cells include surrounding spaces from splitTableRow)
        const { from: hFrom, to: hTo } = linePositions[0];
        const newHeaders = colsToKeep.map((i) => data.headers[i]);
        changes.push({ from: hFrom, to: hTo, insert: '|' + newHeaders.join('|') + '|' });

        // Delimiter row (rebuild fresh from alignment info)
        const { from: dFrom, to: dTo } = linePositions[1];
        const delimCells = colsToKeep.map((i) => {
            const a = data.alignments[i];
            if (a === 'center') return ' :---: ';
            if (a === 'right') return ' ---: ';
            if (a === 'left') return ' :--- ';
            return ' --- ';
        });
        changes.push({ from: dFrom, to: dTo, insert: '|' + delimCells.join('|') + '|' });

        // Data rows
        data.rows.forEach((row, rowIdx) => {
            const lineIdx = rowIdx + 2;
            if (lineIdx >= linePositions.length) return;
            const { from: rFrom, to: rTo } = linePositions[lineIdx];
            const newCells = colsToKeep.map((i) => row[i] ?? '   ');
            changes.push({ from: rFrom, to: rTo, insert: '|' + newCells.join('|') + '|' });
        });

        // Sort bottom-to-top so positions stay valid during single dispatch
        changes.sort((a, b) => b.from - a.from);
    } else {
        // Clear selected cell content
        for (let r = minRow; r <= maxRow; r++) {
            const lineIdx = r === 0 ? 0 : r + 1;
            if (lineIdx >= linePositions.length) continue;
            const { from: lineFrom, to: lineTo } = linePositions[lineIdx];
            const lineText = view.state.doc.sliceString(lineFrom, lineTo);
            const cells = splitTableRow(lineText);
            for (let c = minCol; c <= maxCol && c < cells.length; c++) {
                cells[c] = '   ';
            }
            changes.push({ from: lineFrom, to: lineTo, insert: '|' + cells.join('|') + '|' });
        }
        changes.sort((a, b) => b.from - a.from);
    }

    if (changes.length === 0) return false;

    tableCellSelections.delete(tableFrom);
    view.dispatch({ changes, effects: tableCellSelectEffect.of(null) });
    console.debug(
        `[FlowMD] table delete: rows=${minRow}-${maxRow} cols=${minCol}-${maxCol} isFullRow=${isFullRow} isFullCol=${isFullCol}`
    );
    return true;
}

/**
 * Wraps selected text with the given markers (e.g., ** for bold, * for italic).
 * If the selected text is already wrapped, removes the markers (toggle off).
 *
 * @param view - The CodeMirror EditorView
 * @param marker - The marker string (e.g., '**' for bold, '*' for italic)
 * @returns true if the command was executed, false otherwise
 */
function toggleMarkdownFormatting(view: EditorView, marker: string): boolean {
    const { state } = view;
    const { from, to } = state.selection.main;

    // If no selection, return false (do nothing)
    if (from === to) {
        return false;
    }

    const markerLength = marker.length;

    // Check if the selection is already wrapped with the marker
    const beforeSelection = state.sliceDoc(Math.max(0, from - markerLength), from);
    const afterSelection = state.sliceDoc(to, Math.min(state.doc.length, to + markerLength));

    const isAlreadyWrapped = beforeSelection === marker && afterSelection === marker;

    let changes;
    let newSelection;

    if (isAlreadyWrapped) {
        // Remove the markers (toggle off)
        changes = [
            { from: from - markerLength, to: from, insert: '' },
            { from: to, to: to + markerLength, insert: '' },
        ];
        // Adjust selection to stay on the unwrapped text
        newSelection = { anchor: from - markerLength, head: to - markerLength };
    } else {
        // Add the markers (toggle on)
        changes = [
            { from: from, to: from, insert: marker },
            { from: to, to: to, insert: marker },
        ];
        // Adjust selection to cover the newly wrapped text (excluding markers)
        newSelection = { anchor: from + markerLength, head: to + markerLength };
    }

    view.dispatch({
        changes,
        selection: newSelection,
    });

    return true;
}

/**
 * Toggles bold formatting on the selected text.
 * Uses ** markers for Markdown bold syntax.
 *
 * @param view - The CodeMirror EditorView
 * @returns true if the command was executed, false otherwise
 */
function toggleBold(view: EditorView): boolean {
    return toggleMarkdownFormatting(view, '**');
}

/**
 * Toggles italic formatting on the selected text.
 * Uses * markers for Markdown italic syntax.
 *
 * @param view - The CodeMirror EditorView
 * @returns true if the command was executed, false otherwise
 */
function toggleItalic(view: EditorView): boolean {
    return toggleMarkdownFormatting(view, '*');
}

/**
 * Markdown-specific keybindings.
 *
 * These keybindings provide common Markdown formatting shortcuts:
 * - Mod-b: Toggle bold (**text**)
 * - Mod-i: Toggle italic (*text*)
 *
 * Note: 'Mod' resolves to Cmd on macOS and Ctrl on other platforms.
 *
 * @example
 * ```typescript
 * import { keymap } from '@codemirror/view';
 * import { markdownKeymap } from './keymap';
 *
 * const extensions = [keymap.of(markdownKeymap)];
 * ```
 */
export const markdownKeymap: readonly KeyBinding[] = [
    {
        key: 'Mod-b',
        run: toggleBold,
        preventDefault: true,
    },
    {
        key: 'Mod-i',
        run: toggleItalic,
        preventDefault: true,
    },
    {
        key: 'Delete',
        run: deleteTableSelection,
    },
    {
        key: 'Backspace',
        run: deleteTableSelection,
    },
];

/**
 * Creates the complete keymap extension bundle for the FlowMD editor.
 *
 * This function returns an array of CodeMirror extensions that provide:
 * 1. History support (undo/redo functionality)
 * 2. Default keybindings (basic text editing)
 * 3. History keybindings (Ctrl/Cmd+Z for undo, Ctrl/Cmd+Shift+Z for redo)
 * 4. Markdown-specific shortcuts (Bold: Ctrl/Cmd+B, Italic: Ctrl/Cmd+I)
 *
 * @returns Array of CodeMirror extensions for keymap functionality
 *
 * @example
 * ```typescript
 * import { EditorState } from '@codemirror/state';
 * import { EditorView } from '@codemirror/view';
 * import { createFlowMdKeymap } from './keymap';
 *
 * const state = EditorState.create({
 *     doc: '# Hello World',
 *     extensions: createFlowMdKeymap(),
 * });
 *
 * const view = new EditorView({
 *     state,
 *     parent: document.getElementById('editor'),
 * });
 * ```
 *
 * @see {@link markdownKeymap} for Markdown-specific keybindings
 * @see {@link https://codemirror.net/docs/ref/#commands.defaultKeymap} for default keybindings
 * @see {@link https://codemirror.net/docs/ref/#commands.historyKeymap} for history keybindings
 */
export function createFlowMdKeymap(): Extension[] {
    return [
        // History support (undo/redo)
        history(),

        // Keybindings in precedence order:
        // 1. Markdown shortcuts (highest precedence)
        // 2. History keymap (undo/redo)
        // 3. Default keymap (basic editing)
        keymap.of([...markdownKeymap, ...historyKeymap, ...defaultKeymap]),
    ];
}
