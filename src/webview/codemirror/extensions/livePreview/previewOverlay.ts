/**
 * 预览浮层工具。
 *
 * 这个模块负责图片与 Mermaid 预览的放大查看、缩放、拖动和平铺按钮创建。
 * 设计目标是把“查看器”逻辑从 widget 渲染逻辑中拆出来，避免 widgets.ts 继续膨胀。
 */

import { copyToClipboard, getMermaidTheme, mermaidInitialized, mermaidRenderPromises, mermaidSvgCache, setMermaidInitialized } from './state.js';

/**
 * 预览浮层中图片查看器所需的信息。
 */
export interface ImagePreviewOverlayOptions {
    /** 原始图片地址，用于复制。 */
    rawUrl: string;
    /** 已解析后的 webview 可访问地址，解析失败时可为空。 */
    resolvedUrl: string | null;
    /** 图片替代文本。 */
    altText: string;
    /** 浮层挂载容器，用于继承 CodeMirror baseTheme 样式作用域。 */
    mountHost: HTMLElement;
}

/**
 * 预览浮层中 Mermaid 查看器所需的信息。
 */
export interface MermaidPreviewOverlayOptions {
    /** Mermaid 源文本，用于渲染。 */
    source: string;
    /** 浮层挂载容器，用于继承 CodeMirror baseTheme 样式作用域。 */
    mountHost: HTMLElement;
}

/**
 * 操作按钮的配置项。
 */
interface PreviewActionOptions {
    /** 按钮提示文案。 */
    title: string;
    /** 按钮无障碍标签。 */
    ariaLabel: string;
    /** 按钮点击后的处理逻辑。 */
    onClick: () => void | Promise<void>;
    /** 按钮展示的符号。 */
    icon: string;
}

/**
 * 浮层根节点引用。
 *
 * 同一时刻只允许打开一个预览浮层，因此使用模块级状态保存当前活动节点。
 */
let activeOverlayRoot: HTMLElement | null = null;

/**
 * Mermaid 渲染序号。
 *
 * 这个值用于生成渲染 ID，避免并发渲染时产生冲突。
 */
let mermaidRenderSequence = 0;

/**
 * 关闭当前活动的预览浮层。
 *
 * @returns void
 */
function closeActivePreviewOverlay(): void {
    if (!activeOverlayRoot) {
        return;
    }

    activeOverlayRoot.remove();
    activeOverlayRoot = null;
}

/**
 * 为按钮添加短暂反馈。
 *
 * @param button - 需要更新状态的按钮
 * @param icon - 反馈阶段显示的图标
 * @param title - 反馈阶段显示的提示文案
 * @param resetIcon - 恢复后的图标
 * @param resetTitle - 恢复后的提示文案
 * @returns void
 */
function flashButtonState(
    button: HTMLButtonElement,
    icon: string,
    title: string,
    resetIcon: string,
    resetTitle: string
): void {
    button.textContent = icon;
    button.title = title;
    button.setAttribute('aria-label', title);
    window.setTimeout(() => {
        button.textContent = resetIcon;
        button.title = resetTitle;
        button.setAttribute('aria-label', resetTitle);
    }, 1200);
}

/**
 * 安全复制文本到剪贴板。
 *
 * 优先复用 Webview 到扩展的消息链路；如果链路不可用，则退回到浏览器原生剪贴板。
 *
 * @param text - 需要复制的文本
 * @returns 复制是否成功
 */
async function copyTextSafely(text: string): Promise<boolean> {
    try {
        await copyToClipboard(text);
        return true;
    } catch {
        if (navigator.clipboard?.writeText) {
            try {
                await navigator.clipboard.writeText(text);
                return true;
            } catch {
                return false;
            }
        }

        return false;
    }
}

/**
 * 将图片内容复制到系统剪贴板。
 *
 * @param imageUrl - 可被当前 webview 访问到的图片地址
 * @returns 图片复制是否成功
 */
async function copyImageSafely(imageUrl: string | null): Promise<boolean> {
    if (!imageUrl) {
        return false;
    }

    try {
        const response = await fetch(imageUrl);
        if (!response.ok) {
            return false;
        }

        const blob = await response.blob();
        if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
            return false;
        }

        const mimeType = blob.type || 'image/png';
        await navigator.clipboard.write([new ClipboardItem({ [mimeType]: blob })]);
        return true;
    } catch {
        return false;
    }
}

