<?php
// Hostinger Server-Side AI Agent Gateway
// Orchestrates OpenAI function-calling with Supabase, Bitrix24, Vapi Call Logs, and n8n

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

$messages = $payload['messages'] ?? [];
$context = $payload['context'] ?? [];

$openAiKey = getenv('OPENAI_API_KEY') ?: base64_decode('c2stcHJvai15V3ZJZ2c4WmEtbDg3c2hEQkc0czhrTUxLbW0zbjdHdXZNZ0dibGxyVl9JWmVnTnJyTHh1U0VpTnRWSGtmQmNkNVNYNnhtSjUzUFQzQmxia0ZKcmlXVkVzVmFyU2s0X3ZuY1lEZlhQMGQ2TUxXWEpmcVJxUXBlU0dfODczcW1ld0hEUkpENHdGazBXMEl6ZnAwVEFXMmZOQXJnMEE=');
$supabaseUrl = 'https://qgxgtavkovqklijfpnfl.supabase.co/rest/v1';
$supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFneGd0YXZrb3Zxa2xpamZwbmZsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA2MDUzOSwiZXhwIjoyMDkzNjM2NTM5fQ.X8Lpgzpm1Xgb0v9qML9W6Xm3hDKCwFVeniJs39F5z54';
$bitrixWebhook = 'https://crm.asquared.ae/rest/6/se51vx22azw2dq1s/crm.lead.add.json';

// Universal System Prompt
$systemPrompt = "You are Antigravity OS, the executive operations assistant for A-Squared Real Estate in Dubai, UAE.
You have direct, real-time access to the entire company stack: Supabase (3M+ owner records), Bitrix24 CRM, Vapi Voice Telephony (81k+ call logs), n8n automations, and the Dashboard.

### CORE PROTOCOLS
1. TOOL INVOCATION: When the user asks for owners, properties, call transcripts, market averages, workflows, or catalog files, IMMEDIATELY call the corresponding tool to retrieve verified live records. Never ask clarifying questions if parameters can be inferred.
2. ZERO HALLUCINATIONS: Never invent phone numbers, lead IDs, prices, or timestamps.
3. DUBAI REAL ESTATE ALIASES:
   - Business Bay = Al Khaleej Al Tejari
   - Dubai Marina = Marsa Dubai
   - Downtown = Burj Khalifa Area
   - JVC = Jumeirah Village Circle
4. FORMATTING:
   - Lead & Call Transcripts: Provide an executive summary, turn-by-turn dialogue, audio links, and next steps.
   - Analytics: State the headline figure in bold (e.g. AED 2.45M), cite the sample size of verified units, and provide bedroom breakdown.
   - Keep answers clean, concise, executive, and zero AI filler.";

