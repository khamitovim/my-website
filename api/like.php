<?php
require __DIR__ . '/config.php';

ensure_schema();

if (!is_post()) {
  http_response_code(405);
  header('Allow: POST, OPTIONS');
  fail('method_not_allowed', 405);
}

$in = json_input();
$track_id = trim((string)($in['track_id'] ?? ''));
$client_id = trim((string)($in['client_id'] ?? ''));
$action = strtolower(trim((string)($in['action'] ?? 'toggle')));

if ($track_id === '' || $client_id === '') {
  fail('track_id_and_client_id_required', 422);
}

$db = pdo();

try {
  if ($action === 'like' || $action === 'toggle') {
    $stmt = $db->prepare('INSERT OR IGNORE INTO likes (track_id, client_id, created_at) VALUES (:t, :c, :ts)');
    $stmt->execute([':t' => $track_id, ':c' => $client_id, ':ts' => now()]);
    if ($action === 'toggle') {
      if ($stmt->rowCount() === 0) {
        $del = $db->prepare('DELETE FROM likes WHERE track_id = :t AND client_id = :c');
        $del->execute([':t' => $track_id, ':c' => $client_id]);
      }
    }
  } elseif ($action === 'unlike') {
    $del = $db->prepare('DELETE FROM likes WHERE track_id = :t AND client_id = :c');
    $del->execute([':t' => $track_id, ':c' => $client_id]);
  } else {
    fail('bad_action', 400);
  }

  // Счётчик лайков (подготовленные выражения для безопасности)
  $cntStmt = $db->prepare('SELECT COUNT(*) AS c FROM likes WHERE track_id = :t');
  $cntStmt->execute([':t' => $track_id]);
  $cnt = (int)$cntStmt->fetchColumn();

  $isStmt = $db->prepare('SELECT COUNT(*) FROM likes WHERE track_id = :t AND client_id = :c');
  $isStmt->execute([':t' => $track_id, ':c' => $client_id]);
  $isLiked = (int)$isStmt->fetchColumn() > 0;

  ok(['liked' => $isLiked, 'total' => $cnt]);
} catch (Throwable $e) {
  fail('db_error', 500);
}
