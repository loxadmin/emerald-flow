import { test, expect } from '@playwright/test';

test('Verify luxury UI and motion', async ({ page }) => {
  // Set a large viewport for high-quality screenshots
  await page.setViewportSize({ width: 1440, height: 900 });

  // 1. Landing Page (Index)
  await page.goto('http://localhost:8080/');
  await page.waitForTimeout(2000); // Wait for animations to settle
  await page.screenshot({ path: '/home/jules/verification/screenshots/index_final.png', fullPage: true });

  // 2. Login Page
  await page.goto('http://localhost:8080/login');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '/home/jules/verification/screenshots/login_final.png' });

  // 3. Signup Page
  await page.goto('http://localhost:8080/signup');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '/home/jules/verification/screenshots/signup_final.png' });
});
