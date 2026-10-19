<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, apikey');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
if (!$input || empty($input['owner'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing owner payload']);
    exit;
}

$owner = $input['owner'];
$agentId = !empty($input['agentId']) ? $input['agentId'] : (!empty($owner['assigned_agent_id']) ? $owner['assigned_agent_id'] : '6');
$agentName = !empty($input['agentName']) ? $input['agentName'] : (!empty($owner['assigned_agent']) ? $owner['assigned_agent'] : 'Melanie Simsiman');

$bitrixWebhook = getenv('BITRIX24_WEBHOOK') ?: 'https://crm.asquared.ae/rest/6/se51vx22azw2dq1s/';
$bitrixUrl = rtrim($bitrixWebhook, '/') . '/crm.lead.add.json';

$titleUnits = !empty($owner['total_units']) && $owner['total_units'] > 1 ? " ({$owner['total_units']} Units)" : "";
$leadTitle = "[" . (!empty($owner['lead_id']) ? $owner['lead_id'] : 'PORTAL') . "] " . (!empty($owner['name']) ? $owner['name'] : 'Owner') . " - " . (!empty($owner['building']) ? $owner['building'] : 'Dubai') . $titleUnits;

$comments = "Source: A-Squared Owners Data Portal\n";
$comments .= "Owner ID: " . (!empty($owner['canonical_owner_id']) ? $owner['canonical_owner_id'] : (!empty($owner['id']) ? $owner['id'] : 'N/A')) . "\n";
$comments .= "Building: " . (!empty($owner['building']) ? $owner['building'] : 'Dubai') . "\n";
$comments .= "Area: " . (!empty($owner['area']) ? $owner['area'] : 'Dubai') . "\n";
if (!empty($owner['total_units'])) {
    $comments .= "Total Units Owned: " . $owner['total_units'] . "\n";
}
if (!empty($owner['portfolioValue'])) {
    $comments .= "Portfolio Valuation: " . $owner['portfolioValue'] . "\n";
}
$comments .= "Assigned Agent: " . $agentName . " (ID: " . $agentId . ")\n";

$fields = [
    'TITLE' => $leadTitle,
    'NAME' => !empty($owner['raw_full_name']) ? $owner['raw_full_name'] : (!empty($owner['name']) ? $owner['name'] : 'Property Owner'),
    'ASSIGNED_BY_ID' => $agentId,
    'COMMENTS' => $comments
];

if (!empty($owner['phone']) && $owner['phone'] !== 'N/A') {
    $fields['PHONE'] = [['VALUE' => $owner['phone'], 'VALUE_TYPE' => 'WORK']];
}

$ch = curl_init($bitrixUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['fields' => $fields]));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($curlError) {
    http_response_code(500);
    echo json_encode(['error' => "cURL error: " . $curlError]);
    exit;
}

$result = json_decode($response, true);
if (!empty($result['result'])) {
    echo json_encode([
        'success' => true,
        'bitrix_id' => $result['result'],
        'assigned_agent' => $agentName,
        'assigned_agent_id' => $agentId
    ]);
} else {
    http_response_code(400);
    echo json_encode(['error' => 'Bitrix error', 'details' => $result]);
}
