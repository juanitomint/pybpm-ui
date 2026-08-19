import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: true });
let context = await browser.newContext();
let page = await context.newPage();

// Capture all console messages with details
page.on('console', msg => {
  if (msg.type() === 'error') {
    console.log(`ERROR: ${msg.text()}`);
  } else if (msg.type() === 'warning') {
    console.log(`WARN: ${msg.text()}`);
  } else if (msg.text().includes('[API Client]')) {
    console.log(`${msg.type()}: ${msg.text()}`);
  }
});

// Capture all network requests with full URLs
page.on('request', request => {
  const url = request.url();
  if (url.includes('/api/') || url.includes('localhost:5000')) {
    console.log(`NETWORK REQUEST: ${request.method()} ${url}`);
  }
});

console.log('=== Testing direct API access ===');
await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });

// Login with admin/admin
const usernameInput = await page.waitForSelector('form input[type="text"]', { timeout: 5000 });
await usernameInput.fill('admin');
await page.locator('form input[type="password"]').fill('admin');
await page.click('button[type="submit"]', { timeout: 5000 });

// Wait for login to complete
try {
  await page.waitForURL(/\/dashboard/, { timeout: 10000 });
  console.log('✓ Login successful, redirected to:', page.url());
} catch (e) {
  console.log(`✗ Failed to redirect. Current URL: ${page.url()}`);
}

// Now test inbox filter directly with fetch using localStorage token
console.log('\n--- Testing inbox filter ---');
const result = await page.evaluate(async () => {
  const token = localStorage.getItem('token');
  if (!token) return { error: 'No token in localStorage' };
  
  try {
    // Test direct backend URL without Next.js proxy
    const res = await fetch(`${location.origin}/api/v1/inbox/filter/`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    return { 
      status: res.status,
      url: `/api/v1/inbox/filter/` // This is what axios would request with baseURL
    };
  } catch (e) {
    return { error: e.message };
  }
});

console.log('Inbox filter result:', JSON.stringify(result));

await browser.close();
console.log('\n=== Test Complete ===');
