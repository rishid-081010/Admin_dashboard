<?php
/**
 * A SQUARED REAL ESTATE - Multi-Channel AI Copywriting Engine
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

// OpenAI API Key
$openAiKey = getenv('OPENAI_API_KEY') ?: base64_decode('c2stcHJvai15V3ZJZ2c4WmEtbDg3c2hEQkc0czhrTUxLbW0zbjdHdXZNZ0dibGxyVl9JWmVnTnJyTHh1U0VpTnRWSGtmQmNkNVNYNnhtSjUzUFQzQmxia0ZKcmlXVkVzVmFyU2s0X3ZuY1lEZlhQMGQ2TUxXWEpmcVJxUXBlU0dfODczcW1ld0hEUkpENHdGazBXMEl6ZnAwVEFXMmZOQXJnMEE=');

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
$priceLabel = $isRental ? 'Rental Price' : 'Selling Price';
$askingPriceLabel = $isRental ? 'Rental Price' : 'Asking Price';
$actionVerb = $isRental ? 'lease' : 'own';
$opportunitySectionHeader = $isRental ? 'Lifestyle & Residence' : 'Investment Opportunity';

// Formatted Price String
$formattedPrice = $price;
if (is_numeric(str_replace(',', '', $price))) {
    $formattedPrice = number_format(floatval(str_replace(',', '', $price)));
}

$systemPrompt = "You are the Executive Real Estate Copywriter for A SQUARED REAL ESTATE in Dubai.
Your mission is to generate prestigious, authoritative property marketing copy that adheres STRICTLY to the signature A SQUARED editorial format.

SIGNATURE \"portal_description\" FORMAT (MANDATORY EXACT STRUCTURE):

A Squared Real Estate proudly presents an exclusive opportunity to $actionVerb a [unit / property type] in the iconic [Building Name], located in [the heart of / prime] [Location / Community], one of Dubai's most prestigious and sought-after destinations.

Positioned on the [Floor / e.g. 36th Floor / high floor], this property offers an opportunity to invest in a landmark development known for its striking architecture, prestigious address, and exceptional location.

Property Details
- Building: [Building Name]
- Location: [Community], Dubai
- Property Type: [Property Type]
- Floor: [Floor / Level]
- Size: [Size in Sq. M.] Sq. M. (Approx. [Size in Sq. Ft.] Sq. Ft.)
- $priceLabel: AED [Formatted Price]
- Usage: Residential (as per property record)
[Optional specs if available from input:
- Bedrooms: ...
- Bathrooms: ...
- Furnishing: ...
- Parking: ...
- Status: ...]

Location Highlights
- Prime location in [Community]
- Close to [Prominent nearby walkway, waterfront, or landmark, e.g. Dubai Marina Walk / Burj Khalifa / Canal]
- Convenient access to [Sheikh Zayed Road / Al Khail Road / major artery]
- Near [Key Mall or shopping destination, e.g. Dubai Marina Mall / Mall of the Emirates]
- Easy access to beaches, restaurants, and entertainment destinations
- Situated in one of Dubai's most recognizable waterfront / urban communities

$opportunitySectionHeader

[Building Name] is an architectural landmark in [Community], offering a prestigious address in a highly desirable location.

Whether you are seeking a distinctive real estate investment or an asset in one of Dubai's iconic developments, this property presents an opportunity worth exploring.

$askingPriceLabel: AED [Formatted Price]" . ($isRental ? " / Year" : "") . "

Contact A Squared Real Estate today for more information, property details, and viewing arrangements.

CRITICAL RULES:
1. Do NOT use cheesy bullet emojis (no 🏊, 🏠, ✨, 🏢) in the portal description. Use clean hyphens (-) exactly as demonstrated.
2. In the Property Details section, format size as: [Sq. M.] Sq. M. (Approx. [Sq. Ft.] Sq. Ft.).
3. Maintain the exact section titles: 'Property Details', 'Location Highlights', '$opportunitySectionHeader', '$askingPriceLabel: AED ...', and the closing 'Contact A Squared Real Estate today...'.
4. Do NOT invent fake amenities not implied by the community and property notes.
5. Return strictly valid JSON with these 7 keys:
{
  \"portal_title\": \"String (Under 80 characters, e.g. 'Ciel Tower | 36th Floor Unit | Dubai Marina | AED 2,000,000')\",
  \"portal_description\": \"String (The exact signature A SQUARED format shown above)\",
  \"whatsapp_copy\": \"String (High-impact WhatsApp broker broadcast formatted with bold * tags and clean contact details)\",
  \"instagram_copy\": \"String (Refined Instagram caption with luxury hook, key highlights, and top Dubai real estate hashtags)\",
  \"investor_email\": \"String (VIP Investor Pitch: Subject line + investment thesis + viewing CTA)\",
  \"arabic_summary\": \"String (Formal Arabic real estate description matching the exact property details)\",
  \"russian_summary\": \"String (High-end Russian real estate description matching the exact property details)\"
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
