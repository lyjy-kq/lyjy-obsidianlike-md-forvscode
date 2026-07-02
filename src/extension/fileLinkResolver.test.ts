/**
 * 文件路径解析器测试。
 *
 * 该文件覆盖扩展侧对路径文本的最终解析顺序，包括当前文档目录解析、
 * workspace 根目录回退以及行号范围透传。
 */

import { describe, expect, it } from 'vitest';

import { resolveFileLinkTarget } from './fileLinkResolver.js';

describe('resolveFileLinkTarget', () => {
    it('当前文档目录不存在目标时回退到 workspace 根目录', () => {
        const result = resolveFileLinkTarget(
            'src\\webview\\codemirror\\extensions\\livePreview\\decorations.ts:22',
            'C:\\repo\\src\\docs\\sss.md',
            ['C:\\repo'],
            (candidate) =>
                candidate ===
                'C:\\repo\\src\\webview\\codemirror\\extensions\\livePreview\\decorations.ts'
        );

        expect(result.filePath).toBe(
            'C:\\repo\\src\\webview\\codemirror\\extensions\\livePreview\\decorations.ts'
        );
        expect(result.selection).toEqual({
            startLine: 22,
            startColumn: 1,
            endLine: 22,
            endColumn: 1,
        });
    });

    it('目标不存在时保持当前文档目录解析结果', () => {
        const result = resolveFileLinkTarget(
            'notes\\todo.md:7',
            'C:\\repo\\src\\docs\\sss.md',
            ['C:\\repo'],
            () => false
        );

        expect(result.filePath).toBe('C:\\repo\\notes\\todo.md');
        expect(result.selection?.startLine).toBe(7);
    });

    it('绝对路径保留原始文件路径并解析行范围', () => {
        const result = resolveFileLinkTarget(
            'C:\\repo\\src\\webview\\codemirror\\extensions\\livePreview\\decorations.ts:21-33',
            'C:\\repo\\src\\docs\\sss.md',
            ['C:\\repo'],
            (candidate) =>
                candidate ===
                'C:\\repo\\src\\webview\\codemirror\\extensions\\livePreview\\decorations.ts'
        );

        expect(result.filePath).toBe(
            'C:\\repo\\src\\webview\\codemirror\\extensions\\livePreview\\decorations.ts'
        );
        expect(result.selection).toEqual({
            startLine: 21,
            startColumn: 1,
            endLine: 33,
            endColumn: 1,
        });
    });
});
