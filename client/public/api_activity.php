<?php
// ==============================================================================
// AS PROPERTIES - BITRIX24 ACTIVITY & TELESALES ENGINE
// Endpoint: https://admin.asquared.ae/dashboard/api_activity.php
// Bridges Bitrix24 SPA (entityTypeId: 1100 - Telesales Owners Data),
// Timeline Comments (Audio recordings & Voice Transcripts), and Agent Assignments.
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

// Stage dictionary mapping
$STAGE_MAP = [
    'DT1100_44:NEW' => ['name' => 'Import Data', 'key' => 'import', 'color' => '#f6989c'],
    'DT1100_44:ASQ_READY_CALL' => ['name' => 'Validated - Ready for Call', 'key' => 'ready', 'color' => '#39A8EF'],
    'DT1100_44:CLIENT' => ['name' => 'No Answer', 'key' => 'no_answer', 'color' => '#10e5fc'],
    'DT1100_44:ASQ_DUPLICATE_REVIEW' => ['name' => 'Duplicate Review', 'key' => 'duplicate', 'color' => '#F7A700'],
    'DT1100_44:UC_5B620Q' => ['name' => 'Contacted', 'key' => 'contacted', 'color' => '#00c4fb'],
    'DT1100_44:UC_HGMTGR' => ['name' => 'Has Property', 'key' => 'has_property', 'color' => '#468ee5'],
    'DT1100_44:UC_4IMVM8' => ['name' => 'Interested to Sell/Rent', 'key' => 'interested', 'color' => '#75d900'],
    'DT1100_44:UC_R5D0DH' => ['name' => 'No Property', 'key' => 'no_property', 'color' => '#ffab00'],
    'DT1100_44:UC_QE3TNO' => ['name' => 'Not Interested', 'key' => 'not_interested', 'color' => '#ff5752'],
    'DT1100_44:SUCCESS' => ['name' => 'Success / Won', 'key' => 'success', 'color' => '#00ff00'],
    'DT1100_44:FAIL' => ['name' => 'Failed / Archived', 'key' => 'failed', 'color' => '#EE1D24'],
    'DT1100_44:UC_181HFA' => ['name' => 'Reshuffle Pool', 'key' => 'reshuffle', 'color' => '#EE1D24'],
];

function callBitrix($method, $payload = []) {
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
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if (!$raw) {
        return ['error' => 'Connection failed to Bitrix24'];
    }
    
    $decoded = json_decode($raw, true);
    return $decoded ?: ['error' => 'Invalid JSON from Bitrix24', 'raw' => $raw];
}

// Read input parameters
$action = $_GET['action'] ?? $_POST['action'] ?? 'get_activity';

// -----------------------------------------------------------------------------
// 1. ACTION: GET_AGENTS
// Returns list of active agents with Bitrix IDs, names, emails, and photos
// -----------------------------------------------------------------------------
if ($action === 'get_agents') {
    $res = callBitrix('user.get', ['filter' => ['ACTIVE' => true]]);
    $users = $res['result'] ?? [];
    
    $agents = [];
    foreach ($users as $u) {
        $name = trim(($u['NAME'] ?? '') . ' ' . ($u['LAST_NAME'] ?? ''));
        if (empty($name)) $name = $u['EMAIL'] ?? ('User #' . $u['ID']);
        
        $agents[] = [
            'id' => (string)$u['ID'],
            'name' => $name,
            'email' => $u['EMAIL'] ?? '',
            'position' => $u['WORK_POSITION'] ?? '',
            'photo' => $u['PERSONAL_PHOTO'] ?? null,
            'mobile' => $u['PERSONAL_MOBILE'] ?? ''
        ];
    }
    
    // Custom sort: Vikram, Mayannk, Melanie, Angel first, then alphabetical
    usort($agents, function($a, $b) {
        $priority = ['144' => 1, '75' => 2, '68' => 3, '6' => 4, '11' => 5, '12' => 6];
        $pA = $priority[$a['id']] ?? 99;
        $pB = $priority[$b['id']] ?? 99;
        if ($pA !== $pB) return $pA - $pB;
        return strcmp($a['name'], $b['name']);
    });
    
    echo json_encode(['success' => true, 'count' => count($agents), 'agents' => $agents]);
    exit();
}

