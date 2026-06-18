/**
 * FlowMD 右侧大纲面板控制器。
 *
 * 该模块只负责在既有 Webview 壳子中渲染 Markdown 标题树，
 * 处理折叠和展开、标题跳转、宽度拖拽，不再自行创建页面布局。
 */

/**
 * 大纲节点数据结构。
 */
interface OutlineNode {
    /** 节点唯一标识，用于折叠状态稳定保存。 */
    id: string;
    /** 标题层级，范围为 1 到 6。 */
    level: number;
    /** 标题文本。 */
    text: string;
    /** 标题所在行号，从 1 开始。 */
    line: number;
    /** 子标题节点列表。 */
    children: OutlineNode[];
}

/**
 * 右侧大纲面板初始化参数。
 */
export interface OutlinePanelOptions {
    /** 初始宽度，单位像素。 */
    initialWidth: number;
    /** 宽度变化后的回调，用于扩展端持久化。 */
    onWidthChange: (width: number) => void;
    /** 点击标题后的跳转回调。 */
    onNavigateToLine: (lineNumber: number) => void;
}

/**
 * FlowMD 右侧大纲面板控制器。
 */
export class OutlinePanel {
    /** 大纲外层容器。 */
    private readonly panelEl: HTMLElement;

    /** 大纲内容容器。 */
    private readonly contentEl: HTMLElement;

    /** 可拖拽分隔条。 */
    private readonly resizerEl: HTMLElement;

    /** 宽度变化回调。 */
    private readonly onWidthChange: (width: number) => void;

    /** 标题跳转回调。 */
    private readonly onNavigateToLine: (lineNumber: number) => void;

    /** 当前大纲宽度。 */
    private width: number;

    /** 当前 Markdown 标题树。 */
    private nodes: OutlineNode[] = [];

    /** 折叠节点 ID 集合。 */
    private readonly collapsedNodeIds = new Set<string>();

    /** 当前高亮行号。 */
    private activeLine = 1;

    /** 是否正在拖拽分隔条。 */
    private dragging = false;

    /** 拖拽起始 X 坐标。 */
    private dragStartX = 0;

    /** 拖拽起始宽度。 */
    private dragStartWidth = 0;

    /** 允许的最小宽度。 */
    private static readonly MIN_WIDTH = 220;

    /** 允许的最大宽度。 */
    private static readonly MAX_WIDTH = 520;

    /** 一级标题配色池，用于区分不同根分支。 */
    private static readonly ROOT_ACCENT_PALETTE = [
        'rgba(79, 193, 255, 0.18)',
        'rgba(61, 220, 151, 0.16)',
        'rgba(255, 199, 95, 0.16)',
        'rgba(194, 132, 255, 0.16)',
        'rgba(255, 137, 95, 0.16)',
        'rgba(158, 174, 255, 0.16)',
    ];

    /**
     * 创建右侧大纲面板控制器。
     *
     * @param panelEl - 大纲外层容器
     * @param contentEl - 大纲内容容器
     * @param resizerEl - 可拖拽分隔条
     * @param options - 面板配置项
     * @returns void
     */
    constructor(
        panelEl: HTMLElement,
        contentEl: HTMLElement,
        resizerEl: HTMLElement,
        options: OutlinePanelOptions
    ) {
        this.panelEl = panelEl;
        this.contentEl = contentEl;
        this.resizerEl = resizerEl;
        this.onWidthChange = options.onWidthChange;
        this.onNavigateToLine = options.onNavigateToLine;
        this.width = this.clampWidth(options.initialWidth);

        this.applyWidth(this.width);
        this.bindEvents();
    }

    /**
     * 限制宽度到允许区间。
     *
     * @param width - 原始宽度
     * @returns 归一化后的宽度
     */
    private clampWidth(width: number): number {
        if (!Number.isFinite(width)) {
            return OutlinePanel.MIN_WIDTH;
        }
        return Math.min(OutlinePanel.MAX_WIDTH, Math.max(OutlinePanel.MIN_WIDTH, Math.round(width)));
    }

