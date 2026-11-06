/**
 * RenewalDesk Interactive Tutorial Content
 * 
 * All user-facing text for the 6 interactive lessons is stored here.
 * Written in short, plain English for local service shop owners
 * (AC repair, RO water purifier, vehicle service, appliances, electrical/plumbing).
 * Can be localized to Malayalam or other languages in future releases.
 */

export interface TutorialStepContent {
  id: string;
  stepNumber: number;
  totalStepsInLesson: number;
  lessonNumber: number;
  lessonTitle: string;
  stepTitle: string;
  instruction: string;
  explanation: string;
  example?: string;
  targetSelector: string;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  buttonLabel?: string;
  secondaryButtonLabel?: string;
  missingExplanation?: string;
}

export interface TutorialLessonContent {
  id: number;
  title: string;
  shortDescription: string;
  route: string;
  steps: TutorialStepContent[];
}

export const TUTORIAL_LESSONS: TutorialLessonContent[] = [
  // =========================================================================
  // LESSON 1: Add your first customer (field by field)
  // =========================================================================
  {
    id: 1,
    title: 'Add your first customer',
    shortDescription: 'Fill customer name, WhatsApp phone number, and service interval.',
    route: '/dashboard',
    steps: [
      {
        id: 'l1-s1-name',
        lessonNumber: 1,
        stepNumber: 1,
        totalStepsInLesson: 7,
        lessonTitle: 'Add your first customer',
        stepTitle: 'Customer Name',
        instruction: "Type your customer's name, e.g. Arun Kumar.",
        explanation: 'Every customer in RenewalDesk gets an appliance and maintenance schedule.',
        example: 'Arun Kumar',
        targetSelector: '[data-tutorial="customer-name"]',
        placement: 'bottom',
        missingExplanation: 'Open the Add Customer modal to start adding your first customer.',
      },
      {
        id: 'l1-s2-phone',
        lessonNumber: 1,
        stepNumber: 2,
        totalStepsInLesson: 7,
        lessonTitle: 'Add your first customer',
        stepTitle: 'Mobile Number',
        instruction: 'Enter a 10-digit mobile number for 1-click WhatsApp reminders.',
        explanation: 'RenewalDesk creates direct WhatsApp links without saving numbers to your phone contacts.',
        example: '9847123456',
        targetSelector: '[data-tutorial="customer-phone"]',
        placement: 'bottom',
        missingExplanation: 'Type a valid 10-digit Indian phone number.',
      },
      {
        id: 'l1-s3-service',
        lessonNumber: 1,
        stepNumber: 3,
        totalStepsInLesson: 7,
        lessonTitle: 'Add your first customer',
        stepTitle: 'Service Type',
        instruction: 'Pick the service they usually get.',
        explanation: 'This sets how often your customer needs service (e.g. every 3, 6, or 12 months).',
        targetSelector: '[data-tutorial="service-type"]',
        placement: 'bottom',
        buttonLabel: 'Next',
        missingExplanation: 'Select a service from your service catalog.',
      },
      {
        id: 'l1-s4-last-date',
        lessonNumber: 1,
        stepNumber: 4,
        totalStepsInLesson: 7,
        lessonTitle: 'Add your first customer',
        stepTitle: 'Last Service Date',
        instruction: 'When did you last service their equipment?',
        explanation: 'For practice, pick a date about 6 months ago so this customer shows up as due today in your queue.',
        targetSelector: '[data-tutorial="last-service-date"]',
        placement: 'top',
        buttonLabel: 'Next',
        missingExplanation: 'Pick the date of the previous service visit.',
      },
      {
        id: 'l1-s5-next-due',
        lessonNumber: 1,
        stepNumber: 5,
        totalStepsInLesson: 7,
        lessonTitle: 'Add your first customer',
        stepTitle: 'Next Due Date (Automatic)',
        instruction: 'Notice how RenewalDesk calculated the next due date automatically!',
        explanation: 'No manual calendar math or notebooks. It adds your service interval to the last service date.',
        targetSelector: '[data-tutorial="next-due-date"]',
        placement: 'top',
        buttonLabel: 'Got it',
        missingExplanation: 'The next due date is calculated automatically from the last date and interval.',
      },
      {
        id: 'l1-s6-additional',
        lessonNumber: 1,
        stepNumber: 6,
        totalStepsInLesson: 7,
        lessonTitle: 'Add your first customer',
        stepTitle: 'Optional Details',
        instruction: 'Equipment model, address, and landmark are optional.',
        explanation: 'You can add them now or tap "Skip optional details" to proceed to saving.',
        targetSelector: '[data-tutorial="additional-details"]',
        placement: 'top',
        buttonLabel: 'Next',
        secondaryButtonLabel: 'Skip optional details',
        missingExplanation: 'Additional details like address or asset capacity are optional.',
      },
      {
        id: 'l1-s7-save',
        lessonNumber: 1,
        stepNumber: 7,
        totalStepsInLesson: 7,
        lessonTitle: 'Add your first customer',
        stepTitle: 'Save Customer',
        instruction: 'Tap "Save Customer" to add them to your account.',
        explanation: 'Your customer will be securely saved with their maintenance schedule.',
        targetSelector: '[data-tutorial="save-customer"]',
        placement: 'top',
        missingExplanation: 'Tap the Save Customer button to save the new record.',
      },
    ],
  },

  // =========================================================================
  // LESSON 2: Find your customer in Today
  // =========================================================================
  {
    id: 2,
    title: 'Find your customer in Today',
    shortDescription: "Check your Today's follow-up queue sorted by urgency.",
    route: '/dashboard',
    steps: [
      {
        id: 'l2-s1-card',
        lessonNumber: 2,
        stepNumber: 1,
        totalStepsInLesson: 1,
        lessonTitle: 'Find your customer in Today',
        stepTitle: 'Your Practice Customer',
        instruction: 'Here is your practice customer in your Today queue!',
        explanation: 'RenewalDesk groups jobs into Overdue, Today, and This Week tabs so you always know who to contact first without checking paper notebooks.',
        targetSelector: '[data-tutorial="practice-customer-card"]',
        placement: 'bottom',
        buttonLabel: 'Next lesson',
        missingExplanation: "If your customer isn't in Today because of the date you picked, don't worry: they are safe in your Customers list. Today only shows customers due right now.",
      },
    ],
  },

  // =========================================================================
  // LESSON 3: Send a WhatsApp reminder
  // =========================================================================
  {
    id: 3,
    title: 'Send a WhatsApp reminder',
    shortDescription: 'Open a pre-filled, personalized WhatsApp message in 1 click.',
    route: '/dashboard',
    steps: [
      {
        id: 'l3-s1-whatsapp-btn',
        lessonNumber: 3,
        stepNumber: 1,
        totalStepsInLesson: 3,
        lessonTitle: 'Send a WhatsApp reminder',
        stepTitle: '1-Click WhatsApp Button',
        instruction: 'Tap the green WhatsApp button on your customer’s card.',
        explanation: 'This opens a personalized message ready to send directly to your customer.',
        targetSelector: '[data-tutorial="whatsapp-btn"]',
        placement: 'top',
        missingExplanation: 'Tap WhatsApp on your practice customer card to send a reminder.',
      },
      {
        id: 'l3-s2-preview',
        lessonNumber: 3,
        stepNumber: 2,
        totalStepsInLesson: 3,
        lessonTitle: 'Send a WhatsApp reminder',
        stepTitle: 'Review & Send Message',
        instruction: 'Tap "Open WhatsApp" (or Copy message).',
        explanation: 'The customer’s name, equipment, and due date are filled in automatically. You can also pick a different template from the dropdown.',
        targetSelector: '[data-tutorial="open-whatsapp-btn"]',
        placement: 'top',
        missingExplanation: 'Tap "Open WhatsApp" or "Copy" to send the reminder.',
      },
      {
        id: 'l3-s3-status-change',
        lessonNumber: 3,
        stepNumber: 3,
        totalStepsInLesson: 3,
        lessonTitle: 'Send a WhatsApp reminder',
        stepTitle: 'Status Updated to Contacted',
        instruction: 'Notice how the status automatically changed to "Contacted"!',
        explanation: 'Your whole team instantly sees that this customer was contacted. No double messages or forgotten follow-ups.',
        targetSelector: '[data-tutorial="practice-customer-card"]',
        placement: 'bottom',
        buttonLabel: 'Next lesson',
        missingExplanation: 'Sending or copying a reminder automatically marks the customer as Contacted.',
      },
    ],
  },

  // =========================================================================
  // LESSON 4: Track the answer (statuses)
  // =========================================================================
  {
    id: 4,
    title: 'Track the answer (statuses)',
    shortDescription: 'Learn each outcome: No Response, Undo, Replied, Booked, and Completed.',
    route: '/dashboard',
    steps: [
      {
        id: 'l4-s1-no-response',
        lessonNumber: 4,
        stepNumber: 1,
        totalStepsInLesson: 6,
        lessonTitle: 'Track the answer',
        stepTitle: 'Customer Did Not Reply',
        instruction: 'Tap the ⋯ menu on your customer card and select "No Response".',
        explanation: 'If a customer doesn’t answer, mark them "No Response". They stay in your queue so you can follow up again in 2–3 days.',
        targetSelector: '[data-tutorial="more-menu-btn"]',
        placement: 'left',
        missingExplanation: 'Open the ⋯ menu and select "No Response".',
      },
      {
        id: 'l4-s2-undo',
        lessonNumber: 4,
        stepNumber: 2,
        totalStepsInLesson: 6,
        lessonTitle: 'Track the answer',
        stepTitle: 'Try the Undo Button',
        instruction: 'Tap "Undo" on the toast notification (or in the card).',
        explanation: 'Mistakes happen! RenewalDesk lets you reverse any status change with one tap so you always feel safe.',
        targetSelector: '[data-tutorial="undo-action"]',
        placement: 'top',
        buttonLabel: 'I tried Undo',
        missingExplanation: 'Tap Undo to see how easy it is to reverse any mistake.',
      },
      {
        id: 'l4-s3-replied',
        lessonNumber: 4,
        stepNumber: 3,
        totalStepsInLesson: 6,
        lessonTitle: 'Track the answer',
        stepTitle: 'Customer Replied',
        instruction: 'Now tap the ⋯ menu and select "Replied".',
        explanation: 'When the customer writes back asking for prices or available times, mark them "Replied".',
        targetSelector: '[data-tutorial="more-menu-btn"]',
        placement: 'left',
        missingExplanation: 'Select "Replied" from the ⋯ menu.',
      },
      {
        id: 'l4-s4-booked',
        lessonNumber: 4,
        stepNumber: 4,
        totalStepsInLesson: 6,
        lessonTitle: 'Track the answer',
        stepTitle: 'Mark Booked',
        instruction: 'Customer agreed on a slot! Tap "Mark booked".',
        explanation: 'This locks in their appointment and tells your technicians to visit.',
        targetSelector: '[data-tutorial="mark-booked-btn"]',
        placement: 'top',
        missingExplanation: 'Tap "Mark booked" to confirm the customer wants service.',
      },
      {
        id: 'l4-s5-completed',
        lessonNumber: 4,
        stepNumber: 5,
        totalStepsInLesson: 6,
        lessonTitle: 'Track the answer',
        stepTitle: 'Mark Completed',
        instruction: 'Technician finished the job! Tap "Mark completed" and save the fee.',
        explanation: 'Enter the amount collected and tap "Complete Service".',
        targetSelector: '[data-tutorial="mark-completed-btn"]',
        placement: 'top',
        missingExplanation: 'Tap "Mark completed" once the technician finishes the service.',
      },
      {
        id: 'l4-s6-repeat-loop',
        lessonNumber: 4,
        stepNumber: 6,
        totalStepsInLesson: 6,
        lessonTitle: 'Track the answer',
        stepTitle: 'Automatic Next Cycle!',
        instruction: 'This is the key moment: RenewalDesk just scheduled their NEXT visit automatically!',
        explanation: 'Remember -> Remind -> Book -> Repeat. When service is completed, their next due date is set for the next cycle. (Note: "Not interested" also exists in the ⋯ menu if a customer moves away.)',
        targetSelector: '[data-tutorial="practice-customer-card"]',
        placement: 'bottom',
        buttonLabel: 'Next lesson',
        missingExplanation: 'Marking completed automatically schedules the next service date for your customer.',
      },
    ],
  },

  // =========================================================================
  // LESSON 5: Create your own message template
  // =========================================================================
  {
    id: 5,
    title: 'Create your own message template',
    shortDescription: 'Write custom WhatsApp message templates with dynamic tags.',
    route: '/templates',
    steps: [
      {
        id: 'l5-s1-new-btn',
        lessonNumber: 5,
        stepNumber: 1,
        totalStepsInLesson: 5,
        lessonTitle: 'Create your own message template',
        stepTitle: 'New Template',
        instruction: 'Tap the "+ New Template" button.',
        explanation: 'You can write templates in English, Malayalam, or Tanglish suited to your shop.',
        targetSelector: '[data-tutorial="new-template-btn"]',
        placement: 'bottom',
        missingExplanation: 'Tap "+ New Template" to create a new message.',
      },
      {
        id: 'l5-s2-name',
        lessonNumber: 5,
        stepNumber: 2,
        totalStepsInLesson: 5,
        lessonTitle: 'Create your own message template',
        stepTitle: 'Template Name',
        instruction: 'Give your template a short name, e.g. "Festival Service Offer".',
        explanation: 'Only you and your staff see this name in the dropdown list.',
        example: 'Festival Service Offer',
        targetSelector: '[data-tutorial="template-name"]',
        placement: 'bottom',
        missingExplanation: 'Enter a name for your custom message template.',
      },
      {
        id: 'l5-s3-type',
        lessonNumber: 5,
        stepNumber: 3,
        totalStepsInLesson: 5,
        lessonTitle: 'Create your own message template',
        stepTitle: 'Template Type',
        instruction: 'Choose when this template should be used (or keep Custom).',
        explanation: 'You can link templates to Due Soon, Overdue, Due Today, Booking, or Custom reminders.',
        targetSelector: '[data-tutorial="template-type"]',
        placement: 'bottom',
        buttonLabel: 'Next',
        missingExplanation: 'Select a template category.',
      },
      {
        id: 'l5-s4-placeholders',
        lessonNumber: 5,
        stepNumber: 4,
        totalStepsInLesson: 5,
        lessonTitle: 'Create your own message template',
        stepTitle: 'Insert Dynamic Placeholders',
        instruction: 'Tap a blue placeholder chip like {{customer_name}} to insert it into your message.',
        explanation: 'Placeholders automatically swap for real customer details (name, equipment, due date) when sending messages.',
        targetSelector: '[data-tutorial="placeholder-chips"]',
        placement: 'top',
        missingExplanation: 'Tap a placeholder chip like {{customer_name}} to insert it into your message.',
      },
      {
        id: 'l5-s5-save',
        lessonNumber: 5,
        stepNumber: 5,
        totalStepsInLesson: 5,
        lessonTitle: 'Create your own message template',
        stepTitle: 'Save Template',
        instruction: 'Review the message preview and tap "Create Template".',
        explanation: 'Your new template will be available immediately for all future WhatsApp reminders.',
        targetSelector: '[data-tutorial="save-template-btn"]',
        placement: 'top',
        missingExplanation: 'Tap "Create Template" to save your new template.',
      },
    ],
  },

  // =========================================================================
  // LESSON 6: See your results, finish
  // =========================================================================
  {
    id: 6,
    title: 'See your results, finish',
    shortDescription: 'Track recovered revenue and choose what to do with your practice customer.',
    route: '/results',
    steps: [
      {
        id: 'l6-s1-results',
        lessonNumber: 6,
        stepNumber: 1,
        totalStepsInLesson: 2,
        lessonTitle: 'See your results, finish',
        stepTitle: 'Track Recovered Revenue',
        instruction: 'This is your Results dashboard!',
        explanation: 'Here you track exact recovered revenue from repeat service visits and your customer retention funnel. Every reminder you send brings past clients back.',
        targetSelector: '[data-tutorial="results-funnel"]',
        placement: 'bottom',
        buttonLabel: 'Finish Tutorial',
        missingExplanation: 'Your Results dashboard shows revenue recovered and repeat conversion rates.',
      },
      {
        id: 'l6-s2-finish',
        lessonNumber: 6,
        stepNumber: 2,
        totalStepsInLesson: 2,
        lessonTitle: 'See your results, finish',
        stepTitle: "You're ready!",
        instruction: 'You have mastered the complete RenewalDesk workflow.',
        explanation: 'Would you like to keep your practice customer in your account or remove it completely?',
        targetSelector: '[data-tutorial="completion-modal"]',
        placement: 'center',
        buttonLabel: 'Keep practice customer',
        secondaryButtonLabel: 'Remove permanently',
        missingExplanation: 'Congratulations! You are now ready to run your recurring service business with RenewalDesk.',
      },
    ],
  },
];

/**
 * Returns a specific lesson by 1-based ID
 */
export function getLessonById(lessonId: number): TutorialLessonContent | undefined {
  return TUTORIAL_LESSONS.find((l) => l.id === lessonId);
}

/**
 * Returns a specific step by lesson ID and 0-based step index
 */
export function getStepContent(lessonId: number, stepIndex: number): TutorialStepContent | undefined {
  const lesson = getLessonById(lessonId);
  if (!lesson) return undefined;
  return lesson.steps[stepIndex];
}
