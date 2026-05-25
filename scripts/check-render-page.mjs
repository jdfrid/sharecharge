import { chromium } from 'playwright';

const url = process.argv[2] || 'https://sharecharge.onrender.com/';
const errors = [];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
});
page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));

await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 });
await page.waitForTimeout(5000);

const rootText = await page.locator('#root').innerText().catch(() => '');
const rootHtml = await page.locator('#root').innerHTML().catch(() => '');
const title = await page.title();
const href = page.url();

console.log(JSON.stringify({ title, href, rootText: rootText.slice(0, 500), rootHtml: rootHtml.slice(0, 800), errors }, null, 2));
await browser.close();
