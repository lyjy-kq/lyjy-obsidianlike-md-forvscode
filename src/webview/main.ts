/**
 * FlowMD Webview Entry Point
 *
 * This module serves as the entry point for the Webview side of the FlowMD editor.
 * It handles:
 * - VS Code API acquisition
 * - DOMContentLoaded initialization
 * - Ready message sending to Extension
 * - Message reception and routing via WebviewMessageHandler
 * - CodeMirror 6 editor integration
 * - Theme management
 * - Image handler integration
 *
 * Updated for CodeMirror 6:
 * - Replaced MilkdownEditor with CodeMirrorEditor
 * - Using WebviewMessageSender and WebviewMessageHandler from messageHandler.ts
 * - Theme switching via switchTheme() from theme extension
 * - Error handling with error message sending to Extension
 *
 * @module webview/main
 *
 * Design References:
 * - DES-A-002: Extension-Webview communication architecture
 * - DES-A-004: CodeMirror 6 editor design
 * - DES-F-003: Webview file responsibilities
 *
 * Requirements:
 * - REQ-F-002: Webview initialization
 * - REQ-F-003: File loading and CodeMirror display
 * - REQ-F-008: Dark/Light theme support
 * - REQ-F-010: Image display
 */

import { CodeMirrorEditor } from './codemirror/editor.js';
import { switchTheme } from './codemirror/extensions/theme.js';
import { setDocumentBaseUri } from './codemirror/extensions/livePreview/index.js';
import {
    setMermaidTheme,
    setPostMessage,
    tableCellSelections,
    tableDataCache,
} from './codemirror/extensions/livePreview/state.js';
import { WebviewMessageSender, WebviewMessageHandler } from './messageHandler.js';
import { WebviewThemeManager } from './theme.js';
import { OutlinePanel } from './outlinePanel.js';
import { EditorContextMenu, type EditorMode } from './editorContextMenu.js';
import {
    setupImageDropHandler,
    createImagePasteHandler,
    handleImageSaved,
    handleImageSaveError,
} from './imageDropHandler.js';
import type { ThemeType, FlowMdEditorSettings } from '../shared/types.js';
import { MESSAGE_TYPES } from '../shared/messageTypes.js';

// =============================================================================
// Type Declarations for VS Code Webview API
// =============================================================================

/**
 * VS Code API interface as available in Webview context.
 * Declared globally by VS Code when running in Webview.
 *
 * Note: Interface name does not follow "I" prefix convention as it mirrors
 * the actual VS Code API interface naming.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
interface IVsCodeApi {
    /**
     * Send a message to the Extension host
     * @param message - The message to send
     */
    postMessage(message: unknown): void;

    /**
     * Get the persisted state for this Webview
     * @returns The persisted state or undefined
     */
    getState(): unknown;

    /**
     * Set the persisted state for this Webview
     * @param state - The state to persist
     */
    setState(state: unknown): void;
}

/**
 * Global function provided by VS Code to acquire the VS Code API.
 * Must be called exactly once per Webview.
 */
declare function acquireVsCodeApi(): IVsCodeApi;

// =============================================================================
// VS Code API Acquisition
// =============================================================================

/**
 * The VS Code API instance.
 * Acquired once at module load and stored for reuse.
 */
const vscode: IVsCodeApi = acquireVsCodeApi();

// Register postMessage for clipboard operations in widgets
setPostMessage((message: unknown) => vscode.postMessage(message));

// =============================================================================
// Console Log Forwarding
// =============================================================================

/**
 * Hook console.debug/error/warn to forward [FlowMD] prefixed logs
 * to Extension via postMessage for Output Channel output.
 * This captures debug logs from livePreview.ts and other modules
 * without requiring explicit sendLog() calls.
 */
const _origDebug = console.debug;
const _origError = console.error;
const _origWarn = console.warn;

function forwardLog(level: 'DEBUG' | 'ERROR' | 'WARN', args: unknown[]): void {
    const msg = args
        .map((a) => (typeof a === 'object' ? JSON.stringify(a, null, 0) : String(a)))
        .join(' ');
    if (msg.includes('[FlowMD]')) {
        vscode.postMessage({ type: 'webviewLog', level, msg });
    }
}

