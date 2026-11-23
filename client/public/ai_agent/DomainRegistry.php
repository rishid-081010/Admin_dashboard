<?php
// ai_agent/DomainRegistry.php
// Predefined Capability Domains for A Squared Real Estate AI Orchestrator

class DomainRegistry {
    public static function getDomains(): array {
        return [
            'owner_intelligence' => [
                'name' => 'Owner & Lead Intelligence',
                'description' => 'Query verified Dubai property owners, title deeds, phone numbers, and CSV exports.',
                'keywords' => [
                    'owner', 'owners', 'lead', 'leads', 'phone', 'phones', 'number', 'numbers',
                    'contact', 'contacts', 'unit', 'units', 'export', 'csv', 'dataset', 'download',
                    'uncontacted', 'purchaser', 'landlord', 'profile', 'investor'
                ],
                'tools' => ['search_owners', 'get_lead_details', 'export_owners_data', 'update_owner_record']
            ],
            'market_intelligence' => [
                'name' => 'Market & Building Intelligence',
                'description' => 'Real estate pricing analytics, DLD community statistics, building 360 dossiers, and OmniSearch.',
                'keywords' => [
                    'building', 'buildings', 'community', 'communities', 'area', 'master area',
                    'marina', 'business bay', 'downtown', 'jvc', 'palm', 'palm jumeirah', 'dubai hills',
                    'jlt', 'difc', 'burj khalifa', 'price', 'pricing', 'average', 'sqft', 'market',
                    'statistics', 'stats', 'transaction', 'transactions', 'omni', 'omnisearch', 'coverage'
                ],
                'tools' => ['search_buildings', 'get_building_360', 'get_community_overview', 'get_market_statistics', 'omni_search']
            ],
            'crm_operations' => [
                'name' => 'CRM Operations (Bitrix24)',
                'description' => 'Lead ingestion, broker assignment, and Bitrix24 CRM pipeline synchronizations.',
                'keywords' => [
                    'crm', 'bitrix', 'bitrix24', 'push', 'sync', 'assign', 'assigned', 'agent',
                    'broker', 'pipeline', 'deal', 'stage', 'melanie', 'vikram'
                ],
                'tools' => ['push_to_bitrix_crm']
            ],
            'listing_operations' => [
                'name' => 'Listing Studio & Marketing Content',
                'description' => 'Property listings management, status updates, and AI copywriting.',
                'keywords' => [
                    'listing', 'listings', 'studio', 'property', 'properties', 'apartment', 'villa',
                    'penthouse', 'townhouse', 'description', 'marketing', 'copy', 'brochure', 'status',
                    'create listing', 'new listing', 'reference'
                ],
                'tools' => ['list_property_listings', 'get_listing_details', 'create_property_listing', 'update_listing_status', 'generate_ai_listing_description']
            ],
            'voice_intelligence' => [
                'name' => 'AI Voice Telephony & Daily Audits',
                'description' => 'Vapi telephony call logs, audio recordings, transcripts, executive summaries, and official daily audit PDFs.',
                'keywords' => [
                    'voice', 'call', 'calls', 'recording', 'recordings', 'audio', 'wav', 'transcript',
                    'transcripts', 'telephony', 'vapi', 'audit', 'daily audit', 'pdf', 'dialer',
                    'drop', 'qualified', 'duration', 'interested', 'appointment'
                ],
                'tools' => ['get_lead_call_intelligence', 'list_call_logs', 'get_voice_agent_analytics', 'get_daily_audit_report']
            ],
            'automation_operations' => [
                'name' => 'Automation & Data Hygiene',
                'description' => 'n8n automation health, workflow execution, UAE phone normalization, and data library files.',
                'keywords' => [
                    'n8n', 'workflow', 'workflows', 'pipeline', 'pipelines', 'automation', 'health',
                    'error', 'errors', 'trigger', 'clean', 'cleaning', 'hygiene', 'normalize',
                    'e164', 'carrier', 'etisalat', 'du', 'catalog', 'library', 'source', 'parquet'
                ],
                'tools' => ['list_workflows', 'get_workflow_health', 'trigger_workflow_execution', 'get_data_cleaning_metrics', 'normalize_phone_number', 'query_data_catalog']
            ]
        ];
    }

    public static function route(string $userQuery): array {
        $q = strtolower($userQuery);
        $domains = self::getDomains();
        $matchedDomains = [];
        $matchedTools = ['navigate_dashboard']; // shared utility always available

        foreach ($domains as $domainKey => $domain) {
            $score = 0;
            foreach ($domain['keywords'] as $kw) {
                if (stripos($q, $kw) !== false) {
                    $score += 1;
                }
            }
            if ($score > 0) {
                $matchedDomains[$domainKey] = $score;
                foreach ($domain['tools'] as $tool) {
                    $matchedTools[] = $tool;
                }
            }
        }

        // If no specific domain matched, default to owner + market + voice as primary core
        if (empty($matchedDomains)) {
            $matchedDomains['owner_intelligence'] = 1;
            $matchedDomains['market_intelligence'] = 1;
            $matchedTools = array_merge(
                $matchedTools,
                $domains['owner_intelligence']['tools'],
                $domains['market_intelligence']['tools'],
                ['get_lead_call_intelligence']
            );
        }

        return [
            'domains' => array_keys($matchedDomains),
            'tools' => array_values(array_unique($matchedTools))
        ];
    }
}
