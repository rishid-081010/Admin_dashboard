<?php
// Hostinger Production Lead Ingestion & AI Mapping Gateway
// Integrates with Supabase master_leads_v2 and OpenAI GPT-4o for intelligent Dubai real estate lead cleaning

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

// Also accept form post / query parameters
$action = $payload['action'] ?? $_GET['action'] ?? $_POST['action'] ?? 'health_stats';

$supabaseUrl = 'https://qgxgtavkovqklijfpnfl.supabase.co/rest/v1';
$supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFneGd0YXZrb3Zxa2xpamZwbmZsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA2MDUzOSwiZXhwIjoyMDkzNjM2NTM5fQ.X8Lpgzpm1Xgb0v9qML9W6Xm3hDKCwFVeniJs39F5z54';
$openAiKey = getenv('OPENAI_API_KEY') ?: base64_decode('c2stcHJvai15V3ZJZ2c4WmEtbDg3c2hEQkc0czhrTUxLbW0zbjdHdXZNZ0dibGxyVl9JWmVnTnJyTHh1U0VpTnRWSGtmQmNkNVNYNnhtSjUzUFQzQmxia0ZKcmlXVkVzVmFyU2s0X3ZuY1lEZlhQMGQ2TUxXWEpmcVJxUXBlU0dfODczcW1ld0hEUkpENHdGazBXMEl6ZnAwVEFXMmZOQXJnMEE=');

// ─── 1. HEALTH STATS ───
if ($action === 'health_stats') {
    $ch = curl_init("$supabaseUrl/master_leads_v2?select=count");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "apikey: $supabaseKey",
        "Authorization: Bearer $supabaseKey",
        "Prefer: count=exact",
        "Range: 0-0"
    ]);
    curl_setopt($ch, CURLOPT_HEADER, true);
    $response = curl_exec($ch);
    $headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
    $headers = substr($response, 0, $headerSize);
    curl_close($ch);

    $count = 0;
    if (preg_match('/Content-Range:\s*\d+-\d+\/(\d+)/i', $headers, $matches)) {
        $count = (int)$matches[1];
    } elseif (preg_match('/Content-Range:\s*\*\s*\/\s*(\d+)/i', $headers, $matches)) {
        $count = (int)$matches[1];
    }

    echo json_encode([
        'success' => true,
        'database_leads_count' => $count,
        'table' => 'master_leads_v2',
        'status' => 'online',
        'timestamp' => date('c')
    ]);
    exit;
}

