import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import templatePdfAssetUrl from '../assets/templates/A_SQUARED_Listing_Form_Rental_Template.pdf';
import { cleanBuildingNameOffline } from './aiPropertyShortener.js';

/**
 * Format helper for currency
 */
export function formatCurrency(amount) {
  if (!amount && amount !== 0) return 'Price on Application';
  const num = Number(String(amount).replace(/[^0-9.]/g, ''));
  if (isNaN(num) || num === 0) return sanitizeWinAnsi(String(amount), 'Price on Application');
  return 'AED ' + num.toLocaleString('en-US');
}

/**
 * Sanitize text to ensure only characters encodable by Standard Helvetica (WinAnsi) are passed
 */
export function sanitizeWinAnsi(str, fallback = '') {
  if (!str && str !== 0) return fallback;
  const cleaned = String(str)
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2026]/g, '...')
    .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim();
  return cleaned || fallback;
}

/**
 * Helper to fetch template bytes with multiple fallbacks
 */
async function loadTemplateBytes() {
  const candidates = [
    templatePdfAssetUrl,
    `${import.meta.env.BASE_URL || './'}templates/A_SQUARED_Listing_Form_Rental_Template.pdf`,
    `./templates/A_SQUARED_Listing_Form_Rental_Template.pdf`,
    `/templates/A_SQUARED_Listing_Form_Rental_Template.pdf`,
    `/dashboard/templates/A_SQUARED_Listing_Form_Rental_Template.pdf`,
    `https://admin.asquared.ae/dashboard/templates/A_SQUARED_Listing_Form_Rental_Template.pdf`,
    `https://admin.asquared.ae/templates/A_SQUARED_Listing_Form_Rental_Template.pdf`,
  ].filter(Boolean);

  for (const url of candidates) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('html')) continue;

      const buffer = await res.arrayBuffer();
      if (buffer && buffer.byteLength > 1000) {
        return buffer;
      }
    } catch (e) {
      // try next candidate
    }
  }
  return null;
}

/**
 * Overlay dynamic fields on the official A-SQUARED 1:1 Listing Form (Rental) template
 * Dimensions: 1119.6 x 1582.8 points
 */