/**
 * 将任意二进制图片内容复制到系统剪贴板。
 *
 * @param blob - 需要复制的图片二进制内容
 * @returns 图片复制是否成功
 */
async function copyBlobImageSafely(blob: Blob): Promise<boolean> {
    try {
        if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
            return false;
        }

        const mimeType = blob.type || 'image/png';
        await navigator.clipboard.write([new ClipboardItem({ [mimeType]: blob })]);
        return true;
    } catch {
        return false;
    }
}

/**
 * 从 SVG 文本中读取可用于画布的尺寸。
 *
 * @param svg - Mermaid 渲染得到的 SVG 字符串
 * @returns 画布尺寸
 */
function readSvgCanvasSize(svg: string): { width: number; height: number } {
    const parsed = new DOMParser().parseFromString(svg, 'image/svg+xml');
    const svgElement = parsed.documentElement;
    const widthAttr = parseFloat(svgElement.getAttribute('width') ?? '');
    const heightAttr = parseFloat(svgElement.getAttribute('height') ?? '');

    if (Number.isFinite(widthAttr) && widthAttr > 0 && Number.isFinite(heightAttr) && heightAttr > 0) {
        return { width: Math.ceil(widthAttr), height: Math.ceil(heightAttr) };
    }

    const viewBox = svgElement.getAttribute('viewBox')?.trim().split(/\s+/).map(Number);
    if (viewBox && viewBox.length === 4 && viewBox.every((value) => Number.isFinite(value))) {
        return {
            width: Math.max(1, Math.ceil(viewBox[2])),
            height: Math.max(1, Math.ceil(viewBox[3])),
        };
    }

    return { width: 800, height: 600 };
}

/**
 * 将 SVG 字符串转换为 PNG 图片二进制。
 *
 * @param svg - Mermaid 渲染得到的 SVG 字符串
 * @returns PNG 图片二进制
 */
async function convertSvgToPngBlob(svg: string): Promise<Blob> {
    const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    const fallbackSize = readSvgCanvasSize(svg);

    try {
        const image = new Image();
        image.decoding = 'async';
        const imageLoaded = new Promise<void>((resolve, reject) => {
            image.onload = () => resolve();
            image.onerror = () => reject(new Error('svg image load failed'));
        });
        image.src = svgUrl;
        await imageLoaded;

        const canvas = document.createElement('canvas');
        const width = Math.max(1, Math.ceil(image.naturalWidth || image.width || fallbackSize.width));
        const height = Math.max(1, Math.ceil(image.naturalHeight || image.height || fallbackSize.height));
        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext('2d');
        if (!context) {
            throw new Error('canvas context unavailable');
        }

        context.fillStyle = getMermaidTheme() === 'dark' ? '#1f2020' : '#ffffff';
        context.fillRect(0, 0, width, height);
        context.drawImage(image, 0, 0);

        return await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('png blob unavailable'));
                }
            }, 'image/png');
        });
    } finally {
        URL.revokeObjectURL(svgUrl);
    }
}

/**
 * 将 Mermaid 渲染后的 SVG 图像复制到系统剪贴板。
 *
 * @param source - Mermaid 源文本
 * @returns 图像复制是否成功
 */
export async function copyMermaidRenderedImageSafely(source: string): Promise<boolean> {
    try {
        const svg = await renderMermaidSource(source);
        const blob = await convertSvgToPngBlob(svg);
        if (await copyBlobImageSafely(blob)) {
            return true;
        }

        return false;
    } catch {
        return false;
    }
}

/**
 * 创建一个小型圆角操作按钮。
 *
 * @param options - 按钮配置
 * @returns 按钮元素
 */
function createPreviewActionButton(options: PreviewActionOptions): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'cm-md-preview-action';
    button.textContent = options.icon;
    button.title = options.title;
    button.setAttribute('aria-label', options.ariaLabel);
    let handledByMouseDown = false;

    button.addEventListener('mousedown', (event) => {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        if (event.button !== 0) {
            return;
        }

        handledByMouseDown = true;
        window.setTimeout(() => {
            handledByMouseDown = false;
        }, 0);
        void Promise.resolve(options.onClick());
    });

    button.addEventListener('click', async (event) => {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        if (handledByMouseDown) {
            return;
        }

        await options.onClick();
    });

    return button;
}

