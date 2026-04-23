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
 * TinyMCE haccgen_extender plugin options.
 * @module tiny_haccgen_extender/plugins/haccgen_extender/options
 * @copyright 2026, Dynamic Pixel
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import {getPluginOptionName} from 'editor_tiny/options';
import {pluginName as pluginFullName} from './common';

const getPluginOptionNameSafe = (pluginname, optionname) => {
    if (typeof getPluginOptionName === 'function') {
        return getPluginOptionName(pluginname, optionname);
    }
    // Fallback for stale/mismatched AMD caches.
    return `${String(pluginname).replace(/\//g, '_')}_${optionname}`;
};

const allowedPurposesName = getPluginOptionNameSafe(pluginFullName, 'allowedPurposes');

/**
 * Normalize allowed purposes value to an object (Moodle may pass array or object).
 * @param {Array|Object} value - Raw option value (array or object).
 * @returns {Object} Map of purpose key to true.
 */
function toAllowedPurposesObject(value) {
    if (Array.isArray(value)) {
        return Object.fromEntries(value.map((k) => [String(k), true]));
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        return value;
    }
    return {};
}

export const register = (editor) => {
    editor.options.register(allowedPurposesName, {
        processor: (value) => ({
            value: toAllowedPurposesObject(value),
            valid: true,
        }),
        default: {},
    });
};


export const getAllowedPurposesObject = (editor) => toAllowedPurposesObject(editor.options.get(allowedPurposesName));


export const getAllowedPurposes = (editor) => {
    const obj = getAllowedPurposesObject(editor);
    return Object.keys(obj).filter(k => !!obj[k]);
};
