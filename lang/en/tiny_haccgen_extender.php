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
 * English language strings for tiny_haccgen_extender.
 *
 * @package tiny_haccgen_extender
 * @copyright 2026, Dynamic Pixel
 * @author Aman Das
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

$string['btn_cancel'] = 'Cancel';
$string['btn_run'] = 'Run';
$string['button_open'] = 'Haccgen';
$string['err_bad_options'] = 'Options must be valid JSON.';
$string['err_endpoint_not_configured'] = 'Endpoint URL is not configured.';
$string['err_no_selection'] = 'Please select some text first.';
$string['err_subscription_credentials_missing'] = 'Subscription Manager API key/secret are required. Ask your admin to create a subscription and copy the API key and API secret here.';
$string['field_options'] = 'Options (JSON)';
$string['field_preview'] = 'Input preview';
$string['field_purpose'] = 'What do you want to do?';
$string['generation_time_label'] = 'Generated in';
$string['generating'] = 'Generating...';
$string['loading_opening_tool'] = 'Opening…';
$string['menu_open'] = 'Haccgen';
$string['menu_tools'] = 'Haccgen tools';
$string['modal_title'] = 'Haccgen extender';
$string['pluginname'] = 'Haccgen extender';
$string['privacy:metadata'] = 'The Haccgen extender plugin does not store any personal data.';
$string['result_dialog_title'] = 'Haccgen suggestion';
$string['result_shown_in_label'] = 'Result shown in';
$string['setting_allowedpurposes'] = 'Allowed purposes (comma-separated)';
$string['setting_allowedpurposes_desc'] = 'Optional. If set, only these features will be enabled (comma-separated purpose keys). Leave empty to allow all.';
$string['setting_endpointurl'] = 'Endpoint URL';
$string['setting_endpointurl_desc'] = 'Paste the Subscription Manager AI endpoint URL (example: /local/subscription_manager/ai_endpoint.php).';
$string['setting_subscription_api_key'] = 'Subscription Manager API key';
$string['setting_subscription_api_key_desc'] = 'Paste the API key from the Subscription Manager subscription for this LMS.';
$string['setting_subscription_api_secret'] = 'Subscription Manager API secret';
$string['setting_subscription_api_secret_desc'] = 'Paste the API secret from the Subscription Manager subscription for this LMS.';
$string['setting_subscription_credentials_heading'] = 'Where to get API credentials';
$string['setting_subscription_credentials_intro'] = '<div style="background:#f1f4f8;padding:15px;border-radius:8px;border:1px solid #dce3ea;margin-bottom:12px;">
    <p style="font-size:14px;margin:0 0 12px;">
        To use <strong>Haccgen extender</strong> with Subscription Manager, generate your
        <strong>API key</strong> and <strong>API secret</strong> from the HACCGEN dashboard (same as for the main Haccgen plugin).
        For setup help, see the
        <a href="https://docs.google.com/document/d/1f31ttH_NXGp0Suc5JiqLrSkVYNOuoy4XnJb2px0oKUw/edit?usp=sharing" target="_blank" rel="noreferrer noopener"
           style="color:#0056d2;font-weight:600;text-decoration:underline;">
           installation and setup tutorial
        </a>.
    </p>
    <div>
        <a href="https://subscription.dynamicpixel.co.in/" target="_blank" rel="noreferrer noopener"
           style="display:inline-block;background:#0056d2;color:#fff!important;
                  padding:10px 18px;border-radius:5px;text-decoration:none;
                  font-weight:600;box-shadow:0px 2px 5px rgba(0,0,0,0.1);">
            Get API credentials
        </a>
    </div>
</div>';
$string['setting_subscription_usage_desc'] = 'Current usage and limits for this LMS according to Subscription Manager (same credentials as above). Refreshed when you open this page.';
$string['setting_subscription_usage_fetch_failed'] = 'Could not load usage from Subscription Manager.';
$string['setting_subscription_usage_heading'] = 'Subscription usage (this site)';
$string['setting_subscription_usage_hint_old_sm'] = 'Upload the latest local_subscription_manager plugin (includes subscription_usage_endpoint.php and an updated ai_endpoint.php).';
$string['setting_subscription_usage_no_creds'] = 'Save a valid API key and API secret above to load usage.';
$string['setting_subscription_usage_not_sm'] = 'Usage summary is available when the endpoint URL points to Subscription Manager (ai_endpoint.php or subscription_usage_endpoint.php).';
$string['setting_subscription_usage_note'] = 'Figures apply to this site\'s subscription (shared across all editor users), not per individual user.';
$string['setting_timeout'] = 'Timeout (seconds)';
$string['setting_timeout_desc'] = 'How long to wait for a response before failing the request.';
$string['settings'] = 'Settings';
$string['usage_col_limit'] = 'Limit';
$string['usage_col_type'] = 'Type';
$string['usage_col_used'] = 'Used';
$string['usage_type_audio'] = 'Audio (seconds)';
$string['usage_type_image'] = 'Images';
$string['usage_type_video'] = 'Video (seconds)';
$string['usage_type_word'] = 'Words (text AI)';
$string['usage_unlimited'] = 'Unlimited';
