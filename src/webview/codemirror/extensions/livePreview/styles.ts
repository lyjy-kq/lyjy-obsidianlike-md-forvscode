/**
 * Live Preview Styles
 *
 * EditorView.baseTheme() CSS-in-JS definitions for all live preview elements.
 *
 * Colors are hardcoded (not CSS variables) so that FlowMD's theme override
 * works independently of VS Code's active color theme. Dark colors are the
 * default; light overrides use the `&light` baseTheme prefix.
 *
 * @module webview/codemirror/extensions/livePreview/styles
 */

import { EditorView } from '@codemirror/view';
import type { Extension } from '@codemirror/state';

/**
 * Creates the base theme extension with all live preview CSS styles.
 */
export function createBaseThemeStyles(): Extension {
    return EditorView.baseTheme({
        // =================================================================
        // Override default syntax highlighting (remove dated styles)
        // =================================================================
        '.cm-line .tok-heading': {
            textDecoration: 'none',
            fontWeight: 'inherit',
            color: 'inherit',
        },
        '.cm-line .tok-heading1, .cm-line .tok-heading2, .cm-line .tok-heading3': {
            textDecoration: 'none',
            fontWeight: 'inherit',
            color: 'inherit',
        },
        '.cm-line .tok-heading4, .cm-line .tok-heading5, .cm-line .tok-heading6': {
            textDecoration: 'none',
            fontWeight: 'inherit',
            color: 'inherit',
        },

        // =================================================================
        // Headings - Modern & clean
        // =================================================================
        '.cm-md-heading': {
            lineHeight: '1.6',
        },
        '.cm-md-heading-1': {
            fontSize: '1.2em',
            fontWeight: '700',
            letterSpacing: '-0.02em',
            color: '#eb8383',
        },
        '.cm-md-heading-2': {
            fontSize: 'inherit',
            fontWeight: '600',
            letterSpacing: '-0.01em',
            color: '#ae9acb',
        },
        '.cm-md-heading-3': {
            fontSize: 'inherit',
            fontWeight: '600',
            color: '#7db5cd',
        },
        '.cm-md-heading-4': {
            fontSize: 'inherit',
            fontWeight: '600',
            color: '#71a796',
        },
        '.cm-md-heading-5': {
            fontSize: 'inherit',
            fontWeight: '600',
            color: '#dcbf61',
        },
        '.cm-md-heading-6': {
            fontSize: 'inherit',
            fontWeight: '600',
            color: '#dda36a',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
        },

        // =================================================================
        // Bold & Italic
        // =================================================================
        '.cm-md-bold': {
            fontWeight: '700',
            color: '#d9a37a',
        },
        '.cm-md-italic': {
            fontStyle: 'italic',
            color: '#2bbac5',
        },
        '.cm-md-strikethrough': {
            textDecoration: 'line-through',
            opacity: '0.6',
        },

        // =================================================================
        // Inline code
        // =================================================================
        '.cm-md-code': {
            fontFamily:
                'var(--vscode-editor-font-family, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace)',
            fontSize: 'var(--vscode-editor-font-size, 0.9em)',
            fontWeight: 'var(--flowmd-font-weight, 400)',
            backgroundColor: '#30353f',
            padding: '2px 6px',
            borderRadius: '4px',
            color: '#f29a9a',
        },
        '&light .cm-md-code': {
            backgroundColor: '#eff1f3',
            color: '#f29a9a',
        },

        // =================================================================
        // Links
        // =================================================================
        '.cm-md-link': {
            color: '#b8f5a2',
            textDecoration: 'underline',
            textDecorationColor: '#b8f5a2',
            textDecorationSkipInk: 'auto',
            textUnderlineOffset: '3px',
            cursor: 'pointer',
            transition: 'opacity 0.15s ease',
        },
        '.cm-md-link:hover': {
            opacity: '0.8',
        },
        '&light .cm-md-link': {
            color: '#b8f5a2',
            textDecorationColor: '#b8f5a2',
        },

        // =================================================================
        // Blockquotes
        // =================================================================
        '.cm-md-blockquote': {
            borderLeft: '3px solid #007acc',
            paddingLeft: '1.2em !important',
            color: '#999',
        },
        '&light .cm-md-blockquote': {
            borderLeft: '3px solid #d0d7de',
            color: '#656d76',
        },
        '.cm-md-blockquote-2': {
            paddingLeft: '2.4em !important',
            backgroundImage: 'linear-gradient(#007acc, #007acc)',
            backgroundSize: '3px 100%',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: '1.2em 0',
        },
        '&light .cm-md-blockquote-2': {
            backgroundImage: 'linear-gradient(#d0d7de, #d0d7de)',
        },
        '.cm-md-blockquote-3': {
            paddingLeft: '3.6em !important',
            backgroundImage: 'linear-gradient(#007acc, #007acc), linear-gradient(#007acc, #007acc)',
            backgroundSize: '3px 100%, 3px 100%',
            backgroundRepeat: 'no-repeat, no-repeat',
            backgroundPosition: '1.2em 0, 2.4em 0',
        },
        '&light .cm-md-blockquote-3': {
            backgroundImage: 'linear-gradient(#d0d7de, #d0d7de), linear-gradient(#d0d7de, #d0d7de)',
        },
        '.cm-md-blockquote-4': {
            paddingLeft: '4.8em !important',
            backgroundImage:
                'linear-gradient(#007acc, #007acc), linear-gradient(#007acc, #007acc), linear-gradient(#007acc, #007acc)',
            backgroundSize: '3px 100%, 3px 100%, 3px 100%',
            backgroundRepeat: 'no-repeat, no-repeat, no-repeat',
            backgroundPosition: '1.2em 0, 2.4em 0, 3.6em 0',
        },
        '&light .cm-md-blockquote-4': {
            backgroundImage:
                'linear-gradient(#d0d7de, #d0d7de), linear-gradient(#d0d7de, #d0d7de), linear-gradient(#d0d7de, #d0d7de)',
        },
        '.cm-md-blockquote-5': {
            paddingLeft: '6em !important',
            backgroundImage:
                'linear-gradient(#007acc, #007acc), linear-gradient(#007acc, #007acc), linear-gradient(#007acc, #007acc), linear-gradient(#007acc, #007acc)',
            backgroundSize: '3px 100%, 3px 100%, 3px 100%, 3px 100%',
            backgroundRepeat: 'no-repeat, no-repeat, no-repeat, no-repeat',
            backgroundPosition: '1.2em 0, 2.4em 0, 3.6em 0, 4.8em 0',
        },
        '&light .cm-md-blockquote-5': {
            backgroundImage:
                'linear-gradient(#d0d7de, #d0d7de), linear-gradient(#d0d7de, #d0d7de), linear-gradient(#d0d7de, #d0d7de), linear-gradient(#d0d7de, #d0d7de)',
        },

        // =================================================================
        // Code blocks (fenced)
        // =================================================================
        // Selection is handled by codeBlockSelectionPlugin (mark decorations)
        // which works above all backgrounds regardless of z-index.
        '.cm-md-codeblock': {
            fontFamily:
                'inherit',
            fontSize: 'inherit',
            fontWeight: 'inherit',
            lineHeight: 'inherit',
            color: 'inherit',
            backgroundColor: '#1e1f20',
            borderLeft: '1px solid rgba(255, 255, 255, 0.12)',
            borderRight: '1px solid rgba(255, 255, 255, 0.12)',
            padding: '0 0.9em',
            boxSizing: 'border-box',
        },
        '.cm-md-codeblock-first': {
            borderTop: '1px solid rgba(255, 255, 255, 0.12)',
            borderTopLeftRadius: '12px',
            borderTopRightRadius: '12px',
        },
        '.cm-md-codeblock-last': {
            borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
            borderBottomLeftRadius: '12px',
            borderBottomRightRadius: '12px',
        },
        // Code block copy button
        '.cm-md-codeblock-copy': {
            float: 'right',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            padding: '0.2em 0.75em',
            fontFamily:
                'var(--vscode-editor-font-family, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace)',
            fontSize: '0.72em',
            lineHeight: '1.4',
            borderRadius: '999px',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            backgroundColor: 'rgba(255, 255, 255, 0.06)',
            color: '#aab1bf',
            userSelect: 'none',
            transition:
                'background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease, opacity 0.15s ease',
            marginLeft: '0.75em',
            marginTop: '0.05em',
        },
        '.cm-md-codeblock-copy:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.12)',
            color: '#d4d4d4',
            borderColor: 'rgba(255, 255, 255, 0.24)',
        },
        '&light .cm-md-codeblock-copy': {
            backgroundColor: 'rgba(255, 255, 255, 0.06)',
            color: '#aab1bf',
            borderColor: 'rgba(255, 255, 255, 0.14)',
        },
        '&light .cm-md-codeblock-copy:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.12)',
            color: '#d4d4d4',
            borderColor: 'rgba(255, 255, 255, 0.24)',
        },

        // =================================================================
        // List bullets
        // =================================================================
        '.cm-md-bullet': {
            color: '#aab1bf',
            display: 'inline-block',
            width: '1.2em',
            textAlign: 'center',
            fontWeight: 'bold',
            fontSize: '1.1em',
            lineHeight: '1',
            verticalAlign: 'middle',
        },
        '&light .cm-md-bullet': {
            color: '#636c76',
        },

        // =================================================================
        // Setext heading underline (collapsed)
        // =================================================================
        '.cm-md-setext-underline': {
            fontSize: '0',
            lineHeight: '0',
            height: '0',
            overflow: 'hidden',
            padding: '0 !important',
        },

        // =================================================================
        // Horizontal rules
        // =================================================================
        '.cm-md-hr': {
            border: 'none',
            height: '1px',
            background: 'rgba(128,128,128,0.3)',
            margin: '-6px 0',
        },
        '&light .cm-md-hr': {
            background: '#d0d7de',
        },

        // =================================================================
        // Hidden lines (for block widget rendering)
        // =================================================================
        '.cm-md-hidden-line': {
            fontSize: '0',
            lineHeight: '0',
            height: '0',
            overflow: 'hidden',
            padding: '0 !important',
            margin: '0 !important',
        },
        // Prevent hidden line gutter numbers from overflowing
        '.cm-gutterElement': {
            overflow: 'hidden',
        },

        // =================================================================
        // Tables
        // =================================================================
        '.cm-md-table-wrapper': {
            padding: '8px 0',
            display: 'inline-flex',
            flexDirection: 'column',
            alignItems: 'stretch',
        },
        '.cm-md-table-top-row': {
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'stretch',
        },
        '.cm-md-table': {
            width: 'auto',
            borderCollapse: 'collapse',
            fontSize: 'inherit',
            fontFamily: 'inherit',
        },
        '.cm-md-table-th': {
            border: '1px solid rgba(128,128,128,0.3)',
            padding: '6px 12px',
            minWidth: '3em',
            fontWeight: '600',
            backgroundColor: 'rgba(128,128,128,0.1)',
            color: 'inherit',
            textAlign: 'left',
        },
        '&light .cm-md-table-th': {
            border: '1px solid #d0d7de',
            backgroundColor: '#f6f8fa',
        },
        '.cm-md-table-td': {
            border: '1px solid rgba(128,128,128,0.3)',
            padding: '6px 12px',
            minWidth: '3em',
            color: 'inherit',
        },
        '&light .cm-md-table-td': {
            border: '1px solid #d0d7de',
        },
        '.cm-md-table tr:nth-child(even) td': {
            backgroundColor: 'rgba(128,128,128,0.04)',
        },

        // Row add bar (bottom - full table width, flow layout)
        '.cm-md-table-add-row-bar': {
            height: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: '0',
            transition: 'opacity 0.15s ease, background-color 0.15s ease',
            borderRadius: '0 0 3px 3px',
            position: 'relative',
        },
        '.cm-md-table-wrapper:hover .cm-md-table-add-row-bar': {
            opacity: '1',
        },
        '.cm-md-table-add-row-bar::before': {
            content: '""',
            position: 'absolute',
            left: '0',
            right: '0',
            top: '50%',
            height: '2px',
            backgroundColor: 'rgba(79, 193, 255, 0.35)',
            transform: 'translateY(-50%)',
            borderRadius: '1px',
        },
        '.cm-md-table-add-row-bar:hover::before': {
            backgroundColor: 'rgba(79, 193, 255, 0.7)',
        },
        '&light .cm-md-table-add-row-bar::before': {
            backgroundColor: 'rgba(9, 105, 218, 0.3)',
        },
        '&light .cm-md-table-add-row-bar:hover::before': {
            backgroundColor: 'rgba(9, 105, 218, 0.6)',
        },

        // Column add bar (right - full table height, flow layout)
        '.cm-md-table-add-col-bar': {
            width: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: '0',
            transition: 'opacity 0.15s ease, background-color 0.15s ease',
            borderRadius: '0 3px 3px 0',
            position: 'relative',
        },
        '.cm-md-table-wrapper:hover .cm-md-table-add-col-bar': {
            opacity: '1',
        },
        '.cm-md-table-add-col-bar::before': {
            content: '""',
            position: 'absolute',
            top: '0',
            bottom: '0',
            left: '50%',
            width: '2px',
            backgroundColor: 'rgba(79, 193, 255, 0.35)',
            transform: 'translateX(-50%)',
            borderRadius: '1px',
        },
        '.cm-md-table-add-col-bar:hover::before': {
            backgroundColor: 'rgba(79, 193, 255, 0.7)',
        },
        '&light .cm-md-table-add-col-bar::before': {
            backgroundColor: 'rgba(9, 105, 218, 0.3)',
        },
        '&light .cm-md-table-add-col-bar:hover::before': {
            backgroundColor: 'rgba(9, 105, 218, 0.6)',
        },

        // Plus icon shared style
        '.cm-md-table-add-icon': {
            fontSize: '12px',
            fontWeight: '700',
            color: 'rgba(79, 193, 255, 0.7)',
            lineHeight: '1',
            zIndex: '1',
            backgroundColor: '#272b33',
            padding: '0 3px',
            borderRadius: '2px',
            userSelect: 'none',
        },
        '&light .cm-md-table-add-icon': {
            color: 'rgba(9, 105, 218, 0.6)',
            backgroundColor: '#ffffff',
        },
        '.cm-md-table-add-row-bar:hover .cm-md-table-add-icon': {
            color: '#4fc1ff',
        },
        '.cm-md-table-add-col-bar:hover .cm-md-table-add-icon': {
            color: '#4fc1ff',
        },
        '&light .cm-md-table-add-row-bar:hover .cm-md-table-add-icon': {
            color: '#0969da',
        },
        '&light .cm-md-table-add-col-bar:hover .cm-md-table-add-icon': {
            color: '#0969da',
        },

        // Hide add-row/add-col bars in viewer mode (not editable)
        '.cm-content[contenteditable="false"] .cm-md-table-add-row-bar': {
            display: 'none',
        },
        '.cm-content[contenteditable="false"] .cm-md-table-add-col-bar': {
            display: 'none',
        },

        // Cell selection highlight (drag select within table)
        // Higher specificity (0,2,2) overrides even-row rule (0,2,1)
        '.cm-md-table-cell-selected': {
            backgroundColor: 'rgba(59,130,246,0.22)',
        },
        '.cm-md-table tr td.cm-md-table-cell-selected': {
            backgroundColor: 'rgba(59,130,246,0.22)',
        },
        '.cm-md-table tr th.cm-md-table-cell-selected': {
            backgroundColor: 'rgba(59,130,246,0.22)',
        },
        '&light .cm-md-table-cell-selected': {
            backgroundColor: 'rgba(9,105,218,0.15)',
        },
        '&light .cm-md-table tr td.cm-md-table-cell-selected': {
            backgroundColor: 'rgba(9,105,218,0.15)',
        },
        '&light .cm-md-table tr th.cm-md-table-cell-selected': {
            backgroundColor: 'rgba(9,105,218,0.15)',
        },
        // Rectangular border on selection edges
        '.cm-md-table-cell-sel-top': { borderTop: '2px solid rgba(59,130,246,0.8)' },
        '.cm-md-table-cell-sel-bottom': { borderBottom: '2px solid rgba(59,130,246,0.8)' },
        '.cm-md-table-cell-sel-left': { borderLeft: '2px solid rgba(59,130,246,0.8)' },
        '.cm-md-table-cell-sel-right': { borderRight: '2px solid rgba(59,130,246,0.8)' },
        '&light .cm-md-table-cell-sel-top': { borderTop: '2px solid rgba(9,105,218,0.7)' },
        '&light .cm-md-table-cell-sel-bottom': { borderBottom: '2px solid rgba(9,105,218,0.7)' },
        '&light .cm-md-table-cell-sel-left': { borderLeft: '2px solid rgba(9,105,218,0.7)' },
        '&light .cm-md-table-cell-sel-right': { borderRight: '2px solid rgba(9,105,218,0.7)' },

        // Table extent selection: subtle outline when CM6 selection covers the table (no cell drag active)
        '.cm-md-table-wrapper.cm-md-table-extent-selected': {
            outline: '1px dashed rgba(59,130,246,0.5)',
            outlineOffset: '2px',
        },
        '&light .cm-md-table-wrapper.cm-md-table-extent-selected': {
            outline: '1px dashed rgba(9,105,218,0.5)',
            outlineOffset: '2px',
        },

        // =================================================================
        // Mermaid diagrams
        // =================================================================
        '.cm-md-mermaid-wrapper': {
            borderTop: '12px solid transparent',
            borderBottom: '12px solid transparent',
            backgroundClip: 'padding-box',
            padding: '16px',
            backgroundColor: '#272b33',
            borderRadius: '6px',
            textAlign: 'center',
            overflow: 'auto',
            minHeight: '200px',
        },
        '.cm-md-mermaid-wrapper.cm-md-mermaid-rendered': {
            minHeight: 'unset',
        },
        '&light .cm-md-mermaid-wrapper': {
            backgroundColor: '#ffffff',
        },
        '.cm-md-mermaid-wrapper svg': {
            maxWidth: '100%',
            height: 'auto',
        },
        '.cm-md-mermaid-placeholder': {
            color: '#888',
            fontStyle: 'italic',
            padding: '24px',
        },
        '&light .cm-md-mermaid-placeholder': {
            color: '#656d76',
        },
        '.cm-md-mermaid-error': {
            color: '#f44747',
            fontFamily: '"SF Mono", Monaco, Consolas, monospace',
            fontSize: '0.85em',
            padding: '8px 12px',
            backgroundColor: 'rgba(244, 71, 71, 0.1)',
            borderRadius: '4px',
            textAlign: 'left',
            whiteSpace: 'pre-wrap',
        },
        '&light .cm-md-mermaid-error': {
            color: '#cf222e',
            backgroundColor: 'rgba(207, 34, 46, 0.1)',
        },

        // =================================================================
        // Checkboxes
        // =================================================================
        '.cm-md-checkbox': {
            cursor: 'pointer',
            width: '16px',
            height: '16px',
            verticalAlign: 'middle',
            marginRight: '4px',
            accentColor: '#4fc1ff',
        },
        '&light .cm-md-checkbox': {
            accentColor: '#0969da',
        },

        // =================================================================
        // Images
        // =================================================================
        '.cm-md-image-wrapper': {
            display: 'inline-block',
            maxWidth: '100%',
        },
        '.cm-md-image': {
            maxWidth: '100%',
            height: 'auto',
            borderRadius: '4px',
            verticalAlign: 'middle',
        },
        '.cm-md-image-fallback': {
            display: 'inline-block',
            color: '#888',
            fontStyle: 'italic',
            padding: '4px 8px',
            backgroundColor: 'rgba(128, 128, 128, 0.1)',
            borderRadius: '4px',
            border: '1px dashed rgba(128, 128, 128, 0.3)',
        },
        '&light .cm-md-image-fallback': {
            color: '#656d76',
        },

        // =================================================================
        // Footnotes
        // =================================================================
        '.cm-md-footnote-ref': {
            color: '#4fc1ff',
            cursor: 'pointer',
            fontSize: '0.75em',
            verticalAlign: 'super',
            lineHeight: '0',
            padding: '0 2px',
            borderRadius: '2px',
            transition: 'background-color 0.15s ease',
        },
        '&light .cm-md-footnote-ref': {
            color: '#0969da',
        },
        '.cm-md-footnote-ref:hover': {
            backgroundColor: 'rgba(79, 193, 255, 0.15)',
        },
        '&light .cm-md-footnote-ref:hover': {
            backgroundColor: 'rgba(9, 105, 218, 0.15)',
        },
        '.cm-md-footnote-def': {
            borderLeft: '2px solid #4fc1ff',
            paddingLeft: '12px',
            color: '#999',
            fontSize: '0.9em',
        },
        '&light .cm-md-footnote-def': {
            borderLeft: '2px solid #0969da',
            color: '#656d76',
        },
        '.cm-md-footnote-def-label': {
            display: 'inline-block',
            color: '#4fc1ff',
            fontSize: '0.8em',
            fontWeight: '600',
            lineHeight: '1',
            padding: '2px 5px',
            marginRight: '6px',
            borderRadius: '3px',
            backgroundColor: 'rgba(79, 193, 255, 0.15)',
        },
        '&light .cm-md-footnote-def-label': {
            color: '#0969da',
            backgroundColor: 'rgba(9, 105, 218, 0.12)',
        },

        // =================================================================
        // Details/Summary (foldable blocks)
        // =================================================================
        '.cm-md-details': {
            margin: '4px 0',
            padding: '4px 0',
            borderLeft: '2px solid rgba(128, 128, 128, 0.3)',
            paddingLeft: '8px',
        },
        '.cm-md-details-summary': {
            cursor: 'pointer',
            color: 'inherit',
            fontWeight: '600',
            userSelect: 'none',
            padding: '4px 8px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
        },
        '.cm-md-details-summary:hover': {
            backgroundColor: 'rgba(128, 128, 128, 0.1)',
        },
        '.cm-md-details-arrow': {
            fontSize: '10px',
            color: '#888',
            width: '12px',
            textAlign: 'center',
            transition: 'transform 0.15s ease',
            flexShrink: '0',
        },
        '&light .cm-md-details-arrow': {
            color: '#656d76',
        },
        '.cm-md-details-open .cm-md-details-arrow': {
            color: '#4fc1ff',
        },
        '&light .cm-md-details-open .cm-md-details-arrow': {
            color: '#0969da',
        },
        '.cm-md-details-content': {
            padding: '8px 16px 8px 26px',
            color: 'inherit',
            whiteSpace: 'pre-wrap',
        },

        // =================================================================
        // List fold arrows
        // =================================================================
        '.cm-md-fold-arrow': {
            display: 'inline-block',
            width: '16px',
            fontSize: '11px',
            color: '#4fc1ff',
            cursor: 'pointer',
            textAlign: 'center',
            userSelect: 'none',
            marginLeft: '-20px',
            marginRight: '4px',
            verticalAlign: 'middle',
            lineHeight: '1',
            borderRadius: '3px',
            padding: '2px 0',
            opacity: '0.7',
            transition:
                'color 0.15s ease, background-color 0.15s ease, opacity 0.15s ease, transform 0.15s ease',
        },
        '&light .cm-md-fold-arrow': {
            color: '#0969da',
        },
        '.cm-md-fold-arrow:hover': {
            opacity: '1',
            backgroundColor: 'rgba(128, 128, 128, 0.15)',
        },
        // Collapsed: ▼ rotated to ▶
        '.cm-md-fold-arrow-collapsed': {
            transform: 'rotate(-90deg)',
        },
        // Expanded: ▼ as-is
        '.cm-md-fold-arrow-open': {
            color: '#888',
            opacity: '0.5',
            transform: 'rotate(0deg)',
        },
        '&light .cm-md-fold-arrow-open': {
            color: '#656d76',
        },
        '.cm-md-fold-arrow-open:hover': {
            color: '#4fc1ff',
            opacity: '1',
        },
        '&light .cm-md-fold-arrow-open:hover': {
            color: '#0969da',
        },
        // Folded line: bullet gets accent color to match arrow
        '.cm-md-fold-collapsed-line .cm-md-bullet': {
            color: '#4fc1ff',
            opacity: '0.7',
        },
        '&light .cm-md-fold-collapsed-line .cm-md-bullet': {
            color: '#0969da',
        },

        // =================================================================
        // Indent guide lines (for nested list items)
        // =================================================================
        '.cm-md-indent': {
            position: 'relative',
        },
        '.cm-md-indent-1': {
            borderLeft: '1px solid rgba(128, 128, 128, 0.2)',
            marginLeft: '0.5em',
            paddingLeft: '0.5em !important',
        },
        '.cm-md-indent-2': {
            borderLeft: '1px solid rgba(128, 128, 128, 0.2)',
            marginLeft: '0.5em',
            paddingLeft: '0.5em !important',
        },
        '.cm-md-indent-3': {
            borderLeft: '1px solid rgba(128, 128, 128, 0.2)',
            marginLeft: '0.5em',
            paddingLeft: '0.5em !important',
        },
        '.cm-md-indent-4': {
            borderLeft: '1px solid rgba(128, 128, 128, 0.2)',
            marginLeft: '0.5em',
            paddingLeft: '0.5em !important',
        },
        '.cm-md-indent-5': {
            borderLeft: '1px solid rgba(128, 128, 128, 0.2)',
            marginLeft: '0.5em',
            paddingLeft: '0.5em !important',
        },
        '.cm-md-indent-6': {
            borderLeft: '1px solid rgba(128, 128, 128, 0.2)',
            marginLeft: '0.5em',
            paddingLeft: '0.5em !important',
        },

        // =================================================================
        // Code block indent guides
        // =================================================================
        '.cm-md-codeblock-indent': {
            backgroundRepeat: 'no-repeat',
        },

        // =================================================================
        // Frontmatter (YAML Properties Panel)
        // =================================================================
        '.cm-md-frontmatter': {
            borderBottom: '16px solid transparent',
            backgroundClip: 'padding-box',
            padding: '14px 18px 12px',
            backgroundColor: 'var(--vscode-textCodeBlock-background, rgba(128,128,128,0.08))',
            borderRadius: '8px',
        },
        '&light .cm-md-frontmatter': {
            backgroundColor: 'rgba(0, 0, 0, 0.03)',
        },
        '.cm-md-frontmatter-header': {
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.8em',
            fontWeight: '600',
            color: 'var(--vscode-descriptionForeground, #888)',
            marginBottom: '10px',
            letterSpacing: '0.02em',
        },
        '.cm-md-frontmatter-header-icon': {
            fontSize: '0.95em',
            lineHeight: '1',
        },
        '.cm-md-frontmatter-grid': {
            display: 'grid',
            gridTemplateColumns: '20px auto 1fr',
            gap: '0',
            alignItems: 'baseline',
        },
        '.cm-md-frontmatter-icon': {
            color: 'var(--vscode-descriptionForeground, #555)',
            fontSize: '0.95em',
            textAlign: 'center',
            padding: '6px 0',
            opacity: '0.6',
        },
        '.cm-md-frontmatter-key': {
            color: 'var(--vscode-descriptionForeground, #888)',
            fontSize: '0.85em',
            padding: '6px 12px 6px 4px',
            whiteSpace: 'nowrap',
        },
        '.cm-md-frontmatter-value': {
            color: 'var(--vscode-editor-foreground, #d4d4d4)',
            fontSize: '0.85em',
            padding: '6px 8px',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            minWidth: '0',
            borderRadius: '4px',
        },
        '.cm-md-frontmatter-value:hover': {
            backgroundColor: 'rgba(128, 128, 128, 0.08)',
        },
        '&light .cm-md-frontmatter-value:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
        },

        // =================================================================
        // Math (KaTeX)
        // =================================================================
        '.cm-md-math-inline': {
            display: 'inline',
            verticalAlign: 'baseline',
        },
        '.cm-md-math-inline math': {
            fontSize: '1em',
        },
        '.cm-md-math-block': {
            display: 'block',
            textAlign: 'center',
            padding: '20px 0',
        },
        '.cm-md-math-block math': {
            fontSize: '1.15em',
        },
    });
}
