
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { pdfjs } from 'react-pdf';
import type { ExtractedReportData, FamilyMember, TimelineEntry, Medication } from '../types';
import { CREDENTIALS } from '../credentials';

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
                    purpose: { type: Type.STRING, description: "Inferred or explicit clinical use" },
                    startDate: { type: Type.STRING, description: "YYYY-MM-DD format (leave blank if not explicitly scheduled)" },
                    endDate: { type: Type.STRING, description: "YYYY-MM-DD format (leave blank if not explicitly scheduled)" }
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
    const apiKey = process.env.API_KEY || CREDENTIALS.GEMINI_API_KEY;
    const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
            headers: {
                'User-Agent': 'aistudio-build',
            }
        }
    });
    
    const prompt = `Act as an expert clinical data analyst. Carefully extract patient information and medications from the provided medical document (which can be a prescription, plan of care, clinical summary, lab report, or checkup bill).

DIRECTIONS:
- Identify the Patient Name (extract human name only, e.g., "Buvana Swaminathan", "Buvana Sriram", ignoring titles like Mrs/Ms/Mr if possible, keep it clean, no IDs).
- Identify the Consultation Date. If a specific consultation/consult/visit date is not explicitly visible or written on the document, default to the CURRENT DATE: ${new Date().toISOString().split('T')[0]}. Do not leave it blank.
- Extract and decipher all Medications listed:
  - Carefully look for printed names, handwritten additions, circles, tick marks, or list items under sections like "Plan Of Care", "Medications", "Rx", "Treatment Plan".
  - For each medication, extract:
    * "name": The clear brand or generic drug name (e.g. "Empha", "Lumia", "Meconerv"). Stripped of qualifiers like "TAB." or "CAP." where possible but keep the core name recognizable.
    * "dosage": The strength or dosage (e.g., "10mg", "60K IU", "1500mcg").
    * "frequency": The frequency of intake (e.g., "1-0-0 (after food)", "Once a week", "Once a month", "0-0-1 (after food)").
    * "purpose": INFER the clinical purpose using your medical knowledge if not explicitly stated (e.g., "Diabetes / Glycemic Control" for Empagliflozin, "Vitamin D3 Supplement" for Lumia, "Neuropathy / Vitamin B12" for Meconerv / Methylcobalamin). DO NOT put "Unknown".
  - CRITICAL RULES FOR MEDICATIONS:
    * If a medication is accompanied by "STOP", "DISCONTINUE", or crossed out (e.g., "STOP. TAB. STALIX"), do NOT include it as a new active medication. Or, if you must, ensure it is NOT listed in the active medications to avoid confusing the patient's ongoing therapy.
- Ensure the resulting structure fits the JSON Schema perfectly.`;

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
            model: 'gemini-3.5-flash',
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
    const apiKey = process.env.API_KEY || CREDENTIALS.GEMINI_API_KEY;
    const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
            headers: {
                'User-Agent': 'aistudio-build',
            }
        }
    });
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
            model: 'gemini-3.5-flash',
            config: { systemInstruction: systemPrompt }
        });
        const result: GenerateContentResponse = await withRetry(() => chat.sendMessage({ message: userMessage }));
        return result.text || "I'm sorry, I couldn't help with that.";
    } catch (error) {
        return "System busy. Please try again.";
    }
};
