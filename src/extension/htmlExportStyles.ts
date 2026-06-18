/**
 * FlowMD HTML Export - Light Theme CSS
 *
 * GitHub-inspired light theme for standalone HTML output.
 * Color palette derived from livePreview/styles.ts light theme.
 *
 * @module extension/htmlExportStyles
 */

export const LIGHT_THEME_CSS = `
/* Base */
body {
  margin: 0;
  padding: 0;
  background-color: #ffffff;
  color: #24292e;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif;
  font-size: 16px;
  line-height: 1.7;
}

.markdown-body {
  max-width: 900px;
  margin: 0 auto;
  padding: 32px 32px 64px;
}

/* Headings */
h1, h2, h3, h4, h5, h6 {
  margin-top: 24px;
  margin-bottom: 16px;
  font-weight: 600;
  line-height: 1.25;
  color: #24292e;
}

h1 {
  font-size: 1.8em;
  font-weight: 700;
  letter-spacing: -0.02em;
  padding-bottom: 0.3em;
  border-bottom: 1px solid #eaecef;
}

h2 {
  font-size: 1.5em;
  letter-spacing: -0.01em;
  padding-bottom: 0.3em;
  border-bottom: 1px solid #eaecef;
}

h3 { font-size: 1.25em; }
h4 { font-size: 1.1em; }
h5 { font-size: 1em; }

h6 {
  font-size: 0.9em;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #656d76;
}

/* Paragraphs */
p {
  margin: 16px 0;
}

/* Inline */
strong { font-weight: 700; }
em { font-style: italic; }

del {
  text-decoration: line-through;
  opacity: 0.6;
}

code {
  font-family: "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 0.9em;
  background-color: #eff1f3;
  padding: 2px 6px;
  border-radius: 4px;
  color: #24292e;
}

a {
  color: #0969da;
  text-decoration: underline;
  text-decoration-skip-ink: auto;
  text-underline-offset: 3px;
}

a:hover { opacity: 0.8; }

/* Blockquotes */
blockquote {
  margin: 16px 0;
  padding: 0 1em;
  border-left: 3px solid #d0d7de;
  color: #656d76;
}

blockquote > :first-child { margin-top: 0; }
blockquote > :last-child { margin-bottom: 0; }

/* Lists */
ul, ol {
  padding-left: 2em;
  margin: 16px 0;
}

li { margin: 4px 0; }
ul ul, ul ol, ol ul, ol ol { margin: 0; }
li > p { margin: 0; }

input[type="checkbox"] {
  margin-right: 0.5em;
  accent-color: #0969da;
}

/* Code Blocks */
pre {
  background-color: #f6f8fa;
  padding: 16px;
  border-radius: 6px;
  overflow: auto;
  font-family: "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 0.9em;
  line-height: 1.45;
  margin: 16px 0;
}

pre code {
  background-color: transparent;
  padding: 0;
  border-radius: 0;
  display: block;
}

/* Tables */
table {
  border-collapse: collapse;
  margin: 16px 0;
  width: auto;
  max-width: 100%;
  overflow: auto;
  display: block;
}

th, td {
  padding: 8px 12px;
  border: 1px solid #d0d7de;
  text-align: left;
}

th {
  font-weight: 600;
  background-color: #f6f8fa;
}

tr:nth-child(even) td {
  background-color: #f6f8fa;
}

/* Horizontal Rule */
hr {
  border: none;
  border-top: 1px solid #d0d7de;
  margin: 24px 0;
}

/* Images */
img {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
}

/* Math (KaTeX MathML) */
.math-block {
  display: block;
  text-align: center;
  margin: 16px 0;
  padding: 8px 0;
  overflow-x: auto;
}

.math-inline {
  display: inline;
}

.math-error {
  color: #cf222e;
  background-color: rgba(207, 34, 46, 0.1);
  padding: 4px 8px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.9em;
}

/* Mermaid */
pre.mermaid {
  background-color: transparent;
  text-align: center;
  border: none;
  padding: 16px 0;
}

/* Footnotes */
.footnotes-section {
  margin-top: 32px;
  padding-top: 16px;
  border-top: 1px solid #d0d7de;
  font-size: 0.9em;
  color: #656d76;
}

.footnotes-section ol {
  padding-left: 1.5em;
}

.footnotes-section li {
  margin: 8px 0;
}

sup.footnote-ref a {
  color: #0969da;
  text-decoration: none;
  font-size: 0.85em;
  padding: 0 2px;
}

sup.footnote-ref a:hover {
  text-decoration: underline;
}

a.footnote-backref {
  color: #0969da;
  text-decoration: none;
  margin-left: 4px;
}

/* Details/Summary */
details {
  margin: 8px 0;
  border-left: 2px solid rgba(128, 128, 128, 0.3);
  padding-left: 12px;
}

summary {
  cursor: pointer;
  font-weight: 600;
  padding: 4px 0;
  color: #24292e;
}

summary:hover {
  color: #0969da;
}

/* Print */
@media print {
  body { background: white; }
  .markdown-body { max-width: none; padding: 0; }
  pre { white-space: pre-wrap; word-wrap: break-word; }
  a { color: #24292e; text-decoration: underline; }
  pre.mermaid { page-break-inside: avoid; }
}
`;
