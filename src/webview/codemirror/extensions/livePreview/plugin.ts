/**
 * Live Preview Plugin
 *
 * Core ViewPlugin for Obsidian-style live preview.
 * Manages decorations: hides Markdown markers in non-focused blocks
 * and renders widgets (tables, math, mermaid, etc.).
 *
 * @module webview/codemirror/extensions/livePreview/plugin
 */

import { ensureSyntaxTree, syntaxHighlighting, syntaxTree } from '@codemirror/language';
import { type EditorState, type Extension, RangeSet } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView } from '@codemirror/view';
import type { Tree } from '@lezer/common';

import {
    blockquoteLevelDecos,
    boldMarkDeco,
    codeMarkDeco,
    flowMdDarkHighlight,
    flowMdLightHighlight,
    footnoteDefLineDeco,
    headingLineDecos,
    hideDeco,
    italicMarkDeco,
    strikethroughMarkDeco,
} from './decorations.js';
import {
    extractFencedCodeContent,
    extractFencedCodeLanguage,
    createCodeBlockIndentStyle,
    getCodeBlockIndentLevel,
    parseFrontmatter,
    parseTableNode,
} from './helpers.js';
import { getMarkdownBlockRange } from './ranges.js';
import { scrollPreserverExtension } from './scrollHack.js';
import {
    foldToggleEffect,
    foldedListItems,
    isTableDragging,
    tableCellSelections,
    tableCellSelectEffect,
    tableDataCache,
} from './state.js';
import { createBaseThemeStyles } from './styles.js';
import type { ILineRange } from './types.js';
import {
    BlockMathWidget,
    BulletWidget,
    CheckboxWidget,
    CodeBlockCopyWidget,
    DetailsWidget,
    FoldArrowWidget,
    FootnoteDefWidget,
    FootnoteRefWidget,
    FrontmatterWidget,
    HorizontalRuleWidget,
    ImageWidget,
    InlineMathWidget,
    MermaidWidget,
    TableWidget,
} from './widgets.js';

// =============================================================================
// Post-Processing Functions (extracted from buildDecorations)
// =============================================================================

/**
 * Collect footnote decorations (definitions and references).
 * Pre-scans the full document to build a label→index map,
 * then decorates definition lines and inline references.
 */
function collectFootnoteDecorations(
    state: EditorState,
    decos: Array<ReturnType<Decoration['range']>>,
    focusedRange: ILineRange
): void {
    // Single-pass: collect footnote labels and build decorations together.
    // First pass collects labels only (needed for numbering).
    const footnoteLabels: string[] = [];
    const defRegex = /^\[\^([^\]]+)\]:/;
    for (let ln = 1; ln <= state.doc.lines; ln++) {
        const defMatch = state.doc.line(ln).text.match(defRegex);
        if (defMatch && !footnoteLabels.includes(defMatch[1])) {
            footnoteLabels.push(defMatch[1]);
        }
    }

    // Second pass: build decorations
    const refRegex = /\[\^([^\]]+)\]/g;
    const defFullRegex = /^\[\^([^\]]+)\]:\s?/;
    for (let ln = 1; ln <= state.doc.lines; ln++) {
        const line = state.doc.line(ln);

        if (line.from < focusedRange.to && line.to > focusedRange.from) {
            continue;
        }

        // Footnote definition
        const defMatch = line.text.match(defFullRegex);
        if (defMatch) {
            const label = defMatch[1];
            const index = footnoteLabels.indexOf(label) + 1 || footnoteLabels.length + 1;
            decos.push(footnoteDefLineDeco.range(line.from));
            decos.push(
                Decoration.replace({
                    widget: new FootnoteDefWidget(label, index),
                }).range(line.from, line.from + defMatch[0].length)
            );
            continue;
        }

        // Footnote references in text
        refRegex.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = refRegex.exec(line.text)) !== null) {
            const label = match[1];
            const refFrom = line.from + match.index;
            const refTo = refFrom + match[0].length;
            const index = footnoteLabels.indexOf(label) + 1 || footnoteLabels.length + 1;
            decos.push(
                Decoration.replace({
                    widget: new FootnoteRefWidget(label, index),
                }).range(refFrom, refTo)
            );
        }
    }
}

/**
 * Collect details/summary decorations.
 * Handles both single-line and multi-line <details> blocks.
 */
