/**
 * Live Preview State
 *
 * Module-level state variables for the live preview extension.
 *
 * @module webview/codemirror/extensions/livePreview/state
 */

import { StateEffect } from '@codemirror/state';

// =============================================================================
// Table Cell Selection State
// =============================================================================

/**
 * Represents a rectangular cell selection within a table widget.
 * Row index 0 = header row, 1+ = data rows.
 * Col index is 0-based.
 */
export interface TableCellRange {
    tableFrom: number; // Table start position in document (used as key)
    startRow: number;
    startCol: number;
    endRow: number;
    endCol: number;
}

/** Active cell selections keyed by tableFrom position */
export const tableCellSelections = new Map<number, TableCellRange>();

/** True while the user is drag-selecting table cells.
 *  Prevents tableExtentSelectionPlugin from clearing cell selections
 *  when CM6 selection changes during the drag. */
export let isTableDragging = false;
export function setTableDragging(value: boolean): void {
    isTableDragging = value;
}

/** Cached TableData keyed by tableFrom position.
 *  Populated during buildDecorations, used by copy handler
 *  to avoid fragile syntax tree re-traversal. */
import type { TableData } from './types.js';
export const tableDataCache = new Map<number, TableData>();

/**
 * StateEffect fired after drag-select completes.
 * Triggers a decoration rebuild so TableWidget re-renders with the new selection.
 */
export const tableCellSelectEffect = StateEffect.define<null>();

// =============================================================================
// Document Base URI (for image relative path resolution)
// =============================================================================

let _documentBaseUri = '';

/**
 * Set the webview-accessible base URI for the document directory.
 * Called from main.ts when INIT message is received.
 */
export function setDocumentBaseUri(uri: string): void {
    _documentBaseUri = uri;
}

/**
 * Get the current document base URI.
 */
export function getDocumentBaseUri(): string {
    return _documentBaseUri;
}

// =============================================================================
// List Fold State
// =============================================================================

/** StateEffect to signal a fold toggle (triggers decoration rebuild) */
export const foldToggleEffect = StateEffect.define<null>();

/** Set of document positions (line.from) for folded list items */
export const foldedListItems = new Set<number>();

// =============================================================================
// Mermaid Cache
// =============================================================================

/** Cache for rendered Mermaid SVGs */
export const mermaidSvgCache = new Map<string, string>();
/** Cache for Mermaid rendered heights to prevent scroll jumps */
export const mermaidHeightCache = new Map<string, number>();
/** General height cache for other widgets (keyed by content hash/stringification) */
export const widgetHeightCache = new Map<string, number>();

/** In-flight render promises keyed by source (prevents duplicate concurrent renders) */
export const mermaidRenderPromises = new Map<string, Promise<string>>();
export let mermaidInitialized = false;
/** Theme Mermaid was last initialized with */
let mermaidCurrentTheme: 'dark' | 'light' = 'dark';

export function setMermaidInitialized(value: boolean): void {
    mermaidInitialized = value;
}

/**
 * Update the Mermaid rendering theme.
 * Resets initialization flag and clears SVG cache when theme changes,
 * so diagrams get re-rendered with correct colors.
 */
export function setMermaidTheme(theme: 'dark' | 'light'): void {
    if (mermaidCurrentTheme !== theme) {
        mermaidCurrentTheme = theme;
        mermaidInitialized = false;
        mermaidSvgCache.clear();
    }
}

export function getMermaidTheme(): 'dark' | 'light' {
    return mermaidCurrentTheme;
}

// =============================================================================
// Clipboard (via Extension postMessage)
// =============================================================================

let _postMessage: ((message: unknown) => void) | null = null;

export function setPostMessage(fn: (message: unknown) => void): void {
    _postMessage = fn;
}

export function copyToClipboard(text: string): Promise<void> {
    if (_postMessage) {
        _postMessage({ type: 'copyToClipboard', text });
        return Promise.resolve();
    }
    return Promise.reject(new Error('postMessage not available'));
}
