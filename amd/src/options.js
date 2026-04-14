/**
 * TinyMCE haccgen_extender plugin options.
 * @module editor_tiny/plugins/haccgen_extender/options
 */
import {getPluginOptionName} from 'editor_tiny/options';
import {pluginName as pluginFullName} from './common';

const allowedPurposesName = getPluginOptionName(pluginFullName, 'allowedPurposes');

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
        processor: 'object',
        default: {},
    });
};


export const getAllowedPurposesObject = (editor) => toAllowedPurposesObject(editor.options.get(allowedPurposesName));


export const getAllowedPurposes = (editor) => {
    const obj = getAllowedPurposesObject(editor);
    return Object.keys(obj).filter(k => !!obj[k]);
};
