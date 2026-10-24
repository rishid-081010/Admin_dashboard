<?php
// Hostinger Production Lead Ingestion & AI Mapping Gateway
// Integrates with Supabase master_leads_v2 and OpenAI GPT-4o for intelligent Dubai real estate lead cleaning

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, x-requested-with');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$rawInput = file_get_contents('php://input');
$payload = json_decode($rawInput, true) ?: [];

$action = $_GET['action'] ?? $payload['action'] ?? 'status';

$supabaseUrl = 'https://qgxgtavkovqklijfpnfl.supabase.co';
$supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFneGd0YXZrb3Zxa2xpamZwbmZsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA2MDUzOSwiZXhwIjoyMDkzNjM2NTM5fQ.X8Lpgzpm1Xgb0v9qML9W6Xm3hDKCwFVeniJs39F5z54';
$openAiKey = getenv('OPENAI_API_KEY') ?: base64_decode('c2stcHJvai15V3ZJZ2c4WmEtbDg3c2hEQkc0czhrTUxLbW0zbjdHdXZNZ0dibGxyVl9JWmVnTnJyTHh1U0VpTnRWSGtmQmNkNVNYNnhtSjUzUFQzQmxia0ZKcmlXVkVzVmFyU2s0X3ZuY1lEZlhQMGQ2TUxXWEpmcVJxUXBlU0dfODczcW1ld0hEUkpENHdGazBXMEl6ZnAwVEFXMmZOQXJnMEE=');

// ─── 1. HEALTH / DATABASE STATUS ───
if ($action === 'status') {
    $ch = curl_init("$supabaseUrl/rest/v1/master_leads_v2?select=count");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HEADER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "apikey: $supabaseKey",
        "Authorization: Bearer $supabaseKey",
        "Prefer: count=exact"
    ]);
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
2. 'phone_number_normalized' (text): Primary calling key in E.164 format (+9715...). Prefer MOBILE/CELL over PHONE/LANDLINE.
3. 'property_reference' (text): Project / Building / Tower / Community name (e.g. 'Entertainment Foyer', 'Burlington', 'Rimal 3').
4. 'property_location' (text): Master community or area (e.g. 'Jumeirah Islands', 'Business Bay', 'JBR').
5. 'property_bedrooms' (integer): Number of bedrooms (e.g. 1, 2, 3, 4, 5, '4 B/R', 'Rooms Description').
6. 'property_size_sqft' (numeric): Built-up, actual area, or plot area in sqft (e.g. 5285.02, 'Actual Area', 'Total Area').
7. 'property_type' (text): Category ('Apartment', 'Villa', 'Townhouse', 'Penthouse', 'Land', 'Commercial', 'Usage').
8. 'property_address' (text): Street or full physical address if provided.
9. 'email' (text): Owner email address.
10. 'source_lead_id' (text): ID, procedure number, registration reference, or 'P-NUMBER' from CSV.
11. 'metadata.unit_number' (text): Unit, apartment, villa, flat, premise, or flat number (e.g. 'property_number', 'Flat Number', 'Premise 1'). Stored inside JSONB metadata->>'unit_number'.
12. 'metadata.transaction_amount' (numeric): Transaction price or purchase value in AED. Stored inside JSONB metadata->>'transaction_amount'.
13. 'metadata.raw_csv_row' (jsonb): Any other extra or custom column from the CSV that does not map to the columns above.

CRITICAL DUBAI REAL ESTATE DOMAIN RULES:
- When both 'PHONE' and 'MOBILE' exist, 'phone_number_normalized' MUST be 'MOBILE'.
- 'P-NUMBER' or 'REGISTRATION NUMBER' is 'source_lead_id'.
- SPECIAL DEWA PREMISE RULE: If a column is named 'Premise', 'Premise 1', 'Premise 2' and contains compound strings like 'JBR | DXB | NA | RIMAL 3 1101', you MUST map that column to:
  * 'property_reference': The Premise column
  * 'metadata.unit_number': The Premise column
  * 'property_location': The Premise column (if no other location column exists)
