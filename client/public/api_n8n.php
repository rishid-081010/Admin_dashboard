<?php
// Hostinger Server-Side Live n8n Proxy & Telemetry Aggregator
// Directly queries https://n8n.asquared.ae/rest/workflows and executions
// Bypasses expired SSL certificate and caches auth session to avoid rate limits

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$n8nUrl = 'https://n8n.asquared.ae';
$email = 'akarshrarora@gmail.com';
$password = 'Asquared@1234';

$cacheDir = sys_get_temp_dir();
$cookieFile = $cacheDir . '/n8n_session_asquared.txt';
$cacheDataFile = $cacheDir . '/n8n_telemetry_cache.json';

// Return 60-second cached telemetry if available
if (file_exists($cacheDataFile) && (time() - filemtime($cacheDataFile) < 60) && !isset($_GET['refresh'])) {
    $cachedContent = file_get_contents($cacheDataFile);
    if ($cachedContent) {
        echo $cachedContent;
        exit;
    }
}

function getN8nCookie($n8nUrl, $email, $password, $cookieFile) {
    if (file_exists($cookieFile) && (time() - filemtime($cookieFile) < 86400 * 5)) {
        $saved = trim(file_get_contents($cookieFile));
        if (!empty($saved)) {
            return $saved;
        }
    }

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $n8nUrl . '/rest/login');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);
    curl_setopt($ch, CURLOPT_HEADER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json'
    ]);
    
    $payload = json_encode([
        'emailOrLdapLoginId' => $email,
        'password' => $password
    ]);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);

    $response = curl_exec($ch);
    $headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200 || !$response) {
        return false;
    }

    $headers = substr($response, 0, $headerSize);
    preg_match_all('/^Set-Cookie:\s*([^;]*)/mi', $headers, $matches);
    
    if (!empty($matches[1])) {
        $cookie = implode('; ', $matches[1]);
        @file_put_contents($cookieFile, $cookie);
        return $cookie;
    }

    return false;
}

function makeN8nGet($url, $cookie) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 20);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Cookie: ' . $cookie,
        'Accept: application/json'
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode === 200 && $response) {
        return json_decode($response, true);
    }
    return false;
}

$cookie = getN8nCookie($n8nUrl, $email, $password, $cookieFile);

if (!$cookie) {
    // Retry fresh login once
    @unlink($cookieFile);
    $cookie = getN8nCookie($n8nUrl, $email, $password, $cookieFile);
}

if (!$cookie) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Unable to authenticate with n8n instance'
    ]);
    exit;
}

// 1. Fetch Workflows
$workflowsRes = makeN8nGet($n8nUrl . '/rest/workflows', $cookie);
$workflows = isset($workflowsRes['data']) ? $workflowsRes['data'] : [];

// 2. Fetch Executions
$executionsRes = makeN8nGet($n8nUrl . '/rest/executions?limit=250', $cookie);
$executions = isset($executionsRes['data']['results']) ? $executionsRes['data']['results'] : [];

// Aggregate executions for today (UTC / GST)
$today = gmdate('Y-m-d');
$statsByWorkflow = [];
$totalExecutionsToday = 0;
$totalErrorsToday = 0;
$totalSuccessToday = 0;

foreach ($executions as $ex) {
    $wid = isset($ex['workflowId']) ? $ex['workflowId'] : 'unknown';
    $createdAt = isset($ex['createdAt']) ? $ex['createdAt'] : '';
    $status = isset($ex['status']) ? strtolower($ex['status']) : 'unknown';
    $isToday = (strpos($createdAt, $today) === 0);

    if (!isset($statsByWorkflow[$wid])) {
        $statsByWorkflow[$wid] = [
            'executionsToday' => 0,
            'successToday' => 0,
            'errorToday' => 0,
            'runningToday' => 0,
            'durations' => [],
            'latestStatus' => $status,
            'lastExecutedAt' => isset($ex['startedAt']) ? $ex['startedAt'] : $createdAt,
            'recentLogs' => []
        ];
    }

    if ($isToday) {
        $statsByWorkflow[$wid]['executionsToday']++;
        $totalExecutionsToday++;
        if ($status === 'success') {
            $statsByWorkflow[$wid]['successToday']++;
            $totalSuccessToday++;
        } elseif ($status === 'error') {
            $statsByWorkflow[$wid]['errorToday']++;
            $totalErrorsToday++;
        } elseif ($status === 'running') {
            $statsByWorkflow[$wid]['runningToday']++;
        }
    }

    if (count($statsByWorkflow[$wid]['recentLogs']) < 5) {
        $statsByWorkflow[$wid]['recentLogs'][] = [
            'id' => isset($ex['id']) ? $ex['id'] : '',
            'status' => $status,
            'mode' => isset($ex['mode']) ? $ex['mode'] : 'trigger',
            'startedAt' => isset($ex['startedAt']) ? $ex['startedAt'] : $createdAt
        ];
    }
}

