/**
 * Live Preview Decorations
 *
 * Pre-built Decoration instances and HighlightStyle definitions.
 *
 * @module webview/codemirror/extensions/livePreview/decorations
 */

import { Decoration } from '@codemirror/view';
import { HighlightStyle } from '@codemirror/language';
import { tags } from '@lezer/highlight';

// =============================================================================
// Pre-built Decorations
// =============================================================================

/** Hides content by replacing it with nothing */
export const hideDeco = Decoration.replace({});

/** Marks bold content */
export const boldMarkDeco = Decoration.mark({ class: 'cm-md-bold' });

/** Marks italic content */
export const italicMarkDeco = Decoration.mark({ class: 'cm-md-italic' });

/** Marks inline code content */
export const codeMarkDeco = Decoration.mark({ class: 'cm-md-code' });

/** Marks strikethrough content */
export const strikethroughMarkDeco = Decoration.mark({ class: 'cm-md-strikethrough' });

/** Marks link content */
export const linkMarkDeco = Decoration.mark({ class: 'cm-md-link' });

/** Heading line decorations per level (1-6) */
export const headingLineDecos: Record<number, Decoration> = {};
for (let level = 1; level <= 6; level++) {
    headingLineDecos[level] = Decoration.line({ class: `cm-md-heading cm-md-heading-${level}` });
}

/** Blockquote line decorations per nesting level (1-5) */
export const blockquoteLevelDecos: Decoration[] = [];
for (let level = 1; level <= 5; level++) {
    blockquoteLevelDecos.push(
        Decoration.line({ class: `cm-md-blockquote cm-md-blockquote-${level}` })
    );
}

/** Footnote definition line decoration */
export const footnoteDefLineDeco = Decoration.line({ class: 'cm-md-footnote-def' });

/** Code block line decoration */
export const codeBlockLineDeco = Decoration.line({ class: 'cm-md-codeblock' });

/** Hidden line decoration (for block widget multi-line collapse) */
export const hiddenLineDeco = Decoration.line({ class: 'cm-md-hidden-line' });

// =============================================================================
// Syntax Highlight Styles
// =============================================================================

/**
 * Dark theme highlight style for code syntax within Markdown fenced blocks.
 */
export const flowMdDarkHighlight = HighlightStyle.define(
    [
        { tag: tags.keyword, color: '#c586c0' },
        { tag: tags.controlKeyword, color: '#c586c0' },
        { tag: tags.operatorKeyword, color: '#c586c0' },
        { tag: tags.definitionKeyword, color: '#c586c0' },
        { tag: tags.moduleKeyword, color: '#c586c0' },
        { tag: tags.operator, color: '#d4d4d4' },
        { tag: tags.punctuation, color: '#d4d4d4' },
        { tag: tags.bracket, color: '#ffd700' },
        { tag: tags.string, color: '#ce9178' },
        { tag: tags.number, color: '#b5cea8' },
        { tag: tags.bool, color: '#569cd6' },
        { tag: tags.null, color: '#569cd6' },
        { tag: tags.comment, color: '#c9d1d9' },
        { tag: tags.lineComment, color: '#c9d1d9' },
        { tag: tags.blockComment, color: '#c9d1d9' },
        { tag: tags.docComment, color: '#c9d1d9' },
        { tag: tags.variableName, color: '#9cdcfe' },
        { tag: tags.definition(tags.variableName), color: '#4fc1ff' },
        { tag: tags.function(tags.variableName), color: '#dcdcaa' },
        { tag: tags.typeName, color: '#4ec9b0' },
        { tag: tags.className, color: '#4ec9b0' },
        { tag: tags.propertyName, color: '#9cdcfe' },
        { tag: tags.function(tags.propertyName), color: '#dcdcaa' },
        { tag: tags.attributeName, color: '#9cdcfe' },
        { tag: tags.tagName, color: '#569cd6' },
        { tag: tags.angleBracket, color: '#808080' },
        { tag: tags.regexp, color: '#d16969' },
        { tag: tags.self, color: '#569cd6' },
        { tag: tags.meta, color: '#d4d4d4' },
    ],
    { themeType: 'dark' }
);

/**
 * Light theme highlight style for code syntax within Markdown fenced blocks.
 */
export const flowMdLightHighlight = HighlightStyle.define(
    [
        { tag: tags.keyword, color: '#af00db' },
        { tag: tags.controlKeyword, color: '#af00db' },
        { tag: tags.operatorKeyword, color: '#af00db' },
        { tag: tags.definitionKeyword, color: '#af00db' },
        { tag: tags.moduleKeyword, color: '#af00db' },
        { tag: tags.operator, color: '#000000' },
        { tag: tags.punctuation, color: '#000000' },
        { tag: tags.bracket, color: '#0431fa' },
        { tag: tags.string, color: '#a31515' },
        { tag: tags.number, color: '#098658' },
        { tag: tags.bool, color: '#0000ff' },
        { tag: tags.null, color: '#0000ff' },
        { tag: tags.comment, color: '#5f6a79' },
        { tag: tags.lineComment, color: '#5f6a79' },
        { tag: tags.blockComment, color: '#5f6a79' },
        { tag: tags.docComment, color: '#5f6a79' },
        { tag: tags.variableName, color: '#001080' },
        { tag: tags.definition(tags.variableName), color: '#0070c1' },
        { tag: tags.function(tags.variableName), color: '#795e26' },
        { tag: tags.typeName, color: '#267f99' },
        { tag: tags.className, color: '#267f99' },
        { tag: tags.propertyName, color: '#001080' },
        { tag: tags.function(tags.propertyName), color: '#795e26' },
        { tag: tags.attributeName, color: '#e50000' },
        { tag: tags.tagName, color: '#800000' },
        { tag: tags.angleBracket, color: '#800000' },
        { tag: tags.regexp, color: '#811f3f' },
        { tag: tags.self, color: '#0000ff' },
        { tag: tags.meta, color: '#000000' },
    ],
    { themeType: 'light' }
);