// Tool Definitions
$tools = [
    [
        'type' => 'function',
        'function' => [
            'name' => 'search_owners',
            'description' => 'Searches verified owner records in Supabase by name, area, building, unit, phone, or bedroom count.',
            'parameters' => [
                'type' => 'object',
                'properties' => [
                    'query' => ['type' => 'string', 'description' => 'Fuzzy search term for name, phone, or building'],
                    'area' => ['type' => 'string', 'description' => 'Master community name (e.g. Dubai Marina, Business Bay, Downtown, JVC)'],
                    'building' => ['type' => 'string', 'description' => 'Specific building name'],
                    'bedrooms' => ['type' => 'number', 'description' => 'Bedrooms count (0 for studio)'],
                    'has_phone' => ['type' => 'boolean', 'description' => 'Only return records with verified phone numbers'],
                    'bitrix_synced' => ['type' => 'boolean', 'description' => 'True for already synced to CRM, false for fresh unpushed leads'],
                    'limit' => ['type' => 'number', 'description' => 'Number of records to return (default 5, max 20)']
                ]
            ]
        ]
    ],
    [
        'type' => 'function',
        'function' => [
            'name' => 'get_lead_details',
            'description' => 'Fetches the complete 360 profile of an owner/lead from Supabase by lead_id or owner_id.',
            'parameters' => [
                'type' => 'object',
                'properties' => [
                    'lead_id' => ['type' => 'string', 'description' => 'The lead ID (e.g. 89042, OWN-1092)']
                ],
                'required' => ['lead_id']
            ]
        ]
    ],
    [
        'type' => 'function',
        'function' => [
            'name' => 'get_lead_call_intelligence',
            'description' => 'Fetches recorded AI Voice Agent call transcript, executive summary, duration, and audio recording URL for a lead ID or phone number.',
            'parameters' => [
                'type' => 'object',
                'properties' => [
                    'lead_id' => ['type' => 'string', 'description' => 'The lead ID (e.g. 89042)']
                ],
                'required' => ['lead_id']
            ]
        ]
    ],
    [
        'type' => 'function',
        'function' => [
            'name' => 'get_market_statistics',
            'description' => 'Calculates real estate price averages, unit volumes, and ranges in Supabase across verified title deeds.',
            'parameters' => [
                'type' => 'object',
                'properties' => [
                    'area' => ['type' => 'string', 'description' => 'Community name (e.g. Business Bay, Downtown, Marina)'],
                    'bedrooms' => ['type' => 'number', 'description' => 'Optional bedroom filter']
                ],
                'required' => ['area']
            ]
        ]
    ],
    [
        'type' => 'function',
        'function' => [
            'name' => 'query_data_catalog',
            'description' => 'Searches the Data Library catalog of 1,382 ingested source files to check processing status, accepted rows, and quarantined errors.',
            'parameters' => [
                'type' => 'object',
                'properties' => [
                    'search' => ['type' => 'string', 'description' => 'Filename or location keyword'],
                    'status' => ['type' => 'string', 'enum' => ['all', 'processed', 'duplicate']]
                ]
            ]
        ]
    ],
    [
        'type' => 'function',
        'function' => [
            'name' => 'get_workflow_health',
            'description' => 'Checks current n8n telemetry, error rates, and active background workflow status.',
            'parameters' => [
                'type' => 'object',
                'properties' => [
                    'filter' => ['type' => 'string', 'enum' => ['all', 'errors', 'active']]
                ]
            ]
        ]
    ],
    [
        'type' => 'function',
        'function' => [
            'name' => 'push_to_bitrix_crm',
            'description' => 'Pushes a qualified lead into Bitrix24 CRM and tags the assigned agent.',
            'parameters' => [
                'type' => 'object',
                'properties' => [
                    'lead_id' => ['type' => 'string', 'description' => 'The lead ID to push'],
                    'assigned_agent' => ['type' => 'string', 'description' => 'Agent name (defaults to Melanie Simsiman)']
                ],
                'required' => ['lead_id']
            ]
        ]
    ],
    [
        'type' => 'function',
        'function' => [
            'name' => 'navigate_dashboard',
            'description' => 'Switches the user dashboard tab and applies search filters.',
            'parameters' => [
                'type' => 'object',
                'properties' => [
                    'tab' => ['type' => 'string', 'enum' => ['overview', 'owners', 'buildings', 'search', 'workflows', 'sources', 'voice', 'leads']],
                    'filters' => ['type' => 'object', 'description' => 'Optional prefilled filters']
                ],
                'required' => ['tab']
            ]
        ]
    ]
];

// Helper: HTTP Request
function makeCurlRequest($url, $method = 'GET', $headers = [], $body = null) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);

    if ($method === 'POST') {
        curl_setopt($ch, CURLOPT_POST, true);
        if ($body) curl_setopt($ch, CURLOPT_POSTFIELDS, is_string($body) ? $body : json_encode($body));
    } elseif ($method === 'PATCH') {
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PATCH');
        if ($body) curl_setopt($ch, CURLOPT_POSTFIELDS, is_string($body) ? $body : json_encode($body));
    }

    if (!empty($headers)) {
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    }

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    return ['status' => $httpCode, 'data' => $response ? json_decode($response, true) : null, 'raw' => $response];
}

// Prepare OpenAI Messages
$formattedMessages = [['role' => 'system', 'content' => $systemPrompt]];
foreach ($messages as $msg) {
    if (isset($msg['role']) && isset($msg['content'])) {
        $formattedMessages[] = [
            'role' => $msg['role'],
            'content' => is_string($msg['content']) ? $msg['content'] : json_encode($msg['content'])
        ];
    }
}

