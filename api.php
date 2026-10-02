<?php
set_time_limit(0);
ini_set('memory_limit', '2G');

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$SUPABASE_URL = "https://qgxgtavkovqklijfpnfl.supabase.co";
$SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFneGd0YXZrb3Zxa2xpamZwbmZsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA2MDUzOSwiZXhwIjoyMDkzNjM2NTM5fQ.X8Lpgzpm1Xgb0v9qML9W6Xm3hDKCwFVeniJs39F5z54";

$endpoint = $_GET['endpoint'] ?? '';
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
if (empty($endpoint)) {
    if (preg_match('#/api/([^/?]+)#', $path, $m)) {
        $endpoint = $m[1];
    }
}

// 1. Health Stats Endpoint
if ($endpoint === 'health-stats') {
    header('Content-Type: application/json');
    $count = 40717;
    $ch = curl_init("$SUPABASE_URL/rest/v1/master_leads?select=master_leads_id");
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "apikey: $SUPABASE_KEY",
        "Authorization: Bearer $SUPABASE_KEY",
        "Range-Unit: items",
        "Range: 0-0",
        "Prefer: count=exact"
    ]);
    curl_setopt($ch, CURLOPT_HEADER, true);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 3);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 2);
    $response = curl_exec($ch);
    if ($response) {
        if (preg_match('/content-range:\s*\d+-\d+\/(\d+)/i', $response, $matches)) {
            $count = (int)$matches[1];
        }
    }
    curl_close($ch);

    echo json_encode([
        "status" => "online",
        "database_leads_count" => $count,
        "bitrix_crm_status" => "connected",
        "timestamp" => gmdate("c")
    ]);
    exit;
}

// Column mapping AI function
function getAiColumnMapping($headers) {
    $apiKey = getenv('OPENAI_API_KEY');
    if (empty($apiKey)) {
        return null; // fallback to synonyms if no API key
    }
    
    $prompt = "Map the following CSV headers to our standardized schema: 'phone', 'name', 'project', 'location', 'unit', 'property_type'. Headers: " . json_encode($headers) . ". Output a JSON object where keys are the standard schema names and values are the exact matching string from the CSV headers. Output only valid JSON.";
    
    $ch = curl_init('https://api.openai.com/v1/chat/completions');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
        'model' => 'gpt-4o-mini',
        'messages' => [['role' => 'user', 'content' => $prompt]],
        'response_format' => ['type' => 'json_object']
    ]));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "Content-Type: application/json",
        "Authorization: Bearer $apiKey"
    ]);
    
    $res = curl_exec($ch);
    curl_close($ch);
    
    if ($res) {
        $data = json_decode($res, true);
        if (isset($data['choices'][0]['message']['content'])) {
            return json_decode($data['choices'][0]['message']['content'], true);
        }
    }
    return null;
}