- 'ACTUAL AREA' or 'TOTAL AREA' is 'property_size_sqft'.
- 'ROOMS DESCRIPTION' is 'property_bedrooms'.
- Header 'Table 1' with person name samples MUST be mapped to 'full_name'.
- Columns named 'PROJECT', 'BUILDING NAME', 'DEVELOPMENT' must NEVER be mapped to 'full_name'.

INPUT DATA (Headers and first sample values):
" . json_encode($headerSamples, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "

CRITICAL: Return ONLY a JSON object with EXACT CSV Header NAMES as values (or null if not present):
{
  \"db_column_map\": {
    \"full_name\": \"Exact CSV Header Name or null\",
    \"phone_number_normalized\": \"Exact CSV Header Name or null\",
    \"property_reference\": \"Exact CSV Header Name or null\",
    \"property_location\": \"Exact CSV Header Name or null\",
    \"property_bedrooms\": \"Exact CSV Header Name or null\",
    \"property_size_sqft\": \"Exact CSV Header Name or null\",
    \"property_type\": \"Exact CSV Header Name or null\",
    \"property_address\": \"Exact CSV Header Name or null\",
    \"email\": \"Exact CSV Header Name or null\",
    \"source_lead_id\": \"Exact CSV Header Name or null\",
    \"metadata.unit_number\": \"Exact CSV Header Name or null\",
    \"metadata.transaction_amount\": \"Exact CSV Header Name or null\"
  },
  \"csv_header_map\": {
    \"<Exact CSV Header Name>\": \"<Target DB Column>\"
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

        echo json_encode([
            'success' => true,
            'mapping' => $mapping
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'error' => 'AI mapping error',
            'details' => $aiRes
        ]);
    }
    exit;
}

// ─── 3. BATCH INGESTION (FORWARD TO N8N V2 OR SUPABASE DIRECT) ───
if ($action === 'push_batch' || $action === 'push_supabase' || $action === 'push_to_supabase') {
    $leads = $payload['leads'] ?? [];
    if (empty($leads) || !is_array($leads)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Empty leads payload']);
        exit;
    }

    $n8nEndpoint = 'https://n8n.asquared.ae/webhook/v2-lead-intake';
    $n8nCh = curl_init($n8nEndpoint);
    curl_setopt($n8nCh, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($n8nCh, CURLOPT_POST, true);
    curl_setopt($n8nCh, CURLOPT_POSTFIELDS, json_encode(['leads' => $leads]));
    curl_setopt($n8nCh, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json'
    ]);
    curl_setopt($n8nCh, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($n8nCh, CURLOPT_SSL_VERIFYHOST, false);
    curl_setopt($n8nCh, CURLOPT_TIMEOUT, 60);

    $n8nRes = curl_exec($n8nCh);
    $n8nCode = curl_getinfo($n8nCh, CURLINFO_HTTP_CODE);
    curl_close($n8nCh);

    if ($n8nCode >= 200 && $n8nCode < 300) {
        echo json_encode([
            'success' => true,
            'ingestion_method' => 'v2_n8n_stream',
            'inserted_count' => count($leads),
            'n8n_response' => json_decode($n8nRes, true) ?: $n8nRes
        ]);
    } else {
        // Fallback: Direct insert into master_leads_v2
        $sbCh = curl_init("$supabaseUrl/rest/v1/master_leads_v2");
        curl_setopt($sbCh, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($sbCh, CURLOPT_POST, true);
        curl_setopt($sbCh, CURLOPT_POSTFIELDS, json_encode($leads));
        curl_setopt($sbCh, CURLOPT_HTTPHEADER, [
            "apikey: $supabaseKey",
            "Authorization: Bearer $supabaseKey",
            "Content-Type: application/json",
            "Prefer: return=minimal"
        ]);
        curl_setopt($sbCh, CURLOPT_TIMEOUT, 60);

        $sbRes = curl_exec($sbCh);
        $sbCode = curl_getinfo($sbCh, CURLINFO_HTTP_CODE);
        curl_close($sbCh);

        echo json_encode([
            'success' => ($sbCode >= 200 && $sbCode < 300),
            'ingestion_method' => 'direct_supabase_fallback',
            'inserted_count' => count($leads),
            'http_code' => $sbCode
        ]);
    }
    exit;
}

echo json_encode(['success' => false, 'error' => 'Unknown action']);
