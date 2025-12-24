
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { pdfjs } from 'react-pdf';

// DIAGNOSTIC: Log the versions to the console so we can verify parity
console.log(`[medHist] PDF.js API Version: ${pdfjs.version}`);

// CRITICAL: Force worker to the exact version we want.
// Using unpkg here as a secondary source to ensure the file isn't cached wrongly by esm.sh
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@4.8.69/build/pdf.worker.min.mjs`;

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
