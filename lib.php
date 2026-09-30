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
 * Plugin file serving for tiny_haccgen_extender.
 *
 * @package    tiny_haccgen_extender
 * @copyright  2026, Dynamic Pixel
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

/**
 * Serves files stored by the media localiser.
 *
 * @param stdClass $course Course object.
 * @param stdClass|null $cm Course module.
 * @param context $context File context.
 * @param string $filearea File area.
 * @param array $args Path arguments.
 * @param bool $forcedownload Force download.
 * @param array $options Extra options.
 * @return bool
 */
function tiny_haccgen_extender_pluginfile(
    $course,
    $cm,
    $context,
    $filearea,
    $args,
    $forcedownload,
    array $options = []
) {
    if ($filearea !== 'uploads') {
        return false;
    }

    if ($context->contextlevel == CONTEXT_COURSE) {
        require_course_login($course);
    } else if ($context->contextlevel == CONTEXT_SYSTEM) {
        require_login();
    } else {
        return false;
    }

    $itemid = (int)array_shift($args);
    $filename = array_pop($args);
    if ($itemid < 1 || $filename === null || $filename === '') {
        return false;
    }
    $filepath = empty($args) ? '/' : '/' . implode('/', $args) . '/';

    $fs = get_file_storage();
    $file = $fs->get_file($context->id, 'tiny_haccgen_extender', 'uploads', $itemid, $filepath, $filename);
    $captionfile = (bool)preg_match('/\.(vtt|srt)$/i', (string)$filename);
    if ($captionfile) {
        \tiny_haccgen_extender\local\debug_log::write(
            'pluginfile itemid=' . $itemid
            . ' file=' . $filename
            . ' found=' . (($file && !$file->is_directory()) ? 'yes' : 'no')
            . ' mime=' . (($file && !$file->is_directory()) ? $file->get_mimetype() : '')
        );
    }
    if (!$file || $file->is_directory()) {
        send_file_not_found();
    }

    send_stored_file($file, 0, 0, $forcedownload, $options);
}
