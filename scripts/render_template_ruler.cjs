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
  const green = rgb(0, 0.6, 0);

  // Draw coordinate grid lines every 50 points from x=50 to 1050, y=100 to 1500
  for (let x = 100; x <= 1000; x += 100) {
    page.drawLine({
      start: { x, y: 150 },
      end: { x, y: 1500 },
      thickness: 0.4,
      color: rgb(0.85, 0.85, 0.95),
    });
    page.drawText(String(x), {
      x: x + 2,
      y: 160,
      size: 8,
      font: fontRegular,
      color: blue,
    });
    page.drawText(String(x), {
      x: x + 2,
      y: 850,
      size: 8,
      font: fontRegular,
      color: blue,
    });
    page.drawText(String(x), {
      x: x + 2,
      y: 1200,
      size: 8,
      font: fontRegular,
      color: blue,
    });
  }

  for (let y = 150; y <= 1500; y += 50) {
    page.drawLine({
      start: { x: 50, y },
      end: { x: 1050, y },
      thickness: 0.4,
      color: rgb(0.85, 0.85, 0.95),
    });
    page.drawText('Y=' + y, {
      x: 52,
      y: y + 2,
      size: 7,
      font: fontRegular,
      color: red,
    });
    page.drawText('Y=' + y, {
      x: 1052,
      y: y + 2,
      size: 7,
      font: fontRegular,
      color: red,
    });
  }

  const pdfBytes = await pdfDoc.save();
  const outPdf = path.resolve(__dirname, 'template_ruler.pdf');
  fs.writeFileSync(outPdf, pdfBytes);

  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  });
  const pageChromium = await browser.newPage({ viewport: { width: 1120, height: 1583 } });
  await pageChromium.goto('file:///' + outPdf.replace(/\\/g, '/'));
  await pageChromium.waitForTimeout(1000);
  const outPng = path.resolve(__dirname, 'template_ruler.png');
  await pageChromium.screenshot({ path: outPng });
  await browser.close();
  console.log('Saved template_ruler.png');
})();