// -----------------------------------------------------------------------------
// 2. ACTION: GET_ACTIVITY
// Returns assigned cards for an agent, mapped with project, unit, and phone
// -----------------------------------------------------------------------------
if ($action === 'get_activity') {
    $agentId = $_GET['agent_id'] ?? $_POST['agent_id'] ?? '144'; // default to Vikram
    $stageId = $_GET['stage_id'] ?? $_POST['stage_id'] ?? null;
    $search = trim($_GET['search'] ?? $_POST['search'] ?? '');
    $limit = min(max((int)($_GET['limit'] ?? $_POST['limit'] ?? 50), 1), 100);
    $start = (int)($_GET['start'] ?? $_POST['start'] ?? 0);
    
    $filter = [];
    if ($agentId !== 'all') {
        $filter['assignedById'] = $agentId;
    }
    if (!empty($stageId)) {
        $filter['stageId'] = $stageId;
    }
    
    // Bitrix payload
    $payload = [
        'entityTypeId' => $ENTITY_TYPE_ID,
        'filter' => $filter,
        'select' => [
            'id', 'title', 'stageId', 'createdTime', 'updatedTime', 'lastActivityTime', 'assignedById',
            'ufCrm19_1776147554', // Category
            'ufCrm19_1776147607', // Project Name
            'ufCrm19_1776147625', // Location
            'ufCrm19_1776147649', // Owner Name
            'ufCrm19_1776186597', // Unit Number
            'ufCrm19_1776186627', // Contact Number
            'ufCrm19_1785239877'  // Whatsapp Link
        ],
        'order' => ['updatedTime' => 'desc', 'id' => 'desc'],
        'start' => $start
    ];
    
    $res = callBitrix('crm.item.list', $payload);
    $rawItems = $res['result']['items'] ?? [];
    $total = $res['total'] ?? count($rawItems);
    
    // Fetch agent lookup map for quick photo/name binding
    $usersRes = callBitrix('user.get', ['filter' => ['ACTIVE' => true]]);
    $userMap = [];
    foreach ($usersRes['result'] ?? [] as $u) {
        $userMap[$u['ID']] = [
            'name' => trim(($u['NAME'] ?? '') . ' ' . ($u['LAST_NAME'] ?? '')),
            'photo' => $u['PERSONAL_PHOTO'] ?? null
        ];
    }
    
    $normalized = [];
    $stagesSummary = [
        'ready' => 0,
        'contacted' => 0,
        'has_property' => 0,
        'interested' => 0,
        'success' => 0,
        'no_answer' => 0,
        'not_interested' => 0,
        'other' => 0
    ];
    
    foreach ($rawItems as $item) {
        $sId = $item['stageId'] ?? '';
        $stageMeta = $STAGE_MAP[$sId] ?? [
            'name' => 'In Progress',
            'key' => 'other',
            'color' => '#385175'
        ];
        
        $key = $stageMeta['key'] ?? 'other';
        if (isset($stagesSummary[$key])) {
            $stagesSummary[$key]++;
        } else {
            $stagesSummary['other']++;
        }
        
        $contact = preg_replace('/[^0-9]/', '', $item['ufCrm19_1776186627'] ?? '');
        $waLink = $item['ufCrm19_1785239877'] ?? '';
        if (empty($waLink) && !empty($contact)) {
            $waLink = 'https://wa.me/' . $contact;
        }
        
        $assignedId = (string)($item['assignedById'] ?? '6');
        $agentInfo = $userMap[$assignedId] ?? ['name' => 'Agent #' . $assignedId, 'photo' => null];
        
        $card = [
            'id' => (int)$item['id'],
            'title' => $item['title'] ?? ('Telesales - Owners data #' . $item['id']),
            'project_name' => $item['ufCrm19_1776147607'] ?? 'Project Unspecified',
            'location' => $item['ufCrm19_1776147625'] ?? 'Dubai',
            'owner_name' => $item['ufCrm19_1776147649'] ?? 'Owner Unspecified',
            'unit_number' => $item['ufCrm19_1776186597'] ?? '',
            'contact_number' => $contact,
            'whatsapp_link' => $waLink,
            'property_category' => $item['ufCrm19_1776147554'] ?? 'Apartment',
            'stage_id' => $sId,
            'stage_name' => $stageMeta['name'],
            'stage_key' => $key,
            'stage_color' => $stageMeta['color'],
            'assigned_by_id' => $assignedId,
            'assigned_by_name' => $agentInfo['name'],
            'assigned_by_photo' => $agentInfo['photo'],
            'created_time' => $item['createdTime'] ?? '',
            'updated_time' => $item['updatedTime'] ?? '',
            'last_activity_time' => $item['lastActivityTime'] ?? '',
            'crm_link' => 'https://crm.asquared.ae/crm/type/' . $ENTITY_TYPE_ID . '/details/' . $item['id'] . '/'
        ];
        
        // Client-side text search filter if provided
        if (!empty($search)) {
            $haystack = strtolower(
                $card['title'] . ' ' .
                $card['project_name'] . ' ' .
                $card['location'] . ' ' .
                $card['owner_name'] . ' ' .
                $card['unit_number'] . ' ' .
                $card['contact_number']
            );
            if (strpos($haystack, strtolower($search)) === false) {
                continue;
            }
        }
        
        $normalized[] = $card;
    }
    
    echo json_encode([
        'success' => true,
        'agent_id' => $agentId,
        'total' => $total,
        'count' => count($normalized),
        'stages_summary' => $stagesSummary,
        'items' => $normalized
    ]);
    exit();
}

