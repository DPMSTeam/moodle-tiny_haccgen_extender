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
use context_user;

/**
 * Download remote media on the server and store into user's draft files.
 *
 * @package    tiny_haccgen_extender
 * @copyright 2026, Dynamic Pixel
 *
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class localize_media extends \external_api {
    /**
     * Parameters for execute.
     *
     * @return \external_function_parameters
     */
    public static function execute_parameters(): \external_function_parameters {
        return new \external_function_parameters([
            'url' => new \external_value(PARAM_RAW_TRIMMED, 'Remote media URL or data URL'),
            'itemid' => new \external_value(PARAM_INT, 'Draft itemid'),
            'kind' => new \external_value(PARAM_ALPHANUMEXT, 'Media kind', VALUE_DEFAULT, 'media'),
            'mime' => new \external_value(PARAM_RAW_TRIMMED, 'Optional mime hint', VALUE_DEFAULT, ''),
        ]);
    }

    /**
     * Return structure for execute.
     *
     * @return \external_single_structure
     */
    public static function execute_returns(): \external_single_structure {
        return new \external_single_structure([
            'code' => new \external_value(PARAM_INT, 'HTTP-like status code'),
            'itemid' => new \external_value(PARAM_INT, 'Effective draft itemid'),
            'url' => new \external_value(PARAM_URL, 'Draft file URL or empty', VALUE_DEFAULT, ''),
            'message' => new \external_value(PARAM_RAW, 'Error message or empty', VALUE_DEFAULT, ''),
        ]);
    }

    /**
     * Downloads URL and stores into user's draft file area.
     *
     * @param string $url Remote URL.
     * @param int $itemid Draft item id.
     * @param string $kind Media kind.
     * @param string $mime Optional mime hint.
     * @return array
     */
    public static function execute(string $url, int $itemid, string $kind = 'media', string $mime = ''): array {
        global $USER;

        $params = self::validate_parameters(self::execute_parameters(), [
            'url' => $url,
            'itemid' => $itemid,
            'kind' => $kind,
            'mime' => $mime,
        ]);

        $ctx = context_system::instance();
        self::validate_context($ctx);
        require_capability('tiny/haccgen_extender:use', $ctx);

        $effectiveitemid = (int)$params['itemid'];
        if ($effectiveitemid <= 0) {
            $effectiveitemid = (int)file_get_unused_draft_itemid();
        }
        if ($effectiveitemid <= 0) {
            return ['code' => 500, 'itemid' => 0, 'url' => '', 'message' => 'Could not allocate draft itemid.'];
        }
        $isdataurl = preg_match('#^data:#i', $params['url']) === 1;
        $ishttpurl = preg_match('#^https?://#i', $params['url']) === 1;
        if (!$isdataurl && !$ishttpurl) {
            return [
                'code' => 400,
                'itemid' => $effectiveitemid,
                'url' => '',
                'message' => 'Only HTTP/HTTPS URLs or data URLs are supported.',
            ];
        }

        $tmpdir = make_temp_directory('tiny_haccgen_extender');
        $tmp = tempnam($tmpdir, 'haccgen_media_');
        if (!$tmp) {
            return ['code' => 500, 'itemid' => $effectiveitemid, 'url' => '', 'message' => 'Could not create temporary file.'];
        }

        try {
            $body = '';
            if ($isdataurl) {
                // Allow mime parameters, e.g. data:audio/L16;rate=24000;base64,...
                if (!preg_match('#^data:([^,]*);base64,(.+)$#si', $params['url'], $m)) {
                    return ['code' => 400, 'itemid' => $effectiveitemid, 'url' => '', 'message' => 'Invalid data URL format.'];
                }
                $mimetypehint = trim((string)($m[1] ?? ''));
                if ($mimetypehint !== '') {
                    $params['mime'] = $mimetypehint;
                }
                $b64 = preg_replace('/\s+/', '', (string)($m[2] ?? ''));
                if ($b64 === '') {
                    return ['code' => 400, 'itemid' => $effectiveitemid, 'url' => '', 'message' => 'Empty data URL payload.'];
                }
                $decoded = base64_decode($b64, true);
                if ($decoded === false || $decoded === '') {
                    return ['code' => 400, 'itemid' => $effectiveitemid, 'url' => '', 'message' => 'Invalid base64 media payload.'];
                }
                // Defensive cap: 25MB decoded payload.
                if (strlen($decoded) > 25 * 1024 * 1024) {
                    return ['code' => 413, 'itemid' => $effectiveitemid, 'url' => '', 'message' => 'Media payload too large.'];
                }
                $body = $decoded;
            } else {
                $curl = new \curl();
                $curl->setopt([
                    'CURLOPT_TIMEOUT' => 120,
                    'CURLOPT_FOLLOWLOCATION' => true,
                ]);

                $body = $curl->get($params['url']);
                if ($curl->get_errno()) {
                    $err = method_exists($curl, 'get_error') ? (string)$curl->get_error() : 'Download failed.';
                    return [
                        'code' => 502,
                        'itemid' => $effectiveitemid,
                        'url' => '',
                        'message' => $err !== '' ? $err : 'Download failed.',
                    ];
                }
                if (!is_string($body) || $body === '') {
                    return ['code' => 502, 'itemid' => $effectiveitemid, 'url' => '', 'message' => 'Downloaded media is empty.'];
                }
            }

            $mimetype = trim((string)$params['mime']);
            $converted = self::maybe_wrap_pcm_as_wav($body, $mimetype);
            $body = $converted['body'];
            $mimetype = $converted['mime'];

            if (file_put_contents($tmp, $body) === false) {
                return [
                    'code' => 500,
                    'itemid' => $effectiveitemid,
                    'url' => '',
                    'message' => 'Could not write temporary media file.',
                ];
            }

            if ($mimetype === '') {
                $finfo = new \finfo(FILEINFO_MIME_TYPE);
                $detected = $finfo->file($tmp);
                if (is_string($detected) && $detected !== '') {
                    $mimetype = $detected;
                }
            }
            $mimetype = trim(explode(';', $mimetype)[0]);
            if ($mimetype === '') {
                $mimetype = 'application/octet-stream';
            }

            $ext = self::extension_for_mime($mimetype, (string)$params['kind']);
            $base = clean_filename($params['kind']) ?: 'media';
            $filename = $base . '_' . time() . '_' . random_int(1000, 9999) . '.' . $ext;

            $userctx = context_user::instance($USER->id);
            $fs = get_file_storage();
            $record = [
                'contextid' => $userctx->id,
                'component' => 'user',
                'filearea' => 'draft',
                'itemid' => $effectiveitemid,
                'filepath' => '/',
                'filename' => $filename,
                'userid' => $USER->id,
                'source' => $ishttpurl ? $params['url'] : 'data-url',
                'author' => fullname($USER),
                'license' => 'allrightsreserved',
            ];
            $fs->create_file_from_pathname($record, $tmp);
            $drafturl = \moodle_url::make_draftfile_url($effectiveitemid, '/', $filename, false)->out(false);

            return ['code' => 200, 'itemid' => $effectiveitemid, 'url' => $drafturl, 'message' => ''];
        } catch (\Throwable $e) {
            return ['code' => 500, 'itemid' => $effectiveitemid, 'url' => '', 'message' => $e->getMessage()];
        } finally {
            @unlink($tmp);
        }
    }

    /**
     * Wrap raw PCM / L16 as a WAV file so browsers can play it.
     *
     * @param string $body Binary payload.
     * @param string $mimetype Full mime, possibly with rate=...
     * @return array{body:string,mime:string}
     */
    private static function maybe_wrap_pcm_as_wav(string $body, string $mimetype): array {
        $m = strtolower($mimetype);
        $ispcm = (strpos($m, 'l16') !== false || strpos($m, 'pcm') !== false || strpos($m, 'audio/raw') !== false);
        if (!$ispcm) {
            return ['body' => $body, 'mime' => $mimetype];
        }
        if (strlen($body) >= 4 && substr($body, 0, 4) === 'RIFF') {
            return ['body' => $body, 'mime' => 'audio/wav'];
        }
        $rate = 24000;
        if (preg_match('/rate=(\d+)/i', $mimetype, $rm)) {
            $rate = (int)$rm[1];
        }
        return ['body' => self::pcm_to_wav($body, $rate), 'mime' => 'audio/wav'];
    }

    /**
     * @param string $pcm Raw 16-bit little-endian PCM.
     * @param int $rate Sample rate.
     * @return string WAV bytes.
     */
    private static function pcm_to_wav(string $pcm, int $rate = 24000): string {
        $datasize = strlen($pcm);
        $blockalign = 2;
        $byterate = $rate * $blockalign;
        $header = 'RIFF' . pack('V', 36 + $datasize) . 'WAVE';
        $header .= 'fmt ' . pack('VvvVVvv', 16, 1, 1, $rate, $byterate, $blockalign, 16);
        $header .= 'data' . pack('V', $datasize);
        return $header . $pcm;
    }

    /**
     * Map a mime type to a file extension. Audio never falls back to .bin.
     *
     * @param string $mimetype Base mime without parameters.
     * @param string $kind audio|image|video|media.
     * @return string
     */
    private static function extension_for_mime(string $mimetype, string $kind): string {
        $m = strtolower($mimetype);
        if (strpos($m, 'ogg') !== false) {
            return 'ogg';
        }
        if (strpos($m, 'wav') !== false || strpos($m, 'l16') !== false
                || strpos($m, 'pcm') !== false || strpos($m, 'audio/raw') !== false) {
            return 'wav';
        }
        if (strpos($m, 'mpeg') !== false || strpos($m, 'mp3') !== false) {
            return 'mp3';
        }
        if (strpos($m, 'm4a') !== false || strpos($m, 'mp4') !== false || strpos($m, 'aac') !== false) {
            return 'm4a';
        }
        if (strpos($m, 'webm') !== false) {
            return 'webm';
        }
        if (strpos($m, 'vtt') !== false || $kind === 'captions') {
            return 'vtt';
        }
        if (strpos($m, 'subrip') !== false || strpos($m, 'srt') !== false) {
            return 'srt';
        }
        if (strpos($m, 'png') !== false) {
            return 'png';
        }
        if (strpos($m, 'jpeg') !== false || strpos($m, 'jpg') !== false) {
            return 'jpg';
        }
        if (strpos($m, 'webp') !== false) {
            return 'webp';
        }
        $ext = (string)mimeinfo('extension', $mimetype);
        if ($ext !== '' && $ext !== 'bin') {
            return $ext;
        }
        if ($kind === 'audio') {
            return 'wav';
        }
        if ($kind === 'image') {
            return 'png';
        }
        if ($kind === 'video') {
            return 'mp4';
        }
        return $ext !== '' ? $ext : 'bin';
    }
}
