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

  const textColor = rgb(0.00, 0.09, 0.22); // Deep rich A-Squared Navy (#001738)
  const white = rgb(1, 1, 1);
  const underlineColor = rgb(0.72, 0.76, 0.83); // Crisp subtle slate rule

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

    // Auto-scale font size if text is too wide so it NEVER overflows into adjacent columns
    let currentFontSize = fontSize;
    let textWidth = font.widthOfTextAtSize(cleanText, currentFontSize);
    while (textWidth > maxTextWidth && currentFontSize > 7.5) {
      currentFontSize -= 0.5;
      textWidth = font.widthOfTextAtSize(cleanText, currentFontSize);
    }

    // 1. Clean out the bitmap dashed line from the template
    page.drawRectangle({
      x: startX - 1,
      y: dashY - 3,
      width: endX - startX + 2,
      height: 7.5,
      color: white,
    });

    // 2. Draw a clean, crisp solid baseline rule across the field slot
    if (drawRule) {
      page.drawLine({
        start: { x: startX, y: dashY },
        end: { x: endX, y: dashY },
        thickness: 0.75,
        color: underlineColor,
      });
    }

    // 3. Draw text cleanly resting 2.5pt above the baseline rule (zero strikethrough!)
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

  // 1. DATE (Top-Right): X=845..970, dashY=1457
  drawField({
    text: '20/10/2026',
    startX: 845,
    endX: 970,
    dashY: 1457,
    fontSize: 15,
    isBold: true,
  });

  // 2. Owner / Landlord Details
  // Name: X=130..415, dashY=1146
  drawField({
    text: 'abcdef',
    startX: 130,
    endX: 415,
    dashY: 1146,
    fontSize: 14,
    isBold: true,
  });
  // Phone: X=505..740, dashY=1146
  drawField({
    text: '123456789',
    startX: 505,
    endX: 740,
    dashY: 1146,
    fontSize: 14,
    isBold: true,
  });
  // Nationality: X=165..415, dashY=1115
  drawField({
    text: 'United Arab Emirates',
    startX: 165,
    endX: 415,
    dashY: 1115,
    fontSize: 13,
    isBold: false,
  });
  // Email: X=495..770, dashY=1115
  drawField({
    text: 'abcde@gmail.com',
    startX: 495,
    endX: 770,
    dashY: 1115,
    fontSize: 13,
    isBold: false,
  });

  // 3. Property Type Checkboxes
  drawCheck(81, 1018); // Apartment

  // 4. Property Details Checkboxes
  drawCheck(81, 890); // Vacant
  drawCheck(333, 890); // Residential
  drawCheck(617, 890); // Unfurnished

  // 5. Property Details Fields: dashY=820
  // Building Name: X=200..565
  drawField({
    text: 'V3 TOWER Unit 1503 - Jumeirah Lakes Towers (JLT)',
    startX: 200,
    endX: 565,
    dashY: 820,
    fontSize: 13.5,
    isBold: true,
  });
  // Community: X=605..1030
  drawField({
    text: 'Dubai',
    startX: 605,
    endX: 1030,
    dashY: 820,
    fontSize: 14,
    isBold: true,
  });

  // Row 2: Unit, Bedroom, Bathroom, Parking: dashY=782
  // Unit: X=115..220
  drawField({
    text: '23456',
    startX: 115,
    endX: 220,
    dashY: 782,
    fontSize: 14,
    isBold: true,
  });
  // Bedroom: X=305..430
  drawField({
    text: '2 Bedrooms',
    startX: 305,
    endX: 430,
    dashY: 782,
    fontSize: 13,
    isBold: false,
  });
  // Bathroom: X=520..645
  drawField({
    text: '2 Baths',
    startX: 520,
    endX: 645,
    dashY: 782,
    fontSize: 13,
    isBold: false,
  });
  // Parking: X=720..900
  drawField({
    text: '1 Space',
    startX: 720,
    endX: 900,
    dashY: 782,
    fontSize: 13.5,
    isBold: true,
  });

  // Row 3: BUA, Plot Area, No. Of Cheques: dashY=743
  // BUA: X=115..220
  drawField({
    text: '',
    startX: 115,
    endX: 220,
    dashY: 743,
    fontSize: 13,
    isBold: true,
    drawRule: false,
  });
  // Plot Area: X=350..460
  drawField({
    text: '12345678',
    startX: 350,
    endX: 460,
    dashY: 743,
    fontSize: 13,
    isBold: false,
  });
  // No. Of Cheques: X=630..860
  drawField({
    text: '4 Cheques',
    startX: 630,
    endX: 860,
    dashY: 743,
    fontSize: 13,
    isBold: false,
  });

  // Row 4: Price (AED): dashY=705, X=175..740
  drawField({
    text: 'AED 12,345,678',
    startX: 175,
    endX: 740,
    dashY: 705,
    fontSize: 14.5,
    isBold: true,
  });

  // Terms Checkboxes
  drawCheck(210, 535); // Non-Exclusive
  drawCheck(455, 495); // 3 Month

  // Signatures: dashY=214
  // Seller / Landlord: X=210..540
  drawField({
    text: 'abcdef',
    startX: 210,
    endX: 540,
    dashY: 214,
    fontSize: 14,
    isBold: true,
  });
  // Agent: X=655..950
  drawField({
    text: 'A SQUARED REAL ESTATE',
    startX: 655,
    endX: 950,
    dashY: 214,
    fontSize: 14,
    isBold: true,
  });

  const pdfBytes = await pdfDoc.save();
  const outPdf = path.resolve(__dirname, 'ultimate_solution.pdf');
  fs.writeFileSync(outPdf, pdfBytes);

  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  });
  const pageChromium = await browser.newPage({ viewport: { width: 1120, height: 1583 } });
  await pageChromium.goto('file:///' + outPdf.replace(/\\/g, '/'));
  await pageChromium.waitForTimeout(1000);
  const outPng = path.resolve(__dirname, 'ultimate_solution.png');
  await pageChromium.screenshot({ path: outPng });
  await browser.close();
  console.log('Saved ultimate_solution.pdf and ultimate_solution.png');
})();
