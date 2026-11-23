<?php
// ==============================================================================
// AS PROPERTIES - AGENT REAL-TIME WEBHOOK GATEWAY
// Endpoint: https://admin.asquared.ae/dashboard/api_agent_webhook.php
// Dedicated bidirectional webhook receiver for all 30 active agents.
// Bridges Bitrix24 automations, VAPI telephony, n8n, and the React Dashboard.
// ==============================================================================

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$BITRIX_BASE = 'https://crm.asquared.ae/rest/6/se51vx22azw2dq1s/';
$ENTITY_TYPE_ID = 1100; // SPA "Telesales - Owners data"

$SUPABASE_URL = 'https://qgxgtavkovqklijfpnfl.supabase.co/rest/v1';
$SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFneGd0YXZrb3Zxa2xpamZwbmZsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA2MDUzOSwiZXhwIjoyMDkzNjM2NTM5fQ.X8Lpgzpm1Xgb0v9qML9W6Xm3hDKCwFVeniJs39F5z54';

function callBitrixApi($method, $payload = []) {
    global $BITRIX_BASE;
    $url = $BITRIX_BASE . $method . '.json';
    
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 20);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
    
    if (!empty($payload)) {
        $json = json_encode($payload);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $json);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Content-Length: ' . strlen($json)
        ]);
    }
    
    $raw = curl_exec($ch);
    curl_close($ch);
    return json_decode($raw, true) ?: [];
}

function logToSupabase($agentId, $eventType, $payload) {
    global $SUPABASE_URL, $SUPABASE_KEY;
    $ch = curl_init($SUPABASE_URL . '/asq_crm_events_v1');
    $body = json_encode([
        'source' => 'agent_webhook',
        'source_event_id' => 'agt_' . $agentId . '_' . time(),
        'event_type' => $eventType,
        'payload' => $payload,
        'status' => 'processed',
        'occurred_at' => date('c')
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'apikey: ' . $SUPABASE_KEY,
        'Authorization: Bearer ' . $SUPABASE_KEY,
        'Content-Type: application/json',
        'Prefer: return=minimal'
    ]);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_exec($ch);
    curl_close($ch);
}

// Read incoming input payload (supports JSON or form-data)
$rawBody = file_get_contents('php://input');
$jsonBody = json_decode($rawBody, true) ?: [];
$input = array_merge($_GET, $_POST, $jsonBody);

$action = $input['action'] ?? 'receive';

// -----------------------------------------------------------------------------
// 1. ACTION: LIST_WEBHOOKS
// Generates personalized webhook URLs for all 30 active agents
// -----------------------------------------------------------------------------
if ($action === 'list_webhooks') {
    $res = callBitrixApi('user.get', ['filter' => ['ACTIVE' => true]]);
    $users = $res['result'] ?? [];
    
    $baseUrl = 'https://admin.asquared.ae/dashboard/api_agent_webhook.php';
    $agentWebhooks = [];
    
    foreach ($users as $u) {
        $id = (string)$u['ID'];
        $name = trim(($u['NAME'] ?? '') . ' ' . ($u['LAST_NAME'] ?? ''));
        if (empty($name)) $name = $u['EMAIL'] ?? ('Agent #' . $id);
        
        $agentWebhooks[] = [
            'id' => $id,
            'name' => $name,
            'email' => $u['EMAIL'] ?? '',
            'photo' => $u['PERSONAL_PHOTO'] ?? null,
            'webhook_url' => $baseUrl . '?agent_id=' . $id,
            'docs' => [
                'method' => 'POST',
                'sample_payload' => [
                    'agent_id' => $id,
                    'item_id' => 25102,
                    'stage_id' => 'DT1100_44:UC_4IMVM8',
                    'call_note' => 'Owner confirmed interest on call',
                    'audio_url' => 'https://...'
                ]
            ]
        ];
    }
    
    echo json_encode([
        'success' => true,
        'universal_webhook' => $baseUrl,
        'total_agents' => count($agentWebhooks),
        'agents' => $agentWebhooks
    ]);
    exit();
}