export function fillListingFormRentalTemplate(page, {
  listing = {},
  titleDeedData = {},
  emiratesIdData = {},
  commercialSpecs = {},
  fontRegular,
  fontBold,
}) {
  const textColor = rgb(0.00, 0.09, 0.22); // Deep rich A-Squared Navy (#001738)

  /**
   * Smart Form Field Renderer:
   * 1. Eliminates artificial solid underlines completely (NO page.drawLine).
   * 2. Dynamically downscales font if text exceeds available slot width to guarantee ZERO column collisions.
   * 3. Renders crisp text cleanly resting 2.8pt above the template's pre-printed dashed line.
   */
  const drawField = ({
    text,
    startX,
    endX,
    dashY,
    fontSize = 13.5,
    isBold = true,
  }) => {
    if (!text && text !== 0) return;
    const cleanText = sanitizeWinAnsi(String(text));
    if (!cleanText) return;

    const font = isBold ? fontBold : fontRegular;
    const maxTextWidth = endX - startX - 4;

    // Dynamically downscale font if text exceeds slot boundary
    let currentFontSize = fontSize;
    let textWidth = font.widthOfTextAtSize(cleanText, currentFontSize);
    while (textWidth > maxTextWidth && currentFontSize > 7.0) {
      currentFontSize -= 0.5;
      textWidth = font.widthOfTextAtSize(cleanText, currentFontSize);
    }

    // Clip if still too wide to avoid ANY collision
    let renderedText = cleanText;
    if (textWidth > maxTextWidth) {
      while (renderedText.length > 3 && font.widthOfTextAtSize(renderedText + '...', currentFontSize) > maxTextWidth) {
        renderedText = renderedText.slice(0, -1);
      }
      renderedText += '...';
    }

    try {
      // Draw text cleanly resting 2.8pt above the native dashed line
      // ZERO page.drawLine - NO extra artificial underlines!
      page.drawText(renderedText, {
        x: startX + 2,
        y: dashY + 2.8,
        size: currentFontSize,
        font,
        color: textColor,
      });
    } catch (e) {
      console.warn('Error drawing field:', cleanText, e);
    }
  };

  /**
   * Centered checkmark renderer:
   * Sits with 1.6pt safety margin inside the 12x12 checkbox square.
   * Zero overlap with square borders.
   */
  const drawCheck = (xMin, yMin) => {
    try {
      page.drawLine({
        start: { x: xMin + 2.5, y: yMin + 5.5 },
        end: { x: xMin + 5.0, y: yMin + 2.8 },
        thickness: 1.8,
        color: textColor,
      });
      page.drawLine({
        start: { x: xMin + 5.0, y: yMin + 2.8 },
        end: { x: xMin + 9.8, y: yMin + 9.5 },
        thickness: 1.8,
        color: textColor,
      });
    } catch (e) {
      console.warn('Error drawing check:', e);
    }
  };

  // 1. Date (top right): dashY = 1460
  const dateStr = commercialSpecs?.form_date || commercialSpecs?.agreement_date || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  drawField({
    text: dateStr,
    startX: 880,
    endX: 1025,
    dashY: 1460,
    fontSize: 14.5,
    isBold: true,
  });

  // 2. Owner / Landlord Details: dashY = 1144, 1118
  const ownerName = commercialSpecs?.owner_name || titleDeedData?.owner_name_english || emiratesIdData?.full_name_english || '';
  const phone = commercialSpecs?.owner_phone || emiratesIdData?.phone || '';
  const nationality = commercialSpecs?.owner_nationality || emiratesIdData?.nationality || titleDeedData?.nationality || '';
  const email = commercialSpecs?.owner_email || '';

  drawField({ text: ownerName, startX: 145, endX: 430, dashY: 1144, fontSize: 14, isBold: true });
  drawField({ text: phone, startX: 530, endX: 740, dashY: 1144, fontSize: 14, isBold: true });
  drawField({ text: nationality, startX: 190, endX: 430, dashY: 1118, fontSize: 13, isBold: false });
  drawField({ text: email, startX: 520, endX: 765, dashY: 1118, fontSize: 13, isBold: false });

  // 3. Property Type Checkboxes: yMin = 1013.8 (Building = 987.8)
  const rawPropType = (commercialSpecs?.property_type || titleDeedData?.property_type || listing?.property_type || '').toLowerCase();
  const isApt = rawPropType.includes('apart') || rawPropType.includes('flat') || rawPropType.includes('شقة') || rawPropType.includes('penthouse');
  const isVilla = rawPropType.includes('villa') || rawPropType.includes('فيلا');
  const isTownhouse = rawPropType.includes('town') || rawPropType.includes('تاون');
  const isLand = rawPropType.includes('land') || rawPropType.includes('plot') || rawPropType.includes('أرض');
  const isOffice = rawPropType.includes('office') || rawPropType.includes('مكتب');
  const isShop = rawPropType.includes('shop') || rawPropType.includes('محل') || rawPropType.includes('retail');
  const isWarehouse = rawPropType.includes('warehouse') || rawPropType.includes('مستودع');
  const isBuilding = rawPropType.includes('building') || rawPropType.includes('مبنى');

  if (isApt) drawCheck(83, 1013.8);
  else if (isVilla) drawCheck(229, 1013.8);
  else if (isTownhouse) drawCheck(318, 1013.8);
  else if (isLand) drawCheck(469, 1013.8);
  else if (isOffice) drawCheck(563, 1013.8);
  else if (isWarehouse) drawCheck(667, 1013.8);
  else if (isShop) drawCheck(818, 1013.8);
  else if (isBuilding) drawCheck(83, 987.8);
  else drawCheck(83, 1013.8); // Default to apartment

  // 4. Property Details Checkboxes: yMin = 882.8 .. 883.0
  // A. Occupancy (Vacant vs Tenanted)
  const occ = (commercialSpecs?.occupancy_status || '').toLowerCase();
  const isTenanted = occ.includes('tenant');
  if (isTenanted) drawCheck(482, 882.8); // Tenanted
  else drawCheck(83, 883.0); // Vacant (default)

  // B. Classification (Residential vs Commercial)
  const rawCategory = (commercialSpecs?.category || '').toLowerCase();
  const isCommercial = rawCategory.includes('comm') || isOffice || isShop || isWarehouse;
  if (isCommercial) drawCheck(773, 882.8); // Commercial
  else drawCheck(335, 882.8); // Residential (default)

  // C. Furnishing (Furnished vs Unfurnished)
  const furnishing = (commercialSpecs?.furnishing || '').toLowerCase();
  if (furnishing.includes('unfurnished') || furnishing.includes('none')) {
    drawCheck(617, 882.8); // Unfurnished
  } else if (furnishing.includes('furnished')) {
    drawCheck(198, 882.8); // Furnished
  } else {
    drawCheck(617, 882.8); // Default to unfurnished
  }

  // Property Details Text Fields
  const rawBuildingName = commercialSpecs?.building_name || titleDeedData?.building_name || listing?.name || '';
  // Clean building name to prevent compound listings overflowing into Community
  const displayBuildingName = cleanBuildingNameOffline(rawBuildingName);

  const community = commercialSpecs?.community || titleDeedData?.community || '';
  const unitNumber = commercialSpecs?.unit_number || titleDeedData?.unit_number || '';
  const bedrooms = commercialSpecs?.bedrooms || listing?.propertySpecs?.bedrooms || listing?.bedrooms || '';
  const bathrooms = commercialSpecs?.bathrooms || listing?.propertySpecs?.bathrooms || listing?.bathrooms || '';
  const parking = commercialSpecs?.parking_bays || commercialSpecs?.parking || titleDeedData?.parking_bays?.[0] || '1 Space';
  const buaSqft = commercialSpecs?.bua_sqft ? String(commercialSpecs.bua_sqft) : (titleDeedData?.total_area_sqft ? String(titleDeedData.total_area_sqft) : (titleDeedData?.suite_area_sqft ? String(titleDeedData.suite_area_sqft) : ''));
  const plotArea = commercialSpecs?.plot_area || (titleDeedData?.plot_number ? String(titleDeedData.plot_number) : '');
  const rawPrice = commercialSpecs?.price || commercialSpecs?.asking_price || listing?.price || '';
  const askingPrice = rawPrice ? (String(rawPrice).toLowerCase().includes('aed') ? String(rawPrice) : formatCurrency(rawPrice)) : '';
  const cheques = commercialSpecs?.cheques || '1 - 4 Cheques';

  // Row 1: Building Name & Community: dashY = 813
  // Building Name: starts at 220 (after "Building Name:"), bounded at 505 (safely before "Community:" starts at 515)
  drawField({ text: displayBuildingName, startX: 220, endX: 505, dashY: 813, fontSize: 13.5, isBold: true });
  // Community: starts at 625 (after "Community:" ends at 613), bounded at 1030
  drawField({ text: community, startX: 625, endX: 1030, dashY: 813, fontSize: 14, isBold: true });

  // Row 2: Unit, Bedroom, Bathroom, Parking: dashY = 779
  drawField({ text: unitNumber, startX: 130, endX: 215, dashY: 779, fontSize: 14, isBold: true });
  drawField({ text: bedrooms, startX: 350, endX: 485, dashY: 779, fontSize: 13, isBold: false });
  drawField({ text: bathrooms, startX: 605, endX: 720, dashY: 779, fontSize: 13, isBold: false });
  drawField({ text: parking, startX: 820, endX: 930, dashY: 779, fontSize: 13.5, isBold: true });

  // Row 3: BUA, Plot Area, No. Of Cheques: dashY = 744
  drawField({ text: buaSqft, startX: 130, endX: 225, dashY: 744, fontSize: 13, isBold: true });
  drawField({ text: plotArea, startX: 420, endX: 515, dashY: 744, fontSize: 13, isBold: false });
  drawField({ text: cheques, startX: 770, endX: 920, dashY: 744, fontSize: 13, isBold: false });

  // Row 4: Asking Price: dashY = 710
  drawField({ text: askingPrice, startX: 195, endX: 740, dashY: 710, fontSize: 14.5, isBold: true });

  // 5. Terms Checkboxes: yMin = 530.8 (Row 1), yMin = 498.8 (Row 2)
  const isExclusive = (commercialSpecs?.agreement_type || '').toLowerCase().includes('exclusive') && !(commercialSpecs?.agreement_type || '').toLowerCase().includes('non');
  if (isExclusive) {
    drawCheck(83, 530.8); // Exclusive
  } else {
    drawCheck(214, 530.8); // Non-Exclusive
  }

  // Duration
  const duration = (commercialSpecs?.agreement_duration || '').toString().toLowerCase();
  const untilDate = commercialSpecs?.agreement_until_date || commercialSpecs?.until_date || '';

  if (duration.includes('1 month') || duration === '1m') {
    drawCheck(214, 498.8); // 1 Month
  } else if (duration.includes('2 month') || duration === '2m') {
    drawCheck(342, 498.8); // 2 Month
  } else if (duration.includes('until') || untilDate) {
    drawCheck(574, 498.8); // Or Until checkbox
    if (untilDate) {
      drawField({ text: untilDate, startX: 660, endX: 800, dashY: 498, fontSize: 13, isBold: true });
    }
  } else {
    drawCheck(452, 498.8); // 3 Month (default)
  }

  // 6. Signatures: dashY = 218
  drawField({ text: ownerName, startX: 235, endX: 540, dashY: 218, fontSize: 14, isBold: true });
  const agentName = commercialSpecs?.broker_agent_name || commercialSpecs?.agent_name || commercialSpecs?.assigned_agent || commercialSpecs?.assigned_agent_name || listing?.assigned_agent || listing?.assigned_agent_name || listing?.agent_name || listing?.broker_agent_name || 'Melanie Simsiman';
  drawField({ text: agentName, startX: 715, endX: 960, dashY: 218, fontSize: 14, isBold: true });
}

