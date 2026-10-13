const puppeteer = require('c:/Users/Rishi D/.antigravity/extensions/dubai-real-estate-dashboard/Admin_dashboard/node_modules/puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  page.on('console', msg => console.log('LOG:', msg.text()));
  page.on('request', req => {
    if (req.url().includes('owners_data')) {
      console.log('REQ:', req.url().replace(/.*\/rest\/v1\/owners_data\?/, ''));
    }
  });

  await page.goto('https://admin.asquared.ae/dashboard/#search', { waitUntil: 'networkidle2' });
  
  const input = await page.$('input[type="text"]');
  await input.type('lead 1433897', { delay: 20 });
  await input.press('Enter');
  await new Promise(r => setTimeout(r, 3000));

  const cards = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('div[class*="hover:border-emerald-400"]')).map(c => {
      const name = c.querySelector('span.text-base.font-bold')?.textContent.trim();
      const badges = Array.from(c.querySelectorAll('span.font-mono')).map(b => b.textContent.trim());
      return { name, badges };
    });
  });

  console.log('All filter with lead 1433897 cards:', cards);
  await browser.close();
})();
