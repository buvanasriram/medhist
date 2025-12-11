
import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

(async () => {
  // Ensure the output directory exists
  const fixtureDir = path.join(process.cwd(), 'e2e', 'fixtures');
  if (!fs.existsSync(fixtureDir)) {
    fs.mkdirSync(fixtureDir, { recursive: true });
  }

  console.log('🚀 Launching browser to generate PDF...');
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // 1. Navigate to the mock report on your local dev server
  // Note: Ensure 'npm run dev' is running on port 5173 before executing this
  const url = 'http://localhost:5173/mock_report.html';
  
  try {
    await page.goto(url, { waitUntil: 'networkidle' });
  } catch (e) {
    console.error(`❌ Could not load ${url}. Is the dev server running?`);
    console.error('Run "npm run dev" in a separate terminal first.');
    await browser.close();
    process.exit(1);
  }

  // 2. Generate the PDF
  const pdfPath = path.join(fixtureDir, 'sample_report.pdf');
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '20px',
      bottom: '20px',
      left: '20px',
      right: '20px'
    }
  });

  console.log(`✅ PDF generated successfully at: ${pdfPath}`);
  await browser.close();
})();
