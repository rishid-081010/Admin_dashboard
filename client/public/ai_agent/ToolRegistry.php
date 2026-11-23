<?php
// ai_agent/ToolRegistry.php
// Centralized Registry for all 26 Capabilities with JSON Schemas, Risk Levels, and Handlers

class ToolRegistry {
    public const RISK_READ = 'READ';
    public const RISK_WRITE = 'WRITE';
    public const RISK_HIGH_IMPACT = 'HIGH_IMPACT';

    public static function getRegistry(): array {
        return [
            // --- 1. Owner & Lead Intelligence ---
            'search_owners' => [
                'name' => 'search_owners',
                'domain' => 'owner_intelligence',
                'description' => 'Searches verified owner records in Supabase by name, area, building, unit, phone, or bedroom count.',
                'risk_level' => self::RISK_READ,
                'permission' => 'read:owners',
                'parameters' => [
                    'type' => 'object',
                    'properties' => [
                        'query' => ['type' => 'string', 'description' => 'Fuzzy search term for name, phone, building, or ID'],
                        'area' => ['type' => 'string', 'description' => 'Master community name (e.g. Dubai Marina, Business Bay, Downtown, JVC)'],
                        'building' => ['type' => 'string', 'description' => 'Specific building name'],
                        'bedrooms' => ['type' => 'number', 'description' => 'Bedrooms count (0 for studio)'],
                        'has_phone' => ['type' => 'boolean', 'description' => 'Only return records with verified phone numbers'],
                        'bitrix_synced' => ['type' => 'boolean', 'description' => 'True for already synced to CRM, false for unpushed leads'],
                        'limit' => ['type' => 'number', 'description' => 'Number of records to return (default 5, max 15)']
                    ]
                ]
            ],
            'get_lead_details' => [
                'name' => 'get_lead_details',
                'domain' => 'owner_intelligence',
                'description' => 'Fetches the complete 360 profile of an owner/lead from Supabase by lead_id, owner_id, or raw numeric ID.',
                'risk_level' => self::RISK_READ,
                'permission' => 'read:owners',
                'parameters' => [
                    'type' => 'object',
                    'properties' => [
                        'lead_id' => ['type' => 'string', 'description' => 'The lead or owner ID, or raw number (e.g. 1763175, LEAD-1763175, OWN-1763175)']
                    ],
                    'required' => ['lead_id']
                ]
            ],
            'export_owners_data' => [
                'name' => 'export_owners_data',
                'domain' => 'owner_intelligence',
                'description' => 'Generates a downloadable CSV dataset export of owner records filtered by community, building, or phone availability.',
                'risk_level' => self::RISK_WRITE,
                'permission' => 'export:owners',
                'parameters' => [
                    'type' => 'object',
                    'properties' => [
                        'area' => ['type' => 'string', 'description' => 'Master community filter'],
                        'building' => ['type' => 'string', 'description' => 'Building filter'],
                        'has_phone' => ['type' => 'boolean', 'description' => 'Only include owners with phones'],
                        'limit' => ['type' => 'number', 'description' => 'Max records to export (default 25, max 200)']
                    ]
                ]
            ],
            'update_owner_record' => [
                'name' => 'update_owner_record',
                'domain' => 'owner_intelligence',
                'description' => 'Updates owner/lead fields in Supabase such as normalized phone, email, assigned agent, or notes.',
                'risk_level' => self::RISK_HIGH_IMPACT,
                'permission' => 'write:owners',
                'parameters' => [
                    'type' => 'object',
                    'properties' => [
                        'lead_id' => ['type' => 'string', 'description' => 'The lead or owner ID to update'],
                        'phone' => ['type' => 'string', 'description' => 'Updated phone number'],
                        'email' => ['type' => 'string', 'description' => 'Updated email address'],
                        'assigned_agent' => ['type' => 'string', 'description' => 'Assigned broker name']
                    ],
                    'required' => ['lead_id']
                ]
            ],

            // --- 2. Buildings & Community Directory ---
            'search_buildings' => [
                'name' => 'search_buildings',
                'domain' => 'market_intelligence',
                'description' => 'Searches the building directory for properties across Dubai communities, total units, and phone coverage %.',
                'risk_level' => self::RISK_READ,
                'permission' => 'read:buildings',
                'parameters' => [
                    'type' => 'object',
                    'properties' => [
                        'query' => ['type' => 'string', 'description' => 'Building name search'],
                        'master_area' => ['type' => 'string', 'description' => 'Master community'],
                        'property_category' => ['type' => 'string', 'enum' => ['Residential', 'Commercial']],
                        'min_units' => ['type' => 'number', 'description' => 'Minimum unit count'],
                        'limit' => ['type' => 'number', 'description' => 'Max results (default 10)']
                    ]
                ]
            ],
            'get_building_360' => [
                'name' => 'get_building_360',
                'domain' => 'market_intelligence',
                'description' => 'Retrieves a full building dossier including units count, total owners, verified phone contacts, contact coverage %, and unit roster.',
                'risk_level' => self::RISK_READ,
                'permission' => 'read:buildings',
                'parameters' => [
                    'type' => 'object',
                    'properties' => [
                        'building_name' => ['type' => 'string', 'description' => 'Exact or partial building name']
                    ],
                    'required' => ['building_name']
                ]
            ],
            'get_community_overview' => [
                'name' => 'get_community_overview',
                'domain' => 'market_intelligence',
                'description' => 'Calculates community-wide stats (total buildings, total units, total contacts, contact coverage %) for a Dubai area.',
                'risk_level' => self::RISK_READ,
                'permission' => 'read:buildings',
                'parameters' => [
                    'type' => 'object',
                    'properties' => [
                        'community' => ['type' => 'string', 'description' => 'Community name (e.g. Business Bay, Dubai Marina, Downtown, JVC, Palm Jumeirah)']
                    ],
                    'required' => ['community']
                ]
            ],
            'get_market_statistics' => [
                'name' => 'get_market_statistics',
                'domain' => 'market_intelligence',
                'description' => 'Calculates real estate price averages, unit volumes, and price ranges in Supabase across verified title deeds.',
                'risk_level' => self::RISK_READ,
                'permission' => 'read:market',
                'parameters' => [
                    'type' => 'object',
                    'properties' => [
                        'area' => ['type' => 'string', 'description' => 'Community name (e.g. Business Bay, Downtown, Marina)'],
                        'bedrooms' => ['type' => 'number', 'description' => 'Optional bedroom filter']
                    ],
                    'required' => ['area']
                ]
            ],
            'omni_search' => [
                'name' => 'omni_search',
                'domain' => 'market_intelligence',
                'description' => 'Universal cross-entity search across owners, buildings, units, deeds, phone numbers, and listings in a single query.',
                'risk_level' => self::RISK_READ,
                'permission' => 'read:general',
                'parameters' => [
                    'type' => 'object',
                    'properties' => [
                        'query' => ['type' => 'string', 'description' => 'Keyword, phone, building, or reference number']
                    ],
                    'required' => ['query']
                ]
            ],

            // --- 3. CRM Operations (Bitrix24) ---
            'push_to_bitrix_crm' => [
                'name' => 'push_to_bitrix_crm',
                'domain' => 'crm_operations',
                'description' => 'Pushes a qualified lead into Bitrix24 CRM and tags the assigned agent.',
                'risk_level' => self::RISK_HIGH_IMPACT,
                'permission' => 'write:crm',
                'parameters' => [
                    'type' => 'object',
                    'properties' => [
                        'lead_id' => ['type' => 'string', 'description' => 'The lead ID to push'],
                        'assigned_agent' => ['type' => 'string', 'description' => 'Agent name (defaults to Melanie Simsiman)']
                    ],
                    'required' => ['lead_id']
                ]
            ],

            // --- 4. Listing Studio ---
            'list_property_listings' => [
                'name' => 'list_property_listings',
                'domain' => 'listing_operations',
                'description' => 'Lists property listings from the Listing Studio with status (completed, active, draft), reference numbers, and image counts.',
                'risk_level' => self::RISK_READ,
                'permission' => 'read:listings',
                'parameters' => [
                    'type' => 'object',
                    'properties' => [
                        'status' => ['type' => 'string', 'description' => 'Filter by status (all, completed, active, draft)'],
                        'property_type' => ['type' => 'string', 'description' => 'Apartment, Villa, Penthouse, etc.'],
                        'limit' => ['type' => 'number', 'description' => 'Max records (default 10)']
                    ]
                ]
            ],
            'get_listing_details' => [
                'name' => 'get_listing_details',
                'domain' => 'listing_operations',
                'description' => 'Fetches detailed info for a listing by ID or reference code.',
                'risk_level' => self::RISK_READ,
                'permission' => 'read:listings',
                'parameters' => [
                    'type' => 'object',
                    'properties' => [
                        'identifier' => ['type' => 'string', 'description' => 'Listing ID or reference code (e.g. ASQ-DAN-1025)']
                    ],
                    'required' => ['identifier']
                ]
            ],
            'create_property_listing' => [
                'name' => 'create_property_listing',
                'domain' => 'listing_operations',
                'description' => 'Creates a new property listing record in the Listing Studio.',
                'risk_level' => self::RISK_WRITE,
                'permission' => 'write:listings',
                'parameters' => [
                    'type' => 'object',
                    'properties' => [
                        'name' => ['type' => 'string', 'description' => 'Property title (e.g. Dania 1 Unit 1025)'],
                        'reference' => ['type' => 'string', 'description' => 'Unique reference code (e.g. ASQ-DAN-1025)'],
                        'property_type' => ['type' => 'string', 'description' => 'Apartment, Villa, Townhouse, Penthouse'],
                        'prompt' => ['type' => 'string', 'description' => 'AI marketing prompt or property notes'],
                        'status' => ['type' => 'string', 'description' => 'Status: completed, active, or draft']
                    ],
                    'required' => ['name']
                ]
            ],
            'update_listing_status' => [
                'name' => 'update_listing_status',
                'domain' => 'listing_operations',
                'description' => 'Updates the status of a property listing in the Listing Studio.',
                'risk_level' => self::RISK_HIGH_IMPACT,
                'permission' => 'write:listings',
                'parameters' => [
                    'type' => 'object',
                    'properties' => [
                        'identifier' => ['type' => 'string', 'description' => 'Listing ID or reference code'],
                        'status' => ['type' => 'string', 'enum' => ['completed', 'active', 'draft', 'archived'], 'description' => 'Target status']
                    ],
                    'required' => ['identifier', 'status']
                ]
            ],
            'generate_ai_listing_description' => [
                'name' => 'generate_ai_listing_description',
                'domain' => 'listing_operations',
                'description' => 'Generates high-converting luxury Dubai real estate marketing copy and descriptions for a listing.',
                'risk_level' => self::RISK_READ,
                'permission' => 'read:listings',
                'parameters' => [
                    'type' => 'object',
                    'properties' => [
                        'property_name' => ['type' => 'string', 'description' => 'Property name'],
                        'community' => ['type' => 'string', 'description' => 'Location / Community'],
                        'property_type' => ['type' => 'string', 'description' => 'Apartment, Villa, Penthouse'],
                        'bedrooms' => ['type' => 'number', 'description' => 'Bedroom count'],
                        'price_aed' => ['type' => 'string', 'description' => 'Price string (e.g. AED 2,500,000)'],
                        'features' => ['type' => 'string', 'description' => 'Key amenities and luxury highlights']
                    ],
                    'required' => ['property_name', 'community']
                ]
            ],

            // --- 5. Voice Telephony & Daily Audits ---
            'get_lead_call_intelligence' => [
                'name' => 'get_lead_call_intelligence',
                'domain' => 'voice_intelligence',
                'description' => 'Fetches recorded AI Voice Agent call transcript, executive summary, duration, and playable audio recording URL for a lead ID, phone number, or latest recorded call.',
                'risk_level' => self::RISK_READ,
                'permission' => 'read:voice',
                'parameters' => [
                    'type' => 'object',
                    'properties' => [
                        'lead_id' => ['type' => 'string', 'description' => 'The lead or owner ID (e.g. 89042, 1763175)'],
                        'phone' => ['type' => 'string', 'description' => 'Customer phone number (e.g. +971561757376)']
                    ]
                ]
            ],
            'list_call_logs' => [
                'name' => 'list_call_logs',
                'domain' => 'voice_intelligence',
                'description' => 'Lists recent AI voice telephony call logs with duration, status, and recording URLs.',
                'risk_level' => self::RISK_READ,
                'permission' => 'read:voice',
                'parameters' => [
                    'type' => 'object',
                    'properties' => [
                        'status' => ['type' => 'string', 'description' => 'Call status filter (e.g. interested, appointment, customer-ended-call)'],
                        'min_duration' => ['type' => 'number', 'description' => 'Minimum duration in seconds'],
                        'limit' => ['type' => 'number', 'description' => 'Max records to return (default 10)']
                    ]
                ]
            ],
            'get_voice_agent_analytics' => [
                'name' => 'get_voice_agent_analytics',
                'domain' => 'voice_intelligence',
                'description' => 'Calculates overall telephony performance: total calls, qualification rate, drop rate, average duration, and cost.',
                'risk_level' => self::RISK_READ,
                'permission' => 'read:voice',
                'parameters' => [
                    'type' => 'object',
                    'properties' => [
                        'scope' => ['type' => 'string', 'enum' => ['today', 'overall']]
                    ]
                ]
            ],
            'get_daily_audit_report' => [
                'name' => 'get_daily_audit_report',
                'domain' => 'voice_intelligence',
                'description' => 'Retrieves the official daily AI voice agent call audit report (PDF and telemetry) for a specific date or today/yesterday.',
                'risk_level' => self::RISK_READ,
                'permission' => 'read:voice',
                'parameters' => [
                    'type' => 'object',
                    'properties' => [
                        'date' => ['type' => 'string', 'description' => 'Target date in YYYY-MM-DD format (e.g. 2026-10-13, or "today", "yesterday")'],
                        'category' => ['type' => 'string', 'enum' => ['all', 'leads', 'drops', 'summary'], 'description' => 'Audit scope category']
                    ]
                ]
            ],

            // --- 6. Automation & Data Hygiene ---
            'list_workflows' => [
                'name' => 'list_workflows',
                'domain' => 'automation_operations',
                'description' => 'Lists all n8n automation pipelines with current active status, health, and execution metrics.',
                'risk_level' => self::RISK_READ,
                'permission' => 'read:workflows',
                'parameters' => [
                    'type' => 'object',
                    'properties' => [
                        'status' => ['type' => 'string', 'enum' => ['all', 'active', 'error'], 'description' => 'Filter by status']
                    ]
                ]
            ],
            'get_workflow_health' => [
                'name' => 'get_workflow_health',
                'domain' => 'automation_operations',
                'description' => 'Checks current n8n telemetry, error rates, and active background workflow status.',
                'risk_level' => self::RISK_READ,
                'permission' => 'read:workflows',
                'parameters' => [
                    'type' => 'object',
                    'properties' => [
                        'filter' => ['type' => 'string', 'enum' => ['all', 'errors', 'active']]
                    ]
                ]
            ],
            'trigger_workflow_execution' => [
                'name' => 'trigger_workflow_execution',
                'domain' => 'automation_operations',
                'description' => 'Triggers a manual execution of a specific n8n background automation workflow.',
                'risk_level' => self::RISK_HIGH_IMPACT,
                'permission' => 'write:workflows',
                'parameters' => [
                    'type' => 'object',
                    'properties' => [
                        'workflow_name' => ['type' => 'string', 'description' => 'Name or ID of workflow (e.g. "To master_leads", "Bitrix Sync")']
                    ],
                    'required' => ['workflow_name']
                ]
            ],
            'get_data_cleaning_metrics' => [
                'name' => 'get_data_cleaning_metrics',
                'domain' => 'automation_operations',
                'description' => 'Returns lead hygiene statistics: total leads cleaned, UAE phone numbers normalized, duplicate records merged, and quarantined errors.',
                'risk_level' => self::RISK_READ,
                'permission' => 'read:data',
                'parameters' => [
                    'type' => 'object',
                    'properties' => [
                        'scope' => ['type' => 'string', 'enum' => ['all', 'hygiene'], 'description' => 'Metric scope filter']
                    ]
                ]
            ],
            'normalize_phone_number' => [
                'name' => 'normalize_phone_number',
                'domain' => 'automation_operations',
                'description' => 'Validates and formats a raw phone number into standard UAE E.164 (+971) and identifies carrier (du, Etisalat, Virgin).',
                'risk_level' => self::RISK_READ,
                'permission' => 'read:data',
                'parameters' => [
                    'type' => 'object',
                    'properties' => [
                        'raw_phone' => ['type' => 'string', 'description' => 'Raw phone number to format']
                    ],
                    'required' => ['raw_phone']
                ]
            ],
            'query_data_catalog' => [
                'name' => 'query_data_catalog',
                'domain' => 'automation_operations',
                'description' => 'Searches the Data Library catalog of 1,382 ingested source files to check processing status, accepted rows, and quarantined errors.',
                'risk_level' => self::RISK_READ,
                'permission' => 'read:data',
                'parameters' => [
                    'type' => 'object',
                    'properties' => [
                        'search' => ['type' => 'string', 'description' => 'Filename keyword'],
                        'status' => ['type' => 'string', 'enum' => ['all', 'processed', 'duplicate']]
                    ]
                ]
            ],
            'navigate_dashboard' => [
                'name' => 'navigate_dashboard',
                'domain' => 'shared_utility',
                'description' => 'Switches the user dashboard tab and applies search filters.',
                'risk_level' => self::RISK_READ,
                'permission' => 'read:general',
                'parameters' => [
                    'type' => 'object',
                    'properties' => [
                        'tab' => ['type' => 'string', 'enum' => ['overview', 'owners', 'buildings', 'search', 'workflows', 'sources', 'leads', 'listing', 'voice', 'agent', 'activity', 'settings']],
                        'filters' => ['type' => 'object', 'description' => 'Optional prefilled filters']
                    ],
                    'required' => ['tab']
                ]
            ]
        ];
    }

    public static function getTool(string $name): ?array {
        $reg = self::getRegistry();
        return $reg[$name] ?? null;
    }

    public static function getOpenAiSchemas(array $toolNames): array {
        $reg = self::getRegistry();
        $schemas = [];
        foreach ($toolNames as $name) {
            if (isset($reg[$name])) {
                $tool = $reg[$name];
                $schemas[] = [
                    'type' => 'function',
                    'function' => [
                        'name' => $tool['name'],
                        'description' => $tool['description'],
                        'parameters' => $tool['parameters']
                    ]
                ];
            }
        }
        return $schemas;
    }
}
