const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb, StandardFonts } = require(path.resolve(__dirname, '../client/node_modules/pdf-lib'));
const sharp = require(path.resolve(__dirname, '../server/node_modules/sharp'));
const { chromium } = require(path.resolve(__dirname, '../client/node_modules/playwright'));

function cleanBuildingNameOffline(str) {
  if (!str) return '';
  let s = String(str).trim();
  s = s.replace(/\b(?:Unit|Apt|Apartment|Flat|Villa|Office|Penthouse|Suite|Plot|#)\s*[\w\d-]+/gi, '');
  const parts = s.split(/[-–—|]/);
  s = (parts[0] || s).trim();
  s = s.replace(/[,\s]+$/, '').replace(/^\s*,\s*/, '');
  if (s === s.toUpperCase() && s.length > 3) {
    s = s.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }
  return s.slice(0, 25).trim();
}

function sanitizeWinAnsi(str, fallback = '') {
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

    let currentFontSize = fontSize;
    let textWidth = font.widthOfTextAtSize(cleanText, currentFontSize);
    while (textWidth > maxTextWidth && currentFontSize > 7.0) {
      currentFontSize -= 0.5;
      textWidth = font.widthOfTextAtSize(cleanText, currentFontSize);
    }

    let renderedText = cleanText;
    if (textWidth > maxTextWidth) {
      while (renderedText.length > 3 && font.widthOfTextAtSize(renderedText + '...', currentFontSize) > maxTextWidth) {
        renderedText = renderedText.slice(0, -1);
      }
      renderedText += '...';
    }

    page.drawText(renderedText, {
      x: startX + 2,
      y: dashY + 2.8,
      size: currentFontSize,
      font,
      color: textColor,
    });
  };

  const drawCheck = (xMin, yMin) => {
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
  };

  // Date
  drawField({ text: commercialSpecs.form_date, startX: 880, endX: 1025, dashY: 1460, fontSize: 14.5, isBold: true });

  // Owner
  drawField({ text: commercialSpecs.owner_name, startX: 145, endX: 430, dashY: 1144, fontSize: 14, isBold: true });
  drawField({ text: commercialSpecs.owner_phone, startX: 530, endX: 740, dashY: 1144, fontSize: 14, isBold: true });
  drawField({ text: commercialSpecs.owner_nationality, startX: 190, endX: 430, dashY: 1118, fontSize: 13, isBold: false });
  drawField({ text: commercialSpecs.owner_email, startX: 520, endX: 765, dashY: 1118, fontSize: 13, isBold: false });

  // Checkboxes
  drawCheck(83, 1013.8); // Apartment
  drawCheck(83, 883.0); // Vacant
  drawCheck(335, 882.8); // Residential
  drawCheck(617, 882.8); // Unfurnished

  // Clean building name automatically
  const displayBuildingName = cleanBuildingNameOffline(commercialSpecs.building_name);

  // Property details
  drawField({ text: displayBuildingName, startX: 220, endX: 505, dashY: 813, fontSize: 13.5, isBold: true });
  drawField({ text: commercialSpecs.community, startX: 625, endX: 1030, dashY: 813, fontSize: 14, isBold: true });

  drawField({ text: commercialSpecs.unit_number, startX: 130, endX: 215, dashY: 779, fontSize: 14, isBold: true });
  drawField({ text: commercialSpecs.bedrooms, startX: 350, endX: 485, dashY: 779, fontSize: 13, isBold: false });
  drawField({ text: commercialSpecs.bathrooms, startX: 605, endX: 720, dashY: 779, fontSize: 13, isBold: false });
  drawField({ text: commercialSpecs.parking_bays, startX: 820, endX: 930, dashY: 779, fontSize: 13.5, isBold: true });

  drawField({ text: commercialSpecs.bua_sqft, startX: 130, endX: 225, dashY: 744, fontSize: 13, isBold: true });
  drawField({ text: commercialSpecs.plot_area, startX: 420, endX: 515, dashY: 744, fontSize: 13, isBold: false });
  drawField({ text: commercialSpecs.cheques, startX: 770, endX: 920, dashY: 744, fontSize: 13, isBold: false });

  drawField({ text: 'AED 12,345,678', startX: 195, endX: 740, dashY: 710, fontSize: 14.5, isBold: true });

  // Terms
  drawCheck(214, 530.8); // Non-Exclusive
  drawCheck(452, 498.8); // 3 Month

  // Signatures
  drawField({ text: commercialSpecs.owner_name, startX: 235, endX: 540, dashY: 218, fontSize: 14, isBold: true });
  drawField({ text: commercialSpecs.broker_name, startX: 715, endX: 960, dashY: 218, fontSize: 14, isBold: true });

  const pdfBytes = await pdfDoc.save();
  const outPdf = path.resolve(__dirname, 'final_verified.pdf');
  fs.writeFileSync(outPdf, pdfBytes);

  // Render via playwright
  const pdfBase64 = Buffer.from(pdfBytes).toString('base64');
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const bPage = await browser.newPage();
  await bPage.setContent(`
    <!DOCTYPE html>
    <html><head><script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script></head>
    <body style="margin:0"><canvas id="c"></canvas>
    <script>
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      pdfjsLib.getDocument({ data: atob("${pdfBase64}") }).promise.then(async pdf => {
        const page = await pdf.getPage(1);
        const vp = page.getViewport({ scale: 1.0 });
        const c = document.getElementById('c');
        c.width = vp.width; c.height = vp.height;
        await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
        window.D = true;
      });
    </script></body></html>
  `);
  await bPage.waitForFunction(() => window.D === true);
  const outPng = path.resolve(__dirname, 'final_verified.png');
  await (await bPage.$('#c')).screenshot({ path: outPng });
  await browser.close();

  // Crop exact matching area to user screenshot
  await sharp(outPng)
    .extract({ left: 40, top: 460, width: 980, height: 460 })
    .toFile(path.resolve(__dirname, 'final_verified_crop.png'));

  console.log('Saved final_verified.pdf, final_verified.png, and final_verified_crop.png');
})();