// -----------------------------------------------------------------------------
// 2. ACTION: RECEIVE (Default Webhook Handler)
// Handles incoming updates from Bitrix Automations, n8n, VAPI, or Zapier
// -----------------------------------------------------------------------------
$agentId = (string)($input['agent_id'] ?? $input['assigned_by_id'] ?? '144');
$itemId = (int)($input['item_id'] ?? $input['id'] ?? 0);
$stageId = $input['stage_id'] ?? $input['stage'] ?? '';
$callNote = $input['call_note'] ?? $input['note'] ?? $input['comment'] ?? '';
$audioUrl = $input['audio_url'] ?? $input['recording_url'] ?? '';
$transcriptUrl = $input['transcript_url'] ?? $input['transcript'] ?? '';

// Check if this is a ping/test
if (($input['ping'] ?? '') === 'true' || ($input['test'] ?? '') === 'true') {
    logToSupabase($agentId, 'webhook_ping', ['agent_id' => $agentId, 'received' => $input]);
    echo json_encode([
        'success' => true,
        'status' => 'connected',
        'agent_id' => $agentId,
        'message' => 'Agent webhook is online and ready to receive live lead events.',
        'received_at' => date('c')
    ]);
    exit();
}

// If item_id exists: update the card in Bitrix24
$bitrixUpdateResult = null;
if ($itemId > 0) {
    $fieldsToUpdate = [];
    if (!empty($stageId)) {
        // Normalize shorthand stage names
        if ($stageId === 'interested') $stageId = 'DT1100_44:UC_4IMVM8';
        elseif ($stageId === 'contacted') $stageId = 'DT1100_44:UC_5B620Q';
        elseif ($stageId === 'has_property') $stageId = 'DT1100_44:UC_HGMTGR';
        elseif ($stageId === 'won') $stageId = 'DT1100_44:SUCCESS';
        elseif ($stageId === 'ready') $stageId = 'DT1100_44:ASQ_READY_CALL';

        $fieldsToUpdate['stageId'] = $stageId;
    }
    if (!empty($agentId) && $agentId !== 'all') {
        $fieldsToUpdate['assignedById'] = (int)$agentId;
    }
    
    if (!empty($fieldsToUpdate)) {
        $bitrixUpdateResult = callBitrixApi('crm.item.update', [
            'entityTypeId' => $ENTITY_TYPE_ID,
            'id' => $itemId,
            'fields' => $fieldsToUpdate
        ]);
    }
    
    // If call note or audio recording supplied: append timeline comment
    if (!empty($callNote) || !empty($audioUrl)) {
        $formattedComment = "voice call Status: Awaiting availability || 📝 Call Note: " . $callNote;
        if (!empty($audioUrl)) {
            $formattedComment .= " || Recording URL: " . $audioUrl;
        }
        $formattedComment .= " || Voice Last Contacted: " . date('c');
        if (!empty($transcriptUrl)) {
            $formattedComment .= " || Voice Transcripts: " . $transcriptUrl;
        }
        
        callBitrixApi('crm.timeline.comment.add', [
            'fields' => [
                'ENTITY_TYPE' => 'DYNAMIC_' . $ENTITY_TYPE_ID,
                'ENTITY_ID' => $itemId,
                'COMMENT' => $formattedComment
            ]
        ]);
    }
}

// Log event to Supabase audit log
logToSupabase($agentId, 'agent_webhook_event', [
    'agent_id' => $agentId,
    'item_id' => $itemId,
    'stage_id' => $stageId,
    'call_note' => $callNote,
    'audio_url' => $audioUrl,
    'raw_payload' => $input
]);

echo json_encode([
    'success' => true,
    'agent_id' => $agentId,
    'item_id' => $itemId,
    'stage_id' => $stageId,
    'bitrix_sync' => (bool)($bitrixUpdateResult && isset($bitrixUpdateResult['result'])),
    'message' => "Successfully processed webhook for Agent #{$agentId} on item #{$itemId}.",
    'timestamp' => date('c')
]);
