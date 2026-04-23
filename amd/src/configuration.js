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
import {addMenubarItem, addToolbarButtons, addQuickbarsToolbarItem} from 'editor_tiny/utils';

export const configure = (instanceConfig) => {
    // Normal toolbar button (always available)
    let toolbar = instanceConfig.toolbar;
    toolbar = addToolbarButtons(toolbar, 'content', [openButtonName]);

    // Menubar item
    let menu = instanceConfig.menu;
    menu = addMenubarItem(menu, 'tools', [openMenuItemName].join(' '));

    // NEW: Selection toolbar button (shows only when text is selected)
    const quickbars_selection_toolbar = addQuickbarsToolbarItem(
        instanceConfig.quickbars_selection_toolbar === false ? undefined : instanceConfig.quickbars_selection_toolbar,
        '|',
        selectionButtonName
    );

    return {toolbar, menu, quickbars_selection_toolbar};
};
