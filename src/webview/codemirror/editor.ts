/**
 * CodeMirrorEditor Class Implementation
 *
 * This module implements the CodeMirrorEditor class, which wraps CodeMirror 6
 * to provide a clean API for the FlowMD Webview editor.
 *
 * @module webview/codemirror/editor
 *
 * Design References:
 * - DES-A-004: CodeMirror 6 editor design
 * - DES-F-003: Webview file responsibilities
 *
 * Requirements:
 * - REQ-F-002: Webview CodeMirror initialization
 * - REQ-F-003: File loading and CodeMirror display
 * - REQ-F-004: CodeMirror edit content file save
 * - REQ-F-010: Image display
 */

import { EditorState, Transaction, type Extension, Compartment } from '@codemirror/state';
import {
    EditorView,
    keymap,
    highlightActiveLine,
    highlightSpecialChars,
    lineNumbers,
    rectangularSelection,
    crosshairCursor,
    drawSelection,
} from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { search, searchKeymap, openSearchPanel, closeSearchPanel } from '@codemirror/search';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { LanguageDescription, LanguageSupport, StreamLanguage } from '@codemirror/language';

// CM6 language packages (static imports for IIFE bundle compatibility)
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { json } from '@codemirror/lang-json';
import { java } from '@codemirror/lang-java';
import { cpp } from '@codemirror/lang-cpp';
import { rust } from '@codemirror/lang-rust';
import { go } from '@codemirror/lang-go';
import { sql } from '@codemirror/lang-sql';
import { php } from '@codemirror/lang-php';
import { xml } from '@codemirror/lang-xml';
import { yaml } from '@codemirror/lang-yaml';

// Legacy modes (CM5 → CM6 via StreamLanguage)
import { shell } from '@codemirror/legacy-modes/mode/shell';
import { powerShell } from '@codemirror/legacy-modes/mode/powershell';
import { ruby } from '@codemirror/legacy-modes/mode/ruby';
import { dockerFile } from '@codemirror/legacy-modes/mode/dockerfile';
import { toml } from '@codemirror/legacy-modes/mode/toml';
import { diff } from '@codemirror/legacy-modes/mode/diff';

import { createThemeExtension } from './extensions/theme';
import { markdownKeymap } from './extensions/keymap.js';
import { codeBlockSelectionPlugin } from './extensions/livePreview/codeBlockSelection.js';
import { createLivePreviewExtension } from './extensions/livePreview/index.js';

import { searchMatchCount } from './extensions/searchMatchCount';
import type { ContentChangeCallback } from './types';
import type { FlowMdEditorSettings } from '../../shared/types.js';

/**
 * Statically-loaded language descriptions for fenced code block syntax highlighting.
 * Uses direct imports instead of @codemirror/language-data's dynamic import()
 * which doesn't work in esbuild IIFE bundles.
 */
