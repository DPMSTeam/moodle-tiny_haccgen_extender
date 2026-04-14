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

namespace tiny_haccgen_extender;

use context;
use editor_tiny\plugin;
use editor_tiny\plugin_with_configuration;

/**
 * Haccgen extender plugin integration for the Tiny editor.
 *
 * @package tiny_haccgen_extender
 * @copyright 2026, Dynamic Pixel
 * @author Aman Das
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class plugininfo extends plugin implements plugin_with_configuration {

    /**
     * Returns configuration consumed by the plugin JavaScript for this context.
     *
     * @param context $context Context.
     * @param array $options Options passed by the editor.
     * @param array $fpoptions File picker options.
     * @param \editor_tiny\editor|null $editor Editor instance.
     * @return array Configuration for the frontend.
     */
    public static function get_plugin_configuration_for_context(
        context $context,
        array $options,
        array $fpoptions,
        ?\editor_tiny\editor $editor = null
    ): array {
        // Server-side config that JS may need (safe to expose).
        $allowed = (string) get_config('tiny_haccgen_extender', 'allowedpurposes');
        $allowed = array_filter(array_map('trim', explode(',', $allowed)));
        // Tiny expects an object for this option; pass key => true for each allowed purpose. Empty = {} not [].
        $allowedpurposesobject = count($allowed) > 0
            ? array_fill_keys(array_values($allowed), true)
            : (object) [];

        return [
            'allowedPurposes' => $allowedpurposesobject,
        ];
    }
}
