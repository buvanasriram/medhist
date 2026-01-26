# AI Logic & Prompt Engineering Documentation

## 1. Purpose of AI in This Application
The **medHist** application delegates high-variance unstructured data processing to Generative AI to maintain a structured clinical registry without manual data entry.

- **Delegated to AI**: 
    - **Multimodal Extraction**: Parsing clinical entities (Patient Name, Doctor, Facility) from diverse document layouts (PDFs, mobile photos).
    - **Clinical Inference**: Determining the likely "Purpose" of a medication based on its name when the context is missing (e.g., *Metformin* → *Type 2 Diabetes*).
    - **Contextual Synthesis**: Summarizing multi-page reports into a 2-sentence "Clinical Brief."
    - **Natural Language Retrieval**: Providing a conversational interface for family health history.

- **Explicitly NOT Handled by AI**: 
    - **Medical Diagnosis**: The AI is strictly forbidden from interpreting results as "good" or "bad."
    - **Final Identity Assignment**: The AI suggests a patient name; a deterministic "Identity Guard" logic determines if the report belongs in the current folder.
    - **Critical Data Storage**: The AI produces a draft; persistence is handled by Supabase RLS policies.

- **Requirement Rationale**: Traditional OCR/Regex parsers fail on variable hospital templates. LLMs provide a "fuzzy" semantic parser that handles synonyms and varied linguistic structures (e.g., "Take twice daily" vs "BID").

## 2. High-Level AI Workflow
1.  **Ingestion**: Files are converted to Base64 (images) or text (PDFs via PDF.js).
2.  **Context Truncation**: PDF text is capped at 8,000 characters to prevent context-window "lost in the middle" degradation and control token costs.
3.  **Extraction (Synchronous)**: 
    - The `geminiService` calls the model with a `responseSchema` (JSON Mode).
    - Output is parsed via a "Robust Parser" that handles conversational prefixing or truncated JSON.
4.  **Assistant (Conversational)**:
    - User query is bundled with a "Family Snapshot" (Current Meds + Timeline Summaries).
    - The AI returns markdown text with specialized Deep Link tags (`[VIEW:Title:ID]`).
5.  **Bypass Logic**: If the Identity Guard detects a critical name mismatch, the automated Medication Linkage is paused for human review.

## 3. Models Used

| Model Name | Version | Rationale | Strengths | Risks |
| :--- | :--- | :--- | :--- | :--- |
| `gemini-3-flash-preview` | Latest | High-speed, high-density reasoning at low token cost. | Native JSON mode, strong multimodal support. | Preview models can have subtle behavioral drifts in JSON formatting. |

## 4. Prompt Structure Overview
- **System Prompt (Instruction Layer)**: Defines the "Clinical Data Analyst" persona and hard constraints.
- **Context Layer (Dynamic)**: Injected clinical text or image data.
- **Schema Layer (Constraint Layer)**: Uses the `responseSchema` property in the SDK to enforce field types at the generation level.

## 5. System Prompt(s)

### Extraction Engine
**Prompt**:
> "Act as a clinical data analyst. Extract info from the document. Identify Patient Name (Human name only, no IDs). Identify the date of consultation. Decipher medications. IMPORTANT FOR MEDICATIONS: For each drug, if the purpose is not written, use your clinical knowledge to INFER the most likely medical purpose. DO NOT leave the purpose as 'Unknown' if the drug is a recognizable brand or generic. OUTPUT ONLY VALID JSON."

- **Purpose**: Force semantic inference over literal extraction.
- **Behavioral Constraints**: Strips the model's conversational filler; enforces specific date formatting.
- **Assumptions**: Assumes the model has internal knowledge of common pharmacology.
- **Brittle Areas**: If the model’s pharmacology knowledge is outdated (new drug names), inference may hallucinate a purpose.

### Health Assistant
**Prompt**:
> "You are medHist Assistant. Current user: {userName}. {MemberContexts} 1. Map 'I/me/my' to {userName}. 2. Deep Link Button: [VIEW:Short Title:DOC_ID]. 3. Be clinical and concise."

- **Purpose**: Identity mapping and UI integration.
- **Brittle Areas**: Relies on the model precisely copying the `DOC_ID` (UUID string). One character error breaks the UI button.

