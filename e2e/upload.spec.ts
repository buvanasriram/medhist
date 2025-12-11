
import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test.describe('Medical Report Upload Flow', () => {
  const pdfPath = path.join((process as any).cwd(), 'e2e', 'fixtures', 'sample_report.pdf');

  test.beforeAll(async () => {
    // Check if the PDF exists before running tests
    if (!fs.existsSync(pdfPath)) {
      throw new Error('Test PDF not found! Please run "npm run gen:pdf" first.');
    }
  });

  test('should allow user to upload a report and see it in the timeline', async ({ page }) => {
    // 1. Force Mock Mode via LocalStorage
    // We navigate to the page first, set the flag, and reload to ensure the app initializes with the flag.
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('medhist_force_mock', 'true'));
    await page.reload();

    // 2. Login (Mock Mode)
    // Fill in mock credentials (any email/pass works in mock mode)
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Wait for Dashboard
    await expect(page.getByText('Family Health Board')).toBeVisible();

    // 3. Select the "Self" member card to go to timeline
    // Note: In mock mode, the default user is "Demo User"
    await page.click('text=Demo User');

    // 4. Open Upload Modal
    await page.click('button:has-text("Upload")');
    await expect(page.getByText('Upload New Medical Report')).toBeVisible();

    // 5. Handle File Upload
    // We use setInputFiles on the hidden file input
    await page.setInputFiles('input[type="file"]', pdfPath);

    // Verify file name appears
    await expect(page.getByText('sample_report.pdf')).toBeVisible();

    // 6. Submit
    await page.click('button:has-text("Generate Timeline Entry")');

    // 7. Verification
    // Wait for the upload modal to close
    await expect(page.getByText('Upload New Medical Report')).not.toBeVisible();

    // Check if the new entry appears in the timeline
    // The mock report contains "Cardiology Department" and "Dr. Julius Hibbert"
    await expect(page.getByText('Cardiology Department').first()).toBeVisible();
    await expect(page.getByText('Dr. Julius Hibbert').first()).toBeVisible();
  });
});
