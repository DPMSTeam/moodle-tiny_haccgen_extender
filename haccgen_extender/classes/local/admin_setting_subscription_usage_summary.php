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

defined('MOODLE_INTERNAL') || die();

global $CFG;
require_once($CFG->libdir . '/adminlib.php');

/**
 * Read-only Subscription Manager usage summary for the admin settings UI.
 *
 * Renders usage vs limits by calling Subscription Manager endpoints (no AI work).
 *
 * @package    tiny_haccgen_extender
 * @copyright 2026, Dynamic Pixel
 * @author     Aman Das
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class admin_setting_subscription_usage_summary extends \admin_setting {

    /**
     * Constructor.
     */
    public function __construct() {
        parent::__construct(
            'tiny_haccgen_extender/subscription_usage_info',
            get_string('setting_subscription_usage_heading', 'tiny_haccgen_extender'),
            get_string('setting_subscription_usage_desc', 'tiny_haccgen_extender'),
            ''
        );
    }

    /**
     * This setting is display-only; nothing is stored in config.
     *
     * @return null
     */
    public function get_setting() {
        return null;
    }

    /**
     * No-op write (not a persisted setting).
     *
     * @param mixed $data
     * @return string Always empty string on success.
     */
    public function write_setting($data) {
        return '';
    }

    /**
     * Build and return the HTML for the usage summary table or status messages.
     *
     * @param mixed $data
     * @param string $query
     * @return string
     */
    public function output_html($data, $query = '') {
        global $CFG;

        require_once($CFG->libdir . '/tablelib.php');

        $endpoint = (string) get_config('tiny_haccgen_extender', 'endpointurl');
        $subkey = (string) get_config('tiny_haccgen_extender', 'subscription_api_key');
        $subsec = (string) get_config('tiny_haccgen_extender', 'subscription_api_secret');

        $issubscriptionmanager = stripos($endpoint, '/local/subscription_manager/') !== false
            && (stripos($endpoint, 'ai_endpoint.php') !== false || stripos($endpoint, 'subscription_usage_endpoint.php') !== false);
        if ($endpoint === '' || !$issubscriptionmanager) {
            $html = \html_writer::tag('p', get_string('setting_subscription_usage_not_sm', 'tiny_haccgen_extender'),
                ['class' => 'form-text text-muted']);
            return \format_admin_setting($this, $this->name, $html, $this->description, false, '', '', $query, $this->forceltr);
        }
        if ($subkey === '' || $subsec === '') {
            $html = \html_writer::tag('p', get_string('setting_subscription_usage_no_creds', 'tiny_haccgen_extender'),
                ['class' => 'form-text text-warning']);
            return \format_admin_setting($this, $this->name, $html, $this->description, false, '', '', $query, $this->forceltr);
        }

        $lmsurl = rtrim((string) ($CFG->wwwroot ?? ''), '/');
        $basepayload = [
            'api_key' => $subkey,
            'api_secret' => $subsec,
            'lms_url' => $lmsurl,
            'plugin_identifier' => 'haccgen_extender',
        ];

        $trials = [];
        if (stripos($endpoint, 'ai_endpoint.php') !== false) {
            $usageurl = str_ireplace('ai_endpoint.php', 'subscription_usage_endpoint.php', $endpoint);
            if ($usageurl !== $endpoint) {
                $trials[] = ['url' => $usageurl, 'payload' => $basepayload];
            }
        }
        $trials[] = [
            'url' => $endpoint,
            'payload' => array_merge($basepayload, [
                'purpose' => 'subscription_usage_status',
                'input' => '',
                'options' => (object) [],
            ]),
        ];

        $curl = new \curl();
        $curl->setHeader(['Content-Type: application/json', 'X-LMS-URL: ' . $lmsurl]);
        $curl->setopt(['CURLOPT_TIMEOUT' => 15]);

        $decoded = null;
        foreach ($trials as $trial) {
            $raw = $curl->post($trial['url'], json_encode($trial['payload']));
            $decoded = json_decode($raw, true);
            if (is_array($decoded) && (int) ($decoded['code'] ?? 0) === 200 && isset($decoded['usage'])) {
                break;
            }
        }

        if (!is_array($decoded) || (int) ($decoded['code'] ?? 0) !== 200 || !isset($decoded['usage'])) {
            $msg = get_string('setting_subscription_usage_fetch_failed', 'tiny_haccgen_extender');
            if (is_array($decoded) && isset($decoded['error']['message'])) {
                $msg .= ' ' . s((string) $decoded['error']['message']);
                if (stripos((string) $decoded['error']['message'], 'purpose and input') !== false) {
                    $msg .= ' ' . get_string('setting_subscription_usage_hint_old_sm', 'tiny_haccgen_extender');
                }
            }
            $html = \html_writer::tag('p', $msg, ['class' => 'form-text text-danger']);
            return \format_admin_setting($this, $this->name, $html, $this->description, false, '', '', $query, $this->forceltr);
        }

        $usage = $decoded['usage'] ?? [];
        $types = [
            'word' => get_string('usage_type_word', 'tiny_haccgen_extender'),
            'audio' => get_string('usage_type_audio', 'tiny_haccgen_extender'),
            'image' => get_string('usage_type_image', 'tiny_haccgen_extender'),
            'video' => get_string('usage_type_video', 'tiny_haccgen_extender'),
        ];

        $rows = [];
        foreach ($types as $key => $label) {
            $cell = is_array($usage[$key] ?? null) ? $usage[$key] : ['used' => 0, 'limit' => 0];
            $used = (int) ($cell['used'] ?? 0);
            $limit = (int) ($cell['limit'] ?? 0);
            $limittext = $limit > 0 ? (string) $limit : get_string('usage_unlimited', 'tiny_haccgen_extender');
            $rows[] = [$label, (string) $used, $limittext];
        }

        $table = new \html_table();
        $table->attributes['class'] = 'generaltable';
        $table->head = [
            get_string('usage_col_type', 'tiny_haccgen_extender'),
            get_string('usage_col_used', 'tiny_haccgen_extender'),
            get_string('usage_col_limit', 'tiny_haccgen_extender'),
        ];
        $table->data = $rows;

        $html = \html_writer::table($table);
        $html .= \html_writer::tag('p', get_string('setting_subscription_usage_note', 'tiny_haccgen_extender'),
            ['class' => 'form-text text-muted mt-2']);

        return \format_admin_setting($this, $this->name, $html, $this->description, false, '', '', $query, $this->forceltr);
    }
}
