<?php
/**
 * A SQUARED REAL ESTATE - Multi-Channel AI Copywriting Engine (API Route)
 * Model: OpenAI GPT-4o (Frontier Luxury Real Estate Copywriting)
 * Formats: Signature A Squared Editorial, WhatsApp Broadcast, Instagram, VIP Investor Pitch, Arabic & Russian.
 */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, apikey, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

ini_set('display_errors', 0);
ini_set('max_execution_time', 120);
set_time_limit(120);

$secretsFile = __DIR__ . '/secrets.php';
if (file_exists($secretsFile)) {
    require_once $secretsFile;
}

$openAiKey = defined('OPENAI_API_KEY') ? OPENAI_API_KEY : (getenv('OPENAI_API_KEY') ?: base64_decode('c2stcHJvai15V3ZJZ2c4WmEtbDg3c2hEQkc0czhrTUxLbW0zbjdHdXZNZ0dibGxyVl9JWmVnTnJyTHh1U0VpTnRWSGtmQmNkNVNYNnhtSjUzUFQzQmxia0ZKcmlXVkVzVmFyU2s0X3ZuY1lEZlhQMGQ2TUxXWEpmcVJxUXBlU0dfODczcW1ld0hEUkpENHdGazBXMEl6ZnAwVEFXMmZOQXJnMEE='));

if (empty($openAiKey)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'OpenAI API key not configured']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    echo json_encode([
        'status' => 'online',
        'service' => 'A Squared AI Copywriting Engine',
        'model' => 'gpt-4o',
        'timestamp' => gmdate('c')
    ]);
    exit;
}

$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true) ?: [];

$name = trim($data['name'] ?? 'Luxury Dubai Residence');
$reference = trim($data['reference'] ?? 'ASQ-PROP');
$property_type = trim($data['property_type'] ?? 'Apartment');
$purpose = trim($data['purpose'] ?? 'For Sale');
$price = trim((string)($data['price'] ?? ''));
$bedrooms = trim((string)($data['bedrooms'] ?? ''));
$bathrooms = trim((string)($data['bathrooms'] ?? ''));
$size_sqft = trim((string)($data['size_sqft'] ?? ''));
$furnishing = trim((string)($data['furnishing'] ?? 'Unfurnished'));
$floor = trim((string)($data['floor'] ?? ''));
$building = trim((string)($data['building'] ?? ''));
$community = trim((string)($data['community'] ?? ''));
$usage = trim((string)($data['usage'] ?? 'Residential (as per property record)'));
$rough_notes = trim((string)($data['rough_notes'] ?? ''));
$tone = trim((string)($data['tone'] ?? 'luxury'));

// Derive building and community from name if not provided
if (empty($building)) {
    if (preg_match('/^(.*?)(?:\s+(?:Unit|Apt|Villa|Townhouse|#|—|-)\s*|\s*—\s*)/i', $name, $bm)) {
        $building = trim($bm[1]);
    } else {
        $building = $name;
    }
}
if (empty($community)) {
    if (preg_match('/(?:—|-)\s*([^—\n]+)$/i', $name, $cm)) {
        $community = trim($cm[1]);
    } else {
        $community = 'Dubai';
    }
}

// Compute square meters from square feet if needed
$size_sqm = '';
if (!empty($size_sqft) && is_numeric(str_replace(',', '', $size_sqft))) {
    $numSqft = floatval(str_replace(',', '', $size_sqft));
    $size_sqm = round($numSqft / 10.7639, 2);
}

$isRental = (stripos($purpose, 'rent') !== false || stripos($purpose, 'lease') !== false);
$rentOrSale = $isRental ? 'rent' : 'sale';
$priceBulletLabel = $isRental ? 'Annual rent' : 'Selling price';

// Formatted Price String
$formattedPrice = $price;
if (is_numeric(str_replace(',', '', $price))) {
    $formattedPrice = number_format(floatval(str_replace(',', '', $price)));
}

$systemPrompt = "You are the Executive Real Estate Copywriter for A SQUARED REAL ESTATE in Dubai.
Your mission is to generate clean, authoritative, and elegant property marketing copy that adheres STRICTLY to A SQUARED REAL ESTATE's signature standard.

SIGNATURE \"portal_description\" FORMAT:
You MUST follow this exact 5-part structure and tone:

A Squared Real Estate proudly presents this [spacious / stunning] [property type] for $rentOrSale in [Community / Building].

Offering approximately [Size in Sq. Ft.] sq. ft., this home features [Bedrooms] bedrooms and [Bathrooms] bathrooms, with a practical layout suited to comfortable everyday living.

Property Highlights
- [Bedrooms] bedrooms
- [Bathrooms] bathrooms
- Approx. [Size in Sq. Ft.] sq. ft.
- Located in [Community, Sub-community / Building]
- $priceBulletLabel: AED [Formatted Price]

Enjoy [property type] living in [Community], with convenient access to destinations across Dubai.

Contact A Squared Real Estate to arrange a viewing or request further details.

REFERENCE STANDARD EXAMPLE:
A Squared Real Estate proudly presents this spacious townhouse for rent in Jebel Ali Village.