const codeLanguages: readonly LanguageDescription[] = [
    LanguageDescription.of({
        name: 'JavaScript',
        alias: ['js', 'jsx', 'ecmascript', 'node'],
        extensions: ['js', 'mjs', 'cjs', 'jsx'],
        support: javascript({ jsx: true }),
    }),
    LanguageDescription.of({
        name: 'TypeScript',
        alias: ['ts', 'tsx'],
        extensions: ['ts', 'tsx', 'mts', 'cts'],
        support: javascript({ typescript: true, jsx: true }),
    }),
    LanguageDescription.of({
        name: 'Python',
        alias: ['py'],
        extensions: ['py', 'pyw'],
        support: python(),
    }),
    LanguageDescription.of({
        name: 'HTML',
        alias: ['htm'],
        extensions: ['html', 'htm'],
        support: html(),
    }),
    LanguageDescription.of({ name: 'CSS', extensions: ['css'], support: css() }),
    LanguageDescription.of({
        name: 'JSON',
        alias: ['jsonc'],
        extensions: ['json'],
        support: json(),
    }),
    LanguageDescription.of({ name: 'Java', extensions: ['java'], support: java() }),
    LanguageDescription.of({
        name: 'C++',
        alias: ['cpp', 'c', 'cc', 'cxx', 'h', 'hpp'],
        extensions: ['cpp', 'c', 'cc', 'h', 'hpp'],
        support: cpp(),
    }),
    LanguageDescription.of({ name: 'Rust', alias: ['rs'], extensions: ['rs'], support: rust() }),
    LanguageDescription.of({ name: 'Go', alias: ['golang'], extensions: ['go'], support: go() }),
    LanguageDescription.of({ name: 'SQL', extensions: ['sql'], support: sql() }),
    LanguageDescription.of({ name: 'PHP', extensions: ['php'], support: php() }),
    LanguageDescription.of({
        name: 'XML',
        alias: ['svg', 'xsl', 'xsd'],
        extensions: ['xml', 'svg', 'xsl'],
        support: xml(),
    }),
    LanguageDescription.of({
        name: 'YAML',
        alias: ['yml'],
        extensions: ['yaml', 'yml'],
        support: yaml(),
    }),
    LanguageDescription.of({
        name: 'Shell',
        alias: ['bash', 'sh', 'zsh', 'ksh'],
        extensions: ['sh', 'bash', 'zsh'],
        support: new LanguageSupport(StreamLanguage.define(shell)),
    }),
    LanguageDescription.of({
        name: 'PowerShell',
        alias: ['ps1', 'psm1', 'pwsh'],
        extensions: ['ps1', 'psm1'],
        support: new LanguageSupport(StreamLanguage.define(powerShell)),
    }),
    LanguageDescription.of({
        name: 'Ruby',
        alias: ['rb'],
        extensions: ['rb'],
        support: new LanguageSupport(StreamLanguage.define(ruby)),
    }),
    LanguageDescription.of({
        name: 'Dockerfile',
        alias: ['docker'],
        extensions: ['dockerfile'],
        support: new LanguageSupport(StreamLanguage.define(dockerFile)),
    }),
    LanguageDescription.of({
        name: 'TOML',
        extensions: ['toml'],
        support: new LanguageSupport(StreamLanguage.define(toml)),
    }),
    LanguageDescription.of({
        name: 'Diff',
        alias: ['patch'],
        extensions: ['diff', 'patch'],
        support: new LanguageSupport(StreamLanguage.define(diff)),
    }),
];

/**
 * Copy text to clipboard via Extension's vscode.env.clipboard API.
 * This is the most reliable method in VS Code webviews.
 */
function copyTextToClipboard(text: string): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vscodeApi = (window as any).__vscodeApi;
    if (vscodeApi) {
        vscodeApi.postMessage({ type: 'copyToClipboard', text });
    }
}

/**
 * Error thrown when editor operations are attempted before initialization.
 */
class EditorNotReadyError extends Error {
    constructor(operation: string) {
        super(`Cannot ${operation}: Editor is not initialized. Call create() first.`);
        this.name = 'EditorNotReadyError';
    }
}

/**
 * Error thrown when an invalid container is provided.
 */
class InvalidContainerError extends Error {
    constructor() {
        super('Container element is required and must be a valid HTMLElement.');
        this.name = 'InvalidContainerError';
    }
}

/**
 * CodeMirrorEditor class
 *
 * Wraps CodeMirror 6 EditorView to provide a simplified API for the FlowMD editor.
 * Handles editor lifecycle (create/destroy), content management (set/get),
 * and content change notifications.
 *
 * @example
 * ```typescript
 * const container = document.getElementById('editor');
 * const editor = new CodeMirrorEditor(container);
 *
 * await editor.create('# Initial Content');
 * editor.onChange((content) => console.log('Changed:', content));
 *
 * // Later...
 * editor.destroy();
 * ```
 */
export class CodeMirrorEditor {
    /** The container element where the editor is mounted */
    private readonly container: HTMLElement;

    /** The CodeMirror EditorView instance */
    private view: EditorView | null = null;

    /** Callback for content changes */
    private onChangeCallback: ContentChangeCallback | undefined;

    /** Flag to suppress onChange during programmatic updates */
    private suppressOnChange: boolean = false;

    /** Compartment for dynamic editable reconfiguration */
    private editableCompartment = new Compartment();

    /** Compartment for dynamic live preview reconfiguration */
    private livePreviewCompartment = new Compartment();

    /** Compartment for dynamic line wrapping reconfiguration */
    private lineWrappingCompartment = new Compartment();

    /** Compartment for dynamic line numbers reconfiguration */
    private lineNumbersCompartment = new Compartment();

