<?php
// Быстрый аудит каталога /music: показывает, у каких папок нет аудио/меты
require __DIR__ . '/config.php';

$MUSIC = path_music();
if (!is_dir($MUSIC)) {
  header('Content-Type: text/plain; charset=utf-8');
  echo "music directory not found: " . $MUSIC . "\n";
  exit;
}

$rows = [];
$it = new DirectoryIterator($MUSIC);
foreach ($it as $dir) {
  if (!$dir->isDir() || $dir->isDot()) continue;
  $folder = $dir->getFilename();
  $abs = $MUSIC . '/' . $folder;

  $has = [
    'clip.mp3' => is_file($abs . '/clip.mp3'),
    'clip.ogg' => is_file($abs . '/clip.ogg'),
    'clip.wav' => is_file($abs . '/clip.wav'),
    'any_audio'=> false,
    'info.json'=> is_file($abs . '/info.json'),
  ];

  if (!$has['clip.mp3'] && !$has['clip.ogg'] && !$has['clip.wav']) {
    // ищем любой аудиофайл
    $files = @scandir($abs);
    if ($files) {
      foreach ($files as $f) {
        $l = strtolower($f);
        if (substr($l,-4)==='.mp3' || substr($l,-4)==='.ogg' || substr($l,-4)==='.wav') { $has['any_audio']=true; break; }
      }
    }
  } else {
    $has['any_audio']=true;
  }

  $rows[] = [
    'id' => $folder,
    'has_clip_named' => ($has['clip.mp3'] || $has['clip.ogg'] || $has['clip.wav']),
    'has_any_audio' => $has['any_audio'],
    'has_info_json' => $has['info.json'],
  ];
}

header('Content-Type: application/json; charset=utf-8');
echo json_encode(['ok'=>true,'music_root'=>$MUSIC,'folders'=> $rows], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_PRETTY_PRINT);
