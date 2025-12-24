
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { pdfjs } from 'react-pdf';

// 1. Detect the exact version of the PDF.js API that was bundled/loaded
const pdfVersion = pdfjs.version;
console.log(`[medHist] PDF.js API Version: ${pdfVersion}`);

/**
 * 2. PERMANENT FIX: Use unpkg.com as the worker source.
 * Unlike cdnjs, unpkg mirrors every single version of the NPM registry.
 * This ensures the worker script ALWAYS exists for the exact version loaded in the app.
 * We use the .mjs extension as required by PDF.js v4.0+.
 */
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfVersion}/build/pdf.worker.min.mjs`;

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
