
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { pdfjs } from 'react-pdf';
import type { ExtractedReportData, FamilyMember, TimelineEntry, Medication } from '../types';

interface FamilyData {
    familyMembers: FamilyMember[];
    timelineEntries: TimelineEntry[];
    medications: Medication[];
}

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
    try {
        return await fn();
    } catch (error: any) {
        const errorMsg = error?.message?.toLowerCase() || "";
        const isTransient = errorMsg.includes("503") || errorMsg.includes("overloaded") || errorMsg.includes("429");
        if (isTransient && retries > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
            return withRetry(fn, retries - 1, delay * 1.5);
        }
        throw error;
    }
}

const responseSchema = {
    type: Type.OBJECT,
    properties: {
        date: { type: Type.STRING, description: "YYYY-MM-DD format" },
        reportType: { type: Type.STRING },
        summary: { type: Type.STRING, description: "Brief clinical summary" },
        doctorName: { type: Type.STRING },
        facilityName: { type: Type.STRING },
        patientName: { type: Type.STRING },
        followUpDate: { type: Type.STRING, description: "YYYY-MM-DD format" },
        medications: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING },
                    dosage: { type: Type.STRING },
                    frequency: { type: Type.STRING },
                    purpose: { type: Type.STRING, description: "Inferred or explicit clinical use" }
                }
            }
        }
    },
    required: ["date", "reportType", "summary"],
};

/**
 * Attempts to repair a truncated or malformed JSON string.
 */
const repairJson = (jsonStr: string): string => {
    let repaired = jsonStr.trim();
    if (!repaired) return "{}";
    if (repaired.endsWith(':')) repaired += ' null';
    const quoteCount = (repaired.match(/"/g) || []).length;
    if (quoteCount % 2 !== 0) repaired += '"';
    repaired = repaired.replace(/,\s*$/, "");
    let openBraces = (repaired.match(/\{/g) || []).length;
    let closeBraces = (repaired.match(/\}/g) || []).length;
    let openBrackets = (repaired.match(/\[/g) || []).length;
    let closeBrackets = (repaired.match(/\]/g) || []).length;
    while (openBrackets > closeBrackets) { repaired += ']'; closeBrackets++; }
    while (openBraces > closeBraces) { repaired += '}'; closeBraces++; }
    return repaired;
};

/**
 * SALVAGE MODE: If the AI returns junk but mentions meds, we grab them.
 */
const salvageMedications = (text: string) => {
    const meds: any[] = [];
    // Matches patterns like "T. Siraforte", "Tab. Metformin", "Metformin 500mg"
    const medRegex = /(?:Tab|T\.|Caps?|C\.)?\s*([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\s*(\d+(?:\.\d+)?\s*(?:mg|ml|mcg|g))?/g;
    let match;
    while ((match = medRegex.exec(text)) !== null) {
        if (match[1] && !['Patient', 'Doctor', 'Hospital', 'Date', 'Summary'].includes(match[1])) {
            meds.push({
                name: match[1],
                dosage: match[2] || "As prescribed",
                purpose: "Inferred from clinical text"
            });
        }
    }
    return meds.slice(0, 10);
};

/**
 * FORGIVING PARSER: If the AI talks instead of coding, we take the talk and make it a Draft.
 */
const robustJsonParse = (rawText: string): ExtractedReportData => {
    if (!rawText) return createFallbackData("AI returned no content.");
    let text = rawText.trim();
    
    const markdownMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (markdownMatch && markdownMatch[1]) text = markdownMatch[1].trim();

    try {
        return JSON.parse(text);
    } catch (e) {
        const firstBracket = text.indexOf('{');
        const lastBracket = text.lastIndexOf('}');
        
        if (firstBracket !== -1) {
            let candidate = text.substring(firstBracket, lastBracket !== -1 && lastBracket > firstBracket ? lastBracket + 1 : undefined);
            try {
                return JSON.parse(candidate);
            } catch (innerError) {
                try {
                    return JSON.parse(repairJson(candidate));
                } catch (lastError) {
                    // Fail gracefully
                }
            }
        }
        
        // Final attempt: salvage what we can from raw text
        const fallback = createFallbackData(text);
        fallback.medications = salvageMedications(text);
        return fallback;
    }
};

const createFallbackData = (rawText: string): ExtractedReportData => {
    return {
        date: new Date().toISOString().split('T')[0],
        reportType: "Pending Verification",
        summary: rawText.length > 500 ? rawText.substring(0, 500) + "..." : rawText,
        doctorName: "Review Required",
        facilityName: "Extraction Draft",
        medications: []
    };
};

const extractTextFromPdf = async (base64Data: string, password?: string): Promise<string> => {
    try {
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
        const pdf = await pdfjs.getDocument({ data: bytes, password }).promise;
        let fullText = '';
        for (let i = 1; i <= Math.min(pdf.numPages, 5); i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            fullText += textContent.items.map((item: any) => item.str).join(' ') + '\n';
        }
        return fullText.substring(0, 8000);
    } catch (error) {
        throw new Error("Unable to read PDF contents.");
    }
};

export const extractReportInfo = async (fileBase64: string, mimeType: string, password?: string): Promise<ExtractedReportData> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `Act as a clinical data analyst. Extract info from the document.
    
    DIRECTIONS:
    - Identify Patient Name (Human name only, no IDs).
    - Identify the date of consultation. 
    - Decipher medications.
    - IMPORTANT FOR MEDICATIONS: For each drug (e.g. Siraforte, Sirazide), if the purpose is not written, use your clinical knowledge to INFER the most likely medical purpose (e.g. 'Multivitamin', 'Diabetes', 'Hypertension'). 
    - DO NOT leave the purpose as "Unknown" if the drug is a recognizable brand or generic.
    - OUTPUT ONLY VALID JSON.`;

    try {
        let contentPart;
        if (mimeType === 'application/pdf') {
            const extractedText = await extractTextFromPdf(fileBase64, password);
            contentPart = { text: extractedText };
        } else {
            contentPart = { inlineData: { data: fileBase64, mimeType } };
        }
        
        console.group("[medHist] AI Analysis Request");
        const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [{ text: prompt }, contentPart] },
            config: { 
                responseMimeType: 'application/json',
                responseSchema,
                maxOutputTokens: 2048
            }
        }));

        const text = response.text || '';
        console.groupEnd();
        
        return robustJsonParse(text);
    } catch (error: any) {
        console.groupEnd();
        return createFallbackData("Extraction service reached its timeout limit. Please verify manually.");
    }
};