    /** External paste handler for image paste support (DES-API-003) */
    private pasteHandler: ((event: ClipboardEvent, view: EditorView) => boolean) | null = null;

    /** 编辑器正文字号缩放倍率，1 表示保持 VS Code 原始字号。 */
    private fontScale: number = 1;

    /** 编辑器正文缩放的最小倍率，避免缩得过小后无法阅读。 */
    private static readonly MIN_FONT_SCALE = 0.5;

    /** 编辑器正文缩放的最大倍率，避免缩得过大后破坏布局。 */
    private static readonly MAX_FONT_SCALE = 2;

    /** 每次滚轮缩放的步进值，数值越大缩放越快。 */
    private static readonly FONT_SCALE_STEP = 0.1;

    /**
     * Creates a new CodeMirrorEditor instance.
     *
     * @param container - The HTML element to mount the editor in
     * @throws {InvalidContainerError} If container is null or undefined
     */
    constructor(container: HTMLElement) {
        if (!container) {
            throw new InvalidContainerError();
        }
        this.container = container;
    }

    /**
     * 将当前字号缩放倍率写入编辑器容器。
     *
     * 这样可以只放大 Markdown 正文文本，不影响整个 webview 的布局。
     *
     * @returns void
     */
    private applyFontScale(): void {
        this.container.style.setProperty('--flowmd-font-scale', this.fontScale.toFixed(2));
    }

    /**
     * 按滚轮方向调整编辑器正文字号缩放倍率。
     *
     * @param deltaY - 滚轮的垂直位移，负数表示放大，正数表示缩小
     * @returns void
     */
    private adjustFontScale(deltaY: number): void {
        const direction = deltaY < 0 ? 1 : -1;
        const nextScale = this.fontScale + direction * CodeMirrorEditor.FONT_SCALE_STEP;
        this.fontScale = Math.min(
            CodeMirrorEditor.MAX_FONT_SCALE,
            Math.max(CodeMirrorEditor.MIN_FONT_SCALE, nextScale)
        );
        this.applyFontScale();
    }

