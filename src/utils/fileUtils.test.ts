import { describe, it, expect } from 'vitest';
import { base64ToBlob, blobToBase64 } from './fileUtils';

describe('File Utilities', () => {
  it('should convert base64 to blob and back correctly', async () => {
    // 1. Create a dummy base64 string (Hello World)
    const originalBase64 = 'SGVsbG8gV29ybGQ=';
    const mimeType = 'text/plain';

    // 2. Convert to Blob
    const blob = base64ToBlob(originalBase64, mimeType);

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe(mimeType);
    expect(blob.size).toBe(11); // "Hello World" is 11 bytes

    // 3. Convert back to Base64
    const resultBase64 = await blobToBase64(blob);

    expect(resultBase64).toBe(originalBase64);
  });
});
