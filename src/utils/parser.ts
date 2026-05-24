import { WorkflowMetadata } from "../types";

export function parseBotResponse(rawText: string): {
  parsedText: string;
  jsonPayload: WorkflowMetadata | null;
} {
  let parsedText = rawText;
  let jsonPayload: WorkflowMetadata | null = null;

  // Check for JSON_META: prefix as used in the Python workflow script
  if (rawText.includes("JSON_META:")) {
    const parts = rawText.split("JSON_META:");
    parsedText = parts[0].trim();
    try {
      jsonPayload = JSON.parse(parts[1].trim());
    } catch (e) {
      console.warn("Failed to parse JSON_META prefix:", e);
    }
  } else {
    // Standard markdown code block ```json ... ```
    const jsonRegex = /```json\s*([\s\S]*?)\s*```/;
    const match = rawText.match(jsonRegex);

    if (match && match[1]) {
      parsedText = rawText.replace(jsonRegex, "").trim();
      try {
        jsonPayload = JSON.parse(match[1].trim());
      } catch (e) {
        console.warn("Failed to parse JSON enclosed in code tags:", e);
      }
    }

    // Fallback to searching for the last block starting with { and ending with }
    if (!jsonPayload) {
      const fallbackRegex = /(\{[\s\S]*?\})\s*$/;
      const fallbackMatch = rawText.match(fallbackRegex);
      if (fallbackMatch && fallbackMatch[1]) {
        try {
          jsonPayload = JSON.parse(fallbackMatch[1].trim());
          parsedText = rawText.replace(fallbackRegex, "").trim();
        } catch (e) {
          console.warn("Failed to parse raw trailing JSON block:", e);
        }
      }
    }
  }

  // Clean up any remaining trailing markdown formatting or JSON markers
  parsedText = parsedText
    .replace(/```json\s*$/gi, "")
    .replace(/```\s*$/gi, "")
    .trim();

  return {
    parsedText,
    jsonPayload,
  };
}
