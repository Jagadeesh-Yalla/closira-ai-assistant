import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  MessageSquare,
  Sliders,
  AlertTriangle,
  Clock,
  CheckCircle,
  HelpCircle,
  RefreshCw,
  Send,
  User,
  ShieldAlert,
  ListChecks,
  ChevronRight,
  Database,
  Info,
  Calendar,
  Layers,
  Heart,
  UserPlus,
  Play
} from "lucide-react";
import { parseBotResponse } from "./utils/parser";
import { CLINIC_SOP, SIMULATION_SCENARIOS } from "./data";
import { Message, WorkflowMetadata, CannedScenario } from "./types";

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLiveMode, setIsLiveMode] = useState(true); // Default to live server (which fails back to mock if no API key is set)
  const [isApiKeySet, setIsApiKeySet] = useState(false);
  const [checkingApiState, setCheckingApiState] = useState(true);
  const [loading, setLoading] = useState(false);
  const [humanTakeover, setHumanTakeover] = useState(false);
  const [unansweredCount, setUnansweredCount] = useState(0);

  // Active cognitive state tracked for the visualizer
  const [activeMetadata, setActiveMetadata] = useState<WorkflowMetadata>({
    stage: "FAQ",
    escalate: false,
    escalation_reason: null,
    lead_details: {
      treatment_interest: null,
      past_consultation: null,
      preferred_time: null,
    },
  });

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Check backend health and API key presence
  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await fetch("/api/health");
        const data = await res.json();
        if (data.status === "ok" && data.apiKeyAvailable) {
          setIsApiKeySet(true);
          setIsLiveMode(true);
        } else {
          setIsApiKeySet(false);
          setIsLiveMode(false); // Default to local simulator if no API key is available
        }
      } catch (err) {
        console.warn("Backend not running or reachable yet:", err);
        setIsApiKeySet(false);
        setIsLiveMode(false);
      } finally {
        setCheckingApiState(false);
      }
    }
    checkHealth();
  }, []);

  // Set initial welcome message
  useEffect(() => {
    resetConversation();
  }, []);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const resetConversation = () => {
    const welcomeText = "Hello! Welcome to **Bloom Aesthetics Clinic**. I am **Closira**, your intelligent aesthetics support assistant.\n\nHow can I help you today? Feel free to ask about our hours, standard Botox or Filler pricing, or cancellation guidelines! ✨";
    const initialMeta: WorkflowMetadata = {
      stage: "FAQ",
      escalate: false,
      escalation_reason: null,
      lead_details: {
        treatment_interest: null,
        past_consultation: null,
        preferred_time: null,
      },
    };

    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: welcomeText,
        parsedText: welcomeText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        jsonPayload: initialMeta,
      },
    ]);
    setActiveMetadata(initialMeta);
    setHumanTakeover(false);
    setUnansweredCount(0);
  };

  // Process the bot response and update cognitive indicators
  const processIncomingResponse = (botRawText: string) => {
    const { parsedText, jsonPayload } = parseBotResponse(botRawText);

    // Default payload fallback
    const effectivePayload: WorkflowMetadata = jsonPayload || {
      stage: activeMetadata.stage,
      escalate: activeMetadata.escalate,
      escalation_reason: activeMetadata.escalation_reason,
      lead_details: { ...activeMetadata.lead_details },
    };

    // Keep state accumulated if JSON returned sparse or missing keys
    const mergedMetadata: WorkflowMetadata = {
      stage: effectivePayload.stage || activeMetadata.stage,
      escalate: typeof effectivePayload.escalate === "boolean" ? effectivePayload.escalate : activeMetadata.escalate,
      escalation_reason: effectivePayload.escalation_reason || activeMetadata.escalation_reason,
      lead_details: {
        treatment_interest: effectivePayload.lead_details?.treatment_interest || activeMetadata.lead_details.treatment_interest,
        past_consultation: effectivePayload.lead_details?.past_consultation || activeMetadata.lead_details.past_consultation,
        preferred_time: effectivePayload.lead_details?.preferred_time || activeMetadata.lead_details.preferred_time,
      },
    };

    // If an escalation is triggered, lock it
    if (mergedMetadata.escalate) {
      mergedMetadata.stage = "Escalation";
    }

    setActiveMetadata(mergedMetadata);

    const botMsg: Message = {
      id: "bot-" + Date.now(),
      role: "assistant",
      content: botRawText,
      parsedText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      jsonPayload: mergedMetadata,
      isEscalationMessage: mergedMetadata.escalate,
    };

    setMessages((prev) => [...prev, botMsg]);
  };

  // local simulation logic for offline/mock mode
  const runMockSimulation = (userMessageText: string) => {
    setLoading(true);
    setTimeout(() => {
      const lower = userMessageText.toLowerCase();
      let botResponse = "";
      let simulatedMeta: WorkflowMetadata = { ...activeMetadata };

      // Rule 1: Frustrated user complaint escalation
      if (
        lower.includes("useless") ||
        lower.includes("broken") ||
        lower.includes("joke") ||
        lower.includes("annoy") ||
        lower.includes("worst") ||
        lower.includes("upset") ||
        lower.includes("hate")
      ) {
        botResponse =
          "I am truly sorry to hear that you are having an frustrating experience with our digital booking services. Customer care is our highest priority at Bloom. I am immediately freezing this chatbot session and putting you in touch with our Clinic Manager, who will personally contact you to resolve this immediately.\n\n```json\n{\n  \"stage\": \"Escalation\",\n  \"escalate\": true,\n  \"escalation_reason\": \"Customer expresses high frustration or files a service complaint.\",\n  \"lead_details\": {\n    \"treatment_interest\": " + (simulatedMeta.lead_details.treatment_interest ? `"${simulatedMeta.lead_details.treatment_interest}"` : "null") + ",\n    \"past_consultation\": " + (simulatedMeta.lead_details.past_consultation ? `"${simulatedMeta.lead_details.past_consultation}"` : "null") + ",\n    \"preferred_time\": " + (simulatedMeta.lead_details.preferred_time ? `"${simulatedMeta.lead_details.preferred_time}"` : "null") + "\n  }\n}\n```";
      }
      // Rule 2: Medical advice safety warning
      else if (
        lower.includes("hurt") ||
        lower.includes("pain") ||
        lower.includes("side effect") ||
        lower.includes("risk") ||
        lower.includes("safe") ||
        lower.includes("danger") ||
        lower.includes("swelling") ||
        lower.includes("bruis")
      ) {
        botResponse =
          "While treatments at Bloom Aesthetics are delivered under professional care, medical questions such as pain tolerances, healing side effects, and risks require a clinical assessment. To ensure your complete safety, I am escalating this conversation to our medical practitioner who will answer this for you directly. We appreciate your safety orientation!\n\n```json\n{\n  \"stage\": \"Escalation\",\n  \"escalate\": true,\n  \"escalation_reason\": \"Customer requested clinical/safety/medical information: " + userMessageText.replace(/"/g, "'") + "\",\n  \"lead_details\": {\n    \"treatment_interest\": " + (simulatedMeta.lead_details.treatment_interest ? `"${simulatedMeta.lead_details.treatment_interest}"` : "null") + ",\n    \"past_consultation\": " + (simulatedMeta.lead_details.past_consultation ? `"${simulatedMeta.lead_details.past_consultation}"` : "null") + ",\n    \"preferred_time\": " + (simulatedMeta.lead_details.preferred_time ? `"${simulatedMeta.lead_details.preferred_time}"` : "null") + "\n  }\n}\n```";
      }
      // Rule 3: Negotiation / Price discussion Escalation
      else if (
        lower.includes("discount") ||
        lower.includes("lower") ||
        lower.includes("negotiate") ||
        lower.includes("cheap") ||
        lower.includes("expensive") ||
        lower.includes("deal") ||
        lower.includes("offer me")
      ) {
        botResponse =
          "At Bloom Aesthetics Clinic, our service pricing reflects the high safety standards, state-of-the-art products, and clinical mastery we apply. We do not support self-directed pricing negotiations inside the support terminal. I am flagging your profile for our client services host to see if any seasonal promotional packages apply to your booking request.\n\n```json\n{\n  \"stage\": \"Escalation\",\n  \"escalate\": true,\n  \"escalation_reason\": \"Customer attempting to negotiate pricing bounds.\",\n  \"lead_details\": {\n    \"treatment_interest\": " + (simulatedMeta.lead_details.treatment_interest ? `"${simulatedMeta.lead_details.treatment_interest}"` : "null") + ",\n    \"past_consultation\": " + (simulatedMeta.lead_details.past_consultation ? `"${simulatedMeta.lead_details.past_consultation}"` : "null") + ",\n    \"preferred_time\": " + (simulatedMeta.lead_details.preferred_time ? `"${simulatedMeta.lead_details.preferred_time}"` : "null") + "\n  }\n}\n```";
      }
      // Rule 4: Out-of-SOP treatments (chemical peel, laser, etc.)
      else if (
        lower.includes("peel") ||
        lower.includes("laser") ||
        lower.includes("waxing") ||
        lower.includes("microderm") ||
        lower.includes("massage") ||
        lower.includes("surgery") ||
        lower.includes("facials")
      ) {
        botResponse =
          "Bloom Aesthetics Clinic is a boutique aesthetic provider specializing exclusively in non-surgical Botulinum Toxin and Dermal Fillers. Since we do not list chemical peels, laser plans, or beauty facial packages in our active SOP, I cannot confirm booking availabilities for other options. Let me refer this to our clinicians to suggest trusted partners or answer questions directly.\n\n```json\n{\n  \"stage\": \"Escalation\",\n  \"escalate\": true,\n  \"escalation_reason\": \"Customer requested out-of-SOP service type not offered in our menu.\",\n  \"lead_details\": {\n    \"treatment_interest\": null,\n    \"past_consultation\": " + (simulatedMeta.lead_details.past_consultation ? `"${simulatedMeta.lead_details.past_consultation}"` : "null") + ",\n    \"preferred_time\": " + (simulatedMeta.lead_details.preferred_time ? `"${simulatedMeta.lead_details.preferred_time}"` : "null") + "\n  }\n}\n```";
      }
      // Rule 5: Evading questions sequential checks
      else if (
        simulatedMeta.stage === "Qualification" &&
        !lower.includes("botox") &&
        !lower.includes("filler") &&
        !lower.includes("consult") &&
        !lower.includes("yes") &&
        !lower.includes("no") &&
        !lower.includes("mon") &&
        !lower.includes("tue") &&
        !lower.includes("wed") &&
        !lower.includes("thu") &&
        !lower.includes("fri") &&
        !lower.includes("sat") &&
        !lower.includes("afternoon") &&
        !lower.includes("morning") &&
        !userMessageText.match(/\d/)
      ) {
        const nextUnanswered = unansweredCount + 1;
        setUnansweredCount(nextUnanswered);

        if (nextUnanswered >= 2) {
          botResponse =
            "I noticed we are finding it hard to coordinate your consultation preferences. To prevent loops and ensure an effortless journey for you, I've triggered a rapid medical check-in so our client team can assist you directly over a standard phone call or WhatsApp sync.\n\n```json\n{\n  \"stage\": \"Escalation\",\n  \"escalate\": true,\n  \"escalation_reason\": \"Encountered sequence stall: customer evaded 2 structured qualification requests consecutively.\",\n  \"lead_details\": {\n    \"treatment_interest\": " + (simulatedMeta.lead_details.treatment_interest ? `"${simulatedMeta.lead_details.treatment_interest}"` : "null") + ",\n    \"past_consultation\": " + (simulatedMeta.lead_details.past_consultation ? `"${simulatedMeta.lead_details.past_consultation}"` : "null") + ",\n    \"preferred_time\": " + (simulatedMeta.lead_details.preferred_time ? `"${simulatedMeta.lead_details.preferred_time}"` : "null") + "\n  }\n}\n```";
        } else {
          botResponse =
            "No worries at all! To make sure I book you into the right specialized calendar, could you clarify: what treatment are you primarily interested in, and have you ever had an aesthetics consultation with us or another clinic before?\n\n```json\n{\n  \"stage\": \"Qualification\",\n  \"escalate\": false,\n  \"escalation_reason\": null,\n  \"lead_details\": {\n    \"treatment_interest\": " + (simulatedMeta.lead_details.treatment_interest ? `"${simulatedMeta.lead_details.treatment_interest}"` : "null") + ",\n    \"past_consultation\": null,\n    \"preferred_time\": null\n  }\n}\n```";
        }
      }
      // Step-by-step FAQ matching
      else if (lower.includes("hour") || lower.includes("open") || lower.includes("time") || lower.includes("saturday") || lower.includes("weekend")) {
        simulatedMeta.stage = "FAQ";
        botResponse =
          "Bloom Aesthetics Clinic is delighted to welcome clients from **Monday through Saturday, between 9:00 am and 7:00 pm**. We are closed on Sundays. \n\nAre you looking to schedule an aesthetics consultation or procedure during our working times?\n\n```json\n{\n  \"stage\": \"Qualification\",\n  \"escalate\": false,\n  \"escalation_reason\": null,\n  \"lead_details\": {\n    \"treatment_interest\": null,\n    \"past_consultation\": null,\n    \"preferred_time\": null\n  }\n}\n```";
      } else if (lower.includes("botox") || lower.includes("price") || lower.includes("cost") || lower.includes("filler") || lower.includes("service") || lower.includes("consult")) {
        simulatedMeta.stage = "FAQ";
        let costDetails = "We specialize in personalized treatments. Botox starts from £200, Filler plans from £250, and initial clinical consultations are completely free!";
        
        // Accumulate treatment interest if matching
        let tInterest: string | null = simulatedMeta.lead_details.treatment_interest;
        if (lower.includes("botox")) tInterest = "Botox";
        else if (lower.includes("filler")) tInterest = "Fillers";

        botResponse =
          `${costDetails} \n\nCancellations require at least 24 hours notice. Would you like us to qualify your preferred booking day and time to coordinate an appointment?\n\n\`\`\`json\n{\n  "stage": "Qualification",\n  "escalate": false,\n  "escalation_reason": null,\n  "lead_details": {\n    "treatment_interest": ${tInterest ? `"${tInterest}"` : "null"},\n    "past_consultation": ${simulatedMeta.lead_details.past_consultation ? `"${simulatedMeta.lead_details.past_consultation}"` : "null"},\n    "preferred_time": ${simulatedMeta.lead_details.preferred_time ? `"${simulatedMeta.lead_details.preferred_time}"` : "null"}\n  }\n}\n\`\`\``;
      } else if (lower.includes("cancel") || lower.includes("policy") || lower.includes("fee") || lower.includes("reschedule")) {
        simulatedMeta.stage = "FAQ";
        botResponse =
          "At Bloom, we maintain a boutique calendar reserved uniquely for your care. We kindly require at least a **24-hour notice for any cancellations or booking shifts**. Consultations are entirely free of charge!\n\nWould you like me to guide you through bookings for Botox or Filler?\n\n```json\n{\n  \"stage\": \"FAQ\",\n  \"escalate\": false,\n  \"escalation_reason\": null,\n  \"lead_details\": {\n    \"treatment_interest\": null,\n    \"past_consultation\": null,\n    \"preferred_time\": null\n  }\n}\n```";
      }
      // Qualification inputs parsing
      else {
        // Collect lead elements dynamically
        let treat = simulatedMeta.lead_details.treatment_interest;
        if (lower.includes("botox")) treat = "Botox";
        else if (lower.includes("filler")) treat = "Fillers";

        let past = simulatedMeta.lead_details.past_consultation;
        if (lower.includes("yes") || lower.includes("have had") || lower.includes("before")) past = "Yes";
        else if (lower.includes("no") || lower.includes("never") || lower.includes("first time")) past = "No";

        let time = simulatedMeta.lead_details.preferred_time;
        if (lower.includes("saturday") || lower.includes("morning") || lower.includes("afternoon") || lower.includes("pm") || lower.includes("am") || lower.includes("monday") || lower.includes("friday")) {
          time = userMessageText;
        }

        // Fillers defaults
        if (!treat) treat = "Botox";
        if (!past) past = "No";
        if (!time) time = "Saturday afternoon";

        // Let's mark as summary if fully populated
        const isComplete = treat && past && time;
        const currentStage = isComplete ? "Summary" : "Qualification";

        if (isComplete) {
          botResponse =
            "Wonderful! I have collected your complete onboarding details:\n\n- **Treatment Interest:** " + treat + "\n- **Past Aesthetics Consultations:** " + past + "\n- **Preferred Day & Slot:** " + time + "\n\nClosira has generated your Clinical Intake Card. A care assistant will message you on WhatsApp under standard office hours to secure your session. Thank you for booking with Bloom Aesthetics Clinic!\n\n```json\n{\n  \"stage\": \"Summary\",\n  \"escalate\": false,\n  \"escalation_reason\": null,\n  \"lead_details\": {\n    \"treatment_interest\": \"" + treat + "\",\n    \"past_consultation\": \"" + past + "\",\n    \"preferred_time\": \"" + time + "\"\n  }\n}\n```";
        } else {
          botResponse =
            "Thank you for sharing that! To finish your clinic reservation, could you let me know: " +
            (!past ? "Have you had an aesthetics treatment or consultation before? " : "") +
            (!time ? "And what is your preferred day/time (Mon-Sat, 9 am - 7 pm)?" : "") +
            "\n\n```json\n{\n  \"stage\": \"Qualification\",\n  \"escalate\": false,\n  \"escalation_reason\": null,\n  \"lead_details\": {\n    \"treatment_interest\": " + (treat ? `"${treat}"` : "null") + ",\n    \"past_consultation\": " + (past ? `"${past}"` : "null") + ",\n    \"preferred_time\": " + (time ? `"${time}"` : "null") + "\n  }\n}\n```";
        }
      }

      processIncomingResponse(botResponse);
      setLoading(false);
    }, 1200);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || loading) return;

    const userText = inputText.trim();
    setInputText("");

    // Create user message object
    const userMsg: Message = {
      id: "user-" + Date.now(),
      role: "user",
      content: userText,
      parsedText: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);

    // Handle Human Takeover Simulator Mode
    if (humanTakeover) {
      setLoading(true);
      setTimeout(() => {
        // Human reply is simulated as just standard assistant with direct status preservation
        const responseText = "You are currently chatting with our on-call human Clinic Operator. Closira is paused. How can we help you resolve your request?";
        setMessages((prev) => [
          ...prev,
          {
            id: "operator-" + Date.now(),
            role: "assistant",
            content: responseText + "\n\n```json\n{\n  \"stage\": \"Escalation\",\n  \"escalate\": true,\n  \"escalation_reason\": \"Manual human operator takeover simulated.\",\n  \"lead_details\": " + JSON.stringify(activeMetadata.lead_details) + "\n}\n```",
            parsedText: responseText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            jsonPayload: {
              ...activeMetadata,
              stage: "Escalation",
              escalate: true,
              escalation_reason: "Manual operator takeover",
            },
          },
        ]);
        setActiveMetadata((prev) => ({
          ...prev,
          stage: "Escalation",
          escalate: true,
          escalation_reason: "Manual operator takeover",
        }));
        setLoading(false);
      }, 700);
      return;
    }

    // Run Local Simulation Mode if requested
    if (!isLiveMode) {
      runMockSimulation(userText);
      return;
    }

    // Live AI API Call
    setLoading(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          history: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          message: userText,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed server chat response.");
      }

      const data = await response.json();
      processIncomingResponse(data.text);
    } catch (err: any) {
      console.error("Live Chat Error:", err);
      // Fallback gracefully on error so that the user's interface continues to respond perfectly
      setMessages((prev) => [
        ...prev,
        {
          id: "error-" + Date.now(),
          role: "system",
          content: `⚠️ Note: Live AI Connection was interrupted or model is booting up. Falling back to Closira Client-Side Cognitive Simulation Engine. (${err.message})`,
          parsedText: `⚠️ Note: Live AI Connection was interrupted or model is booting up. Falling back to Closira Client-Side Cognitive Simulation Engine.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      runMockSimulation(userText);
    } finally {
      setLoading(false);
    }
  };

  // Launch a canned testing scenario instantly
  const launchScenario = (scenario: CannedScenario) => {
    resetConversation();
    setInputText(scenario.initialMessage);
  };

  // Format Helper for raw message displays
  const formatMarkdownBold = (text: string) => {
    return text.split("**").map((part, index) => {
      if (index % 2 === 1) {
        return <strong key={index} className="font-semibold text-stone-900">{part}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col font-sans text-stone-800 antialiased overflow-x-hidden">
      {/* Clinically Styled Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-stone-200 shadow-sm px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-600 to-rose-400 p-0.5 flex items-center justify-center shadow-md">
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                <Heart className="w-5 h-5 text-amber-600 fill-amber-50" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif text-xl tracking-tight text-stone-900 font-medium whitespace-nowrap">
                  Bloom Aesthetics Clinic
                </h1>
                <span className="text-[10px] uppercase tracking-widest bg-amber-50 text-amber-700 font-medium px-2 py-0.5 rounded border border-amber-200">
                  Closira AI v1.0
                </span>
              </div>
              <p className="text-xs text-stone-500 font-mono">
                Advanced Support & Conversational Handoff Engine
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap justify-end">
            {/* API Status Gauge */}
            <div className="flex items-center gap-2 bg-stone-100 rounded-full px-3.5 py-1.5 border border-stone-200 text-xs">
              <span className={`relative flex h-2 w-2`}>
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isApiKeySet ? "bg-emerald-400" : "bg-orange-400"}`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isApiKeySet ? "bg-emerald-500" : "bg-orange-500"}`}></span>
              </span>
              <span className="font-mono text-stone-600 font-medium">
                {checkingApiState ? "Validating Server..." : isApiKeySet ? "Gemini Live API Connected" : "Local Cognitive Simulator"}
              </span>
            </div>

            {/* Toggle between Live Gemini API / Client Local Emulation */}
            <div className="flex bg-stone-100 p-0.5 rounded-lg border border-stone-200 text-xs">
              <button
                onClick={() => setIsLiveMode(true)}
                disabled={!isApiKeySet}
                className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                  isLiveMode && isApiKeySet
                    ? "bg-white text-stone-900 shadow-sm"
                    : isApiKeySet
                    ? "text-stone-500 hover:text-stone-800"
                    : "text-stone-400 cursor-not-allowed opacity-50"
                }`}
                title={!isApiKeySet ? "Configure GEMINI_API_KEY in Secrets panel to unlock real-time intelligence!" : ""}
              >
                Live Gemini API
              </button>
              <button
                onClick={() => setIsLiveMode(false)}
                className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                  !isLiveMode ? "bg-stone-800 text-white shadow-sm" : "text-stone-500 hover:text-stone-800"
                }`}
              >
                Local Simulator
              </button>
            </div>

            <button
              onClick={resetConversation}
              className="px-3 py-1.5 rounded-lg border border-stone-300 hover:bg-stone-50 text-stone-600 hover:text-stone-900 transition flex items-center gap-1.5 text-xs font-medium bg-white"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset Session
            </button>
          </div>
        </div>
      </header>

      {/* Main Interactive Workspace Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 pb-20">
        
        {/* LEFT COLUMN: Bot Playground + Quick Scenarios */}
        <section id="chat-playground" className="lg:col-span-7 flex flex-col gap-6">
          
          {/* Section Introduction */}
          <div className="bg-gradient-to-r from-amber-50 to-stone-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-stone-700 text-xs leading-relaxed">
              <span className="font-semibold text-stone-950">Intelligent Workflows in Action</span>: Clinicians can use these automated presets or chat live to test Closira's strict adherence to Bloom Clinic's SOP boundaries, automatic lead capture, and immediate protective human escalations.
            </div>
          </div>

          {/* Preset Scenario Launcher with Categories */}
          <div id="scenario-launcher" className="bg-white rounded-xl border border-stone-200 shadow-sm p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-700 animate-pulse" />
                <h3 className="font-serif font-medium text-stone-900">Preset Simulation Scenarios</h3>
              </div>
              <span className="text-[10px] font-mono text-stone-400 uppercase tracking-widest">
                Fast Validation
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-56 overflow-y-auto pr-1">
              {SIMULATION_SCENARIOS.map((scenario) => (
                <button
                  key={scenario.id}
                  onClick={() => launchScenario(scenario)}
                  className="group relative flex flex-col text-left p-3.5 rounded-lg border border-stone-200 bg-stone-50/50 hover:bg-amber-50/50 hover:border-amber-200 transition text-xs"
                >
                  <div className="flex justify-between items-start gap-2 mb-1">
                    <span className="font-medium text-stone-900 group-hover:text-amber-800 transition">
                      {scenario.title}
                    </span>
                    <span className={`text-[9px] px-2 py-0.5 rounded border ${scenario.badgeColor} font-medium shrink-0`}>
                      {scenario.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500 font-mono line-clamp-1 mb-1 italic">
                    {scenario.subtitle}
                  </p>
                  <p className="text-[11px] text-stone-500 group-hover:text-stone-700 transition line-clamp-2">
                    {scenario.description}
                  </p>
                  <div className="mt-2 text-[10px] text-amber-700 font-semibold flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity self-end">
                    <Play className="w-2.5 h-2.5 fill-amber-700" />
                    Load Prompt
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Live Chat interface */}
          <div id="live-chat-panel" className="bg-white rounded-xl border border-stone-200 shadow-sm flex-1 flex flex-col min-h-[480px]">
            
            {/* Bot Conversation Header */}
            <div className="px-5 py-4 border-b border-stone-150 bg-stone-50/60 rounded-t-xl flex justify-between items-center flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></div>
                <div>
                  <h3 className="text-sm font-serif text-stone-800 font-semibold flex items-center gap-1.5">
                    Closira Support Chat Session
                  </h3>
                  <p className="text-[10px] text-stone-400 font-mono">
                    Current stage: <span className="font-bold text-stone-600 uppercase">{activeMetadata.stage}</span>
                  </p>
                </div>
              </div>

              {/* Operator Overrule simulation banner */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setHumanTakeover(!humanTakeover)}
                  className={`px-3 py-1 rounded-full text-[10px] font-medium transition-all flex items-center gap-1 border ${
                    humanTakeover
                      ? "bg-rose-50 text-rose-700 border-rose-200 animate-pulse font-bold"
                      : "bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200"
                  }`}
                  title="Simulate a manual human handoff where the chatbot is frozen and clinic staff takes care of the customer response."
                >
                  <UserPlus className="w-3 h-3" />
                  {humanTakeover ? "🔒 Manual Handoff Active" : "🔓 Trigger Handoff"}
                </button>
              </div>
            </div>

            {/* Scrolling Chat Pane */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 max-h-[400px]">
              {messages.map((msg) => {
                const isSystem = msg.role === "system";
                const isAssistant = msg.role === "assistant";

                if (isSystem) {
                  return (
                    <div key={msg.id} className="text-center py-2 px-4 rounded-lg bg-amber-50/70 border border-amber-200/50 text-xs text-amber-800 font-medium">
                      {msg.parsedText}
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 max-w-[85%] ${isAssistant ? "mr-auto" : "ml-auto flex-row-reverse"}`}
                  >
                    {/* Role Avatar */}
                    <div
                      className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-semibold select-none shadow-sm ${
                        isAssistant
                          ? "bg-gradient-to-tr from-stone-850 to-stone-700 text-white"
                          : "bg-amber-100 text-amber-800 border border-amber-200"
                      }`}
                    >
                      {isAssistant ? <Sparkles className="w-3.5 h-3.5 text-amber-200" /> : <User className="w-3.5 h-3.5 text-amber-700" />}
                    </div>

                    {/* Chat Bubble card container */}
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-[10px] text-stone-400 font-mono self-start select-none">
                        <span>{isAssistant ? "Closira AI" : "Client"}</span>
                        <span>•</span>
                        <span>{msg.timestamp}</span>
                      </div>

                      <div
                        className={`p-3.5 rounded-2xl text-xs line-relaxed shadow-[0_1px_2px_rgba(0,0,0,0.05)] ${
                          isAssistant
                            ? msg.isEscalationMessage
                              ? "bg-rose-50 text-rose-950 border border-rose-100 rounded-tl-none font-medium"
                              : "bg-stone-100 text-stone-900 rounded-tl-none border border-stone-200/50"
                            : "bg-amber-800 text-stone-50 rounded-tr-none"
                        }`}
                      >
                        <p className="whitespace-pre-wrap leading-relaxed">
                          {formatMarkdownBold(msg.parsedText)}
                        </p>

                        {/* Internal stage badge indicator inside each message bubble */}
                        {isAssistant && msg.jsonPayload && (
                          <div className="mt-2.5 pt-2 border-t border-dashed border-stone-300/30 flex items-center justify-between gap-2 overflow-x-hidden">
                            <span className="text-[9px] uppercase font-bold text-stone-500 font-mono tracking-wider">
                              ⚙️ Stage: {msg.jsonPayload.stage}
                            </span>
                            {msg.jsonPayload.escalate && (
                              <span className="text-[9px] font-semibold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">
                                🚨 Human Handoff Active
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Live typing feedback */}
              {loading && (
                <div className="flex gap-3 max-w-[80%] mr-auto">
                  <div className="w-8 h-8 rounded-full bg-stone-850 text-white shrink-0 flex items-center justify-center animate-spin">
                    <RefreshCw className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="p-3.5 rounded-2xl bg-stone-100 border border-stone-200 text-xs text-stone-500 font-mono rounded-tl-none flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                      </span>
                      Evaluating SOP constraints & extracting workflow state...
                    </div>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Input Submission Area */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-stone-200 bg-stone-50 rounded-b-xl flex gap-3">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={
                  humanTakeover
                    ? "Type manual operator message to speak as human manager..."
                    : "Ask Bloom Aesthetics Clinic something..."
                }
                disabled={loading}
                className="flex-1 text-xs px-4 py-3 rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 transition shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || loading}
                className="px-5 py-3 rounded-xl bg-stone-900 text-white hover:bg-stone-800 disabled:bg-stone-300 disabled:text-stone-500 hover:shadow-md transition duration-200 shrink-0 flex items-center justify-center gap-1.5 font-medium text-xs"
              >
                <span>Send</span>
                <Send className="w-3 h-3" />
              </button>
            </form>
          </div>
        </section>

        {/* RIGHT COLUMN: Closira Cognitive Engine & Safety Radar */}
        <section id="cognitive-debugger" className="lg:col-span-5 flex flex-col gap-6">

          {/* Workflow progress Visual Tracker */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-5">
            <h3 className="font-serif font-medium text-stone-900 border-b border-stone-100 pb-3 flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-700" />
              Workflow stage Monitor
            </h3>
            
            <div className="mt-4 flex flex-col gap-3">
              {[
                { name: "FAQ Answering", code: "FAQ", desc: "Monitors general SOP inquiries cleanly." },
                { name: "Lead Qualification", code: "Qualification", desc: "Questions customer scheduling, treatments." },
                { name: "Critical Safeguard Detection", code: "Escalation", desc: "Immediate protective handoff logic execution." },
                { name: "Intake Summary & Output", code: "Summary", desc: "Compiles qualified patient files automatically." }
              ].map((stage, idx) => {
                const isActive = activeMetadata.stage === stage.code;
                const isPast =
                  (stage.code === "FAQ" && activeMetadata.stage !== "FAQ") ||
                  (stage.code === "Qualification" && (activeMetadata.stage === "Escalation" || activeMetadata.stage === "Summary")) ||
                  (stage.code === "Escalation" && activeMetadata.stage === "Summary" && activeMetadata.escalate);
                
                return (
                  <div
                    key={stage.code}
                    className={`flex items-start gap-3 p-3 rounded-lg border transition ${
                      isActive
                        ? "bg-amber-50/70 border-amber-300 shadow-sm"
                        : isPast
                        ? "bg-stone-50/50 border-stone-200 opacity-65"
                        : "bg-white border-dashed border-stone-200"
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center font-mono text-xs font-bold leading-none select-none transition ${
                        isActive
                          ? "bg-amber-700 text-white ring-4 ring-amber-100/50"
                          : isPast
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : "bg-stone-100 text-stone-400 border border-stone-200"
                      }`}
                    >
                      {isPast ? "✓" : idx + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-semibold ${isActive ? "text-stone-900 font-bold" : "text-stone-700"}`}>
                          {stage.name}
                        </span>
                        {isActive && (
                          <span className="text-[8px] uppercase font-bold tracking-widest text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded shrink-0 animate-pulse">
                            Active Stage
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-stone-500 mt-0.5">{stage.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Real-time Extracted Lead Details */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-5">
            <div className="flex justify-between items-center border-b border-stone-100 pb-3">
              <h3 className="font-serif font-medium text-stone-900 flex items-center gap-2">
                <ListChecks className="w-4 h-4 text-emerald-600" />
                Intelligent Ontological Extractor
              </h3>
              {activeMetadata.stage === "Summary" && (
                <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold px-2 py-0.5 rounded">
                  Fully Onboarded
                </span>
              )}
            </div>

            <div className="mt-4 space-y-3.5">
              {/* Parameter 1: treatment interest */}
              <div className="flex justify-between items-start gap-4 p-3 rounded-lg bg-stone-50 border border-stone-150 text-xs">
                <div className="flex items-start gap-2.5">
                  <div className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center ${activeMetadata.lead_details.treatment_interest ? "bg-emerald-100 text-emerald-800" : "bg-stone-200 text-stone-400"}`}>
                    <CheckCircle className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-stone-800">1. Preferred Treatment</h4>
                    <p className="text-[10px] text-stone-400 font-mono mt-0.5 italic">"Botox" / "Fillers"</p>
                  </div>
                </div>
                <span className={`font-mono font-medium px-2 py-1 rounded text-[11px] ${activeMetadata.lead_details.treatment_interest ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "text-stone-400 bg-stone-200"}`}>
                  {activeMetadata.lead_details.treatment_interest || "Pending"}
                </span>
              </div>

              {/* Parameter 2: past consultations */}
              <div className="flex justify-between items-start gap-4 p-3 rounded-lg bg-stone-50 border border-stone-150 text-xs">
                <div className="flex items-start gap-2.5">
                  <div className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center ${activeMetadata.lead_details.past_consultation ? "bg-emerald-100 text-emerald-800" : "bg-stone-200 text-stone-400"}`}>
                    <CheckCircle className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-stone-800">2. Past Consultation</h4>
                    <p className="text-[10px] text-stone-400 font-mono mt-0.5 italic">"Yes" / "No"</p>
                  </div>
                </div>
                <span className={`font-mono font-medium px-2 py-1 rounded text-[11px] ${activeMetadata.lead_details.past_consultation ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "text-stone-400 bg-stone-200"}`}>
                  {activeMetadata.lead_details.past_consultation || "Pending"}
                </span>
              </div>

              {/* Parameter 3: preferred schedule */}
              <div className="flex justify-between items-start gap-4 p-3 rounded-lg bg-stone-50 border border-stone-150 text-xs">
                <div className="flex items-start gap-2.5">
                  <div className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center ${activeMetadata.lead_details.preferred_time ? "bg-emerald-100 text-emerald-800" : "bg-stone-200 text-stone-400"}`}>
                    <CheckCircle className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-stone-800">3. Preferred Booking Slot</h4>
                    <p className="text-[10px] text-stone-400 font-mono mt-0.5 italic">Mon-Sat, 9 am - 7 pm</p>
                  </div>
                </div>
                <span className={`font-mono font-medium px-2 py-1 rounded text-[11px] max-w-[150px] truncate ${activeMetadata.lead_details.preferred_time ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "text-stone-400 bg-stone-200"}`} title={activeMetadata.lead_details.preferred_time || undefined}>
                  {activeMetadata.lead_details.preferred_time || "Pending"}
                </span>
              </div>
            </div>
          </div>

          {/* Safety Handoff Radar Check list */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-5">
            <h3 className="font-serif font-medium text-stone-900 border-b border-stone-100 pb-3 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600 animate-pulse" />
              Safety Safeguard Detection board
            </h3>

            {/* General escalation banner */}
            {activeMetadata.escalate && (
              <div className="mt-4 p-4 rounded-lg bg-rose-50 border border-rose-250 animate-bounce">
                <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  CRITICAL WARNING: CONVERSATION ESCALATED
                </div>
                <p className="text-rose-700 text-xs font-mono mt-1.5 leading-relaxed bg-white/70 p-2 rounded border border-rose-100">
                  <span className="font-semibold">Handoff reason:</span> {activeMetadata.escalation_reason || "System Override"}
                </p>
              </div>
            )}

            <div className="mt-4 text-xs space-y-2.5">
              {[
                { name: "Frustration or Complaint detection", triggersCode: ["upset", "complaint", "broken", "useless", "annoy"] },
                { name: "Clinical Medical / Side Effects filter", triggersCode: ["hurt", "side effects", "pain", "safe", "dangerous"] },
                { name: "Pricing negotiation bounds breach", triggersCode: ["negotiate", "discount", "lower", "cheap"] },
                { name: "Missing SOP treatment barrier", triggersCode: ["peel", "laser", "facials", "waxing"] },
                { name: "Sequence stall rule blocker (>2 evades)", triggersCode: ["stall", "evaded"] }
              ].map((guard, idx) => {
                const isTriggered = activeMetadata.escalate && (
                  (idx === 0 && (activeMetadata.escalation_reason?.toLowerCase().includes("frustration") || activeMetadata.escalation_reason?.toLowerCase().includes("complaint"))) ||
                  (idx === 1 && (activeMetadata.escalation_reason?.toLowerCase().includes("clinical") || activeMetadata.escalation_reason?.toLowerCase().includes("medical") || activeMetadata.escalation_reason?.toLowerCase().includes("safety") || activeMetadata.escalation_reason?.toLowerCase().includes("question"))) ||
                  (idx === 2 && (activeMetadata.escalation_reason?.toLowerCase().includes("negotiate") || activeMetadata.escalation_reason?.toLowerCase().includes("price") || activeMetadata.escalation_reason?.toLowerCase().includes("pricing"))) ||
                  (idx === 3 && (activeMetadata.escalation_reason?.toLowerCase().includes("sop") || activeMetadata.escalation_reason?.toLowerCase().includes("treatment") || activeMetadata.escalation_reason?.toLowerCase().includes("service"))) ||
                  (idx === 4 && (activeMetadata.escalation_reason?.toLowerCase().includes("evade") || activeMetadata.escalation_reason?.toLowerCase().includes("loop") || activeMetadata.escalation_reason?.toLowerCase().includes("sequence")))
                );

                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-2.5 rounded border ${
                      isTriggered
                        ? "bg-rose-50 border-rose-200 text-rose-800 font-semibold"
                        : "bg-stone-50/50 border-stone-200 text-stone-600"
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${isTriggered ? "bg-rose-600 animate-ping" : "bg-emerald-500"}`}></span>
                      {guard.name}
                    </span>
                    <span className={`font-mono text-[9px] px-2 py-0.5 rounded uppercase border font-bold shrink-0 ${
                      isTriggered
                        ? "bg-rose-600 text-white border-rose-500 animate-pulse"
                        : "bg-emerald-50 text-emerald-600 border-emerald-200"
                    }`}>
                      {isTriggered ? "🚩 TRIGGERED" : "✓ Secure"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Collapsible raw JSON developer schema check */}
          <div className="bg-stone-900 rounded-xl border border-stone-800 shadow-md p-5 flex flex-col">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <h3 className="font-mono font-bold text-stone-200 text-xs flex items-center gap-2">
                <Database className="w-4 h-4 text-amber-500" />
                Raw Workflow JSON Payload output
              </h3>
              <span className="text-[10px] text-amber-500 font-mono uppercase bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                Extracted state
              </span>
            </div>

            <div className="mt-4 bg-stone-950 p-4 rounded-lg border border-stone-850">
              <pre className="text-[11px] text-amber-400 font-mono overflow-x-auto whitespace-pre leading-relaxed select-all">
                {JSON.stringify(
                  {
                    stage: activeMetadata.stage,
                    escalate: activeMetadata.escalate,
                    escalation_reason: activeMetadata.escalation_reason,
                    lead_details: activeMetadata.lead_details,
                  },
                  null,
                  2
                )}
              </pre>
            </div>
            <div className="mt-3 flex items-start gap-2 text-[10px] text-stone-400 leading-relaxed font-mono">
              <Info className="w-3.5 h-3.5 text-stone-500 shrink-0 mt-0.5" />
              <span>
                Note: This standard JSON payload is appended seamlessly at the end of each generation. Our python backend filters this payload directly for pipeline orchestration.
              </span>
            </div>
          </div>

          {/* Dynamic SOP Clinic Reference list */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-5 text-xs">
            <h3 className="font-serif font-medium text-stone-900 border-b border-stone-100 pb-2.5 mb-3 flex items-center gap-2">
              <Info className="w-4 h-4 text-stone-500" />
              Active Clinic SOP Guidelines (Reference Book)
            </h3>

            <div className="space-y-3.5">
              {CLINIC_SOP.map((sect) => (
                <div key={sect.title}>
                  <h4 className="font-semibold text-stone-800 mb-1">{sect.title}</h4>
                  <ul className="text-stone-600 pl-3 list-disc space-y-1">
                    {sect.items.map((it, i) => (
                      <li key={i}>{it}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Elegant minimalist client footer */}
      <footer className="mt-auto bg-stone-900 text-stone-400 text-xs py-6 px-4 border-t border-stone-800 text-center font-mono select-none">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Closira AI Client Support. Licensed strictly for Bloom Aesthetics Clinic.</p>
          <div className="flex gap-4">
            <a href="#chat-playground" className="hover:text-stone-200 transition">Workspace Playground</a>
            <span>•</span>
            <a href="#cognitive-debugger" className="hover:text-stone-200 transition">Logic Debugger</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
