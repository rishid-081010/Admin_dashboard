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
@ini_set('memory_limit', '512M');

$secretsFile = __DIR__ . '/secrets.php';
if (file_exists($secretsFile)) {
    require_once $secretsFile;
}

$openaiApiKey = defined('OPENAI_API_KEY') ? OPENAI_API_KEY : (getenv('OPENAI_API_KEY') ?: '');

function callOpenAiChat($messages, $apiKey, $jsonMode = true) {
    if (empty($apiKey)) {
        throw new Exception("OpenAI API Key is missing on the server.");
    }

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
    $decoded = json_decode($content, true);
    if (!empty($decoded) && is_array($decoded)) {
        return $decoded;
    }
    return [
        'parse_error' => false,
        'raw_content' => $content
    ];
}

/**
 * Converts uploaded documents (Image or PDF) to an array of high-res base64 image data URLs for GPT-4o Vision
 */
function convertDocumentToImages($tmpPath, $origName) {
    if (!file_exists($tmpPath)) return [];
    $ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION));

    // 1. Direct Image Files
    if (in_array($ext, ['jpg', 'jpeg', 'png', 'webp'])) {
        $mime = ($ext === 'png') ? 'image/png' : (($ext === 'webp') ? 'image/webp' : 'image/jpeg');
        $data = file_get_contents($tmpPath);
        return ['data:' . $mime . ';base64,' . base64_encode($data)];
    }

    // 2. PDF Files: Render pages to JPEG using Imagick
    if ($ext === 'pdf' && extension_loaded('imagick')) {
        try {
            $images = [];
            $numPages = 1;
            try {
                $imPing = new Imagick();
                $imPing->pingImage($tmpPath);
                $numPages = min($imPing->getNumberImages(), 2);
                $imPing->clear();
                $imPing->destroy();
            } catch (Exception $e) {
                $numPages = 1;
            }

            for ($p = 0; $p < $numPages; $p++) {
                $im = new Imagick();
                $im->setResolution(150, 150);
                $im->readImage($tmpPath . '[' . $p . ']');
                $im->setImageFormat('jpeg');
                $im->setImageCompressionQuality(88);
                $blob = $im->getImageBlob();
                if ($blob && strlen($blob) > 500) {
                    $images[] = 'data:image/jpeg;base64,' . base64_encode($blob);
                }
                $im->clear();
                $im->destroy();
            }

            if (!empty($images)) {
                return $images;
            }
        } catch (Exception $e) {
            error_log('Imagick PDF render note: ' . $e->getMessage());
        }
    }

    // 3. Fallback: Extract raw JPEG streams embedded inside PDF
    if ($ext === 'pdf') {
        $content = file_get_contents($tmpPath);
        $images = [];
        if (preg_match_all('/stream[\r\n]+(\xFF\xD8\xFF.*?\xFF\xD9)[\r\n]+endstream/s', $content, $matches)) {
            foreach (array_slice($matches[1], 0, 2) as $jpgStream) {
                if (strlen($jpgStream) > 2000) {
                    $images[] = 'data:image/jpeg;base64,' . base64_encode($jpgStream);
                }
            }
        }
        if (!empty($images)) {
            return $images;
        }
    }

    return [];
}

$titleDeedData = null;
$emiratesIdData = null;
$kycResult = null;