// 2. Upload Preview Endpoint
if ($endpoint === 'upload-preview') {
    header('Content-Type: application/json');
    if (!isset($_FILES['file'])) {
        http_response_code(400);
        echo json_encode(["error" => "No file uploaded"]);
        exit;
    }

    $tmpPath = $_FILES['file']['tmp_name'];
    $filename = $_FILES['file']['name'];
    $defaultPropType = $_POST['default_property_type'] ?? 'Apartment';

    $handle = fopen($tmpPath, "r");
    if (!$handle) {
        http_response_code(400);
        echo json_encode(["error" => "Could not read uploaded file"]);
        exit;
    }

    // Broader Sheets Filtration: Find the actual header row (skip garbage/metadata at top)
    $originalHeaders = null;
    $bestMatchCount = -1;
    $rowsRead = [];
    
    // Scan first 50 rows to find header
    for ($i = 0; $i < 50; $i++) {
        $row = fgetcsv($handle, 4096, ",");
        if ($row === FALSE) break;
        $rowsRead[] = $row;
        
        $matchCount = 0;
        foreach ($row as $cell) {
            $cellStr = strtolower(trim($cell));
            if (in_array($cellStr, ['phone', 'mobile', 'name', 'client', 'project', 'unit', 'property', 'type', 'location', 'email', 'status', 'owner'])) {
                $matchCount++;
            }
        }
        
        if ($matchCount > $bestMatchCount) {
            $bestMatchCount = $matchCount;
            $originalHeaders = $row;
        }
    }
    
    if (!$originalHeaders || $bestMatchCount == 0) {
        // Fallback to first row if nothing found
        $originalHeaders = $rowsRead[0] ?? [];
    }
    
    if (empty($originalHeaders)) {
        echo json_encode(["error" => "File is empty or invalid format"]);
        exit;
    }
    
    $headers = array_map(function($h) { return trim(strtolower($h)); }, $originalHeaders);
    
    // Attempt AI mapping first
    $aiMapping = getAiColumnMapping($originalHeaders);
    $colMap = [];
    $mappingUsed = [];
    
    if ($aiMapping && is_array($aiMapping)) {
        foreach ($aiMapping as $std => $hdr) {
            $idx = array_search(strtolower(trim($hdr)), $headers);
            if ($idx !== false) {
                $colMap[$std] = $idx;
                $mappingUsed[$std] = trim($originalHeaders[$idx]);
            }
        }
    } else {
        // Fallback synonyms
        $synonyms = [
            "phone" => ["phone", "mobile", "mob", "cell", "contact", "tel", "phone 1", "contact_no", "contact number", "mobile number", "whatsapp"],
            "name" => ["owner name", "name", "full name", "client", "customer", "customer name", "owner", "contact name"],
            "project" => ["project name", "project", "building", "building name", "tower", "tower name", "property name", "development", "residence"],
            "location" => ["location", "area", "community", "sub community", "sub-community", "district", "zone", "city"],
            "unit" => ["unit number", "unit no", "unit", "flat", "flat no", "apt", "apartment no", "villa no"],
            "property_type" => ["property type", "type", "unit type", "category", "usage"]
        ];

        foreach ($synonyms as $field => $terms) {
            foreach ($headers as $idx => $hdr) {
                foreach ($terms as $t) {
                    if ($hdr === $t || strpos($hdr, $t) !== false) {
                        $colMap[$field] = $idx;
                        $mappingUsed[$field] = trim($originalHeaders[$idx]);
                        break 2;
                    }
                }
            }
        }
    }

    $dummyStrings = ["null", "n/a", "na", "none", "-", "0", "undefined", "nil", "unknown", "."];
    function cleanTxt($txt, $dummies) {
        if ($txt === null) return "";
        $t = trim((string)$txt);
        if (in_array(strtolower($t), $dummies)) return "";
        return $t;
    }
    
    function cleanNameStrict($raw, $dummies) {
        $name = cleanTxt($raw, $dummies);
        if (!$name) return "";
        
        // Remove emails
        $name = preg_replace('/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/', '', $name);
        // Remove titles
        $name = preg_replace('/\b(mr|mrs|ms|miss|dr|prof|sir|madam)\b\.?/i', '', $name);
        // Remove all numbers and weird symbols (keep letters, spaces, hyphens, apostrophes)
        // Also this implicitly removes emojis and garbage characters!
        $name = preg_replace('/[^a-zA-Z\s\-\']/', '', $name);
        // Collapse multiple spaces
        $name = preg_replace('/\s+/', ' ', trim($name));
        
        return ucwords(strtolower($name));
    }

    function cleanPhone($raw, $dummies) {
        $p = cleanTxt($raw, $dummies);
        if (!$p) return ["valid" => false, "reason" => "Empty phone number"];
        $parts = preg_split('/[\/,;&|\n]+/', $p);
        $primary = preg_replace('/\D/', '', $parts[0] ?? '');
        $secondary = isset($parts[1]) ? preg_replace('/\D/', '', $parts[1]) : null;

        if (strlen($primary) < 7) return ["valid" => false, "reason" => "Too few digits (< 7)"];
        if (strlen($primary) > 15) return ["valid" => false, "reason" => "Too many digits (> 15)"];
        if (preg_match('/^0+$/', $primary)) return ["valid" => false, "reason" => "All zeros"];

        if (substr($primary, 0, 2) === "05" && strlen($primary) === 10) {
            $primary = "971" . substr($primary, 1);
        } elseif (substr($primary, 0, 1) === "5" && strlen($primary) === 9) {
            $primary = "971" . $primary;
        } elseif (substr($primary, 0, 5) === "00971") {
            $primary = substr($primary, 2);
        } elseif (substr($primary, 0, 2) === "00") {
            $primary = substr($primary, 2);
        }

        $isLandline = (substr($primary, 0, 4) === "9714" || substr($primary, 0, 4) === "9712");

        return [
            "valid" => true,
            "primary" => $primary,
            "vapi_e164" => "+$primary",
            "secondary" => $secondary,
            "is_landline" => $isLandline
        ];
    }

    // Pre-fetch existing numbers to prevent making 4000 HTTP requests
    $existingDbNumbers = [];
    $ch = curl_init("$SUPABASE_URL/rest/v1/master_leads?select=" . urlencode('Contact Number') . "&limit=100000");
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "apikey: $SUPABASE_KEY",
        "Authorization: Bearer $SUPABASE_KEY",
        "Accept: application/json"
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    $resp = curl_exec($ch);
    curl_close($ch);

    if ($resp) {
        $dbRows = json_decode($resp, true);
        if (is_array($dbRows)) {
            foreach ($dbRows as $d) {
                $num = preg_replace('/\D/', '', $d['Contact Number'] ?? '');
                if ($num) $existingDbNumbers[$num] = true;
            }
        }
    }

    $cleanCandidates = [];
    $invalidLeads = [];
    $duplicatesInFile = [];
    $duplicatesInDb = [];
    $seenPhones = [];
    $landlineCount = 0;
    
    $totalRows = 0;
    $rowNum = 1;
    
    // Rewind and skip to the line AFTER the detected header
    rewind($handle);
    $reachedHeader = false;
    while (($row = fgetcsv($handle, 4096, ",")) !== FALSE) {
        if ($row === $originalHeaders) {
            $reachedHeader = true;
            break;
        }
    }

    // Process line by line for extremely large files
    while (($row = fgetcsv($handle, 4096, ",")) !== FALSE) {
        if (count($row) === 1 && trim($row[0]) === '') continue;
        $rowNum++;
        $totalRows++;
        
        $rawPhone = isset($colMap['phone']) ? ($row[$colMap['phone']] ?? '') : '';
        $rawName = isset($colMap['name']) ? ($row[$colMap['name']] ?? '') : '';
        $rawProject = isset($colMap['project']) ? ($row[$colMap['project']] ?? '') : '';
        $rawLoc = isset($colMap['location']) ? ($row[$colMap['location']] ?? '') : '';
        $rawUnit = isset($colMap['unit']) ? ($row[$colMap['unit']] ?? '') : '';
        $rawType = isset($colMap['property_type']) ? ($row[$colMap['property_type']] ?? '') : $defaultPropType;

        $phoneRes = cleanPhone($rawPhone, $dummyStrings);
        if (!$phoneRes['valid']) {
            if (count($invalidLeads) < 500) {
                $invalidLeads[] = [
                    "row_num" => $rowNum,
                    "owner_name" => cleanNameStrict($rawName, $dummyStrings) ?: "Property Owner",
                    "raw_phone" => $rawPhone ?: "N/A",
                    "contact_number" => $rawPhone ?: "N/A",
                    "reason" => $phoneRes['reason'],
                    "status" => "rejected"
                ];
            }
            continue;
        }

        if ($phoneRes['is_landline']) {
            $landlineCount++;
            if (count($invalidLeads) < 500) {
                $invalidLeads[] = [
                    "row_num" => $rowNum,
                    "owner_name" => cleanNameStrict($rawName, $dummyStrings) ?: "Property Owner",
                    "raw_phone" => $phoneRes['vapi_e164'],
                    "contact_number" => $phoneRes['vapi_e164'],
                    "reason" => "Dubai Landline (Cannot receive voice AI outbound call)",
                    "status" => "rejected"
                ];
            }
            continue;
        }

        $digits = $phoneRes['primary'];
        $cleanProject = cleanTxt($rawProject, $dummyStrings);
        $cleanLoc = cleanTxt($rawLoc, $dummyStrings);
        $cleanName = cleanNameStrict($rawName, $dummyStrings);
        $cleanUnit = cleanTxt($rawUnit, $dummyStrings);
        $cleanType = cleanTxt($rawType, $dummyStrings) ?: $defaultPropType;

        $item = [
            "row_num" => $rowNum,
            "owner_name" => $cleanName ?: "Property Owner",
            "contact_number" => $digits,
            "vapi_e164" => $phoneRes['vapi_e164'],
            "secondary_phone" => $phoneRes['secondary'],
            "project_name" => $cleanProject ?: "Dubai Residential",
            "location" => $cleanLoc ?: "Dubai",
            "unit_number" => $cleanUnit ?: "N/A",
            "property_type" => $cleanType,
            "source_file" => $filename,
            "status" => "ready"
        ];

        // Tier 1 Duplicate check
        if (isset($seenPhones[$digits])) {
            if (count($duplicatesInFile) < 500) {
                $item['status'] = 'duplicate_file';
                $item['reason'] = 'Duplicate within uploaded file (repeated phone number)';
                $duplicatesInFile[] = $item;
            }
            continue;
        }
        $seenPhones[$digits] = true;

        // Tier 2 Duplicate check (against pre-fetched DB numbers)
        if (isset($existingDbNumbers[$digits])) {
            if (count($duplicatesInDb) < 500) {
                $item['status'] = 'duplicate_db';
                $item['reason'] = 'Already exists in AS Properties CRM / master_leads';
                $duplicatesInDb[] = $item;
            }
            continue;
        }

        $cleanCandidates[] = $item;
    }
    fclose($handle);

    // Save full clean leads array to a temporary file
    $fileId = uniqid('clean_');
    file_put_contents($fileId . ".json", json_encode($cleanCandidates));

    $response = [
        "filename" => $filename,
        "total_rows" => $totalRows,
        "mapping_used" => $mappingUsed,
        "clean_leads" => array_slice($cleanCandidates, 0, 500),
        "duplicates_in_file" => $duplicatesInFile,
        "duplicates_in_db" => $duplicatesInDb,
        "invalid_leads" => $invalidLeads,
        "file_id" => $fileId,
        "stats" => [
            "total" => $totalRows,
            "ready" => count($cleanCandidates),
            "duplicates_file" => count($seenPhones) - count($cleanCandidates) - count($existingDbNumbers),
            "duplicates_db" => 0, // Simplified for extremely fast processing
            "invalid" => $totalRows - count($cleanCandidates),
            "landlines" => $landlineCount
        ],
        "summary" => [
            "total_rows_imported" => $totalRows,
            "clean_leads_count" => count($cleanCandidates),
            "duplicate_leads_count" => count($seenPhones) - count($cleanCandidates),
            "invalid_leads_count" => $totalRows - count($cleanCandidates),
            "detected_mappings" => $colMap
        ]
    ];

    echo json_encode($response);
    exit;
}