function collectDetailsDecorations(
    state: EditorState,
    decos: Array<ReturnType<Decoration['range']>>,
    focusedRange: ILineRange
): void {
    for (let ln = 1; ln <= state.doc.lines; ln++) {
        const line = state.doc.line(ln);

        if (line.from < focusedRange.to && line.to > focusedRange.from) {
            continue;
        }

        const lineLower = line.text.trimStart().toLowerCase();
        if (!lineLower.startsWith('<details')) continue;

        // Single-line details
        if (lineLower.includes('</details>')) {
            const fullText = line.text;
            const summaryMatch = fullText.match(/<summary>(.*?)<\/summary>/is);
            const summaryText = summaryMatch ? summaryMatch[1].trim() : 'Details';
            const contentMatch = fullText.match(/<\/summary>([\s\S]*?)<\/details>/i);
            const contentText = contentMatch ? contentMatch[1].trim() : '';
            decos.push(
                Decoration.replace({
                    widget: new DetailsWidget(summaryText, contentText),
                }).range(line.from, line.to)
            );
            continue;
        }

        // Multi-line details: find closing </details>
        let closingLn = ln + 1;
        let found = false;
        while (closingLn <= state.doc.lines) {
            if (state.doc.line(closingLn).text.toLowerCase().includes('</details>')) {
                found = true;
                break;
            }
            closingLn++;
        }
        if (!found) continue;

        const closingLine = state.doc.line(closingLn);
        if (closingLine.from < focusedRange.to && closingLine.to > focusedRange.from) {
            continue;
        }

        const fullText = state.doc.sliceString(line.from, closingLine.to);
        const summaryMatch = fullText.match(/<summary>(.*?)<\/summary>/is);
        const summaryText = summaryMatch ? summaryMatch[1].trim() : 'Details';
        const contentMatch = fullText.match(/<\/summary>([\s\S]*?)<\/details>/i);
        const contentText = contentMatch ? contentMatch[1].trim() : '';

        decos.push(
            Decoration.replace({
                widget: new DetailsWidget(summaryText, contentText),
                block: true,
            }).range(line.from, closingLine.to)
        );
        ln = closingLn;
    }
}

/**
 * Collect math (KaTeX) decorations.
 * Handles block math ($$...$$) and inline math ($...$).
 */
function collectMathDecorations(
    state: EditorState,
    decos: Array<ReturnType<Decoration['range']>>,
    focusedRange: ILineRange,
    tree: Tree
): void {
    const isInsideCode = (pos: number): boolean => {
        const node = tree.resolveInner(pos, 1);
        const n = node.type.name;
        return (
            n === 'InlineCode' ||
            n === 'CodeMark' ||
            n === 'FencedCode' ||
            n === 'CodeText' ||
            n === 'CodeBlock' ||
            n === 'CodeInfo'
        );
    };

    // Pre-compiled regex (avoids re-creation per line)
    const inlineRegex = /(?<!\$)\$(?!\$)(?!\s)(.+?)(?<!\s|\$)\$(?!\$|\d)/g;

    for (let ln = 1; ln <= state.doc.lines; ln++) {
        const line = state.doc.line(ln);

        if (line.from < focusedRange.to && line.to > focusedRange.from) {
            continue;
        }

        const lineText = line.text;

        // Quick skip: lines without $ can't contain math
        if (!lineText.includes('$')) continue;

        // Skip lines inside code blocks
        if (isInsideCode(line.from)) continue;

        // Block math: $$ at start of line
        if (lineText.trimStart().startsWith('$$')) {
            // Same-line block math: $$...$$
            const sameLineMatch = lineText.match(/^\s*\$\$(.+?)\$\$/);
            if (sameLineMatch) {
                const tex = sameLineMatch[1].trim();
                if (tex) {
                    decos.push(
                        Decoration.replace({
                            widget: new BlockMathWidget(tex),
                        }).range(line.from, line.to)
                    );
                }
                continue;
            }
            // Multi-line block math
            let closingLn = ln + 1;
            let found = false;
            while (closingLn <= state.doc.lines) {
                if (state.doc.line(closingLn).text.trimStart().startsWith('$$')) {
                    found = true;
                    break;
                }
                closingLn++;
            }
            if (!found) continue;

            const closingLine = state.doc.line(closingLn);
            if (closingLine.from < focusedRange.to && closingLine.to > focusedRange.from) {
                continue;
            }

            const texContent = state.doc
                .sliceString(state.doc.line(ln + 1).from, state.doc.line(closingLn).from)
                .trim();
            if (texContent) {
                decos.push(
                    Decoration.replace({
                        widget: new BlockMathWidget(texContent),
                        block: true,
                    }).range(line.from, closingLine.to)
                );
            }
            ln = closingLn;
            continue;
        }

        // Inline math: $...$ (not $$)
        inlineRegex.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = inlineRegex.exec(lineText)) !== null) {
            const tex = match[1];
            if (!tex.trim()) continue;
            const mathFrom = line.from + match.index;
            const mathTo = mathFrom + match[0].length;
            if (mathFrom < focusedRange.to && mathTo > focusedRange.from) continue;
            // Skip $ inside inline code spans (e.g., `$100`)
            if (isInsideCode(mathFrom)) continue;
            decos.push(
                Decoration.replace({
                    widget: new InlineMathWidget(tex),
                }).range(mathFrom, mathTo)
            );
        }
    }
}

