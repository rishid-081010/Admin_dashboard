<?php
// Hostinger Server-Side AI Agent Gateway (Orchestrated Architecture)
// Powered by Antigravity OS Capability Engine for A-Squared Real Estate

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-OpenAI-Key');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// 1. Support Reconnection / Status Retrieval (Acceptance Test 6)
if ($_SERVER['REQUEST_METHOD'] === 'GET' || isset($_GET['action'])) {
    $action = $_GET['action'] ?? 'status';
    $execId = $_GET['id'] ?? ($_GET['execution_id'] ?? null);
    
    if ($action === 'status' && !empty($execId)) {
        // Sanitize ID
        $cleanId = preg_replace('/[^a-zA-Z0-9_-]/', '', $execId);
        $file = __DIR__ . "/ai_agent/storage/executions/{$cleanId}.json";
        if (file_exists($file)) {
            echo file_get_contents($file);
            exit;
        } else {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => "Execution {$cleanId} not found."]);
            exit;
        }
    }
}

require_once __DIR__ . '/ai_agent/Orchestrator.php';

$rawInput = file_get_contents('php://input');
$payload = json_decode($rawInput, true) ?: [];

$messages = $payload['messages'] ?? [];
$context = $payload['context'] ?? [];

// API Key extraction hierarchy:
// 1. Explicit Groq or OpenAI key from request payload / header
// 2. Server environment variable
// 3. Fallback configured key inside Orchestrator
$groqKey = $payload['groq_key'] 
    ?? ($_SERVER['HTTP_X_GROQ_KEY'] ?? null)
    ?: (getenv('GROQ_API_KEY') ?: null);

$openAiKey = $payload['openai_key'] 
    ?? ($_SERVER['HTTP_X_OPENAI_KEY'] ?? null)
    ?: (getenv('OPENAI_API_KEY') ?: null);

$apiKey = $groqKey ?: $openAiKey;
$customModel = $payload['model'] ?? null;

try {
    $orchestrator = new Orchestrator($apiKey, $customModel);
    $result = $orchestrator->processRequest($messages, $context);
    echo json_encode($result);
} catch (\Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'message' => "AI Orchestrator encountered an exception: " . $e->getMessage(),
        'pipeline_events' => [
            ['step' => 'execution', 'status' => 'failed', 'title' => 'System Exception', 'detail' => $e->getMessage()]
        ]
    ]);
}
