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
 * Tiny editor command wiring for haccgen extender.
 *
 * @module tiny_haccgen_extender/commands
 * @copyright 2026, Dynamic Pixel
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {getButtonImage} from 'editor_tiny/utils';
import {get_string as getString}  from 'core/str';
import {component, openButtonName, openMenuItemName, selectionButtonName, icon} from './common';
import {openModal} from './ui';

export const getSetup = async() => {
    const [
        buttonTitle,
        menuTitle,
        selectionTitle,
        buttonImage,
    ] = await Promise.all([
        getString('button_open', component),
        getString('menu_open', component),
        getString('button_open', component), // or create a separate lang string for selection
        getButtonImage('icon', component),
    ]);

    return (editor) => {
        editor.ui.registry.addIcon(icon, buttonImage.html);

        // Always-visible toolbar button
        editor.ui.registry.addButton(openButtonName, {
            icon,
            tooltip: buttonTitle,
            onAction: () => openModal(editor),
        });

        // Menu item
        editor.ui.registry.addMenuItem(openMenuItemName, {
            icon,
            text: menuTitle,
            onAction: () => openModal(editor),
        });

        // NEW: Selection-only button (Quickbars)
        editor.ui.registry.addButton(selectionButtonName, {
            icon,
            tooltip: selectionTitle,

            // Optional: disable unless there is a selection
            onSetup: (api) => {
                const update = () => {
                    const selected = editor.selection.getContent({format: 'text'}).trim();
                    api.setEnabled(Boolean(selected));
                };

                editor.on('NodeChange', update);
                update();

                return () => editor.off('NodeChange', update);
            },

            onAction: () => {
                const selectedText = editor.selection.getContent({format: 'text'}).trim();
                // Pass selection to your modal (recommended)
                openModal(editor, {selectedText});
            },
        });
    };
};
