import type { HelpTopic, HelpTopicSlug } from './types';

/**
 * All help topics. Plain English, written for trustees and the secretary —
 * not technical readers. See PWA_Features/help-guidance.md §12 for tone rules.
 *
 * Always say "Supplier" (not "Contractor"). Keep sentences short. Lead with
 * the most common case. No jargon.
 */
const TOPICS: Record<HelpTopicSlug, HelpTopic> = {
  // ─────────────────────────────────────────────────────────────────────────
  'dashboard-overview': {
    slug: 'dashboard-overview',
    title: 'The dashboard at a glance',
    category: 'getting-started',
    shortDescription: 'What each card means and where to start.',
    body: [
      { type: 'paragraph', text: 'The dashboard is the first page you see after signing in. It gives you a quick health check — what needs attention, what’s due soon, and what was recently done.' },
      { type: 'heading', level: 2, text: 'What you’ll see' },
      { type: 'list', items: [
        'A count of overdue compliance items — anything that should already be done',
        'A count of items due soon — typically the next 30 days',
        'A count of total assets and documents',
        'A short list of recent activity across the trust',
      ] },
      { type: 'paragraph', text: 'Click any card to open the corresponding register. The "Compliance" link in the sidebar takes you to the full list of obligations whenever you want a closer look.' },
      { type: 'tip', text: 'If a number looks wrong, it’s usually because an item hasn’t been marked complete. Open Compliance and check the status column.' },
    ],
    related: ['compliance-lifecycle', 'secretary-monthly-rhythm'],
  },

  // ─────────────────────────────────────────────────────────────────────────
  'map-overview': {
    slug: 'map-overview',
    title: 'Viewing the floor plan',
    category: 'map',
    shortDescription: 'Pan, zoom, and use layers to see only the assets you care about.',
    body: [
      { type: 'paragraph', text: 'The map shows the hall as a floor plan with coloured icons for each fitted asset — fire extinguishers, smoke detectors, fire doors, distribution boards, and so on.' },
      { type: 'heading', level: 2, text: 'Getting around' },
      { type: 'list', ordered: true, items: [
        'Drag with your mouse (or finger on a phone) to pan across the plan.',
        'Use the [+] and [−] buttons in the bottom-right to zoom in or out. On a phone, pinch to zoom.',
        'Click the box icon below the zoom buttons to reset the view to fit the whole plan.',
      ] },
      { type: 'heading', level: 2, text: 'Layers' },
      { type: 'paragraph', text: 'In the sidebar (under "Map"), you’ll see four layers: Fire Safety, Electrical, Openings, and Utilities. Each has an eye icon — click to show or hide that layer. By default, Fire Safety and Electrical are shown; Openings and Utilities are hidden to keep things clean.' },
      { type: 'tip', text: 'On a phone, the layer toggles are in the side drawer (tap the menu button at the top of the screen).' },
    ],
    related: ['placing-an-asset'],
  },

  // ─────────────────────────────────────────────────────────────────────────
  'placing-an-asset': {
    slug: 'placing-an-asset',
    title: 'Placing a new asset on the map',
    category: 'map',
    shortDescription: 'Click "Place Asset", tap the map where it lives, fill in the details.',
    body: [
      { type: 'paragraph', text: 'When you fit a new fire extinguisher, smoke detector, or any other tracked asset, you can mark its location on the map.' },
      { type: 'heading', level: 2, text: 'How to do it' },
      { type: 'list', ordered: true, items: [
        'In the sidebar, click "+ Place Asset". A green banner appears across the top of the map.',
        'Tap or click the map at the spot where the asset is fitted.',
        'A small dialog opens. Give the asset a name (e.g. "Fire Extinguisher — Hall Entrance") and pick its type from the dropdown.',
        'Click "Place Asset" to save.',
      ] },
      { type: 'paragraph', text: 'The asset now appears on the map and in the Assets register. You can click any marker later to edit, archive, or open the asset’s detail page.' },
      { type: 'callout', tone: 'info', text: 'No asset types in the dropdown? A trust admin needs to set them up first under Settings → Asset Types.' },
    ],
    related: ['adding-an-asset', 'asset-types-overview'],
  },

  // ─────────────────────────────────────────────────────────────────────────
  'adding-an-asset': {
    slug: 'adding-an-asset',
    title: 'Adding and editing assets',
    category: 'assets',
    shortDescription: 'Track every physical thing the trust is responsible for.',
    body: [
      { type: 'paragraph', text: 'An asset is anything physical the trust owns or is responsible for: fire extinguishers, the boiler, the coffee machine, fire doors, even the building itself.' },
      { type: 'heading', level: 2, text: 'Adding from the register' },
      { type: 'list', ordered: true, items: [
        'Open Assets in the sidebar.',
        'Click "+ Add Asset" in the top right.',
        'Fill in the name and type (the type is required — pick the closest match).',
        'Add any extra details you have: serial number, manufacturer, install date.',
        'Click Save.',
      ] },
      { type: 'heading', level: 2, text: 'Adding from the map' },
      { type: 'paragraph', text: 'If you’re placing an asset that has a fixed location, it’s often easier to use the map (see "Placing a new asset on the map"). The asset still ends up in the register — it’s the same record.' },
      { type: 'tip', text: 'You don’t need to fill in everything at once. Just the name and type are required. Add the serial number and other details later as you find them.' },
    ],
    related: ['placing-an-asset', 'archive-vs-delete', 'asset-types-overview'],
  },

  // ─────────────────────────────────────────────────────────────────────────
  'archive-vs-delete': {
    slug: 'archive-vs-delete',
    title: 'Archive vs delete — what’s the difference?',
    category: 'assets',
    shortDescription: 'Archive when something is retired. Delete only if you added it by mistake.',
    body: [
      { type: 'paragraph', text: 'Both actions remove an item from your active register, but they’re very different.' },
      { type: 'heading', level: 2, text: 'Archive (the safe choice)' },
      { type: 'paragraph', text: 'Archiving hides the item from your active list but keeps the record. The history is preserved for audit. You can always restore an archived item later.' },
      { type: 'paragraph', text: 'Use Archive when: an asset is decommissioned, a supplier is no longer used, a compliance item is no longer relevant.' },
      { type: 'heading', level: 2, text: 'Delete (be careful)' },
      { type: 'paragraph', text: 'Deleting permanently removes the record. You can’t undo it. If the item is connected to anything else (e.g. a compliance item linked to a supplier), the delete is blocked — you’ll be asked to archive instead.' },
      { type: 'paragraph', text: 'Use Delete only when: you added something by mistake and want to remove it cleanly.' },
      { type: 'callout', tone: 'warning', text: 'When in doubt, archive. You can always change your mind later.' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  'asset-types-overview': {
    slug: 'asset-types-overview',
    title: 'Asset types — the catalogue',
    category: 'asset-types',
    shortDescription: 'Defines the kinds of assets you can add (Fire Extinguisher, Boiler, etc.) and their compliance requirements.',
    body: [
      { type: 'paragraph', text: 'An asset type is a template — like "Fire Extinguisher" or "Distribution Board" — that defines what kind of asset something is, what icon it gets on the map, and what compliance it needs.' },
      { type: 'heading', level: 2, text: 'Why this matters' },
      { type: 'list', items: [
        'When you add a new asset, you pick its type from this catalogue.',
        'Each type can have an inspection interval (e.g. 365 days for an annual service).',
        'Each type can require a service certificate — for example, a boiler needs a CD11.',
        'When the type’s rules change, all assets of that type pick up the new rules automatically.',
      ] },
      { type: 'heading', level: 2, text: 'Managing types' },
      { type: 'paragraph', text: 'Open Settings → Asset Types. Trust admins can add new types, edit existing ones, or archive types that are no longer used.' },
      { type: 'tip', text: 'The platform comes with a sensible starter set (fire extinguishers, smoke detectors, distribution boards, etc.). Add to it as your hall’s inventory grows.' },
    ],
    related: ['adding-an-asset'],
  },

  // ─────────────────────────────────────────────────────────────────────────
  'uploading-a-document': {
    slug: 'uploading-a-document',
    title: 'Uploading a document',
    category: 'documents',
    shortDescription: 'Drag and drop a PDF or photo. The platform fills in the details for you.',
    body: [
      { type: 'paragraph', text: 'Documents are how the platform proves the trust is compliant — certificates, policies, insurance schedules, Land Registry titles, anything that backs up a record.' },
      { type: 'heading', level: 2, text: 'How to upload' },
      { type: 'list', ordered: true, items: [
        'Open Documents in the sidebar (or use the upload button on an asset’s or compliance item’s detail page).',
        'Click "Upload Document" or drag a file into the dialog.',
        'Wait a couple of seconds while the file uploads and the AI reads it.',
        'Check the suggested name and type — they should be filled in already. Tweak if needed.',
        'Click Save.',
      ] },
      { type: 'heading', level: 2, text: 'What you can upload' },
      { type: 'paragraph', text: 'PDF, JPEG, PNG, WebP, GIF, HEIC, Word, and Excel files. Up to 25 MB each.' },
      { type: 'tip', text: 'You don’t need to remember which type to pick — the AI guesses. You can change it before saving if it’s wrong.' },
    ],
    related: ['ai-auto-fill', 'document-expiry'],
  },

  // ─────────────────────────────────────────────────────────────────────────
  'ai-auto-fill': {
    slug: 'ai-auto-fill',
    title: 'How AI auto-fill works',
    category: 'documents',
    shortDescription: 'The platform reads each document and pre-fills the form. You stay in charge.',
    body: [
      { type: 'paragraph', text: 'When you upload a PDF or image, the platform sends it to a reading service that classifies the document and pulls out the key details.' },
      { type: 'heading', level: 2, text: 'What it fills in' },
      { type: 'list', items: [
        'A clear name (e.g. "HM Land Registry Title TT123456")',
        'The document type (Certificate, Policy, Lease, Insurance, etc.)',
        'An expiry date if one is mentioned in the document',
      ] },
      { type: 'heading', level: 2, text: 'You stay in charge' },
      { type: 'paragraph', text: 'The AI suggests; you decide. Any field you start typing is left alone — the AI never overwrites your input. If the AI isn’t confident, it leaves the form blank with a note saying so.' },
      { type: 'paragraph', text: 'Fields the AI filled in are marked with a small "AI" badge. Edit them freely if anything’s off — the badge disappears as soon as you change the value.' },
      { type: 'tip', text: 'AI auto-fill works for PDFs and photos. For Word and Excel files, you’ll fill the form by hand — the platform doesn’t read those.' },
    ],
    related: ['uploading-a-document'],
  },

  // ─────────────────────────────────────────────────────────────────────────
  'document-expiry': {
    slug: 'document-expiry',
    title: 'Why some documents have an expiry date',
    category: 'documents',
    shortDescription: 'Most documents don’t expire. Some do — like insurance and certificates.',
    body: [
      { type: 'paragraph', text: 'When you upload a document, you’ll see a checkbox: "This document has an expiry date". It’s unticked by default because most documents don’t expire — Land Registry titles, building deeds, the trust constitution, asset purchase invoices.' },
      { type: 'heading', level: 2, text: 'When to tick it' },
      { type: 'list', items: [
        'Insurance certificates — they expire annually.',
        'Service certificates like CD11 (boiler) or PAT testing — usually annual.',
        'Fixed-term contracts and warranties.',
      ] },
      { type: 'paragraph', text: 'When you tick the box, a date field appears. The platform will then show this document as "expiring soon" 30 days before the date and "overdue" once the date has passed.' },
      { type: 'tip', text: 'AI auto-fill ticks the box for you when it spots a renewal date in the document.' },
    ],
    related: ['uploading-a-document'],
  },

  // ─────────────────────────────────────────────────────────────────────────
  'compliance-lifecycle': {
    slug: 'compliance-lifecycle',
    title: 'Understanding the compliance lifecycle',
    category: 'compliance',
    shortDescription: 'Each compliance item flows through the same stages: pending → quoting → approved → scheduled → completed.',
    body: [
      { type: 'paragraph', text: 'A compliance item is an obligation — something the trust must do, like an annual gas safe service or a five-yearly electrical inspection. Each item moves through a predictable set of stages.' },
      { type: 'heading', level: 2, text: 'The stages' },
      { type: 'list', ordered: true, items: [
        'Pending — the obligation exists but no work has started yet.',
        'Quoting — the secretary is getting quotes from suppliers.',
        'Awaiting approval — a quote is in hand and trustees need to sign off.',
        'Approved — trustees have agreed; work needs to be scheduled.',
        'Scheduled — a date is booked with the supplier.',
        'Completed — the work is done and a certificate is on file.',
      ] },
      { type: 'paragraph', text: 'Items in the past with no completion are flagged "Overdue". Recurring items (like an annual service) automatically create a fresh "pending" item for next year when you mark this one complete.' },
      { type: 'heading', level: 2, text: 'The next-action button' },
      { type: 'paragraph', text: 'Each row in the register shows the obvious next action: "Start quoting", "Request approval", "Record approval", "Schedule", "Mark complete". One click moves the item forward.' },
      { type: 'tip', text: 'You don’t have to go through every stage. If you have a fixed annual contractor and don’t need a quoting cycle, you can jump from Pending straight to Scheduled.' },
    ],
    related: ['recording-an-approval', 'scheduling-with-a-supplier'],
  },

  // ─────────────────────────────────────────────────────────────────────────
  'recording-an-approval': {
    slug: 'recording-an-approval',
    title: 'Recording an approval',
    category: 'compliance',
    shortDescription: 'Capture who said yes, when, and how — meeting, email, WhatsApp, or in-app.',
    body: [
      { type: 'paragraph', text: 'When trustees approve a quote, you record it against the compliance item so the audit trail is complete.' },
      { type: 'heading', level: 2, text: 'How to record one' },
      { type: 'list', ordered: true, items: [
        'On the compliance item’s detail page, click "Record approval".',
        'Pick "Approved" or "Rejected".',
        'Pick the channel: a meeting, an email thread, a WhatsApp group chat, or in-app.',
        'Tick the trustees who voted yes.',
        'Add a note — paste the WhatsApp summary, email subject line, or meeting minute reference. Anything that helps a future auditor see what happened.',
        'Click Record.',
      ] },
      { type: 'heading', level: 2, text: 'Why notes matter' },
      { type: 'paragraph', text: 'A future audit will want to see how each decision was made. The note field is plain text — paste a screenshot summary, type "Discussed at AGM 14 May, see minute 3.2", or whatever proves the approval happened.' },
      { type: 'callout', tone: 'info', text: 'Only trustees and trust admins can record approvals. The system always records who you are when you submit, so the trail is tamper-evident.' },
    ],
    related: ['compliance-lifecycle', 'scheduling-with-a-supplier'],
  },

  // ─────────────────────────────────────────────────────────────────────────
  'scheduling-with-a-supplier': {
    slug: 'scheduling-with-a-supplier',
    title: 'Scheduling work with a supplier',
    category: 'compliance',
    shortDescription: 'Pick the supplier, set a date, add notes — all in one dialog.',
    body: [
      { type: 'paragraph', text: 'Once trustees have approved a quote, the next step is to book the work in.' },
      { type: 'heading', level: 2, text: 'How to schedule' },
      { type: 'list', ordered: true, items: [
        'On the compliance item’s detail page, click "Schedule".',
        'In the dialog, type the supplier’s name. The list filters as you type.',
        'Pick the supplier from the suggestions.',
        'Set the booking date if you have one. (Optional — you can leave it blank and add the date later.)',
        'Add any notes — booking reference, special instructions, who confirmed it.',
        'Click Schedule.',
      ] },
      { type: 'paragraph', text: 'The compliance item moves to "Scheduled" status and the supplier appears on its detail page. Click the supplier’s name any time to open their record and see all the work they’ve done for the trust.' },
      { type: 'tip', text: 'No suppliers appearing? Add them under Suppliers in the sidebar first.' },
    ],
    related: ['adding-a-supplier', 'compliance-lifecycle'],
  },

  // ─────────────────────────────────────────────────────────────────────────
  'adding-a-supplier': {
    slug: 'adding-a-supplier',
    title: 'Adding a supplier',
    category: 'suppliers',
    shortDescription: 'Keep your trusted contacts in one place — Gas Safe engineer, electrician, fire safety inspector.',
    body: [
      { type: 'paragraph', text: 'A supplier is anyone the trust uses for compliance work — Gas Safe engineers, electricians, fire safety inspectors, the company that does PAT testing.' },
      { type: 'heading', level: 2, text: 'How to add one' },
      { type: 'list', ordered: true, items: [
        'Open Suppliers in the sidebar.',
        'Click "+ Add Supplier".',
        'Enter the company name (required) and pick at least one category (e.g. "Plumber", "Gas Safe", "Electrician"). A supplier can be in more than one category — a maintenance company that does plumbing AND electrical, for example.',
        'Add the contact details you have: contact person, email, phone, address, website. None are required, but more is better for when you need to call.',
        'Add notes — preferred timing, rate card, who recommended them.',
        'Click Save.',
      ] },
      { type: 'paragraph', text: 'Once added, the supplier shows up in the typeahead when you’re scheduling a compliance item.' },
      { type: 'tip', text: 'The categories list (Gas Safe, Electrician, Plumber, etc.) is fixed for now. If you need a category that isn’t there, pick "Other" and put the detail in notes.' },
    ],
    related: ['scheduling-with-a-supplier', 'archived-suppliers'],
  },

  // ─────────────────────────────────────────────────────────────────────────
  'archived-suppliers': {
    slug: 'archived-suppliers',
    title: 'What happens when I archive a supplier?',
    category: 'suppliers',
    shortDescription: 'Past work history stays. They just disappear from the picker.',
    body: [
      { type: 'paragraph', text: 'You don’t lose anything by archiving a supplier. The work they’ve done in the past — quotes, certificates, scheduled jobs — all stays linked to them and viewable on their detail page.' },
      { type: 'heading', level: 2, text: 'What changes' },
      { type: 'list', items: [
        'Archived suppliers no longer appear when you’re scheduling a compliance item.',
        'They’re hidden from the default supplier list (filter by "Archived" to see them).',
        'You can restore them any time and they’ll be available again.',
      ] },
      { type: 'paragraph', text: 'Use this when a supplier closes down, raises their prices beyond what’s sensible, or you simply stop using them.' },
      { type: 'callout', tone: 'info', text: 'Trying to delete a supplier and getting a "they’re referenced" message? That means a compliance item still links to them. Archive instead — it preserves history.' },
    ],
    related: ['archive-vs-delete', 'adding-a-supplier'],
  },

  // ─────────────────────────────────────────────────────────────────────────
  'secretary-monthly-rhythm': {
    slug: 'secretary-monthly-rhythm',
    title: 'A typical month for the secretary',
    category: 'workflow',
    shortDescription: 'A patterned rhythm — quotes early, meeting in the middle, certificates filed at the end.',
    body: [
      { type: 'paragraph', text: 'Most trust secretaries find a rhythm that follows the monthly trustees meeting. Here’s a pattern that works.' },
      { type: 'heading', level: 2, text: 'Early in the month' },
      { type: 'paragraph', text: 'Open the dashboard. Look at "Due soon" and "Overdue". For anything coming up in the next 60–90 days, it’s time to start quoting:' },
      { type: 'list', items: [
        'Open the compliance item, click "Start quoting".',
        'Email the supplier on file (or one in your Suppliers list) for a quote.',
        'When the quote arrives, upload the PDF — link it to the compliance item.',
        'Click "Request approval". The item is now waiting for the next meeting.',
      ] },
      { type: 'heading', level: 2, text: 'At the meeting' },
      { type: 'paragraph', text: 'Bring a printout or open the laptop on Compliance filtered to "Awaiting approval". Trustees vote on each. After the meeting, record each approval — pick "In a meeting" as the channel and tick the trustees who agreed.' },
      { type: 'heading', level: 2, text: 'After the meeting' },
      { type: 'list', items: [
        'For each approved item, click "Schedule" and book it in with the supplier.',
        'When the work is done and the certificate arrives, upload it to the compliance item.',
        'Click "Mark complete". If the item is recurring (annual gas safe, etc.), the platform creates next year’s item automatically.',
      ] },
      { type: 'tip', text: 'WhatsApp groups are a perfectly valid approval channel. Paste a summary into the notes when you record the approval — that’s the audit trail.' },
    ],
    related: ['compliance-lifecycle', 'recording-an-approval', 'scheduling-with-a-supplier'],
  },
};

export function getTopic(slug: string): HelpTopic | null {
  return TOPICS[slug as HelpTopicSlug] ?? null;
}

export function listTopics(): HelpTopic[] {
  return Object.values(TOPICS);
}
