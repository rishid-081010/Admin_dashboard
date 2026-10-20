import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import templatePdfAssetUrl from '../assets/templates/A_SQUARED_Listing_Form_Rental_Template.pdf';

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
  const white = rgb(1, 1, 1);
  const underlineColor = rgb(0.72, 0.76, 0.83); // Crisp subtle slate rule

  /**
   * Smart Form Field Renderer:
   * 1. Cleans out messy bitmap dashes from the template across the active fill area.
   * 2. Draws a crisp solid baseline rule (0.75pt).
   * 3. Dynamically downscales font if text exceeds available slot width to guarantee ZERO column collisions.
   * 4. Renders crisp text resting 2.5pt above the baseline rule with zero strikethrough.
   */
  const drawField = ({
    text,
    startX,
    endX,
    dashY,
    fontSize = 13.5,
    isBold = true,
    drawRule = true,
  }) => {
    if (!text && text !== 0) return;
    const cleanText = sanitizeWinAnsi(String(text));
    if (!cleanText) return;

    const font = isBold ? fontBold : fontRegular;
    const maxTextWidth = endX - startX - 4;

    // Dynamically downscale font if text exceeds slot boundary
    let currentFontSize = fontSize;
    let textWidth = font.widthOfTextAtSize(cleanText, currentFontSize);
    while (textWidth > maxTextWidth && currentFontSize > 7.5) {
      currentFontSize -= 0.5;
      textWidth = font.widthOfTextAtSize(cleanText, currentFontSize);
    }

    try {
      // 1. Knock out the messy template bitmap dashed line
      page.drawRectangle({
        x: startX - 1,
        y: dashY - 3,
        width: endX - startX + 2,
        height: 7.5,
        color: white,
      });

      // 2. Draw clean, crisp solid baseline rule across the slot
      if (drawRule) {
        page.drawLine({
          start: { x: startX, y: dashY },
          end: { x: endX, y: dashY },
          thickness: 0.75,
          color: underlineColor,
        });
      }

      // 3. Draw text cleanly resting 2.5pt above the baseline rule
      page.drawText(cleanText, {
        x: startX + 2,
        y: dashY + 2.5,
        size: currentFontSize,
        font,
        color: textColor,
      });
    } catch (e) {
      console.warn('Error drawing field:', cleanText, e);
    }
  };

  const drawCheck = (boxX, boxY) => {
    try {
      // Exact center inside 14x14 checkbox
      page.drawLine({
        start: { x: boxX + 2.5, y: boxY + 6.5 },
        end: { x: boxX + 6, y: boxY + 2 },
        thickness: 2.2,
        color: textColor,
      });
      page.drawLine({
        start: { x: boxX + 6, y: boxY + 2 },
        end: { x: boxX + 13, y: boxY + 12 },
        thickness: 2.2,
        color: textColor,
      });
    } catch (e) {
      console.warn('Error drawing check:', e);
    }
  };

  // 1. Date (top right)
  const dateStr = commercialSpecs?.form_date || commercialSpecs?.agreement_date || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  drawField({
    text: dateStr,
    startX: 880,
    endX: 1025,
    dashY: 1457,
    fontSize: 15,
    isBold: true,
  });

  // 2. Owner / Landlord Details
  const ownerName = commercialSpecs?.owner_name || titleDeedData?.owner_name_english || emiratesIdData?.full_name_english || '';
  const phone = commercialSpecs?.owner_phone || emiratesIdData?.phone || '';
  const nationality = commercialSpecs?.owner_nationality || emiratesIdData?.nationality || titleDeedData?.nationality || '';
  const email = commercialSpecs?.owner_email || '';

  drawField({ text: ownerName, startX: 145, endX: 430, dashY: 1146, fontSize: 14, isBold: true });
  drawField({ text: phone, startX: 530, endX: 740, dashY: 1146, fontSize: 14, isBold: true });
  drawField({ text: nationality, startX: 190, endX: 430, dashY: 1115, fontSize: 13, isBold: false });
  drawField({ text: email, startX: 520, endX: 765, dashY: 1115, fontSize: 13, isBold: false });

  // 3. Property Type Checkboxes
  const rawPropType = (commercialSpecs?.property_type || titleDeedData?.property_type || listing?.property_type || '').toLowerCase();
  const isApt = rawPropType.includes('apart') || rawPropType.includes('flat') || rawPropType.includes('شقة') || rawPropType.includes('penthouse');
  const isVilla = rawPropType.includes('villa') || rawPropType.includes('فيلا');
  const isTownhouse = rawPropType.includes('town') || rawPropType.includes('تاون');
  const isLand = rawPropType.includes('land') || rawPropType.includes('plot') || rawPropType.includes('أرض');
  const isOffice = rawPropType.includes('office') || rawPropType.includes('مكتب');
  const isShop = rawPropType.includes('shop') || rawPropType.includes('محل') || rawPropType.includes('retail');
  const isWarehouse = rawPropType.includes('warehouse') || rawPropType.includes('مستودع');
  const isBuilding = rawPropType.includes('building') || rawPropType.includes('مبنى');

  if (isApt) drawCheck(81, 1018);
  else if (isVilla) drawCheck(226, 1018);
  else if (isTownhouse) drawCheck(321, 1018);
  else if (isLand) drawCheck(469, 1018);
  else if (isOffice) drawCheck(567, 1018);
  else if (isWarehouse) drawCheck(676, 1018);
  else if (isShop) drawCheck(822, 1018);
  else if (isBuilding) drawCheck(81, 988);
  else drawCheck(81, 1018); // Default to apartment

  // 4. Property Details Checkboxes
  // A. Occupancy (Vacant vs Tenanted)
  const occ = (commercialSpecs?.occupancy_status || '').toLowerCase();
  const isTenanted = occ.includes('tenant');
  if (isTenanted) drawCheck(481, 890); // Tenanted
  else drawCheck(81, 890); // Vacant (default)

  // B. Classification (Residential vs Commercial)
  const rawCategory = (commercialSpecs?.category || '').toLowerCase();
  const isCommercial = rawCategory.includes('comm') || isOffice || isShop || isWarehouse;
  if (isCommercial) drawCheck(776, 890); // Commercial
  else drawCheck(333, 890); // Residential (default)

  // C. Furnishing (Furnished vs Unfurnished)
  const furnishing = (commercialSpecs?.furnishing || '').toLowerCase();
  if (furnishing.includes('unfurnished') || furnishing.includes('none')) {
    drawCheck(617, 890); // Unfurnished
  } else if (furnishing.includes('furnished')) {
    drawCheck(198, 890); // Furnished
  } else {
    drawCheck(617, 890); // Default to unfurnished
  }

  // Property Details Text Fields
  const rawBuildingName = commercialSpecs?.building_name || titleDeedData?.building_name || listing?.name || '';
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

  // Building Name & Community: dashY=820
  // Building Name starts at 215 (after "Building Name:"), bounded at 565 before "Community:"
  drawField({ text: rawBuildingName, startX: 215, endX: 565, dashY: 820, fontSize: 13.5, isBold: true });
  // Community starts at 665 (after "Community:")
  drawField({ text: community, startX: 665, endX: 1030, dashY: 820, fontSize: 14, isBold: true });

  // Row 2: Unit, Bedroom, Bathroom, Parking: dashY=782
  drawField({ text: unitNumber, startX: 130, endX: 225, dashY: 782, fontSize: 14, isBold: true });
  drawField({ text: bedrooms, startX: 350, endX: 485, dashY: 782, fontSize: 13, isBold: false });
  drawField({ text: bathrooms, startX: 605, endX: 720, dashY: 782, fontSize: 13, isBold: false });
  drawField({ text: parking, startX: 820, endX: 930, dashY: 782, fontSize: 13.5, isBold: true });

  // Row 3: BUA, Plot Area, No. Of Cheques: dashY=741
  drawField({ text: buaSqft, startX: 130, endX: 225, dashY: 741, fontSize: 13, isBold: true, drawRule: !!buaSqft });
  drawField({ text: plotArea, startX: 420, endX: 515, dashY: 741, fontSize: 13, isBold: false, drawRule: !!plotArea });
  drawField({ text: cheques, startX: 770, endX: 920, dashY: 741, fontSize: 13, isBold: false });

  // Row 4: Asking Price: dashY=705
  drawField({ text: askingPrice, startX: 195, endX: 740, dashY: 705, fontSize: 14.5, isBold: true });

  // 5. Terms Checkboxes
  const isExclusive = (commercialSpecs?.agreement_type || '').toLowerCase().includes('exclusive') && !(commercialSpecs?.agreement_type || '').toLowerCase().includes('non');
  if (isExclusive) {
    drawCheck(81, 535); // Exclusive
  } else {
    drawCheck(210, 535); // Non-Exclusive
  }

  // Duration
  const duration = (commercialSpecs?.agreement_duration || '').toString().toLowerCase();
  const untilDate = commercialSpecs?.agreement_until_date || commercialSpecs?.until_date || '';

  if (duration.includes('1 month') || duration === '1m') {
    drawCheck(210, 495); // 1 Month
  } else if (duration.includes('2 month') || duration === '2m') {
    drawCheck(346, 495); // 2 Month
  } else if (duration.includes('until') || untilDate) {
    drawCheck(585, 495); // Or Until checkbox
    if (untilDate) {
      drawField({ text: untilDate, startX: 660, endX: 800, dashY: 495, fontSize: 13, isBold: true });
    }
  } else {
    drawCheck(455, 495); // 3 Month (default)
  }

  // 6. Signatures: dashY=214
  drawField({ text: ownerName, startX: 235, endX: 540, dashY: 214, fontSize: 14, isBold: true });
  const brokerLabel = commercialSpecs?.broker_name || 'A SQUARED REAL ESTATE';
  drawField({ text: brokerLabel, startX: 715, endX: 960, dashY: 214, fontSize: 14, isBold: true });
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
