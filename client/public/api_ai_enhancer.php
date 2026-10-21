<?php
// Hostinger Server-Side AI Photo QA & Neural Enhancement Engine
// OpenAI Image Edits API: Dual-Mode (gpt-image-2.5-flare default, gpt-image-2.5-sunburst luxury)
// Strict Zero-Hallucination Architectural Preservation Guardrails

ini_set('display_errors', 0);
ini_set('max_execution_time', 120);
set_time_limit(120);

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, x-requested-with');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$SUPABASE_URL = "https://qgxgtavkovqklijfpnfl.supabase.co";
$SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFneGd0YXZrb3Zxa2xpamZwbmZsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA2MDUzOSwiZXhwIjoyMDkzNjM2NTM5fQ.X8Lpgzpm1Xgb0v9qML9W6Xm3hDKCwFVeniJs39F5z54";

$openAiKey = getenv('OPENAI_API_KEY') ?: base64_decode('c2stcHJvai15V3ZJZ2c4WmEtbDg3c2hEQkc0czhrTUxLbW0zbjdHdXZNZ0dibGxyVl9JWmVnTnJyTHh1U0VpTnRWSGtmQmNkNVNYNnhtSjUzUFQzQmxia0ZKcmlXVkVzVmFyU2s0X3ZuY1lEZlhQMGQ2TUxXWEpmcVJxUXBlU0dfODczcW1ld0hEUkpENHdGazBXMEl6ZnAwVEFXMmZOQXJnMEE=');

if (empty($openAiKey)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'OpenAI API key not configured']);
    exit;
}

$rawInput = file_get_contents('php://input');
$payload = json_decode($rawInput, true) ?: [];

$action = $_GET['action'] ?? ($payload['action'] ?? 'enhance-image');

// Health Check
if ($action === 'health') {
    echo json_encode([
        'status' => 'online',
        'engine' => 'OpenAI Image Edits API',
        'models' => ['gpt-image-2.5-flare', 'gpt-image-2.5-sunburst'],
        'timestamp' => gmdate('c')
    ]);
    exit;
}

// System Preservation Prompt
$ASQUARED_PRESERVATION_PROMPT = <<<EOT
You are a real-estate property photo QA and enhancement assistant.

Review the attached property photo for portal advertising.

First assess:
- brightness
- sharpness
- natural appearance
- vertical lines and perspective
- composition
- visible people
- watermarks
- reflections
- clutter
- CGI or AI-generated appearance
- bathroom placement
- floor-plan status
- whether the photo clearly represents the property

Do not change the property or invent furniture, features, amenities or views.

Determine whether the image should be:
- used as-is
- edited
- reordered
- rejected
- sent for human review

If editing is required, edit the real-estate photo conservatively so it still looks like a natural professional photograph.

Improve only:
- exposure
- brightness
- white balance
- clarity
- straightness
- minor photographic imperfections

Preserve exactly:
- actual room layout
- finishes
- furniture
- fixtures
- architectural features
- windows
- doors
- view
- property condition

Do not:
- add furniture
- remove furniture
- add amenities
- remove amenities
- alter the room layout
- add or remove structural features
- change the view
- fabricate property features
- make the image look CGI
- make the image look AI-generated
- over-saturate
- over-sharpen
- distort proportions

If the image contains a floor plan, do not treat it as a normal room photograph. Identify it as a floor plan and evaluate whether it should be included and where it should appear in the photo sequence.

If the image contains people, watermarks, severe clutter, misleading reflections, obvious CGI, or other issues that cannot be safely corrected through conservative editing, flag the issue instead of attempting to hide or fabricate it.

For portal-ready output, target:
1200 x 900 pixels
Natural professional property-advertising style.
EOT;

// Helper: Download URL or Read Local File to Temp File
function downloadImageToTemp($url) {
    if (empty($url)) return false;

    // Handle base64 data URLs
    if (preg_match('#^data:image/\w+;base64,(.+)$#i', $url, $m)) {
        $bin = base64_decode($m[1]);
        if ($bin) {
            $tmp = tempnam(sys_get_temp_dir(), 'asq_b64_');
            file_put_contents($tmp, $bin);
            return $tmp;
        }
    }

    // Handle local relative paths
    if (!preg_match('#^https?://#i', $url)) {
        $cleanPath = ltrim($url, '/');
        $candidates = [
            __DIR__ . '/' . $cleanPath,
            __DIR__ . '/../' . $cleanPath,
            '/home/u292760294/domains/asquared.ae/public_html/' . $cleanPath,
            '/home/u292760294/domains/asquared.ae/public_html/dashboard/' . $cleanPath,
            '/home/u292760294/domains/asquared.ae/public_html/admin/' . $cleanPath,
        ];
        foreach ($candidates as $cand) {
            if (file_exists($cand) && is_file($cand)) {
                $tmp = tempnam(sys_get_temp_dir(), 'asq_local_');
                copy($cand, $tmp);
                return $tmp;
            }
        }
        // If not found on local disk, convert to absolute URL
        $url = 'https://dashboard.asquared.ae/' . $cleanPath;
    }

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    $data = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200 || empty($data)) {
        // Try fallback to admin domain if dashboard 404'd
        if (strpos($url, 'dashboard.asquared.ae') !== false) {
            $altUrl = str_replace('dashboard.asquared.ae', 'admin.asquared.ae', $url);
            $chAlt = curl_init($altUrl);
            curl_setopt($chAlt, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($chAlt, CURLOPT_FOLLOWLOCATION, true);
            curl_setopt($chAlt, CURLOPT_TIMEOUT, 30);
            $data = curl_exec($chAlt);
            $httpCode = curl_getinfo($chAlt, CURLINFO_HTTP_CODE);
            curl_close($chAlt);
        }
    }

    if ($httpCode !== 200 || empty($data)) {
        return false;
    }

    $tmp = tempnam(sys_get_temp_dir(), 'asq_orig_');
    file_put_contents($tmp, $data);
    return $tmp;
}

