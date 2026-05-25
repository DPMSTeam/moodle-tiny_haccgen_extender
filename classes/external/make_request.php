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
require_once($CFG->libdir . '/filelib.php');
use context_system;

/**
 * Proxies AI / generation requests from the editor to a configured upstream endpoint.
 *
 * @package    tiny_haccgen_extender
 * @copyright 2026, Dynamic Pixel
 *
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class make_request extends \external_api {
    /**
     * LMS base URL for Subscription Manager (must match local_subscription_clients.lms_url).
     * Uses $CFG->wwwroot when set; otherwise rebuilds from the current HTTP request (AJAX on this site).
     *
     * @return string Base URL without trailing slash.
     */
    private static function resolve_lms_base_url_for_payload(): string {
        global $CFG;
        $root = isset($CFG->wwwroot) ? trim((string) $CFG->wwwroot) : '';
        if ($root !== '') {
            return rtrim($root, '/');
        }
        $scheme = 'http';
        if (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') {
            $scheme = 'https';
        } else if (
            !empty($_SERVER['HTTP_X_FORWARDED_PROTO']) &&
            stripos((string) $_SERVER['HTTP_X_FORWARDED_PROTO'], 'https') !== false
        ) {
            $scheme = 'https';
        }
        $host = trim((string) (
            $_SERVER['HTTP_X_FORWARDED_HOST'] ?? $_SERVER['HTTP_HOST'] ?? $_SERVER['SERVER_NAME'] ?? ''
        ));
        if ($host === '') {
            return '';
        }
        $script = (string) ($_SERVER['SCRIPT_NAME'] ?? '');
        $pathbase = '';
        $pos = strpos($script, '/lib/ajax/');
        if ($pos !== false) {
            $pathbase = substr($script, 0, $pos);
        }
        return rtrim($scheme . '://' . $host . $pathbase, '/');
    }

    /**
     * Returns human-readable error text from a Moodle curl instance.
     *
     * @param \curl $curl Curl handle.
     * @return string Error message or empty string.
     */
    private static function moodle_curl_error_text(\curl $curl): string {
        if (property_exists($curl, 'error') && (string) $curl->error !== '') {
            return (string) $curl->error;
        }
        if (method_exists($curl, 'get_error')) {
            return (string) $curl->get_error();
        }
        return '';
    }

    /**
     * Redacts sensitive keys before writing to the PHP error log.
     *
     * @param mixed $data Value to sanitize.
     * @return mixed Sanitized copy.
     */
    private static function sanitize_log_data($data) {
        if (!is_array($data)) {
            return $data;
        }
        $copy = $data;
        foreach (['api_secret', 'api_key'] as $key) {
            if (!empty($copy[$key])) {
                $copy[$key] = '[REDACTED]';
            }
        }
        return $copy;
    }

    /**
     * Logs a truncated snippet through Moodle debugging.
     *
     * @param string $label Log label.
     * @param mixed $data String or encodable value.
     */
    private static function tiny_haccgen_extender_log(string $label, $data): void {
        $max = 2000;
        $data = self::sanitize_log_data($data);
        if (is_string($data)) {
            $snip = mb_substr($data, 0, $max);
        } else {
            $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            $snip = mb_substr((string)$json, 0, $max);
        }

        debugging('[tiny_haccgen_extender] ' . $label . ': ' . $snip, DEBUG_DEVELOPER);
    }

    /**
     * Describes the parameters for execute.
     *
     * @return \external_function_parameters
     */
    public static function execute_parameters(): \external_function_parameters {
        return new \external_function_parameters([
            'purpose' => new \external_value(PARAM_ALPHANUMEXT, 'Purpose key', VALUE_REQUIRED),
            'input' => new \external_value(PARAM_RAW, 'Selected text / input', VALUE_REQUIRED),
            'optionsjson' => new \external_value(PARAM_RAW, 'Options as JSON string', VALUE_DEFAULT, '{}'),
        ]);
    }

    /**
     * Describes the return value for execute.
     *
     * @return \external_single_structure
     */
    public static function execute_returns(): \external_single_structure {
        return new \external_single_structure([
            'code' => new \external_value(PARAM_INT, 'HTTP-like status code'),
            'result' => new \external_value(PARAM_RAW, 'Response text or JSON string'),
        ]);
    }

    /**
     * Validates input, posts JSON to the configured endpoint, and normalises the response.
     *
     * @param string $purpose Purpose key.
     * @param string $input User input or selected text.
     * @param string $optionsjson JSON-encoded options object.
     * @return array Keys code (int) and result (string).
     */
    public static function execute(string $purpose, string $input, string $optionsjson = '{}'): array {
        $params = self::validate_parameters(self::execute_parameters(), [
            'purpose' => $purpose,
            'input' => $input,
            'optionsjson' => $optionsjson,
        ]);

        $ctx = context_system::instance();
        self::validate_context($ctx);
        require_capability('tiny/haccgen_extender:use', $ctx);

        $isavataroptions = in_array($params['purpose'], ['avatar_generation_options', 'avatargen_options'], true);
        $isvideooptions = in_array($params['purpose'], ['video_generation_options', 'videogen_options'], true);
        $isoptionspurpose = $isavataroptions || $isvideooptions;
        $optionsfallback = function() use ($isavataroptions): array {
            if ($isavataroptions) {
                return [
                    'avatar_id' => [['id' => '__no_avatar__', 'name' => 'No avatars available']],
                    'voice_id' => [['id' => '__no_voice__', 'name' => 'No voices available']],
                    'video_style_id' => [
                        ['id' => 'normal', 'name' => 'Normal'],
                        ['id' => 'closeUp', 'name' => 'Close up'],
                    ],
                    'output_format' => [
                        ['id' => 'mp4', 'name' => 'MP4'],
                        ['id' => 'webm', 'name' => 'WebM'],
                    ],
                    'resolution' => [
                        ['id' => '1280x720', 'name' => '720p (1280x720)'],
                        ['id' => '1920x1080', 'name' => '1080p (1920x1080)'],
                    ],
                ];
            }
            return [
                'language' => [['id' => 'en', 'name' => 'English']],
                'voice_id' => [['id' => '__default_voice__', 'name' => 'Default (auto)']],
                'fonts' => [['id' => '__default_font__', 'name' => 'Default']],
                'aspect_ratios' => [
                    ['id' => '16:9', 'name' => '16:9 (Landscape)'],
                    ['id' => '9:16', 'name' => '9:16 (Portrait)'],
                    ['id' => '1:1', 'name' => '1:1 (Square)'],
                ],
                'output_format' => [
                    ['id' => 'mp4', 'name' => 'MP4'],
                    ['id' => 'webm', 'name' => 'WebM'],
                ],
            ];
        };

        $endpoint = (string) get_config('tiny_haccgen_extender', 'endpointurl');
        $subkey   = (string) get_config('tiny_haccgen_extender', 'subscription_api_key');
        $subsec   = (string) get_config('tiny_haccgen_extender', 'subscription_api_secret');
        $timeout = (int) (get_config('tiny_haccgen_extender', 'timeout') ?: 660);

        if (empty($endpoint)) {
            if ($isoptionspurpose) {
                return ['code' => 200, 'result' => json_encode($optionsfallback(), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)];
            }
            return [
                'code' => 500,
                'result' => json_encode(['message' => get_string('err_endpoint_not_configured', 'tiny_haccgen_extender')]),
            ];
        }

        // If this is Subscription Manager AI endpoint, subscription credentials are mandatory (per-LMS unique secret).
        $issubscriptionmanagerai = (stripos($endpoint, '/local/subscription_manager/ai_endpoint.php') !== false);
        if ($issubscriptionmanagerai && (empty($subkey) || empty($subsec))) {
            if ($isoptionspurpose) {
                return ['code' => 200, 'result' => json_encode($optionsfallback(), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)];
            }
            return [
                'code' => 500,
                'result' => json_encode([
                    'message' => get_string('err_subscription_credentials_missing', 'tiny_haccgen_extender'),
                ]),
            ];
        }

        $allowed = (string) get_config('tiny_haccgen_extender', 'allowedpurposes');
        $allowed = array_filter(array_map('trim', explode(',', $allowed)));
        if (!empty($allowed) && !in_array($params['purpose'], $allowed, true)) {
            if ($isoptionspurpose) {
                return ['code' => 200, 'result' => json_encode($optionsfallback(), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)];
            }
            return ['code' => 400, 'result' => json_encode(['message' => 'Purpose not allowed'])];
        }

        $options = json_decode($params['optionsjson'], true);
        if ($params['optionsjson'] !== '{}' && $options === null && json_last_error() !== JSON_ERROR_NONE) {
            if ($isoptionspurpose) {
                return ['code' => 200, 'result' => json_encode($optionsfallback(), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)];
            }
            return ['code' => 400, 'result' => json_encode(['message' => 'Invalid options JSON'])];
        }
        if (!is_array($options)) {
            $options = [];
        }
        $mediapurposes = [
            'create_audio',
            'image_generation',
            'videogen',
            'avatar_generation',
            'infograph_image_generation',
        ];
        if (in_array($params['purpose'], $mediapurposes, true)) {
            $itemid = isset($options['itemid']) ? (int)$options['itemid'] : 0;
            if ($itemid <= 0) {
                $itemid = (int) file_get_unused_draft_itemid();
                self::tiny_haccgen_extender_log('REQUEST itemid injected', [
                    'purpose' => $params['purpose'],
                    'itemid' => $itemid,
                ]);
            }
            $options['itemid'] = $itemid;
        }

        $payload = [
            'purpose' => $params['purpose'],
            'input' => $params['input'],
            'options' => (object) $options,
        ];
        if (!empty($subkey) && !empty($subsec)) {
            $payload['api_key'] = $subkey;
            $payload['api_secret'] = $subsec;
            $payload['lms_url'] = self::resolve_lms_base_url_for_payload();
            $payload['plugin_identifier'] = 'haccgen_extender';
        }

        $curl = new \curl();
        $headers = ['Content-Type: application/json'];
        if ($issubscriptionmanagerai && !empty($payload['lms_url'])) {
            $headers[] = 'X-LMS-URL: ' . $payload['lms_url'];
        }
        $curl->setHeader($headers);
        $curl->setopt(['CURLOPT_TIMEOUT' => $timeout]);
        self::tiny_haccgen_extender_log('REQUEST endpoint', $endpoint);
        self::tiny_haccgen_extender_log('REQUEST payload', $payload);

        $raw = $curl->post($endpoint, json_encode($payload));

        if ($curl->get_errno()) {
            $cerr = self::moodle_curl_error_text($curl);
            $curlerr = $curl->get_errno() . ': ' . ($cerr !== '' ? $cerr : 'Unknown error');
            self::tiny_haccgen_extender_log('REQUEST curl error', $curlerr);
            $msg = (stripos($cerr, 'timeout') !== false)
                ? 'Upstream request timed out (video generation can take several minutes).'
                : 'Upstream request failed.';
            if ($isoptionspurpose) {
                return ['code' => 200, 'result' => json_encode($optionsfallback(), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)];
            }
            return ['code' => 502, 'result' => json_encode(['message' => $msg])];
        }

        self::tiny_haccgen_extender_log('RESPONSE raw', $raw);
        $decoded = json_decode($raw, true);
        self::tiny_haccgen_extender_log('RESPONSE json_last_error', json_last_error_msg());

        if (is_array($decoded)) {
            self::tiny_haccgen_extender_log('RESPONSE decoded_keys', array_keys($decoded));

            // Useful: lengths and counts for huge option payloads.
            $out = $decoded['outputText'] ?? $decoded['output'] ?? $decoded['result'] ?? null;

            self::tiny_haccgen_extender_log('RESPONSE code/provider/purpose', [
                'code' => $decoded['code'] ?? null,
                'purpose' => $decoded['purpose'] ?? null,
                'provider' => $decoded['provider'] ?? null,
            ]);

            if (is_string($out)) {
                self::tiny_haccgen_extender_log('RESPONSE output_len', strlen($out));
            } else {
                self::tiny_haccgen_extender_log('RESPONSE output_type', gettype($out));
            }

            $logoptionssummary = function(array $opts, string $purpose): void {
                self::tiny_haccgen_extender_log('OPTIONS purpose', $purpose);
                self::tiny_haccgen_extender_log('OPTIONS counts', [
                    'avatar_id' => isset($opts['avatar_id']) && is_array($opts['avatar_id'])
                        ? count($opts['avatar_id']) : null,
                    'voice_id' => isset($opts['voice_id']) && is_array($opts['voice_id'])
                        ? count($opts['voice_id']) : null,
                    'video_style_id' => isset($opts['video_style_id']) && is_array($opts['video_style_id'])
                        ? count($opts['video_style_id']) : null,
                    'output_format' => isset($opts['output_format']) && is_array($opts['output_format'])
                        ? count($opts['output_format']) : null,
                    'resolution' => isset($opts['resolution']) && is_array($opts['resolution'])
                        ? count($opts['resolution']) : null,
                    'language' => isset($opts['language']) && is_array($opts['language'])
                        ? count($opts['language']) : null,
                    'fonts' => isset($opts['fonts']) && is_array($opts['fonts'])
                        ? count($opts['fonts']) : null,
                    'aspect_ratios' => isset($opts['aspect_ratios']) && is_array($opts['aspect_ratios'])
                        ? count($opts['aspect_ratios']) : null,
                ]);
                self::tiny_haccgen_extender_log('OPTIONS samples', [
                    'avatar_sample' => array_slice($opts['avatar_id'] ?? [], 0, 3),
                    'voice_sample' => array_slice($opts['voice_id'] ?? [], 0, 3),
                    'style_sample' => array_slice($opts['video_style_id'] ?? [], 0, 3),
                    'format_sample' => array_slice($opts['output_format'] ?? [], 0, 3),
                    'resolution_sample' => array_slice($opts['resolution'] ?? [], 0, 3),
                    'language_sample' => array_slice($opts['language'] ?? [], 0, 3),
                    'fonts_sample' => array_slice($opts['fonts'] ?? [], 0, 3),
                    'aspect_sample' => array_slice($opts['aspect_ratios'] ?? [], 0, 3),
                ]);
            };

            // Error from upstream: pass through code and message.
            $err = $decoded['error'] ?? null;
            if (!empty($err) && !$isavataroptions && !$isvideooptions) {
                $msg = is_array($err) && isset($err['message']) ? (string) $err['message'] : (string) $err;
                $code = (int) ($decoded['code'] ?? 500);
                if ($code < 100 || $code > 599) {
                    $code = 500;
                }
                return ['code' => $code, 'result' => json_encode(['message' => $msg])];
            }

            $code = (int) ($decoded['code'] ?? 200);
            if ($code < 100 || $code > 599) {
                $code = 200;
            }

            if ($isavataroptions || $isvideooptions) {
                $opts = null;
                if (is_array($out)) {
                    $opts = $out;
                } else if (is_string($out) && trim($out) !== '') {
                    $tmp = json_decode($out, true);
                    if (is_array($tmp)) {
                        $opts = $tmp;
                    }
                }

                if (!is_array($opts)) {
                    $fallback = $decoded['result'] ?? $decoded['outputText'] ?? null;
                    if (is_array($fallback)) {
                        $opts = $fallback;
                    } else if (is_string($fallback) && trim($fallback) !== '') {
                        $tmp = json_decode($fallback, true);
                        if (is_array($tmp)) {
                            $opts = $tmp;
                        }
                    }
                }

                if (!is_array($opts)) {
                    self::tiny_haccgen_extender_log('OPTIONS fallback', 'unable to parse upstream options payload');
                    $opts = $optionsfallback();
                }

                $normalizelist = function($list, array $idkeys = ['id', 'value'], array $namekeys = ['name', 'text', 'label']) {
                    $outlist = [];
                    if (!is_array($list)) {
                        return $outlist;
                    }
                    foreach ($list as $item) {
                        if (is_string($item) || is_numeric($item)) {
                            $v = trim((string)$item);
                            if ($v !== '') {
                                $outlist[] = ['id' => $v, 'name' => $v];
                            }
                            continue;
                        }
                        if (!is_array($item)) {
                            continue;
                        }
                        $id = '';
                        foreach ($idkeys as $k) {
                            if (isset($item[$k]) && (is_string($item[$k]) || is_numeric($item[$k]))) {
                                $id = trim((string)$item[$k]);
                                if ($id !== '') {
                                    break;
                                }
                            }
                        }
                        if ($id === '') {
                            continue;
                        }
                        $name = '';
                        foreach ($namekeys as $k) {
                            if (isset($item[$k]) && (is_string($item[$k]) || is_numeric($item[$k]))) {
                                $name = trim((string)$item[$k]);
                                if ($name !== '') {
                                    break;
                                }
                            }
                        }
                        $outlist[] = ['id' => $id, 'name' => ($name !== '' ? $name : $id)];
                    }
                    return $outlist;
                };

                if ($isavataroptions) {
                    $opts['avatar_id'] = $normalizelist($opts['avatar_id'] ?? [], ['id', 'avatar_id', 'value'], ['name', 'avatar_name', 'text', 'label']);
                    $opts['voice_id'] = $normalizelist($opts['voice_id'] ?? [], ['id', 'voice_id', 'voiceId', 'value'], ['name', 'text', 'label']);
                    $opts['video_style_id'] = $normalizelist($opts['video_style_id'] ?? [], ['id', 'value'], ['name', 'text', 'label']);
                    $opts['output_format'] = $normalizelist($opts['output_format'] ?? [], ['id', 'value'], ['name', 'text', 'label']);
                    $opts['resolution'] = $normalizelist($opts['resolution'] ?? [], ['id', 'value'], ['name', 'text', 'label']);

                    if (empty($opts['video_style_id'])) {
                        $opts['video_style_id'] = [
                            ['id' => 'normal', 'name' => 'Normal'],
                            ['id' => 'closeUp', 'name' => 'Close up'],
                        ];
                    }
                    if (empty($opts['output_format'])) {
                        $opts['output_format'] = [
                            ['id' => 'mp4', 'name' => 'MP4'],
                            ['id' => 'webm', 'name' => 'WebM'],
                        ];
                    }
                    if (empty($opts['resolution'])) {
                        $opts['resolution'] = [
                            ['id' => '1280x720', 'name' => '720p (1280x720)'],
                            ['id' => '1920x1080', 'name' => '1080p (1920x1080)'],
                        ];
                    }
                }

                if ($isvideooptions) {
                    $opts['language'] = $normalizelist($opts['language'] ?? [], ['id', 'code', 'languageCode', 'value'], ['name', 'languageName', 'text', 'label']);
                    $opts['voice_id'] = $normalizelist($opts['voice_id'] ?? [], ['id', 'voice_id', 'voiceId', 'value'], ['name', 'displayName', 'text', 'label']);
                    $opts['fonts'] = $normalizelist($opts['fonts'] ?? [], ['id', 'font_id', 'fontId', 'fontName', 'value'], ['name', 'displayName', 'fontName', 'text', 'label']);
                    $opts['aspect_ratios'] = $normalizelist($opts['aspect_ratios'] ?? [], ['id', 'ratio', 'value'], ['name', 'text', 'label']);
                    $opts['output_format'] = $normalizelist($opts['output_format'] ?? [], ['id', 'format', 'value'], ['name', 'text', 'label']);

                    if (empty($opts['language'])) {
                        $opts['language'] = [['id' => 'en', 'name' => 'English']];
                    }
                    if (empty($opts['voice_id'])) {
                        $opts['voice_id'] = [['id' => '__default_voice__', 'name' => 'Default (auto)']];
                    }
                    if (empty($opts['fonts'])) {
                        $opts['fonts'] = [['id' => '__default_font__', 'name' => 'Default']];
                    }
                    if (empty($opts['aspect_ratios'])) {
                        $opts['aspect_ratios'] = [
                            ['id' => '16:9', 'name' => '16:9 (Landscape)'],
                            ['id' => '9:16', 'name' => '9:16 (Portrait)'],
                            ['id' => '1:1', 'name' => '1:1 (Square)'],
                        ];
                    }
                    if (empty($opts['output_format'])) {
                        $opts['output_format'] = [
                            ['id' => 'mp4', 'name' => 'MP4'],
                            ['id' => 'webm', 'name' => 'WebM'],
                        ];
                    }
                }
                $logoptionssummary($opts, $params['purpose']);

                return [
                    'code' => $code,
                    'result' => json_encode($opts, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                ];
            }

            // When response includes media (e.g. image_generation), pass full response so frontend gets media[].url.
            $media = $decoded['media'] ?? null;
            if (is_array($media) && count($media) > 0) {
                $result = json_encode($decoded, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            } else {
                $result = is_string($out) ? $out : (string) $raw;
            }
            return ['code' => $code, 'result' => $result];
        }

        if (in_array($params['purpose'], ['avatar_generation_options', 'avatargen_options'], true)) {
            return ['code' => 200, 'result' => json_encode($optionsfallback(), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)];
        }
        if (in_array($params['purpose'], ['video_generation_options', 'videogen_options'], true)) {
            return ['code' => 200, 'result' => json_encode($optionsfallback(), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)];
        }

        return ['code' => 200, 'result' => (string) $raw];
    }
}