/**
 * Collect inline checkbox decorations.
 * Matches [ ], [x], [X] outside of list TaskMarkers, code spans, and links.
 */
function collectCheckboxDecorations(
    state: EditorState,
    decos: Array<ReturnType<Decoration['range']>>,
    focusedRange: ILineRange,
    tree: Tree,
    taskMarkerPositions: Set<number>
): void {
    const cbRegex = /\[([ xX])\]/g;
    for (let ln = 1; ln <= state.doc.lines; ln++) {
        const line = state.doc.line(ln);

        if (line.from < focusedRange.to && line.to > focusedRange.from) {
            continue;
        }

        // Quick skip: lines without [ can't contain checkboxes
        if (!line.text.includes('[')) continue;

        cbRegex.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = cbRegex.exec(line.text)) !== null) {
            const cbFrom = line.from + match.index;
            const cbTo = cbFrom + 3; // [ ] or [x] is always 3 chars

            // Skip if already handled as TaskMarker in list items
            if (taskMarkerPositions.has(cbFrom)) continue;

            // Skip if followed by ( — likely a link like [x](url)
            const charAfter = state.doc.sliceString(cbTo, cbTo + 1);
            if (charAfter === '(') continue;

            // Skip if inside code span (InlineCode node)
            let node = tree.resolveInner(cbFrom, 1);
            let inCode = false;
            while (node) {
                if (
                    node.name === 'InlineCode' ||
                    node.name === 'FencedCode' ||
                    node.name === 'CodeBlock'
                ) {
                    inCode = true;
                    break;
                }
                if (!node.parent || node.parent === node) break;
                node = node.parent;
            }
            if (inCode) continue;

            const checked = match[1] === 'x' || match[1] === 'X';
            decos.push(
                Decoration.replace({
                    widget: new CheckboxWidget(checked, cbFrom),
                }).range(cbFrom, cbTo)
            );
        }
    }
}

// =============================================================================
// Live Preview Plugin
// =============================================================================

/**
 * The Live Preview ViewPlugin.
 *
 * Manages decorations for Obsidian-style live preview.
 * Hides Markdown markers and applies styling in non-focused blocks.
 * Shows raw Markdown source in the focused block.
 */
// Remember last focused range so range selection (drag/keyboard) keeps it stable
let lastFocusedRange: ILineRange = { from: -1, to: -1 };