    /**
     * Creates and initializes the CodeMirror EditorView.
     *
     * Sets up the editor with Markdown language support, history (undo/redo),
     * and default keybindings.
     *
     * @param initialContent - Optional initial content to populate the editor
     * @returns Promise that resolves when the editor is ready
     */
    create(initialContent: string = ''): Promise<void> {
        // If already created, destroy first
        if (this.view) {
            this.destroy();
        }

        // Build extensions list
        const extensions: Extension[] = [
            // Editable state (dynamically reconfigurable for viewer mode)
            this.editableCompartment.of(EditorView.editable.of(true)),

            // Line wrapping (dynamically reconfigurable via settings)
            this.lineWrappingCompartment.of(EditorView.lineWrapping),

            // Visual rendering (active line, line numbers)
            highlightActiveLine(),
            highlightSpecialChars(),
            this.lineNumbersCompartment.of(lineNumbers()),

            // Multiple selections / cursors (required for rectangular selection)
            EditorState.allowMultipleSelections.of(true),
            drawSelection(),
            // Selection highlight via mark decorations (all modes).
            // Hides drawSelection's selectionLayer and uses inline marks instead,
            // ensuring selection is always visible above element backgrounds.
            codeBlockSelectionPlugin,

            // Rectangular selection (Alt+Shift+Drag, matching VS Code behavior)
            rectangularSelection({ eventFilter: (e) => e.altKey && e.shiftKey }),
            crosshairCursor({ key: 'Alt' }),

            // Fast scroll (Alt+Wheel) - 5x speed, matching VS Code behavior
            EditorView.domEventHandlers({
                wheel: (event: WheelEvent, view: EditorView) => {
                    if (event.ctrlKey || event.metaKey) {
                        event.preventDefault();
                        event.stopPropagation();
                        this.adjustFontScale(event.deltaY);
                        return true;
                    }
                    if (event.altKey) {
                        event.preventDefault();
                        view.scrollDOM.scrollTop += event.deltaY * 5;
                        return true;
                    }
                    return false;
                },
                // Focus support for Viewer Mode (editable: false)
                // When contenteditable=false, clicking doesn't grant focus to the editor.
                // VS Code requires webview focus to activate the editor tab.
                mousedown(_event: MouseEvent, view: EditorView) {
                    if (!view.state.facet(EditorView.editable)) {
                        if (!view.dom.hasAttribute('tabindex')) {
                            view.dom.setAttribute('tabindex', '0');
                        }
                        view.dom.focus({ preventScroll: true });
                    }
                    return false;
                },
                // Ctrl+C / Cmd+C copy support for Viewer Mode (editable: false)
                // Table cell copy is handled by the global capture-phase handler in main.ts.
                // This handler covers non-table text copy in Viewer mode, where the browser's
                // native copy doesn't fire because contenteditable=false.
                keydown(event: KeyboardEvent, view: EditorView) {
                    if ((event.ctrlKey || event.metaKey) && event.key === 'c' && !event.shiftKey) {
                        if (!view.state.facet(EditorView.editable)) {
                            const { from, to } = view.state.selection.main;
                            if (from !== to) {
                                const selectedText = view.state.sliceDoc(from, to);
                                event.preventDefault();
                                copyTextToClipboard(selectedText);
                                return true;
                            }
                        }
                    }
                    return false;
                },
            }),

            // Search (Ctrl+F, Ctrl+H) - top position like VS Code
            search({ top: true }),
            searchMatchCount,

            // History support (undo/redo)
            history(),

            // Keybindings
            // Filter out Mod-f and Mod-h from searchKeymap to prevent double-firing
            // with VS Code's keybinding commands (flowMd.find / flowMd.replace).
            keymap.of([
                indentWithTab,
                ...markdownKeymap,
                ...searchKeymap.filter((k) => k.key !== 'Mod-f' && k.key !== 'Mod-h'),
                ...defaultKeymap,
                ...historyKeymap,
            ]),

            // Markdown language support with code block syntax highlighting
            markdown({
                base: markdownLanguage,
                codeLanguages,
                addKeymap: true,
            }),

            // Theme extension (VS Code integration, cursor/selection colors)
            ...createThemeExtension(),

            // Live Preview (Obsidian-style Markdown rendering, dynamically reconfigurable)
            this.livePreviewCompartment.of(createLivePreviewExtension()),

            // Content change listener
            // Skip during IME composition — compositionend handler below
            // takes care of notifying after composition finishes.
            EditorView.updateListener.of((update) => {
                if (update.docChanged) {
                    console.debug(
                        `[FlowMD] updateListener: docChanged=true suppressOnChange=${this.suppressOnChange} composing=${update.view.composing} hasCallback=${!!this.onChangeCallback}`
                    );
                }
                if (
                    update.docChanged &&
                    !this.suppressOnChange &&
                    !update.view.composing &&
                    this.onChangeCallback
                ) {
                    console.debug(
                        `[FlowMD] updateListener: calling onChangeCallback (docLen=${update.state.doc.length})`
                    );
                    this.onChangeCallback(update.state.doc.toString());
                }
            }),

            // IME composition end handler
            // CM6 applies doc changes during composition but the updateListener
            // above blocks them (composing=true). After compositionend, CM6 does
            // NOT fire another updateListener (no state change), so we catch it
            // here at the DOM level and send the final content.
            EditorView.domEventHandlers({
                compositionend: (_event: CompositionEvent, view: EditorView) => {
                    setTimeout(() => {
                        if (!this.suppressOnChange && this.onChangeCallback && !view.composing) {
                            this.onChangeCallback(view.state.doc.toString());
                        }
                    }, 20);
                    return false;
                },
                paste: (event: ClipboardEvent, view: EditorView) => {
                    if (this.pasteHandler) {
                        return this.pasteHandler(event, view);
                    }
                    return false;
                },
            }),
        ];

        // Create EditorState
        const state = EditorState.create({
            doc: initialContent,
            extensions,
        });

        // Create EditorView and mount to container
        this.view = new EditorView({
            state,
            parent: this.container,
        });

        // 初始化字号缩放变量，确保编辑器正文从默认倍率开始渲染。
        this.applyFontScale();

        return Promise.resolve();
    }

    /**
     * Destroys the editor and cleans up resources.
     *
     * Safe to call multiple times or before create().
     */
    destroy(): void {
        if (this.view) {
            this.view.destroy();
            this.view = null;
        }
        this.onChangeCallback = undefined;
        this.pasteHandler = null;
        this.suppressOnChange = false;
    }

