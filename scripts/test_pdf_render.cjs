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

  // Sample data identical to user test
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
    parking: '1 Space',
    bua_sqft: '',
    plot_area: '12345678',
    cheques: '4 Cheques',
    price: '12345678',
    agreement_type: 'Non-Exclusive',
    agreement_duration: '3 Month',
    broker_name: 'A SQUARED REAL ESTATE',
  };

  // Helper from rentalFormPdfClient
  const textColor = rgb(0.06, 0.10, 0.20);
  const drawText = (text, x, y, size = 15, isBold = false) => {
    if (!text) return;
    page.drawText(String(text), {
      x,
      y,
      size,
      font: isBold ? fontBold : fontRegular,
      color: textColor,
    });
  };

  const drawCheck = (boxX, boxY) => {
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
  };

  // Currently:
  drawText('20/10/2026', 880, 1466, 16, true);
  drawText('abcdef', 145, 1147, 15, true);
  drawText('123456789', 520, 1147, 15, true);
  drawText('United Arab Emirates', 190, 1116, 15, false);
  drawText('abcde@gmail.com', 520, 1116, 15, false);

  drawCheck(81, 1018); // Apt
  drawCheck(81, 890); // Vacant
  drawCheck(333, 890); // Residential
  drawCheck(617, 890); // Unfurnished

  drawText('V3 TOWER Unit 1503 - Jumeirah Lakes Towers (JLT)', 220, 820, 15, true);
  drawText('Dubai', 645, 820, 15, true);
  drawText('23456', 135, 782, 15, true);
  drawText('2 Bedrooms', 365, 782, 15, false);
  drawText('2 Baths', 615, 782, 15, false);
  drawText('1 Space', 860, 782, 15, true);

  drawText('', 135, 741, 15, true);
  drawText('12345678', 425, 741, 15, false);
  drawText('4 Cheques', 820, 741, 15, false);
  drawText('AED 12,345,678', 205, 705, 15, true);

  drawCheck(210, 535); // Non-Exclusive
  drawCheck(455, 495); // 3 Month

  drawText('abcdef', 255, 214, 15, true);
  drawText('A SQUARED REAL ESTATE', 725, 214, 15, true);

  const pdfBytes = await pdfDoc.save();
  const outPdf = path.resolve(__dirname, 'baseline_test.pdf');
  fs.writeFileSync(outPdf, pdfBytes);
  console.log('Saved baseline_test.pdf');

  // Launch Chrome with Playwright and screenshot
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  });
  const pageChromium = await browser.newPage({
    viewport: { width: 1120, height: 1583 }
  });
  await pageChromium.goto('file:///' + outPdf.replace(/\\/g, '/'));
  await pageChromium.waitForTimeout(1000);
  const outPng = path.resolve(__dirname, 'baseline_test.png');
  await pageChromium.screenshot({ path: outPng });
  console.log('Saved baseline_test.png');
  await browser.close();
})();