function buildDecorations(state: EditorState): DecorationSet {
    const decos: Array<ReturnType<Decoration['range']>> = [];
    // Clear table data cache (will be repopulated below)
    tableDataCache.clear();
    const isEditable = state.facet(EditorView.editable);
    let focusedRange: ILineRange;
    if (isEditable && state.selection.main.empty) {
        focusedRange = getMarkdownBlockRange(state);
        lastFocusedRange = focusedRange;
    } else if (isEditable) {
        // During range selection, keep the previously focused block
        focusedRange = lastFocusedRange;
    } else {
        focusedRange = { from: -1, to: -1 };
    }
    // Try to get a fully parsed tree within a short budget.
    // If parsing isn't done yet, fall back to the current incremental tree;
    // treeChanged detection in update() will trigger a rebuild with the complete tree.
    const tree = ensureSyntaxTree(state, state.doc.length, 100) ?? syntaxTree(state);
    const taskMarkerPositions = new Set<number>();

    // === FRONTMATTER DETECTION ===
    // Check if document starts with --- (YAML frontmatter)
    let frontmatterEndLine = -1;
    if (state.doc.lines >= 2) {
        const firstLine = state.doc.line(1);
        if (firstLine.text.trim() === '---') {
            for (let ln = 2; ln <= state.doc.lines; ln++) {
                if (state.doc.line(ln).text.trim() === '---') {
                    frontmatterEndLine = ln;
                    break;
                }
            }
            if (frontmatterEndLine > 0) {
                const fmFrom = firstLine.from;
                const fmTo = state.doc.line(frontmatterEndLine).to;
                // Only render widget if frontmatter is not inside focused range
                if (!(fmFrom < focusedRange.to && fmTo > focusedRange.from)) {
                    const yamlText = state.doc.sliceString(
                        state.doc.line(2).from,
                        state.doc.line(frontmatterEndLine).from
                    );
                    const properties = parseFrontmatter(yamlText);
                    if (properties.length > 0) {
                        decos.push(
                            Decoration.replace({
                                widget: new FrontmatterWidget(properties),
                                block: true,
                            }).range(firstLine.from, fmTo)
                        );
                    }
                }
            }
        }
    }

    tree.iterate({
        from: 0,
        to: state.doc.length,
        enter: (nodeRef): boolean | void => {
            const { from, to, name } = nodeRef;

            // Document node spans everything - always process children
            if (name === 'Document') return;

            // Skip nodes that overlap with the focused range (show raw source)
            if (from < focusedRange.to && to > focusedRange.from) {
                return;
            }

            // Skip empty ranges
            if (from >= to) return;

            switch (name) {
                // === HIDE MARKERS ===

                case 'HeaderMark': {
                    // Hide # marks and trailing space
                    const after = state.doc.sliceString(to, to + 1);
                    const hideEnd = after === ' ' ? to + 1 : to;
                    decos.push(hideDeco.range(from, hideEnd));
                    break;
                }

                case 'EmphasisMark':
                case 'StrikethroughMark':
                case 'CodeMark':
                case 'CodeInfo': {
                    decos.push(hideDeco.range(from, to));
                    break;
                }

                case 'QuoteMark': {
                    // Hide > mark and trailing space
                    const after = state.doc.sliceString(to, to + 1);
                    const hideEnd = after === ' ' ? to + 1 : to;
                    decos.push(hideDeco.range(from, hideEnd));
                    break;
                }

                case 'ListMark': {
                    const text = state.doc.sliceString(from, to);
                    const after = state.doc.sliceString(to, to + 1);
                    const hideEnd = after === ' ' ? to + 1 : to;

                    // Unordered list markers → bullet widget
                    if (text === '-' || text === '*' || text === '+') {
                        decos.push(
                            Decoration.replace({
                                widget: new BulletWidget(),
                            }).range(from, hideEnd)
                        );
                    }
                    // Ordered list markers stay visible (numbers are meaningful)
                    break;
                }

                case 'TaskMarker': {
                    const markerText = state.doc.sliceString(from, to);
                    const checked = markerText === '[x]' || markerText === '[X]';
                    const afterChar = state.doc.sliceString(to, to + 1);
                    const replaceEnd = afterChar === ' ' ? to + 1 : to;
                    taskMarkerPositions.add(from);
                    decos.push(
                        Decoration.replace({
                            widget: new CheckboxWidget(checked, from),
                        }).range(from, replaceEnd)
                    );
                    break;
                }

                // === LINE-LEVEL DECORATIONS ===

                case 'ATXHeading1':
                case 'ATXHeading2':
                case 'ATXHeading3':
                case 'ATXHeading4':
                case 'ATXHeading5':
                case 'ATXHeading6': {
                    const level = parseInt(name.replace('ATXHeading', ''));
                    const line = state.doc.lineAt(from);
                    decos.push(headingLineDecos[level].range(line.from));
                    break;
                }

                case 'SetextHeading1':
                case 'SetextHeading2': {
                    const level = name === 'SetextHeading1' ? 1 : 2;
                    const contentLine = state.doc.lineAt(from);
                    decos.push(headingLineDecos[level].range(contentLine.from));

                    // Collapse the underline line visually (=== or ---)
                    const endLine = state.doc.lineAt(to);
                    if (endLine.number > contentLine.number) {
                        decos.push(
                            Decoration.line({ class: 'cm-md-setext-underline' }).range(endLine.from)
                        );
                    }
                    break;
                }

                case 'Blockquote': {
                    // Only process outermost Blockquote to avoid duplicate line decos
                    if (nodeRef.node.parent?.name === 'Blockquote') break;

                    const startLine = state.doc.lineAt(from);
                    const endLine = state.doc.lineAt(to);
                    for (let ln = startLine.number; ln <= endLine.number; ln++) {
                        const line = state.doc.line(ln);
                        if (line.text.trim() === '') continue;
                        // Count > marks to determine nesting level
                        const gtMatches = line.text.match(/^(\s*>)+/);
                        const level = gtMatches ? (gtMatches[0].match(/>/g) || []).length : 1;
                        const idx = Math.min(level, 5) - 1;
                        decos.push(blockquoteLevelDecos[idx].range(line.from));
                    }
                    break;
                }

                case 'ListItem': {
                    const itemLine = state.doc.lineAt(from);
                    const lineText = itemLine.text;

                    // Add indent guide lines based on indentation level
                    const leadingSpaces = lineText.match(/^(\s*)/);
                    const indentChars = leadingSpaces ? leadingSpaces[1].length : 0;
                    const indentLevel =
                        indentChars >= 4
                            ? Math.floor(indentChars / 4)
                            : Math.floor(indentChars / 2);
                    if (indentLevel > 0) {
                        const cappedLevel = Math.min(indentLevel, 6);
                        decos.push(
                            Decoration.line({
                                class: `cm-md-indent cm-md-indent-${cappedLevel}`,
                            }).range(itemLine.from)
                        );
                    }

                    // Check if this list item has child list (sub-items)
                    const syntaxNode = nodeRef.node;
                    const hasChildList =
                        syntaxNode.getChild('BulletList') || syntaxNode.getChild('OrderedList');
                    if (hasChildList) {
                        const isFolded = foldedListItems.has(itemLine.from);
                        decos.push(
                            Decoration.widget({
                                widget: new FoldArrowWidget(itemLine.from, isFolded),
                                side: -1,
                            }).range(itemLine.from)
                        );
                        if (isFolded) {
                            decos.push(
                                Decoration.line({ class: 'cm-md-fold-collapsed-line' }).range(
                                    itemLine.from
                                )
                            );
                            // Process ListMark → BulletWidget
                            const listMark = syntaxNode.getChild('ListMark');
                            if (listMark) {
                                const markText = state.doc.sliceString(listMark.from, listMark.to);
                                const afterChar = state.doc.sliceString(
                                    listMark.to,
                                    listMark.to + 1
                                );
                                const hideEnd = afterChar === ' ' ? listMark.to + 1 : listMark.to;
                                if (markText === '-' || markText === '*' || markText === '+') {
                                    decos.push(
                                        Decoration.replace({ widget: new BulletWidget() }).range(
                                            listMark.from,
                                            hideEnd
                                        )
                                    );
                                }
                            }
                            // Process TaskMarker → CheckboxWidget
                            const taskMarker = syntaxNode.getChild('TaskMarker');
                            if (taskMarker) {
                                const markerText = state.doc.sliceString(
                                    taskMarker.from,
                                    taskMarker.to
                                );
                                const checked = markerText === '[x]' || markerText === '[X]';
                                const afterChar = state.doc.sliceString(
                                    taskMarker.to,
                                    taskMarker.to + 1
                                );
                                const replaceEnd =
                                    afterChar === ' ' ? taskMarker.to + 1 : taskMarker.to;
                                decos.push(
                                    Decoration.replace({
                                        widget: new CheckboxWidget(checked, taskMarker.from),
                                    }).range(taskMarker.from, replaceEnd)
                                );
                            }
                            // Hide child lines
                            const endLine = state.doc.lineAt(to);
                            if (itemLine.to < endLine.to) {
                                decos.push(
                                    Decoration.replace({ block: true }).range(
                                        itemLine.to,
                                        endLine.to
                                    )
                                );
                            }
                            return false; // Skip children
                        }
                    }
                    break;
                }

                case 'Table': {
                    const syntaxNode = nodeRef.node;
                    const tableData = parseTableNode(syntaxNode, state);
                    if (tableData) {
                        // Cache table data for copy handler (avoids tree re-traversal)
                        tableDataCache.set(tableData.positions.tableFrom, tableData);
                        const firstLine = state.doc.lineAt(from);
                        const endLine = state.doc.lineAt(to);
                        const cellSel =
                            tableCellSelections.get(tableData.positions.tableFrom) ?? null;
                        decos.push(
                            Decoration.replace({
                                widget: new TableWidget(tableData, cellSel),
                                block: true,
                            }).range(firstLine.from, endLine.to)
                        );
                    }
                    return false;
                }

                case 'FencedCode': {
                    const language = extractFencedCodeLanguage(nodeRef.node, state);
                    if (language === 'mermaid') {
                        const content = extractFencedCodeContent(nodeRef.node, state);
                        if (content) {
                            const firstLine = state.doc.lineAt(from);
                            const endLine = state.doc.lineAt(to);
                            decos.push(
                                Decoration.replace({
                                    widget: new MermaidWidget(
                                        content,
                                        state.facet(EditorView.darkTheme)
                                    ),
                                    block: true,
                                }).range(firstLine.from, endLine.to)
                            );
                            return false;
                        }
                    }

                    // 普通代码块只保留边框、语言按钮和缩进导引线。
                    {
                        const startLine = state.doc.lineAt(from);
                        const endLine = state.doc.lineAt(to);
                        for (let ln = startLine.number; ln <= endLine.number; ln++) {
                            const line = state.doc.line(ln);
                            const classes = ['cm-md-codeblock'];
                            const attributes: Record<string, string> = {};
                            if (ln === startLine.number) {
                                classes.push('cm-md-codeblock-first');
                            }
                            if (ln === endLine.number) {
                                classes.push('cm-md-codeblock-last');
                            }
                            if (ln > startLine.number && ln < endLine.number) {
                                const indentLevel = getCodeBlockIndentLevel(line.text);
                                classes.push('cm-md-codeblock-indent');
                                attributes.style = createCodeBlockIndentStyle(indentLevel);
                            }
                            decos.push(
                                Decoration.line({
                                    class: classes.join(' '),
                                    attributes,
                                }).range(line.from)
                            );
                        }
                        const codeContent = extractFencedCodeContent(nodeRef.node, state);
                        if (codeContent !== null) {
                            decos.push(
                                Decoration.widget({
                                    widget: new CodeBlockCopyWidget(codeContent, language),
                                    side: 1,
                                }).range(startLine.to)
                            );
                        }
                    }
                    break;
                }

                // === INLINE STYLING ===

                case 'StrongEmphasis': {
                    const syntaxNode = nodeRef.node;
                    const marks = syntaxNode.getChildren('EmphasisMark');
                    if (marks.length >= 2) {
                        const contentFrom = marks[0].to;
                        const contentTo = marks[marks.length - 1].from;
                        if (contentFrom < contentTo) {
                            decos.push(boldMarkDeco.range(contentFrom, contentTo));
                        }
                    }
                    break;
                }

                case 'Emphasis': {
                    const syntaxNode = nodeRef.node;
                    const marks = syntaxNode.getChildren('EmphasisMark');
                    if (marks.length >= 2) {
                        const contentFrom = marks[0].to;
                        const contentTo = marks[marks.length - 1].from;
                        if (contentFrom < contentTo) {
                            decos.push(italicMarkDeco.range(contentFrom, contentTo));
                        }
                    }
                    break;
                }

                case 'Strikethrough': {
                    const syntaxNode = nodeRef.node;
                    const marks = syntaxNode.getChildren('StrikethroughMark');
                    if (marks.length >= 2) {
                        const contentFrom = marks[0].to;
                        const contentTo = marks[marks.length - 1].from;
                        if (contentFrom < contentTo) {
                            decos.push(strikethroughMarkDeco.range(contentFrom, contentTo));
                        }
                    }
                    break;
                }

                case 'InlineCode': {
                    const syntaxNode = nodeRef.node;
                    const marks = syntaxNode.getChildren('CodeMark');
                    if (marks.length >= 2) {
                        const contentFrom = marks[0].to;
                        const contentTo = marks[marks.length - 1].from;
                        if (contentFrom < contentTo) {
                            decos.push(codeMarkDeco.range(contentFrom, contentTo));
                        }
                    }
                    break;
                }

                case 'Link': {
                    const syntaxNode = nodeRef.node;
                    const marks = syntaxNode.getChildren('LinkMark');
                    const urlNode = syntaxNode.getChild('URL');
                    const linkUrl = urlNode ? state.doc.sliceString(urlNode.from, urlNode.to) : '';

                    if (marks.length >= 2) {
                        const openMark = marks[0];
                        const closeMark = marks[1];

                        decos.push(hideDeco.range(openMark.from, openMark.to));

                        if (openMark.to < closeMark.from) {
                            const attrs: Record<string, string> = {};
                            if (linkUrl) {
                                attrs['data-href'] = linkUrl;
                                attrs['title'] = `${linkUrl} (Ctrl+Click to open)`;
                            }
                            decos.push(
                                Decoration.mark({
                                    class: 'cm-md-link',
                                    attributes: attrs,
                                }).range(openMark.to, closeMark.from)
                            );
                        }

                        if (closeMark.from < to) {
                            decos.push(hideDeco.range(closeMark.from, to));
                        }
                    }
                    return false;
                }

                case 'Autolink': {
                    const autoNode = nodeRef.node;
                    const autoUrlChild = autoNode.getChild('URL');
                    if (autoUrlChild) {
                        const autoUrl = state.doc.sliceString(autoUrlChild.from, autoUrlChild.to);
                        const autoMarks = autoNode.getChildren('LinkMark');
                        for (const mark of autoMarks) {
                            decos.push(hideDeco.range(mark.from, mark.to));
                        }
                        decos.push(
                            Decoration.mark({
                                class: 'cm-md-link',
                                attributes: {
                                    'data-href': autoUrl,
                                    title: `${autoUrl} (Ctrl+Click to open)`,
                                },
                            }).range(autoUrlChild.from, autoUrlChild.to)
                        );
                    }
                    return false;
                }

                case 'URL': {
                    const bareUrl = state.doc.sliceString(from, to);
                    if (bareUrl.startsWith('http://') || bareUrl.startsWith('https://')) {
                        decos.push(
                            Decoration.mark({
                                class: 'cm-md-link',
                                attributes: {
                                    'data-href': bareUrl,
                                    title: `${bareUrl} (Ctrl+Click to open)`,
                                },
                            }).range(from, to)
                        );
                    }
                    break;
                }

                case 'Image': {
                    const syntaxNode = nodeRef.node;
                    const imgUrlNode = syntaxNode.getChild('URL');
                    const imgUrl = imgUrlNode
                        ? state.doc.sliceString(imgUrlNode.from, imgUrlNode.to)
                        : '';
                    const imgText = state.doc.sliceString(from, to);
                    const altMatch = imgText.match(/!\[([^\]]*)\]/);
                    const altText = altMatch ? altMatch[1] : '';

                    if (imgUrl || altText) {
                        decos.push(
                            Decoration.replace({
                                widget: new ImageWidget(imgUrl, altText),
                            }).range(from, to)
                        );
                    }
                    return false;
                }

                case 'HorizontalRule': {
                    decos.push(
                        Decoration.replace({
                            widget: new HorizontalRuleWidget(),
                        }).range(from, to)
                    );
                    break;
                }

                case 'HTMLBlock': {
                    // <details> is handled by post-processing
                    break;
                }
            }
        },
    });

    // === POST-PROCESSING ===
    collectFootnoteDecorations(state, decos, focusedRange);
    collectDetailsDecorations(state, decos, focusedRange);
    collectMathDecorations(state, decos, focusedRange, tree);
    collectCheckboxDecorations(state, decos, focusedRange, tree, taskMarkerPositions);

    // Remember focused range for next update comparison
    return RangeSet.of(decos, true);
}