/**
 * Generate client-side PDF Document and return Blob & Object URL
 */
export async function generateClientRentalPdf({
  listing = {},
  commercialSpecs = {},
  titleDeedData = {},
  emiratesIdData = {},
}) {
  const templateBytes = await loadTemplateBytes();
  let pdfDoc;

  if (templateBytes) {
    pdfDoc = await PDFDocument.load(templateBytes);
  } else {
    // Graceful fallback if asset cannot be fetched
    pdfDoc = await PDFDocument.create();
    pdfDoc.addPage([1119.6, 1582.8]);
  }

  const page = pdfDoc.getPages()[0];
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  fillListingFormRentalTemplate(page, {
    listing,
    titleDeedData: titleDeedData || listing?.title_deed_data || {},
    emiratesIdData: emiratesIdData || listing?.emirates_id_data || {},
    commercialSpecs: commercialSpecs || listing?.commercial_specs || {},
    fontRegular,
    fontBold,
  });

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const blobUrl = URL.createObjectURL(blob);

  const rawOwner = commercialSpecs?.owner_name || titleDeedData?.owner_name_english || listing?.name || 'Client';
  const safeName = rawOwner.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `01_A_SQUARED_Rental_Form_NOC_${safeName}.pdf`;

  return {
    pdfBytes,
    blob,
    blobUrl,
    filename,
  };
}

/**
 * Open generated PDF in a new tab for preview
 */
export async function previewRentalPdfInNewTab(data) {
  const { blobUrl, filename } = await generateClientRentalPdf(data);
  const win = window.open(blobUrl, '_blank');
  if (!win) {
    // Popup was blocked, trigger standard download or inform user
    const link = document.createElement('a');
    link.href = blobUrl;
    link.target = '_blank';
    link.rel = 'noopener,noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  return { blobUrl, filename };
}

/**
 * Download generated PDF directly to the browser
 */
export async function downloadRentalPdf(data) {
  const { blobUrl, filename } = await generateClientRentalPdf(data);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
  return { blobUrl, filename };
}
