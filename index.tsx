
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { pdfjs } from 'react-pdf';

/**
 * [medHist] v0.6.9 - Registry Lockdown
 * This logic ensures the PDF.js API and Worker are always in sync.
 */
const pdfVersion = pdfjs.version || '4.8.69';
console.log(`[medHist] PDF.js API: ${pdfVersion}`);

// Use unpkg as it mirrors the NPM registry exactly. 
// cdnjs often lacks the specific minor versions bundled by build tools like Vite/Vercel.
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
