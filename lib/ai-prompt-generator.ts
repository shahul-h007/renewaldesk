import { ServiceCatalogItem, TemplateType } from './types';
import { SUPPORTED_PLACEHOLDERS, PLACEHOLDER_INFO } from './whatsapp';
import { getCategoryMetadata, normalizeCategory } from './catalog-presets';

export type PromptTone = 'friendly' | 'professional' | 'concise' | 'conversational' | 'urgent';

export type PromptLanguage = 'english' | 'malayalam' | 'hinglish' | 'hindi' | 'tamil' | 'kannada';

export interface AiPromptGeneratorOptions {
  businessName?: string | null;
  businessType?: string | null;
  catalog?: ServiceCatalogItem[] | null;
  tone?: PromptTone;
  language?: PromptLanguage | string;
  templateTypes?: TemplateType[];
  customInstructions?: string | null;
}

export const PROMPT_TONE_OPTIONS: { id: PromptTone; label: string; description: string }[] = [
  { id: 'friendly', label: 'Warm & Friendly', description: 'Polite, approachable, and respectful customer relationship tone' },
  { id: 'professional', label: 'Professional & Clear', description: 'Formal, trustworthy, and businesslike service tone' },
  { id: 'concise', label: 'Short & Concise', description: 'Under 35 words, quick to read on mobile, straight to the point' },
  { id: 'conversational', label: 'Conversational', description: 'Natural chat style, like messaging a regular client' },
  { id: 'urgent', label: 'Direct & Urgent', description: 'Politely emphasizes safety and avoiding costly breakdowns for overdue services' },
];

export const PROMPT_LANGUAGE_OPTIONS: { id: PromptLanguage; label: string; note: string }[] = [
  { id: 'english', label: 'English', note: 'Standard Indian English business tone' },
  { id: 'malayalam', label: 'Malayalam (മലയാളം)', note: 'Natural Malayalam script with English placeholders' },
  { id: 'hinglish', label: 'Hinglish', note: 'Conversational Roman Hindi/English blend' },
  { id: 'hindi', label: 'Hindi (हिन्दी)', note: 'Formal Hindi script with English placeholders' },
  { id: 'tamil', label: 'Tamil (தமிழ்)', note: 'Natural Tamil script with English placeholders' },
  { id: 'kannada', label: 'Kannada (ಕನ್ನಡ)', note: 'Natural Kannada script with English placeholders' },
];

export const TEMPLATE_TYPE_LABELS: Record<TemplateType, { title: string; purpose: string }> = {
  DUE_SOON: {
    title: 'Upcoming Service Reminder (Due Soon)',
    purpose: 'Sent 3–7 days before scheduled maintenance to reserve a convenient slot.',
  },
  DUE_TODAY: {
    title: 'Service Due Today Notice',
    purpose: 'Sent on the day service is due to confirm availability for today or tomorrow.',
  },
  OVERDUE: {
    title: 'Overdue Service Notice',
    purpose: 'Sent when past due date, encouraging the customer to book to prevent equipment damage.',
  },
  BOOKING_CONFIRMATION: {
    title: 'Booking Confirmation',
    purpose: 'Sent once an appointment date is booked to confirm arrival details.',
  },
  SERVICE_COMPLETED: {
    title: 'Service Completed & Next Cycle',
    purpose: 'Sent right after job completion, thanking the customer and mentioning next cycle due date.',
  },
  CUSTOM: {
    title: 'Custom Announcement / Promotional Offer',
    purpose: 'Custom outreach for seasonal checkups, AMC renewal, or special customer visits.',
  },
};

/**
 * Generates an optimized, privacy-safe prompt for external LLMs (ChatGPT, Claude, Gemini).
 * Contains ONLY workspace business metadata and service catalog details.
 * Contains ZERO customer PII (no names, phone numbers, addresses, or history).
 */