console.debug = (...args: unknown[]) => {
    _origDebug.apply(console, args);
    forwardLog('DEBUG', args);
};
console.error = (...args: unknown[]) => {
    _origError.apply(console, args);
    forwardLog('ERROR', args);
};
console.warn = (...args: unknown[]) => {
    _origWarn.apply(console, args);
    forwardLog('WARN', args);
};

/**
 * The WebviewMessageSender instance for sending messages to Extension.
 */
const messageSender: WebviewMessageSender = new WebviewMessageSender(vscode);

/**
 * Debounced content change sender (300ms default).
 */
const debouncedSendContentChange = messageSender.createDebouncedSendContentChange();

/**
 * The CodeMirrorEditor instance.
 * Created when the INIT message is received.
 */
let editor: CodeMirrorEditor | null = null;

/**
 * 当前编辑器模式，用于正文右键菜单的禁用态同步。
 */
let currentEditorMode: EditorMode = 'live';

/**
 * The WebviewThemeManager instance.
 * Created during initialization, defaults to dark theme.
 */
let themeManager: WebviewThemeManager | null = null;

/**
 * Markdown 正文右键菜单实例。
 */
let editorContextMenu: EditorContextMenu | null = null;

/**
 * 右侧大纲管理器实例。
 * 负责布局、标题树渲染、分隔条拖拽与跳转交互。
 */
let outlinePanel: OutlinePanel | null = null;

/**
 * Current document URI for image path resolution.
 * Note: Used by imageHandler integration for local image URL transformation.
 */
let currentDocumentUri: string = '';

// =============================================================================
// Export Functions for Testing
// =============================================================================

/**
 * Get the current document URI.
 * Exported for imageHandler to use for local image path resolution.
 *
 * @returns The current document URI
 */
export function getCurrentDocumentUri(): string {
    return currentDocumentUri;
}

/**
 * Get the VS Code API instance.
 * Exported for testing purposes.
 *
 * @returns The VS Code API instance
 */
export function getVsCodeApi(): IVsCodeApi {
    return vscode;
}

/**
 * Get the CodeMirrorEditor instance.
 * Exported for testing purposes.
 *
 * @returns The CodeMirrorEditor instance or null if not created
 */
export function getEditor(): CodeMirrorEditor | null {
    return editor;
}

/**
 * Get the WebviewThemeManager instance.
 * Exported for testing purposes.
 *
 * @returns The WebviewThemeManager instance or null if not created
 */
export function getThemeManager(): WebviewThemeManager | null {
    return themeManager;
}

/**
 * 获取或创建编辑器宿主容器。
 *
 * @returns 编辑器宿主 DOM 节点。
 */
function getOrCreateEditorHost(): HTMLElement {
    let container = document.getElementById('editor');
    if (!container) {
        container = document.createElement('div');
        container.id = 'editor';
        document.body.appendChild(container);
    }
    return container;
}

/**
 * 获取右侧大纲面板的初始宽度。
 *
 * 优先读取 HTML 注入的 CSS 变量，这样页面首次渲染时就能直接使用
 * 扩展端保存的宽度；如果读取失败，则回退到默认值。
 *
 * @returns 右侧大纲面板初始宽度，单位像素
 */
function getInitialOutlineWidth(): number {
    const rawWidth = getComputedStyle(document.documentElement).getPropertyValue(
        '--flowmd-outline-width'
    );
    const parsedWidth = Number.parseFloat(rawWidth);
    if (!Number.isFinite(parsedWidth) || parsedWidth <= 0) {
        return 280;
    }
    return Math.round(parsedWidth);
}

// =============================================================================
// Logging
// =============================================================================

/**
 * Send log message to Extension for file logging.
 *
 * @param level - Log level (DEBUG, INFO, ERROR)
 * @param msg - Log message
 */
function sendLog(level: 'DEBUG' | 'INFO' | 'ERROR', msg: string): void {
    vscode.postMessage({ type: 'webviewLog', level, msg });
    // Also log to console
    if (level === 'ERROR') {
        console.error(`[FlowMD Webview] ${msg}`);
    } else if (level === 'DEBUG') {
        console.debug(`[FlowMD Webview] ${msg}`);
    } else {
        console.log(`[FlowMD Webview] ${msg}`);
    }
}

