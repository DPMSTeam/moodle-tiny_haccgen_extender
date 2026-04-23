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
 * General utility helpers for tiny_haccgen_extender.
 *
 * @module tiny_haccgen_extender/utils
 * @copyright 2026, Dynamic Pixel
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

// amd/src/utils.js
/**
 * Convert unknown error/value into a readable string for Moodle alerts.
 *
 * @param {*} x
 * @returns {string}
 */
export const toAlertText = (x) => {
    if (x === null || x === undefined) {
      return '';
    }
    if (typeof x === 'string') {
      return x;
    }
    if (x instanceof Error) {
      return x.message || String(x);
    }
    if (typeof x === 'object') {
      if (x.message) {
        return String(x.message);
      }
      if (x.error) {
        return String(x.error);
      }
      if (x.exception) {
        return String(x.exception);
      }
      try {
        return JSON.stringify(x, null, 2);
      } catch (e) {
        return String(x);
      }
    }
    return String(x);
  };