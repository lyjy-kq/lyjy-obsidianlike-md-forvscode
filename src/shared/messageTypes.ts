/**
 * FlowMD Message Type Constants
 *
 * This module defines constant values for all message types used in
 * Extension-Webview communication via postMessage.
 *
 * The constants are defined using 'as const' to ensure:
 * 1. Type narrowing in switch statements
 * 2. Immutability at compile time
 * 3. Exact string literal types
 *
 * @module shared/messageTypes
 *
 * Design Reference: DES-API-001
 *
 * Requirements:
 * - REQ-F-003: File loading and CodeMirror display
 * - REQ-F-004: CodeMirror edit content file save
 * - REQ-F-005: Bidirectional sync with VS Code editor
 * - REQ-F-008: Dark/Light theme support
 */

/**
 * Message type constants for Extension-Webview communication.
 *
 * These values correspond to the 'type' field of message interfaces
 * defined in types.ts:
 * - INIT -> InitMessage.type = 'init'
 * - UPDATE -> UpdateMessage.type = 'update'
 * - THEME_CHANGE -> ThemeChangeMessage.type = 'themeChange'
 * - CONTENT_CHANGE -> ContentChangeMessage.type = 'contentChange'
 * - READY -> ReadyMessage.type = 'ready'
 * - ERROR -> ErrorMessage.type = 'error'
 *
 * @example
 * ```typescript
 * import { MESSAGE_TYPES } from './messageTypes';
 *
 * // In Extension code
 * webview.postMessage({
 *     type: MESSAGE_TYPES.INIT,
 *     content: documentContent,
 *     theme: 'dark',
 *     documentUri: document.uri.toString()
 * });
 *
 * // In Webview code - handling messages
 * switch (message.type) {
 *     case MESSAGE_TYPES.INIT:
 *         handleInit(message);
 *         break;
 *     case MESSAGE_TYPES.UPDATE:
 *         handleUpdate(message);
 *         break;
 *     case MESSAGE_TYPES.THEME_CHANGE:
 *         handleThemeChange(message);
 *         break;
 * }
 * ```
 */
export const MESSAGE_TYPES = {
    // =========================================================================
    // Extension -> Webview Message Types
    // =========================================================================

    /**
     * Initialization message type.
     * Sent when the editor starts with document content and initial theme.
     */
    INIT: 'init',

    /**
     * Update message type.
     * Sent when document content changes externally (e.g., from VS Code text editor).
     */
    UPDATE: 'update',

    /**
     * Theme change message type.
     * Sent when VS Code's color theme changes.
     */
    THEME_CHANGE: 'themeChange',

    // =========================================================================
    // Webview -> Extension Message Types
    // =========================================================================

    /**
     * Content change message type.
     * Sent when user edits content in the CodeMirror editor.
     */
    CONTENT_CHANGE: 'contentChange',

    /**
     * Ready message type.
     * Sent when Webview initialization is complete.
     */
    READY: 'ready',

    /**
     * Error message type.
     * Sent when an error occurs in the Webview.
     */
    ERROR: 'error',

    // =========================================================================
    // Extension -> Webview Message Types (Extended)
    // =========================================================================

    /**
     * Editor mode change message type.
     * Sent when user cycles between live/viewer/source modes.
     * Payload: { mode: 'live' | 'viewer' | 'source' }
     */
    EDITOR_MODE: 'editorMode',

    /**
     * Settings change message type.
     * Sent when FlowMD editor settings change (word wrap, readable line length).
     * Payload: { settings: FlowMdEditorSettings }
     */
    SETTINGS_CHANGE: 'settingsChange',

    /**
     * Execute command message type.
     * Sent to trigger editor commands (find, replace, etc.) from extension keybindings.
     * Payload: { command: string }
     */
    EXECUTE_COMMAND: 'executeCommand',

    // =========================================================================
    // Webview -> Extension Message Types (Extended)
    // =========================================================================

    /**
     * Reload content message type.
     * Sent when user clicks the reload button to re-read file from disk.
     */
    RELOAD_CONTENT: 'reloadContent',

    // =========================================================================
    // Image Save Message Types (Phase 03A)
    // =========================================================================

    /**
     * Save image request message type.
     * Sent from Webview to Extension when user drops or pastes an image.
     */
    SAVE_IMAGE: 'saveImage',

    /**
     * Image saved success response message type.
     * Sent from Extension to Webview after successfully saving an image file.
     */
    IMAGE_SAVED: 'imageSaved',

    /**
     * Image save error response message type.
     * Sent from Extension to Webview when image saving fails.
     */
    IMAGE_SAVE_ERROR: 'imageSaveError',
} as const;

/**
 * Type for message type values.
 * This allows type-safe access to MESSAGE_TYPES values.
 */
export type MessageType = (typeof MESSAGE_TYPES)[keyof typeof MESSAGE_TYPES];