// ─── 2. AI COLUMN MAPPING (GPT-4o) ───
if ($action === 'ai_column_map') {
    $headers = $payload['headers'] ?? [];
    $samples = $payload['samples'] ?? [];

    if (empty($headers) || !is_array($headers)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Headers array required']);
        exit;
    }

    $headerSamples = [];
    foreach ($headers as $idx => $h) {
        $sampleVals = [];
        if (is_array($samples)) {
            foreach (array_slice($samples, 0, 10) as $row) {
                if (isset($row[$idx]) && trim((string)$row[$idx]) !== '') {
                    $sampleVals[] = trim((string)$row[$idx]);
                }
            }
        }
        $headerSamples[$h] = array_slice($sampleVals, 0, 8);
    }

    $prompt = "You are a senior real estate data architect specializing in Supabase PostgreSQL databases, Dubai Land Department (DLD) and UAE CRM datasets.
The target database table in Supabase is 'master_leads_v2'.

DATABASE SCHEMA FOR 'master_leads_v2':
1. 'full_name' (text): Owner/customer full personal name. (NEVER building or project name!).
2. 'phone_number_normalized' (text): Primary calling key in E.164 format (+9715...).
3. 'property_reference' (text): Project / Building / Tower / Community name (e.g. 'Entertainment Foyer', 'Burlington').
4. 'property_location' (text): Master community or area (e.g. 'Jumeirah Islands', 'Business Bay').
5. 'property_bedrooms' (integer): Number of bedrooms (e.g. 1, 2, 3, 4, 5).
6. 'property_size_sqft' (numeric): Built-up or plot area in sqft (e.g. 5285.02).
7. 'property_type' (text): Category ('Apartment', 'Villa', 'Townhouse', 'Penthouse', 'Land', 'Commercial').
8. 'property_address' (text): Street or full physical address if provided.
9. 'email' (text): Owner email address.
10. 'source_lead_id' (text): ID, procedure number, or registration reference from CSV.
11. 'metadata.unit_number' (text): Unit, apartment, villa, flat, or premise number (e.g. 'property_number', 'JI24M311', 'Flat 104', 'Plot Pre Reg No'). Stored inside JSONB metadata->>'unit_number'.
12. 'metadata.transaction_amount' (numeric): Transaction price or purchase value in AED. Stored inside JSONB metadata->>'transaction_amount'.
13. 'metadata.raw_csv_row' (jsonb): Any other extra or custom column from the CSV that does not map to the columns above.

CRITICAL DUBAI REAL ESTATE DOMAIN EXCEPTIONS:
- 'property_number' containing villa/unit codes (e.g. 'JI24M1050', 'TS HYT TH-V-367-') is 'metadata.unit_number'.
- 'beds' or 'bedroom count' is 'property_bedrooms'.
- 'Actual Size' or 'BUA' is 'property_size_sqft'.
- 'Transaction Amount' or 'Price' is 'metadata.transaction_amount'.
- Columns named 'PROJECT', 'BUILDING NAME', 'DEVELOPMENT' must NEVER be mapped to 'full_name'.
- Header 'Table 1' with person name samples MUST be mapped to 'full_name'.

INPUT DATA (Headers and first sample values):
" . json_encode($headerSamples, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "

CRITICAL: Return ONLY a JSON object:
{
  \"db_column_map\": {
    \"full_name\": \"CSV Header or null\",
    \"phone_number_normalized\": \"CSV Header or null\",
    \"property_reference\": \"CSV Header or null\",
    \"property_location\": \"CSV Header or null\",
    \"property_bedrooms\": \"CSV Header or null\",
    \"property_size_sqft\": \"CSV Header or null\",
    \"property_type\": \"CSV Header or null\",
    \"property_address\": \"CSV Header or null\",
    \"email\": \"CSV Header or null\",
    \"source_lead_id\": \"CSV Header or null\",
    \"metadata.unit_number\": \"CSV Header or null\",
    \"metadata.transaction_amount\": \"CSV Header or null\"
  },
  \"csv_header_map\": {
    \"<Exact CSV Header>\": \"<Target DB Column e.g. full_name or metadata.unit_number>\"
  },
  \"unmapped_extra_headers\": []
}";

    $aiCh = curl_init('https://api.openai.com/v1/chat/completions');
    curl_setopt($aiCh, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($aiCh, CURLOPT_POST, true);
    curl_setopt($aiCh, CURLOPT_POSTFIELDS, json_encode([
        'model' => 'gpt-4o',
        'messages' => [['role' => 'user', 'content' => $prompt]],
        'response_format' => ['type' => 'json_object'],
        'temperature' => 0
    ]));
    curl_setopt($aiCh, CURLOPT_HTTPHEADER, [
        "Authorization: Bearer $openAiKey",
        "Content-Type: application/json"
    ]);

    $aiRes = curl_exec($aiCh);
    $aiHttpCode = curl_getinfo($aiCh, CURLINFO_HTTP_CODE);
    curl_close($aiCh);

    if ($aiHttpCode === 200 && $aiRes) {
        $aiData = json_decode($aiRes, true);
        $content = $aiData['choices'][0]['message']['content'] ?? '{}';
        $mapping = json_decode($content, true) ?: [];

        // Also add legacy fallback keys for full backward compatibility
        $dbMap = $mapping['db_column_map'] ?? [];
        $mapping['name_header'] = $dbMap['full_name'] ?? null;
        $mapping['phone_header'] = $dbMap['phone_number_normalized'] ?? null;
        $mapping['unit_header'] = $dbMap['metadata.unit_number'] ?? null;
        $mapping['project_header'] = $dbMap['property_reference'] ?? null;
        $mapping['location_header'] = $dbMap['property_location'] ?? null;
        $mapping['property_type_header'] = $dbMap['property_type'] ?? null;
        $mapping['bedrooms_header'] = $dbMap['property_bedrooms'] ?? null;
        $mapping['size_header'] = $dbMap['property_size_sqft'] ?? null;
        $mapping['amount_header'] = $dbMap['metadata.transaction_amount'] ?? null;
        $mapping['email_header'] = $dbMap['email'] ?? null;
        $mapping['source_id_header'] = $dbMap['source_lead_id'] ?? null;

        echo json_encode(['success' => true, 'mapping' => $mapping]);
    } else {
        echo json_encode(['success' => false, 'error' => 'AI mapping call failed', 'raw' => $aiRes]);
    }
    exit;
}

