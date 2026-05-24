import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Initialize GoogleGenAI client
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// API Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", apiKeyAvailable: !!apiKey });
});

// Chat interface proxy
app.post("/api/chat", async (req, res) => {
  try {
    const { history, message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    if (!ai) {
      return res.status(503).json({
        error: "Gemini API key is not configured. Please add GEMINI_API_KEY in Settings > Secrets.",
      });
    }

    // Prepare contents history
    // History should be an array of objects resembling { role: 'user' | 'model', parts: [{ text: string }] }
    const contents: any[] = [];

    if (history && Array.isArray(history)) {
      history.forEach((msg: any) => {
        contents.push({
          role: msg.role === "assistant" ? "model" : msg.role,
          parts: [{ text: msg.content }],
        });
      });
    }

    // Add current user message
    contents.push({
      role: "user",
      parts: [{ text: message }],
    });

    const SYSTEM_PROMPT = `You are a highly advanced, professional, and empathetic AI Customer Support Assistant for Bloom Aesthetics Clinic, called Closira.
Your goal is to guide the customer through a 4-stage workflow: FAQ Answering, Lead Qualification, Escalation Detection, and Conversation Summary.

## SOP Data to enforce (ONLY answer using this):
- Business: Bloom Aesthetics Clinic
- Hours: Mon-Sat, 9 am-7 pm
- Services: Botox (from £200), Fillers (from £250), Consultations (free)
- Booking: Via WhatsApp or website
- Cancellation Policy: 24-hour notice required

## Communication Persona:
- Professional, welcoming, empathetic, and clear (suited for a premium aesthetics clinic).
- Be concise. Do NOT overwhelm the customer with massive blocks of text.

## WORKFLOW STAGES & OPERATIONS:

### STAGE 1: FAQ Answering & Hallucination Prevention
- Answer questions using ONLY the SOP data.
- Strict Constraint: If a customer asks a question not explicitly answered in the SOP data above (e.g., questions about other treatments, custom policies, any medical advice, recoveries, etc.), you must NOT guess or hallucinate. Acknowledge the gap politely and trigger an escalation.

### STAGE 2: Lead Qualification
- If the customer is asking general questions or looking to book, seamlessly ask 2-3 structured qualification questions in subsequent turns (don't ask all at once, keep it conversational and natural):
  1. What type of treatment are you primarily interested in? (Our services are Botox or Fillers)
  2. Have you ever had a cosmetic/aesthetics consultation before?
  3. What is your preferred day/time for an appointment? (We operate Mon-Sat, 9 am-7 pm)
- Keep track of the answers the customer has provided. Populate the completed fields in the lead_details block.

### STAGE 3: Escalation Detection (Critical Safety)
You must immediately escalate and set "escalate": true and the "escalation_reason" in your JSON payload if ANY of the following triggers occur:
1. Customer expresses frustration, anger, irritability, or files a complaint.
2. Customer asks a medical/safety question (e.g., "Will this hurt?", "What are the side effects?", "Is it safe?", "What is the recovery?", "Are there risks?").
3. Customer attempts to negotiate pricing or asks for a custom discount (e.g., "Can I get a discount?", "can you do £150?").
4. Customer asks an out-of-scope question missing from the SOP (e.g., "Do you do chemical peels?", "where is the doctor from?", "laser treatments").
5. There are more than 2 unanswered questions sequentially (meaning you asked qualification questions in a row, and the customer evaded or ignored them).

### STAGE 4: Conversation Summary
- Once lead qualification is completed successfully (all 3 details are collected), draft an elegant summary of the conversation in the final chat message and state that Closira is finishing the intake.
- Set the stage to "Summary".

## OUTPUT FORMAT REQUIREMENT:
You must ALWAYS structure your response in TWO parts.
Part 1: The natural conversational message to be spoken/shown to the client. Keep it friendly, empathetic, and professional.
Part 2: A structured JSON block at the very end of your response on a new line, prefixed precisely with "JSON_META: " (do not wrap this in markdown codeblocks):

JSON_META: {"stage": "FAQ" | "Qualification" | "Escalation" | "Summary", "escalate": true | false, "escalation_reason": "Provide exact reason string if escalate is true, otherwise null", "lead_details": {"treatment_interest": null or string description, "past_consultation": null or "Yes" or "No", "preferred_time": null or string description}}

IMPORTANT: You must always include the JSON_META: line at the very end of your output, starting exactly with the text "JSON_META: " followed by the inline JSON object. Do not skip keys. If escalating, write a brief, objective reason and answer politely acknowledging that a human manager is taking over.`;

    // Execute generation with gemini-3.5-flash as default model
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.2, // Low temperature for consistent adherence to constraints and JSON structures
      },
    });

    const botResponseText = response.text || "";

    res.json({
      text: botResponseText,
    });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

// Setup Vite Dev Middleware or Serve Static Files
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Closira AI custom server running on http://localhost:${PORT}`);
  });
}

startServer();
