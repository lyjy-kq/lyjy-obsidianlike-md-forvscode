/**
 * FlowMD Shared Type Definitions
 *
 * This module contains all shared type definitions for Extension-Webview communication,
 * editor state management, and extension configuration.
 *
 * @module shared/types
 *
 * Design References:
 * - DES-D-001: postMessage message type definitions
 * - DES-D-002: Extension -> Webview message definitions
 * - DES-D-003: Webview -> Extension message definitions
 * - DES-D-004: Editor state type definitions
 * - DES-D-005: Configuration type definitions
 *
 * Requirements:
 * - REQ-F-001: CustomTextEditorProvider implementation
 * - REQ-F-003: File loading and CodeMirror display
 * - REQ-F-004: CodeMirror edit content file save
 * - REQ-F-005: Bidirectional sync with VS Code editor
 * - REQ-F-008: Dark/Light theme support
 * - REQ-F-009: Large file warning display
 * - REQ-NF-001: Performance requirements
 */

// =============================================================================
// DES-D-001: Base Message Type Definition
// =============================================================================

/**
 * Base interface for all messages exchanged between Extension and Webview.
 * All message types must extend this interface.
 */
export interface BaseMessage {
    /** Message type identifier */
    type: string;
}

// =============================================================================
// Editor Settings (Extension -> Webview)
// =============================================================================

/**
 * Editor settings sent from Extension to Webview.
 * Controls word wrap and readable line length.
 */
export interface FlowMdEditorSettings {
    /** Show line numbers */
    lineNumbers: boolean;
    /** Enable word wrapping for long lines */
    wordWrap: boolean;
    /** Max content width in px (0 = unlimited) */
    readableLineLength: number;
}

// =============================================================================
// DES-D-002: Extension -> Webview Message Definitions
// =============================================================================

/**
 * Theme type definition
 */
export type ThemeType = 'light' | 'dark';

/**
 * Initialization message sent when the editor starts.
 * Contains the document content, initial theme, and document URI for image path resolution.
 */
export interface InitMessage extends BaseMessage {
    /** Message type identifier */
    type: 'init';
    /** Markdown content of the document */
    content: string;
    /** Initial theme setting */
    theme: ThemeType;
    /** Document URI for resolving relative image paths */
    documentUri: string;
    /** Editor settings (word wrap, readable line length) */
    settings?: FlowMdEditorSettings;
}

/**
 * Update message sent when document content changes externally.
 * Used to sync changes made outside the Webview (e.g., from VS Code text editor).
 */
export interface UpdateMessage extends BaseMessage {
    /** Message type identifier */
    type: 'update';
    /** Updated Markdown content */
    content: string;
}

/**
 * Theme change message sent when VS Code theme changes.
 * Allows the Webview to adapt its appearance to match VS Code.
 */
export interface ThemeChangeMessage extends BaseMessage {
    /** Message type identifier */
    type: 'themeChange';
    /** New theme setting */
    theme: ThemeType;
}

/**
 * Union type for all messages from Extension to Webview.
 * Use this type when receiving messages in the Webview.
 */
export type ExtensionToWebviewMessage =
    | InitMessage
    | UpdateMessage
    | ThemeChangeMessage
    | ImageSavedMessage
    | ImageSaveErrorMessage;

// =============================================================================
// DES-D-003: Webview -> Extension Message Definitions
// =============================================================================

/**
 * Content change message sent when user edits content in CodeMirror.
 * The Extension will apply these changes to the TextDocument.
 */
export interface ContentChangeMessage extends BaseMessage {
    /** Message type identifier */
    type: 'contentChange';
    /** Updated Markdown content from editor */
    content: string;
}

/**
 * Ready message sent when Webview initialization is complete.
 * The Extension waits for this message before sending content updates.
 */
export interface ReadyMessage extends BaseMessage {
    /** Message type identifier */
    type: 'ready';
}

/**
 * Error message sent when an error occurs in the Webview.
 * Allows the Extension to display error messages to the user.
 */
export interface ErrorMessage extends BaseMessage {
    /** Message type identifier */
    type: 'error';
    /** Error description */
    message: string;
    /** Optional error code for categorizing errors (e.g., 'EDITOR_INIT_ERROR', 'SYNC_ERROR') */
    code?: string;
    /** Optional stack trace for debugging */
    stack?: string;
}

