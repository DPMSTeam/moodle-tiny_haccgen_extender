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
