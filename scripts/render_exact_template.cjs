const fs = require('fs');
const path = require('path');
const { chromium } = require(path.resolve(__dirname, '../client/node_modules/playwright'));

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  });
  const page = await browser.newPage();
  
  const templatePdfBase64 = fs.readFileSync(path.resolve(__dirname, '../client/src/assets/templates/A_SQUARED_Listing_Form_Rental_Template.pdf')).toString('base64');
  
  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
    <style>body { margin: 0; padding: 0; background: white; }</style>
  </head>
  <body>
    <canvas id="pdfCanvas"></canvas>
    <script>
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      const pdfData = atob("${templatePdfBase64}");
      const loadingTask = pdfjsLib.getDocument({ data: pdfData });
      loadingTask.promise.then(async (pdf) => {
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1.0 });
        const canvas = document.getElementById('pdfCanvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport: viewport }).promise;
        window.RENDER_DONE = true;
      }).catch(err => {
        window.RENDER_ERROR = err.message;
      });
    </script>
  </body>
  </html>
  `;

  await page.setContent(html);
  await page.waitForFunction(() => window.RENDER_DONE === true || window.RENDER_ERROR, { timeout: 15000 });
  const error = await page.evaluate(() => window.RENDER_ERROR);
  if (error) {
    console.error('Render error:', error);
    process.exit(1);
  }
  const canvasElement = await page.$('#pdfCanvas');
  const outPng = path.resolve(__dirname, 'exact_template_render.png');
  await canvasElement.screenshot({ path: outPng });
  console.log('Successfully rendered exact template to', outPng);
  await browser.close();
})();