## 6. User Prompt Templates

| Template | Placeholder | Input Constraints |
| :--- | :--- | :--- |
| `Extraction Context` | `{contentPart}` | Text string < 8k chars OR Base64 Image. |
| `Assistant Query` | `{userMessage}` | Raw user string; must be sanitized for control characters. |

## 7. Output Format & Contracts
The extraction pipeline expects **JSON** with the following keys:
- `date`: (String) YYYY-MM-DD.
- `reportType`: (String) Categorization.
- `summary`: (String) Maximum 500 characters.
- `medications`: (Array of Objects) `{ name, dosage, frequency, purpose }`.

**Downstream Dependencies**:
- `supabaseService.addTimelineEntry` uses the `date` for deduplication checks.
- `MedicationManager` uses `purpose` to categorize drugs.

## 8. Guardrails & Safety Mechanisms
- **Identity Guard**: Client-side logic that compares `patient_name` (AI) vs `family_member_id.name` (DB).
- **Robust Parser**: Strips Markdown code blocks (` ```json `) if the model includes them despite instructions.
- **Salvage Mode**: If JSON parsing fails entirely, a Regex scraper (`salvageMedications`) attempts to pull drug names from the raw text to prevent data loss.

## 9. Temperature, Tokens & Tuning Parameters

| Parameter | Value | Rationale | Impact of Modification |
| :--- | :--- | :--- | :--- |
| **Temperature** | 1.0 | Allows the model to use clinical reasoning for "Purpose" inference. | Reducing (<0.3) makes the model more literal/robotic; increasing (>1.0) risks JSON syntax errors. |
| **Max Tokens** | 2048 | Headroom for clinical summaries and medication lists. | Too low will truncate JSON, causing parse failures. |
| **Thinking Budget**| 0 | Not needed for simple extraction; reduces latency. | Adding a budget increases cost/latency for marginal gain in this use case. |

## 10. Error Handling & Failure Modes
- **Hallucinated UUIDs**: The Assistant may hallucinate a `DOC_ID` that doesn't exist. The UI handles this via a "Link Expired" alert.
- **JSON Truncation**: Handled by `repairJson` utility which balances braces/brackets.
- **Refusals**: If a document contains explicit graphic content, the model may refuse. The UI captures this and defaults to a "Manual Review Required" state.

## 11. Security & Privacy Considerations
- **PII Extraction**: The system extracts names to verify identities but does not store them in the LLM's memory.
- **Prompt Injection**: Assistant prompt includes user input. We mitigate risk by using `systemInstruction` in the `chats.create` config, which is more resistant than appending instructions to the user prompt.

## 12. Cost & Performance Considerations
- **Token Efficiency**: PDFs are truncated to the first 8,000 characters. This usually covers the "Findings" and "Plan" sections of medical reports.
- **Latency**: `gemini-3-flash` is used over `pro` to maintain an "instant" feel (target < 4s for extraction).

## 13. Known Limitations & Trade-offs
- **OCR Limitations**: If a PDF text layer is corrupt, the system falls back to the Image modality (Multimodal), which is more expensive and slightly slower.
- **Purpose Ambiguity**: Medications with multiple indications (e.g., *Propranolol* for anxiety vs. heart) may be mis-inferred.

## 14. Guidelines for Future Modifications
- **Model Swaps**: If swapping to `gemini-3-pro`, update the `maxOutputTokens` and monitor for increased "chatty" behavior which might break the `robustJsonParse`.
- **Prompt Tweaks**: Always regression test against `SAMPLE_REPORTS.md`. Small changes in the "Analyst" persona can lead the model to stop inferring medication purposes.

## 15. Notes for Future Maintainers
- **The "DOC_ID" Brittleness**: The Deep Link logic in `HealthAssistant.tsx` is highly sensitive. If you change how IDs are stored in the DB, you **must** update the system prompt to reflect the new ID format.
- **Salvage Logic**: The `salvageMedications` regex in `geminiService.ts` is the final safety net. If you change the extraction prompt, verify this regex still works with the model's new linguistic patterns.

---
*medHist AI Logic Documentation v1.3.1*