// ─── 3. PUSH CLEANED LEADS DIRECT TO SUPABASE master_leads_v2 ───
if ($action === 'push_to_supabase') {
    $leads = $payload['leads'] ?? [];
    if (empty($leads) || !is_array($leads)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'No leads array provided.']);
        exit;
    }

    $validRows = [];
    $seenInBatch = [];
    $invalidCount = 0;
    $batchDuplicateCount = 0;

    foreach ($leads as $lead) {
        // 1. Phone extraction and normalization
        $rawPhone = $lead['contact_number'] ?? $lead['phone_number'] ?? $lead['Cleaned Phone (E.164)'] ?? $lead['vapi_e164'] ?? '';
        $digits = preg_replace('/\D/', '', (string)$rawPhone);

        // Normalize to E.164 (+971...)
        $e164 = '';
        if (strpos((string)$rawPhone, '+') === 0 && strlen($digits) >= 9) {
            $e164 = '+' . $digits;
        } elseif (strlen($digits) >= 9) {
            if (substr($digits, 0, 3) === '971') {
                $e164 = '+' . $digits;
            } elseif (substr($digits, 0, 2) === '05' && strlen($digits) === 10) {
                $e164 = '+971' . substr($digits, 1);
            } elseif (substr($digits, 0, 1) === '5' && strlen($digits) === 9) {
                $e164 = '+971' . $digits;
            } else {
                $e164 = '+' . $digits;
            }
        }

        if (empty($e164) || strlen($digits) < 7) {
            $invalidCount++;
            continue;
        }

        // Strict UAE E.164 mobile numbering-plan guard (Layer 2)
        $isValidPhone = false;
        if (strpos($e164, '+971') === 0) {
            // UAE mobile strictly: +971 5[0,2,4,5,6,8] followed by 7 digits where first subscriber digit is 1-9
            if (preg_match('/^\+9715[024568][1-9][0-9]{6}$/', $e164)) {
                // Reject dummy/synthetic repeating patterns or trailing zeroes
                if (!preg_match('/^\+9715[0-9](\d)\1{5}$/', $e164) && substr($e164, -6) !== '000000') {
                    $isValidPhone = true;
                }
            }
        } elseif (preg_match('/^\+[1-9][0-9]{7,14}$/', $e164)) {
            // International mobile
            if (!preg_match('/^\+[0-9]{1,3}(\d)\1{6,}$/', $e164)) {
                $isValidPhone = true;
            }
        }

        if (!$isValidPhone) {
            $invalidCount++;
            continue;
        }

        // 2. Unit Number
        $unitNumber = trim((string)($lead['unit_number'] ?? $lead['Cleaned Unit Number'] ?? $lead['Unit Number'] ?? $lead['property_number'] ?? ''));

        // 3. Project / Reference
        $propertyReference = trim((string)($lead['project_name'] ?? $lead['Project'] ?? $lead['property_reference'] ?? $lead['Building'] ?? ''));

        // Deduplication key in batch: phone + property + unit
        $batchKey = $e164 . '|' . strtolower($propertyReference) . '|' . strtolower($unitNumber);
        if (isset($seenInBatch[$batchKey])) {
            $batchDuplicateCount++;
            continue;
        }
        $seenInBatch[$batchKey] = true;

        // 4. Owner Full Name
        $fullName = trim((string)($lead['owner_name'] ?? $lead['full_name'] ?? $lead['Cleaned Owner Name'] ?? $lead['Owner Name'] ?? ''));
        if (empty($fullName)) {
            $fullName = 'Property Owner';
        }

        // 5. Location
        $location = trim((string)($lead['location'] ?? $lead['Location'] ?? $lead['property_location'] ?? ''));

        // 6. Property Type
        $propertyType = trim((string)($lead['property_type'] ?? $lead['Property Type'] ?? 'Apartment'));
        if (empty($propertyType)) $propertyType = 'Apartment';

        // 7. Bedrooms
        $bedrooms = null;
        if (isset($lead['bedrooms']) || isset($lead['beds']) || isset($lead['property_bedrooms'])) {
            $rawBeds = $lead['bedrooms'] ?? $lead['beds'] ?? $lead['property_bedrooms'];
            if (is_numeric($rawBeds)) {
                $bedrooms = (int)$rawBeds;
            } elseif (preg_match('/(\d+)/', (string)$rawBeds, $m)) {
                $bedrooms = (int)$m[1];
            }
        }

        // 8. Size Sqft
        $sizeSqft = null;
        if (isset($lead['size']) || isset($lead['size_sqft']) || isset($lead['property_size_sqft']) || isset($lead['Actual Size'])) {
            $rawSize = $lead['size'] ?? $lead['size_sqft'] ?? $lead['property_size_sqft'] ?? $lead['Actual Size'];
            $cleanSize = preg_replace('/[^\d.]/', '', (string)$rawSize);
            if (is_numeric($cleanSize) && (float)$cleanSize > 0) {
                $sizeSqft = (float)$cleanSize;
            }
        }

        // 9. Transaction Amount
        $txAmount = null;
        if (isset($lead['transaction_amount']) || isset($lead['amount']) || isset($lead['Transaction Amount']) || isset($lead['price'])) {
            $rawAmt = $lead['transaction_amount'] ?? $lead['amount'] ?? $lead['Transaction Amount'] ?? $lead['price'];
            $cleanAmt = preg_replace('/[^\d.]/', '', (string)$rawAmt);
            if (is_numeric($cleanAmt) && (float)$cleanAmt > 0) {
                $txAmount = (float)$cleanAmt;
            }
        }

        // 10. Email
        $email = null;
        $rawEmail = trim((string)($lead['email'] ?? $lead['Email'] ?? ''));
        if (filter_var($rawEmail, FILTER_VALIDATE_EMAIL)) {
            $email = strtolower($rawEmail);
        }

        // 11. Source ID
        $sourceId = trim((string)($lead['source_lead_id'] ?? $lead['source_id'] ?? $lead['Procedure No'] ?? $lead['Registration No'] ?? ''));

        // 12. Build Required JSONB Metadata (Critical for Vapi Dispatcher & Bitrix Sync)
        $metadata = [
            'unit_number' => $unitNumber,
            'transaction_amount' => $txAmount,
            'raw_csv_row' => $lead
        ];

        // Format clean master_leads_v2 row
        $validRows[] = [
            'full_name' => $fullName,
            'phone_number' => (string)$rawPhone,
            'phone_number_normalized' => $e164,
            'email' => $email,
            'lead_source' => 'admin_dashboard_cleaned',
            'source_lead_id' => !empty($sourceId) ? $sourceId : null,
            'property_reference' => !empty($propertyReference) ? $propertyReference : null,
            'property_location' => !empty($location) ? $location : null,
            'property_type' => $propertyType,
            'property_bedrooms' => $bedrooms,
            'property_size_sqft' => $sizeSqft,
            'owner_type' => 'owner',
            'listing_intent' => 'unknown',
            'qualification_status' => 'unqualified',
            'lead_status' => 'fresh',
            'call_status' => 'never_called',
            'is_suppressed' => false,
            'attempt_count' => 0,
            'metadata' => $metadata,
            'created_at' => date('c'),
            'updated_at' => date('c')
        ];
    }

    if (empty($validRows)) {
        echo json_encode([
            'success' => false,
            'error' => 'No valid leads found with mobile phone numbers.',
            'invalid_count' => $invalidCount
        ]);
        exit;
    }

    // Ingest into Supabase master_leads_v2 via the canonical L2 Guard RPC
    $ch = curl_init("$supabaseUrl/rpc/ingest_master_leads_v2_batch");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['p_leads' => $validRows]));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "apikey: $supabaseKey",
        "Authorization: Bearer $supabaseKey",
        "Content-Type: application/json"
    ]);

    $res = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $rpcResult = json_decode($res, true) ?: [];
    $insertedCount = $rpcResult['inserted_fresh'] ?? 0;
    $dbDuplicateCount = $rpcResult['duplicates_skipped'] ?? 0;
    $invalidBlocked = ($rpcResult['invalid_blocked'] ?? 0) + $invalidCount;

    // Fetch updated total count from master_leads_v2
    $countCh = curl_init("$supabaseUrl/master_leads_v2?select=count");
    curl_setopt($countCh, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($countCh, CURLOPT_HTTPHEADER, [
        "apikey: $supabaseKey",
        "Authorization: Bearer $supabaseKey",
        "Prefer: count=exact",
        "Range: 0-0"
    ]);
    curl_setopt($countCh, CURLOPT_HEADER, true);
    $cRes = curl_exec($countCh);
    $headerSize = curl_getinfo($countCh, CURLINFO_HEADER_SIZE);
    $cHeaders = substr($cRes, 0, $headerSize);
    curl_close($countCh);

    $updatedTotal = 0;
    if (preg_match('/Content-Range:\s*\d+-\d+\/(\d+)/i', $cHeaders, $m)) {
        $updatedTotal = (int)$m[1];
    }

    echo json_encode([
        'success' => true,
        'total_submitted' => count($leads),
        'valid_processed' => count($validRows),
        'newly_inserted' => $insertedCount,
        'duplicate_skipped' => ($batchDuplicateCount + $dbDuplicateCount),
        'invalid_skipped' => $invalidCount,
        'live_db_count' => $updatedTotal,
        'message' => "Successfully inserted {$insertedCount} fresh leads into master_leads_v2."
    ]);
    exit;
}

http_response_code(400);
echo json_encode(['success' => false, 'error' => 'Invalid action']);
