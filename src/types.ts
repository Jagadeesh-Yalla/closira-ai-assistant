export type WorkflowStage = "FAQ" | "Qualification" | "Escalation" | "Summary";

export interface LeadDetails {
  treatment_interest: string | null;
  past_consultation: "Yes" | "No" | string | null;
  preferred_time: string | null;
}

export interface WorkflowMetadata {
  stage: WorkflowStage;
  escalate: boolean;
  escalation_reason: string | null;
  lead_details: LeadDetails;
}

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string; // Original raw response containing both chat text and JSON
  parsedText: string; // Bot's natural chat text only
  timestamp: string;
  jsonPayload?: WorkflowMetadata | null;
  isEscalationMessage?: boolean;
}

export interface CannedScenario {
  id: string;
  title: string;
  subtitle: string;
  category: "Standard FAQ" | "Lead Qualification" | "Safety Escalation";
  initialMessage: string;
  badge: string;
  badgeColor: string;
  description: string;
}
