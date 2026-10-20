<?php
// Hostinger Server-Side AI Property Name Shortener
// Uses OpenAI gpt-4o-mini to reduce long/compound Dubai property titles to clean building names

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$rawInput = file_get_contents('php://input');
$payload = json_decode($rawInput, true) ?: [];
$name = trim($payload['name'] ?? $_GET['name'] ?? '');

if (empty($name)) {
    echo json_encode(['success' => false, 'error' => 'Property name is required.']);
    exit;
}

$openAiKey = getenv('OPENAI_API_KEY') ?: base64_decode('c2stcHJvai15V3ZJZ2c4WmEtbDg3c2hEQkc0czhrTUxLbW0zbjdHdXZNZ0dibGxyVl9JWmVnTnJyTHh1U0VpTnRWSGtmQmNkNVNYNnhtSjUzUFQzQmxia0ZKcmlXVkVzVmFyU2s0X3ZuY1lEZlhQMGQ2TUxXWEpmcVJxUXBlU0dfODczcW1ld0hEUkpENHdGazBXMEl6ZnAwVEFXMmZOQXJnMEE=');

if (empty($openAiKey)) {
    // Regex fallback
    $fallback = cleanWithRegex($name);
    echo json_encode(['success' => true, 'building_name' => $fallback, 'source' => 'fallback']);
    exit;
}

$systemPrompt = "You extract and shorten the official building or project name from a Dubai property title for a standardized rental listing form. Return ONLY the concise building name under 25 characters (e.g., 'V3 Tower', 'Burj Khalifa', 'Marina Gate 1'). Strip unit numbers, bedroom counts, community names, and marketing words. Never return explanations or quotes.";

$ch = curl_init('https://api.openai.com/v1/chat/completions');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Authorization: Bearer ' . $openAiKey
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'model' => 'gpt-4o-mini',
    'messages' => [
        ['role' => 'system', 'content' => $systemPrompt],
        ['role' => 'user', 'content' => $name]
    ],
    'temperature' => 0.1,
    'max_tokens' => 30
]));
curl_setopt($ch, CURLOPT_TIMEOUT, 10);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode === 200 && $response) {
    $resData = json_decode($response, true);
    $aiText = trim($resData['choices'][0]['message']['content'] ?? '');
    $aiText = trim($aiText, "\"'` ");
    if (!empty($aiText)) {
        echo json_encode(['success' => true, 'building_name' => $aiText, 'source' => 'openai']);
        exit;
    }
}

// Fallback
echo json_encode(['success' => true, 'building_name' => cleanWithRegex($name), 'source' => 'regex_fallback']);

function cleanWithRegex($str) {
    $s = trim($str);
    $s = preg_replace('/\b(?:Unit|Apt|Apartment|Flat|Villa|Office|Penthouse|Suite|Plot|#)\s*[\w\d-]+/i', '', $s);
    $parts = preg_split('/[-–—|]/', $s);
    $s = trim($parts[0] ?? $s);
    $s = preg_replace('/[,\s]+$/', '', $s);
    $s = preg_replace('/^\s*,\s*/', '', $s);
    if (strtoupper($s) === $s && strlen($s) > 3) {
        $s = ucwords(strtolower($s));
    }
    return substr(trim($s), 0, 25);
}