    /**
     * 将宽度同步到 CSS 变量和面板样式。
     *
     * @param width - 目标宽度
     * @returns void
     */
    private applyWidth(width: number): void {
        this.width = this.clampWidth(width);
        document.documentElement.style.setProperty('--flowmd-outline-width', `${this.width}px`);
        this.panelEl.style.width = `${this.width}px`;
        this.panelEl.style.flexBasis = `${this.width}px`;
    }

    /**
     * 绑定拖拽、折叠和键盘事件。
     *
     * @returns void
     */
    private bindEvents(): void {
        this.resizerEl.addEventListener('pointerdown', (event: PointerEvent) => {
            if (event.button !== 0) {
                return;
            }

            event.preventDefault();
            this.dragging = true;
            this.dragStartX = event.clientX;
            this.dragStartWidth = this.width;
            this.resizerEl.dataset.dragging = 'true';
            document.body.classList.add('flowmd-outline-resizing');

            const onMove = (moveEvent: PointerEvent): void => {
                if (!this.dragging) {
                    return;
                }

                const delta = moveEvent.clientX - this.dragStartX;
                this.applyWidth(this.dragStartWidth - delta);
            };

            const onUp = (upEvent: PointerEvent): void => {
                if (!this.dragging) {
                    return;
                }

                this.dragging = false;
                this.resizerEl.dataset.dragging = 'false';
                document.body.classList.remove('flowmd-outline-resizing');
                this.resizerEl.releasePointerCapture(upEvent.pointerId);
                window.removeEventListener('pointermove', onMove);
                window.removeEventListener('pointerup', onUp);
                window.removeEventListener('pointercancel', onUp);
                this.onWidthChange(this.width);
            };

            this.resizerEl.setPointerCapture(event.pointerId);
            window.addEventListener('pointermove', onMove);
            window.addEventListener('pointerup', onUp);
            window.addEventListener('pointercancel', onUp);
        });

        this.contentEl.addEventListener('click', (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            if (!target) {
                return;
            }

            const toggleEl = target.closest<HTMLElement>('[data-outline-action="toggle"]');
            if (toggleEl) {
                event.preventDefault();
                event.stopPropagation();
                const nodeId = toggleEl.getAttribute('data-node-id');
                if (nodeId) {
                    if (this.collapsedNodeIds.has(nodeId)) {
                        this.collapsedNodeIds.delete(nodeId);
                    } else {
                        this.collapsedNodeIds.add(nodeId);
                    }
                    this.render();
                }
                return;
            }

            const rowEl = target.closest<HTMLElement>('[data-outline-action="jump"]');
            if (!rowEl) {
                return;
            }

            const lineValue = rowEl.getAttribute('data-line');
            const lineNumber = Number.parseInt(lineValue ?? '', 10);
            if (Number.isFinite(lineNumber)) {
                this.onNavigateToLine(lineNumber);
            }
        });

        this.contentEl.addEventListener('keydown', (event: KeyboardEvent) => {
            const target = event.target as HTMLElement | null;
            if (!target) {
                return;
            }

            const rowEl = target.closest<HTMLElement>('[data-outline-action="jump"]');
            if (!rowEl) {
                return;
            }

            if (event.key !== 'Enter' && event.key !== ' ') {
                return;
            }

            event.preventDefault();
            const lineValue = rowEl.getAttribute('data-line');
            const lineNumber = Number.parseInt(lineValue ?? '', 10);
            if (Number.isFinite(lineNumber)) {
                this.onNavigateToLine(lineNumber);
            }
        });
    }

    /**
     * 更新 Markdown 内容并重新渲染大纲。
     *
     * @param content - Markdown 源文本
     * @param activeLine - 可选的高亮行号
     * @returns void
     */
    public setContent(content: string, activeLine?: number): void {
        if (Number.isFinite(activeLine ?? NaN)) {
            this.activeLine = Math.floor(activeLine as number);
        }

        this.nodes = this.parseHeadings(content);
        this.render();
    }

