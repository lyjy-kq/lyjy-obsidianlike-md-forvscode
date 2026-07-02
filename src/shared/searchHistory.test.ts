import { describe, expect, it } from 'vitest';
import {
    SEARCH_HISTORY_LIMIT,
    createEmptySearchHistory,
    normalizeSearchHistoryState,
    upsertSearchHistoryEntry,
} from './searchHistory';

describe('upsertSearchHistoryEntry', () => {
    it('keeps search and replace histories independent and moves duplicates to the front', () => {
        const step1 = upsertSearchHistoryEntry(createEmptySearchHistory(), 'search', 'alpha');
        const step2 = upsertSearchHistoryEntry(step1, 'search', 'beta');
        const next = upsertSearchHistoryEntry(step2, 'search', 'alpha');

        expect(next.search).toEqual(['alpha', 'beta']);
        expect(next.replace).toEqual([]);
    });

    it('caps the history at 20 entries and drops the oldest item', () => {
        let state = createEmptySearchHistory();

        for (let index = 1; index <= SEARCH_HISTORY_LIMIT + 1; index += 1) {
            state = upsertSearchHistoryEntry(state, 'replace', `value-${index}`);
        }

        expect(state.replace).toHaveLength(SEARCH_HISTORY_LIMIT);
        expect(state.replace[0]).toBe(`value-${SEARCH_HISTORY_LIMIT + 1}`);
        expect(state.replace.at(-1)).toBe('value-2');
    });
});

describe('normalizeSearchHistoryState', () => {
    it('sanitizes malformed values into a safe history state', () => {
        expect(
            normalizeSearchHistoryState({
                search: ['  alpha  ', '', null, 'beta', 'alpha'],
                replace: ['  ', 'gamma', 123],
            })
        ).toEqual({
            search: ['alpha', 'beta'],
            replace: ['gamma'],
        });
    });

    it('returns an empty state for non-object inputs', () => {
        expect(normalizeSearchHistoryState(undefined)).toEqual(createEmptySearchHistory());
        expect(normalizeSearchHistoryState(null)).toEqual(createEmptySearchHistory());
        expect(normalizeSearchHistoryState('bad')).toEqual(createEmptySearchHistory());
    });
});