// Expose log function globally for plugins
(window as unknown as { flowmdLog: typeof sendLog }).flowmdLog = sendLog;

// Expose vscode API globally for livePreview link handling
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).__vscodeApi = vscode;

// =============================================================================
// Message Handler Callbacks
// =============================================================================

/**
 * Handle INIT message from Extension.
 * Sets up the CodeMirror editor with initial content and theme.
 *
 * @param content - The initial markdown content
 * @param theme - The initial theme setting
 * @param documentUri - The document URI for image path resolution
 *
 * Design Reference: DES-A-004, DES-API-003
 */
async function handleInit(
    content: string,
    theme: ThemeType,
    documentUri: string,
    settings?: FlowMdEditorSettings,
    mode?: 'live' | 'viewer' | 'source',
    outlineWidth?: number
): Promise<void> {
    sendLog('INFO', `INIT received: contentLength=${content.length}, theme=${theme}`);

    try {
        // Store document URI for image path resolution
        currentDocumentUri = documentUri;

        // Make sure the right-side outline starts at the saved width.
        if (Number.isFinite(outlineWidth ?? NaN)) {
            outlinePanel?.setWidth(outlineWidth as number);
        }

        // Get or create the editor container
        const container = getOrCreateEditorHost();

        // Destroy existing editor if any
        if (editor) {
            editor.destroy();
            editor = null;
        }

        // Create new CodeMirror editor
        editor = new CodeMirrorEditor(container);
        editor.setFontScaleChangeHandler((fontScale: number) => {
            messageSender.sendFontScaleChange(fontScale);
        });

        // Initialize the editor with content
        await editor.create(content);
        currentEditorMode = mode ?? 'live';
        editorContextMenu?.attach(editor.getView()?.contentDOM ?? null);

        // Register change callback to send updates to Extension (debounced)
        editor.onChange((newContent: string) => {
            outlinePanel?.setContent(newContent);
            debouncedSendContentChange(newContent);
        });

        // Keep the outline aligned with the freshly loaded Markdown document
        outlinePanel?.setContent(content);
        if (Number.isFinite(outlineWidth ?? NaN)) {
            outlinePanel?.setWidth(outlineWidth as number);
        }

        // Apply initial theme using ThemeManager (for CSS classes)
        if (!themeManager) {
            themeManager = new WebviewThemeManager(theme);
        } else {
            themeManager.setTheme(theme);
        }

        // Apply theme to CodeMirror editor and Mermaid
        setMermaidTheme(theme);
        if (editor.isReady()) {
            const view = (editor as unknown as { view: { dispatch: (tr: unknown) => void } }).view;
            if (view) {
                switchTheme(view as Parameters<typeof switchTheme>[0], theme);
            }
        }

        // Set up image drag & drop handler (document.body level)
        setupImageDropHandler(
            () => editor?.getView() ?? null,
            (msg) => vscode.postMessage(msg)
        );

        // Set up image paste handler via CM6 domEventHandlers
        const pasteHandler = createImagePasteHandler((msg) => vscode.postMessage(msg));
        editor.setPasteHandler(pasteHandler);

        // Apply editor settings (word wrap, readable line length)
        if (settings) {
            editor.applySettings(settings);
            sendLog(
                'INFO',
                `Settings applied: lineNumbers=${settings.lineNumbers}, wordWrap=${settings.wordWrap}, readableLineLength=${settings.readableLineLength}, fontScale=${settings.fontScale}`
            );
        }

        // Apply default editor mode
        if (mode && mode !== 'live') {
            editor.setMode(mode);
            currentEditorMode = mode;
            sendLog('INFO', `Default editor mode applied: ${mode}`);
        }

        sendLog('INFO', 'CodeMirror editor initialized successfully');
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        sendLog('ERROR', `Editor initialization failed: ${errorMessage}`);
        messageSender.sendError(errorMessage, errorStack, 'EDITOR_INIT_ERROR');
    }
}