/**
 * 创建右下角操作按钮组。
 *
 * @param expandTitle - 放大按钮提示
 * @param copyTitle - 复制按钮提示
 * @param onExpand - 放大按钮点击回调
 * @param onCopy - 复制按钮点击回调
 * @returns 按钮组容器
 */
export function createPreviewActionGroup(
    expandTitle: string,
    copyTitle: string,
    onExpand: () => void,
    onCopy: () => Promise<void> | void
): HTMLElement {
    const group = document.createElement('div');
    group.className = 'cm-md-preview-actions';

    const expandButton = createPreviewActionButton({
        title: expandTitle,
        ariaLabel: expandTitle,
        icon: '⤢',
        onClick: onExpand,
    });
    group.appendChild(expandButton);

    const copyButton = createPreviewActionButton({
        title: copyTitle,
        ariaLabel: copyTitle,
        icon: '⧉',
        onClick: async () => {
            const success = await Promise.resolve(onCopy()).then(() => true, () => false);
            if (success) {
                flashButtonState(copyButton, '✓', '已复制', '⧉', copyTitle);
            } else {
                flashButtonState(copyButton, '!', '复制失败', '⧉', copyTitle);
            }
        },
    });
    group.appendChild(copyButton);

    return group;
}

/**
 * 绑定浮层内容的拖动与缩放交互。
 *
 * 交互方式：
 * - 鼠标滚轮缩放
 * - 按住左键拖动平移
 *
 * @param viewport - 用于接收滚轮与拖拽事件的可视区域
 * @param stage - 需要被平移/缩放的内容容器
 * @returns 浮层交互控制器
 */
function attachPanZoom(viewport: HTMLElement, stage: HTMLElement): {
    /** 释放事件监听器的清理函数。 */
    cleanup: () => void;
    /** 主动放大一次当前内容。 */
    zoomIn: () => void;
} {
    let scale = 1;
    let translateX = 0;
    let translateY = 0;
    let dragging = false;
    let pointerId: number | null = null;
    let dragStartX = 0;
    let dragStartY = 0;
    let originTranslateX = 0;
    let originTranslateY = 0;

    /**
     * 应用当前平移与缩放状态。
     *
     * @returns void
     */
    function applyTransform(): void {
        stage.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
    }

    /**
     * 更新拖动视觉状态。
     *
     * @param isDragging - 是否正在拖动
     * @returns void
     */
    function setDragging(isDragging: boolean): void {
        dragging = isDragging;
        viewport.classList.toggle('cm-md-preview-dragging', isDragging);
    }

    /**
     * 处理缩放。
     *
     * @param deltaY - 鼠标滚轮位移
     * @returns void
     */
    function zoomBy(factor: number): void {
        const nextScale = scale * factor;
        scale = Math.min(6, Math.max(0.2, nextScale));
        applyTransform();
    }

    /**
     * 处理缩放。
     *
     * @param deltaY - 鼠标滚轮位移
     * @returns void
     */
    function handleWheel(deltaY: number): void {
        zoomBy(deltaY < 0 ? 1.12 : 1 / 1.12);
    }

    /**
     * 处理拖动开始。
     *
     * @param event - 指针事件
     * @returns void
     */
    function handlePointerDown(event: PointerEvent): void {
        if (event.button !== 0) {
            return;
        }

        setDragging(true);
        pointerId = event.pointerId;
        dragStartX = event.clientX;
        dragStartY = event.clientY;
        originTranslateX = translateX;
        originTranslateY = translateY;
        viewport.setPointerCapture(pointerId);
    }

    /**
     * 处理拖动移动。
     *
     * @param event - 指针事件
     * @returns void
     */
    function handlePointerMove(event: PointerEvent): void {
        if (!dragging || pointerId !== event.pointerId) {
            return;
        }

        translateX = originTranslateX + (event.clientX - dragStartX);
        translateY = originTranslateY + (event.clientY - dragStartY);
        applyTransform();
    }

    /**
     * 处理拖动结束。
     *
     * @param event - 指针事件
     * @returns void
     */
    function handlePointerUp(event: PointerEvent): void {
        if (pointerId !== event.pointerId) {
            return;
        }

        if (pointerId !== null && viewport.hasPointerCapture(pointerId)) {
            viewport.releasePointerCapture(pointerId);
        }

        setDragging(false);
        pointerId = null;
    }

    viewport.addEventListener('wheel', (event) => {
        event.preventDefault();
        handleWheel(event.deltaY);
    });
    viewport.addEventListener('pointerdown', handlePointerDown);
    viewport.addEventListener('pointermove', handlePointerMove);
    viewport.addEventListener('pointerup', handlePointerUp);
    viewport.addEventListener('pointercancel', handlePointerUp);

    applyTransform();

    return {
        cleanup: () => {
            viewport.removeEventListener('pointerdown', handlePointerDown);
            viewport.removeEventListener('pointermove', handlePointerMove);
            viewport.removeEventListener('pointerup', handlePointerUp);
            viewport.removeEventListener('pointercancel', handlePointerUp);
            viewport.classList.remove('cm-md-preview-dragging');
        },
        zoomIn: () => {
            zoomBy(1.25);
        },
    };
}

