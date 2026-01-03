
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { pdfjs } from 'react-pdf';
import type { ExtractedReportData, FamilyMember, TimelineEntry, Medication } from '../types';

// Lazy initialization to prevent top-level crashes
let ai: GoogleGenAI | null = null;

const getAIClient = () => {
    if (ai) return ai;
    
    // Prioritize process.env.API_KEY as per SDK guidelines
    const apiKey = process.env.API_KEY;
    
    if (!apiKey) {
        throw new Error("AI Registry Key is missing. Please check your configuration.");
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
 * Enhanced Jittered Exponential Backoff
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 5, delay = 1500): Promise<T> {
    try {
        return await fn();
    } catch (error: any) {
        const errorMsg = error?.message?.toLowerCase() || "";
        const isTransient = errorMsg.includes("503") || 
                           errorMsg.includes("overloaded") || 
                           errorMsg.includes("429") || 
                           errorMsg.includes("resource_exhausted") ||
                           errorMsg.includes("deadline_exceeded");

        if (isTransient && retries > 0) {
            // Add jitter to prevent thundering herd
            const jitter = Math.random() * 500;
            console.warn(`[medHist AI] System busy. Retrying in ${delay + jitter}ms... (${retries} attempts left)`);
            await new Promise(resolve => setTimeout(resolve, delay + jitter));
            return withRetry(fn, retries - 1, delay * 2);
        }
        throw error;
    }
}

const responseSchema = {
    type: Type.OBJECT,
    properties: {
        date: {
            type: Type.STRING,
            description: "YYYY-MM-DD format of report date.",
        },
        reportType: {
            type: Type.STRING,
            description: "Descriptive title (e.g. Blood Test).",
        },
        summary: {
            type: Type.STRING,
            description: "Concise clinical summary.",
        },
        doctorName: { type: Type.STRING },
        facilityName: { type: Type.STRING },
        patientName: { type: Type.STRING },
        followUpDate: { type: Type.STRING },
        medications: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING },
                    dosage: { type: Type.STRING },
                    frequency: { type: Type.STRING },
                    purpose: { type: Type.STRING },
                    startDate: { type: Type.STRING }
                }
            }
        }
    },
    required: ["date", "reportType", "summary"],
};

/**
 * Robust Base64 to Uint8Array for PDF.js
 */
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
        // Limit extraction to first 10 pages to prevent memory crashes
        const pageCount = Math.min(pdf.numPages, 10);

        for (let i = 1; i <= pageCount; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
                .map((item: any) => item.str)
                .join(' ');
            fullText += pageText + '\n';
            
            // Safety break: Don't send more than 10k characters to Gemini for extractions
            if (fullText.length > 10000) break;
        }
        
        if (fullText.trim().length < 10) {
            throw new Error("SCANNED_PDF_DETECTED");
        }

        return fullText.substring(0, 10000);
    } catch (error: any) {
        if (error.message === "SCANNED_PDF_DETECTED") {
             throw new Error("This PDF appears to be a scanned image. Please upload a clear photo of the document instead.");
        }
        if (error.name === 'PasswordException') {
            throw new Error("This PDF is encrypted. Please provide the correct password.");
        }
        throw new Error("Registry was unable to read this PDF format. Try taking a photo of the document.");
    }
};

export const extractReportInfo = async (fileBase64: string, mimeType: string, password?: string): Promise<ExtractedReportData> => {
    const client = getAIClient();

    const prompt = `Analyze this medical report. Extract:
    - Date (YYYY-MM-DD)
    - Patient Full Name
    - Report Title
    - Concise Summary
    - Doctor/Facility Name
    - Follow-up dates
    - Medications (with inferred purpose)
    Return JSON. If not a medical report, return an error.`;
    
    try {
        let contentPart;

        if (mimeType === 'application/pdf' && password !== undefined) {
            const extractedText = await extractTextFromPdf(fileBase64, password);
            contentPart = { text: `CONTENT:\n${extractedText}` };
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
                parts: [
                    { text: prompt },
                    contentPart
                ],
            },
            config: {
                responseMimeType: 'application/json',
                responseSchema: responseSchema,
                // Adjust safety settings to be more permissive for medical analysis
                // while still blocking harmful content
                safetySettings: [
                    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
                    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
                    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
                    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' }
                ]
            },
        }));
        
        // Handle cases where safety filters might have triggered
        if (response.candidates?.[0]?.finishReason === 'SAFETY') {
            throw new Error("The AI model blocked this document for safety reasons. This can happen with very graphic medical descriptions. Try a different photo or manual entry.");
        }

        const jsonText = response.text;
        if (!jsonText) {
            throw new Error("The AI server returned an empty analysis. Please try again.");
        }

        const sanitizedJson = jsonText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
        const parsedData = JSON.parse(sanitizedJson.trim());

        // Normalization
        parsedData.date = parsedData.date || new Date().toISOString().split('T')[0];
        parsedData.patientName = parsedData.patientName || "Unknown";
        parsedData.reportType = parsedData.reportType || "Clinical Record";
        
        return parsedData as ExtractedReportData;

    } catch (error: any) {
        console.error("Gemini Extraction Error:", error);
        if (error?.message?.includes("503") || error?.message?.includes("overloaded")) {
            throw new Error("AI Medical servers are currently busy. We are retrying your analysis automatically...");
        }
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

    const contextSummary = `
    MEMBERS: ${data.familyMembers.map(m => m.name).join(', ')}
    MEDS: ${data.medications.filter(m => m.active).map(m => m.name).join(', ')}
    `;

    const systemPrompt = `You are "medHist Assistant". Help with family health history. Concise only. [VIEW:Title:ID] for links.
    CONTEXT: ${contextSummary}`;

    try {
        const chat = client.chats.create({
            model: 'gemini-3-flash-preview',
            config: {
                systemInstruction: systemPrompt,
            },
            history: history
        });

        const result: GenerateContentResponse = await withRetry(() => chat.sendMessage({ message: userMessage }));
        return result.text || "I'm sorry, I couldn't generate a response.";
    } catch (error: any) {
        console.error("Chat Error:", error);
        return "The AI assistant is momentarily busy. Please try asking again in a few seconds.";
    }
};
