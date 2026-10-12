<?php
// Bulletproof SPA entrypoint for Hostinger LiteSpeed / Apache
if (file_exists(__DIR__ . '/index.html')) {
    header('Content-Type: text/html; charset=UTF-8');
    readfile(__DIR__ . '/index.html');
    exit;
}
http_response_code(404);
echo "Dashboard asset index.html not found.";
?>
