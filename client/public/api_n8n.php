<?php
// Hostinger Server-Side Live n8n Proxy & Telemetry Aggregator
// Queries https://n8n.asquared.ae/rest/workflows and executions
// Caches auth session & telemetry to avoid rate limits and handles offline fallbacks gracefully

header('Content-Type: application/json; charset=UTF-8');

$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
$allowedOrigins = [
    'https://admin.asquared.ae',
    'https://dashboard.asquared.ae',
    'http://localhost:5173',
    'http://localhost:3000'
];
if (in_array($origin, $allowedOrigins)) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    header("Access-Control-Allow-Origin: https://admin.asquared.ae");
}
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

date_default_timezone_set('Asia/Dubai');

$n8nUrl = 'https://n8n.asquared.ae';
$email = getenv('N8N_USER') ?: (isset($_SERVER['N8N_USER']) ? $_SERVER['N8N_USER'] : 'akarshrarora@gmail.com');
$password = getenv('N8N_PASSWORD') ?: (isset($_SERVER['N8N_PASSWORD']) ? $_SERVER['N8N_PASSWORD'] : 'Asquared@1234');

$cacheDir = sys_get_temp_dir();
$cookieFile = $cacheDir . '/n8n_session_asquared.txt';
$cacheDataFile = $cacheDir . '/n8n_telemetry_cache.json';

// Return 60-second cached telemetry if available and valid
if (file_exists($cacheDataFile) && (time() - filemtime($cacheDataFile) < 60) && !isset($_GET['refresh'])) {
    $cachedContent = file_get_contents($cacheDataFile);
    if ($cachedContent) {
        $decoded = json_decode($cachedContent, true);
        if (!empty($decoded['workflows'])) {
            echo $cachedContent;
            exit;
        }
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
    curl_setopt($ch, CURLOPT_TIMEOUT, 4);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 3);
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
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 3);
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

// 1. Fetch Workflows
$workflowsRes = $cookie ? makeN8nGet($n8nUrl . '/rest/workflows', $cookie) : false;
$workflows = isset($workflowsRes['data']) ? $workflowsRes['data'] : [];

// If upstream n8n fails or returns empty workflows, serve cached valid telemetry if available
if (empty($workflows)) {
    if (file_exists($cacheDataFile)) {
        $cachedContent = file_get_contents($cacheDataFile);
        if ($cachedContent) {
            $cachedObj = json_decode($cachedContent, true);
            if (!empty($cachedObj['workflows'])) {
                $cachedObj['isStale'] = true;
                $cachedObj['upstreamError'] = 'Upstream n8n server unreachable';
                echo json_encode($cachedObj, JSON_PRETTY_PRINT);
                exit;
            }
        }
    }

    // Try to read local public fallback
    $localStatic = __DIR__ . '/n8n_telemetry.json';
    if (file_exists($localStatic)) {
        $staticContent = file_get_contents($localStatic);
        if ($staticContent) {
            $staticObj = json_decode($staticContent, true);
            if (!empty($staticObj['workflows'])) {
                $staticObj['isStale'] = true;
                $staticObj['upstreamError'] = 'Upstream n8n server unreachable; showing static snapshot';
                echo json_encode($staticObj, JSON_PRETTY_PRINT);
                exit;
            }
        }
    }

    // Otherwise return error response
    http_response_code(502);
    echo json_encode([
        'success' => false,
        'error' => 'Unable to reach upstream n8n instance at https://n8n.asquared.ae',
        'isStale' => true,
        'workflows' => []
    ]);
    exit;
}

// 2. Fetch Executions
$executionsRes = makeN8nGet($n8nUrl . '/rest/executions?limit=250', $cookie);
$executions = isset($executionsRes['data']['results']) ? $executionsRes['data']['results'] : [];

// Aggregate executions for today (Dubai GST)
$todayDubai = date('Y-m-d');
$statsByWorkflow = [];
$totalExecutionsToday = 0;
$totalErrorsToday = 0;
$totalSuccessToday = 0;
$allDurations = [];

