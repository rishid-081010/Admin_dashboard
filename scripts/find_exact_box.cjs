const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb, StandardFonts } = require(path.resolve(__dirname, '../client/node_modules/pdf-lib'));
const { chromium } = require(path.resolve(__dirname, '../client/node_modules/playwright'));

(async () => {
  const templateBytes = fs.readFileSync(path.resolve(__dirname, '../client/src/assets/templates/A_SQUARED_Listing_Form_Rental_Template.pdf'));
  const pdfDoc = await PDFDocument.load(templateBytes);
  const page = pdfDoc.getPages()[0];
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const red = rgb(1, 0, 0);
  const blue = rgb(0, 0, 1);
  const green = rgb(0, 0.8, 0);

  // Let's test checkbox placement at various X, Y
  // Currently: drawCheck(81, 1018) for Apartment
  // Let's draw colored boxes or ticks at (81, 1018), (83, 1018), (85, 1018), etc.
  // And for Vacant: currently (81, 890).
  // Let's draw horizontal lines from y=1010 to 1030 with labels, and vertical lines from x=75 to 100
  for (let x = 75; x <= 100; x += 2) {
    page.drawLine({
      start: { x, y: 1010 },
      end: { x, y: 1030 },
      thickness: 0.3,
      color: x % 10 === 0 ? blue : red,
    });
    if (x % 5 === 0) {
      page.drawText(String(x), { x: x - 3, y: 1032, size: 5, font: fontRegular, color: blue });
    }
  }

  for (let y = 1010; y <= 1030; y += 2) {
    page.drawLine({
      start: { x: 75, y },
      end: { x: 100, y },
      thickness: 0.3,
      color: y % 10 === 0 ? blue : green,
    });
    if (y % 5 === 0) {
      page.drawText(String(y), { x: 65, y: y - 2, size: 5, font: fontRegular, color: green });
    }
  }

  // Same for Vacant around y=880 to 905
  for (let x = 75; x <= 100; x += 2) {
    page.drawLine({
      start: { x, y: 880 },
      end: { x, y: 905 },
      thickness: 0.3,
      color: x % 10 === 0 ? blue : red,
    });
    if (x % 5 === 0) {
      page.drawText(String(x), { x: x - 3, y: 907, size: 5, font: fontRegular, color: blue });
    }
  }

  for (let y = 880; y <= 905; y += 2) {
    page.drawLine({
      start: { x: 75, y },
      end: { x: 100, y },
      thickness: 0.3,
      color: y % 10 === 0 ? blue : green,
    });
    if (y % 5 === 0) {
      page.drawText(String(y), { x: 65, y: y - 2, size: 5, font: fontRegular, color: green });
    }
  }

  const pdfBytes = await pdfDoc.save();
  const outPdf = path.resolve(__dirname, 'checkbox_grid.pdf');
  fs.writeFileSync(outPdf, pdfBytes);

  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  });
  const pageChromium = await browser.newPage({ viewport: { width: 1120, height: 1583 } });
  await pageChromium.goto('file:///' + outPdf.replace(/\\/g, '/'));
  await pageChromium.waitForTimeout(1000);
  const outPng = path.resolve(__dirname, 'checkbox_grid.png');
  await pageChromium.screenshot({ path: outPng });
  await browser.close();
  console.log('Saved checkbox_grid.png');
})();