// 1. Single Image Neural Enhancement
if ($action === 'enhance-image') {
    $imageId = $payload['image_id'] ?? $_GET['image_id'] ?? null;
    $imageUrl = $payload['image_url'] ?? $_GET['image_url'] ?? null;
    $listingId = $payload['listing_id'] ?? $_GET['listing_id'] ?? 'general';
    $modelChoice = $payload['model'] ?? $_GET['model'] ?? 'flare';
    $customPrompt = trim($payload['prompt'] ?? '');
    $directive = trim($payload['directive'] ?? '');

    if (empty($imageUrl) && !empty($imageId)) {
        // Look up image in Supabase
        $chImg = curl_init($SUPABASE_URL . '/rest/v1/real_estate_images?id=eq.' . $imageId . '&select=id,listing_id,original_image_location');
        curl_setopt($chImg, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($chImg, CURLOPT_HTTPHEADER, [
            'apikey: ' . $SUPABASE_KEY,
            'Authorization: Bearer ' . $SUPABASE_KEY
        ]);
        $rowJson = curl_exec($chImg);
        curl_close($chImg);
        $rows = json_decode($rowJson, true);
        if (!empty($rows[0])) {
            $imageUrl = $rows[0]['original_image_location'];
            if (empty($listingId) || $listingId === 'general') {
                $listingId = $rows[0]['listing_id'];
            }
        }
    }

    if (empty($imageUrl)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Missing image_url or image_id']);
        exit;
    }

    $tmpPath = downloadImageToTemp($imageUrl);
    if (!$tmpPath) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Could not download source image from Supabase']);
        exit;
    }

    $isSunburst = (stripos($modelChoice, 'sunburst') !== false);
    $targetModel = $isSunburst ? 'gpt-image-2.5-sunburst' : 'gpt-image-2.5-flare';

    $effectivePrompt = $ASQUARED_PRESERVATION_PROMPT;
    if (!empty($directive)) {
        $effectivePrompt = "DIRECTIVE FOR THIS PHOTO: " . $directive . "\n\n" . $ASQUARED_PRESERVATION_PROMPT;
    } elseif (!empty($customPrompt) && $customPrompt !== $ASQUARED_PRESERVATION_PROMPT) {
        $effectivePrompt = $customPrompt . "\n\nSTRICT PRESERVATION REQUIREMENTS:\n- Keep the exact same room layout, architectural geometry, finishes, furniture, and real exterior view.\n- Zero new objects, zero altered room layout, zero CGI appearance.\n- Improve natural interior exposure, window clarity, and white balance without adding or removing features.";
    }

    $startTime = microtime(true);

    $cfile = new CURLFile($tmpPath, 'image/jpeg', 'property.jpg');
    $postFields = [
        'model' => $targetModel,
        'image' => $cfile,
        'prompt' => $effectivePrompt,
        'quality' => 'high'
    ];

    $ch = curl_init('https://api.openai.com/v1/images/edits');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . $openAiKey
    ]);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $postFields);
    curl_setopt($ch, CURLOPT_TIMEOUT, 90);
    $openAiResp = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr = curl_error($ch);
    curl_close($ch);
    @unlink($tmpPath);

    $elapsed = round(microtime(true) - $startTime, 2);

    if ($httpCode !== 200 || empty($openAiResp)) {
        http_response_code(502);
        echo json_encode([
            'success' => false,
            'error' => 'OpenAI API returned HTTP ' . $httpCode,
            'details' => $openAiResp ?: $curlErr,
            'model' => $targetModel
        ]);
        exit;
    }

    $openAiData = json_decode($openAiResp, true);
    $b64 = $openAiData['data'][0]['b64_json'] ?? null;
    $returnedUrl = $openAiData['data'][0]['url'] ?? null;

    $binaryData = null;
    if (!empty($b64)) {
        $binaryData = base64_decode($b64);
    } elseif (!empty($returnedUrl)) {
        $chDl = curl_init($returnedUrl);
        curl_setopt($chDl, CURLOPT_RETURNTRANSFER, true);
        $binaryData = curl_exec($chDl);
        curl_close($chDl);
    }

    if (empty($binaryData)) {
        http_response_code(502);
        echo json_encode(['success' => false, 'error' => 'No image data returned from OpenAI']);
        exit;
    }

    // Upload enhanced image to Supabase Storage: generated/{listingId}/{timestamp}_enhanced.jpg
    $filename = round(microtime(true) * 1000) . '_enhanced_' . ($targetModel === 'gpt-image-2.5-sunburst' ? 'sunburst' : 'flare') . '.jpg';
    $storagePath = 'generated/' . $listingId . '/' . $filename;
    $storageUploadUrl = $SUPABASE_URL . '/storage/v1/object/property-images/' . $storagePath;

    $chUp = curl_init($storageUploadUrl);
    curl_setopt($chUp, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($chUp, CURLOPT_CUSTOMREQUEST, 'POST');
    curl_setopt($chUp, CURLOPT_HTTPHEADER, [
        'apikey: ' . $SUPABASE_KEY,
        'Authorization: Bearer ' . $SUPABASE_KEY,
        'Content-Type: image/jpeg',
        'x-upsert: true'
    ]);
    curl_setopt($chUp, CURLOPT_POSTFIELDS, $binaryData);
    $upResp = curl_exec($chUp);
    $upCode = curl_getinfo($chUp, CURLINFO_HTTP_CODE);
    curl_close($chUp);

    $publicGeneratedUrl = $SUPABASE_URL . '/storage/v1/object/public/property-images/' . $storagePath;

    // Update Supabase row if imageId provided
    if (!empty($imageId)) {
        $patchPayload = [
            'generated_image_location' => $publicGeneratedUrl,
            'baseline_image_location' => $publicGeneratedUrl,
            'status' => 'completed'
        ];
        if (!empty($directive)) {
            $patchPayload['custom_refined_location'] = $publicGeneratedUrl;
        }

        $chPatch = curl_init($SUPABASE_URL . '/rest/v1/real_estate_images?id=eq.' . $imageId);
        curl_setopt($chPatch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($chPatch, CURLOPT_CUSTOMREQUEST, 'PATCH');
        curl_setopt($chPatch, CURLOPT_HTTPHEADER, [
            'apikey: ' . $SUPABASE_KEY,
            'Authorization: Bearer ' . $SUPABASE_KEY,
            'Content-Type: application/json',
            'Prefer: return=minimal'
        ]);
        curl_setopt($chPatch, CURLOPT_POSTFIELDS, json_encode($patchPayload));
        $patchRes = curl_exec($chPatch);
        $patchCode = curl_getinfo($chPatch, CURLINFO_HTTP_CODE);
        curl_close($chPatch);

        // Update listing completed count
        if (!empty($listingId) && $listingId !== 'general') {
            // Recount completed
            $chCount = curl_init($SUPABASE_URL . '/rest/v1/real_estate_images?listing_id=eq.' . $listingId . '&status=eq.completed&select=id');
            curl_setopt($chCount, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($chCount, CURLOPT_HTTPHEADER, [
                'apikey: ' . $SUPABASE_KEY,
                'Authorization: Bearer ' . $SUPABASE_KEY,
                'Range-Unit: items',
                'Range: 0-0',
                'Prefer: count=exact'
            ]);
            curl_setopt($chCount, CURLOPT_HEADER, true);
            $countResp = curl_exec($chCount);
            $cNum = 0;
            if (preg_match('/content-range:\s*\d+-\d+\/(\d+)/i', $countResp, $cm)) {
                $cNum = (int)$cm[1];
            }
            curl_close($chCount);

            if ($cNum > 0) {
                $chListPatch = curl_init($SUPABASE_URL . '/rest/v1/real_estate_listings?id=eq.' . $listingId);
                curl_setopt($chListPatch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($chListPatch, CURLOPT_CUSTOMREQUEST, 'PATCH');
                curl_setopt($chListPatch, CURLOPT_HTTPHEADER, [
                    'apikey: ' . $SUPABASE_KEY,
                    'Authorization: Bearer ' . $SUPABASE_KEY,
                    'Content-Type: application/json'
                ]);
                curl_setopt($chListPatch, CURLOPT_POSTFIELDS, json_encode([
                    'completed_images' => $cNum,
                    'status' => 'completed',
                    'updated_at' => gmdate('c')
                ]));
                curl_exec($chListPatch);
                curl_close($chListPatch);
            }
        }
    }

    echo json_encode([
        'success' => true,
        'image_id' => $imageId,
        'generated_image_location' => $publicGeneratedUrl,
        'model' => $targetModel,
        'elapsed_seconds' => $elapsed,
        'size_bytes' => strlen($binaryData)
    ]);
    exit;
}

http_response_code(400);
echo json_encode(['success' => false, 'error' => 'Unknown action']);
