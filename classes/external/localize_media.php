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

use context_course;
use context_system;

/**
 * Download remote media on the server and store it in a lasting plugin file area.
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
            'url' => new \external_value(PARAM_URL, 'Plugin file URL or empty', VALUE_DEFAULT, ''),
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

        if ((string)$params['kind'] === 'debuglog') {
            \tiny_haccgen_extender\local\debug_log::write('client ' . (string)$params['url']);
            return [
                'code' => 200,
                'itemid' => (int)$params['itemid'],
                'url' => '',
                'message' => '',
            ];
        }
        self::debug_log('localize start kind=' . $params['kind']
            . ' mime=' . $params['mime']
            . ' itemid=' . (int)$params['itemid']
            . ' url=' . self::url_for_log((string)$params['url']));

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
                    self::debug_log('localize download failed kind=' . $params['kind'] . ' ' . $err);
                    return [
                        'code' => 502,
                        'itemid' => $effectiveitemid,
                        'url' => '',
                        'message' => $err !== '' ? $err : 'Download failed.',
                    ];
                }
                if (!is_string($body) || $body === '') {
                    self::debug_log('localize download empty kind=' . $params['kind']);
                    return ['code' => 502, 'itemid' => $effectiveitemid, 'url' => '', 'message' => 'Downloaded media is empty.'];
                }
            }

            $mimetype = trim((string)$params['mime']);
            $converted = self::maybe_wrap_pcm_as_wav($body, $mimetype);
            $body = $converted['body'];
            $mimetype = $converted['mime'];
            if ((string)$params['kind'] === 'captions') {
                $beforemime = $mimetype;
                $caption = self::maybe_convert_caption_to_vtt($body, $mimetype);
                $body = $caption['body'];
                $mimetype = $caption['mime'];
                $prefix = substr(ltrim($body, "\xEF\xBB\xBF \t\r\n"), 0, 40);
                self::debug_log('caption convert before=' . $beforemime
                    . ' after=' . $mimetype
                    . ' bytes=' . strlen($body)
                    . ' prefix=' . str_replace(["\r", "\n"], ' ', $prefix));
            }

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
            $source = $ishttpurl ? (string)$params['url'] : 'data-url';
            if (strlen($source) > 255) {
                $source = substr($source, 0, 255);
            }

            $fs = get_file_storage();
            $record = [
                'filepath' => '/',
                'filename' => $filename,
                'mimetype' => $mimetype,
                'userid' => $USER->id,
                'source' => $source,
                'author' => fullname($USER),
                'license' => 'allrightsreserved',
            ];

            $courseid = self::courseid_from_referer();
            $permanent = null;
            if ($courseid > 1) {
                $permanent = self::store_course_file($fs, $courseid, $record, $tmp);
            }
            if ($permanent === null) {
                // No course could be resolved. Keep the file in the plugin
                // area so the editor and saved content survive draft cleanup.
                $permanent = self::store_system_file($fs, $record, $tmp);
            }
            if ($permanent === null) {
                self::debug_log('localize store failed kind=' . $params['kind'] . ' courseid=' . $courseid);
                return [
                    'code' => 500,
                    'itemid' => $effectiveitemid,
                    'url' => '',
                    'message' => 'Could not store media in a lasting file area.',
                ];
            }
            // Keep the editor draft itemid stable. Returning another id would
            // overwrite the Tiny draft item field.
            self::debug_log('localize stored kind=' . $params['kind']
                . ' file=' . $filename
                . ' mime=' . $mimetype
                . ' courseid=' . $courseid
                . ' url=' . self::url_for_log($permanent));
            return ['code' => 200, 'itemid' => $effectiveitemid, 'url' => $permanent, 'message' => ''];
        } catch (\Throwable $e) {
            self::debug_log('localize exception kind=' . $params['kind'] . ' ' . $e->getMessage());
            return ['code' => 500, 'itemid' => $effectiveitemid, 'url' => '', 'message' => $e->getMessage()];
        } finally {
            @unlink($tmp);
        }
    }

    /**
     * Browsers only display a captions track when the file is WebVTT.
     * Convert a SubRip payload before it is stored.
     *
     * @param string $body Downloaded caption bytes.
     * @param string $mimetype Mime hint from the caller.
     * @return array{body:string,mime:string}
     */
    private static function maybe_convert_caption_to_vtt(string $body, string $mimetype): array {
        $mime = strtolower(trim(explode(';', $mimetype)[0]));
        $issrt = (strpos($mime, 'subrip') !== false || strpos($mime, 'srt') !== false);
        $trimmed = ltrim($body, "\xEF\xBB\xBF \t\r\n");
        $alreadyvtt = (bool)preg_match('/^WEBVTT\b/i', $trimmed);
        if ($alreadyvtt) {
            return ['body' => $trimmed, 'mime' => 'text/vtt'];
        }
        if (!$issrt && !preg_match('/\d{2}:\d{2}:\d{2},\d{3}\s+-->\s+\d{2}:\d{2}:\d{2},\d{3}/', $body)) {
            return ['body' => $body, 'mime' => $mimetype !== '' ? $mimetype : 'text/vtt'];
        }
        $normalized = str_replace(["\r\n", "\r"], "\n", $trimmed);
        $normalized = preg_replace('/(\d{2}:\d{2}:\d{2}),(\d{3})/', '$1.$2', $normalized);
        return ['body' => "WEBVTT\n\n" . ltrim($normalized), 'mime' => 'text/vtt'];
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
     * @param string $kind audio|image|video|captions|media.
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
        if ($kind === 'video' && strpos($m, 'mp4') !== false) {
            return 'mp4';
        }
        if (strpos($m, 'm4a') !== false || strpos($m, 'mp4') !== false || strpos($m, 'aac') !== false) {
            return 'm4a';
        }
        if (strpos($m, 'webm') !== false) {
            return 'webm';
        }
        if (strpos($m, 'subrip') !== false || strpos($m, 'srt') !== false) {
            return 'srt';
        }
        if (strpos($m, 'vtt') !== false || $kind === 'captions') {
            return 'vtt';
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

    /**
     * Course id from the editor page that called this webservice.
     *
     * @return int
     */
    private static function courseid_from_referer(): int {
        $referer = (string)($_SERVER['HTTP_REFERER'] ?? '');
        if ($referer === '') {
            return 0;
        }
        $path = (string)(parse_url($referer, PHP_URL_PATH) ?? '');
        $query = (string)(parse_url($referer, PHP_URL_QUERY) ?? '');
        $params = [];
        if ($query !== '') {
            parse_str($query, $params);
        }
        foreach (['courseid', 'course'] as $key) {
            $id = (int)($params[$key] ?? 0);
            if ($id > 1) {
                return $id;
            }
        }
        $id = (int)($params['id'] ?? 0);
        $ishaccgen = stripos($path, '/local/haccgen/') !== false;
        $iscoursepage = (bool)preg_match('#/course/(view|edit)\.php$#', $path);
        if ($id > 1 && ($ishaccgen || $iscoursepage)) {
            return $id;
        }
        $cmid = (int)($params['update'] ?? 0);
        if ($cmid <= 0 && $id > 0 && preg_match('#/mod/[^/]+/(view|edit)\.php$#', $path)) {
            $cmid = $id;
        }
        if ($cmid > 0) {
            global $CFG;
            require_once($CFG->dirroot . '/lib/modinfolib.php');
            $cm = get_coursemodule_from_id('', $cmid);
            if ($cm && (int)$cm->course > 1) {
                return (int)$cm->course;
            }
        }
        return 0;
    }

    /**
     * Store the file in the course so enrolled users can open the pluginfile URL.
     *
     * @param \file_storage $fs File storage.
     * @param int $courseid Course id.
     * @param array $record Partial file record.
     * @param string $pathname Temporary file path.
     * @return string|null Pluginfile URL, or null when the course cannot be used.
     */
    private static function store_course_file(\file_storage $fs, int $courseid, array $record, string $pathname): ?string {
        try {
            $course = get_course($courseid);
            require_login($course, false);
            $coursectx = context_course::instance($courseid);
            $record['contextid'] = $coursectx->id;
            $record['component'] = 'tiny_haccgen_extender';
            $record['filearea'] = 'uploads';
            $record['itemid'] = $courseid;
            $fs->create_file_from_pathname($record, $pathname);
            return \moodle_url::make_pluginfile_url(
                $coursectx->id,
                'tiny_haccgen_extender',
                'uploads',
                $courseid,
                '/',
                $record['filename'],
                false
            )->out(false);
        } catch (\Throwable $e) {
            debugging('tiny_haccgen_extender permanent media store failed: ' . $e->getMessage(), DEBUG_DEVELOPER);
            return null;
        }
    }

    /**
     * Store the file in the system context when no course is available.
     *
     * This area is not deleted by file_temp_cleanup_task.
     *
     * @param \file_storage $fs File storage.
     * @param array $record Partial file record.
     * @param string $pathname Temporary file path.
     * @return string|null Pluginfile URL, or null on failure.
     */
    private static function store_system_file(\file_storage $fs, array $record, string $pathname): ?string {
        global $USER;

        try {
            $userid = (int)($USER->id ?? 0);
            if ($userid <= 0) {
                return null;
            }
            $sysctx = context_system::instance();
            $filename = (string)$record['filename'];
            $existing = $fs->get_file($sysctx->id, 'tiny_haccgen_extender', 'uploads', $userid, '/', $filename);
            if ($existing) {
                $existing->delete();
            }
            $record['contextid'] = $sysctx->id;
            $record['component'] = 'tiny_haccgen_extender';
            $record['filearea'] = 'uploads';
            $record['itemid'] = $userid;
            $fs->create_file_from_pathname($record, $pathname);
            return \moodle_url::make_pluginfile_url(
                $sysctx->id,
                'tiny_haccgen_extender',
                'uploads',
                $userid,
                '/',
                $filename,
                false
            )->out(false);
        } catch (\Throwable $e) {
            debugging('tiny_haccgen_extender system media store failed: ' . $e->getMessage(), DEBUG_DEVELOPER);
            return null;
        }
    }

    /**
     * Append a caption diagnostic without affecting the request.
     *
     * @param string $message Log line.
     * @return void
     */
    private static function debug_log(string $message): void {
        \tiny_haccgen_extender\local\debug_log::write($message);
    }

    /**
     * Log a URL path without its query string.
     *
     * @param string $url URL or data URL.
     * @return string
     */
    private static function url_for_log(string $url): string {
        if (preg_match('#^data:#i', $url) === 1) {
            return 'data-url len=' . strlen($url);
        }
        $parts = parse_url($url);
        if (!is_array($parts)) {
            return 'unparsed len=' . strlen($url);
        }
        $path = (string)($parts['path'] ?? '');
        $query = (string)($parts['query'] ?? '');
        return (string)($parts['scheme'] ?? '') . '://' . (string)($parts['host'] ?? '')
            . $path . ($query !== '' ? '?querylen=' . strlen($query) : '');
    }
}