// -----------------------------------------------------------------------------
// 3. ACTION: GET_ITEM_TIMELINE
// Pulls timeline comments, voice call notes, audio URL, and transcripts
// -----------------------------------------------------------------------------
if ($action === 'get_item_timeline') {
    $itemId = (int)($_GET['item_id'] ?? $_POST['item_id'] ?? 0);
    if ($itemId <= 0) {
        echo json_encode(['success' => false, 'error' => 'Missing item_id']);
        exit();
    }
    
    $res = callBitrix('crm.timeline.comment.list', [
        'filter' => [
            'ENTITY_TYPE' => 'DYNAMIC_' . $ENTITY_TYPE_ID,
            'ENTITY_ID' => $itemId
        ]
    ]);
    
    $comments = $res['result'] ?? [];
    $parsedTimeline = [];
    
    foreach ($comments as $c) {
        $rawComment = $c['COMMENT'] ?? '';
        
        // Extract Recording URL
        $recordingUrl = '';
        if (preg_match('/Recording URL:\s*([^\s\|]+)/i', $rawComment, $m)) {
            $recordingUrl = trim($m[1]);
        }
        
        // Extract Transcripts Link
        $transcriptUrl = '';
        if (preg_match('/Voice Transcripts:\s*([^\s\|]+)/i', $rawComment, $m)) {
            $transcriptUrl = trim($m[1]);
        }
        
        // Extract Call Note / Sentiment
        $callNote = '';
        if (preg_match('/Call Note:\s*([^\|]+)/i', $rawComment, $m)) {
            $callNote = trim($m[1]);
        }
        
        // Extract Voice Status
        $voiceStatus = '';
        if (preg_match('/voice call Status:\s*([^\|]+)/i', $rawComment, $m)) {
            $voiceStatus = trim($m[1]);
        }
        
        $parsedTimeline[] = [
            'id' => $c['ID'],
            'created' => $c['CREATED'],
            'author_id' => $c['AUTHOR_ID'] ?? '',
            'raw_comment' => $rawComment,
            'recording_url' => $recordingUrl,
            'transcript_url' => $transcriptUrl,
            'call_note' => $callNote,
            'voice_status' => $voiceStatus,
            'is_voice_call' => !empty($recordingUrl) || !empty($voiceStatus)
        ];
    }
    
    echo json_encode([
        'success' => true,
        'item_id' => $itemId,
        'count' => count($parsedTimeline),
        'timeline' => $parsedTimeline
    ]);
    exit();
}

// -----------------------------------------------------------------------------
// 4. ACTION: UPDATE_STAGE
// Updates card stage in Bitrix24
// -----------------------------------------------------------------------------
if ($action === 'update_stage') {
    $itemId = (int)($_POST['item_id'] ?? $_GET['item_id'] ?? 0);
    $newStageId = $_POST['stage_id'] ?? $_GET['stage_id'] ?? '';
    $assignedById = $_POST['assigned_by_id'] ?? $_GET['assigned_by_id'] ?? null;
    
    if ($itemId <= 0 || empty($newStageId)) {
        echo json_encode(['success' => false, 'error' => 'Missing item_id or stage_id']);
        exit();
    }
    
    $fields = ['stageId' => $newStageId];
    if (!empty($assignedById)) {
        $fields['assignedById'] = (int)$assignedById;
    }
    
    $res = callBitrix('crm.item.update', [
        'entityTypeId' => $ENTITY_TYPE_ID,
        'id' => $itemId,
        'fields' => $fields
    ]);
    
    if (isset($res['result']['item'])) {
        echo json_encode(['success' => true, 'item' => $res['result']['item']]);
    } else {
        echo json_encode(['success' => false, 'error' => $res['error_description'] ?? 'Bitrix update failed', 'raw' => $res]);
    }
    exit();
}

// -----------------------------------------------------------------------------
// 5. ACTION: REASSIGN_AGENT
// Reassigns responsible person in Bitrix24
// -----------------------------------------------------------------------------
if ($action === 'reassign_agent') {
    $itemId = (int)($_POST['item_id'] ?? $_GET['item_id'] ?? 0);
    $newAgentId = (int)($_POST['agent_id'] ?? $_GET['agent_id'] ?? 0);
    
    if ($itemId <= 0 || $newAgentId <= 0) {
        echo json_encode(['success' => false, 'error' => 'Missing item_id or agent_id']);
        exit();
    }
    
    $res = callBitrix('crm.item.update', [
        'entityTypeId' => $ENTITY_TYPE_ID,
        'id' => $itemId,
        'fields' => ['assignedById' => $newAgentId]
    ]);
    
    if (isset($res['result']['item'])) {
        echo json_encode(['success' => true, 'item' => $res['result']['item']]);
    } else {
        echo json_encode(['success' => false, 'error' => $res['error_description'] ?? 'Bitrix reassign failed']);
    }
    exit();
}

// Default response
echo json_encode([
    'success' => false,
    'error' => 'Unknown action. Available actions: get_agents, get_activity, get_item_timeline, update_stage, reassign_agent'
]);
