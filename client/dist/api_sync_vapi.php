<?php
// AS PROPERTIES DUBAI — TELEPHONY CALL RECONCILIATION & AUTO-SYNC ENGINE
// Hosted on admin.asquared.ae
// Syncs all outbound calls from VAPI API into Supabase vapi_call_logs table

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

set_time_limit(180);
ignore_user_abort(true);

$supabaseUrl = 'https://qgxgtavkovqklijfpnfl.supabase.co/rest/v1/vapi_call_logs';
$supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFneGd0YXZrb3Zxa2xpamZwbmZsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA2MDUzOSwiZXhwIjoyMDkzNjM2NTM5fQ.X8Lpgzpm1Xgb0v9qML9W6Xm3hDKCwFVeniJs39F5z54';

$vapiKeys = [
    '30c267e1-fdfa-4c40-9c80-0e5bd97bcdbb',
    '9137dbd0-c126-4632-948e-e0326ce26050',
    'd9b21ab4-6b30-447c-962a-de2c1c460651',
    '1fe2c0bd-014d-4251-a32e-229e7a475609'
];

// Target date: Default to today in Dubai Time
$tz = new DateTimeZone('Asia/Dubai');
$nowDubai = new DateTime('now', $tz);
$targetDateStr = $_GET['date'] ?? $nowDubai->format('Y-m-d');

$startIso = $targetDateStr . 'T00:00:00.000Z';
$endDateObj = new DateTime($targetDateStr . ' 00:00:00', new DateTimeZone('UTC'));
$endDateObj->modify('+1 day');
$endIso = $endDateObj->format('Y-m-d') . 'T00:00:00.000Z';

function fetchAllCallsForDate($token, $startIso, $endIso) {
    $calls = [];
    $createdAtLt = null;

    while (true) {
        $url = 'https://api.vapi.ai/call?limit=100&createdAtGt=' . urlencode($startIso);
        $lt = $createdAtLt ?? $endIso;
        if (!empty($lt)) {
            $url .= '&createdAtLt=' . urlencode($lt);
        }

        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $token],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 20
        ]);
        $response = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($code !== 200 || empty($response)) {
            break;
        }

        $batch = json_decode($response, true);
        if (!is_array($batch) || empty($batch)) {
            break;
        }

        $calls = array_merge($calls, $batch);
        if (count($batch) < 100) {
            break;
        }

        $lastCall = end($batch);
        $createdAtLt = $lastCall['createdAt'] ?? null;
        if (!$createdAtLt) {
            break;
        }
    }

    return $calls;
}

function mapCallToSupabase($c) {
    $dur = 0;
    if (!empty($c['startedAt']) && !empty($c['endedAt'])) {
        $dur = max(0, round(strtotime($c['endedAt']) - strtotime($c['startedAt'])));
    } elseif (!empty($c['durationSeconds'])) {
        $dur = round($c['durationSeconds']);
    } elseif (!empty($c['duration'])) {
        $dur = round($c['duration']);
    }

    $endedReason = $c['endedReason'] ?? $c['status'] ?? 'ended';
    $isHumanAnswered = ($endedReason === 'customer-ended-call' || $endedReason === 'assistant-ended-call');
    $transcript = is_string($c['transcript'] ?? null) ? $c['transcript'] : json_encode($c['transcript'] ?? '');
    $summary = $c['summary'] ?? ($c['analysis']['summary'] ?? null);
    $tLower = strtolower($transcript . ' ' . ($summary ?? ''));

    $vStatus = $endedReason;
    if ($isHumanAnswered && ($dur >= 25 || strpos($tLower, 'interested') !== false || strpos($tLower, 'rent') !== false || strpos($tLower, 'sell') !== false || strpos($tLower, 'available') !== false || strpos($tLower, 'appointment') !== false)) {
        $vStatus = 'Awaiting availability – anyone who says yes to rent or sell according to the complete flow';
    } elseif ($isHumanAnswered) {
        $vStatus = 'Contacted – no action';
    } elseif ($endedReason === 'voicemail') {
        $vStatus = 'No answer – we need to call';
    } elseif ($endedReason === 'customer-did-not-answer') {
        $vStatus = 'did_not_answer';
    } elseif ($endedReason === 'customer-busy') {
        $vStatus = 'customer-busy';
    }

    return [
        'id' => $c['id'],
        'started_at' => $c['startedAt'] ?? null,
        'customer_phone' => $c['customer']['number'] ?? null,
        'customer_name' => $c['customer']['name'] ?? null,
        'duration_seconds' => $dur,
        'status' => $endedReason,
        'cost_usd' => isset($c['cost']) ? floatval($c['cost']) : null,
        'source' => 'vapi_continuous_sync',
        'transcript' => $transcript,
        'summary' => $summary,
        'recording_url' => $c['recordingUrl'] ?? ($c['stereoRecordingUrl'] ?? null),
        'created_at' => $c['createdAt'] ?? date('c'),
        'updated_at' => $c['updatedAt'] ?? date('c'),
        'vapi_account' => 'owners',
        'assistantId' => $c['assistantId'] ?? null,
        'type' => $c['type'] ?? 'outboundPhoneCall',
        'voice_call_status' => $vStatus,
        'note' => $endedReason
    ];
}

function upsertBatchToSupabase($batch, $supabaseUrl, $supabaseKey) {
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $supabaseUrl,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($batch),
        CURLOPT_HTTPHEADER => [
            'apikey: ' . $supabaseKey,
            'Authorization: Bearer ' . $supabaseKey,
            'Content-Type: application/json',
            'Prefer: resolution=merge-duplicates'
        ],
        CURLOPT_TIMEOUT => 15,
        CURLOPT_RETURNTRANSFER => true
    ]);
    $res = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return ($code >= 200 && $code < 300);
}

// Fetch all calls across 4 keys
$allCalls = [];
$breakdown = [];
foreach ($vapiKeys as $idx => $k) {
    $keyNum = $idx + 1;
    $keyCalls = fetchAllCallsForDate($k, $startIso, $endIso);
    $breakdown['key' . $keyNum] = count($keyCalls);
    $allCalls = array_merge($allCalls, $keyCalls);
}

$mapped = array_map('mapCallToSupabase', $allCalls);
$totalToUpsert = count($mapped);
$syncedCount = 0;

$batchSize = 50;
for ($i = 0; $i < $totalToUpsert; $i += $batchSize) {
    $chunk = array_slice($mapped, $i, $batchSize);
    if (upsertBatchToSupabase($chunk, $supabaseUrl, $supabaseKey)) {
        $syncedCount += count($chunk);
    }
}

echo json_encode([
    'success' => true,
    'date' => $targetDateStr,
    'total_vapi_calls' => $totalToUpsert,
    'synced_to_supabase' => $syncedCount,
    'breakdown_by_key' => $breakdown,
    'timestamp' => date('c')
]);
