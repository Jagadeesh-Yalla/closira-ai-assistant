import { CannedScenario } from "./types";

export interface SopInfoSection {
  title: string;
  items: string[];
}

export const CLINIC_SOP: SopInfoSection[] = [
  {
    title: "Clinic & Contact Details",
    items: [
      "Business Name: Bloom Aesthetics Clinic",
      "Operating Hours: Mon-Sat, 9 am - 7 pm",
      "Booking Channel: WhatsApp or via Website",
    ],
  },
  {
    title: "Treatments & Standard Pricing",
    items: [
      "Botox: starting from £200",
      "Fillers: starting from £250",
      "Consultations: Free",
    ],
  },
  {
    title: "Booking & Cancellations",
    items: [
      "Cancellation period: Must provide at least 24-hour notice",
      "Deposits / fees: None (free consultations), but notice is strictly enforced",
    ],
  },
];

export const SIMULATION_SCENARIOS: CannedScenario[] = [
  {
    id: "booking_happy_path",
    title: "Standard Booking Flow",
    subtitle: "FAQ & Qualification",
    category: "Lead Qualification",
    initialMessage: "Hi! I am looking to book a treatment for Botox. What are your opening hours on weekends and is there a fee for consulting?",
    badge: "Qualify",
    badgeColor: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    description: "Queries opening hours, services Botox, and will trigger Lead Qualification when asking to book.",
  },
  {
    id: "cancellation_policy",
    title: "Cancellation Policy check",
    subtitle: "FAQ answering rules",
    category: "Standard FAQ",
    initialMessage: "Hello! What happens if I can't make it to my appointment? What is your policy?",
    badge: "FAQ",
    badgeColor: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
    description: "Requests info answered by our cancellation SOP. No escalation should occur.",
  },
  {
    id: "medical_question",
    title: "Medical / Safety Question",
    subtitle: "Escalation Type 2",
    category: "Safety Escalation",
    initialMessage: "Hi, I'm thinking of getting fillers but I wanted to know: what are the side effects? Will it hurt?",
    badge: "Escalate",
    badgeColor: "bg-rose-500/10 text-rose-500 border-rose-500/20",
    description: "Triggers safety workflow because customer asks a medical/side-effect question.",
  },
  {
    id: "out_of_sop",
    title: "Out-of-SOP Treatment Check",
    subtitle: "Escalation Type 4",
    category: "Safety Escalation",
    initialMessage: "Hello, do you offer laser hair removal or chemical facial peels? My skin has some blemishes.",
    badge: "Escalate",
    badgeColor: "bg-rose-500/10 text-rose-500 border-rose-500/20",
    description: "Triggers escalation because chemical peels and lasers are missing from the Clinic SOP.",
  },
  {
    id: "price_negotiating",
    title: "Price Disputing & Negotiating",
    subtitle: "Escalation Type 3",
    category: "Safety Escalation",
    initialMessage: "Honestly, £200 for Botox is quite high for my budget. Can you lower the price to £150 if I do it today?",
    badge: "Escalate",
    badgeColor: "bg-rose-500/10 text-rose-500 border-rose-500/20",
    description: "Triggers handoff due to attempted pricing negotiation/discounts.",
  },
  {
    id: "frustrated_complaint",
    title: "Angry Customer Complaint",
    subtitle: "Escalation Type 1",
    category: "Safety Escalation",
    initialMessage: "I've tried booking an appointment online three times now and your form keeps crashing. This is a joke!",
    badge: "Escalate",
    badgeColor: "bg-rose-500/10 text-rose-500 border-rose-500/20",
    description: "Launches safety handoff because the user expresses frustration / files a complaint.",
  },
];