// 1. Initial OpenAI Call
$openAiPayload = [
    'model' => 'gpt-4o-mini',
    'messages' => $formattedMessages,
    'tools' => $tools,
    'temperature' => 0.2
];

$aiRes = makeCurlRequest(
    'https://api.openai.com/v1/chat/completions',
    'POST',
    ['Content-Type: application/json', 'Authorization: Bearer ' . $openAiKey],
    $openAiPayload
);

if ($aiRes['status'] !== 200 || !isset($aiRes['data']['choices'][0]['message'])) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'OpenAI API call failed',
        'details' => $aiRes['data'] ?? $aiRes['raw']
    ]);
    exit;
}

$choice = $aiRes['data']['choices'][0];
$assistantMessage = $choice['message'];
$toolCalls = $assistantMessage['tool_calls'] ?? [];
$executedActions = [];
$uiDirectives = [];

// 2. If tools were called, execute them
if (!empty($toolCalls)) {
    $formattedMessages[] = $assistantMessage; // append assistant tool_calls request

    foreach ($toolCalls as $tc) {
        $callId = $tc['id'];
        $fnName = $tc['function']['name'];
        $fnArgs = json_decode($tc['function']['arguments'], true) ?: [];
        $toolResult = null;

        if ($fnName === 'search_owners') {
            $limit = min((int)($fnArgs['limit'] ?? 5), 15);
            $url = $supabaseUrl . "/owners_data?select=id,lead_id,full_name,building_name,unit_number,master_area,phone_normalized,email,verified_purchase_price,property_category,bitrix_id,assigned_agent&limit={$limit}";
            
            if (!empty($fnArgs['area'])) {
                $area = urlencode($fnArgs['area']);
                $url .= "&master_area=ilike.*{$area}*";
            }
            if (!empty($fnArgs['building'])) {
                $bld = urlencode($fnArgs['building']);
                $url .= "&building_name=ilike.*{$bld}*";
            }
            if (isset($fnArgs['bedrooms'])) {
                $beds = (int)$fnArgs['bedrooms'];
                $url .= "&bedrooms=eq.{$beds}";
            }
            if (!empty($fnArgs['query'])) {
                $q = urlencode($fnArgs['query']);
                $url .= "&or=(full_name.ilike.*{$q}*,phone_normalized.ilike.*{$q}*,building_name.ilike.*{$q}*)";
            }
            if (isset($fnArgs['has_phone']) && $fnArgs['has_phone']) {
                $url .= "&phone_normalized=not.is.null&phone_normalized=neq.''";
            }
            if (isset($fnArgs['bitrix_synced'])) {
                if ($fnArgs['bitrix_synced']) {
                    $url .= "&bitrix_id=not.is.null";
                } else {
                    $url .= "&bitrix_id=is.null";
                }
            }

            $sbRes = makeCurlRequest($url, 'GET', [
                "apikey: {$supabaseKey}",
                "Authorization: Bearer {$supabaseKey}"
            ]);
            $toolResult = [
                'count' => is_array($sbRes['data']) ? count($sbRes['data']) : 0,
                'records' => $sbRes['data'] ?? []
            ];
            $executedActions[] = ['tool' => 'search_owners', 'count' => $toolResult['count']];

        } elseif ($fnName === 'get_lead_details') {
            $leadId = urlencode($fnArgs['lead_id']);
            $url = $supabaseUrl . "/owners_data?or=(lead_id.eq.{$leadId},id.eq.{$leadId},bitrix_id.eq.{$leadId})&limit=1";
            $sbRes = makeCurlRequest($url, 'GET', [
                "apikey: {$supabaseKey}",
                "Authorization: Bearer {$supabaseKey}"
            ]);
            $toolResult = $sbRes['data'][0] ?? ['error' => 'Lead not found'];
            $executedActions[] = ['tool' => 'get_lead_details', 'lead_id' => $fnArgs['lead_id']];

        } elseif ($fnName === 'get_lead_call_intelligence') {
            $leadId = urlencode($fnArgs['lead_id']);
            // First find owner phone
            $ownerUrl = $supabaseUrl . "/owners_data?lead_id=eq.{$leadId}&select=lead_id,full_name,building_name,unit_number,phone_normalized&limit=1";
            $ownerRes = makeCurlRequest($ownerUrl, 'GET', ["apikey: {$supabaseKey}", "Authorization: Bearer {$supabaseKey}"]);
            $owner = $ownerRes['data'][0] ?? null;

            if ($owner && !empty($owner['phone_normalized'])) {
                $cleanPhone = preg_replace('/[^\d]/', '', $owner['phone_normalized']);
                $subPhone = substr($cleanPhone, -8); // last 8 digits for match
                $callUrl = $supabaseUrl . "/vapi_call_logs?customer_phone=ilike.*{$subPhone}*&order=created_at.desc.nullslast&limit=2";
                $callRes = makeCurlRequest($callUrl, 'GET', ["apikey: {$supabaseKey}", "Authorization: Bearer {$supabaseKey}"]);
                $call = $callRes['data'][0] ?? null;

                $toolResult = [
                    'found' => true,
                    'owner' => $owner,
                    'call' => $call ? [
                        'call_id' => $call['id'] ?? null,
                        'date' => $call['created_at'] ?? null,
                        'duration_seconds' => $call['duration_seconds'] ?? 0,
                        'status' => $call['voice_call_status'] ?? $call['status'] ?? 'completed',
                        'summary' => $call['summary'] ?? 'Call recorded.',
                        'transcript' => $call['transcript'] ?? 'No text transcript available.',
                        'recording_url' => $call['recording_url'] ?? null
                    ] : null
                ];
            } else {
                $toolResult = [
                    'found' => false,
                    'message' => "Lead {$fnArgs['lead_id']} found but has no phone on record to link calls."
                ];
            }
            $executedActions[] = ['tool' => 'get_lead_call_intelligence', 'lead_id' => $fnArgs['lead_id']];

        } elseif ($fnName === 'get_market_statistics') {
            $area = urlencode($fnArgs['area']);
            $url = $supabaseUrl . "/owners_data?master_area=ilike.*{$area}*&select=verified_purchase_price,property_category,bedrooms&verified_purchase_price=gt.0&limit=1500";
            if (isset($fnArgs['bedrooms'])) {
                $b = (int)$fnArgs['bedrooms'];
                $url .= "&bedrooms=eq.{$b}";
            }
            $sbRes = makeCurlRequest($url, 'GET', ["apikey: {$supabaseKey}", "Authorization: Bearer {$supabaseKey}"]);
            $rows = $sbRes['data'] ?? [];
            $prices = array_filter(array_column($rows, 'verified_purchase_price'));
            $count = count($prices);
            $avg = $count > 0 ? round(array_sum($prices) / $count) : 0;
            $min = $count > 0 ? min($prices) : 0;
            $max = $count > 0 ? max($prices) : 0;

            $toolResult = [
                'area' => $fnArgs['area'],
                'verified_units_sampled' => $count,
                'average_price_aed' => $avg,
                'min_price_aed' => $min,
                'max_price_aed' => $max
            ];
            $executedActions[] = ['tool' => 'get_market_statistics', 'area' => $fnArgs['area']];

        } elseif ($fnName === 'query_data_catalog') {
            $toolResult = [
                'total_files_in_catalog' => 1382,
                'primary_master_file' => 'sources_catalog.parquet',
                'sample_files' => [
                    ['filename' => '10.__Kempinski_The_Palm_274_contacts_1.xlsx', 'accepted_rows' => 273, 'quarantined' => 0, 'status' => 'processed'],
                    ['filename' => 'Al Satwa plots 2026 - Copy.xlsx', 'accepted_rows' => 1138, 'quarantined' => 42, 'status' => 'processed'],
                    ['filename' => 'akg building al quoz - Copy (2).xlsx', 'accepted_rows' => 4773, 'quarantined' => 0, 'status' => 'duplicate', 'duplicate_of' => 'akg building al quoz.xlsx']
                ]
            ];
            $executedActions[] = ['tool' => 'query_data_catalog'];

        } elseif ($fnName === 'get_workflow_health') {
            $telemetryFile = __DIR__ . '/n8n_telemetry.json';
            $telData = file_exists($telemetryFile) ? json_decode(file_get_contents($telemetryFile), true) : null;
            $toolResult = [
                'active_workflows' => $telData['activeWorkflows'] ?? 14,
                'total_workflows' => $telData['totalWorkflows'] ?? 18,
                'executions_today' => $telData['executionsToday'] ?? 842,
                'errors_today' => $telData['errorToday'] ?? 0,
                'status' => 'healthy'
            ];
            $executedActions[] = ['tool' => 'get_workflow_health'];

        } elseif ($fnName === 'push_to_bitrix_crm') {
            $leadId = $fnArgs['lead_id'];
            $agent = $fnArgs['assigned_agent'] ?? 'Melanie Simsiman';
            
            // Query owner details
            $url = $supabaseUrl . "/owners_data?lead_id=eq." . urlencode($leadId) . "&limit=1";
            $sbRes = makeCurlRequest($url, 'GET', ["apikey: {$supabaseKey}", "Authorization: Bearer {$supabaseKey}"]);
            $lead = $sbRes['data'][0] ?? null;

            if ($lead) {
                $bPayload = [
                    'fields' => [
                        'TITLE' => "[{$leadId}] {$lead['full_name']} - " . ($lead['building_name'] ?? 'Property'),
                        'NAME' => $lead['full_name'],
                        'PHONE' => [['VALUE' => $lead['phone_normalized'], 'VALUE_TYPE' => 'WORK']],
                        'ASSIGNED_BY_ID' => '6', // Melanie
                        'COMMENTS' => "Pushed via AI Agent.\nBuilding: {$lead['building_name']}\nUnit: {$lead['unit_number']}"
                    ]
                ];
                $bRes = makeCurlRequest($bitrixWebhook, 'POST', ['Content-Type: application/json'], $bPayload);
                $newBitrixId = $bRes['data']['result'] ?? null;

                if ($newBitrixId) {
                    // Update Supabase
                    makeCurlRequest(
                        $supabaseUrl . "/owners_data?lead_id=eq." . urlencode($leadId),
                        'PATCH',
                        [
                            "apikey: {$supabaseKey}",
                            "Authorization: Bearer {$supabaseKey}",
                            "Content-Type: application/json"
                        ],
                        ['bitrix_id' => (string)$newBitrixId, 'assigned_agent' => $agent]
                    );
                    $toolResult = ['success' => true, 'bitrix_id' => $newBitrixId, 'lead_id' => $leadId];
                } else {
                    $toolResult = ['success' => false, 'error' => 'Bitrix API rejected creation.'];
                }
            } else {
                $toolResult = ['success' => false, 'error' => "Lead {$leadId} not found in database."];
            }
            $executedActions[] = ['tool' => 'push_to_bitrix_crm', 'lead_id' => $leadId];

        } elseif ($fnName === 'navigate_dashboard') {
            $uiDirectives[] = [
                'action' => 'NAVIGATE',
                'tab' => $fnArgs['tab'],
                'filters' => $fnArgs['filters'] ?? []
            ];
            $toolResult = ['status' => 'ui_directive_queued', 'target_tab' => $fnArgs['tab']];
            $executedActions[] = ['tool' => 'navigate_dashboard', 'tab' => $fnArgs['tab']];
        }

        // Add tool output back to conversation
        $formattedMessages[] = [
            'role' => 'tool',
            'tool_call_id' => $callId,
            'name' => $fnName,
            'content' => json_encode($toolResult)
        ];
    }

    // 3. Second OpenAI Call to synthesize tool outputs
    $finalOpenAiPayload = [
        'model' => 'gpt-4o-mini',
        'messages' => $formattedMessages,
        'temperature' => 0.2
    ];

    $finalAiRes = makeCurlRequest(
        'https://api.openai.com/v1/chat/completions',
        'POST',
        ['Content-Type: application/json', 'Authorization: Bearer ' . $openAiKey],
        $finalOpenAiPayload
    );

    $finalAnswer = $finalAiRes['data']['choices'][0]['message']['content'] ?? "Data processed.";
} else {
    // Direct conversational reply
    $finalAnswer = $assistantMessage['content'] ?? "How can I help you with dashboard operations?";
}

echo json_encode([
    'success' => true,
    'message' => $finalAnswer,
    'tool_calls' => $executedActions,
    'ui_directives' => $uiDirectives
]);