foreach ($executions as $ex) {
    $wid = isset($ex['workflowId']) ? $ex['workflowId'] : 'unknown';
    $startedAt = isset($ex['startedAt']) ? $ex['startedAt'] : (isset($ex['createdAt']) ? $ex['createdAt'] : '');
    $stoppedAt = isset($ex['stoppedAt']) ? $ex['stoppedAt'] : null;
    $status = isset($ex['status']) ? strtolower($ex['status']) : 'unknown';

    // Compute execution date in Dubai GST
    $exDateDubai = !empty($startedAt) ? (new DateTime($startedAt))->setTimezone(new DateTimeZone('Asia/Dubai'))->format('Y-m-d') : '';
    $isToday = ($exDateDubai === $todayDubai);

    $durationSec = null;
    if (!empty($startedAt) && !empty($stoppedAt)) {
        $t1 = strtotime($startedAt);
        $t2 = strtotime($stoppedAt);
        if ($t2 >= $t1) {
            $durationSec = round($t2 - $t1, 2);
            $allDurations[] = $durationSec;
        }
    }

    if (!isset($statsByWorkflow[$wid])) {
        $statsByWorkflow[$wid] = [
            'executionsToday' => 0,
            'successToday' => 0,
            'errorToday' => 0,
            'runningToday' => 0,
            'durations' => [],
            'latestStatus' => $status,
            'lastExecutedAt' => $startedAt,
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

    if ($durationSec !== null) {
        $statsByWorkflow[$wid]['durations'][] = $durationSec;
    }

    if (count($statsByWorkflow[$wid]['recentLogs']) < 5) {
        $statsByWorkflow[$wid]['recentLogs'][] = [
            'id' => isset($ex['id']) ? $ex['id'] : '',
            'status' => $status,
            'mode' => isset($ex['mode']) ? $ex['mode'] : 'trigger',
            'startedAt' => $startedAt,
            'stoppedAt' => $stoppedAt,
            'durationSec' => $durationSec
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
        'durations' => [],
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
        $healthStatus = 'healthy';
        $healthyCount++;
    } else {
        $healthStatus = 'paused';
    }

    $avgDuration = (!empty($st['durations']))
        ? round(array_sum($st['durations']) / count($st['durations']), 2)
        : null;

    $folderName = isset($w['parentFolder']['name']) ? $w['parentFolder']['name'] : 'General';

    $formattedWorkflows[] = [
        'id' => $wid,
        'name' => $w['name'],
        'active' => $isActive,
        'status' => $healthStatus,
        'folder' => $folderName,
        'executionsToday' => $st['executionsToday'],
        'successToday' => $st['successToday'],
        'errorToday' => $st['errorToday'],
        'avgDurationSec' => $avgDuration,
        'lastExecutedAt' => $st['lastExecutedAt'],
        'createdAt' => isset($w['createdAt']) ? $w['createdAt'] : null,
        'updatedAt' => isset($w['updatedAt']) ? $w['updatedAt'] : null,
        'tags' => isset($w['tags']) ? $w['tags'] : [],
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

$meanRuntimeSec = (!empty($allDurations)) 
    ? round(array_sum($allDurations) / count($allDurations), 2)
    : null;

$result = [
    'success' => true,
    'timestamp' => gmdate('Y-m-d\TH:i:s\Z'),
    'isStale' => false,
    'summary' => [
        'totalWorkflows' => count($workflows),
        'activeWorkflows' => $activeCount,
        'healthyWorkflows' => $healthyCount,
        'errorWorkflows' => $errorCount,
        'totalExecutionsToday' => $totalExecutionsToday,
        'totalSuccessToday' => $totalSuccessToday,
        'totalErrorsToday' => $totalErrorsToday,
        'avgRuntimeSec' => $meanRuntimeSec
    ],
    'workflows' => $formattedWorkflows
];

$jsonOutput = json_encode($result, JSON_PRETTY_PRINT);
@file_put_contents($cacheDataFile, $jsonOutput);

echo $jsonOutput;
?>