try {
    // 1. Parse Title Deed if provided
    if (!empty($_FILES['title_deed']['tmp_name'])) {
        $deedFile = $_FILES['title_deed'];
        $deedImages = convertDocumentToImages($deedFile['tmp_name'], $deedFile['name']);

        if (!empty($deedImages)) {
            $systemPrompt = "You are the Lead Registrar & Property Intelligence Specialist for A SQUARED REAL ESTATE Dubai.
Analyze the attached real estate document (which may be a Dubai Land Department Title Deed / سند ملكية, Oqood / عقود, Listing Agreement / Form A, Tenancy Contract, or Unit Registration Certificate).

Extract all property and ownership details found:
- building_name: Building, Project, or Tower name (e.g. 'Sobha Creek Vistas Reserve', 'Dania 1', 'V3 Tower', etc.)
- unit_number: Unit, Apartment, Suite, or Villa number (e.g. 'B160', '1503', etc.)
- floor_number: Floor number if specified
- community: Community, District, or Master Development in Dubai (e.g. 'Sobha Hartland', 'JLT', 'Dubai', etc.)
- property_type: 'Apartment', 'Villa', 'Penthouse', 'Townhouse', or 'Commercial'
- total_area_sqft: Total gross area in sqft (numeric or formatted string)
- total_area_sqm: Total area in sqm (numeric or formatted string)
- suite_area_sqft: Net or Suite area in sqft (numeric or formatted string)
- certificate_number: Title deed certificate number, registration number, or contract number
- plot_number: Plot or parcel number
- parking_bays: Array of parking spaces or count (e.g. [\"1 Space\"])
- owner_name_english: Registered Owner, Landlord, Lessor, or Seller name in English
- owner_name_arabic: Owner name in Arabic if present
- mortgage_status: 'Free & Clear (Unencumbered)', 'Mortgaged', or 'N/A'
- price: Annual rent, listing price, or sale price if stated
- cheques: Cheque payment terms if mentioned (e.g. '4 Cheques', '1 Cheque')
- occupancy_status: 'Vacant' or 'Tenanted' if stated

CRITICAL: Extract all available information accurately. Return strictly valid JSON. If a specific field is not explicitly present, provide null or context-based default, but ALWAYS populate building_name, unit_number, community, and property_type if identifiable.";

            $deedContent = [
                ['type' => 'text', 'text' => $systemPrompt]
            ];
            foreach ($deedImages as $url) {
                $deedContent[] = ['type' => 'image_url', 'image_url' => ['url' => $url]];
            }

            $messages = [
                ['role' => 'user', 'content' => $deedContent]
            ];

            $titleDeedData = callOpenAiChat($messages, $openaiApiKey, true);
        }
    }

    // 2. Parse Emirates ID if provided
    $eidImages = [];
    if (!empty($_FILES['emirates_id']['tmp_name'])) {
        if (is_array($_FILES['emirates_id']['tmp_name'])) {
            foreach ($_FILES['emirates_id']['tmp_name'] as $idx => $tmpPath) {
                if ($tmpPath && file_exists($tmpPath)) {
                    $imgs = convertDocumentToImages($tmpPath, $_FILES['emirates_id']['name'][$idx]);
                    $eidImages = array_merge($eidImages, $imgs);
                }
            }
        } else {
            $imgs = convertDocumentToImages($_FILES['emirates_id']['tmp_name'], $_FILES['emirates_id']['name']);
            $eidImages = array_merge($eidImages, $imgs);
        }
    }

    if (!empty($eidImages)) {
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

        foreach (array_slice($eidImages, 0, 4) as $url) {
            $eidContent[] = ['type' => 'image_url', 'image_url' => ['url' => $url]];
        }

        $emiratesIdData = callOpenAiChat([['role' => 'user', 'content' => $eidContent]], $openaiApiKey, true);

        // PII Masking: Redact raw Emirates ID number for UAE PDPL compliance
        if (!empty($emiratesIdData['id_number'])) {
            $rawId = (string)$emiratesIdData['id_number'];
            $masked = preg_replace('/(\d{3}-)\d{4}-\d{7}(-\d)/', '$1****-*******$2', $rawId);
            if ($masked === $rawId && strlen($rawId) > 6) {
                $masked = substr($rawId, 0, 4) . '****' . substr($rawId, -3);
            }
            $emiratesIdData['id_number_masked'] = $masked;
            $emiratesIdData['id_number'] = $masked;
        }
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
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
