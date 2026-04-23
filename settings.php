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
 * Admin settings for tiny_haccgen_extender.
 *
 * @package tiny_haccgen_extender
 * @copyright 2026, Dynamic Pixel
 * @author Aman Das
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

global $CFG;
require_once($CFG->dirroot . '/lib/adminlib.php');

if ($ADMIN->fulltree) {
    // IMPORTANT: Do NOT call $ADMIN->add(...) in a Tiny subplugin settings.php.
    // tiny_haccgen_extender will load this file and add $settings for you.
    $settings = new admin_settingpage(
        'tiny_haccgen_extender_settings',
        new lang_string('settings', 'tiny_haccgen_extender')
    );

    $settings->add(new admin_setting_configtext(
        'tiny_haccgen_extender/endpointurl',
        get_string('setting_endpointurl', 'tiny_haccgen_extender'),
        get_string('setting_endpointurl_desc', 'tiny_haccgen_extender'),
        '',
        PARAM_URL
    ));

    $settings->add(new admin_setting_heading(
        'tiny_haccgen_extender/subscription_credentials_info',
        get_string('setting_subscription_credentials_heading', 'tiny_haccgen_extender'),
        get_string('setting_subscription_credentials_intro', 'tiny_haccgen_extender')
    ));

    // Subscription Manager client credentials (required when endpoint is Subscription Manager AI).
    $settings->add(new admin_setting_configtext(
        'tiny_haccgen_extender/subscription_api_key',
        get_string('setting_subscription_api_key', 'tiny_haccgen_extender'),
        get_string('setting_subscription_api_key_desc', 'tiny_haccgen_extender'),
        '',
        PARAM_TEXT
    ));

    $settings->add(new admin_setting_configpasswordunmask(
        'tiny_haccgen_extender/subscription_api_secret',
        get_string('setting_subscription_api_secret', 'tiny_haccgen_extender'),
        get_string('setting_subscription_api_secret_desc', 'tiny_haccgen_extender'),
        ''
    ));

    $settings->add(new \tiny_haccgen_extender\local\admin_setting_subscription_usage_summary());

    $settings->add(new admin_setting_configtext(
        'tiny_haccgen_extender/timeout',
        get_string('setting_timeout', 'tiny_haccgen_extender'),
        get_string('setting_timeout_desc', 'tiny_haccgen_extender'),
        '660',
        PARAM_INT
    ));

    $settings->add(new admin_setting_configtext(
        'tiny_haccgen_extender/allowedpurposes',
        get_string('setting_allowedpurposes', 'tiny_haccgen_extender'),
        get_string('setting_allowedpurposes_desc', 'tiny_haccgen_extender'),
        '',
        PARAM_RAW_TRIMMED
    ));
}
