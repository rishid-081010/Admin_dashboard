<?php
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, apikey, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method Not Allowed']);
    exit;
}

@set_time_limit(120);

$secretsFile = __DIR__ . '/secrets.php';
if (file_exists($secretsFile)) {
    require_once $secretsFile;
}

$openaiApiKey = defined('OPENAI_API_KEY') ? OPENAI_API_KEY : (getenv('OPENAI_API_KEY') ?: '');

$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true);

if (!$data) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid JSON input']);
    exit;
}

$name = $data['name'] ?? 'Luxury Dubai Residence';
$reference = $data['reference'] ?? 'ASQ-PROP';
$property_type = $data['property_type'] ?? 'Apartment';
$purpose = $data['purpose'] ?? 'For Sale';
$price = $data['price'] ?? '';
$bedrooms = $data['bedrooms'] ?? '';
$bathrooms = $data['bathrooms'] ?? '';
$size_sqft = $data['size_sqft'] ?? '';
$furnishing = $data['furnishing'] ?? 'Unfurnished';
$rough_notes = $data['rough_notes'] ?? '';
$tone = $data['tone'] ?? 'luxury';

$tonePrompts = [
    'luxury' => 'Prestigious, refined, and authoritative luxury editorial tone tailored for high-net-worth buyers in prime Dubai communities. Focus on architectural elegance, unobstructed vistas, and bespoke finishes.',
    'investor_roi' => 'Data-driven, analytical, and yield-focused tone highlighting high rental yields, capital appreciation potential, prime tenant demand, and low service charge efficiency.',
    'fast_deal' => 'High-urgency, hot-deal market positioning highlighting turnkey readiness, vacant on transfer status, and exclusive pricing.'
];

$toneGuideline = $tonePrompts[$tone] ?? $tonePrompts['luxury'];

$systemPrompt = "You are the Lead Real Estate Copywriter & Multi-Channel Marketing Specialist for A SQUARED REAL ESTATE in Dubai.
Produce authoritative property marketing assets across 5 channels (Bayut/Property Finder, WhatsApp, Instagram, VIP Investor, Arabic, and Russian).

TONE: $toneGuideline

STRICT WORD CHOICE RULES:
- BANNED CLICHÉS (DO NOT USE): 'Nestled in the heart of', 'boasts stunning views', 'look no further', 'rare gem', 'sought-after sanctuary', 'a testament to luxury', 'step into a world of'.
- REQUIRED VOCABULARY: 'Panoramic vistas', 'Floor-to-ceiling glazing', 'Expansive floorplan', 'Seamless indoor-outdoor flow', 'Bespoke cabinetry', 'Vacant on transfer', 'Turnkey condition', 'Sun-drenched interiors', 'Chiller free', 'En-suite bathrooms'.

PORTAL SEO RULES:
- Title must be under 80 characters for mobile display on Bayut and Property Finder apps.
- Format: [Bedrooms + Type] | [Building Name] | [Top View or Feature] | [Status]
  (Example: 'Luxury 2BR | Marina Gate 2 | Full Marina View | Vacant on Transfer')

5-PART DESCRIPTION ARCHITECTURE:
1. ✨ Executive Overview (1-2 sentences on value and view)
2. 🏠 Property Specifications (Bulleted list: Type, BUA, Bedrooms, En-suites, Parking, Chiller/Furnishing)
3. 🏢 Interior Highlights & Layout (Bulleted list of finishes, kitchen, terrace, glazing)
4. 🏊 World-Class Building Amenities (Bulleted list: Pool, gym, concierge, security, valet)
5. 📞 Private Viewings (Authoritative CTA with A SQUARED REAL ESTATE)

OUTPUT FORMAT:
Return strictly valid JSON with these exact keys:
{
  \"portal_title\": \"...\",
  \"portal_description\": \"...\",
  \"whatsapp_copy\": \"...\",
  \"instagram_copy\": \"...\",
  \"investor_email\": \"...\",
  \"arabic_summary\": \"...\",
  \"russian_summary\": \"...\"
}";

$userPrompt = "Property Name: $name\nReference: $reference\nType: $property_type\nPurpose: $purpose\nPrice: " . ($price ? "$price AED" : "Price on Application") . "\nBedrooms: $bedrooms\nBathrooms: $bathrooms\nArea: " . ($size_sqft ? "$size_sqft sq.ft." : "N/A") . "\nFurnishing: $furnishing\nNotes: $rough_notes";

try {
    $url = 'https://api.openai.com/v1/chat/completions';
    $payload = [
        'model' => 'gpt-4o',
        'messages' => [
            ['role' => 'system', 'content' => $systemPrompt],
            ['role' => 'user', 'content' => $userPrompt]
        ],
        'response_format' => ['type' => 'json_object'],
        'temperature' => 0.4
    ];

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $openaiApiKey
    ]);
    curl_setopt($ch, CURLOPT_TIMEOUT, 60);

    $response = curl_exec($ch);
    $err = curl_error($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($err || $httpCode >= 400) {
        throw new Exception("OpenAI API error ($httpCode): " . ($err ?: $response));
    }

    $json = json_decode($response, true);
    $content = $json['choices'][0]['message']['content'] ?? '{}';
    $copy = json_decode($content, true);

    echo json_encode([
        'success' => true,
        'copyData' => [
            'portal_title' => $copy['portal_title'] ?? "$name | Prime Dubai Real Estate",
            'portal_description' => $copy['portal_description'] ?? "Executive property overview coming soon.",
            'whatsapp_copy' => $copy['whatsapp_copy'] ?? "Exclusive listing in $name. Contact A SQUARED for viewings.",
            'instagram_copy' => $copy['instagram_copy'] ?? "✨ Luxury Living at $name. Contact @asquaredrealestate.",
            'investor_email' => $copy['investor_email'] ?? "Prime opportunity at $name. Request yields and private tour.",
            'arabic_summary' => $copy['arabic_summary'] ?? "فرصة استثمارية مميزة في $name، دبي. تواصل مع إيه سكويرد للعقارات.",
            'russian_summary' => $copy['russian_summary'] ?? "Премиальная недвижимость в $name, Дубай. Свяжитесь с A SQUARED REAL ESTATE."
        ]
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