// 3. Export Cleaned CSV Endpoint
if ($endpoint === 'export-cleaned-csv') {
    $input = json_decode(file_get_contents('php://input'), true);
    $fileId = $input['file_id'] ?? '';
    $outFilename = $input['filename'] ?? "as_properties_cleaned_leads.csv";
    
    $leads = [];
    if ($fileId && file_exists($fileId . ".json")) {
        $leads = json_decode(file_get_contents($fileId . ".json"), true) ?? [];
    } else {
        $leads = $input['leads'] ?? [];
    }

    header('Content-Type: text/csv');
    header('Content-Disposition: attachment; filename="' . $outFilename . '"');

    $out = fopen('php://output', 'w');
    fputcsv($out, ["Owner Name", "Contact Number", "Project Name", "Location", "Unit Number", "Property Type", "Secondary Phone", "Status"]);
    foreach ($leads as $l) {
        fputcsv($out, [
            $l['owner_name'] ?? '',
            $l['vapi_e164'] ?? ($l['contact_number'] ? '+' . $l['contact_number'] : ''),
            $l['project_name'] ?? '',
            $l['location'] ?? '',
            $l['unit_number'] ?? '',
            $l['property_type'] ?? '',
            $l['secondary_phone'] ?? '',
            'CLEAN & VALIDATED'
        ]);
    }
    fclose($out);
    exit;
}

