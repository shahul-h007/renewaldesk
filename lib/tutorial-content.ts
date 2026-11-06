/**
 * RenewalDesk Interactive Tutorial Content
 * 
 * All user-facing text for the 8 interactive lessons is stored here.
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
  fallbackSelector?: string;
  allowedInteractionArea?: string;
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
        id: 'l1-s5-next-date',
        lessonNumber: 1,
        stepNumber: 5,
        totalStepsInLesson: 7,
        lessonTitle: 'Add your first customer',
        stepTitle: 'Next Due Date',
        instruction: 'Notice the next service date was calculated automatically.',
        explanation: 'Based on the service interval you selected, RenewalDesk automatically predicts when the customer needs service.',
        targetSelector: '[data-tutorial="next-due-date"]',
        placement: 'top',
        buttonLabel: 'Next',
        missingExplanation: 'Review the calculated next service date.',
      },
      {
        id: 'l1-s6-details',
        lessonNumber: 1,
        stepNumber: 6,
        totalStepsInLesson: 7,
        lessonTitle: 'Add your first customer',
        stepTitle: 'Optional Details',
        instruction: 'You can add house address, city, landmark, or technician notes here.',
        explanation: 'Address details allow 1-tap Google Maps directions for your service technicians.',
        example: 'Near Metro Pillar 500, Palarivattom',
        targetSelector: '[data-tutorial="additional-details"]',
        placement: 'top',
        buttonLabel: 'Next',
        missingExplanation: 'Optionally add customer address and notes.',
      },
      {
        id: 'l1-s7-save',
        lessonNumber: 1,
        stepNumber: 7,
        totalStepsInLesson: 7,
        lessonTitle: 'Add your first customer',
        stepTitle: 'Save Customer',
        instruction: 'Tap Save to add your practice customer.',
        explanation: 'Your customer will appear in your follow-up queue right away.',
        targetSelector: '[data-tutorial="save-customer"]',
        placement: 'top',
        missingExplanation: 'Click the Save customer button to complete adding the customer.',
      },
    ],
  },

  // =========================================================================
  // LESSON 2: Today queue
  // =========================================================================
  {
    id: 2,
    title: 'Today queue',
    shortDescription: 'Find due customers and understand the single primary action.',
    route: '/dashboard',
    steps: [
      {
        id: 'l2-s1-find',
        lessonNumber: 2,
        stepNumber: 1,
        totalStepsInLesson: 2,
        lessonTitle: 'Today queue',
        stepTitle: 'Your Follow-Up Queue',
        instruction: 'Here is your practice customer on the Today queue.',
        explanation: 'Every morning, RenewalDesk gathers all customers whose routine service is overdue or due today.',
        targetSelector: '[data-tutorial="practice-customer-card"]',
        fallbackSelector: '[data-tutorial="today-queue"]',
        placement: 'bottom',
        buttonLabel: 'Next',
        missingExplanation: 'Your practice customer appears in this card on the Today queue.',
      },
      {
        id: 'l2-s2-tabs',
        lessonNumber: 2,
        stepNumber: 2,
        totalStepsInLesson: 2,
        lessonTitle: 'Today queue',
        stepTitle: 'Queue Tabs & 1-Click Action',
        instruction: 'Check the tabs: Overdue, Due Today, and Upcoming.',
        explanation: 'Each row has ONE prominent primary action button. Right now, it says WhatsApp to start the reminder.',
        targetSelector: '[data-tutorial="today-tabs"]',
        fallbackSelector: '[data-tutorial="practice-customer-card"]',
        placement: 'bottom',
        buttonLabel: 'Next',
        missingExplanation: 'Explore the status tabs and primary action button.',
      },
    ],
  },

  // =========================================================================
  // LESSON 3: Send a WhatsApp reminder
  // =========================================================================
  {
    id: 3,
    title: 'Send a WhatsApp reminder',
    shortDescription: 'Preview message, switch templates, and record contact.',
    route: '/dashboard',
    steps: [
      {
        id: 'l3-s1-tap-whatsapp',
        lessonNumber: 3,
        stepNumber: 1,
        totalStepsInLesson: 4,
        lessonTitle: 'Send a WhatsApp reminder',
        stepTitle: 'Tap WhatsApp',
        instruction: 'Tap the green WhatsApp button on your practice customer.',
        explanation: 'This opens the message preview modal where you can review what will be sent.',
        targetSelector: '[data-tutorial="whatsapp-btn"]',
        placement: 'top',
        missingExplanation: 'Click the green WhatsApp button to open the message preview.',
      },
      {
        id: 'l3-s2-preview',
        lessonNumber: 3,
        stepNumber: 2,
        totalStepsInLesson: 4,
        lessonTitle: 'Send a WhatsApp reminder',
        stepTitle: 'Review Message Preview',
        instruction: 'Read the generated WhatsApp reminder message.',
        explanation: "Notice the customer's name, appliance type, and due date were filled in automatically.",
        targetSelector: '[data-tutorial="whatsapp-preview"]',
        placement: 'bottom',
        buttonLabel: 'Next',
        missingExplanation: 'Check the WhatsApp message preview in the modal.',
      },
      {
        id: 'l3-s3-switch-template',
        lessonNumber: 3,
        stepNumber: 3,
        totalStepsInLesson: 4,
        lessonTitle: 'Send a WhatsApp reminder',
        stepTitle: 'Switch Message Template',
        instruction: 'Try selecting a different template from the dropdown.',
        explanation: 'You can choose between Due Today, Overdue Warning, or Friendly Reminder tones.',
        targetSelector: '[data-tutorial="whatsapp-template-select"]',
        placement: 'bottom',
        buttonLabel: 'Next',
        missingExplanation: 'Select a template from the dropdown menu.',
      },
      {
        id: 'l3-s4-send',
        lessonNumber: 3,
        stepNumber: 4,
        totalStepsInLesson: 4,
        lessonTitle: 'Send a WhatsApp reminder',
        stepTitle: 'Open WhatsApp or Copy',
        instruction: 'Tap Open WhatsApp (or Copy message).',
        explanation: 'Opening WhatsApp launches wa.me with the message pre-filled and automatically marks the customer as Contacted.',
        targetSelector: '[data-tutorial="open-whatsapp-btn"]',
        placement: 'top',
        missingExplanation: 'Tap Open WhatsApp or Copy message to continue.',
      },
    ],
  },

  // =========================================================================
  // LESSON 4: Track replies & bookings
  // =========================================================================
  {
    id: 4,
    title: 'Track replies & bookings',
    shortDescription: 'Handle no response, undo mistakes, record bookings, and complete service.',
    route: '/dashboard',
    steps: [
      {
        id: 'l4-s1-more',
        lessonNumber: 4,
        stepNumber: 1,
        totalStepsInLesson: 7,
        lessonTitle: 'Track replies & bookings',
        stepTitle: 'Open More Menu (⋮)',
        instruction: 'Tap the ⋮ More button on your contacted customer.',
        explanation: 'Use the More menu when a customer replies, asks to reschedule, or ignores your reminder.',
        targetSelector: '[data-tutorial="more-menu-btn"]',
        placement: 'left',
        missingExplanation: 'Click the ⋮ More button to open status options.',
      },
      {
        id: 'l4-s2-no-response',
        lessonNumber: 4,
        stepNumber: 2,
        totalStepsInLesson: 7,
        lessonTitle: 'Track replies & bookings',
        stepTitle: 'Select No Response',
        instruction: 'Tap "No Response" in the menu.',
        explanation: 'This marks that you sent a message but the customer has not replied yet.',
        targetSelector: '[data-tutorial="menu-no-response"]',
        fallbackSelector: '[data-tutorial="more-menu-btn"]',
        placement: 'left',
        missingExplanation: 'Select "No Response" from the dropdown options.',
      },
      {
        id: 'l4-s3-undo',
        lessonNumber: 4,
        stepNumber: 3,
        totalStepsInLesson: 7,
        lessonTitle: 'Track replies & bookings',
        stepTitle: 'Tap Undo on the Toast',
        instruction: 'Did you make a mistake? Tap Undo on the notification toast.',
        explanation: 'Every status change has an instant 5-second Undo button so you never lose your place.',
        targetSelector: '[data-tutorial="undo-action"]',
        fallbackSelector: '[data-tutorial="practice-customer-card"]',
        placement: 'top',
        buttonLabel: 'Next',
        missingExplanation: 'Tap Undo on the toast notification, or click Next to proceed.',
      },
      {
        id: 'l4-s4-replied',
        lessonNumber: 4,
        stepNumber: 4,
        totalStepsInLesson: 7,
        lessonTitle: 'Track replies & bookings',
        stepTitle: 'Customer Replied',
        instruction: 'Tap ⋮ More again and select "Customer Replied".',
        explanation: 'When the customer calls or texts back, mark them as Replied so your team knows they are active.',
        targetSelector: '[data-tutorial="menu-replied"]',
        fallbackSelector: '[data-tutorial="more-menu-btn"]',
        placement: 'left',
        missingExplanation: 'Open ⋮ More and select "Customer Replied".',
      },
      {
        id: 'l4-s5-booked',
        lessonNumber: 4,
        stepNumber: 5,
        totalStepsInLesson: 7,
        lessonTitle: 'Track replies & bookings',
        stepTitle: 'Mark Booked',
        instruction: 'Tap "Mark booked" on the row.',
        explanation: 'The primary button automatically turned into "Mark booked". Tapping it confirms an appointment date.',
        targetSelector: '[data-tutorial="mark-booked-btn"]',
        placement: 'top',
        missingExplanation: 'Tap the "Mark booked" button on the customer row.',
      },
      {
        id: 'l4-s6-complete',
        lessonNumber: 4,
        stepNumber: 6,
        totalStepsInLesson: 7,
        lessonTitle: 'Track replies & bookings',
        stepTitle: 'Mark Completed',
        instruction: 'Tap "Mark completed", enter the fee, and save.',
        explanation: 'Recording completion saves service history, logs revenue, and automatically calculates the NEXT service due date!',
        targetSelector: '[data-tutorial="mark-completed-btn"]',
        fallbackSelector: '[data-tutorial="complete-submit"]',
        placement: 'top',
        missingExplanation: 'Click "Mark completed", enter the amount, and save.',
      },
      {
        id: 'l4-s7-not-interested',
        lessonNumber: 4,
        stepNumber: 7,
        totalStepsInLesson: 7,
        lessonTitle: 'Track replies & bookings',
        stepTitle: 'Not Interested Option',
        instruction: 'Notice how the cycle works!',
        explanation: 'If a customer sold their machine or moved, you can choose "Not Interested" from the More menu to silence reminders without deleting their history.',
        targetSelector: '[data-tutorial="practice-customer-card"]',
        fallbackSelector: '[data-tutorial="today-queue"]',
        placement: 'bottom',
        buttonLabel: 'Next Lesson',
        missingExplanation: 'Review the completed renewal cycle and proceed.',
      },
    ],
  },

  // =========================================================================
  // LESSON 5: Message templates
  // =========================================================================
  {
    id: 5,
    title: 'Message templates',
    shortDescription: 'Edit starter messages, insert customer tags, and create custom templates.',
    route: '/templates',
    steps: [
      {
        id: 'l5-s1-nav',
        lessonNumber: 5,
        stepNumber: 1,
        totalStepsInLesson: 6,
        lessonTitle: 'Message templates',
        stepTitle: 'Templates Hub',
        instruction: 'Welcome to your WhatsApp Message Templates hub.',
        explanation: 'Your workspace comes pre-loaded with professional, category-specific starter templates for routine service.',
        targetSelector: '[data-tutorial="template-item"]',
        fallbackSelector: '[data-tutorial="templates-list"]',
        placement: 'bottom',
        buttonLabel: 'Next',
        missingExplanation: 'Explore your pre-configured starter message templates.',
      },
      {
        id: 'l5-s2-edit',
        lessonNumber: 5,
        stepNumber: 2,
        totalStepsInLesson: 6,
        lessonTitle: 'Message templates',
        stepTitle: 'Edit Template Body',
        instruction: 'Click the template editor to modify the message wording.',
        explanation: 'You can adjust the greeting, mention festival offers, or add your shop address.',
        example: 'Dear {customer_name}, your AC service is due this week.',
        targetSelector: '[data-tutorial="template-body"]',
        placement: 'top',
        buttonLabel: 'Next',
        missingExplanation: 'Type your message text in the template body editor.',
      },
      {
        id: 'l5-s3-chip',
        lessonNumber: 5,
        stepNumber: 3,
        totalStepsInLesson: 6,
        lessonTitle: 'Message templates',
        stepTitle: 'Insert Dynamic Tags',
        instruction: 'Tap any tag chip like {customer_name} or {due_date}.',
        explanation: 'RenewalDesk replaces these tags with real customer data when you send WhatsApp reminders.',
        targetSelector: '[data-tutorial="placeholder-chips"]',
        placement: 'top',
        buttonLabel: 'Next',
        missingExplanation: 'Click a placeholder tag chip to insert it into your template.',
      },
      {
        id: 'l5-s4-save-edit',
        lessonNumber: 5,
        stepNumber: 4,
        totalStepsInLesson: 6,
        lessonTitle: 'Message templates',
        stepTitle: 'Save Changes',
        instruction: 'Click "Save Template" to store your changes.',
        explanation: 'Your updated template is immediately available across all customer reminder modals.',
        targetSelector: '[data-tutorial="save-template-btn"]',
        placement: 'top',
        buttonLabel: 'Next',
        missingExplanation: 'Click the Save Template button to apply your changes.',
      },
      {
        id: 'l5-s5-new',
        lessonNumber: 5,
        stepNumber: 5,
        totalStepsInLesson: 6,
        lessonTitle: 'Message templates',
        stepTitle: 'Create Custom Template',
        instruction: 'Tap "Add Custom Template" to build a unique reminder.',
        explanation: 'Create templates for annual AMC renewal, monsoon check-ups, or VIP warranty clients.',
        targetSelector: '[data-tutorial="new-template-btn"]',
        placement: 'bottom',
        missingExplanation: 'Click "Add Custom Template" to open the creation modal.',
      },
      {
        id: 'l5-s6-save-new',
        lessonNumber: 5,
        stepNumber: 6,
        totalStepsInLesson: 6,
        lessonTitle: 'Message templates',
        stepTitle: 'Save Custom Template',
        instruction: 'Fill a name and message text, then click Save.',
        explanation: 'Your custom template will be stored securely with tenant isolation in your account.',
        targetSelector: '[data-tutorial="save-custom-template-btn"]',
        fallbackSelector: '[data-tutorial="template-name"]',
        placement: 'top',
        buttonLabel: 'Next Lesson',
        missingExplanation: 'Enter template details and save, or click Next to proceed.',
      },
    ],
  },

  // =========================================================================
  // LESSON 6: Services & Recurrence Cycles
  // =========================================================================
  {
    id: 6,
    title: 'Services & recurrence',
    shortDescription: 'Add services, configure repeat intervals in days/months, and set usual fees.',
    route: '/services',
    steps: [
      {
        id: 'l6-s1-nav',
        lessonNumber: 6,
        stepNumber: 1,
        totalStepsInLesson: 4,
        lessonTitle: 'Services & recurrence',
        stepTitle: 'Service Catalog',
        instruction: 'Welcome to your Service Types and Recurrence catalog.',
        explanation: 'Each service defines how frequently maintenance repeats (e.g. 90 days, 180 days, or 1 year) and standard fees.',
        targetSelector: '[data-tutorial="service-item"]',
        fallbackSelector: '[data-tutorial="services-list"]',
        placement: 'bottom',
        buttonLabel: 'Next',
        missingExplanation: 'View your service catalog presets and cadence intervals.',
      },
      {
        id: 'l6-s2-add',
        lessonNumber: 6,
        stepNumber: 2,
        totalStepsInLesson: 4,
        lessonTitle: 'Services & recurrence',
        stepTitle: 'Add a Service Type',
        instruction: 'Tap "Add Service Type" to create a custom service.',
        explanation: 'You can offer different intervals for domestic vs commercial clients.',
        targetSelector: '[data-tutorial="add-service-btn"]',
        placement: 'bottom',
        missingExplanation: 'Click "Add Service Type" to open the service creator.',
      },
      {
        id: 'l6-s3-save',
        lessonNumber: 6,
        stepNumber: 3,
        totalStepsInLesson: 4,
        lessonTitle: 'Services & recurrence',
        stepTitle: 'Repeat Interval Controls Next Due Date',
        instruction: 'Set the interval value (e.g. 6 Months) and typical price, then save.',
        explanation: 'Whenever you complete a service, RenewalDesk adds this interval to calculate the next due date automatically!',
        targetSelector: '[data-tutorial="save-service-btn"]',
        fallbackSelector: '[data-tutorial="service-name-input"]',
        placement: 'top',
        buttonLabel: 'Next',
        missingExplanation: 'Fill in service name and interval, then click Save.',
      },
      {
        id: 'l6-s4-toggle',
        lessonNumber: 6,
        stepNumber: 4,
        totalStepsInLesson: 4,
        lessonTitle: 'Services & recurrence',
        stepTitle: 'Edit or Turn Off Services',
        instruction: 'Notice the Active toggle on each service card.',
        explanation: 'You can pause services you no longer offer without affecting historical customer records.',
        targetSelector: '[data-tutorial="toggle-service-btn"]',
        fallbackSelector: '[data-tutorial="service-item"]',
        placement: 'top',
        buttonLabel: 'Next Lesson',
        missingExplanation: 'Review the service status toggle and proceed.',
      },
    ],
  },

  // =========================================================================
  // LESSON 7: Customer CSV Import (quick overview)
  // =========================================================================
  {
    id: 7,
    title: 'Customer import',
    shortDescription: 'Learn how to bring existing Excel or CSV customer lists into RenewalDesk.',
    route: '/import',
    steps: [
      {
        id: 'l7-s1-stepper',
        lessonNumber: 7,
        stepNumber: 1,
        totalStepsInLesson: 3,
        lessonTitle: 'Customer import',
        stepTitle: '4-Step Import Wizard',
        instruction: 'Check the 4 steps: Upload file, Map fields, Check errors, and Sync.',
        explanation: 'RenewalDesk matches columns like Name, Mobile, and Last Service Date automatically.',
        targetSelector: '[data-tutorial="import-stepper"]',
        placement: 'bottom',
        buttonLabel: 'Next',
        missingExplanation: 'Review the 4-step CSV import process.',
      },
      {
        id: 'l7-s2-sample',
        lessonNumber: 7,
        stepNumber: 2,
        totalStepsInLesson: 3,
        lessonTitle: 'Customer import',
        stepTitle: 'Download Sample CSV Template',
        instruction: 'Tap "Download Sample CSV template" to see the recommended columns.',
        explanation: 'You can copy and paste your client numbers into this template anytime.',
        targetSelector: '[data-tutorial="download-sample-btn"]',
        placement: 'top',
        buttonLabel: 'Next',
        missingExplanation: 'Download the sample CSV file or review column headers.',
      },
      {
        id: 'l7-s3-skip',
        lessonNumber: 7,
        stepNumber: 3,
        totalStepsInLesson: 3,
        lessonTitle: 'Customer import',
        stepTitle: 'Import Anytime or Skip',
        instruction: 'You can upload your real client list now, or skip to finish the tour.',
        explanation: 'RenewalDesk deduplicates phone numbers and sanitizes spreadsheet formulas automatically.',
        targetSelector: '[data-tutorial="import-dropzone"]',
        placement: 'top',
        buttonLabel: 'Next Lesson',
        missingExplanation: 'Upload your spreadsheet or proceed to the next lesson.',
      },
    ],
  },

  // =========================================================================
  // LESSON 8: Results, Settings & Finish
  // =========================================================================
  {
    id: 8,
    title: 'Results, settings & finish',
    shortDescription: 'View conversion analytics, shop settings, and keep or delete practice data.',
    route: '/results',
    steps: [
      {
        id: 'l8-s1-results',
        lessonNumber: 8,
        stepNumber: 1,
        totalStepsInLesson: 4,
        lessonTitle: 'Results, settings & finish',
        stepTitle: 'Renewal Conversion & Captured Revenue',
        instruction: 'Results shows your follow-up conversion rate and total captured revenue.',
        explanation: 'See how many customers were contacted, booked, and paid this month in one simple screen.',
        targetSelector: '[data-tutorial="results-funnel"]',
        placement: 'bottom',
        buttonLabel: 'Next',
        missingExplanation: 'Review the renewal performance metrics.',
      },
      {
        id: 'l8-s2-settings-profile',
        lessonNumber: 8,
        stepNumber: 2,
        totalStepsInLesson: 4,
        lessonTitle: 'Results, settings & finish',
        stepTitle: 'Shop Profile in Settings',
        instruction: 'Go to Settings to configure your Shop Profile.',
        explanation: 'Update your shop phone, city, and business category so message templates always reflect your brand.',
        targetSelector: '[data-tutorial="settings-profile-tab"]',
        placement: 'bottom',
        buttonLabel: 'Next',
        missingExplanation: 'Review your shop profile and settings.',
      },
      {
        id: 'l8-s3-settings-billing',
        lessonNumber: 8,
        stepNumber: 3,
        totalStepsInLesson: 4,
        lessonTitle: 'Results, settings & finish',
        stepTitle: 'Subscription & Customer Capacity',
        instruction: 'Review your 14-day free trial and active customer capacity.',
        explanation: 'All features are fully unlocked during your free trial. You can upgrade anytime in Billing.',
        targetSelector: '[data-tutorial="settings-billing-tab"]',
        placement: 'bottom',
        buttonLabel: 'Finish Tutorial',
        missingExplanation: 'Inspect your plan details and capacity limits.',
      },
      {
        id: 'l8-s4-finish',
        lessonNumber: 8,
        stepNumber: 4,
        totalStepsInLesson: 4,
        lessonTitle: 'Results, settings & finish',
        stepTitle: 'Tutorial Complete!',
        instruction: 'Congratulations! You know how to run your recurring service business with RenewalDesk.',
        explanation: 'Would you like to keep the practice customer (Arun Kumar) in your account, or delete it cleanly?',
        targetSelector: '[data-tutorial="tutorial-finish-card"]',
        placement: 'center',
        buttonLabel: 'Keep Practice Customer',
        secondaryButtonLabel: 'Delete Practice Customer',
        missingExplanation: 'Choose whether to keep or remove practice data to complete the tutorial.',
      },
    ],
  },
];

export function getLessonById(id: number): TutorialLessonContent | undefined {
  return TUTORIAL_LESSONS.find((l) => l.id === id);
}

export function getStepContent(lessonId: number, stepIndex: number): TutorialStepContent | undefined {
  const lesson = getLessonById(lessonId);
  if (!lesson) return undefined;
  return lesson.steps[stepIndex];
}

export function getTotalStepsCount(): number {
  return TUTORIAL_LESSONS.reduce((acc, l) => acc + l.steps.length, 0);
}
