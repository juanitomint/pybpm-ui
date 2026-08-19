import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: true });
let context = await browser.newContext();
let page = await context.newPage();

// Capture console messages for debugging
page.on('console', msg => {
  if (msg.type() === 'error') {
    console.log(`JS ERROR: ${msg.text()}`);
  } else if (msg.text().includes('[useAuth]') || msg.text().includes('[API Client]')) {
    console.log(`${msg.type()}: ${msg.text()}`);
  }
});

// Capture API requests to verify auth flow
page.on('request', request => {
  if (request.url().includes('/api/v1/')) {
    const urlPath = request.url().split('/api')[1] || '/api';
    console.log(`REQUEST: ${request.method()} ${urlPath}`);
  }
});

console.log('=== Testing Login Flow with admin/admin ===');
await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });

// Wait for inputs to be available
const usernameInput = await page.waitForSelector('form input[type="text"]', { timeout: 10000 });
console.log('✓ Form loaded successfully');

await usernameInput.fill('admin');
console.log('✓ Username filled');

await page.locator('form input[type="password"]').fill('admin');
console.log('✓ Password filled');

// Click submit button
console.log('\nClicking Sign In button...');
await page.click('button[type="submit"]', { timeout: 5000 });

// Wait for redirect to dashboard (window.location.href)
try {
  await page.waitForURL(/\/dashboard/, { timeout: 15000 });
  console.log(`\n✓ SUCCESS - Redirected to dashboard`);
  console.log(`Current URL: ${page.url()}`);
  
  // Verify dashboard loaded successfully
  const dashboardTitle = await page.evaluate(() => 
    document.querySelector('h1, h2')?.textContent || 'Dashboard'
  );
  console.log(`✓ Dashboard title: ${dashboardTitle}`);
  
} catch (e) {
  console.log(`\n✗ FAILED - Still on: ${page.url()}`);
  
  // Check for errors
  const hasToken = await page.evaluate(() => !!localStorage.getItem('token'));
  console.log(`Token in localStorage: ${hasToken}`);
  
  const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 500));
  console.log('Page content:', bodyText);
}

await browser.close();
console.log('\n=== Test Complete ===');
