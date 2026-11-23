const { chromium } = require('C:/Users/moham/.gemini/antigravity/scratch/Admin_dashboard_cloned/client/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  
  await page.goto('http://localhost:3000/#/dashboard/roles', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  const btn = page.locator('button', { hasText: 'User Accounts' });
  await btn.focus();
  await page.screenshot({ path: 'C:/Users/moham/.gemini/antigravity/brain/f1d23590-5808-4443-9981-330d435f8c49/test_focus_button.png' });

  const styles = await btn.evaluate(el => {
    const s = window.getComputedStyle(el);
    return {
      outline: s.outline,
      outlineColor: s.outlineColor,
      outlineStyle: s.outlineStyle,
      outlineWidth: s.outlineWidth,
      boxShadow: s.boxShadow,
      border: s.border,
      borderRadius: s.borderRadius
    };
  });
  console.log('Button computed styles on focus:', JSON.stringify(styles, null, 2));

  await browser.close();
})();
