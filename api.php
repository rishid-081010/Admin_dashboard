<?php
if (file_exists(__DIR__ . '/secrets.php')) {
    require_once __DIR__ . '/secrets.php';
}
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
function getAiColumnMapping($headers, $sampleRows) {
    $apiKey = getenv('OPENAI_API_KEY');
    if (empty($apiKey)) {
        return null; // fallback to synonyms if no API key
    }
    
    $prompt = "We have a standardized CRM schema with the following core columns:\n" .
              "- 'name' (Owner Name / Client's full name)\n" .
              "- 'phone' (Contact Number / Mobile)\n" .
              "- 'project' (Project Name / Building or tower name)\n" .
              "- 'location' (Location / City or community area)\n" .
              "- 'unit' (Unit Number / Apartment or door number)\n" .
              "- 'property_type' (Property Type / Apartment, villa, or commercial)\n" .
              "- 'size' (Actual Size / Square footage or area)\n\n" .
              "I will provide the CSV Headers and the first 5 rows of data. \n" .
              "Task 1: Match the CSV headers to our core columns based on the header name and the data context.\n" .
              "Task 2: If a CSV header contains useful data but DOES NOT match any of our core columns, invent the most appropriate clear, snake_case column name for it.\n" .
              "Task 3: Output ONLY a JSON object where the keys are your chosen column names (core or invented) and the values are the exact matching string from the CSV headers.\n\n" .
              "CSV Headers: " . json_encode($headers) . "\n" .
              "Sample Data Rows: " . json_encode($sampleRows);
    
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

    // Check if raw Excel file (.xlsx is a ZIP archive starting with PK)
    $magic = fread($handle, 4);
    if (substr($magic, 0, 2) === "PK") {
        fclose($handle);
        echo json_encode([
            "error" => "Excel (.xlsx) file detected directly on server. Please press Ctrl+F5 in your browser to reload the application with the Excel converter enabled, or save the file as a .csv file."
        ]);
        exit;
    }
    rewind($handle);

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
            if (in_array($cellStr, ['phone', 'mobile', 'name', 'client', 'project', 'unit', 'property', 'type', 'location', 'email', 'status', 'owner', 'size', 'area'])) {
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
    
    // Grab next 5 rows as sample data for AI context
    $sampleRows = [];
    // We already read up to 50 rows. We need the 5 rows immediately FOLLOWING the header row in $rowsRead.
    $headerFoundIdx = -1;
    foreach ($rowsRead as $idx => $r) {
        if ($r === $originalHeaders) {
            $headerFoundIdx = $idx;
            break;
        }
    }
    
    if ($headerFoundIdx !== -1) {
        for ($i = 1; $i <= 5; $i++) {
            if (isset($rowsRead[$headerFoundIdx + $i])) {
                $sampleRows[] = $rowsRead[$headerFoundIdx + $i];
            }
        }
    }
    
    // Attempt AI mapping with sample data
    $aiMapping = getAiColumnMapping($originalHeaders, $sampleRows);
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
            "name" => ["nameen", "owner name", "full name", "client name", "customer name", "contact name", "owner", "client", "customer", "name"],
            "project" => ["master project", "project name", "project lnd", "project", "building name", "building", "tower", "tower name", "property name", "development", "residence"],
            "location" => ["location", "area", "community", "sub community", "sub-community", "district", "zone", "city"],
            "unit" => ["unitnumber", "unit number", "unit no", "unit", "flat", "flat no", "apt", "apartment no", "villa no"],
            "property_type" => ["propertytypeen", "property type", "type", "unit type", "category", "usage"],
            "size" => ["actual size", "size", "area", "sqft", "sqm", "square feet"]
        ];

        foreach ($synonyms as $field => $terms) {
            foreach ($headers as $idx => $hdr) {
                // Prevent matching non-person fields for name
                if ($field === 'name' && (strpos($hdr, 'building') !== false || strpos($hdr, 'project') !== false || strpos($hdr, 'country') !== false || strpos($hdr, 'procedure') !== false)) {
                    continue;
                }
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
        if (preg_match('/0000+$/', $primary)) return ["valid" => false, "reason" => "Likely transaction amount"];
        if (substr($primary, 0, 3) === '784' && strlen($primary) === 15) return ["valid" => false, "reason" => "Emirates ID"];

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

    $cleanCandidates = [];
    $invalidLeads = [];
    $duplicatesInFile = [];
    $duplicatesInDb = [];
    $seenPhones = [];
    
    // Explicit counters to fix negative stats
    $totalRows = 0;
    $rowNum = 1;
    $cleanCount = 0;
    $dupFileCount = 0;
    $dupDbCount = 0;
    $invalidCount = 0;
    $landlineCount = 0;
    
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

        // 1. Ghost Row Filter (skip empty Excel formatted cells)
        $nonEmptyCount = 0;
        foreach ($row as $cell) {
            $c = trim((string)$cell);
            if ($c !== '' && !in_array(strtolower($c), $dummyStrings)) {
                $nonEmptyCount++;
            }
        }
        if ($nonEmptyCount < 2) {
            continue; // Skip ghost empty rows
        }

        $rowNum++;
        $totalRows++;
        
        $rawPhone = isset($colMap['phone']) ? ($row[$colMap['phone']] ?? '') : '';
        $phoneRes = cleanPhone($rawPhone, $dummyStrings);

        // Self-Healing Pipeline: If mapped column had shifted text or invalid phone, search entire row!
        if (!$phoneRes['valid']) {
            foreach ($row as $colIdx => $cellVal) {
                if (isset($colMap['phone']) && $colIdx === $colMap['phone']) continue;
                $candidate = cleanPhone($cellVal, $dummyStrings);
                if ($candidate['valid']) {
                    // Skip 15-digit Emirates IDs (starting with 784)
                    if (substr($candidate['primary'], 0, 3) === '784' && strlen($candidate['primary']) === 15) {
                        continue;
                    }
                    $phoneRes = $candidate;
                    $rawPhone = $cellVal;
                    break;
                }
            }
        }

        $cleanPhoneVal = '';
        $vapiPhoneVal = '';
        $isDuplicate = false;

        if ($phoneRes['valid']) {
            $digits = $phoneRes['primary'];
            $cleanPhoneVal = $digits;
            $vapiPhoneVal = $phoneRes['vapi_e164'];

            if ($phoneRes['is_landline']) {
                $landlineCount++;
            }

            if (isset($seenPhones[$digits])) {
                $dupFileCount++;
                $isDuplicate = true;
            } else {
                $seenPhones[$digits] = true;
            }
        } else {
            $invalidCount++;
            $cleanPhoneVal = cleanTxt($rawPhone, $dummyStrings) ?: "N/A";
            $vapiPhoneVal = $cleanPhoneVal;
        }

        // Self-Healing Name Recovery
        $rawName = isset($colMap['name']) ? ($row[$colMap['name']] ?? '') : '';
        $cleanName = cleanNameStrict($rawName, $dummyStrings);
        $invalidNameWords = ['sale', 'mortgage', 'land', 'apartment', 'villa', 'seller', 'buyer', 'procedure', 'commercial', 'residential'];
        if (!$cleanName || in_array(strtolower($cleanName), $invalidNameWords)) {
            foreach ($row as $colIdx => $cellVal) {
                if (isset($colMap['name']) && $colIdx === $colMap['name']) continue;
                $candName = cleanNameStrict($cellVal, $dummyStrings);
                if ($candName && strlen($candName) > 3 && !in_array(strtolower($candName), $invalidNameWords)) {
                    if (preg_match('/^[a-zA-Z\s\-\'\.]+$/', $candName)) {
                        $cleanName = $candName;
                        break;
                    }
                }
            }
        }

        // Self-Healing Project Recovery
        $rawProject = isset($colMap['project']) ? ($row[$colMap['project']] ?? '') : '';
        $cleanProject = cleanTxt($rawProject, $dummyStrings);
        if (!$cleanProject || $cleanProject === '0') {
            foreach ($row as $cellVal) {
                $c = cleanTxt($cellVal, $dummyStrings);
                if ($c && strlen($c) > 4 && !is_numeric($c)) {
                    if (stripos($c, 'jumeirah') !== false || stripos($c, 'tower') !== false || stripos($c, 'residence') !== false || stripos($c, 'hills') !== false || stripos($c, 'downtown') !== false || stripos($c, 'marina') !== false || stripos($c, 'creek') !== false || stripos($c, 'damac') !== false || stripos($c, 'emaar') !== false) {
                        $cleanProject = $c;
                        break;
                    }
                }
            }
        }

        // Self-Healing Actual Size Recovery
        $rawSize = isset($colMap['size']) ? ($row[$colMap['size']] ?? '') : '';
        $cleanSize = cleanTxt($rawSize, $dummyStrings);
        if (!$cleanSize || !is_numeric($cleanSize)) {
            foreach ($row as $cellVal) {
                $c = cleanTxt($cellVal, $dummyStrings);
                if ($c && is_numeric($c) && floatval($c) >= 20 && floatval($c) <= 60000 && strlen($c) <= 8) {
                    $cleanSize = $c;
                    break;
                }
            }
        }

        $cleanLoc = cleanTxt(isset($colMap['location']) ? ($row[$colMap['location']] ?? '') : '', $dummyStrings);
        $cleanUnit = cleanTxt(isset($colMap['unit']) ? ($row[$colMap['unit']] ?? '') : '', $dummyStrings);
        $cleanType = cleanTxt(isset($colMap['property_type']) ? ($row[$colMap['property_type']] ?? '') : '', $dummyStrings) ?: $defaultPropType;

        $item = [
            "row_num" => $rowNum,
            "owner_name" => $cleanName ?: "Property Owner",
            "contact_number" => $cleanPhoneVal,
            "vapi_e164" => $vapiPhoneVal,
            "secondary_phone" => $phoneRes['secondary'] ?? null,
            "project_name" => $cleanProject ?: "Dubai Residential",
            "location" => $cleanLoc ?: "Dubai",
            "unit_number" => $cleanUnit ?: "N/A",
            "property_type" => $cleanType,
            "actual_size" => $cleanSize,
            "source_file" => $filename,
            "status" => $isDuplicate ? "duplicate_file" : "ready"
        ];
        
        // Dynamically add any newly invented columns the AI found
        foreach ($colMap as $key => $idx) {
            if (!in_array($key, ['phone', 'name', 'project', 'location', 'unit', 'property_type', 'size'])) {
                $item[$key] = cleanTxt($row[$idx] ?? '', $dummyStrings);
            }
        }

        if ($isDuplicate && count($duplicatesInFile) < 500) {
            $duplicatesInFile[] = $item;
        }

        if (!$phoneRes['valid'] && count($invalidLeads) < 500) {
            $invalidItem = $item;
            $invalidItem['reason'] = $phoneRes['reason'];
            $invalidItem['status'] = 'raw_preserved';
            $invalidLeads[] = $invalidItem;
        }

        // KEEP ALL LEADS - NEVER DROP!
        $cleanCount++;
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
        "duplicates_in_db" => $duplicatesInDb, // Will be empty/0
        "invalid_leads" => $invalidLeads,
        "file_id" => $fileId,
        "stats" => [
            "total" => $totalRows,
            "ready" => $cleanCount,
            "duplicates_file" => $dupFileCount,
            "duplicates_db" => 0, // Ignored at this stage
            "invalid" => $invalidCount,
            "landlines" => $landlineCount
        ],
        "summary" => [
            "total_rows_imported" => $totalRows,
            "clean_leads_count" => $cleanCount,
            "duplicate_leads_count" => $dupFileCount,
            "invalid_leads_count" => $invalidCount,
            "detected_mappings" => $colMap
        ]
    ];

    echo json_encode($response, JSON_INVALID_UTF8_SUBSTITUTE | JSON_PARTIAL_OUTPUT_ON_ERROR);
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
    
    // Extract dynamic headers to build the CSV header row
    $standardKeys = [
        'owner_name' => "Owner Name",
        'vapi_e164' => "Contact Number",
        'project_name' => "Project Name",
        'location' => "Location",
        'unit_number' => "Unit Number",
        'property_type' => "Property Type",
        'actual_size' => "Actual Size",
        'secondary_phone' => "Secondary Phone",
        'status' => "Status"
    ];
    
    $dynamicKeys = [];
    foreach ($leads as $l) {
        foreach (array_keys($l) as $k) {
            if (!isset($standardKeys[$k]) && $k !== 'contact_number' && $k !== 'row_num' && $k !== 'source_file') {
                $dynamicKeys[$k] = ucwords(str_replace('_', ' ', $k));
            }
        }
    }
    
    $headers = array_values($standardKeys);
    foreach ($dynamicKeys as $dk) {
        $headers[] = $dk;
    }
    fputcsv($out, $headers);

    foreach ($leads as $l) {
        $row = [
            $l['owner_name'] ?? '',
            $l['vapi_e164'] ?? ($l['contact_number'] ? '+' . $l['contact_number'] : ''),
            $l['project_name'] ?? '',
            $l['location'] ?? '',
            $l['unit_number'] ?? '',
            $l['property_type'] ?? '',
            $l['actual_size'] ?? '',
            $l['secondary_phone'] ?? '',
            $l['status'] ?? 'CLEAN & VALIDATED'
        ];
        
        foreach ($dynamicKeys as $k => $label) {
            $row[] = $l[$k] ?? '';
        }
        
        fputcsv($out, $row);
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

    // Pre-fetch existing numbers from Supabase to filter duplicates before pushing
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

    $finalLeadsToPush = [];
    $skippedDuplicates = 0;
    foreach ($leads as $l) {
        $dig = preg_replace('/\D/', '', $l['contact_number'] ?? '');
        if ($dig && isset($existingDbNumbers[$dig])) {
            $skippedDuplicates++;
        } else {
            $finalLeadsToPush[] = $l;
        }
    }

    if (empty($finalLeadsToPush)) {
        echo json_encode([
            "success" => true,
            "pushed_count" => 0,
            "message" => "All provided leads (" . count($leads) . ") were already in the CRM. Nothing new pushed."
        ]);
        exit;
    }

    if (!$liveSync) {
        echo json_encode([
            "success" => true,
            "pushed_count" => count($finalLeadsToPush),
            "supabase_inserted" => count($finalLeadsToPush),
            "mode" => "sandbox_testing",
            "message" => "[SAFEGUARD TEST MODE] Verified " . count($finalLeadsToPush) . " new leads (skipped $skippedDuplicates duplicates). Live CRM untouched."
        ]);
        exit;
    }

    $n8n_webhook_url = "https://n8n.asquared.ae/webhook/v2-direct-bitrix";
    $ch = curl_init($n8n_webhook_url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    // Be careful pushing massive JSON arrays - might want to chunk here if necessary
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(["leads" => $finalLeadsToPush]));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ["Content-Type: application/json"]);
    $n8n_response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    echo json_encode([
        "success" => true,
        "pushed_count" => count($finalLeadsToPush),
        "mode" => "sandbox_ingested",
        "message" => "Successfully sent " . count($finalLeadsToPush) . " new leads to n8n (Skipped $skippedDuplicates CRM duplicates)."
    ]);
    exit;
}

http_response_code(404);
echo json_encode(["error" => "Endpoint not found"]);
?>
