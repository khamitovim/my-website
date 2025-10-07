<?php
require __DIR__ . '/config.php';

ensure_schema();

ok([
  'status' => 'ok',
  'time'   => now(),
  'php'    => PHP_VERSION,
]);