// Format final list of workflows
$formattedWorkflows = [];
$activeCount = 0;
$healthyCount = 0;
$errorCount = 0;

foreach ($workflows as $w) {
    $wid = $w['id'];
    $isActive = !empty($w['active']);
    if ($isActive) $activeCount++;

    $st = isset($statsByWorkflow[$wid]) ? $statsByWorkflow[$wid] : [
        'executionsToday' => 0,
        'successToday' => 0,
        'errorToday' => 0,
        'runningToday' => 0,
        'latestStatus' => 'idle',
        'lastExecutedAt' => null,
        'recentLogs' => []
    ];

    // Determine health status: 'healthy', 'running', 'error', 'idle', 'paused'
    $healthStatus = 'idle';
    if ($st['latestStatus'] === 'running' || $st['runningToday'] > 0) {
        $healthStatus = 'running';
    } elseif ($st['errorToday'] > 0 || $st['latestStatus'] === 'error') {
        $healthStatus = 'error';
        $errorCount++;
    } elseif ($st['successToday'] > 0 || $st['latestStatus'] === 'success') {
        $healthStatus = 'healthy';
        $healthyCount++;
    } elseif ($isActive) {
        $healthStatus = 'healthy'; // active and awaiting trigger
        $healthyCount++;
    } else {
        $healthStatus = 'paused';
    }

    $avgDuration = (!empty($st['durations']))
        ? round(array_sum($st['durations']) / count($st['durations']), 2)
        : null;

    $formattedWorkflows[] = [
        'id' => $wid,
        'name' => $w['name'],
        'active' => $isActive,
        'status' => $healthStatus,
        'executionsToday' => $st['executionsToday'],
        'successToday' => $st['successToday'],
        'errorToday' => $st['errorToday'],
        'avgDurationSec' => $avgDuration,
        'lastExecutedAt' => $st['lastExecutedAt'],
        'updatedAt' => isset($w['updatedAt']) ? $w['updatedAt'] : null,
        'n8nUrl' => $n8nUrl . '/workflow/' . $wid,
        'recentLogs' => $st['recentLogs']
    ];
}

// Sort by: Active first, then Executions Today desc, then Name asc
usort($formattedWorkflows, function($a, $b) {
    if ($a['active'] !== $b['active']) return $b['active'] ? 1 : -1;
    if ($a['executionsToday'] !== $b['executionsToday']) return $b['executionsToday'] - $a['executionsToday'];
    return strcmp($a['name'], $b['name']);
});

$result = [
    'success' => true,
    'timestamp' => gmdate('Y-m-d\TH:i:s\Z'),
    'summary' => [
        'totalWorkflows' => count($workflows),
        'activeWorkflows' => $activeCount,
        'healthyWorkflows' => $healthyCount,
        'errorWorkflows' => $errorCount,
        'totalExecutionsToday' => $totalExecutionsToday,
        'totalSuccessToday' => $totalSuccessToday,
        'totalErrorsToday' => $totalErrorsToday
    ],
    'workflows' => $formattedWorkflows
];

$jsonOutput = json_encode($result, JSON_PRETTY_PRINT);
@file_put_contents($cacheDataFile, $jsonOutput);

echo $jsonOutput;
?>
