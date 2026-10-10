const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', error => console.log('BROWSER ERROR:', error.message));

  console.log("Navigating...");
  await page.goto('http://localhost:4173/');
  
  // Wait for the "Owners Directory" button to exist and click it
  await page.waitForTimeout(1000);
  console.log("Clicking Owners Directory tab...");
  await page.getByText('Owners Directory').click();
  
  await page.waitForTimeout(2000);
  
  console.log("Clicking page 2...");
  // The pagination button for '2' is likely just a button with text '2'
  await page.getByRole('button', { name: '2', exact: true }).click();
  
  await page.waitForTimeout(2000);
  console.log("Done waiting.");
  
  await browser.close();
})();
