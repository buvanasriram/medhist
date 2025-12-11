
import { base64ToBlob, blobToBase64 } from './fileUtils';

export interface TestResult {
    success: boolean;
    message: string;
}

export const runBrowserTests = async (): Promise<TestResult> => {
    try {
        console.log("[BrowserTest] Starting integrity check...");
        
        // Test 1: Base64 <-> Blob Conversion
        // This confirms the environment can handle binary file processing needed for PDFs
        const originalString = "Hello medHist";
        const originalBase64 = btoa(originalString); // "SGVsbG8gbWVkSGlzdA=="
        const mimeType = 'text/plain';

        const blob = base64ToBlob(originalBase64, mimeType);
        
        if (!(blob instanceof Blob)) throw new Error("Output is not a Blob");
        if (blob.type !== mimeType) throw new Error(`Incorrect MimeType. Expected ${mimeType}, got ${blob.type}`);
        
        const resultBase64 = await blobToBase64(blob);
        
        if (resultBase64 !== originalBase64) {
             throw new Error(`Mismatch. Original: ${originalBase64}, Result: ${resultBase64}`);
        }

        console.log("%c[BrowserTest] ✅ PASSED", "color: #10b981; font-weight: bold; font-size: 14px;");
        return { success: true, message: "System Integrity Check: PASSED" };

    } catch (error: any) {
        console.error("[BrowserTest] ❌ FAILED:", error);
        return { success: false, message: `System Check FAILED: ${error.message}` };
    }
};