    /**
     * Sets the editor content.
     *
     * Replaces all content in the editor. Does NOT trigger the onChange callback
     * to prevent feedback loops during external updates.
     *
     * @param content - The new content to set
     * @throws {EditorNotReadyError} If called before create()
     */
    setContent(content: string): void {
        if (!this.view) {
            throw new EditorNotReadyError('setContent');
        }

        // During IME composition, skip external content updates entirely.
        // Replacing the document mid-composition destroys the composing text
        // and causes cursor jumps. The updateListener detects the composing→
        // not-composing transition and sends the final content at that point.
        if (this.view.composing) {
            console.debug(
                `[FlowMD] setContent SKIPPED (composing=true) contentLen=${content.length}`
            );
            return;
        }

        // Suppress onChange during programmatic update
        this.suppressOnChange = true;

        try {
            // Skip dispatch if content hasn't changed (prevents cursor reset after Ctrl+Z)
            if (this.view.state.doc.toString() === content) {
                console.debug(
                    `[FlowMD] setContent SKIPPED (content unchanged) contentLen=${content.length}`
                );
                return;
            }

            const currentLength = this.view.state.doc.length;
            // Preserve cursor position (clamped to new content length)
            const cursorPos = this.view.state.selection.main.head;
            const newCursorPos = Math.min(cursorPos, content.length);
            // Preserve scroll position across external content updates
            const scrollTop = this.view.scrollDOM.scrollTop;

            console.debug(
                `[FlowMD] setContent DISPATCHING: currentLen=${currentLength} newLen=${content.length} cursorPos=${cursorPos} newCursorPos=${newCursorPos} hasFocus=${this.view.hasFocus}`
            );

            // Replace all content while preserving cursor and scroll
            this.view.dispatch({
                changes: {
                    from: 0,
                    to: currentLength,
                    insert: content,
                },
                selection: { anchor: newCursorPos },
                annotations: Transaction.addToHistory.of(false),
            });

            console.debug(`[FlowMD] setContent DONE: hasFocus=${this.view.hasFocus}`);

            // Restore scroll position (external updates shouldn't move the view)
            this.view.scrollDOM.scrollTop = scrollTop;
        } finally {
            this.suppressOnChange = false;
        }
    }

    /**
     * Gets the current editor content.
     *
     * @returns The current content as a string
     * @throws {EditorNotReadyError} If called before create()
     */
    getContent(): string {
        if (!this.view) {
            throw new EditorNotReadyError('getContent');
        }

        return this.view.state.doc.toString();
    }

    /**
     * Registers a callback for content changes.
     *
     * The callback is invoked when the user edits the content (typing, pasting, etc.).
     * It is NOT invoked when setContent() is called (to prevent feedback loops).
     *
     * @param callback - Function to call with the new content when it changes
     */
    onChange(callback: ContentChangeCallback): void {
        this.onChangeCallback = callback;
    }

    /**
     * Sets an external paste handler for image paste support.
     *
     * The handler is called from the CM6 domEventHandlers paste event.
     * It should return true if the event was consumed (preventing default paste),
     * or false to allow normal paste behavior.
     *
     * @param handler - Paste event handler that returns true if event was consumed
     *
     * @see DES-API-003
     */
    setPasteHandler(handler: (event: ClipboardEvent, view: EditorView) => boolean): void {
        this.pasteHandler = handler;
    }

    /**
     * Gets the underlying EditorView instance.
     *
     * Returns null if the editor has not been initialized or has been destroyed.
     *
     * Used by ImageDropHandler for:
     * - posAtCoords() to determine drop position
     * - view.state.selection for cursor position
     * - view.dispatch() for text insertion
     *
     * @returns The EditorView instance, or null if not initialized
     *
     * @see DES-API-004
     */
    getView(): EditorView | null {
        return this.view;
    }

    /**
     * Checks if the editor is ready (initialized).
     *
     * @returns true if the editor has been created and not destroyed
     */
    isReady(): boolean {
        return this.view !== null;
    }

    /**
     * Focuses the editor.
     *
     * Safe to call before create() (no-op).
     */
    focus(): void {
        if (this.view) {
            this.view.focus();
        }
    }

