const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb } = require(path.resolve(__dirname, '../client/node_modules/pdf-lib'));
const sharp = require(path.resolve(__dirname, '../server/node_modules/sharp'));
const { chromium } = require(path.resolve(__dirname, '../client/node_modules/playwright'));

(async () => {
  const templateBytes = fs.readFileSync(path.resolve(__dirname, '../client/src/assets/templates/A_SQUARED_Listing_Form_Rental_Template.pdf'));
  const pdfDoc = await PDFDocument.load(templateBytes);
  const page = pdfDoc.getPages()[0];
  const textColor = rgb(0.00, 0.09, 0.22);

  // drawCheckInsideBox: xMin is left border of box, yMin is bottom border of box
  const drawCheckInsideBox = (xMin, yMin) => {
    // Box is 12x12 (outer borders: xMin..xMin+12, yMin..yMin+12)
    // Checkmark:
    // Left tip: (xMin + 2.5, yMin + 5.5)
    // Vertex: (xMin + 5.0, yMin + 2.8)
    // Right tip: (xMin + 9.8, yMin + 9.5)
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

  // Apartment: xMin=83, yMin=1013.8
  drawCheckInsideBox(83, 1013.8);
  // Vacant: xMin=83, yMin=883.8
  drawCheckInsideBox(83, 883.8);
  // Residential: xMin=335, yMin=882.8
  drawCheckInsideBox(335, 882.8);
  // Unfurnished: xMin=617, yMin=882.8
  drawCheckInsideBox(617, 882.8);
  // Villa: xMin=229, yMin=1013.8
  drawCheckInsideBox(229, 1013.8);

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(path.resolve(__dirname, 'test_check_render.pdf'), pdfBytes);

  // Render via playwright pdfjs
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
  await (await bPage.$('#c')).screenshot({ path: path.resolve(__dirname, 'test_check_render.png') });
  await browser.close();

  // Crop Apartment and Vacant
  await sharp(path.resolve(__dirname, 'test_check_render.png')).extract({ left: 75, top: 550, width: 35, height: 30 }).toFile(path.resolve(__dirname, 'crop_apt_checked.png'));
  await sharp(path.resolve(__dirname, 'test_check_render.png')).extract({ left: 75, top: 680, width: 35, height: 30 }).toFile(path.resolve(__dirname, 'crop_vacant_checked.png'));
  await sharp(path.resolve(__dirname, 'test_check_render.png')).extract({ left: 325, top: 680, width: 35, height: 30 }).toFile(path.resolve(__dirname, 'crop_residential_checked.png'));
  await sharp(path.resolve(__dirname, 'test_check_render.png')).extract({ left: 605, top: 680, width: 35, height: 30 }).toFile(path.resolve(__dirname, 'crop_unfurnished_checked.png'));
  console.log('Saved crops for checked boxes');
})();