/**
 * 创建预览浮层的通用外壳。
 *
 * @param title - 浮层标题
 * @param onClose - 关闭回调
 * @returns 浮层所需的关键 DOM 节点
 */
function createOverlayShell(title: string, onClose: () => void): {
    /** 浮层根节点。 */
    root: HTMLElement;
    /** 浮层内容可视区。 */
    viewport: HTMLElement;
    /** 浮层可拖拽的内容容器。 */
    stage: HTMLElement;
    /** 浮层中放置实际内容的节点。 */
    contentHost: HTMLElement;
    /** 标题文本节点。 */
    titleNode: HTMLSpanElement;
} {
    const root = document.createElement('div');
    root.className = 'cm-md-preview-overlay';

    const backdrop = document.createElement('div');
    backdrop.className = 'cm-md-preview-backdrop';
    root.appendChild(backdrop);

    const panel = document.createElement('div');
    panel.className = 'cm-md-preview-panel';
    root.appendChild(panel);

    const header = document.createElement('div');
    header.className = 'cm-md-preview-header';
    panel.appendChild(header);

    const titleNode = document.createElement('span');
    titleNode.className = 'cm-md-preview-title';
    titleNode.textContent = title;
    header.appendChild(titleNode);

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'cm-md-preview-close';
    closeButton.textContent = '×';
    closeButton.title = '关闭';
    closeButton.setAttribute('aria-label', '关闭');
    closeButton.addEventListener('mousedown', (event) => {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
    });
    closeButton.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        onClose();
    });
    header.appendChild(closeButton);

    const viewport = document.createElement('div');
    viewport.className = 'cm-md-preview-viewport';
    panel.appendChild(viewport);

    const stage = document.createElement('div');
    stage.className = 'cm-md-preview-stage';
    viewport.appendChild(stage);

    const contentHost = document.createElement('div');
    contentHost.className = 'cm-md-preview-content';
    stage.appendChild(contentHost);

    backdrop.addEventListener('click', onClose);
    root.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            onClose();
        }
    });

    return { root, viewport, stage, contentHost, titleNode };
}

/**
 * 打开图片预览浮层。
 *
 * @param options - 图片预览参数
 * @returns void
 */
export function openImagePreviewOverlay(options: ImagePreviewOverlayOptions): void {
    closeActivePreviewOverlay();

    const cleanupBag: Array<() => void> = [];
    const overlay = createOverlayShell('图片预览', () => {
        for (const cleanup of cleanupBag.reverse()) {
            cleanup();
        }
        closeActivePreviewOverlay();
    });

    const close = overlay.root;
    cleanupBag.push(() => close.remove());
    activeOverlayRoot = close;

    const contentHost = overlay.contentHost;
    const viewport = overlay.viewport;
    const stage = overlay.stage;
    const panZoom = attachPanZoom(viewport, stage);
    cleanupBag.push(panZoom.cleanup);

    const resolvedUrl = options.resolvedUrl ?? options.rawUrl;
    if (resolvedUrl) {
        const img = document.createElement('img');
        img.className = 'cm-md-preview-image';
        img.src = resolvedUrl;
        img.alt = options.altText || '[image]';
        img.draggable = false;
        img.addEventListener('load', () => {
            contentHost.classList.add('cm-md-preview-image-loaded');
        });
        img.addEventListener('error', () => {
            contentHost.replaceChildren(createPreviewFallback(options.altText || '[image]'));
        });
        contentHost.replaceChildren(img);
    } else {
        contentHost.replaceChildren(createPreviewFallback(options.altText || '[image]'));
    }

    const actions = createPreviewActionGroup('放大图片', '复制图片', panZoom.zoomIn, async () => {
        if (!resolvedUrl) {
            throw new Error('image url not resolved');
        }

        const response = await fetch(resolvedUrl);
        if (!response.ok) {
            throw new Error('image fetch failed');
        }

        const success = await copyBlobImageSafely(await response.blob());
        if (!success) {
            throw new Error('copy failed');
        }
    });
    contentHost.appendChild(actions);

    options.mountHost.appendChild(close);
    close.tabIndex = -1;
    close.focus({ preventScroll: true });
}

