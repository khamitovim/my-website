<?php
require __DIR__ . '/config.php';

ensure_schema();

if (!is_post()) {
  http_response_code(405); // Method Not Allowed
  header('Allow: POST, OPTIONS');
  fail('method_not_allowed', 405);
}

$in = json_input();
$client_id = trim((string)($in['client_id'] ?? ''));
$events = $in['events'] ?? [];

if (!is_array($events) || !$events) {
  ok(['inserted' => 0]);
}

$MAX_BATCH = 200;
if (count($events) > $MAX_BATCH) {
  $events = array_slice($events, 0, $MAX_BATCH);
}

$rows = [];
$now = now();
foreach ($events as $e) {
  if (!is_array($e)) continue;
  $type = trim((string)($e['type'] ?? ''));
  if ($type === '') continue;
  $track_id = isset($e['track_id']) ? trim((string)$e['track_id']) : null;
  $ts = (int)($e['ts'] ?? $now);
  if ($ts <= 0) $ts = $now;
  $payload = $e['payload'] ?? null;
  $payloadJson = $payload === null ? null : json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

  $rows[] = [
    'type' => $type,
    'track_id' => $track_id,
    'client_id' => $client_id ?: null,
    'ts' => $ts,
    'payload' => $payloadJson,
  ];
}

if (!$rows) ok(['inserted' => 0]);

$db = pdo();
$db->beginTransaction();
try {
  $stmt = $db->prepare('INSERT INTO events (type, track_id, client_id, ts, payload) VALUES (:type, :track_id, :client_id, :ts, :payload)');
  $inserted = 0;
  foreach ($rows as $r) {
    $stmt->execute([
      ':type' => $r['type'],
      ':track_id' => $r['track_id'],
      ':client_id' => $r['client_id'],
      ':ts' => $r['ts'],
      ':payload' => $r['payload'],
    ]);
    $inserted++;
  }
  $db->commit();
  ok(['inserted' => $inserted]);
} catch (Throwable $ex) {
  $db->rollBack();
  fail('db_error');
}
