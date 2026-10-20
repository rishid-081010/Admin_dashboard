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

// Disable max execution limits for OCR
@set_time_limit(180);
@ini_set('memory_limit', '256M');

$secretsFile = __DIR__ . '/secrets.php';
if (file_exists($secretsFile)) {
    require_once $secretsFile;
}

$openaiApiKey = defined('OPENAI_API_KEY') ? OPENAI_API_KEY : (getenv('OPENAI_API_KEY') ?: '');

function callOpenAiChat($messages, $apiKey, $jsonMode = true) {
    $url = 'https://api.openai.com/v1/chat/completions';
    $payload = [
        'model' => 'gpt-4o',
        'messages' => $messages,
        'temperature' => 0.1,
        'max_tokens' => 2000
    ];
    if ($jsonMode) {
        $payload['response_format'] = ['type' => 'json_object'];
    }

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $apiKey
    ]);
    curl_setopt($ch, CURLOPT_TIMEOUT, 90);

    $response = curl_exec($ch);
    $err = curl_error($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($err || $httpCode >= 400) {
        throw new Exception("OpenAI API call failed (HTTP $httpCode): " . ($err ?: $response));
    }

    $json = json_decode($response, true);
    $content = $json['choices'][0]['message']['content'] ?? '{}';
    return json_decode($content, true) ?: [];
}

function fileToDataUrl($tmpPath, $origName) {
    if (!file_exists($tmpPath)) return null;
    $ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION));
    $mime = 'image/jpeg';
    if ($ext === 'png') $mime = 'image/png';
    else if ($ext === 'webp') $mime = 'image/webp';
    else if ($ext === 'pdf') $mime = 'application/pdf';

    $data = file_get_contents($tmpPath);
    return 'data:' . $mime . ';base64,' . base64_encode($data);
}

$titleDeedData = null;
$emiratesIdData = null;
$kycResult = null;

try {
    // 1. Parse Title Deed if provided
    if (!empty($_FILES['title_deed']['tmp_name'])) {
        $deedFile = $_FILES['title_deed'];
        $dataUrl = fileToDataUrl($deedFile['tmp_name'], $deedFile['name']);
        
        $systemPrompt = "You are the Lead Legal Registrar for the Dubai Land Department (DLD) and A SQUARED REAL ESTATE.
Analyze this Dubai Title Deed (سند ملكية) or Oqood (عقود) document.
CRITICAL RULES:
- If Oqood, page 1 has developer, page 2 has BUYER. Extract the BUYER as owner_name_english and owner_name_arabic.
- Extract building_name, unit_number, floor_number, community, plot_number, total_area_sqft, total_area_sqm, certificate_number, parking_bays, mortgage_status.
Return strictly valid JSON:
{
  \"certificate_number\": \"...\",
  \"owner_name_english\": \"...\",
  \"owner_name_arabic\": \"...\",
  \"building_name\": \"...\",
  \"unit_number\": \"...\",
  \"floor_number\": \"...\",
  \"community\": \"...\",
  \"plot_number\": \"...\",
  \"property_type\": \"Apartment\",
  \"total_area_sqft\": 1200.5,
  \"total_area_sqm\": 111.5,
  \"suite_area_sqft\": 1100,
  \"parking_bays\": [\"1 Space\"],
  \"mortgage_status\": \"Free & Clear (Unencumbered)\"
}";

        $messages = [
            [
                'role' => 'user',
                'content' => [
                    ['type' => 'text', 'text' => $systemPrompt],
                    ['type' => 'image_url', 'image_url' => ['url' => $dataUrl]]
                ]
            ]
        ];

        $titleDeedData = callOpenAiChat($messages, $openaiApiKey, true);
    }

    // 2. Parse Emirates ID if provided
    $eidFiles = [];
    if (!empty($_FILES['emirates_id']['tmp_name'])) {
        if (is_array($_FILES['emirates_id']['tmp_name'])) {
            foreach ($_FILES['emirates_id']['tmp_name'] as $idx => $tmpPath) {
                if ($tmpPath && file_exists($tmpPath)) {
                    $eidFiles[] = fileToDataUrl($tmpPath, $_FILES['emirates_id']['name'][$idx]);
                }
            }
        } else {
            $eidFiles[] = fileToDataUrl($_FILES['emirates_id']['tmp_name'], $_FILES['emirates_id']['name']);
        }
    }

    if (!empty($eidFiles)) {
        $eidContent = [
            ['type' => 'text', 'text' => "Analyze the attached United Arab Emirates Resident Identity Card (Emirates ID / بطاقة الهوية).
Extract:
- id_number (784-XXXX-XXXXXXX-X)
- name_english (full name)
- name_arabic
- nationality
- expiry_date (DD/MM/YYYY)
- date_of_birth
Return strictly valid JSON:
{
  \"id_number\": \"784-...\",
  \"name_english\": \"...\",
  \"name_arabic\": \"...\",
  \"nationality\": \"...\",
  \"expiry_date\": \"...\",
  \"date_of_birth\": \"...\"
}"]
        ];

        foreach ($eidFiles as $url) {
            $eidContent[] = ['type' => 'image_url', 'image_url' => ['url' => $url]];
        }

        $emiratesIdData = callOpenAiChat([['role' => 'user', 'content' => $eidContent]], $openaiApiKey, true);
    }

    // 3. KYC Match Verification
    if ($titleDeedData && $emiratesIdData) {
        $deedName = trim(strtolower($titleDeedData['owner_name_english'] ?? ''));
        $eidName = trim(strtolower($emiratesIdData['name_english'] ?? ''));

        $match = false;
        $score = 0;
        if (!empty($deedName) && !empty($eidName)) {
            if ($deedName === $eidName) {
                $match = true;
                $score = 100;
            } else {
                similar_text($deedName, $eidName, $percent);
                $score = round($percent);
                $match = ($score >= 70);
            }
        }

        $kycResult = [
            'verified' => $match,
            'match_score' => $score,
            'deed_owner' => $titleDeedData['owner_name_english'] ?? 'N/A',
            'id_cardholder' => $emiratesIdData['name_english'] ?? 'N/A',
            'status' => $match ? 'VERIFIED_MATCH' : 'REQUIRES_MANUAL_REVIEW',
            'notes' => $match ? 'Owner name matches Emirates ID cardholder.' : 'Names show variance between Title Deed and Emirates ID. Please verify identity.'
        ];
    }

    echo json_encode([
        'success' => true,
        'titleDeedData' => $titleDeedData,
        'emiratesIdData' => $emiratesIdData,
        'kycResult' => $kycResult
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