/**
 * Handle UPDATE message from Extension.
 * Updates the editor content when external changes occur.
 *
 * @param content - The updated markdown content
 *
 * Design Reference: DES-API-003
 */
function handleUpdate(content: string): void {
    sendLog('DEBUG', `UPDATE received: contentLength=${content.length}`);
    console.debug(
        `[FlowMD] handleUpdate: contentLen=${content.length} editorReady=${editor?.isReady()}`
    );

    if (!editor || !editor.isReady()) {
        sendLog('ERROR', 'Cannot update: editor not ready');
        return;
    }

    try {
        console.debug(`[FlowMD] handleUpdate: calling setContent...`);
        // setContent() does NOT trigger onChange (feedback loop prevention)
        editor.setContent(content);
        outlinePanel?.setContent(content);
        sendLog('DEBUG', 'UPDATE applied successfully');
        console.debug(`[FlowMD] handleUpdate: setContent completed`);
        // Stop reload spinner if it was active
        document.getElementById('reload-content')?.classList.remove('spinning');
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        sendLog('ERROR', `Update failed: ${errorMessage}`);
        messageSender.sendError(errorMessage, errorStack, 'SYNC_ERROR');
    }
}

/**
 * Handle THEME_CHANGE message from Extension.
 * Updates the editor theme to match VS Code theme.
 *
 * @param theme - The new theme setting
 *
 * Design Reference: DES-A-006
 * Requirements: REQ-F-008
 */
function handleThemeChange(theme: ThemeType): void {
    sendLog('DEBUG', `THEME_CHANGE received: theme=${theme}`);

    try {
        // Apply theme change using ThemeManager (for CSS classes)
        if (themeManager) {
            themeManager.setTheme(theme);
        } else {
            themeManager = new WebviewThemeManager(theme);
        }

        // Apply theme to CodeMirror editor and Mermaid
        setMermaidTheme(theme);
        if (editor && editor.isReady()) {
            const view = (editor as unknown as { view: { dispatch: (tr: unknown) => void } }).view;
            if (view) {
                switchTheme(view as Parameters<typeof switchTheme>[0], theme);
            }
        }

        sendLog('DEBUG', 'Theme applied successfully');
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        sendLog('ERROR', `Theme change failed: ${errorMessage}`);
    }
}

// =============================================================================
// Initialization
// =============================================================================

/**
 * Initialize the Webview when DOM is ready.
 *
 * This function:
 * 1. Sets up the WebviewMessageHandler with callbacks
 * 2. Sets up focus event listener to handle external focus restoration
 * 3. Sends the READY message to the Extension
 *
 * Design Reference: DES-A-002
 */
