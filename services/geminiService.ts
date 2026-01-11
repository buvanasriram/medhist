
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { pdfjs } from 'react-pdf';
import type { ExtractedReportData, FamilyMember, TimelineEntry, Medication } from '../types';

interface FamilyData {
    familyMembers: FamilyMember[];
    timelineEntries: TimelineEntry[];
    medications: Medication[];
}

async function withRetry<T>(fn: () => Promise<T>, retries = 5, delay = 2000): Promise<T> {
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
        date: { type: Type.STRING },
        reportType: { type: Type.STRING },
        summary: { type: Type.STRING },
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
        throw new Error("Unable to read PDF.");
    }
};

export const extractReportInfo = async (fileBase64: string, mimeType: string, password?: string): Promise<ExtractedReportData> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // [medHist] v1.0.1 - Aggressive Med Extraction
    const prompt = `Perform a comprehensive medical document analysis.
    1. Extract the report date in YYYY-MM-DD format.
    2. Identify the report type (e.g., Blood Test, Consultation, Prescription).
    3. Provide a clear 2-sentence clinical summary.
    4. MANDATORY: Extract EVERY medication mentioned in the document.
       - Look for drug names, dosages (e.g., 500mg), frequencies (e.g., Twice daily).
       - If the document is a prescription, capture the ENTIRE list.
       - Do not omit any drugs even if they seem common.
    Return strictly as a JSON object matching the schema.`;

    try {
        let contentPart;
        if (mimeType === 'application/pdf') {
            const extractedText = await extractTextFromPdf(fileBase64, password);
            contentPart = { text: extractedText };
        } else {
            contentPart = { inlineData: { data: fileBase64, mimeType } };
        }
        const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [{ text: prompt }, contentPart] },
            config: { responseMimeType: 'application/json', responseSchema }
        }));
        const text = response.text || '';
        return JSON.parse(text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim());
    } catch (error) {
        throw error;
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
Medications: ${data.medications.filter(m => m.family_member_id === member.id && m.active).map(m => `${m.name} (${m.dosage || 'N/A'})`).join(', ') || 'None'}
Timeline:
${entries || 'No history.'}`;
    }).join('\n\n---\n\n');

    const systemPrompt = `You are medHist Assistant. Current user: ${currentUserName}.
    ${memberContexts}

    1. Map "I/me/my" to ${currentUserName}.
    2. Deep Link Button: [VIEW:Short Title:DOC_ID].
    3. Copy DOC_ID exactly from the data. Do not add prefixes like "DOC_ID:" inside the button.
    4. Be clinical and concise. If medications are missing, explain that they might be in un-uploaded reports.`;

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