// =============================================================================
// Exported Plugin & Extension Factory
// =============================================================================

/**
 * The exported ViewPlugin for live preview.
 */

import { StateField } from '@codemirror/state';

export const livePreviewPlugin = StateField.define<DecorationSet>({
    create(state) {
        return buildDecorations(state);
    },
    update(value, tr) {
        const isEditable = tr.state.facet(EditorView.editable);
        const oldSel = tr.startState.selection.main;
        const newSel = tr.state.selection.main;
        const oldFocused =
            isEditable && oldSel.empty
                ? getMarkdownBlockRange(tr.startState)
                : { from: -1, to: -1 };
        const newFocused =
            isEditable && newSel.empty ? getMarkdownBlockRange(tr.state) : { from: -1, to: -1 };

        const focusChanged = oldFocused.from !== newFocused.from || oldFocused.to !== newFocused.to;
        const editableChanged =
            tr.startState.facet(EditorView.editable) !== tr.state.facet(EditorView.editable);
        const hasFoldToggle = tr.effects.some((e) => e.is(foldToggleEffect));
        const hasTableCellSelect = tr.effects.some((e) => e.is(tableCellSelectEffect));
        // Detect Lezer incremental parsing completion (large files parsed in background)
        const treeChanged = syntaxTree(tr.startState) !== syntaxTree(tr.state);

        if (
            tr.docChanged ||
            focusChanged ||
            editableChanged ||
            hasFoldToggle ||
            treeChanged ||
            hasTableCellSelect
        ) {
            return buildDecorations(tr.state);
        }
        return value;
    },
    provide: (f) => EditorView.decorations.from(f),
});

