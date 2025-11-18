
import { GoogleGenAI, Type } from "@google/genai";
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
            description: "The date of the medical report or event in YYYY-MM-DD format. Infer from the document.",
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
    },
    required: ["date", "reportType", "summary"],
};

export const extractReportInfo = async (fileBase64: string, mimeType: string): Promise<ExtractedReportData> => {
    const client = getAIClient();

    const prompt = `You are an expert medical assistant for medHist. Your task is to analyze the provided medical report (image or PDF) and extract key information.
    Please extract the date of the report, the patient's full name, a short title for it, a simple summary, the doctor's name, and the hospital or lab name.
    Return the information in the specified JSON format.
    The summary should be clear, concise, and easy for a patient to understand. Avoid overly technical jargon where possible.
    If the document is not a recognizable medical report, indicate an error instead of guessing. The date should be the primary date on the report.
    `;
    
    try {
        const response = await client.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { text: prompt },
                    {
                        inlineData: {
                            data: fileBase64,
                            mimeType: mimeType,
                        },
                    },
                ],
            },
            config: {
                responseMimeType: 'application/json',
                responseSchema: responseSchema,
            },
        });
        
        const jsonText = response.text;
        
        if (!jsonText) {
            throw new Error("Received an empty or invalid response from the API.");
        }

        // The response text is a JSON string, so we need to parse it.
        const parsedData = JSON.parse(jsonText.trim());

        // Basic validation on the parsed object
        if (!parsedData.date || !parsedData.reportType || !parsedData.summary) {
            throw new Error("Invalid data structure received from API. Required fields (date, reportType, summary) are missing.");
        }
        
        return parsedData as ExtractedReportData;

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        throw new Error("Failed to process the document with Gemini API.");
    }
};
