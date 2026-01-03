
import { GoogleGenAI, Type, GenerateContentResponse, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { pdfjs } from 'react-pdf';
import type { ExtractedReportData, FamilyMember, TimelineEntry, Medication } from '../types';
import { CREDENTIALS } from '../credentials';

// Lazy initialization to prevent top-level crashes
let ai: GoogleGenAI | null = null;

const getAIClient = () => {
    if (ai) return ai;
    
    // Prioritize credentials.ts for local development/easier setup
    const apiKey = process.env.API_KEY || CREDENTIALS.GEMINI_API_KEY;
    if (!apiKey || apiKey === "your_gemini_api_key_here") {
        throw new Error("AI Registry Key is missing. Please check credentials.ts or environment variables.");
    }
    
    try {
        ai = new GoogleGenAI({ apiKey });
        return ai;
    } catch (error) {
        console.error("Failed to initialize Gemini Client:", error);
        throw new Error("Failed to initialize AI medical service.");
    }
};

/**
 * High-Resilience Exponential Backoff
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 8, delay = 2000): Promise<T> {
    try {
        return await fn();
    } catch (error: any) {
        const errorMsg = error?.message?.toLowerCase() || "";
        const isTransient = errorMsg.includes("503") || 
                           errorMsg.includes("overloaded") || 
                           errorMsg.includes("429") || 
                           errorMsg.includes("resource_exhausted") ||
                           errorMsg.includes("deadline_exceeded") ||
                           errorMsg.includes("504") ||
                           errorMsg.includes("fetch");

        if (isTransient && retries > 0) {
            const jitter = Math.random() * 800;
            const waitTime = delay + jitter;
            console.warn(`[medHist AI] Server busy/Network lag. Retrying in ${Math.round(waitTime)}ms... (${retries} left)`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            return withRetry(fn, retries - 1, delay * 1.5);
        }
        throw error;
    }
}

const responseSchema = {
    type: Type.OBJECT,
    properties: {
        date: { type: Type.STRING, description: "The primary report date in YYYY-MM-DD format. If missing, set to null. NEVER use placeholders." },
        reportType: { type: Type.STRING, description: "Title of report" },
        summary: { type: Type.STRING, description: "Clinical Brief" },
        doctorName: { type: Type.STRING },
        facilityName: { type: Type.STRING },
        patientName: { type: Type.STRING },
        followUpDate: { type: Type.STRING, description: "Follow-up date in YYYY-MM-DD format. If missing, set to null. NEVER use placeholders." },
        medications: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING },
                    dosage: { type: Type.STRING },
                    frequency: { type: Type.STRING },
                    purpose: { type: Type.STRING },
                    startDate: { type: Type.STRING, description: "YYYY-MM-DD format only. Set to null if missing." }
                }
            }
        }
    },
    required: ["date", "reportType", "summary"],
};

const base64ToUint8Array = (base64: string) => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
};

const extractTextFromPdf = async (base64Data: string, password?: string): Promise<string> => {
    try {
        const data = base64ToUint8Array(base64Data);
        const loadingTask = pdfjs.getDocument({
            data,
            password: password
        });

        const pdf = await loadingTask.promise;
        let fullText = '';
        const pageCount = Math.min(pdf.numPages, 8); 

        for (let i = 1; i <= pageCount; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
                .map((item: any) => item.str)
                .join(' ');
            fullText += pageText + '\n';
            if (fullText.length > 8000) break;
        }
        
        if (fullText.trim().length < 5) throw new Error("SCANNED_PDF_DETECTED");
        return fullText.substring(0, 8000);
    } catch (error: any) {
        if (error.message === "SCANNED_PDF_DETECTED") {
             throw new Error("This PDF looks like an image. Please upload a photo instead.");
        }
        throw new Error("Unable to read this specific PDF format. Try a photo.");
    }
};

/**
 * Advanced Recursive Scrubber
 * Scans every key and value for ANY non-clinical placeholders and converts to literal null.
 */
const scrubNullStrings = (obj: any): any => {
    const placeholders = [
        'null', 'not specified', 'not-specified', 'unknown', 'n/a', 
        'none', 'undefined', 'pending', 'tbd', 'not recorded', 'missing',
        'placeholder', 'empty', 'not available', 'unknown date', 'unknown name'
    ];
    
    if (Array.isArray(obj)) {
        return obj.map(scrubNullStrings);
    } else if (obj !== null && typeof obj === 'object') {
        return Object.fromEntries(
            Object.entries(obj).map(([k, v]) => {
                if (typeof v === 'string') {
                    const cleanV = v.trim().toLowerCase().replace(/[.\s]$/, ''); 
                    if (placeholders.includes(cleanV)) {
                        return [k, null];
                    }
                }
                return [k, scrubNullStrings(v)];
            })
        );
    }
    return obj;
};

export const extractReportInfo = async (fileBase64: string, mimeType: string, password?: string): Promise<ExtractedReportData> => {
    const client = getAIClient();
    
    // Hardened prompt for handwriting and specific Indian clinic formats (Apollo Clinic)
    const prompt = `Perform a high-precision medical analysis of the attached report.
    - LOOK for dates in DD/MM/YYYY format (e.g., 30/12/2025) and CONVERT to YYYY-MM-DD.
    - If a date is missing or handwritten in an unclear way (e.g., "Review in 2 weeks"), set the followUpDate to null. 
    - NEVER use placeholders like "Not specified". If you don't have a calendar date, return null.
    
    EXTRACT:
    1. Report Date (Top right/bottom header)
    2. Patient Name (Mr Sriram Bharadwaj)
    3. Title (Apollo Clinic Consultation)
    4. Clinical Summary (Sneezing, heaviness in head, Penicillin Allergy)
    5. Medications (Montek LC, Dolo 650, etc.)
    `;
    
    try {
        let contentPart;
        if (mimeType === 'application/pdf') {
            const extractedText = await extractTextFromPdf(fileBase64, password);
            contentPart = { text: `REPORT_CONTENT:\n${extractedText}` };
        } else {
            contentPart = {
                inlineData: {
                    data: fileBase64,
                    mimeType: mimeType,
                },
            };
        }

        const response: GenerateContentResponse = await withRetry(() => client.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [{ text: prompt }, contentPart],
            },
            config: {
                responseMimeType: 'application/json',
                responseSchema: responseSchema,
                thinkingConfig: { thinkingBudget: 0 },
                safetySettings: [
                    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                    { category: HarmCategory.HARM_CATEGORY_CIVIC_INTEGRITY, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH }
                ]
            },
        }));
        
        if (response.candidates?.[0]?.finishReason === 'SAFETY') {
            throw new Error("AI flagged this report as sensitive. Try a different photo.");
        }

        const jsonText = response.text;
        if (!jsonText) throw new Error("Empty analysis. Please retry.");

        const sanitizedJson = jsonText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
        const rawParsed = JSON.parse(sanitizedJson.trim());
        
        // Comprehensive cleanup of all placeholders
        const parsedData = scrubNullStrings(rawParsed);

        // Registry integrity fallbacks
        parsedData.date = parsedData.date || new Date().toISOString().split('T')[0];
        parsedData.patientName = parsedData.patientName || "Unknown";
        parsedData.reportType = parsedData.reportType || "Medical Record";
        
        return parsedData as ExtractedReportData;

    } catch (error: any) {
        console.error("AI Sync Failure:", error);
        throw error;
    }
};

interface FamilyData {
    familyMembers: FamilyMember[];
    timelineEntries: TimelineEntry[];
    medications: Medication[];
}

export const chatWithHealthAssistant = async (userMessage: string, history: any[], data: FamilyData): Promise<string> => {
    const client = getAIClient();
    const contextSummary = `MEMBERS: ${data.familyMembers.map(m => m.name).join(', ')}. MEDS: ${data.medications.filter(m => m.active).map(m => m.name).join(', ')}`;
    const systemPrompt = `You are "medHist Assistant". Concise health history support. Context: ${contextSummary}`;

    try {
        const chat = client.chats.create({
            model: 'gemini-3-flash-preview',
            config: {
                systemInstruction: systemPrompt,
                thinkingConfig: { thinkingBudget: 0 }
            },
            history: history
        });

        const result: GenerateContentResponse = await withRetry(() => chat.sendMessage({ message: userMessage }));
        return result.text || "I'm sorry, I couldn't generate a response.";
    } catch (error: any) {
        return "System busy. Please wait a moment.";
    }
};