export const chatWithHealthAssistant = async (userMessage: string, history: any[], data: FamilyData, currentUserId: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const currentUserFolder = data.familyMembers.find(m => m.linked_user_id === currentUserId);
    const currentUserName = currentUserFolder?.name || "the user";

    const memberContexts = data.familyMembers.map(member => {
        const isSelf = member.linked_user_id === currentUserId;
        const entries = data.timelineEntries
            .filter(e => e.family_member_id === member.id)
            .map(e => `[DOC_ID: ${e.id}] ${e.date} | ${e.report_type} | ${e.summary}`)
            .join('\n');

        return `PROFILE: ${member.name} ${isSelf ? '(CURRENT_USER)' : ''}
Medications: ${data.medications.filter(m => m.family_member_id === member.id && m.active).map(m => `${m.name} (${m.dosage || 'N/A'})${m.end_date ? ` until ${m.end_date}` : ''}`).join(', ') || 'None'}
Timeline:
${entries || 'No history.'}`;
    }).join('\n\n---\n\n');

    const systemPrompt = `You are medHist Assistant. Current user: ${currentUserName}.
    ${memberContexts}

    1. Map "I/me/my" to ${currentUserName}.
    2. Deep Link Button: [VIEW:Short Title:DOC_ID].
    3. Be clinical and concise.`;

    try {
        const chat = ai.chats.create({
            model: 'gemini-3-flash-preview',
            config: { systemInstruction: systemPrompt }
        });
        const result: GenerateContentResponse = await withRetry(() => chat.sendMessage({ message: userMessage }));
        return result.text || "I'm sorry, I couldn't help with that.";
    } catch (error) {
        return "System busy. Please try again.";
    }
};
