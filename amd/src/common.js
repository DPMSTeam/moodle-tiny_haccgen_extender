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
 * Shared constants for tiny_haccgen_extender.
 *
 * @module tiny_haccgen_extender/common
 * @copyright 2026, Dynamic Pixel
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define([], function() {
    const component = 'tiny_haccgen_extender';
    const pluginName = component + '/plugin';
    const icon = component;
    const openButtonName = component + '_open';
    const openMenuItemName = component + '_open';
    const selectionButtonName = component + '_selection';
    return {
        component,
        pluginName,
        icon,
        openButtonName,
        openMenuItemName,
        selectionButtonName,
    };
});
