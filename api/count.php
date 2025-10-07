<?php
// /api/count.php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache, no-store, must-revalidate');

$docroot = rtrim($_SERVER['DOCUMENT_ROOT'] ?? '', '/');

// Если есть config.php — используем его пути; иначе дефолты
$cfg = __DIR__ . '/config.php';
if (is_file($cfg)) { include_once $cfg; }

$MUSIC_DIR_FS   = defined('MUSIC_DIR_FS')   ? MUSIC_DIR_FS   : $docroot . '/Music';
$UPLOADS_DIR_FS = defined('UPLOADS_DIR_FS') ? UPLOADS_DIR_FS :
  (is_dir($docroot . '/Uploads') ? $docroot . '/Uploads' : $docroot . '/uploads');

// Быстрый подсчёт: считаем папки первого уровня,
// внутри которых есть хотя бы один .mp3 или .ogg
function count_tracks_in(string $base): int {
    if (!is_dir($base)) return 0;
    $n = 0;
    $items = @scandir($base) ?: [];
    foreach ($items as $item) {
        if ($item === '.' || $item === '..') continue;
        $dir = $base . '/' . $item;
        if (!is_dir($dir)) continue;
        $files = @scandir($dir) ?: [];
        $hasAudio = false;
        foreach ($files as $f) {
            if ($f === '.' || $f === '..') continue;
            if (!is_file($dir . '/' . $f)) continue;
            $l = strtolower($f);
            if (str_ends_with($l, '.mp3') || str_ends_with($l, '.ogg')) {
                $hasAudio = true; break;
            }
        }
        if ($hasAudio) $n++;
    }
    return $n;
}

// Кэш на файле (обновляемся мгновенно после заливки — см. правку upload.php ниже)
$cacheFile = sys_get_temp_dir() . '/ahs_track_count.json';
$ttl = 10; // сек — чтобы не грузить диск слишком часто

$now = time();
$payload = null;

if (is_file($cacheFile) && ($now - filemtime($cacheFile) < $ttl)) {
    $payload = @json_decode(@file_get_contents($cacheFile), true);
}

if (!is_array($payload)) {
    $count = count_tracks_in($MUSIC_DIR_FS) + count_tracks_in($UPLOADS_DIR_FS);
    $payload = ['count' => $count, 'ts' => $now];
    @file_put_contents($cacheFile, json_encode($payload, JSON_UNESCAPED_SLASHES));
}

echo json_encode(['count' => (int)$payload['count']], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);