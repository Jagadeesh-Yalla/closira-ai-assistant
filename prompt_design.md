# Prompt Design & Architecture: Closira AI Assistant

## 1. System Prompt Strategy
The system prompt establishes a strict, state-aware persona for an AI Customer Support Assistant operating at Bloom Aesthetics Clinic. It enforces a 4-stage operational funnel (FAQ, Lead Qualification, Escalation, Summary) while constantly validating inputs against a local Standard Operating Procedure (SOP) dataset.

## 2. Hallucination Prevention & Guardrails
- **Strict Grounding Clause:** The agent is explicitly instructed that it has zero knowledge outside of the provided context. [cite_start]If a user query falls outside the specified treatments (Botox, Fillers, Consultations) or operational bounds, the model is barred from synthesizing answers[cite: 6].
- [cite_start]**Deterministic Hand-off:** Instead of guessing or hallucinating details, out-of-bounds questions dynamically flip the model's tracking logic to flag an immediate escalation event[cite: 6].

## 3. Confidence & Criteria-Based Escalation
Escalation is treated as a deterministic data flag. [cite_start]Rather than rely on soft semantic choices, the assistant monitors conversations for sharp algorithmic triggers based on the SOP[cite: 10]:
1. [cite_start]Negative sentiment / Customer complaints[cite: 10].
2. [cite_start]Clinical or medical risk inquiries (e.g., side effects, pain management)[cite: 10].
3. [cite_start]Value/Pricing negotiation outside basic bounds[cite: 10].
4. [cite_start]Out-of-SOP requests[cite: 6].
5. [cite_start]Multi-turn execution loops (more than 2 unanswered tracks)[cite: 10].

## 4. Structured Output Format
To enable seamless stage tracking, the model appends a structured `JSON_META` payload to every output block. This tracks structural data extraction, current active stage, and escalation statuses in real-time.