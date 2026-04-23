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

namespace tiny_haccgen_extender\external;

defined('MOODLE_INTERNAL') || die();

global $CFG;
require_once($CFG->libdir . '/externallib.php');

use context_system;
use core\http_client;

/**
 * Web service for cached VideoGen dropdown options.
 *
 * @package    tiny_haccgen_extender
 * @copyright 2026, Dynamic Pixel
 * @author Aman Das
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class videogen_options extends \external_api {

    /**
     * Describes the parameters for execute.
     *
     * @return \external_function_parameters
     */
    public static function execute_parameters(): \external_function_parameters {
        return new \external_function_parameters([]);
    }

    /**
     * Describes the return value for execute.
     *
     * @return \external_single_structure
     */
    public static function execute_returns(): \external_single_structure {
        return new \external_single_structure([
            'code' => new \external_value(PARAM_INT, 'HTTP-like status code'),
            'result' => new \external_value(PARAM_RAW, 'Options JSON string'),
        ]);
    }

    /**
     * Fetches options from middleware, with caching.
     *
     * @return array Status code and JSON result string.
     */
    public static function execute(): array {
        $ctx = context_system::instance();
        self::validate_context($ctx);
        require_capability('tiny/haccgen_extender:use', $ctx);

        // Cache (define in db/caches.php as shown below).
        $cache = \cache::make('tiny_haccgen_extender', 'videogen_options');
        $cachekey = 'opts';

        if ($cached = $cache->get($cachekey)) {
            return ['code' => 200, 'result' => json_encode($cached)];
        }

        $url = trim((string)get_config('tiny_haccgen_extender', 'subscription_url'));
        $timeout = (int)(get_config('tiny_haccgen_extender', 'timeout') ?: 660);

        // Unique header settings (store these in plugin settings).
        $headername  = trim((string)get_config('tiny_haccgen_extender', 'subscription_header_name'));
        $headervalue = trim((string)get_config('tiny_haccgen_extender', 'subscription_header_value'));

        if ($url === '') {
            return ['code' => 500, 'result' => json_encode(['message' => 'subscription_url not configured'])];
        }
        if ($headername === '' || $headervalue === '') {
            return ['code' => 500, 'result' => json_encode(['message' => 'subscription header not configured'])];
        }

        try {
            $client = new http_client(['timeout' => $timeout]);

            $resp = $client->get($url, [
                'headers' => [
                    $headername => $headervalue,
                    'Accept' => 'application/json',
                    'User-Agent' => 'Moodle-tiny_haccgen_extender/1.0',
                ],
            ]);

            $code = $resp->getStatusCode();
            $body = (string)$resp->getBody();

            if ($code < 200 || $code >= 300) {
                return [
                    'code' => $code,
                    'result' => json_encode([
                        'message' => 'Middleware returned non-2xx',
                        'status' => $code,
                        'body' => $body,
                    ]),
                ];
            }

            $json = json_decode($body, true);
            if (json_last_error() !== JSON_ERROR_NONE || !is_array($json)) {
                return [
                    'code' => 500,
                    'result' => json_encode([
                        'message' => 'Invalid JSON from middleware',
                        'error' => json_last_error_msg(),
                        'body' => $body,
                    ]),
                ];
            }

            // Decode option lists from the root object or from the data property when present.
            $opts = $json['data'] ?? $json;

            if (!is_array($opts)) {
                return ['code' => 500, 'result' => json_encode(['message' => 'Middleware data is not an object'])];
            }

            // Optionally enforce required keys exist (soft validation).
            $opts += [
                'language' => [],
                'voice_id' => [],
                'fonts' => [],
                'aspect_ratios' => [
                    ['id' => '16:9', 'name' => '16:9 (Landscape)'],
                    ['id' => '9:16', 'name' => '9:16 (Portrait)'],
                    ['id' => '1:1',  'name' => '1:1 (Square)'],
                ],
                'output_format' => [
                    ['id' => 'mp4', 'name' => 'MP4'],
                    ['id' => 'webm', 'name' => 'WebM'],
                ],
            ];

            // Cache final options payload (decoded array).
            $cache->set($cachekey, $opts);

            return ['code' => 200, 'result' => json_encode($opts)];

        } catch (\Throwable $e) {
            return ['code' => 500, 'result' => json_encode(['message' => $e->getMessage()])];
        }
    }
}
