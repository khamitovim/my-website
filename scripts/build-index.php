#!/usr/bin/env php
<?php
// Генератор индекса треков для быстрого старта фронта
// Использование: php scripts/build-index.php

$BASE = realpath(__DIR__ . '/..');
$PUBLIC = $BASE . '/public';
$MUSIC  = $PUBLIC . '/music';
$OUT    = $PUBLIC . '/tracks_index.json';

function fail($msg, $code=1){ fwrite(STDERR, "[ERR] $msg\n"); exit($code); }
function info($msg){ fwrite(STDOUT, "[OK ] $msg\n"); }

if (!is_dir($MUSIC)) fail("Не найден каталог: $MUSIC");

$tracks = [];
$dir = new DirectoryIterator($MUSIC);
foreach ($dir as $d) {
  if (!$d->isDir() || $d->isDot()) continue;
  $folder = $d->getFilename();
  $abs = $MUSIC . '/' . $folder;
  $mp3 = is_file($abs . '/clip.mp3') ? '/music/' . rawurlencode($folder) . '/clip.mp3' : null;
  $ogg = is_file($abs . '/clip.ogg') ? '/music/' . rawurlencode($folder) . '/clip.ogg' : null;
  $meta= is_file($abs . '/info.json')? '/music/' . rawurlencode($folder) . '/info.json' : null;
  if (!$mp3 && !$ogg) continue;
  $tracks[] = [ 'id' => $folder, 'mp3' => $mp3, 'ogg' => $ogg, 'meta' => $meta ];
}

usort($tracks, function($a,$b){ return strcmp($a['id'],$b['id']); });

$json = json_encode(['tracks'=>$tracks], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_PRETTY_PRINT);
if ($json === false) fail('Не удалось сериализовать JSON');

if (@file_put_contents($OUT, $json) === false) fail("Не удалось записать $OUT");

info("Собрано треков: " . count($tracks));
info("Файл: $OUT");
exit(0);
