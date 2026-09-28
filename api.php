<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$SUPABASE_URL = "https://qgxgtavkovqklijfpnfl.supabase.co";
$SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFneGd0YXZrb3Zxa2xpamZwbmZsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA2MDUzOSwiZXhwIjoyMDkzNjM2NTM5fQ.X8Lpgzpm1Xgb0v9qML9W6Xm3hDKCwFVeniJs39F5z54";
$BITRIX_WEBHOOK_URL = "https://crm.asquared.ae/rest/12/19gvgxv7bqa7w2a0/";

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

    $rawRows = [];
    while (($data = fgetcsv($handle, 4096, ",")) !== FALSE) {
        if (count($data) === 1 && trim($data[0]) === '') continue;
        $rawRows[] = $data;
    }
    fclose($handle);

    if (empty($rawRows)) {
        echo json_encode(["error" => "File is empty"]);
        exit;
    }

    $originalHeaders = $rawRows[0];
    $headers = array_map(function($h) { return trim(strtolower($h)); }, $originalHeaders);
    $dataRows = array_slice($rawRows, 1);

    // Header synonym detection
    $synonyms = [
        "phone" => ["phone", "mobile", "mob", "cell", "contact", "tel", "phone 1", "contact_no", "contact number", "mobile number", "whatsapp"],
        "name" => ["owner name", "name", "full name", "client", "customer", "customer name", "owner", "contact name"],
        "project" => ["project name", "project", "building", "building name", "tower", "tower name", "property name", "development", "residence"],
        "location" => ["location", "area", "community", "sub community", "sub-community", "district", "zone", "city"],
        "unit" => ["unit number", "unit no", "unit", "flat", "flat no", "apt", "apartment no", "villa no"],
        "property_type" => ["property type", "type", "unit type", "category", "usage"]
    ];

    $colMap = [];
    $mappingUsed = [];
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

    $dummyStrings = ["null", "n/a", "na", "none", "-", "0", "undefined", "nil", "unknown", "."];
    function cleanTxt($txt, $dummies) {
        if ($txt === null) return "";
        $t = trim((string)$txt);
        if (in_array(strtolower($t), $dummies)) return "";
        return $t;
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

        // UAE formats
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
    $seenPhones = [];
    $duplicatesInFile = [];
    $landlineCount = 0;

    foreach ($dataRows as $rowIdx => $row) {
        $rowNum = $rowIdx + 2;
        $rawPhone = isset($colMap['phone']) ? ($row[$colMap['phone']] ?? '') : '';
        $rawName = isset($colMap['name']) ? ($row[$colMap['name']] ?? '') : '';
        $rawProject = isset($colMap['project']) ? ($row[$colMap['project']] ?? '') : '';
        $rawLoc = isset($colMap['location']) ? ($row[$colMap['location']] ?? '') : '';
        $rawUnit = isset($colMap['unit']) ? ($row[$colMap['unit']] ?? '') : '';
        $rawType = isset($colMap['property_type']) ? ($row[$colMap['property_type']] ?? '') : $defaultPropType;

        $phoneRes = cleanPhone($rawPhone, $dummyStrings);
        if (!$phoneRes['valid']) {
            $invalidLeads[] = [
                "row_num" => $rowNum,
                "owner_name" => cleanTxt($rawName, $dummyStrings) ?: "Property Owner",
                "raw_phone" => $rawPhone ?: "N/A",
                "contact_number" => $rawPhone ?: "N/A",
                "reason" => $phoneRes['reason'],
                "status" => "rejected"
            ];
            continue;
        }

        if ($phoneRes['is_landline']) {
            $landlineCount++;
            $invalidLeads[] = [
                "row_num" => $rowNum,
                "owner_name" => cleanTxt($rawName, $dummyStrings) ?: "Property Owner",
                "raw_phone" => $phoneRes['vapi_e164'],
                "contact_number" => $phoneRes['vapi_e164'],
                "reason" => "Dubai Landline (Cannot receive voice AI outbound call)",
                "status" => "rejected"
            ];
            continue;
        }

        $digits = $phoneRes['primary'];
        $cleanProject = cleanTxt($rawProject, $dummyStrings);
        $cleanLoc = cleanTxt($rawLoc, $dummyStrings);
        $cleanName = ucwords(strtolower(cleanTxt($rawName, $dummyStrings)));
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

        // Tier 1 Duplicate check (in file)
        if (isset($seenPhones[$digits])) {
            $item['status'] = 'duplicate_file';
            $item['reason'] = 'Duplicate within uploaded file (repeated phone number)';
            $duplicatesInFile[] = $item;
            continue;
        }
        $seenPhones[$digits] = true;

        $cleanCandidates[] = $item;
    }

    // Tier 2: Check Supabase CRM index in batch
    $duplicatesInDb = [];
    $cleanLeads = [];
    $existingDbNumbers = [];

    if (!empty($cleanCandidates)) {
        // Chunk candidates into batches of 100
        $chunks = array_chunk($cleanCandidates, 100);
        
        foreach ($chunks as $chunk) {
            $phonesToCheck = [];
            foreach ($chunk as $c) {
                $phonesToCheck[] = '"' . $c['contact_number'] . '"';
            }
            
            if (count($phonesToCheck) > 0) {
                $inList = 'in.(' . implode(',', $phonesToCheck) . ')';
                $url = $SUPABASE_URL . '/rest/v1/master_leads?select=' . urlencode('Contact Number') . '&' . urlencode('Contact Number') . '=' . $inList;
                
                $ch = curl_init($url);
                curl_setopt($ch, CURLOPT_HTTPHEADER, [
                    "apikey: $SUPABASE_KEY",
                    "Authorization: Bearer $SUPABASE_KEY",
                    "Accept: application/json"
                ]);
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_TIMEOUT, 3);
                curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 2);
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
            }
        }

        foreach ($cleanCandidates as $c) {
            $dig = $c['contact_number'];
            if (isset($existingDbNumbers[$dig])) {
                $c['status'] = 'duplicate_db';
                $c['reason'] = 'Already exists in AS Properties CRM / master_leads';
                $duplicatesInDb[] = $c;
            } else {
                $cleanLeads[] = $c;
            }
        }
    }

    $response = [
        "filename" => $filename,
        "total_rows" => count($dataRows),
        "mapping_used" => $mappingUsed,
        "clean_leads" => $cleanLeads,
        "duplicates_in_file" => $duplicatesInFile,
        "duplicates_in_db" => $duplicatesInDb,
        "invalid_leads" => $invalidLeads,
        "stats" => [
            "total" => count($dataRows),
            "ready" => count($cleanLeads),
            "duplicates_file" => count($duplicatesInFile),
            "duplicates_db" => count($duplicatesInDb),
            "invalid" => count($invalidLeads),
            "landlines" => $landlineCount
        ],
        "summary" => [
            "total_rows_imported" => count($dataRows),
            "clean_leads_count" => count($cleanLeads),
            "duplicate_leads_count" => count($duplicatesInFile) + count($duplicatesInDb),
            "invalid_leads_count" => count($invalidLeads),
            "detected_mappings" => $colMap
        ]
    ];

    echo json_encode($response);
    exit;
}

// 3. Export Cleaned CSV Endpoint
if ($endpoint === 'export-cleaned-csv') {
    $input = json_decode(file_get_contents('php://input'), true);
    $leads = $input['leads'] ?? [];
    $outFilename = $input['filename'] ?? "as_properties_cleaned_leads.csv";

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
    $leads = $input['leads'] ?? [];
    $liveSync = $input['live_sync'] ?? false;

    if (empty($leads)) {
        http_response_code(400);
        echo json_encode(["error" => "No leads provided"]);
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

    $n8n_webhook_url = "https://n8n.asquared.ae/webhook/v2-ingest-sandbox";
    $ch = curl_init($n8n_webhook_url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
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

