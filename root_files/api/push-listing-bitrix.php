<?php
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, apikey, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method Not Allowed']);
    exit;
}

$rawInput = file_get_contents('php://input');
$input = json_decode($rawInput, true);

if (!$input || empty($input['listing'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing listing payload']);
    exit;
}

$listing = $input['listing'];
$commercial = $input['commercial_specs'] ?? $listing['commercial_specs'] ?? [];
$rental = $input['rental_specs'] ?? $listing['rental_specs'] ?? [];
$titleDeed = $input['title_deed_data'] ?? $listing['dossier_data'] ?? [];
$ownerName = $commercial['owner_name'] ?? $titleDeed['owner_name_english'] ?? 'Property Owner';
$agentId = !empty($commercial['agent_id']) ? $commercial['agent_id'] : '6';
$agentName = !empty($commercial['broker_agent_name']) ? $commercial['broker_agent_name'] : 'Melanie Simsiman';

$bitrixWebhook = getenv('BITRIX24_WEBHOOK') ?: 'https://crm.asquared.ae/rest/6/se51vx22azw2dq1s/';
$bitrixUrl = rtrim($bitrixWebhook, '/') . '/crm.deal.add.json';

$building = $listing['building_name'] ?? $titleDeed['building_name'] ?? 'Dubai';
$unit = $listing['unit_number'] ?? $titleDeed['unit_number'] ?? '';
$dealTitle = "[Listing Mandate] " . trim("$building " . ($unit ? "Unit $unit" : "")) . " - $ownerName";

$cleanPrice = 0;
if (!empty($listing['price'])) {
    $cleanPrice = floatval(preg_replace('/[^0-9.]/', '', strval($listing['price'])));
}

$comments = "=== A-SQUARED LISTING MANDATE ===\n";
$comments .= "Listing ID: " . ($listing['id'] ?? 'N/A') . "\n";
$comments .= "Reference: " . ($listing['reference'] ?? 'ASQ-PROP') . "\n";
$comments .= "Property Type: " . ($listing['property_type'] ?? 'Apartment') . " (" . ($listing['purpose'] ?? 'For Sale') . ")\n";
$comments .= "Building: $building\n";
$comments .= "Unit: $unit\n";
$comments .= "Community: " . ($listing['community'] ?? 'Dubai') . "\n";
$comments .= "Gross Area: " . ($listing['size_sqft'] ?? 'N/A') . " sq.ft.\n";
$comments .= "Price: AED " . number_format($cleanPrice, 2) . "\n";
$comments .= "Landlord: $ownerName\n";
$comments .= "Phone: " . ($commercial['owner_phone'] ?? 'N/A') . "\n";
$comments .= "Email: " . ($commercial['owner_email'] ?? 'N/A') . "\n";
$comments .= "Agreement Type: " . ($rental['agreement_type'] ?? 'Non-Exclusive') . "\n";
$comments .= "Duration: " . ($rental['agreement_duration'] ?? '3 Month') . "\n";
$comments .= "Cheques: " . ($rental['cheques'] ?? '4 Cheques') . "\n";
$comments .= "Deposit: " . ($rental['security_deposit'] ?? '5%') . "\n";
$comments .= "Assigned Agent: $agentName (ID: $agentId)\n";
$comments .= "Dashboard Link: https://admin.asquared.ae/dashboard/\n";

$fields = [
    'TITLE' => $dealTitle,
    'OPPORTUNITY' => $cleanPrice,
    'CURRENCY_ID' => 'AED',
    'ASSIGNED_BY_ID' => $agentId,
    'COMMENTS' => $comments,
    'STAGE_ID' => 'NEW'
];

$postData = ['fields' => $fields, 'params' => ['REGISTER_SONET_EVENT' => 'Y']];

$ch = curl_init($bitrixUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($postData));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);

$res = curl_exec($ch);
$err = curl_error($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($err || $code >= 400) {
    echo json_encode([
        'success' => false,
        'error' => "Bitrix API error ($code): " . ($err ?: $res)
    ]);
    exit;
}

$resData = json_decode($res, true);
$dealId = $resData['result'] ?? null;

echo json_encode([
    'success' => true,
    'dealId' => $dealId,
    'dealUrl' => $dealId ? "https://crm.asquared.ae/crm/deal/details/{$dealId}/" : null
]);
