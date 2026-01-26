# Scalability & Extensibility Notes

## 1. Current Scalability Baseline
The system is currently optimized for **Family-Scale Operations**. It assumes a low-concurrency, high-integrity usage pattern where a few members of a family group interact with a medical registry.

- **Optimized for**: "Bursty" uploads (e.g., after a doctor's visit) and infrequent conversational queries.
- **Implicit Assumptions**:
    - Family units remain < 10 members.
    - Clinical records per patient stay < 500 (affecting the Assistant's context window).
    - File sizes are strictly < 10MB.
- **Sensitivity**: The system is most sensitive to **Client-Side Memory**. PDF rendering and Base64 transcoding happen in the browser, meaning a low-end mobile device is the actual scaling bottleneck, not the backend.

## 2. What Breaks at 10× Users
Scaling from 1,000 to 10,000 users will expose architectural "No-Backend" trade-offs.

| Component | Failure Mode | Symptom |
| :--- | :--- | :--- |
| **Gemini Quota** | Per-Key Rate Limiting | 429 Errors; users see "System Busy" fallbacks. |
| **Supabase Storage** | Connection Pooling | Latency spikes during concurrent binary uploads. |
| **RLS Performance** | Filter Complexity | Slower dashboard hydration as `profiles` cross-joins `families`. |
| **Assistant Latency** | Context Bloat | The "Snapshot" prompt will eventually exceed the "Flash" model's efficient processing speed. |

- **Gradual vs. Sudden**: AI failures are **sudden** (rate limits). Database degradation is **gradual** (slower hydration).
- **Developer Warning**: You will notice a spike in "Salvage Mode" logs as model latency leads to more frequent partial JSON returns.

## 3. AI Scalability Considerations
The current AI strategy is **Linear per Transaction**. One upload = One extraction call.

- **Token Growth**: While extraction is static, the **Health Assistant** context grows linearly with every report added to a family.
- **Concurrency**: Google’s "Flash" models handle high concurrency well, but the single `API_KEY` bottleneck is real. 
- **Mitigation**: 
    - **Caching**: We currently do not cache AI responses. At 10x, we would need a server-side "Embeddings" layer to perform RAG (Retrieval Augmented Generation) instead of sending the full timeline in the prompt.

## 4. Model Swap Readiness
The system is **Highly Decoupled** from the specific Gemini version.

- **Decoupling Points**: The `responseSchema` and `robustJsonParse` logic act as an adapter layer. 
- **Tightly Coupled Areas**: The "Salvage Mode" regex and specific Prompt wording are tuned for `gemini-3-flash-preview`. 
- **Testing Requirements**: A model swap requires a "Vibe Check" on **Inference Reliability**. A "smarter" model might start over-explaining or adding conversational fluff that breaks the JSON parser.

## 5. Extending AI Capabilities (Tools / Function Calling)
Adding tools (e.g., "Schedule a real appointment" or "Search for clinical trials") is a **Natural Extension**.

- **Orchestration**: Logic currently lives in `geminiService.ts`. Transitioning to Tool-calling would require a moderate refactor of the `chatWithHealthAssistant` function to handle `functionCall` and `functionResponse` loops.
- **Risks**: Tool execution in a "No-Backend" app is risky. The client would have to execute the function, which might require exposing more sensitive Supabase keys to the browser.

## 6. Multi-Tenant Readiness
The system is **Native Multi-Tenant** thanks to Supabase Row Level Security (RLS).

- **Boundary Enforcement**: Every query is filtered by `family_id`. 
- **Risks**: The "Leaky Tenant" problem occurs if a developer adds a new table and forgets to enable RLS. The database becomes a "public bucket" by default in Supabase if RLS is toggled off.
- **Requirement**: True multi-tenancy at 100x might require "Database Sharding" if a single Postgres instance hits the IOPS limit.

## 7. Data Growth & Long-Term Storage Impact
Postgres handles millions of rows well, but the **Prompt Bloat** is the primary concern.

- **Indexing**: Current indexes on `family_id` and `member_id` are sufficient for 10^6 rows.
- **Prompt Size**: Sending a 10-year medical history in a single prompt to the Assistant will eventually hit the 1M token limit or become prohibitively expensive.
- **Archival**: We will eventually need a "Cold Storage" strategy for reports older than 5 years.

## 8. Horizontal vs. Vertical Scaling Strategy
- **Horizontal**: The Frontend (Vercel/CDN) and AI (Google Cloud) scale horizontally by default.
- **Vertical**: Supabase (Postgres) scales vertically. At high load, you must pay for more RAM/CPU on the database instance.
- **Managed Scaling**: We offload the hardest scaling problems (Auth concurrency and Storage distribution) to Supabase and Google.

## 9. Cost Scaling Characteristics
- **Linear**: Storage and Extraction. 10x users = 10x cost.
- **Superlinear**: Assistant usage. As users store more data, each question becomes "heavier" in tokens.
- **Cost Cliff**: Moving from Gemini "Free" tier to "Pay-as-you-go" is the first cliff. The second is Supabase's egress and storage fees.

## 10. Architectural Constraints & Trade-offs
- **Constraint**: **Client-side API Keys**. This limits our ability to use "Safety Filters" or "Request Proxying" to hide keys. It was accepted for "No-Backend" simplicity.
- **Constraint**: **Deterministic Identity Guard**. We rely on a simple name-matching regex. As we scale, we may need a "Fuzzy Identity Service" which is a separate microservice.
- **Hardest to Remove**: The reliance on the browser to process 10MB PDFs. Moving this to the server (Lambda) would be a major architectural shift.

## 11. Safe Extension Guidelines
- **Safe**: Adding new UI themes, adding new "Relationship" types, adding more icons.
- **Architectural Review Required**: Changing the `responseSchema`, adding tool-calling, modifying RLS policies.
- **Redesign Required**: Changing from "Family" isolation to "Individual" isolation.

## 12. Known Risks & Future Refactor Triggers
- **Trigger 1**: AI Extraction takes > 10 seconds. (Requires moving OCR to a background worker).
- **Trigger 2**: Dashboard hydration takes > 2 seconds. (Requires a "Summary" table to avoid heavy joins).
- **Trigger 3**: Monthly AI costs exceed $2/user. (Requires prompt compression or local LLM execution for simple tasks).

## 13. Notes for Future Architects
- **Non-Obvious Coupling**: The `DOC_ID` in the Assistant prompt is the "Glue." If you change the UUID format, the chatbot stops being able to "see" reports.
- **The "Vibe" Warning**: This app relies on the model "feeling" clinical. "Flash" models are prone to sudden behavioral changes after updates; keep a "Gold Master" set of `SAMPLE_REPORTS.md` for regression testing.

---
*medHist Scalability Specification v1.3.1*