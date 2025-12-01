
import { GoogleGenAI, Type } from "@google/genai";
import { pdfjs } from 'react-pdf';
import type { ExtractedReportData } from '../types';
import { CREDENTIALS } from '../credentials';

// 1. Try process.env (Netlify/Deployment)
// 2. Try CREDENTIALS (Local/Preview via credentials.ts)
const apiKey = process.env.API_KEY || CREDENTIALS.GEMINI_API_KEY;

// Lazy initialization to prevent top-level crashes
let ai: GoogleGenAI | null = null;

const getAIClient = () => {
    if (ai) return ai;
    
    if (!apiKey) {
        throw new Error("Gemini API Key is missing. Please check credentials.ts or your environment variables.");
    }
    
    try {
        ai = new GoogleGenAI({ apiKey });
        return ai;
    } catch (error) {
        console.error("Failed to initialize Gemini Client:", error);
        throw new Error("Failed to initialize Gemini AI service.");
    }
};

const responseSchema = {
    type: Type.OBJECT,
    properties: {
        date: {
            type: Type.STRING,
            description: "The date of the medical report or event in YYYY-MM-DD format. Infer from the document. If unknown, use the current date.",
        },
        reportType: {
            type: Type.STRING,
            description: "A short, descriptive title for the report (e.g., 'Blood Test Results', 'Cardiology Consultation', 'X-Ray Report').",
        },
        summary: {
            type: Type.STRING,
            description: "A concise, one-paragraph summary of the key findings, diagnosis, or notes from the report, written in simple, easy-to-understand language for a non-medical person.",
        },
        doctorName: {
            type: Type.STRING,
            description: "The name of the doctor or healthcare professional mentioned in the report. If not found, leave this field empty.",
        },
        facilityName: {
            type: Type.STRING,
            description: "The name of the hospital, clinic, or lab where the report was generated. If not found, leave this field empty.",
        },
        patientName: {
            type: Type.STRING,
            description: "The full name of the patient as mentioned in the report. If not found, leave this field empty.",
        },
        medications: {
            type: Type.ARRAY,
            description: "A list of medications prescribed or mentioned in the report as current medication.",
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING, description: "Name of the medication (e.g., Amoxicillin)." },
                    dosage: { type: Type.STRING, description: "Dosage strength (e.g., 500mg). Empty if not found." },
                    frequency: { type: Type.STRING, description: "How often to take it (e.g., Twice daily). Empty if not found." },
                    purpose: { type: Type.STRING, description: "Use your general medical knowledge to identify the common condition this medication treats (e.g., 'High Cholesterol' for Atorvastatin), even if the document does not mention the condition explicitly." },
                    startDate: { type: Type.STRING, description: "If the prescription explicitly says when to start taking the medicine, extract it (YYYY-MM-DD). If it just lists current meds, leave empty." }
                }
            }
        }
    },
    required: ["date", "reportType", "summary"],
};

// Helper function to extract text from a password-protected PDF using PDF.js
const extractTextFromPdf = async (base64Data: string, password?: string): Promise<string> => {
    try {
        // Convert base64 to binary string
        const binaryString = atob(base64Data);
        
        // Load the document with the password
        const loadingTask = pdfjs.getDocument({
            data: binaryString,
            password: password
        });

        const pdf = await loadingTask.promise;
        let fullText = '';

        // Iterate over all pages
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
                .map((item: any) => item.str)
                .join(' ');
            fullText += `--- Page ${i} ---\n${pageText}\n\n`;
        }
        
        // Check for empty text (scanned PDF issue)
        if (fullText.replace(/\s/g, '').length < 20) {
            throw new Error("SCANNED_PDF_DETECTED");
        }

        return fullText;
    } catch (error: any) {
        console.error("PDF Extraction Error:", error);
        if (error.message === "SCANNED_PDF_DETECTED") {
             throw new Error("This password-protected PDF appears to be a scanned image. We cannot extract text from it directly. Please try removing the password or uploading an image version.");
        }
        if (error.name === 'PasswordException' || error.message?.includes('Password')) {
            throw new Error("Incorrect PDF password. Please try again.");
        }
        throw new Error("Failed to read the PDF content. The file might be corrupted.");
    }
};

