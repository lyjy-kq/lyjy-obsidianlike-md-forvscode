/**
 * Live Preview Extension Entry
 *
 * This module provides a stable import surface for the live preview
 * CodeMirror extension group. It re-exports the public API used by the
 * webview editor entry points so build and runtime imports stay simple.
 */

export { createLivePreviewExtension } from './plugin.js';
export { getDocumentBaseUri, setDocumentBaseUri } from './state.js';