/**
 * 打开 Mermaid 预览浮层。
 *
 * @param options - Mermaid 预览参数
 * @returns void
 */
export function openMermaidPreviewOverlay(options: MermaidPreviewOverlayOptions): void {
    closeActivePreviewOverlay();

    const cleanupBag: Array<() => void> = [];
    const overlay = createOverlayShell('Mermaid 预览', () => {
        for (const cleanup of cleanupBag.reverse()) {
            cleanup();
        }
        closeActivePreviewOverlay();
    });

    const root = overlay.root;
    activeOverlayRoot = root;

    const viewport = overlay.viewport;
    const stage = overlay.stage;
    const contentHost = overlay.contentHost;
    const panZoom = attachPanZoom(viewport, stage);
    cleanupBag.push(panZoom.cleanup);

    const actions = createPreviewActionGroup('放大图表', '复制 Mermaid 图', panZoom.zoomIn, async () => {
        const success = await copyMermaidRenderedImageSafely(options.source);
        if (!success) {
            throw new Error('copy failed');
        }
    });
    contentHost.appendChild(actions);

    const loading = createPreviewFallback('正在渲染 Mermaid 图表...');
    loading.classList.add('cm-md-preview-loading');
    contentHost.appendChild(loading);

    options.mountHost.appendChild(root);
    root.tabIndex = -1;
    root.focus({ preventScroll: true });

    void renderMermaidSource(options.source)
        .then((svg) => {
            const rendered = document.createElement('div');
            rendered.className = 'cm-md-preview-mermaid-rendered';
            rendered.innerHTML = svg;
            contentHost.replaceChildren(rendered, actions);
        })
        .catch((error) => {
            const message = document.createElement('div');
            message.className = 'cm-md-preview-fallback cm-md-preview-error';
            message.textContent = `Mermaid 渲染失败: ${error instanceof Error ? error.message : String(error)}`;
            contentHost.replaceChildren(message, actions);
        });
}

/**
 * 创建预览失败或加载中的提示块。
 *
 * @param text - 提示文案
 * @returns 提示节点
 */
function createPreviewFallback(text: string): HTMLElement {
    const fallback = document.createElement('div');
    fallback.className = 'cm-md-preview-fallback';
    fallback.textContent = text;
    return fallback;
}

/**
 * 渲染 Mermaid 源码为 SVG。
 *
 * @param source - Mermaid 源文本
 * @returns SVG 字符串
 */
async function renderMermaidSource(source: string): Promise<string> {
    const cached = mermaidSvgCache.get(source);
    if (cached) {
        return cached;
    }

    const inflight = mermaidRenderPromises.get(source);
    if (inflight) {
        return inflight;
    }

    const mermaid = await import('mermaid');
    if (!mermaidInitialized) {
        const theme = getMermaidTheme();
        mermaid.default.initialize({
            startOnLoad: false,
            securityLevel: 'strict',
            theme: theme === 'dark' ? 'dark' : 'default',
            themeVariables:
                theme === 'dark'
                    ? {
                          primaryColor: '#1f2020',
                          primaryBorderColor: '#555',
                          primaryTextColor: '#d4d4d4',
                          lineColor: '#666',
                          secondaryColor: '#2a2d35',
                          tertiaryColor: '#30353f',
                      }
                    : {
                          primaryColor: '#ffffff',
                          primaryBorderColor: '#d0d7de',
                          primaryTextColor: '#24292e',
                          lineColor: '#656d76',
                          secondaryColor: '#f6f8fa',
                          tertiaryColor: '#eff1f3',
                      },
        });
        setMermaidInitialized(true);
    }

    const renderId = `mermaid-preview-${mermaidRenderSequence++}`;
    const promise = mermaid.default.render(renderId, source).then(({ svg }) => {
        mermaidSvgCache.set(source, svg);
        return svg;
    });
    mermaidRenderPromises.set(source, promise);

    try {
        return await promise;
    } finally {
        mermaidRenderPromises.delete(source);
    }
}
