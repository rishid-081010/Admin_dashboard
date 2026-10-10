const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', error => console.log('BROWSER ERROR:', error.message));

  console.log("Navigating...");
  await page.goto('http://localhost:4175/');
  
  await page.waitForTimeout(2000);
  console.log("Clicking Owners Directory tab...");
  await page.getByText('Owners Directory').click();
  
  await page.waitForTimeout(2000);
  
  console.log("Clicking page 2...");
  await page.getByRole('button', { name: '2', exact: true }).click();
  
  await page.waitForTimeout(4000);
  
  // Try to find the word 'Loading' or 'Vikranth' or something
  const text = await page.content();
  if (text.includes("Vikranth") || text.includes("Properties") || text.includes("Showing")) {
      console.log("PAGE 2 LOADED SUCCESSFULLY!");
  } else {
      console.log("COULD NOT FIND PAGE 2 DATA!");
  }
  
  await browser.close();
})();
