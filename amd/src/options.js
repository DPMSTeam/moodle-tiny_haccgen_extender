/**
 * TinyMCE haccgen_extender plugin options.
 * @module tiny_haccgen_extender/plugins/haccgen_extender/options
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