function initialize(): void {
    sendLog('INFO', 'Webview initializing...');

    // 右侧大纲面板直接复用 HTML 里准备好的壳子，只负责渲染和交互。
    const panelEl = document.getElementById('outline-pane');
    const contentEl = document.getElementById('outline-content');
    const resizerEl = document.getElementById('outline-resizer');
    if (panelEl && contentEl && resizerEl) {
        outlinePanel = new OutlinePanel(panelEl, contentEl, resizerEl, {
            initialWidth: getInitialOutlineWidth(),
            onWidthChange: (width: number) => {
                vscode.postMessage({
                    type: MESSAGE_TYPES.OUTLINE_WIDTH_CHANGE,
                    width,
                });
            },
            onNavigateToLine: (line: number) => {
                editor?.scrollToLine(line);
            },
        });
    } else {
        sendLog('ERROR', 'Outline panel DOM is missing, right-side outline is unavailable');
    }

    // Markdown 正文右键菜单只绑定到编辑器正文容器，不覆盖大纲和其它 UI。
    editorContextMenu = new EditorContextMenu({
        getCurrentMode: () => currentEditorMode,
        onInsertImage: () => messageSender.sendEditorAction('insertImage'),
        onChangeMode: (mode: EditorMode) => messageSender.sendEditorAction('setMode', mode),
        onExportAsHtml: () => messageSender.sendEditorAction('exportAsHtml'),
        onToggleOutline: () => outlinePanel?.toggleVisible(),
        isOutlineVisible: () => outlinePanel?.isOutlineVisible() ?? true,
    });

    // Capture documentBaseUri and handle viewerMode from raw messages
    window.addEventListener('message', (event: MessageEvent) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const msg = event.data as any;
        if (msg && msg.type === 'init') {
            if (msg.documentBaseUri) {
                setDocumentBaseUri(msg.documentBaseUri);
                sendLog('DEBUG', `documentBaseUri set: ${msg.documentBaseUri}`);
            }
            if (msg.settings && editor && editor.isReady()) {
                editor.applySettings(msg.settings);
            }
        }
        if (msg && msg.type === 'viewerMode') {
            if (editor && editor.isReady()) {
                editor.setEditable(!msg.readOnly);
                sendLog('INFO', `Viewer mode: ${msg.readOnly ? 'ON' : 'OFF'}`);
            }
            if (msg.readOnly) {
                currentEditorMode = 'viewer';
            } else if (currentEditorMode === 'viewer') {
                currentEditorMode = 'live';
            }
        }
        if (msg && msg.type === 'editorMode') {
            if (editor && editor.isReady()) {
                editor.setMode(msg.mode);
                sendLog('INFO', `Editor mode: ${msg.mode}`);
            }
            currentEditorMode = msg.mode;
        }
        if (msg && msg.type === 'settingsChange') {
            if (editor && editor.isReady() && msg.settings) {
                editor.applySettings(msg.settings);
                sendLog(
                    'INFO',
                    `Settings updated: lineNumbers=${msg.settings.lineNumbers}, wordWrap=${msg.settings.wordWrap}, readableLineLength=${msg.settings.readableLineLength}, fontScale=${msg.settings.fontScale}`
                );
            }
        }
        if (msg && msg.type === 'executeCommand') {
            if (editor && editor.isReady() && msg.command) {
                editor.executeCommand(msg.command);
            }
        }
        if (msg && msg.type === 'imageSaved') {
            handleImageSaved(msg, () => editor?.getView() ?? null);
        }
        if (msg && msg.type === 'imageSaveError') {
            handleImageSaveError(msg, (m) => vscode.postMessage(m));
        }
    });

    // Set up message handler with CodeMirror integration callbacks
    const messageHandler = new WebviewMessageHandler({
        onInit: (
            content: string,
            theme: ThemeType,
            documentUri: string,
            settings?: FlowMdEditorSettings,
            mode?: 'live' | 'viewer' | 'source',
            outlineWidth?: number
        ): void => {
            void handleInit(content, theme, documentUri, settings, mode, outlineWidth);
        },
        onUpdate: handleUpdate,
        onThemeChange: handleThemeChange,
    });

    // Register message listener
    messageHandler.setup();

    // Set up focus listener to restore editor focus when webview receives focus
    // This fixes the issue where clicking on webview from outside (e.g., desktop)
    // doesn't properly focus the CodeMirror editor
    //
    // IMPORTANT: Check for search panel existence in DOM (not activeElement)
    // because focus events fire BEFORE activeElement updates, causing a race
    // condition that closes the search panel immediately after opening.
    window.addEventListener('focus', () => {
        sendLog('DEBUG', 'Window focus event received');
        // Don't steal focus if search/replace panel is open in DOM
        if (document.querySelector('.cm-search')) {
            sendLog('DEBUG', 'Search panel is open, skipping editor focus');
            return;
        }
        if (editor && editor.isReady()) {
            editor.focus();
            sendLog('DEBUG', 'Editor focus restored');
        }
    });

    // Also handle click on the editor container to ensure focus
    document.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;
        // Don't steal focus from search/replace panel
        if (target.closest('.cm-search') || document.querySelector('.cm-search')) return;
        const editorContainer = document.getElementById('editor');
        if (editorContainer && editorContainer.contains(target)) {
            if (editor && editor.isReady()) {
                // Small delay to let CodeMirror handle the click first
                setTimeout(() => {
                    if (document.querySelector('.cm-search')) return;
                    editor?.focus();
                }, 10);
            }
        }
    });

    // Reload content button
    const reloadBtn = document.getElementById('reload-content');
    if (reloadBtn) {
        reloadBtn.addEventListener('click', () => {
            reloadBtn.classList.add('spinning');
            vscode.postMessage({ type: 'reloadContent' });
            // Auto-stop spinner after 3s as safety net
            setTimeout(() => reloadBtn.classList.remove('spinning'), 3000);
        });
    }

    // Scroll jump buttons
    const scrollTopBtn = document.getElementById('scroll-top');
    const scrollBottomBtn = document.getElementById('scroll-bottom');
    if (scrollTopBtn) {
        scrollTopBtn.addEventListener('click', () => {
            const scroller = document.querySelector('.cm-scroller');
            if (scroller) {
                scroller.scrollTo({ top: 0, behavior: 'instant' });
            }
        });
    }
    if (scrollBottomBtn) {
        scrollBottomBtn.addEventListener('click', () => {
            const scroller = document.querySelector('.cm-scroller');
            if (scroller) {
                scroller.scrollTo({ top: scroller.scrollHeight, behavior: 'instant' });
            }
        });
    }

    // =========================================================================
    // Global Table Cell Copy Handler (capture phase)
    // =========================================================================
    // Registered at document level with capture=true to intercept Ctrl+C
    // BEFORE CM6's own handlers fire. This is necessary because:
    // - In Viewer mode (contenteditable=false), CM6's contentDOM can't receive
    //   focus, so CM6's domEventHandlers keydown never fires.
    // - In Live Preview mode, table mousedown calls stopPropagation(), which
    //   can leave CM6 without proper keyboard event routing.
    document.addEventListener(
        'keydown',
        (event: KeyboardEvent) => {
            if (!((event.ctrlKey || event.metaKey) && event.key === 'c' && !event.shiftKey)) return;

            // Don't intercept if focus is in search panel or other input
            const active = document.activeElement;
            if (active?.closest('.cm-search')) return;
            if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) return;

            if (tableCellSelections.size === 0) return;

            const entry = tableCellSelections.entries().next();
            if (entry.done) return;
            const [tableFrom, sel] = entry.value;

            const data = tableDataCache.get(tableFrom);
            if (!data) return;

            const minRow = Math.min(sel.startRow, sel.endRow);
            const maxRow = Math.max(sel.startRow, sel.endRow);
            const minCol = Math.min(sel.startCol, sel.endCol);
            const maxCol = Math.max(sel.startCol, sel.endCol);

            const rows: string[][] = [];
            for (let r = minRow; r <= maxRow; r++) {
                let cells: string[];
                if (r === 0) {
                    cells = data.headers;
                } else {
                    const dataIdx = r - 1;
                    if (dataIdx >= data.rows.length) continue;
                    cells = data.rows[dataIdx];
                }
                const selected = cells.slice(minCol, maxCol + 1).map((c) => c.trim());
                rows.push(selected);
            }
            if (rows.length === 0) return;

            // Build Markdown table format (Obsidian-compatible pipe-delimited)
            const lines: string[] = [];
            rows.forEach((row, i) => {
                lines.push('| ' + row.join(' | ') + ' |');
                // Insert delimiter row after header (row 0)
                if (minRow === 0 && i === 0) {
                    const delims = row.map((_, ci) => {
                        const align = data.alignments[minCol + ci];
                        if (align === 'center') return ':---:';
                        if (align === 'right') return '---:';
                        if (align === 'left') return ':---';
                        return '---';
                    });
                    lines.push('| ' + delims.join(' | ') + ' |');
                }
            });
            const text = lines.join('\n');

            // Write to clipboard via Extension's vscode.env.clipboard API
            // (most reliable method in VS Code webview — not subject to iframe restrictions)
            event.preventDefault();
            event.stopPropagation();
            vscode.postMessage({ type: 'copyToClipboard', text });
            console.debug(
                `[FlowMD] table cell copy: ${rows.length} rows, ${rows[0]?.length ?? 0} cols`
            );
        },
        true
    ); // capture phase - fires before CM6 handlers

    // Notify Extension that Webview is ready to receive messages
    messageSender.sendReady();

    sendLog('INFO', 'READY message sent to extension');
}

// Register DOMContentLoaded listener
document.addEventListener('DOMContentLoaded', initialize);
