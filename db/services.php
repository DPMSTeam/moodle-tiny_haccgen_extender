<?php
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
 * External functions and web service definitions for tiny_haccgen_extender.
 *
 * @package tiny_haccgen_extender
 * @category external
 * @copyright 2026, Dynamic Pixel
 * @author Aman Das
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

$functions = [
    'tiny_haccgen_extender_make_request' => [
        'classname'   => 'tiny_haccgen_extender\\external\\make_request',
        'methodname'  => 'execute',
        'description' => 'Haccgen extender requests to a custom endpoint (purpose/input/options).',
        'type'        => 'read',
        'ajax'        => true,
        'capabilities' => 'tiny/haccgen_extender:use',
    ],
    'tiny_haccgen_extender_videogen_options' => [
        'classname'   => 'tiny_haccgen_extender\\external\\videogen_options',
        'methodname'  => 'execute',
        'classpath'   => '',
        'description' => 'Fetch video generation options from middleware',
        'type'        => 'read',
        'ajax'        => true,
        'capabilities' => 'tiny/haccgen_extender:use',
    ],
    'tiny_haccgen_extender_localize_media' => [
        'classname'   => 'tiny_haccgen_extender\\external\\localize_media',
        'methodname'  => 'execute',
        'description' => 'Download remote media server-side and store in user draft files.',
        'type'        => 'write',
        'ajax'        => true,
        'capabilities' => 'tiny/haccgen_extender:use',
    ],
];
