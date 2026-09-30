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
 * Version metadata for tiny_haccgen_extender.
 *
 * Release 1.5 — Interactive elements in the Tiny editor.
 * Supports Moodle 4.1 through Moodle 5.3.
 *
 * @package tiny_haccgen_extender
 * @copyright 2026, Dynamic Pixel
 * @author Aman Das
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

$plugin->component = 'tiny_haccgen_extender';
$plugin->version   = 2026093000;
$plugin->requires  = 2022112800; // Moodle 4.1.
$plugin->supported = [401, 503]; // Moodle 4.1 through Moodle 5.3.
$plugin->maturity  = MATURITY_STABLE;
$plugin->release   = '1.5';
