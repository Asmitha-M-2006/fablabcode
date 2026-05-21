import { chromium } from 'playwright';
const browser = await chromium.launch();

// iPhone 14 size
const page = await browser.newPage();
await page.setViewportSize({ width: 390, height: 844 });
await page.goto('http://localhost:5173');
await page.waitForLoadState('networkidle');

// Home page mobile
await page.screenshot({ path: '/tmp/mobile-home.png' });

// Sandbox mobile
await page.click('button:has-text("AI Sandbox")');
await page.waitForTimeout(400);
await page.screenshot({ path: '/tmp/mobile-sandbox.png' });

// History mobile
await page.click('button:has-text("History")');
await page.waitForTimeout(400);
await page.screenshot({ path: '/tmp/mobile-history.png' });

// G-code mobile
await page.click('button:has-text("G-code Lab")');
await page.waitForTimeout(400);
await page.screenshot({ path: '/tmp/mobile-gcode.png' });

await browser.close();
console.log('done');