export function generateAiTemplatePrompt(options: AiPromptGeneratorOptions): string {
  const businessName = options.businessName?.trim() || 'Our Service Team';
  const categoryKey = normalizeCategory(options.businessType);
  const categoryMeta = getCategoryMetadata(options.businessType);
  const tone = options.tone || 'friendly';
  const language = options.language || 'english';
  const requestedTypes: TemplateType[] =
    options.templateTypes && options.templateTypes.length > 0
      ? options.templateTypes
      : ['DUE_SOON', 'DUE_TODAY', 'OVERDUE', 'BOOKING_CONFIRMATION', 'SERVICE_COMPLETED'];

  // Catalog service names
  let serviceList: string[] = [];
  if (options.catalog && options.catalog.length > 0) {
    serviceList = options.catalog
      .filter((c) => c.isActive !== false)
      .map((c) => `- ${c.name}${c.typicalPrice ? ` (Standard fee ₹${c.typicalPrice})` : ''}`);
  }

  // Fallback to category preset services if catalog is empty
  if (serviceList.length === 0) {
    serviceList = categoryMeta.services.map(
      (s) => `- ${s.name} (Typical interval: ${s.intervalValue} ${s.intervalUnit.toLowerCase()})`
    );
  }

  // Tone instruction
  let toneInstruction = '';
  switch (tone) {
    case 'professional':
      toneInstruction = 'Maintain a polite, formal, trustworthy, and professional business tone.';
      break;
    case 'concise':
      toneInstruction = 'Keep messages strictly under 35 words. Be ultra-concise, clear, and direct on mobile.';
      break;
    case 'conversational':
      toneInstruction = 'Use a natural, friendly chat style as if speaking directly to a valued long-term client.';
      break;
    case 'urgent':
      toneInstruction = 'Politely convey urgency for overdue services, highlighting safety and preventing costly breakdowns.';
      break;
    case 'friendly':
    default:
      toneInstruction = 'Warm, respectful, welcoming, and helpful customer care tone.';
      break;
  }

  // Language instruction
  let langInstruction = '';
  if (language.toLowerCase() === 'malayalam') {
    langInstruction =
      'Write the message text in natural, polite Malayalam script (മലയാളം). Keep all placeholder variables in standard English curly braces (e.g. {{customer_name}}, {{service_name}}) exactly as specified.';
  } else if (language.toLowerCase() === 'hinglish') {
    langInstruction =
      'Write in natural, conversational Hinglish (Hindi written in Roman English script) commonly used by businesses in India. Keep placeholder variables exact.';
  } else if (language.toLowerCase() === 'hindi') {
    langInstruction =
      'Write in polite, clear Hindi script (हिन्दी). Keep all placeholder variables in English curly braces exact.';
  } else if (language.toLowerCase() === 'tamil') {
    langInstruction =
      'Write in polite Tamil script (தமிழ்). Keep all placeholder variables in English curly braces exact.';
  } else if (language.toLowerCase() === 'kannada') {
    langInstruction =
      'Write in polite Kannada script (ಕನ್ನಡ). Keep all placeholder variables in English curly braces exact.';
  } else {
    langInstruction = 'Write in clear, polite Indian English suitable for customer communication via WhatsApp.';
  }

  // Build the complete prompt text
  const sections: string[] = [];

  sections.push(`You are an expert customer service copywriter specializing in WhatsApp follow-ups and repeat maintenance renewals for home and commercial service businesses.`);

  sections.push(`### Business Context
- Business Name: ${businessName}
- Industry: ${categoryMeta.label}
- Typical Equipment / Asset Type: ${categoryMeta.assetLabel} (e.g. ${categoryMeta.assetPlaceholder})
- Services Offered:
${serviceList.join('\n')}`);

  sections.push(`### Style & Tone Guidelines
- Tone: ${toneInstruction}
- Language: ${langInstruction}
- Length: Keep each template compact (between 25 and 55 words).
- Formatting: Use standard WhatsApp formatting where suitable (*bold* for emphasis, clean single line breaks). Include 1 tasteful emoji maximum per message.`);

  sections.push(`### Supported RenewalDesk Placeholder Variables
You MUST use these exact placeholders in double curly braces where relevant so RenewalDesk can interpolate real customer data:
${PLACEHOLDER_INFO.map((p) => `- ${p.tag}: ${p.label} (${p.description})`).join('\n')}`);

  sections.push(`### Critical Constraints & Guardrails
1. DO NOT invent fake placeholders like {{discount}}, {{link}}, {{coupon}}, or {{time}}. Use ONLY the supported placeholders listed above.
2. DO NOT make false promises, guarantee specific monetary savings (like electricity or fuel cuts), or offer unauthorized discounts/warranties.
3. Industry Alignment: For "${categoryMeta.label}", use terminology specific to this industry. ${
    categoryKey !== 'ac'
      ? `DO NOT use AC-specific words like "air condition", "cooling loss", or "compressor breakdown".`
      : `You may refer to cooling performance and filter cleanliness.`
  }
4. NO Customer PII: Never invent or expose real customer personal data.
5. Action-Oriented: Always end with a clear, polite call-to-action (e.g. "Reply with your preferred date", "Shall we reserve tomorrow for you?").`);

  if (options.customInstructions && options.customInstructions.trim()) {
    sections.push(`### Owner's Specific Instructions
${options.customInstructions.trim()}`);
  }

  sections.push(`### Required Templates to Generate
Generate separate, copy-ready message templates for each of the following ${requestedTypes.length} triggers:
${requestedTypes
  .map((t, idx) => {
    const info = TEMPLATE_TYPE_LABELS[t];
    return `${idx + 1}. [${t}] - ${info.title}: ${info.purpose}`;
  })
  .join('\n')}`);

  sections.push(`### Output Format
Format your output cleanly with markdown headers for each template so I can easily copy and paste them directly into RenewalDesk:

### 1. Template Name: [Descriptive Name]
Type: [TRIGGER_TYPE]
Message:
[Clean message text with placeholders]

(Repeat for all requested templates. Provide only the ready-to-use templates without conversational filler.)`);

  return sections.join('\n\n');
}