Offering approximately 2,561.81 sq. ft., this home features 3 bedrooms and 4 bathrooms, with a practical layout suited to comfortable everyday living.

Property Highlights
- 3 bedrooms
- 4 bathrooms
- Approx. 2,561.81 sq. ft.
- Located in Jebel Ali Village, Jebel Ali First
- Annual rent: AED 220,000

Enjoy townhouse living in Jebel Ali Village, with convenient access to destinations across Dubai.

Contact A Squared Real Estate to arrange a viewing or request further details.

CRITICAL RULES:
1. Strictly follow the exact 5-part structure:
   - Part 1: 'A Squared Real Estate proudly presents this [adjective] [property type] for $rentOrSale in [Community / Building].'
   - Part 2: 'Offering approximately [Size] sq. ft., this home features [X] bedrooms and [Y] bathrooms, with a practical layout suited to comfortable everyday living.' (If studio: adapt to 'Offering approximately [Size] sq. ft., this studio features 1 bathroom, with a practical layout suited to comfortable everyday living.').
   - Part 3: Header 'Property Highlights' followed immediately by clean hyphen bullets (-):
     - [X] bedrooms
     - [Y] bathrooms
     - Approx. [Size] sq. ft.
     - Located in [Community, Sub-community / Building]
     - $priceBulletLabel: AED [Formatted Price]
     (If additional verified attributes like Furnished/Unfurnished or Covered Parking are in input, up to 2 extra clean bullets may be included).
   - Part 4: 'Enjoy [property type] living in [Community], with convenient access to destinations across Dubai.'
   - Part 5: 'Contact A Squared Real Estate to arrange a viewing or request further details.'
2. NO cheesy emojis (no 🏊, 🏠, ✨, 🏢, 🔑) in portal_description. Use clean hyphens (-) for bullets.
3. Keep the language natural, professional, direct, and completely free from exaggerated marketing hype.
4. Return strictly valid JSON with these 7 keys:
{
  \"portal_title\": \"String (Under 80 characters, e.g. '3 BR Townhouse for Rent | Jebel Ali Village | AED 220,000')\",
  \"portal_description\": \"String (The exact signature 5-part A SQUARED format shown above)\",
  \"whatsapp_copy\": \"String (High-impact WhatsApp broker broadcast formatted with bold * tags and clean bullets)\",
  \"instagram_copy\": \"String (Refined Instagram caption matching the exact highlights and top Dubai real estate hashtags)\",
  \"investor_email\": \"String (VIP Investor Pitch: Subject line + investment thesis + viewing CTA)\",
  \"arabic_summary\": \"String (Formal Arabic real estate description matching the exact property details and 5-part structure)\",
  \"russian_summary\": \"String (High-end Russian real estate description matching the exact property details and 5-part structure)\"
}";

$userPrompt = "Generate A Squared Real Estate marketing copy for:
Building Name: $building
Full Property Name: $name
Reference: $reference
Location / Community: $community
Property Type: $property_type
Floor: " . ($floor ?: 'High Floor') . "
Purpose: $purpose
Price: " . ($formattedPrice ? "AED $formattedPrice" : "Price on Application") . "
Size: " . ($size_sqm ? "$size_sqm Sq. M. / " : "") . ($size_sqft ? "$size_sqft Sq. Ft." : "N/A") . "
Bedrooms: $bedrooms
Bathrooms: $bathrooms
Furnishing: $furnishing
Usage: $usage
Additional Details & Notes: $rough_notes
";

$payload = [
    'model' => 'gpt-4o',
    'messages' => [
        ['role' => 'system', 'content' => $systemPrompt],
        ['role' => 'user', 'content' => $userPrompt]
    ],
    'response_format' => ['type' => 'json_object'],
    'temperature' => 0.3
];

$ch = curl_init('https://api.openai.com/v1/chat/completions');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Authorization: Bearer ' . $openAiKey
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
curl_setopt($ch, CURLOPT_TIMEOUT, 60);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlErr = curl_error($ch);
curl_close($ch);

if ($httpCode !== 200 || empty($response)) {
    http_response_code(502);
    echo json_encode([
        'success' => false,
        'error' => 'OpenAI API returned HTTP ' . $httpCode,
        'details' => $response ?: $curlErr
    ]);
    exit;
}

$openAiData = json_decode($response, true);
$content = $openAiData['choices'][0]['message']['content'] ?? '{}';
$copy = json_decode($content, true) ?: [];

echo json_encode([
    'success' => true,
    'model' => 'gpt-4o',
    'copyData' => [
        'portal_title' => $copy['portal_title'] ?? "$building | $community | AED $formattedPrice",
        'portal_description' => $copy['portal_description'] ?? "",
        'whatsapp_copy' => $copy['whatsapp_copy'] ?? "",
        'instagram_copy' => $copy['instagram_copy'] ?? "",
        'investor_email' => $copy['investor_email'] ?? "",
        'arabic_summary' => $copy['arabic_summary'] ?? "",
        'russian_summary' => $copy['russian_summary'] ?? ""
    ]
]);
