import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import templatePdfAssetUrl from '../assets/templates/A_SQUARED_Listing_Form_Rental_Template.pdf';

/**
 * Format helper for currency
 */
export function formatCurrency(amount) {
  if (!amount) return 'Price on Application';
  const num = Number(String(amount).replace(/[^0-9.]/g, ''));
  if (isNaN(num) || num === 0) return sanitizeWinAnsi(String(amount), 'Price on Application');
  return 'AED ' + num.toLocaleString('en-US');
}

/**
 * Sanitize text to ensure only characters encodable by Standard Helvetica (WinAnsi) are passed
 */
export function sanitizeWinAnsi(str, fallback = '') {
  if (!str) return fallback;
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
  const textColor = rgb(0.06, 0.10, 0.20);

  const drawText = (text, x, y, size = 15, isBold = false) => {
    if (!text) return;
    try {
      page.drawText(sanitizeWinAnsi(String(text)), {
        x,
        y,
        size,
        font: isBold ? fontBold : fontRegular,
        color: textColor,
      });
    } catch (e) {
      console.warn('Error drawing text:', text, e);
    }
  };

  const drawCheck = (boxX, boxY) => {
    try {
      // Exact center inside the 16x16 checkbox box
      page.drawLine({
        start: { x: boxX + 2, y: boxY + 6 },
        end: { x: boxX + 6, y: boxY + 1 },
        thickness: 2.2,
        color: textColor,
      });
      page.drawLine({
        start: { x: boxX + 6, y: boxY + 1 },
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
  drawText(dateStr, 880, 1466, 16, true);

  // 2. Owner / Landlord Details
  const ownerName = commercialSpecs?.owner_name || titleDeedData?.owner_name_english || emiratesIdData?.full_name_english || '';
  const phone = commercialSpecs?.owner_phone || emiratesIdData?.phone || '';
  const nationality = commercialSpecs?.owner_nationality || emiratesIdData?.nationality || titleDeedData?.nationality || '';
  const email = commercialSpecs?.owner_email || '';

  drawText(ownerName, 145, 1147, 15, true);
  drawText(phone, 520, 1147, 15, true);
  drawText(nationality, 190, 1116, 15, false);
  drawText(email, 520, 1116, 15, false);

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
  const buildingName = commercialSpecs?.building_name || titleDeedData?.building_name || listing?.name || '';
  const community = commercialSpecs?.community || titleDeedData?.community || '';
  const unitNumber = commercialSpecs?.unit_number || titleDeedData?.unit_number || '';
  const bedrooms = commercialSpecs?.bedrooms || listing?.propertySpecs?.bedrooms || listing?.bedrooms || '';
  const bathrooms = commercialSpecs?.bathrooms || listing?.propertySpecs?.bathrooms || listing?.bathrooms || '';
  const parking = commercialSpecs?.parking_bays || commercialSpecs?.parking || titleDeedData?.parking_bays?.[0] || '1 Space';
  const buaSqft = commercialSpecs?.bua_sqft ? String(commercialSpecs.bua_sqft) : (titleDeedData?.total_area_sqft ? String(titleDeedData.total_area_sqft) : (titleDeedData?.suite_area_sqft ? String(titleDeedData.suite_area_sqft) : ''));
  const plotArea = commercialSpecs?.plot_area || (titleDeedData?.plot_number ? String(titleDeedData.plot_number) : '00');
  const rawPrice = commercialSpecs?.price || commercialSpecs?.asking_price || listing?.price || '';
  const askingPrice = rawPrice ? (String(rawPrice).toLowerCase().includes('aed') ? String(rawPrice) : formatCurrency(rawPrice)) : '';
  const cheques = commercialSpecs?.cheques || '1 - 4 Cheques';

  drawText(buildingName, 220, 820, 15, true);
  drawText(community, 645, 820, 15, true);
  drawText(unitNumber, 135, 782, 15, true);
  drawText(bedrooms, 365, 782, 15, false);
  drawText(bathrooms, 615, 782, 15, false);
  drawText(parking, 860, 782, 15, true);

  drawText(buaSqft, 135, 741, 15, true);
  drawText(plotArea, 425, 741, 15, false);
  drawText(cheques, 820, 741, 15, false);

  drawText(askingPrice, 205, 705, 15, true);

  // 5. Terms Checkboxes
  const isExclusive = (commercialSpecs?.agreement_type || '').toLowerCase().includes('exclusive') && !(commercialSpecs?.agreement_type || '').toLowerCase().includes('non');
  if (isExclusive) {
    drawCheck(81, 535); // Exclusive
  } else {
    drawCheck(210, 535); // Non-Exclusive
  }

  // Exact 4 duration options matching official template
  const duration = (commercialSpecs?.agreement_duration || '').toString().toLowerCase();
  const untilDate = commercialSpecs?.agreement_until_date || commercialSpecs?.until_date || '';

  if (duration.includes('1 month') || duration === '1m') {
    drawCheck(210, 495); // 1 Month
  } else if (duration.includes('2 month') || duration === '2m') {
    drawCheck(346, 495); // 2 Month
  } else if (duration.includes('until') || untilDate) {
    drawCheck(585, 495); // Or Until checkbox
    if (untilDate) {
      drawText(untilDate, 670, 495, 14, true); // Stamped directly on the line
    }
  } else {
    drawCheck(455, 495); // 3 Month (default)
  }

  // 6. Signatures
  drawText(ownerName, 255, 214, 15, true);
  const brokerLabel = commercialSpecs?.broker_name || 'A SQUARED REAL ESTATE';
  // Starts after "Agent: " at X=725 to avoid colliding with printed word "Agent"
  drawText(brokerLabel, 725, 214, 15, true);
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
