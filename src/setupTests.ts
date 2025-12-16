import '@testing-library/jest-dom';

// Polyfill definitions for Node.js globals to resolve TS errors
declare var global: any;
declare var require: any;

// JSDOM v24+ usually provides TextEncoder/TextDecoder globally.
// If your environment is missing them, we can polyfill them here, 
// but removing the 'util' import makes this safer for web-container environments.

if (typeof global.TextEncoder === 'undefined') {
    try {
        const { TextEncoder, TextDecoder } = require('util');
        global.TextEncoder = TextEncoder;
        global.TextDecoder = TextDecoder;
    } catch (e) {
        // Fallback or ignore if util is not available
        console.warn('Failed to polyfill TextEncoder/TextDecoder:', e);
    }
}

// Mock HTMLCanvasElement.toBlob (used in fileUtils) if not present
if (typeof HTMLCanvasElement !== 'undefined' && !HTMLCanvasElement.prototype.toBlob) {
  Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
    value: function (callback: any) {
      setTimeout(() => callback(new Blob([''], { type: 'image/png' })), 0);
    },
  });
}