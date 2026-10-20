const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb, StandardFonts } = require(path.resolve(__dirname, '../client/node_modules/pdf-lib'));
const { chromium } = require(path.resolve(__dirname, '../client/node_modules/playwright'));

(async () => {
  const templateBytes = fs.readFileSync(path.resolve(__dirname, '../client/src/assets/templates/A_SQUARED_Listing_Form_Rental_Template.pdf'));
  const pdfDoc = await PDFDocument.load(templateBytes);
  const page = pdfDoc.getPages()[0];
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const commercialSpecs = {
    form_date: '20/10/2026',
    owner_name: 'abcdef',
    owner_phone: '123456789',
    owner_nationality: 'United Arab Emirates',
    owner_email: 'abcde@gmail.com',
    property_type: 'Apartment',
    occupancy_status: 'Vacant',
    category: 'Residential',
    furnishing: 'Unfurnished',
    building_name: 'V3 TOWER Unit 1503 - Jumeirah Lakes Towers (JLT)',
    community: 'Dubai',
    unit_number: '23456',
    bedrooms: '2 Bedrooms',
    bathrooms: '2 Baths',
    parking_bays: '1 Space',
    bua_sqft: '',
    plot_area: '12345678',
    cheques: '4 Cheques',
    price: '12345678',
    agreement_type: 'Non-Exclusive',
    agreement_duration: '3 Month',
    broker_name: 'A SQUARED REAL ESTATE',
  };

  const textColor = rgb(0.00, 0.09, 0.22);
  const white = rgb(1, 1, 1);
  const underlineColor = rgb(0.72, 0.76, 0.83);

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
    const cleanText = String(text).trim();
    if (!cleanText) return;

    const font = isBold ? fontBold : fontRegular;
    const maxTextWidth = endX - startX - 4;

    let currentFontSize = fontSize;
    let textWidth = font.widthOfTextAtSize(cleanText, currentFontSize);
    while (textWidth > maxTextWidth && currentFontSize > 7.5) {
      currentFontSize -= 0.5;
      textWidth = font.widthOfTextAtSize(cleanText, currentFontSize);
    }

    page.drawRectangle({
      x: startX - 1,
      y: dashY - 3,
      width: endX - startX + 2,
      height: 7.5,
      color: white,
    });

    if (drawRule) {
      page.drawLine({
        start: { x: startX, y: dashY },
        end: { x: endX, y: dashY },
        thickness: 0.75,
        color: underlineColor,
      });
    }

    page.drawText(cleanText, {
      x: startX + 2,
      y: dashY + 2.5,
      size: currentFontSize,
      font,
      color: textColor,
    });
  };

  const drawCheck = (boxX, boxY) => {
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
  };

  // 1. Date
  drawField({ text: commercialSpecs.form_date, startX: 880, endX: 1025, dashY: 1457, fontSize: 15, isBold: true });

  // 2. Owner / Landlord Details
  drawField({ text: commercialSpecs.owner_name, startX: 145, endX: 430, dashY: 1146, fontSize: 14, isBold: true });
  drawField({ text: commercialSpecs.owner_phone, startX: 530, endX: 740, dashY: 1146, fontSize: 14, isBold: true });
  drawField({ text: commercialSpecs.owner_nationality, startX: 190, endX: 430, dashY: 1115, fontSize: 13, isBold: false });
  drawField({ text: commercialSpecs.owner_email, startX: 520, endX: 765, dashY: 1115, fontSize: 13, isBold: false });

  // 3. Checkboxes
  drawCheck(81, 1018); // Apartment
  drawCheck(81, 890); // Vacant
  drawCheck(333, 890); // Residential
  drawCheck(617, 890); // Unfurnished

  // 4. Property Details Text Fields
  drawField({ text: commercialSpecs.building_name, startX: 215, endX: 565, dashY: 820, fontSize: 13.5, isBold: true });
  drawField({ text: commercialSpecs.community, startX: 665, endX: 1030, dashY: 820, fontSize: 14, isBold: true });

  drawField({ text: commercialSpecs.unit_number, startX: 130, endX: 225, dashY: 782, fontSize: 14, isBold: true });
  drawField({ text: commercialSpecs.bedrooms, startX: 350, endX: 485, dashY: 782, fontSize: 13, isBold: false });
  drawField({ text: commercialSpecs.bathrooms, startX: 605, endX: 720, dashY: 782, fontSize: 13, isBold: false });
  drawField({ text: commercialSpecs.parking_bays, startX: 820, endX: 930, dashY: 782, fontSize: 13.5, isBold: true });

  drawField({ text: commercialSpecs.bua_sqft, startX: 130, endX: 225, dashY: 741, fontSize: 13, isBold: true, drawRule: !!commercialSpecs.bua_sqft });
  drawField({ text: commercialSpecs.plot_area, startX: 420, endX: 515, dashY: 741, fontSize: 13, isBold: false, drawRule: !!commercialSpecs.plot_area });
  drawField({ text: commercialSpecs.cheques, startX: 770, endX: 920, dashY: 741, fontSize: 13, isBold: false });

  drawField({ text: 'AED 12,345,678', startX: 195, endX: 740, dashY: 705, fontSize: 14.5, isBold: true });

  // 5. Terms Checkboxes
  drawCheck(210, 535); // Non-Exclusive
  drawCheck(455, 495); // 3 Month

  // 6. Signatures
  drawField({ text: commercialSpecs.owner_name, startX: 235, endX: 540, dashY: 214, fontSize: 14, isBold: true });
  drawField({ text: commercialSpecs.broker_name, startX: 715, endX: 960, dashY: 214, fontSize: 14, isBold: true });

  const pdfBytes = await pdfDoc.save();
  const outPdf = path.resolve(__dirname, 'production_verified.pdf');
  fs.writeFileSync(outPdf, pdfBytes);

  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  });
  const pageChromium = await browser.newPage({ viewport: { width: 1120, height: 1583 } });
  await pageChromium.goto('file:///' + outPdf.replace(/\\/g, '/'));
  await pageChromium.waitForTimeout(1000);
  const outPng = path.resolve(__dirname, 'production_verified.png');
  await pageChromium.screenshot({ path: outPng });
  await browser.close();
  console.log('Saved updated production_verified.pdf and production_verified.png');
})();
