import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: true });
let context = await browser.newContext();
let page = await context.newPage();

// Capture ALL console messages including errors and warnings
page.on('console', msg => {
  if (msg.type() === 'error') {
    console.log(`ERROR: ${msg.text()}`);
  } else if (msg.type() === 'warning') {
    console.log(`WARN: ${msg.text()}`);
  }
});

// Capture all network responses with errors
page.on('response', response => {
  const url = response.url();
  if (!response.ok()) {
    console.log(`HTTP ERROR ${response.status()}: ${url.split('/api')[1] || '/api'}`);
  }
});

console.log('=== Full Flow Test ===');

// Step 1: Login with admin/admin
await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
console.log('\n--- Logging in ---');
const usernameInput = await page.waitForSelector('form input[type="text"]', { timeout: 5000 });
await usernameInput.fill('admin');
await page.locator('form input[type="password"]').fill('admin');
await page.click('button[type="submit"]', { timeout: 5000 });

// Wait for dashboard redirect
try {
  await page.waitForURL(/\/dashboard/, { timeout: 10000 });
  console.log('✓ Login successful, redirected to:', page.url());
} catch (e) {
  console.log(`✗ Failed to redirect. Current URL: ${page.url()}`);
}

// Step 2: Check for any issues on dashboard
await new Promise(r => setTimeout(r, 3000));
console.log('\n--- Checking dashboard state ---');
const hasErrors = await page.evaluate(() => {
  const errorElements = document.querySelectorAll('.error, .MuiAlert-root, [data-testid="error"]');
  return errorElements.length > 0;
});
console.log(`Has visible errors: ${hasErrors}`);

// Step 3: Check localStorage state
const localStorageState = await page.evaluate(() => {
  const token = localStorage.getItem('token');
  const theme = localStorage.getItem('theme');
  return { hasToken: !!token, tokenLength: token?.length || 0, theme };
});
console.log(`localStorage: ${JSON.stringify(localStorageState)}`);

// Step 4: Try loading inbox data to see if API calls work
console.log('\n--- Testing API calls ---');
try {
  const response = await page.evaluate(async () => {
    try {
      const res = await fetch('/api/v1/inbox/filter/', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      return { status: res.status, ok: res.ok };
    } catch (e) {
      return { error: e.message };
    }
  });
  console.log(`Inbox filter response:`, JSON.stringify(response));
} catch (e) {
  console.log('API call failed:', e.message);
}

await browser.close();
console.log('\n=== Test Complete ===');
