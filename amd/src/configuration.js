// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * Tiny editor configuration helpers for haccgen extender.
 *
 * @module tiny_haccgen_extender/configuration
 * @copyright 2026, Dynamic Pixel
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {openButtonName, openMenuItemName, selectionButtonName} from './common';
import {addMenubarItem, addToolbarButtons, addToolbarSection, addQuickbarsToolbarItem} from 'editor_tiny/utils';

const INTERACTIVE_VALID_ELEMENTS = [
    'details[open|class|style|id]',
    'summary[class|style]',
    'label[for|class|style]',
    'input[type|name|id|class|checked|value]',
    'style[type]',
].join(',');

const INTERACTIVE_CONTENT_STYLE = `
.dp-ai-interactive { margin: 0.75rem 0; max-width: 100%; }
.dp-ai-interactive details { margin: 0 0 8px; border: 1px solid rgba(16,42,67,.14); border-radius: 10px; overflow: hidden; }
.dp-ai-interactive summary { cursor: pointer; padding: 10px 12px; font-weight: 700; }
.dp-ai-interactive details[open] summary { border-bottom: 1px solid rgba(16,42,67,.1); }
.dp-ai-interactive details > *:not(summary) { padding: 10px 12px; }
.dp-ai-interactive--tabs input[type=radio] { position: absolute; width: 1px; height: 1px; opacity: 0; clip: rect(0,0,0,0); }
.dp-ai-interactive--tabs input[type=radio] + label { display: inline-block; margin: 0 6px 8px 0; padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(16,42,67,.14); cursor: pointer; }
.dp-ai-interactive--tabs input[type=radio]:checked + label { font-weight: 700; border-color: rgba(15,108,191,.65); background: rgba(15,108,191,.08); }
.dp-ai-interactive--tabs input[type=radio] + label + * { display: none; margin: 0 0 12px; padding: 10px 12px; border: 1px solid rgba(16,42,67,.12); border-radius: 10px; }
.dp-ai-interactive--tabs input[type=radio]:checked + label + * { display: block; }
.dp-ai-interactive--timeline { border-left: 3px solid rgba(15,108,191,.35); padding-left: 16px; }
.dp-ai-interactive--comparison, .dp-ai-interactive--cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; }
.dp-ai-interactive--comparison > *, .dp-ai-interactive--cards > * { border: 1px solid rgba(16,42,67,.14); border-radius: 10px; padding: 12px; }
.dp-ai-interactive--callouts > * { margin: 0 0 10px; padding: 12px; border-radius: 10px; border-left: 4px solid rgba(15,108,191,.65); background: rgba(15,108,191,.06); }
.dp-ai-interactive--checklist label { display: flex; align-items: flex-start; gap: 8px; margin: 0 0 8px; }
.dp-ai-interactive--quiz > * { margin: 0 0 12px; padding: 12px; border: 1px solid rgba(16,42,67,.14); border-radius: 10px; }
`;

/**
 * Put the Extender button in its own first-row group.
 * Compact editors (course summary) hide extra "content" buttons behind "...".
 *
 * @param {Array|*} toolbar
 * @returns {Array|*}
 */
const placeOpenButton = (toolbar) => {
    if (!Array.isArray(toolbar)) {
        return addToolbarButtons(toolbar, 'content', [openButtonName]);
    }

    const nextToolbar = JSON.parse(JSON.stringify(toolbar));
    const alreadyPlaced = nextToolbar.some((section) =>
        Array.isArray(section?.items) && section.items.includes(openButtonName)
    );
    if (alreadyPlaced) {
        return nextToolbar;
    }

    const firstGroup = nextToolbar[0]?.name || 'history';
    addToolbarSection(nextToolbar, 'haccgen', firstGroup, false);
    return addToolbarButtons(nextToolbar, 'haccgen', [openButtonName]);
};

export const configure = (instanceConfig) => {
    // Always-visible toolbar button (first row, including compact course-summary editors)
    let toolbar = placeOpenButton(instanceConfig.toolbar);

    // Menubar item
    let menu = instanceConfig.menu;
    menu = addMenubarItem(menu, 'tools', [openMenuItemName].join(' '));

    // NEW: Selection toolbar button (shows only when text is selected)
    const quickbars_selection_toolbar = addQuickbarsToolbarItem(
        instanceConfig.quickbars_selection_toolbar === false ? undefined : instanceConfig.quickbars_selection_toolbar,
        '|',
        selectionButtonName
    );

    return {
        toolbar,
        menu,
        quickbars_selection_toolbar,
        content_style: (instanceConfig.content_style || '') + INTERACTIVE_CONTENT_STYLE,
        extended_valid_elements: instanceConfig.extended_valid_elements
            ? `${instanceConfig.extended_valid_elements},${INTERACTIVE_VALID_ELEMENTS}`
            : INTERACTIVE_VALID_ELEMENTS,
    };
};