    /**
     * 将编辑器滚动到指定行。
     *
     * 该方法用于大纲面板点击标题后的跳转定位。
     *
     * @param lineNumber - 目标行号，从 1 开始
     */
    scrollToLine(lineNumber: number): void {
        if (!this.view) return;
        if (!Number.isFinite(lineNumber) || lineNumber < 1) return;

        const line = Math.min(this.view.state.doc.lines, Math.floor(lineNumber));
        const target = this.view.state.doc.line(line);
        this.view.dispatch({
            selection: { anchor: target.from },
            effects: EditorView.scrollIntoView(target.from, { y: 'start' }),
        });
        this.view.focus();
    }

    /**
     * Sets the editor's editable state.
     *
     * When set to false, the editor becomes read-only (viewer mode).
     * All live preview decorations remain visible with no focused editing range.
     *
     * @param editable - Whether the editor should be editable
     */
    setEditable(editable: boolean): void {
        if (this.view) {
            this.view.dispatch({
                effects: this.editableCompartment.reconfigure(EditorView.editable.of(editable)),
            });
        }
    }

    /**
     * Sets the editor mode.
     *
     * - 'live': Live preview + editable (default)
     * - 'viewer': Live preview + read-only
     * - 'source': No live preview + editable (raw Markdown)
     *
     * @param mode - The editor mode to set
     */
    setMode(mode: 'live' | 'viewer' | 'source'): void {
        if (!this.view) return;

        const editable = mode !== 'viewer';
        const livePreview = mode !== 'source';

        this.view.dispatch({
            effects: [
                this.editableCompartment.reconfigure(EditorView.editable.of(editable)),
                this.livePreviewCompartment.reconfigure(
                    livePreview ? createLivePreviewExtension() : []
                ),
            ],
        });
    }

    /**
     * Applies editor settings (word wrap, readable line length).
     *
     * @param settings - The editor settings to apply
     */
    /**
     * Executes an editor command (find, replace) triggered from VS Code keybindings.
     */
    executeCommand(command: string): void {
        if (!this.view) return;
        switch (command) {
            case 'find': {
                // Toggle: close if already open, open if closed.
                // Mod-f is filtered out of searchKeymap to avoid double-firing.
                const searchPanel = this.view.dom.querySelector('.cm-search');
                if (searchPanel) {
                    closeSearchPanel(this.view);
                } else {
                    openSearchPanel(this.view);
                    this.addSearchEscapeHandler();
                }
                break;
            }
            case 'replace': {
                // Toggle: close if already open, open if closed.
                // Mod-h is filtered out of searchKeymap to avoid double-firing.
                const replacePanel = this.view.dom.querySelector('.cm-search');
                if (replacePanel) {
                    closeSearchPanel(this.view);
                } else {
                    openSearchPanel(this.view);
                    this.addSearchEscapeHandler();
                    // Focus the replace field after panel renders
                    setTimeout(() => {
                        if (!this.view) return;
                        const replaceField = this.view.dom.querySelector(
                            '.cm-search input[name="replace"]'
                        );
                        if (replaceField) {
                            (replaceField as HTMLElement).focus();
                        }
                    }, 50);
                }
                break;
            }
        }
    }

    /**
     * Add Escape key handler to the search panel DOM element.
     * VS Code webview may intercept Escape before CodeMirror's scoped keymap
     * can handle it, so we handle it directly at the DOM level.
     */
    private addSearchEscapeHandler(): void {
        if (!this.view) return;
        setTimeout(() => {
            const panel = this.view?.dom.querySelector('.cm-search');
            if (!panel) return;
            panel.addEventListener('keydown', (e) => {
                if ((e as KeyboardEvent).key === 'Escape') {
                    e.preventDefault();
                    e.stopPropagation();
                    if (this.view) closeSearchPanel(this.view);
                }
            });
        }, 0);
    }

    applySettings(settings: FlowMdEditorSettings): void {
        if (!this.view) return;

        // Line numbers
        this.view.dispatch({
            effects: this.lineNumbersCompartment.reconfigure(
                settings.lineNumbers ? lineNumbers() : []
            ),
        });

        // Word wrap
        this.view.dispatch({
            effects: this.lineWrappingCompartment.reconfigure(
                settings.wordWrap ? EditorView.lineWrapping : []
            ),
        });

        // Readable line length via CSS variable
        const editorEl = this.container;
        const maxWidth =
            settings.readableLineLength > 0 ? `${settings.readableLineLength}px` : '100%';
        editorEl.style.setProperty('--flowmd-max-width', maxWidth);
    }
}
