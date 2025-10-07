<?php
// ---------------------------------------------
// Конфигурация API + утилиты ответа/CORS/JSON
// ---------------------------------------------

// Без лишних предупреждений в проде
error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING);
ini_set('display_errors', '0');

// Часовой пояс
@date_default_timezone_set('UTC');

// Пути
$BASE_DIR   = realpath(__DIR__ . '/..');   // корень проекта (на уровень выше /api)
$API_DIR    = __DIR__;
$DATA_DIR   = $BASE_DIR . '/data';         // для SQLite

// Определяем корень статики (где index.html и папка music)
$CANDIDATES = [];
$CANDIDATES[] = realpath($BASE_DIR . '/public');                       // вариант 1: /public
$CANDIDATES[] = realpath($_SERVER['DOCUMENT_ROOT'] ?? '') ?: null;     // вариант 2: DOCUMENT_ROOT
$CANDIDATES[] = realpath($BASE_DIR);                                   // вариант 3: сам BASE_DIR
$CANDIDATES[] = realpath(dirname($BASE_DIR) . '/public_html');         // вариант 4: shared-хостинг public_html

$PUBLIC_DIR = null;
foreach ($CANDIDATES as $path) {
  if (!$path) continue;
  // признаём корнем, если есть index.html ИЛИ папка music
  if (is_file($path . '/index.html') || is_dir($path . '/music')) {
    $PUBLIC_DIR = $path; break;
  }
}

if (!$PUBLIC_DIR) {
  // последний шанс — берём DOCUMENT_ROOT или BASE_DIR
  $PUBLIC_DIR = realpath($_SERVER['DOCUMENT_ROOT'] ?? '') ?: $BASE_DIR;
}

if (!is_dir($DATA_DIR)) { @mkdir($DATA_DIR, 0775, true); }

// Итоговый путь к музыке — рядом с index.html
$MUSIC_DIR  = $PUBLIC_DIR . '/music';

// ------------------ CORS ----------------------
function allow_cors() {
  $origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
  header('Access-Control-Allow-Origin: ' . $origin);
  header('Vary: Origin');
  header('Access-Control-Allow-Credentials: true');
  header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
  header('Access-Control-Allow-Headers: Content-Type, Authorization');
  if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
  }
}
allow_cors();

// --------------- JSON helpers -----------------
function json_input(): array {
  $raw = file_get_contents('php://input') ?: '';
  if ($raw === '') return [];
  $j = json_decode($raw, true);
  return is_array($j) ? $j : [];
}

function json_output($data, int $code = 200): void {
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

function fail(string $message, int $code = 400): void {
  json_output(['ok' => false, 'error' => $message], $code);
}

function ok($data = [], int $code = 200): void {
  if (is_array($data)) $data = array_merge(['ok' => true], $data);
  json_output($data, $code);
}

// --------------- DB (PDO SQLite) --------------
function pdo(): PDO {
  static $pdo = null;
  if ($pdo) return $pdo;
  global $DATA_DIR;
  $sqlite = $DATA_DIR . '/app.sqlite';
  $dsn = 'sqlite:' . $sqlite;
  $pdo = new PDO($dsn, null, null, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
  ]);
  // Параметры надёжности
  $pdo->exec('PRAGMA journal_mode = WAL');
  $pdo->exec('PRAGMA synchronous = NORMAL');
  $pdo->exec('PRAGMA foreign_keys = ON');
  $pdo->exec('PRAGMA busy_timeout = 3000');
  return $pdo;
}

// --------------- Bootstrap схемы --------------
function ensure_schema(): void {
  $db = pdo();
  // Таблица лайков: уникальность track_id + client_id
  $db->exec('CREATE TABLE IF NOT EXISTS likes (
    track_id TEXT NOT NULL,
    client_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (track_id, client_id)
  )');

  // Таблица событий (сырой лог для аналитики)
  $db->exec('CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    track_id TEXT,
    client_id TEXT,
    ts INTEGER NOT NULL,
    payload TEXT
  )');
}

// Вспомогательные утилиты
function req_method(): string { return $_SERVER['REQUEST_METHOD'] ?? 'GET'; }
function now(): int { return time(); }
function is_post(): bool { return req_method() === 'POST'; }

// Общедоступные пути для других скриптов
function path_public(): string { global $PUBLIC_DIR; return $PUBLIC_DIR; }
function path_music(): string { global $MUSIC_DIR; return $MUSIC_DIR; }
?>
