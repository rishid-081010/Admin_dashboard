const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb, StandardFonts } = require(path.resolve(__dirname, '../client/node_modules/pdf-lib'));
const sharp = require(path.resolve(__dirname, '../server/node_modules/sharp'));
const { chromium } = require(path.resolve(__dirname, '../client/node_modules/playwright'));

(async () => {
  const templateBytes = fs.readFileSync(path.resolve(__dirname, '../client/src/assets/templates/A_SQUARED_Listing_Form_Rental_Template.pdf'));
  const pdfDoc = await PDFDocument.load(templateBytes);
  const page = pdfDoc.getPages()[0];
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const textColor = rgb(0.00, 0.09, 0.22); // Deep rich A-Squared Navy

  const drawField = ({
    text,
    startX,
    endX,
    dashY,
    fontSize = 13.5,
    isBold = true,
  }) => {
    if (!text && text !== 0) return;
    const cleanText = String(text).trim();
    if (!cleanText) return;

    const font = isBold ? fontBold : fontRegular;
    const maxTextWidth = endX - startX - 4;

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

    // Absolutely NO page.drawLine, NO extra underlines! Text sits 2.8pt above the native dashed line
    page.drawText(renderedText, {
      x: startX + 2,
      y: dashY + 2.8,
      size: currentFontSize,
      font,
      color: textColor,
    });
  };

  const drawCheckInsideBox = (xMin, yMin) => {
    // 12x12 box, perfectly centered checkmark
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

  // 1. Date
  drawField({ text: '20/10/2026', startX: 880, endX: 1025, dashY: 1460, fontSize: 14.5, isBold: true });

  // 2. Owner
  drawField({ text: 'abcdef', startX: 145, endX: 430, dashY: 1144, fontSize: 14, isBold: true });
  drawField({ text: '123456789', startX: 530, endX: 740, dashY: 1144, fontSize: 14, isBold: true });
  drawField({ text: 'United Arab Emirates', startX: 190, endX: 430, dashY: 1118, fontSize: 13, isBold: false });
  drawField({ text: 'abcde@gmail.com', startX: 520, endX: 765, dashY: 1118, fontSize: 13, isBold: false });

  // 3. Property Type Checkbox (Apartment)
  drawCheckInsideBox(83, 1013.8);

  // 4. Property Details Checkboxes
  drawCheckInsideBox(83, 883.0); // Vacant
  drawCheckInsideBox(335, 882.8); // Residential
  drawCheckInsideBox(617, 882.8); // Unfurnished

  // 5. Property Details Fields
  // Building name shortened using AI: "V3 Tower"
  // startX: 210, endX: 505 (safely before Community text starts at 515)
  drawField({ text: 'V3 Tower', startX: 210, endX: 505, dashY: 813, fontSize: 13.5, isBold: true });
  // Community: startX: 625, endX: 1030
  drawField({ text: 'Dubai', startX: 625, endX: 1030, dashY: 813, fontSize: 14, isBold: true });

  // Row 2: Unit, Bed, Bath, Parking: dashY = 779
  drawField({ text: '23456', startX: 130, endX: 215, dashY: 779, fontSize: 14, isBold: true });
  drawField({ text: '2 Bedrooms', startX: 350, endX: 485, dashY: 779, fontSize: 13, isBold: false });
  drawField({ text: '2 Baths', startX: 605, endX: 720, dashY: 779, fontSize: 13, isBold: false });
  drawField({ text: '1 Space', startX: 820, endX: 930, dashY: 779, fontSize: 13.5, isBold: true });

  // Row 3: BUA, Plot, Cheques: dashY = 744
  drawField({ text: '', startX: 130, endX: 225, dashY: 744, fontSize: 13, isBold: true });
  drawField({ text: '12345678', startX: 420, endX: 515, dashY: 744, fontSize: 13, isBold: false });
  drawField({ text: '4 Cheques', startX: 770, endX: 920, dashY: 744, fontSize: 13, isBold: false });

  // Row 4: Asking Price: dashY = 710
  drawField({ text: 'AED 12,345,678', startX: 195, endX: 740, dashY: 710, fontSize: 14.5, isBold: true });

  // 6. Terms Checkboxes
  drawCheckInsideBox(214, 530.8); // Non-Exclusive
  drawCheckInsideBox(452, 498.8); // 3 Month

  // 7. Signatures: dashY = 218
  drawField({ text: 'abcdef', startX: 235, endX: 540, dashY: 218, fontSize: 14, isBold: true });
  drawField({ text: 'A SQUARED REAL ESTATE', startX: 715, endX: 960, dashY: 218, fontSize: 14, isBold: true });

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(path.resolve(__dirname, 'test_clean_render.pdf'), pdfBytes);

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
  await (await bPage.$('#c')).screenshot({ path: path.resolve(__dirname, 'test_clean_render.png') });
  await browser.close();

  // Crop the exact Property Details area to compare directly with user screenshot!
  await sharp(path.resolve(__dirname, 'test_clean_render.png'))
    .extract({ left: 50, top: 480, width: 950, height: 420 })
    .toFile(path.resolve(__dirname, 'crop_clean_comparison.png'));

  console.log('Saved test_clean_render.png and crop_clean_comparison.png');
})();
