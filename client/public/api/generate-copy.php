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
if (file_exists(__DIR__ . '/api/secrets.php')) {
    require_once __DIR__ . '/api/secrets.php';
} elseif (file_exists(__DIR__ . '/secrets.php')) {
    require_once __DIR__ . '/secrets.php';
} elseif (file_exists(dirname(__DIR__) . '/api/secrets.php')) {
    require_once dirname(__DIR__) . '/api/secrets.php';
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
        'model' => 'gpt-4o-mini',
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

// Clean community/building if it contains OCR artifacts like الهوية (Identity card header)
if ($community === 'الهوية' || strpos($community, 'الهوية') !== false) {
    $community = 'Dubai';
}
if ($building === 'الهوية' || strpos($building, 'الهوية') !== false) {
    $building = 'Dubai Residence';
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

$displayFloor = !empty($floor) ? $floor : 'High Floor';
$displayPrice = !empty($formattedPrice) ? ("AED " . $formattedPrice) : "Price on Application / Available upon Request";
$displaySize = "";
if (!empty($size_sqm)) {
    $displaySize .= "$size_sqm Sq. M. / ";
}
if (!empty($size_sqft)) {
    $displaySize .= "$size_sqft Sq. Ft.";
} else {
    $displaySize = "Generously proportioned floor plan (exact specifications upon request)";
}

$systemPrompt = <<<EOT
You are the Principal Luxury Copywriter & Editorial Director for A SQUARED REAL ESTATE, Dubai's premier boutique real estate advisory.
Your mission is to produce authoritative, evocative, and deeply detailed property descriptions that appeal to sophisticated high-net-worth buyers, discerning tenants, and international investors.

CRITICAL MANDATORY LENGTH REQUIREMENT:
- The 'portal_description' MUST CONTAIN A MINIMUM OF 750 WORDS (strictly between 750 and 1,000 words; absolutely never below 700 words).
- Every section must be composed in rich, expansive, multi-sentence paragraphs describing materials (imported Italian marble, engineered timber, brushed nickel hardware), aesthetics, natural lighting, spatial flow, and lifestyle nuances in exquisite detail. Never rush or condense paragraphs.
- If your draft is brief, expand upon the specific architectural finishes, bathroom fittings, acoustic insulation, neighborhood lifestyle, and travel times across Dubai until it comfortably exceeds 750 words.

STRUCTURE & HIGH NARRATIVE VARIABILITY:
Maintain a consistent, logical editorial structure across all listings, but ENSURE HIGH VARIABILITY in syntax, phrasing, opening sentences, and descriptive vocabulary. NEVER repeat the exact same cookie-cutter sentences from listing to listing (e.g. avoid repeating 'A Squared Real Estate proudly presents this stunning...' in every description).

THE 9-PART EDITORIAL STRUCTURE FOR 'portal_description':

1. Executive Presentation & Grand Welcome (approx. 100-120 words)
   - Vary the introductory hook dynamically across generations (e.g., 'A Squared Real Estate is delighted to introduce...', 'Setting a distinguished benchmark for contemporary urban luxury, A Squared Real Estate unveils...', 'Exclusively brought to the market by A Squared Real Estate, this exceptional residence...', 'Positioned prominently within [Community], this remarkable property exemplifies...', 'A Squared Real Estate is pleased to present this meticulously curated home...').
   - Establish the property type, tenure ($rentOrSale), floor level/setting, and unique lifestyle positioning. Frame the home within the context of Dubai's vibrant luxury landscape and prestige.

2. The Residence & Architectural Flow (2 substantial paragraphs, approx. 160-200 words)
   - Paragraph 1: Detail the spatial layout, floor plan fluidity, orientation, and natural daylighting cascading through expansive floor-to-ceiling double-glazed glass apertures.
   - Paragraph 2: Describe the architectural journey from the private entrance gallery into the sprawling open-plan living and dining salons. Discuss the harmonious interplay of proportions, high ceilings, acoustic tranquility, and seamless flow that makes everyday living effortlessly luxurious.
   - DATA INTEGRITY: If size is missing or 'N/A', NEVER write 'N/A sq. ft.'! Instead, eloquently describe the home as boasting expansive, thoughtfully planned proportions designed for optimal spatial efficiency and gracious entertaining.

3. The Master Suite & Private Quarters (2 substantial paragraphs, approx. 150-180 words)
   - Paragraph 1: Explore the primary bedroom suite: a private sanctuary designed for restful seclusion, complete with custom floor-to-ceiling built-in wardrobes or walk-in dressing quarters with soft interior illumination. Detail the en-suite spa bathroom featuring modern designer sanitary ware, frameless walk-in rain shower, deep soaking tub, and polished stone surfaces.
   - Paragraph 2: Describe secondary bedrooms with equal elegance, highlighting their generous dimensions, acoustic separation, versatility as executive study suites or guest accommodation, and accompanying powder rooms.

4. Culinary Craftsmanship & Entertaining Spaces (approx. 130-160 words)
   - Highlight the kitchen design (open concept show kitchen or refined chef's preparation space, polished stone or quartz countertops, premium custom soft-close cabinetry, and seamless appliance integration).
   - Describe the dining salon, lounge zones, and indoor-outdoor connectivity onto the private balcony or panoramic terrace where residents can dine al fresco while admiring the city skyline.

5. Curated Property Specifications & Highlights (Structured Bulleted Section)
   Include the exact heading 'Property Specifications & Highlights' followed immediately by clean hyphen bullets (-):
   - Property Type & Classification
   - Bedrooms & Bathrooms: [X] Bedrooms | [Y] Bathrooms
   - Built-Up Area: [Size in Sq. Ft. / Sq. M. or 'Generously Proportioned Layout']
   - Prime Location: [Community / Building, Dubai]
   - $priceBulletLabel: [AED Formatted Price or 'Price on Application / Available upon Request']
   - Furnishing Status: [Furnished / Unfurnished]
   - Parking Allocation: [Allocated Covered Parking]
   - Floor & Orientation: [Floor level / View]

6. World-Class Tower Amenities & Resort Facilities (approx. 140-170 words)
   - Detail the building's infrastructure: temperature-controlled swimming pool with private cabanas and sun loungers, state-of-the-art fitness center and wellness studio with cardio and resistance machinery, 24/7 dedicated concierge and security surveillance, resident lounges, landscaped outdoor terraces, and high-speed elevators.
   - Highlight the lifestyle standard created by pristine common areas and white-glove building management.

7. Community Setting & Strategic Dubai Connectivity (approx. 150-180 words)
   - Paint an evocative portrait of the surrounding neighborhood, streetscapes, and everyday conveniences.
   - Detail strategic connectivity to Dubai's primary economic and leisure arteries (Sheikh Zayed Road, Al Khail Road, Downtown Dubai, Dubai Marina, DIFC, DXB International Airport) with indicative drive times.
   - Highlight proximity to elite international schools, championship golf clubs, retail promenades, fine dining, and beach clubs.
   - DATA INTEGRITY: If community or building contains Arabic or OCR text (e.g. 'الهوية'), contextualize it with proper English Dubai district context.

8. Investment Rationale & Capital Preservation (approx. 110-130 words)
   - Articulate the investment thesis: robust rental yields in Dubai's resilient real estate market, consistent capital appreciation, tax-free returns, high tenant demand, and UAE Golden Visa qualification where eligible (properties AED 2M+).
   - Summarize the defensive quality of prime Dubai real estate for wealth preservation and enduring portfolio performance.

9. Private Viewings & Advisory Call to Action (approx. 70-90 words)
   - Conclude with a distinguished invitation for qualified purchasers, tenants, and investors to schedule an exclusive private walkthrough or request technical floor plans and investment documentation from A Squared Real Estate.

STRICT WRITING & PORTAL GUIDELINES:
1. MANDATORY WORD COUNT: The 'portal_description' MUST CONTAIN AT LEAST 750 WORDS (aim for 750 to 950 words; minimum 700 words strictly enforced). Write rich, eloquent paragraphs across each numbered section.
2. NO CHEESY EMOJIS (no 🏊, 🏠, ✨, 🏢, 🔑) in portal_description. Use clean hyphens (-) for bullets.
3. HIGH VARIABILITY: Dynamically alter tone, vocabulary, transitions, and sentence cadence on every generation so no two listings feel identical.
4. ELEGANT VOCABULARY: Maintain sophisticated, polished British/International English suitable for prime real estate portals (Property Finder, Bayut, Dubizzle).

RETURN STRICTLY VALID JSON WITH THESE 7 KEYS:
{
  "portal_title": "High-converting property title under 80 characters (e.g. '2 BR Luxury Residence | Prime Community | Panoramic Views')",
  "portal_description": "The full, minimum 700-word editorial property narrative following the 9-part structure above",
  "whatsapp_copy": "High-impact broker broadcast formatted with bold tags (*Title*) and clean bullet highlights with viewing CTA",
  "instagram_copy": "Refined Instagram caption with lifestyle hook, key specs, call-to-action, and top Dubai real estate hashtags",
  "investor_email": "VIP Investor Pitch: Subject line + investment thesis + yield/capital appreciation outlook + viewing CTA",
  "arabic_summary": "Comprehensive, formal Arabic real estate description matching the property details and luxury tone",
  "russian_summary": "High-end Russian real estate description matching the property details and luxury tone"
}
EOT;

$userPrompt = <<<EOT
Generate comprehensive, full-length A Squared Real Estate marketing copy for:
Building Name: $building
Full Property Name: $name
Reference: $reference
Location / Community: $community
Property Type: $property_type
Floor: $displayFloor
Purpose: $purpose
Price: $displayPrice
Size: $displaySize
Bedrooms: $bedrooms
Bathrooms: $bathrooms
Furnishing: $furnishing
Usage: $usage
Additional Details & Notes: $rough_notes

MANDATORY REQUIREMENT: Ensure the 'portal_description' achieves a minimum of 700 words (aim for 750 to 900 words) across the complete 9-part editorial structure.
EOT;

$payload = [
    'model' => 'gpt-4o-mini',
    'messages' => [
        ['role' => 'system', 'content' => $systemPrompt],
        ['role' => 'user', 'content' => $userPrompt]
    ],
    'response_format' => ['type' => 'json_object'],
    'temperature' => 0.7,
    'max_tokens' => 4096
];

$ch = curl_init('https://api.openai.com/v1/chat/completions');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Authorization: Bearer ' . $openAiKey
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
curl_setopt($ch, CURLOPT_TIMEOUT, 120);

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
    'model' => 'gpt-4o-mini',
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