/**
 * ViewPlugin that highlights table widgets when CM6 selection extends over them
 * from outside (e.g. drag-selecting from a paragraph through a table).
 * Works by toggling a CSS class directly on the widget DOM.
 */
const tableExtentSelectionPlugin = EditorView.updateListener.of((update) => {
    if (!update.selectionSet && !update.docChanged && !update.viewportChanged) return;
    const { from, to } = update.view.state.selection.main;
    const hasSelection = from !== to;

    // Don't clear cell selection when this update was caused by tableCellSelectEffect
    const isTableSelectEffect = update.transactions.some((tr) =>
        tr.effects.some((e) => e.is(tableCellSelectEffect))
    );

    const wrappers = update.view.contentDOM.querySelectorAll('[data-table-from]');
    let needsDispatch = false;

    wrappers.forEach((el) => {
        const tableFrom = parseInt((el as HTMLElement).dataset.tableFrom ?? '0');
        const tableTo = parseInt((el as HTMLElement).dataset.tableTo ?? '0');
        const hasCellSel = tableCellSelections.has(tableFrom);

        // Show extent-selected only when no active cell selection and CM6 range covers table
        const covered = !hasCellSel && hasSelection && from < tableTo && to > tableFrom;
        el.classList.toggle('cm-md-table-extent-selected', covered);

        // Clear stale cell selection when CM6 selection moves away from this table
        // (but not while the user is drag-selecting inside a table)
        if (!isTableSelectEffect && !isTableDragging && update.selectionSet && hasCellSel) {
            const selCoversTable = hasSelection && from < tableTo && to > tableFrom;
            if (!selCoversTable) {
                tableCellSelections.delete(tableFrom);
                needsDispatch = true;
                console.debug(`[FlowMD] table cell select cleared: tableFrom=${tableFrom}`);
            }
        }
    });

    if (needsDispatch) {
        update.view.dispatch({ effects: tableCellSelectEffect.of(null) });
    }
});