    /**
     * 兼容旧命名的内容更新方法。
     *
     * @param content - Markdown 源文本
     * @param activeLine - 可选的高亮行号
     * @returns void
     */
    public updateContent(content: string, activeLine?: number): void {
        this.setContent(content, activeLine);
    }

    /**
     * 直接设置大纲宽度。
     *
     * @param width - 新宽度，单位像素
     * @returns void
     */
    public setWidth(width: number): void {
        this.applyWidth(width);
    }

    /**
     * 设置当前高亮行。
     *
     * @param lineNumber - 当前行号
     * @returns void
     */
    public setActiveLine(lineNumber: number): void {
        if (!Number.isFinite(lineNumber) || lineNumber < 1) {
            return;
        }

        this.activeLine = Math.floor(lineNumber);
        this.render();
    }

    /**
     * 获取当前大纲宽度。
     *
     * @returns 当前宽度，单位像素
     */
    public getWidth(): number {
        return this.width;
    }

    /**
     * 解析 Markdown 标题并构建树形结构。
     *
     * @param content - Markdown 源文本
     * @returns 树形标题节点
     */
    private parseHeadings(content: string): OutlineNode[] {
        const lines = content.split(/\r?\n/);
        const rootNodes: OutlineNode[] = [];
        const stack: OutlineNode[] = [];
        const siblingCounts = new Map<string, number>();
        let inFence = false;
        let fenceMarker = '';
        let fenceLength = 0;

        for (let lineNumber = 0; lineNumber < lines.length; lineNumber += 1) {
            const currentLine = lines[lineNumber];
            const fenceMatch = currentLine.match(/^\s{0,3}(```+|~~~+)/);
            if (fenceMatch) {
                const marker = fenceMatch[1][0];
                const length = fenceMatch[1].length;
                if (!inFence) {
                    inFence = true;
                    fenceMarker = marker;
                    fenceLength = length;
                } else if (marker === fenceMarker && length >= fenceLength) {
                    inFence = false;
                    fenceMarker = '';
                    fenceLength = 0;
                }
                continue;
            }

            if (inFence) {
                continue;
            }

            const atxMatch = currentLine.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
            if (atxMatch) {
                this.pushHeadingNode(
                    rootNodes,
                    stack,
                    siblingCounts,
                    atxMatch[1].length,
                    this.normalizeHeadingText(atxMatch[2]),
                    lineNumber + 1
                );
                continue;
            }

            const nextLine = lines[lineNumber + 1];
            const setextLevel =
                nextLine && /^\s*=+\s*$/.test(nextLine)
                    ? 1
                    : nextLine && /^\s*-+\s*$/.test(nextLine)
                      ? 2
                      : 0;
            if (setextLevel > 0) {
                const text = this.normalizeHeadingText(currentLine);
                if (text) {
                    this.pushHeadingNode(rootNodes, stack, siblingCounts, setextLevel, text, lineNumber + 1);
                }
                lineNumber += 1;
            }
        }

        return rootNodes;
    }

    /**
     * 将单个标题节点加入树结构。
     *
     * @param rootNodes - 根节点列表
     * @param stack - 当前解析栈
     * @param siblingCounts - 同层级计数器
     * @param level - 标题层级
     * @param text - 标题文本
     * @param line - 标题所在行号
     * @returns void
     */
    private pushHeadingNode(
        rootNodes: OutlineNode[],
        stack: OutlineNode[],
        siblingCounts: Map<string, number>,
        level: number,
        text: string,
        line: number
    ): void {
        if (!text) {
            return;
        }

        while (stack.length > 0 && stack[stack.length - 1].level >= level) {
            stack.pop();
        }

        const parentPath = stack.map((node) => node.id).join('/');
        const siblingKey = `${parentPath}|${level}`;
        const siblingIndex = (siblingCounts.get(siblingKey) ?? 0) + 1;
        siblingCounts.set(siblingKey, siblingIndex);

        const node: OutlineNode = {
            id: `${siblingKey}|${siblingIndex}|${line}`,
            level,
            text,
            line,
            children: [],
        };

        if (stack.length === 0) {
            rootNodes.push(node);
        } else {
            stack[stack.length - 1].children.push(node);
        }

        stack.push(node);
    }

    /**
     * 清洗标题文本。
     *
     * @param text - 原始标题文本
     * @returns 清洗后的文本
     */
    private normalizeHeadingText(text: string): string {
        return text
            .replace(/\s+#+\s*$/, '')
            .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
            .replace(/[`*_~]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * 渲染大纲视图。
     *
     * @returns void
     */
    private render(): void {
        if (this.nodes.length === 0) {
            this.contentEl.innerHTML = '<div class="outline-empty">未检测到标题</div>';
            this.panelEl.classList.add('is-empty');
            return;
        }

        this.panelEl.classList.remove('is-empty');
        const activeNodeId = this.findActiveNodeId(this.nodes, this.activeLine);
        const html = this.renderNodes(this.nodes, 0, 0, activeNodeId);
        this.contentEl.innerHTML = `<div class="outline-tree" role="tree">${html}</div>`;
    }

    /**
     * 递归渲染标题节点。
     *
     * @param nodes - 当前层级节点
     * @param depth - 当前深度
     * @param rootIndex - 根分支索引
     * @param activeNodeId - 当前高亮节点 ID
     * @returns HTML 字符串
     */
    private renderNodes(
        nodes: OutlineNode[],
        depth: number,
        rootIndex: number,
        activeNodeId: string | null
    ): string {
        return nodes
            .map((node, index) => {
                const branchIndex = depth === 0 ? index : rootIndex;
                const accent =
                    OutlinePanel.ROOT_ACCENT_PALETTE[
                        branchIndex % OutlinePanel.ROOT_ACCENT_PALETTE.length
                    ];
                const isCollapsed = this.collapsedNodeIds.has(node.id);
                const hasChildren = node.children.length > 0;
                const isActive = node.id === activeNodeId;
                const toggleSymbol = hasChildren ? (isCollapsed ? '>' : '∨') : '·';
                const childrenHtml =
                    hasChildren && !isCollapsed
                        ? `<div class="outline-children">${this.renderNodes(
                              node.children,
                              depth + 1,
                              branchIndex,
                              activeNodeId
                          )}</div>`
                        : '';

                return `
                    <div class="outline-item" data-level="${node.level}" style="--outline-accent: ${accent};">
                        <div
                            class="outline-row"
                            data-outline-action="jump"
                            data-line="${node.line}"
                            data-active="${isActive ? 'true' : 'false'}"
                            role="button"
                            tabindex="0"
                            aria-label="跳转到第 ${node.line} 行"
                        >
                            <span
                                class="outline-toggle"
                                data-outline-action="toggle"
                                data-node-id="${node.id}"
                                data-collapsed="${isCollapsed ? 'true' : 'false'}"
                                aria-hidden="true"
                            >${toggleSymbol}</span>
                            <span class="outline-label">${this.escapeHtml(node.text)}</span>
                            <span class="outline-meta">${node.line}</span>
                        </div>
                        ${childrenHtml}
                    </div>
                `;
            })
            .join('');
    }

    /**
     * 查找当前高亮行对应的最近标题节点。
     *
     * @param nodes - 标题节点列表
     * @param lineNumber - 当前行号
     * @returns 节点 ID，没有则返回 null
     */
    private findActiveNodeId(nodes: OutlineNode[], lineNumber: number): string | null {
        let lastMatch: OutlineNode | null = null;

        const walk = (items: OutlineNode[]): void => {
            for (const node of items) {
                if (node.line <= lineNumber) {
                    lastMatch = node;
                }
                if (node.children.length > 0 && node.line <= lineNumber) {
                    walk(node.children);
                }
            }
        };

        walk(nodes);
        return lastMatch?.id ?? null;
    }

    /**
     * 统计节点总数。
     *
     * @param nodes - 节点列表
     * @returns 节点总数
     */
    /**
     * 转义 HTML 文本，避免标题内容破坏结构。
     *
     * @param value - 原始文本
     * @returns 安全的 HTML 文本
     */
    private escapeHtml(value: string): string {
        return value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
}
