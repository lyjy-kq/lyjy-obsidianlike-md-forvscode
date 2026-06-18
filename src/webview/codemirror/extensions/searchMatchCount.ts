/**
 * Search Match Counter Extension
 *
 * Displays "M/N" match count in the CM6 search panel,
 * similar to VS Code's native search behavior.
 */

import { ViewPlugin, type ViewUpdate, type EditorView } from '@codemirror/view';
import { SearchQuery, getSearchQuery, searchPanelOpen } from '@codemirror/search';
import type { Extension } from '@codemirror/state';

// Explicit Extension annotation keeps the anonymous class (with private
// members) out of declaration emit (avoids TS4094).
export const searchMatchCount: Extension = ViewPlugin.fromClass(
    class {
        private countEl: HTMLElement | null = null;

        constructor(private view: EditorView) {
            requestAnimationFrame(() => this.updateCount());
        }

        update(_update: ViewUpdate) {
            this.updateCount();
        }

        private updateCount() {
            if (!searchPanelOpen(this.view.state)) {
                if (this.countEl) {
                    this.countEl.remove();
                    this.countEl = null;
                }
                return;
            }

            // Reconstruct SearchQuery to ensure getCursor is available
            const spec = getSearchQuery(this.view.state);
            const query = new SearchQuery(spec as any);

            if (!query.valid) {
                if (this.countEl) {
                    this.countEl.textContent = '';
                    this.countEl.style.display = 'none';
                }
                return;
            }

            // Ensure count element exists in DOM
            if (!this.countEl || !this.countEl.parentElement) {
                this.countEl = document.createElement('span');
                this.countEl.className = 'cm-search-match-count';
                const searchPanel = this.view.dom.querySelector('.cm-search');
                const searchField = searchPanel?.querySelector('input[name="search"]');
                if (searchField) {
                    searchField.after(this.countEl);
                } else {
                    return;
                }
            }

            this.countEl.style.display = '';

            // Count all matches and find current match index
            const cursor = query.getCursor(this.view.state);
            let total = 0;
            let currentIndex = 0;
            const sel = this.view.state.selection.main;

            let result = cursor.next();
            while (!result.done) {
                total++;
                if (result.value.from === sel.from && result.value.to === sel.to) {
                    currentIndex = total;
                }
                result = cursor.next();
            }

            if (total === 0) {
                this.countEl.textContent = 'No results';
                this.countEl.classList.add('cm-search-match-count-none');
            } else {
                this.countEl.classList.remove('cm-search-match-count-none');
                if (currentIndex > 0) {
                    this.countEl.textContent = `${currentIndex}/${total}`;
                } else {
                    this.countEl.textContent = `${total} results`;
                }
            }
        }

        destroy() {
            if (this.countEl) {
                this.countEl.remove();
                this.countEl = null;
            }
        }
    }
);
