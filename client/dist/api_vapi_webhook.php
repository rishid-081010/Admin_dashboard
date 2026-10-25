<?php
// AS PROPERTIES DUBAI — LIVE VAPI WEBHOOK INGESTION ENDPOINT
// Hosted on admin.asquared.ae with valid SSL
// Ingests real-time call outcomes into Supabase & forwards to n8n

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, x-vapi-secret');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$rawInput = file_get_contents('php://input');
if (empty($rawInput)) {
    echo json_encode(['status' => 'empty_payload']);
    exit;
}

$data = json_decode($rawInput, true);
if (!$data) {
    echo json_encode(['status' => 'invalid_json']);
    exit;
}

// 1. Asynchronously forward copies to n8n V1 & V2 (bypassing expired SSL)
$n8nEndpoints = [
    'https://n8n.asquared.ae/webhook/owner-call-outcome',
    'https://n8n.asquared.ae/webhook/v2-vapi-webhook'
];
foreach ($n8nEndpoints as $url) {
    $chFwd = curl_init();
    curl_setopt_array($chFwd, [
        CURLOPT_URL => $url,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $rawInput,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => false,
        CURLOPT_TIMEOUT => 3,
        CURLOPT_RETURNTRANSFER => true
    ]);
    curl_exec($chFwd);
    curl_close($chFwd);
}

// 2. Extract call details
$call = $data['message']['call'] ?? $data['call'] ?? $data;
$callId = $call['id'] ?? null;

if (!$callId) {
    echo json_encode(['status' => 'acknowledged_no_call_id']);
    exit;
}

// Compute duration
$startedAt = $call['startedAt'] ?? null;
$endedAt = $call['endedAt'] ?? null;
$dur = 0;
if (!empty($startedAt) && !empty($endedAt)) {
    $dur = max(0, round(strtotime($endedAt) - strtotime($startedAt)));
} elseif (!empty($call['durationSeconds'])) {
    $dur = round($call['durationSeconds']);
} elseif (!empty($call['duration'])) {
    $dur = round($call['duration']);
}

// Compute voice call status
$endedReason = $call['endedReason'] ?? $call['status'] ?? 'ended';
$isHumanAnswered = ($endedReason === 'customer-ended-call' || $endedReason === 'assistant-ended-call');
$transcript = is_string($call['transcript'] ?? null) ? $call['transcript'] : json_encode($call['transcript'] ?? '');
$summary = $call['summary'] ?? ($call['analysis']['summary'] ?? null);
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

$supabaseRecord = [
    'id' => $callId,
    'started_at' => $startedAt,
    'customer_phone' => $call['customer']['number'] ?? null,
    'customer_name' => $call['customer']['name'] ?? null,
    'duration_seconds' => $dur,
    'status' => $endedReason,
    'cost_usd' => isset($call['cost']) ? floatval($call['cost']) : null,
    'source' => 'vapi_live_webhook',
    'transcript' => $transcript,
    'summary' => $summary,
    'recording_url' => $call['recordingUrl'] ?? ($call['stereoRecordingUrl'] ?? null),
    'created_at' => $call['createdAt'] ?? date('c'),
    'updated_at' => $call['updatedAt'] ?? date('c'),
    'vapi_account' => 'owners',
    'assistantId' => $call['assistantId'] ?? null,
    'type' => $call['type'] ?? 'outboundPhoneCall',
    'voice_call_status' => $vStatus,
    'note' => $endedReason
];

// 3. Upsert into Supabase
$supabaseUrl = 'https://qgxgtavkovqklijfpnfl.supabase.co/rest/v1/vapi_call_logs';
$supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFneGd0YXZrb3Zxa2xpamZwbmZsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA2MDUzOSwiZXhwIjoyMDkzNjM2NTM5fQ.X8Lpgzpm1Xgb0v9qML9W6Xm3hDKCwFVeniJs39F5z54';

$chSb = curl_init();
curl_setopt_array($chSb, [
    CURLOPT_URL => $supabaseUrl,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode([$supabaseRecord]),
    CURLOPT_HTTPHEADER => [
        'apikey: ' . $supabaseKey,
        'Authorization: Bearer ' . $supabaseKey,
        'Content-Type: application/json',
        'Prefer: resolution=merge-duplicates'
    ],
    CURLOPT_TIMEOUT => 5,
    CURLOPT_RETURNTRANSFER => true
]);
$sbResponse = curl_exec($chSb);
$sbCode = curl_getinfo($chSb, CURLINFO_HTTP_CODE);
curl_close($chSb);

// 4. Directly invoke Supabase apply_provider_event RPC to immediately release concurrency slots and finalize call
$msgType = $data['message']['type'] ?? $data['type'] ?? '';
$rpcCode = null;
if (!empty($callId) && ($msgType === 'end-of-call-report' || !empty($endedReason))) {
    $rpcPayload = [
        'p_provider_call_id' => $callId,
        'p_ended_reason' => $endedReason,
        'p_duration_seconds' => intval($dur),
        'p_transcript' => $transcript,
        'p_summary' => $summary,
        'p_recording_url' => $call['recordingUrl'] ?? ($call['stereoRecordingUrl'] ?? null)
    ];
    $chRpc = curl_init();
    curl_setopt_array($chRpc, [
        CURLOPT_URL => 'https://qgxgtavkovqklijfpnfl.supabase.co/rest/v1/rpc/apply_provider_event',
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($rpcPayload),
        CURLOPT_HTTPHEADER => [
            'apikey: ' . $supabaseKey,
            'Authorization: Bearer ' . $supabaseKey,
            'Content-Type: application/json'
        ],
        CURLOPT_TIMEOUT => 5,
        CURLOPT_RETURNTRANSFER => true
    ]);
    $rpcResp = curl_exec($chRpc);
    $rpcCode = curl_getinfo($chRpc, CURLINFO_HTTP_CODE);
    curl_close($chRpc);

    // Also send instant refill ping to n8n to claim the freed slot within milliseconds
    $chRefill = curl_init();
    curl_setopt_array($chRefill, [
        CURLOPT_URL => 'https://n8n.asquared.ae/webhook/v2-call-scheduler-refill',
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode(['refill' => true, 'callId' => $callId]),
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => false,
        CURLOPT_TIMEOUT => 2,
        CURLOPT_RETURNTRANSFER => true
    ]);
    curl_exec($chRefill);
    curl_close($chRefill);
}

echo json_encode([
    'status' => 'ok',
    'call_id' => $callId,
    'supabase_code' => $sbCode,
    'rpc_code' => $rpcCode
]);
