<?php
// /api/tracks.php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache, no-store, must-revalidate');

// Если есть config.php — используем его константы путей/URL
$cfg = __DIR__ . '/config.php';
if (is_file($cfg)) {
    include_once $cfg;
}

$docroot = rtrim($_SERVER['DOCUMENT_ROOT'] ?? '', '/');

// Основной каталог твоих треков (НЕ трогаем — как было)
$MUSIC_DIR_FS  = defined('MUSIC_DIR_FS') ? MUSIC_DIR_FS : $docroot . '/music';
$MUSIC_DIR_URL = defined('MUSIC_DIR_URL') ? MUSIC_DIR_URL : '/music';

// Папка загрузок пользователей (добавили)
if (defined('UPLOADS_DIR_FS') && defined('UPLOADS_DIR_URL')) {
    $UPLOADS_DIR_FS  = UPLOADS_DIR_FS;
    $UPLOADS_DIR_URL = UPLOADS_DIR_URL;
} else {
    // поддерживаем оба варианта регистра
    if (is_dir($docroot . '/Uploads')) {
        $UPLOADS_DIR_FS  = $docroot . '/Uploads';
        $UPLOADS_DIR_URL = '/Uploads';
    } else {
        $UPLOADS_DIR_FS  = $docroot . '/uploads';
        $UPLOADS_DIR_URL = '/uploads';
    }
}

// Список источников: сначала Music (как раньше), потом Uploads (новое)
$sources = [];
if (is_dir($MUSIC_DIR_FS))   $sources[] = ['fs' => $MUSIC_DIR_FS,   'url' => $MUSIC_DIR_URL];
if (is_dir($UPLOADS_DIR_FS)) $sources[] = ['fs' => $UPLOADS_DIR_FS, 'url' => $UPLOADS_DIR_URL];

// Утилита: склеиваем URL и корректно кодируем имя файла/папки
function url_join(string $baseUrl, string $folder, string $file = ''): string {
    $baseUrl = rtrim($baseUrl, '/');
    $folder  = rawurlencode($folder);
    if ($file === '') return "{$baseUrl}/{$folder}";
    return "{$baseUrl}/{$folder}/" . implode('/', array_map('rawurlencode', explode('/', $file)));
}

// Собираем треки из одного корневого каталога
function collectTracks(string $baseFs, string $baseUrl): array {
    $result = [];
    $items = @scandir($baseFs);
    if ($items === false) return $result;

    foreach ($items as $entry) {
        if ($entry === '.' || $entry === '..') continue;
        $dirFs = $baseFs . '/' . $entry;
        if (!is_dir($dirFs)) continue;

        $mp3 = null; $ogg = null; $metaUrl = null;

        $files = @scandir($dirFs);
        if ($files === false) continue;

        // находим любые .mp3/.ogg и info.json (имена произвольны)
        foreach ($files as $f) {
            if ($f === '.' || $f === '..') continue;
            $path = $dirFs . '/' . $f;
            if (!is_file($path)) continue;

            $l = strtolower($f);
            if (str_ends_with($l, '.mp3')) {
                $mp3 = url_join($baseUrl, $entry, $f);
            } elseif (str_ends_with($l, '.ogg')) {
                $ogg = url_join($baseUrl, $entry, $f);
            } elseif ($l === 'info.json') {
                $metaUrl = url_join($baseUrl, $entry, 'info.json');
            }
        }

        // нет аудио — пропускаем
        if (!$mp3 && !$ogg) continue;

        // Не навязываем тайтлы/артистов — плеер у тебя сам читает meta при необходимости
        $result[] = array_filter([
            'mp3'  => $mp3,
            'ogg'  => $ogg,
            'meta' => $metaUrl,
        ], fn($v) => $v !== null);
    }

    return $result;
}

$tracks = [];
foreach ($sources as $src) {
    $tracks = array_merge($tracks, collectTracks($src['fs'], $src['url']));
}

// ВАЖНО: без shuffle — сохраняем «как раньше». Если нужен рандом — добавь shuffle($tracks).

echo json_encode(['tracks' => $tracks], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);