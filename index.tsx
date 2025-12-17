
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { pdfjs } from 'react-pdf';

// Configure the pdf.js worker globally.
// We use the `pdfjs.version` property to dynamically ensure the worker URL 
// matches the installed API version exactly, preventing version mismatch errors.
try {
  // Use esm.sh for robust module worker loading. 
  // Unpkg sometimes causes "Failed to resolve module specifier" errors in certain 
  // environments with PDF.js v4+ workers (which are .mjs modules).
  const version = pdfjs.version || '4.8.69';
  pdfjs.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
} catch (error) {
  console.warn("Failed to configure PDF worker:", error);
}

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
