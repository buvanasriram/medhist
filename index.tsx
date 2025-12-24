
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { pdfjs } from 'react-pdf';

// 1. Detect runtime version
const pdfVersion = pdfjs.version || '4.8.69';
console.log(`[medHist] Initializing PDF.js v${pdfVersion}`);

// 2. Set worker to match API EXACTLY using standard .js for legacy mobile support
// Using the same major.minor.patch version as the loaded library
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfVersion}/pdf.worker.min.js`;

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
