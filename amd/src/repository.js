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
 * AJAX repository calls for tiny_haccgen_extender.
 *
 * @module tiny_haccgen_extender/repository
 * @copyright 2026, Dynamic Pixel
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import { call as fetchMany } from 'core/ajax';

export const makeRequest = (purpose, input, optionsjson) =>
  fetchMany([
    {
      methodname: 'tiny_haccgen_extender_make_request',
      args: { purpose, input, optionsjson },
    },
  ])[0];

export const fetchVideogenOptions = () =>
  fetchMany([
    {
      methodname: 'tiny_haccgen_extender_videogen_options',
      args: {},
    },
  ])[0];

export const localizeMediaToDraft = (url, itemid, kind = 'media', mime = '') =>
  fetchMany([
    {
      methodname: 'tiny_haccgen_extender_localize_media',
      args: { url, itemid, kind, mime },
    },
  ])[0];