/**
 * Creates the live preview extension bundle.
 *
 * Returns all extensions needed for Obsidian-style live preview,
 * including the ViewPlugin, syntax highlighting, link handler, and base theme styles.
 */
export function createLivePreviewExtension(): Extension[] {
    return [
        scrollPreserverExtension,
        livePreviewPlugin,
        tableExtentSelectionPlugin,
        syntaxHighlighting(flowMdDarkHighlight),
        syntaxHighlighting(flowMdLightHighlight),
        // Click handler for links
        EditorView.domEventHandlers({
            mousedown(event: MouseEvent, view: EditorView) {
                const target = event.target;
                if (!(target instanceof HTMLElement)) return false;
                const linkEl = target.closest('.cm-md-link');
                if (!linkEl) return false;
                const href = linkEl.getAttribute('data-href');
                if (!href) return false;

                // Anchor links (#heading) — plain click to jump within document
                if (href.startsWith('#')) {
                    event.preventDefault();
                    event.stopPropagation();
                    const slug = href.slice(1);
                    const tree = syntaxTree(view.state);
                    let targetPos = -1;
                    tree.iterate({
                        enter(node) {
                            if (targetPos >= 0) return false;
                            const n = node.name;
                            if (n.startsWith('ATXHeading') || n.startsWith('SetextHeading')) {
                                const headingText = view.state.doc
                                    .sliceString(node.from, node.to)
                                    .replace(/^#{1,6}\s+/, '') // strip ATX markers
                                    .replace(/\n[=\-]+$/, ''); // strip Setext underlines
                                const headingSlug = headingText
                                    .trim()
                                    .toLowerCase()
                                    .replace(/[^\w\s\u3000-\u9fff\uf900-\ufaff-]/g, '')
                                    .replace(/\s+/g, '-');
                                if (headingSlug === slug) {
                                    targetPos = node.from;
                                    return false;
                                }
                            }
                            return true;
                        },
                    });
                    if (targetPos >= 0) {
                        view.dispatch({
                            selection: { anchor: targetPos },
                            effects: EditorView.scrollIntoView(targetPos, {
                                y: 'start',
                                yMargin: 20,
                            }),
                        });
                    }
                    return true;
                }

                // Relative file link — plain click to open in VS Code
                if (!href.startsWith('http://') && !href.startsWith('https://')) {
                    event.preventDefault();
                    event.stopPropagation();
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const vscodeApi = (window as any).__vscodeApi;
                    if (vscodeApi) {
                        vscodeApi.postMessage({ type: 'openFile', path: href });
                    }
                    return true;
                }

                // External URL — Ctrl+click to open in VS Code
                if (!(event.ctrlKey || event.metaKey)) return false;
                event.preventDefault();
                event.stopPropagation();
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const vscodeApi = (window as any).__vscodeApi;
                if (vscodeApi) {
                    vscodeApi.postMessage({ type: 'openUrl', url: href });
                }
                return true;
            },
        }),
        createBaseThemeStyles(),
    ];
}