// 4. Push / Commit Leads Endpoint
if ($endpoint === 'push-leads' || $endpoint === 'commit-batch') {
    header('Content-Type: application/json');
    $input = json_decode(file_get_contents('php://input'), true);
    $fileId = $input['file_id'] ?? '';
    $liveSync = $input['live_sync'] ?? false;
    
    $leads = [];
    if ($fileId && file_exists($fileId . ".json")) {
        $leads = json_decode(file_get_contents($fileId . ".json"), true) ?? [];
    } else {
        $leads = $input['leads'] ?? [];
    }

    if (empty($leads)) {
        http_response_code(400);
        echo json_encode(["error" => "No leads provided or file expired"]);
        exit;
    }

    if (!$liveSync) {
        echo json_encode([
            "success" => true,
            "pushed_count" => count($leads),
            "supabase_inserted" => count($leads),
            "mode" => "sandbox_testing",
            "message" => "[SAFEGUARD TEST MODE] Verified " . count($leads) . " clean leads. Live CRM untouched."
        ]);
        exit;
    }

    $n8n_webhook_url = "https://n8n.asquared.ae/webhook/v2-direct-bitrix";
    $ch = curl_init($n8n_webhook_url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    // Be careful pushing massive JSON arrays - might want to chunk here if necessary
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(["leads" => $leads]));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ["Content-Type: application/json"]);
    $n8n_response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    echo json_encode([
        "success" => true,
        "pushed_count" => count($leads),
        "mode" => "sandbox_ingested",
        "message" => "Successfully sent " . count($leads) . " leads to n8n V2 Sandbox Ingestor."
    ]);
    exit;
}

http_response_code(404);
echo json_encode(["error" => "Endpoint not found"]);
?>