export const extractReportInfo = async (fileBase64: string, mimeType: string, password?: string): Promise<ExtractedReportData> => {
    const client = getAIClient();

    const prompt = `You are an expert medical assistant for medHist. Your task is to analyze the provided medical report and extract key information.
    Please extract the date of the report, the patient's full name, a short title for it, a simple summary, the doctor's name, the hospital or lab name, and any medications listed.
    Return the information in the specified JSON format.
    The date MUST be in YYYY-MM-DD format. If the date is not found, unclear, or ambiguous, use today's date as a fallback.
    The summary should be clear, concise, and easy for a patient to understand. Avoid overly technical jargon where possible.
    If the document is not a recognizable medical report, indicate an error instead of guessing. 
    If specific fields are missing, infer reasonable defaults or leave them empty string, but ensure the JSON structure matches the schema.
    
    For medications:
    1. Extract name, dosage, and frequency from the document.
    2. For the 'purpose' field: Use your external medical knowledge to identify the common condition this medication treats (e.g., 'Type 2 Diabetes' for Metformin, 'Hypertension' for Lisinopril), even if the document does not mention the condition explicitly.
    3. For 'startDate': Look for explicit instructions like "Start on 2023-10-12". If not found, leave null.
    `;
    
    try {
        let contentPart;

        // Handling Password-Protected PDFs:
        // Gemini cannot natively decrypt PDFs via inlineData. 
        // If a password is provided for a PDF, we extract the text locally first, 
        // then send the text to Gemini.
        if (mimeType === 'application/pdf' && password) {
            console.log("[GeminiService] Decrypting PDF locally...");
            const extractedText = await extractTextFromPdf(fileBase64, password);
            contentPart = { text: `Here is the text content extracted from the medical report:\n\n${extractedText}` };
        } else {
            // Standard path for images or unprotected PDFs
            contentPart = {
                inlineData: {
                    data: fileBase64,
                    mimeType: mimeType,
                },
            };
        }

        const response = await client.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { text: prompt },
                    contentPart
                ],
            },
            config: {
                responseMimeType: 'application/json',
                responseSchema: responseSchema,
            },
        });
        
        let jsonText = response.text;
        
        if (!jsonText) {
            throw new Error("Received an empty or invalid response from the API.");
        }

        // CLEANUP: Remove Markdown code blocks if present (e.g., ```json ... ```)
        jsonText = jsonText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');

        // The response text is a JSON string, so we need to parse it.
        let parsedData;
        try {
            parsedData = JSON.parse(jsonText.trim());
        } catch (parseError) {
            console.error("JSON Parse Error. Raw text:", jsonText);
            throw new Error("Failed to parse the AI response. Please try again.");
        }

        // --- ROBUST FALLBACKS ---
        
        // 1. Date Validation
        // Supabase will reject "N/A" or invalid formats.
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!parsedData.date || !dateRegex.test(parsedData.date) || isNaN(Date.parse(parsedData.date))) {
            console.warn(`[GeminiService] Invalid or missing date received: "${parsedData.date}". Defaulting to today's date.`);
            parsedData.date = new Date().toISOString().split('T')[0];
        }

        // 2. Patient Name Fallback
        // If missing, default to "N/A" to trigger the UI name mismatch warning
        if (!parsedData.patientName || parsedData.patientName.trim() === "") {
            parsedData.patientName = "N/A";
        }

        // 3. Report Type Fallback
        if (!parsedData.reportType || parsedData.reportType.trim() === "") {
            parsedData.reportType = "Uncategorized Document";
        }

        // 4. Summary Fallback
        if (!parsedData.summary || parsedData.summary.trim() === "") {
            parsedData.summary = "No summary could be generated for this document.";
        }
        
        return parsedData as ExtractedReportData;

    } catch (error: any) {
        console.error("Error calling Gemini API:", error);
        
        // Enhance error message for common issues
        if (error.message && error.message.includes('400')) {
             if (error.message.includes('The document has no pages') || error.message.includes('INVALID_ARGUMENT')) {
                 throw new Error("Gemini could not read this file. If it is password protected, please ensure you entered the correct password.");
             }
        }
        
        throw error; // Re-throw to be caught by the UI
    }
};
