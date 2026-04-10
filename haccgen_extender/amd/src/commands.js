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
