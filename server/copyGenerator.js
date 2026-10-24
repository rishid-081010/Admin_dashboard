import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

export async function generateDubaiPortalCopy(data, tone = 'luxury') {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.includes('your_openai_api_key')) {
    throw new Error('OpenAI API Key is missing or invalid in .env file.');
  }

  const openai = new OpenAI({ apiKey });

  const {
    name = '',
    reference = '',
    property_type = 'Apartment',
    purpose = 'For Sale',
    price = '',
    bedrooms = '',
    bathrooms = '',
    size_sqft = '',
    furnishing = 'Unfurnished',
    rough_notes = '',
  } = data;

  const tonePrompts = {
    luxury: 'Prestigious, refined, and authoritative luxury editorial tone tailored for high-net-worth buyers in prime Dubai communities (Downtown, Palm Jumeirah, Dubai Marina, Emirates Hills). Focus on architectural elegance, unobstructed vistas, and bespoke finishes.',
    investor_roi: 'Data-driven, analytical, and yield-focused tone highlighting high rental yields, capital appreciation potential, prime tenant demand, and low service charge efficiency.',
    fast_deal: 'High-urgency, hot-deal market positioning highlighting turnkey readiness, vacant on transfer status, and exclusive pricing.',
  };

  const selectedToneGuideline = tonePrompts[tone] || tonePrompts.luxury;

  const isRental = String(purpose).toLowerCase().includes('rent') || String(purpose).toLowerCase().includes('lease');
  const rentOrSale = isRental ? 'rent' : 'sale';
  const priceBulletLabel = isRental ? 'Annual rent' : 'Selling price';

  const systemPrompt = `You are the Executive Real Estate Copywriter for A SQUARED REAL ESTATE in Dubai.
Your mission is to generate clean, authoritative, and elegant property marketing copy that adheres STRICTLY to A SQUARED REAL ESTATE's signature standard.

SIGNATURE "portal_description" FORMAT:
You MUST follow this exact 5-part structure and tone:

A Squared Real Estate proudly presents this [spacious / stunning] [property type] for ${rentOrSale} in [Community / Building].

Offering approximately [Size in Sq. Ft.] sq. ft., this home features [Bedrooms] bedrooms and [Bathrooms] bathrooms, with a practical layout suited to comfortable everyday living.

Property Highlights
- [Bedrooms] bedrooms
- [Bathrooms] bathrooms
- Approx. [Size in Sq. Ft.] sq. ft.
- Located in [Community, Sub-community / Building]
- ${priceBulletLabel}: AED [Formatted Price]

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
   - Part 1: 'A Squared Real Estate proudly presents this [adjective] [property type] for ${rentOrSale} in [Community / Building].'
   - Part 2: 'Offering approximately [Size] sq. ft., this home features [X] bedrooms and [Y] bathrooms, with a practical layout suited to comfortable everyday living.' (If studio: adapt to 'Offering approximately [Size] sq. ft., this studio features 1 bathroom, with a practical layout suited to comfortable everyday living.').
   - Part 3: Header 'Property Highlights' followed immediately by clean hyphen bullets (-):
     - [X] bedrooms
     - [Y] bathrooms
     - Approx. [Size] sq. ft.
     - Located in [Community, Sub-community / Building]
     - ${priceBulletLabel}: AED [Formatted Price]
     (If additional verified attributes like Furnished/Unfurnished or Covered Parking are in input, up to 2 extra clean bullets may be included).
   - Part 4: 'Enjoy [property type] living in [Community], with convenient access to destinations across Dubai.'
   - Part 5: 'Contact A Squared Real Estate to arrange a viewing or request further details.'
2. NO cheesy emojis (no 🏊, 🏠, ✨, 🏢, 🔑) in portal_description. Use clean hyphens (-) for bullets.
3. Keep the language natural, professional, direct, and completely free from exaggerated marketing hype.
4. Return strictly valid JSON with these 7 keys:
{
  "portal_title": "String (Under 80 characters, e.g. '3 BR Townhouse for Rent | Jebel Ali Village | AED 220,000')",
  "portal_description": "String (The exact signature 5-part A SQUARED format shown above)",
  "whatsapp_copy": "String (High-impact WhatsApp broker broadcast formatted with bold * tags and clean bullets)",
  "instagram_copy": "String (Refined Instagram caption matching the exact highlights and top Dubai real estate hashtags)",
  "investor_email": "String (VIP Investor Pitch: Subject line + investment thesis + viewing CTA)",
  "arabic_summary": "String (Formal Arabic real estate description matching the exact property details and 5-part structure)",
  "russian_summary": "String (High-end Russian real estate description matching the exact property details and 5-part structure)"
}`;

  const userPrompt = `
Property Name: ${name}
Reference: ${reference || 'N/A'}
Property Type: ${property_type}
Purpose: ${purpose}
Price: ${price ? price + ' AED' : 'Price on Application'}
Bedrooms: ${bedrooms || 'Not specified'}
Bathrooms: ${bathrooms || 'Not specified'}
Built-Up Area: ${sizeSqm ? sizeSqm + ' Sq. M. / ' : ''}${size_sqft ? size_sqft + ' Sq. Ft.' : 'Not specified'}
Furnishing: ${furnishing}
Notes:
${rough_notes || 'High floor, prime location, landmark architecture, luxury finishing, vacant and ready for immediate viewing.'}
`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const content = response.choices[0].message.content;
    const parsed = JSON.parse(content);

    return {
      portal_title: parsed.portal_title || `${name} | Prime Dubai Real Estate`,
      portal_description: parsed.portal_description || 'Detailed property listing coming soon.',
      whatsapp_copy: parsed.whatsapp_copy || 'Exclusive property listing in Dubai. Contact for details.',
      instagram_copy: parsed.instagram_copy || `✨ Luxury Living at ${name}\n\nKey Highlights:\n• ${property_type} | ${bedrooms} BR\n• Price: ${price ? price + ' AED' : 'POA'}\n\nDM A SQUARED REAL ESTATE for private viewing details. #DubaiRealEstate #LuxuryHomes`,
      investor_email: parsed.investor_email || `Subject: Exclusive Off-Market / Prime Opportunity: ${name}\n\nDear Investor,\n\nA SQUARED Real Estate is pleased to present this premier ${property_type} in ${name}.\n\nPrice: ${price ? price + ' AED' : 'POA'}\nArea: ${size_sqft ? size_sqft + ' sq.ft.' : 'N/A'}\n\nContact us for comprehensive yield metrics and private inspections.`,
      arabic_summary: parsed.arabic_summary || `فرصة استثمارية مميزة في ${name}، دبي. للتفاصيل يرجى التواصل مع إيه سكويرد للعقارات.`,
      russian_summary: parsed.russian_summary || `Эксклюзивная недвижимость в ${name}, Дубай. Свяжитесь с A SQUARED REAL ESTATE для организации просмотра.`,
    };
  } catch (err) {
    console.error('Error in generateDubaiPortalCopy:', err);
    // Return an elevated structured fallback
    return {
      portal_title: `${bedrooms ? bedrooms + ' | ' : ''}${name} | ${property_type} ${purpose}`,
      portal_description: `✨ Executive Overview\nA SQUARED Real Estate presents this exceptional ${bedrooms || ''} ${property_type} in ${name}.\n\n🏠 Property Specifications\n• Type: ${property_type}\n• Price: ${price ? price + ' AED' : 'POA'}\n• Bedrooms: ${bedrooms}\n• Bathrooms: ${bathrooms}\n• Built-Up Area: ${size_sqft ? size_sqft + ' sq. ft.' : 'N/A'}\n\n🏢 Interior Highlights\n• ${rough_notes || 'Bright layout with expansive glazing and premium finishes'}\n\n📞 Private Viewings\nContact A SQUARED Real Estate today to arrange an exclusive private viewing.`,
      whatsapp_copy: `🔥 *EXCLUSIVE LISTING: ${name}*\n💰 *Price:* ${price ? price + ' AED' : 'POA'}\n📐 *Size:* ${size_sqft ? size_sqft + ' sq.ft.' : 'N/A'} | 🛏️ ${bedrooms || 'N/A'} | 🚿 ${bathrooms || 'N/A'}\n\n✨ *Key Highlights:*\n• ${rough_notes || 'Prime Location • Turnkey Condition'}\n\n📲 *Contact A SQUARED Real Estate for Private Viewings!*`,
      instagram_copy: `✨ Experience elevated living at ${name}.\n\n📍 Prime Dubai Location\n📐 ${size_sqft ? size_sqft + ' sq.ft.' : ''} | 🛏️ ${bedrooms || ''} | 🚿 ${bathrooms || ''}\n💰 ${price ? price + ' AED' : 'POA'}\n\nSwipe left to tour this immaculate residence. Contact @asquaredrealestate for private viewing appointments.\n\n#DubaiRealEstate #DubaiLuxury #PropertyFinder #Bayut #LuxuryLiving #DubaiInvestments`,
      investor_email: `Subject: High-Yield Investment Opportunity: ${name}\n\nDear Investor,\n\nA SQUARED Real Estate presents an exceptional acquisition opportunity at ${name}.\n\nKey Metrics:\n• Property: ${bedrooms || ''} ${property_type}\n• Price: ${price ? price + ' AED' : 'POA'}\n• Built-Up Area: ${size_sqft ? size_sqft + ' sq.ft.' : 'N/A'}\n• Highlights: ${rough_notes || 'High rental demand, prime location, turnkey condition'}\n\nReply directly to this email to receive full financial forecasts and arrange an exclusive private inspection.\n\nWarm regards,\nA SQUARED REAL ESTATE`,
      arabic_summary: `✨ نظرة عامة تنعكس فيها الفخامة في ${name}.\n• النوع: ${property_type}\n• السعر: ${price ? price + ' درهم' : 'عند الطلب'}\n• المساحة: ${size_sqft ? size_sqft + ' قدم مربع' : ''}\n\nللمزيد من التفاصيل وحجز موعد للمعاينة، تواصلوا مع شركة إيه سكويرد العقارية.`,
      russian_summary: `✨ Премиальная недвижимость в ${name}, Дубай.\n• Тип: ${property_type}\n• Цена: ${price ? price + ' AED' : 'По запросу'}\n• Площадь: ${size_sqft ? size_sqft + ' кв. футов' : ''}\n\nДля получения подробной информации и организации частного просмотра свяжитесь с A SQUARED REAL ESTATE.`,
    };
  }
}
