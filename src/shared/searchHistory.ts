/**
 * 搜索/替换历史的共享数据结构与 LRU 规则。
 *
 * 这个模块只处理纯数据逻辑，不依赖 VS Code API 或 DOM。
 * 扩展侧用它做工作区级持久化，Webview 侧用它做下拉历史和回填。
 *
 * @module shared/searchHistory
 */

/**
 * 搜索历史与替换历史的容量上限。
 *
 * @remarks
 * 搜索和替换分别独立维护各自的 20 条 LRU 历史。
 */
export const SEARCH_HISTORY_LIMIT = 20;

/**
 * 历史列表的类别。
 *
 * `search` 对应搜索输入框，`replace` 对应替换输入框。
 */
export type SearchHistoryKind = 'search' | 'replace';

/**
 * 搜索/替换历史的持久化结构。
 *
 * `search` 和 `replace` 是两套独立的 LRU 列表，数组头部表示最近使用项。
 */
export interface SearchHistoryState {
    /** 搜索输入框的历史项，数组头部是最近使用项。 */
    search: string[];
    /** 替换输入框的历史项，数组头部是最近使用项。 */
    replace: string[];
}

/**
 * 创建一份空的搜索/替换历史状态。
 *
 * @returns 结构完整但不包含任何历史项的状态对象。
 */
export function createEmptySearchHistory(): SearchHistoryState {
    return {
        search: [],
        replace: [],
    };
}

/**
 * 将单个历史项归一化为可存储的字符串。
 *
 * 规则：
 * - 去除首尾空白
 * - 空字符串返回 null
 *
 * @param value - 待归一化的输入值。
 * @returns 可存储的历史项，或 null 表示应当忽略。
 */
function normalizeHistoryEntry(value: string): string | null {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

/**
 * 归一化任意输入中的历史数组。
 *
 * 规则：
 * - 只保留字符串项
 * - 去除首尾空白
 * - 丢弃空串
 * - 去重并保留第一次出现的顺序
 *
 * @param rawItems - 待归一化的原始数组。
 * @returns 可安全用于 UI 和持久化的历史数组。
 */
function normalizeHistoryList(rawItems: unknown): string[] {
    if (!Array.isArray(rawItems)) {
        return [];
    }

    const seen = new Set<string>();
    const normalized: string[] = [];

    for (const item of rawItems) {
        if (typeof item !== 'string') {
            continue;
        }

        const normalizedItem = normalizeHistoryEntry(item);
        if (!normalizedItem || seen.has(normalizedItem)) {
            continue;
        }

        seen.add(normalizedItem);
        normalized.push(normalizedItem);
    }

    return normalized.slice(0, SEARCH_HISTORY_LIMIT);
}

/**
 * 将未知来源的持久化数据归一化为完整的历史状态。
 *
 * @param raw - 从 workspaceState 或其他外部来源读取的原始值。
 * @returns 结构完整、内容安全的搜索/替换历史状态。
 */
export function normalizeSearchHistoryState(raw: unknown): SearchHistoryState {
    if (!raw || typeof raw !== 'object') {
        return createEmptySearchHistory();
    }

    const typed = raw as {
        search?: unknown;
        replace?: unknown;
    };

    return {
        search: normalizeHistoryList(typed.search),
        replace: normalizeHistoryList(typed.replace),
    };
}

/**
 * 向指定历史列表写入一个新值，并按 LRU 规则移动到最前面。
 *
 * @param state - 当前历史状态。
 * @param kind - 要更新的是搜索历史还是替换历史。
 * @param value - 用户刚刚确认使用的值。
 * @returns 写入后的新历史状态，不会修改入参对象。
 */
export function upsertSearchHistoryEntry(
    state: SearchHistoryState,
    kind: SearchHistoryKind,
    value: string
): SearchHistoryState {
    const normalizedValue = normalizeHistoryEntry(value);
    if (!normalizedValue) {
        return state;
    }

    const nextList = [normalizedValue, ...state[kind].filter((item) => item !== normalizedValue)];
    const limitedList = nextList.slice(0, SEARCH_HISTORY_LIMIT);

    return {
        search: kind === 'search' ? limitedList : state.search,
        replace: kind === 'replace' ? limitedList : state.replace,
    };
}
