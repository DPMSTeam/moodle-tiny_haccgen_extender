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

namespace tiny_haccgen_extender\local;

/**
 * Append-only caption diagnostics.
 *
 * The file is $CFG->dataroot/tiny_haccgen_extender/captions.log.
 *
 * @package    tiny_haccgen_extender
 * @copyright  2026, Dynamic Pixel
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class debug_log {
    /**
     * Write one diagnostic line. Failures here must not affect media handling.
     *
     * @param string $message Single-line message.
     * @return void
     */
    public static function write(string $message): void {
        global $CFG, $USER;

        try {
            $dir = $CFG->dataroot . '/tiny_haccgen_extender';
            if (!is_dir($dir)) {
                make_writable_directory($dir);
            }
            $clean = str_replace(["\r", "\n"], ' | ', $message);
            if (strlen($clean) > 4000) {
                $clean = substr($clean, 0, 4000) . '...';
            }
            $userid = !empty($USER->id) ? (int)$USER->id : 0;
            $line = gmdate('Y-m-d H:i:s') . 'Z uid=' . $userid . ' ' . $clean . PHP_EOL;
            file_put_contents($dir . '/captions.log', $line, FILE_APPEND | LOCK_EX);
        } catch (\Throwable $e) {
            debugging('tiny_haccgen_extender caption log failed: ' . $e->getMessage(), DEBUG_DEVELOPER);
        }
    }
}