/**
 * Union type for all messages from Webview to Extension.
 * Use this type when receiving messages in the Extension.
 */
export type WebviewToExtensionMessage =
    | ContentChangeMessage
    | ReadyMessage
    | ErrorMessage
    | SaveImageMessage;

// =============================================================================
// DES-D-001: Image Save Message Types (Phase 03A)
// =============================================================================

/**
 * Image save request message sent from Webview to Extension.
 * Sent when user drops or pastes an image into the editor.
 *
 * Requirements:
 * - REQ-3A-001: Image drag & drop
 * - REQ-3A-002: Clipboard image paste
 */
export interface SaveImageMessage extends BaseMessage {
    /** Message type identifier */
    type: 'saveImage';
    /** Base64-encoded image data (data:image/xxx;base64,... format) */
    data: string;
    /** Original file name (D&D) or timestamp-based name (paste) */
    fileName: string;
}

/**
 * Image saved success response message sent from Extension to Webview.
 * Contains the relative path to use in Markdown image syntax.
 *
 * Requirements:
 * - REQ-3A-001: Image drag & drop
 * - REQ-3A-002: Clipboard image paste
 */
export interface ImageSavedMessage extends BaseMessage {
    /** Message type identifier */
    type: 'imageSaved';
    /** Relative path from .md file (e.g., 'images/screenshot.png') */
    relativePath: string;
    /** Final saved file name (may include sequence number) */
    fileName: string;
}

/**
 * Image save error response message sent from Extension to Webview.
 * Sent when image saving fails due to write errors, validation failures, etc.
 *
 * Requirements:
 * - REQ-3A-001: Image drag & drop
 * - REQ-3A-002: Clipboard image paste
 */
export interface ImageSaveErrorMessage extends BaseMessage {
    /** Message type identifier */
    type: 'imageSaveError';
    /** Error description */
    error: string;
}

// =============================================================================
// DES-D-004: Editor State Type Definitions
// =============================================================================

/**
 * Update source identifier.
 * Used to track whether the last update came from the Extension or Webview.
 */
export type UpdateSource = 'extension' | 'webview' | null;

/**
 * Editor state interface.
 * Tracks the current state of the editor including readiness, dirty flag,
 * and content synchronization status.
 *
 * Requirements:
 * - REQ-F-001: CustomTextEditorProvider implementation
 * - REQ-F-005: Bidirectional sync with VS Code editor
 */
export interface EditorState {
    /** Indicates whether the Webview has completed initialization */
    isReady: boolean;
    /** Indicates whether there are unsaved changes */
    isDirty: boolean;
    /** The content that was last synchronized between Extension and Webview */
    lastSyncedContent: string;
    /** Content waiting to be applied (null if no pending update) */
    pendingUpdate: string | null;
}

/**
 * Synchronization state interface.
 * Manages the state of bidirectional synchronization to prevent update loops
 * and race conditions.
 *
 * Requirements:
 * - REQ-F-005: Bidirectional sync with VS Code editor
 */
export interface SyncState {
    /** True when Extension is actively sending updates to Webview */
    isExtensionUpdating: boolean;
    /** True when Webview is actively sending updates to Extension */
    isWebviewUpdating: boolean;
    /** The source of the most recent update (for conflict resolution) */
    lastUpdateSource: UpdateSource;
}

// =============================================================================
// DES-D-005: Configuration Type Definitions
// =============================================================================

/**
 * FlowMD extension configuration interface.
 * Contains all configurable settings for the extension.
 *
 * Requirements:
 * - REQ-F-009: Large file warning display
 * - REQ-NF-001: Performance requirements
 */
export interface FlowMdConfiguration {
    /** Large file warning threshold in bytes (default: 1MB) */
    largeFileThreshold: number;
    /** Debounce delay for content synchronization in milliseconds (default: 300ms) */
    debounceDelay: number;
    /** Enable debug mode for verbose logging */
    debug: boolean;
}

/**
 * Default configuration values for FlowMD.
 * These values are used when no user configuration is provided.
 */
export const DEFAULT_CONFIG: FlowMdConfiguration = {
    /** 1MB threshold for large file warning */
    largeFileThreshold: 1 * 1024 * 1024,
    /** 300ms debounce delay for content sync */
    debounceDelay: 300,
    /** Debug mode disabled by default */
    debug: false,
};
