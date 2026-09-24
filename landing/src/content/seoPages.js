/**
 * Content for /features/[slug] and /solutions/[slug].
 *
 * Each page targets one search intent and has to stand on its own: its own
 * problems, its own workflow, its own FAQ. Do not add a page here by copying
 * another one and swapping the keyword - near-duplicate pages compete with
 * each other and read as scaled spam. Every claim must match what the CRM
 * actually does today (see frontend/src/pages/HelpGuide.jsx).
 *
 * `related` holds site paths; they render as the "Related" links block.
 */

export const featurePages = [
  {
    slug: "lead-management",
    label: "Lead management",
    metaTitle: "Travel Lead Management Software for Agencies | EzzySync",
    metaDescription:
      "Capture travel inquiries from WhatsApp, Instagram, your website form and Excel into one pipeline. Assign leads to staff, track every stage and stop losing bookings.",
    h1: "Travel lead management that keeps every inquiry in one place",
    intro:
      "A traveler asks about Goa on WhatsApp, another replies to your Instagram ad in DMs, a third walks into the office. In EzzySync each of them ends up as a lead with a source, a destination, a budget and an owner — so nobody on your team has to ask “who is handling this?”",
    sections: [
      {
        title: "Every source lands in the same list",
        body: "WhatsApp messages, Instagram DMs and website-form inquiries come in on their own. Walk-ins, calls and leads from other ads are added in a few seconds, and your old Excel sheet comes across with a CSV import. Each lead keeps its source, so you can see which channel actually sends paying travelers.",
        points: ["WhatsApp (including click-to-WhatsApp ads), Instagram DMs and website forms captured automatically", "Excel / CSV import for your existing leads", "Other sources - Google Ads, walk-ins, referrals - tagged on the lead"],
      },
      {
        title: "A pipeline you can see at a glance",
        body: "Drag leads across stages — New, Contacted, Requirements gathered, Won or Lost — on a kanban board. Each column shows the total value sitting in it, so stuck inquiries are obvious.",
        points: ["Drag-and-drop stages", "Pipeline value per stage", "Filter by agent, customer, phone or package"],
      },
      {
        title: "Clear ownership for your team",
        body: "Assign each inquiry to a sales agent. Agents see their own leads; owners see everything and can reassign when someone is on leave.",
        points: ["Assign and reassign leads", "Filter the list by team member", "Role-based permissions per staff login"],
      },
    ],
    steps: [
      "Inquiry arrives on WhatsApp, Instagram or your website form, or is typed in by your staff",
      "Lead is created with source, destination and budget",
      "Assigned agent follows up and moves it through the pipeline",
      "Won leads turn into an itinerary, quote and booking",
    ],
    faqs: [
      {
        q: "Can I import leads I already have in Excel?",
        a: "Yes. Export your sheet as CSV and import it from the Leads page. Name, phone, destination and source columns are mapped into EzzySync leads.",
      },
      {
        q: "Can two agents accidentally work the same lead?",
        a: "Each lead has one assigned owner, and the list can be filtered by agent, so it is clear who is responsible. Owners can reassign a lead at any time.",
      },
      {
        q: "Does it show which lead source brings the most bookings?",
        a: "Every lead keeps its source, so you can filter by source and compare how many turned into won bookings.",
      },
    ],
    related: ["/features/follow-up-automation", "/features/whatsapp-automation", "/solutions/travel-agencies"],
  },
  {
    slug: "whatsapp-automation",
    label: "WhatsApp CRM",
    metaTitle: "WhatsApp CRM for Travel Agents — Shared Team Inbox | EzzySync",
    metaDescription:
      "Run your agency's WhatsApp from one shared inbox. Connect the official Cloud API, assign chats to agents and send itineraries and quotes in one click.",
    h1: "A WhatsApp CRM built for travel agents",
    intro:
      "Most Indian travel inquiries start on WhatsApp — and most agencies still answer them from four different personal phones. EzzySync puts those chats in one inbox, links every conversation to its lead, and lets your team reply from the business number.",
    sections: [
      {
        title: "One number, the whole team",
        body: "Connect your own number through the official Meta WhatsApp Cloud API. Your agents reply from a shared inbox instead of their personal phones, so chats stay with the business when staff change.",
        points: ["Official Meta WhatsApp Cloud API", "Shared inbox for up to 5 agents on Agency Growth", "Chat history stays with the lead"],
      },
      {
        title: "Start quickly, upgrade later",
        body: "Not ready to set up the Cloud API? Solo agents can start on EzzySync's shared number or link WhatsApp by scanning a QR code, then move to their own business number when they grow.",
        points: ["QR link to get started", "Switch to your own Cloud API number any time", "No per-message markup from EzzySync"],
      },
      {
        title: "Send the work, not just messages",
        body: "Share a day-wise itinerary link, a quote PDF or an invoice straight from the trip into the client's WhatsApp. From the follow-up list, one tap opens the chat without saving the number.",
        points: ["Itinerary and quote links in one click", "Invoice on WhatsApp after booking", "Open a chat from any lead or follow-up"],
      },
    ],
    steps: [
      "Connect your business number (Cloud API) or link by QR",
      "Incoming chats show up in the shared inbox, tied to their lead",
      "Agents reply, share itineraries and quotes from the same screen",
      "Confirmed trips get invoices and vouchers on WhatsApp",
    ],
    faqs: [
      {
        q: "Do I need the official WhatsApp Business API?",
        a: "Not to start. You can link WhatsApp by QR or use EzzySync's shared number. For a team inbox on your own number, connect the official Meta WhatsApp Cloud API from Settings.",
      },
      {
        q: "Does EzzySync charge per WhatsApp message?",
        a: "No. Meta's own conversation charges apply to Cloud API numbers; EzzySync adds no markup on top.",
      },
      {
        q: "Can several agents reply from the same number?",
        a: "Yes. On the Agency Growth plan up to 5 team logins share one number, and each chat is linked to the lead and its assigned agent.",
      },
    ],
    related: ["/features/lead-management", "/features/itinerary-builder", "/blog/whatsapp-business-api-travel-agency-setup-guide"],
  },
  {
    slug: "itinerary-builder",
    label: "Itinerary builder",
    metaTitle: "Travel Itinerary Software — Day-wise Builder with PDF | EzzySync",
    metaDescription:
      "Build day-wise travel itineraries with hotels, sightseeing, transfers and flights. Share as a branded PDF or mobile link and turn it into a GST quote in one step.",
    h1: "Travel itinerary software for day-wise plans and quotes",
    intro:
      "Rebuilding the same Kerala or Kashmir plan in Word for every client eats hours. In EzzySync you lay out the trip day by day once, price it, and share it as a clean PDF or a link the client opens on their phone.",
    sections: [
      {
        title: "Plan the trip day by day",
        body: "Add sightseeing, hotel stays, transfers and flight details to each day. Duplicate a past itinerary to start the next similar trip in minutes instead of from a blank page.",
        points: ["Per-day sightseeing, hotels, transfers, flights", "Duplicate any itinerary as a template", "Inclusions and exclusions on every plan"],
      },
      {
        title: "Price it in the same place",
        body: "Add the package cost and EzzySync works out GST and totals. Hotel cost and selling rates come from your saved hotel list, so margins are visible before you send.",
        points: ["GST worked out on the quote", "Cost vs selling price from your hotel inventory", "Per-person price for group quotes"],
      },
      {
        title: "Share it the way clients read it",
        body: "Send a public link that opens cleanly on a phone, or download a PDF on your letterhead. Track whether the client has accepted the quote.",
        points: ["Mobile web link and PDF", "Your logo and agency details", "Acceptance status per quote"],
      },
    ],
    steps: [
      "Pick the lead and destination",
      "Lay out days, hotels and transfers — or duplicate a past trip",
      "Add pricing; GST and totals are calculated",
      "Share the link or PDF on WhatsApp and track acceptance",
    ],
    faqs: [
      {
        q: "Can I try the itinerary builder without an account?",
        a: "Yes. The free itinerary builder on this site creates a day-wise plan you can download as a PDF, with no login.",
      },
      {
        q: "Is there an AI itinerary generator?",
        a: "Yes, on the Agency Growth plan. Enter the destination, number of days and travel style, and it drafts a day-wise plan you then edit before sending.",
      },
      {
        q: "Can I reuse itineraries for popular destinations?",
        a: "Duplicate any saved itinerary and adjust dates, hotels and pricing for the new client.",
      },
    ],
    related: ["/free-itinerary-builder", "/features/booking-management", "/blog/ai-itinerary-builder-efficiency"],
  },
  {
    slug: "follow-up-automation",
    label: "Follow-up reminders",
    metaTitle: "Travel Follow-up Software — Never Miss a Lead | EzzySync",
    metaDescription:
      "See every travel lead that needs a call or message today. Set follow-up dates, get reminded on the due day and contact clients in one tap on call, WhatsApp or email.",
    h1: "Follow-up software so travel leads don't go cold",
    intro:
      "Most lost bookings aren't lost to a cheaper price — they're lost because nobody called back on Thursday. EzzySync gives every agent a list of who needs a follow-up today, and a one-tap way to reach them.",
    sections: [
      {
        title: "Today's list, ready every morning",
        body: "Set a follow-up date on any lead. On the day it's due, it shows up in the follow-up view, grouped into priority today, new leads, pending leads and leads where no action was taken yet.",
        points: ["Priority today", "New leads with no contact yet", "Pending and no-action-taken buckets"],
      },
      {
        title: "Contact the client in one tap",
        body: "Call, WhatsApp or email shortcuts sit on every follow-up. WhatsApp opens the chat directly — no need to save the number to your phone first.",
        points: ["Call, WhatsApp and email shortcuts", "Open WhatsApp without saving the contact", "Mark done when the task is complete"],
      },
      {
        title: "Managers see who is slipping",
        body: "Filter follow-ups by team member to see whose list is piling up, and reassign leads before they go cold.",
        points: ["Filter by assigned agent", "Reassign overdue leads", "Full activity history on each lead"],
      },
    ],
    steps: [
      "Agent sets the next follow-up date after each conversation",
      "On the due day, the lead appears in the follow-up list",
      "One tap to call or WhatsApp; mark it done",
      "Manager reviews overdue follow-ups by agent",
    ],
    faqs: [
      {
        q: "Does EzzySync send the follow-up message automatically?",
        a: "EzzySync reminds your agent and opens the chat in one tap; the agent sends the message. Automatic WhatsApp alerts are used for events like new inquiries and payments.",
      },
      {
        q: "Can I see follow-ups for only one team member?",
        a: "Yes. The follow-up list can be filtered by assigned agent.",
      },
    ],
    related: ["/features/lead-management", "/features/whatsapp-automation", "/blog/automate-travel-agency-follow-ups"],
  },
  {
    slug: "booking-management",
    label: "Bookings, vouchers & invoices",
    metaTitle: "Travel Booking Management Software with GST Invoices | EzzySync",
    metaDescription:
      "Turn accepted quotes into bookings, track hotel confirmations and voucher numbers, record advance and balance payments, and issue GST invoices.",
    h1: "Travel booking management, from confirmed quote to invoice",
    intro:
      "Once a client says yes, the real work starts: hotel confirmations, vouchers, advances, balances and a GST invoice. EzzySync keeps all of it on the booking, so nothing lives in a separate sheet.",
    sections: [
      {
        title: "Bookings that fill themselves",
        body: "Pick the accepted itinerary and the booking form is pre-filled with the customer, trip and price. Link each hotel and room category from your hotel list.",
        points: ["Create a booking from an itinerary", "Hotel and room category per stay", "Upcoming trips view by departure date"],
      },
      {
        title: "Hotel confirmations and vouchers",
        body: "Track each hotel reservation as pending or confirmed, store the voucher number, and send the voucher to the client.",
        points: ["Pending / confirmed status per hotel", "Voucher ID on each booking", "Driver duty slips for transfers"],
      },
      {
        title: "Payments and GST invoices",
        body: "Record the advance and every instalment against the booking and see the balance due before travel. Generate invoices with GST worked out, your own invoice prefix and terms, and send them by email or WhatsApp.",
        points: ["Advance, instalments and balance due", "GST with tour operator SAC 998555", "Razorpay payments matched on Agency Growth"],
      },
    ],
    steps: [
      "Client accepts the quote",
      "Booking is created from the itinerary",
      "Hotels confirmed, vouchers issued, advance recorded",
      "GST invoice sent; balance tracked until travel",
    ],
    faqs: [
      {
        q: "Does the invoice handle GST?",
        a: "Yes. Invoices calculate GST, use your custom invoice prefix and footer terms, and can be downloaded as PDF or sent by email or WhatsApp.",
      },
      {
        q: "Can I record part payments?",
        a: "Yes. Each booking keeps a log of advance and instalment receipts and shows the balance still due.",
      },
      {
        q: "Can I track what a trip costs me?",
        a: "Log expenses against a trip and use costing templates for your common packages, so you can see the margin on each booking.",
      },
    ],
    related: ["/features/itinerary-builder", "/solutions/tour-operators", "/blog/streamline-travel-agency-billing"],
  },
  {
    slug: "customer-management",
    label: "Customer management",
    metaTitle: "Customer Management for Travel Agencies | EzzySync",
    metaDescription:
      "Keep every traveler's contact details, past trips, quotes, bookings and payments on one profile. Find repeat customers fast and give them a better second trip.",
    h1: "Customer management for travel agencies",
    intro:
      "A family that went to Kerala with you last winter is your cheapest next booking. EzzySync keeps each traveler's history on one profile, so whoever picks up the phone knows who they're talking to.",
    sections: [
      {
        title: "One profile per traveler",
        body: "Contact details, every lead, itinerary, booking and invoice for a customer sit on their profile. Search by name, email or phone.",
        points: ["Search by name, email or phone", "All trips and quotes on one page", "Payment history per customer"],
      },
      {
        title: "Repeat business without digging",
        body: "When a past customer messages again, pull up what they booked, which hotels they stayed in and what they paid — and quote the next trip with that in mind.",
        points: ["Past destinations and hotels", "Previous budgets", "Linked WhatsApp conversation"],
      },
      {
        title: "Your data stays yours",
        body: "Each agency's data is isolated from every other account, staff access is controlled per login, and your bookings can be exported to CSV whenever you want.",
        points: ["Per-login permissions", "Agency data isolated from other accounts", "Bookings export to CSV"],
      },
    ],
    steps: [
      "Customer is created from their first lead",
      "Every quote, booking and payment is added to their profile",
      "Repeat inquiry? Open the profile and quote with full context",
    ],
    faqs: [
      {
        q: "Can I restrict what each staff member can see?",
        a: "Yes. Team permissions are set per login from the Team page.",
      },
      {
        q: "Can I get my data out?",
        a: "Yes. Bookings can be exported to CSV from the Bookings page at any time.",
      },
    ],
    related: ["/features/lead-management", "/features/booking-management", "/solutions/small-travel-businesses"],
  },
];

featurePages.push({
  slug: "automation",
  label: "Automation",
  metaTitle: "Travel Agency Automation: What to Automate | EzzySync",
  metaDescription:
    "What a travel agency can automate: lead capture, reminders, GST quotes, bookings and payment matching - and what should still be done by a person.",
  h1: "Travel agency automation, without losing the personal touch",
  intro:
    "Travellers book with the agent who replies fast and remembers the details. Automation should take the retyping, chasing and calculating off your team so they can do exactly that. Here is what EzzySync automates, step by step - and what it deliberately leaves to a person.",
  sections: [
    {
      title: "Automated: getting the inquiry in",
      body: "New inquiries from WhatsApp, Instagram DMs and your website form land as leads with their source, instead of being copied from chats into a sheet. Old Excel lists come across in one CSV import.",
      points: ["Leads created from WhatsApp, Instagram DMs and website forms", "Source kept on every lead", "One-time Excel / CSV import"],
    },
    {
      title: "Automated: the paperwork",
      body: "GST and totals are worked out on every quote. An accepted itinerary pre-fills the booking, the booking pre-fills the invoice, and on Agency Growth Razorpay payments are matched to the right booking.",
      points: ["GST (SAC 998555) and per-person totals on quotes", "Itinerary → booking → invoice without retyping", "Razorpay payments matched to bookings"],
    },
    {
      title: "Automated: remembering",
      body: "Every lead with a follow-up date shows up on the day it's due, grouped by priority, with a one-tap WhatsApp, call or email button. Nothing depends on someone's memory or a sticky note.",
      points: ["Daily follow-up list per agent", "Priority / new / pending / no-action buckets", "Full history on each lead"],
    },
    {
      title: "Left to your team, on purpose",
      body: "EzzySync reminds your agent to follow up and opens the chat - it does not fire off follow-up messages on its own. A generic automated nudge is how travellers learn to ignore an agency; a two-line personal message after checking their dates is how you win the booking.",
      points: ["Follow-up messages are sent by your agent", "AI itinerary drafts are edited before sending", "Pricing decisions stay with you"],
    },
  ],
  steps: [
    "Inquiry arrives and becomes a lead automatically",
    "Agent builds the itinerary; GST quote is calculated",
    "Accepted quote becomes a booking without retyping",
    "Payments are logged or matched; invoice goes out on WhatsApp",
  ],
  faqs: [
    {
      q: "Does EzzySync send automatic follow-up messages?",
      a: "No. It shows each agent who to follow up today and opens the WhatsApp chat in one tap; the agent writes the message. Automatic WhatsApp alerts are used for events such as a new inquiry or a payment.",
    },
    {
      q: "What is the quickest win from automating a travel agency?",
      a: "Getting every inquiry into one list with an owner and a follow-up date. Most agencies lose more bookings to forgotten follow-ups than to price.",
    },
    {
      q: "Do I need the WhatsApp Business API to automate?",
      a: "Lead capture, reminders, quotes and invoices work without it. The official WhatsApp Cloud API adds a shared team inbox on your own number (Agency Growth).",
    },
  ],
  related: ["/features/lead-management", "/features/follow-up-automation", "/pricing"],
});

export const solutionPages = [
  {
    slug: "travel-agencies",
    label: "Travel agencies",
    metaTitle: "Travel Agency CRM Software in India | EzzySync",
    metaDescription:
      "CRM for travel agencies selling holiday packages: shared WhatsApp inbox, lead pipeline, day-wise itineraries, GST quotes and payment tracking in one tool.",
    h1: "CRM software for travel agencies",
    intro:
      "Retail travel agencies live on volume: dozens of package inquiries a week, most of them on WhatsApp, each needing a quick quote. EzzySync is set up for exactly that loop — inquiry, itinerary, quote, follow-up, booking.",
    pains: [
      { title: "Inquiries split across staff phones", body: "When an agent is on leave, their chats go with them." },
      { title: "Quotes rebuilt from scratch", body: "The same Goa or Dubai package retyped in Word for every client." },
      { title: "No view of the pipeline", body: "You only find out a lead went cold when the client books elsewhere." },
    ],
    fit: [
      { title: "Shared WhatsApp inbox", body: "Every chat is on the business number and tied to a lead.", href: "/features/whatsapp-automation" },
      { title: "Reusable itineraries", body: "Duplicate a past package and send a new quote in minutes.", href: "/features/itinerary-builder" },
      { title: "Daily follow-up list", body: "Each agent sees who to call today.", href: "/features/follow-up-automation" },
    ],
    plan: "Agency Growth — up to 5 logins, unlimited leads, your own WhatsApp number.",
    faqs: [
      {
        q: "How long does it take to set up for an agency?",
        a: "The workspace is ready in minutes. Import your Excel leads, add your team and letterhead, and send your first quote the same day. Connecting your own WhatsApp Cloud API number takes a short setup in Meta's developer portal.",
      },
      {
        q: "Is EzzySync only for domestic packages?",
        a: "No. It works for domestic and international trips — itineraries, quotes and invoices are the same for Goa or Dubai.",
      },
    ],
    related: ["/features/lead-management", "/compare/zoho", "/blog/best-travel-agency-crm-software-india-2026"],
  },
  {
    slug: "tour-operators",
    label: "Tour operators & DMCs",
    metaTitle: "Tour Operator CRM & Software for DMCs | EzzySync",
    metaDescription:
      "Tour operator software for fixed departures and custom tours: group batches, hotel inventory with cost and selling rates, trip costing, vouchers and GST invoicing.",
    h1: "Tour operator software for departures, hotels and costing",
    intro:
      "Tour operators and DMCs carry more moving parts than a retail agency: group departures, contracted hotel rates, driver duty slips and margins that disappear if one cost is missed. EzzySync keeps the operations side next to the sales side.",
    pains: [
      { title: "Hotel rates in a separate sheet", body: "Cost and selling prices drift apart from what gets quoted." },
      { title: "Group departures tracked by hand", body: "Seats and bookings for each departure spread across files." },
      { title: "Margins found out too late", body: "Trip costs are totalled after travel, not before quoting." },
    ],
    fit: [
      { title: "Group tour batches", body: "Set up fixed departures and see seats filled against capacity.", href: "/features/booking-management" },
      { title: "Hotel inventory", body: "Room categories, contacts, and cost vs selling rates per property.", href: "/features/itinerary-builder" },
      { title: "Trip costing and expenses", body: "Costing templates and expenses per trip to protect your margin.", href: "/features/booking-management" },
    ],
    plan: "Agency Growth for teams up to 5; Enterprise for multi-branch operators.",
    faqs: [
      {
        q: "Can I manage fixed group departures?",
        a: "Yes. Create a tour batch for each departure with its seat capacity, link bookings to it, and see how many seats are filled.",
      },
      {
        q: "Can I store contracted hotel rates?",
        a: "Yes. Each hotel in your inventory has room categories with separate cost and selling prices, plus multiple contacts such as sales and reservations.",
      },
    ],
    related: ["/features/booking-management", "/features/itinerary-builder", "/pricing"],
  },
  {
    slug: "travel-consultants",
    label: "Independent travel consultants",
    metaTitle: "CRM for Independent Travel Consultants & Planners | EzzySync",
    metaDescription:
      "A simple CRM for solo travel consultants: track inquiries, build day-wise itineraries, send professional quotes and invoices, and remember every follow-up.",
    h1: "A CRM for independent travel consultants",
    intro:
      "Working on your own, you are sales, operations and accounts at once. EzzySync's Solo plan gives you one place for inquiries, itineraries, quotes and payments — without the setup a big CRM needs.",
    pains: [
      { title: "Everything is in your head", body: "Who needs a call back, who paid, who's waiting for a revised plan." },
      { title: "Quotes that look homemade", body: "Word documents don't match the agencies you compete with." },
      { title: "Evenings lost to admin", body: "Invoices and payment follow-ups done after the actual work." },
    ],
    fit: [
      { title: "Follow-up reminders", body: "Your list of who to contact, every morning.", href: "/features/follow-up-automation" },
      { title: "Professional quotes", body: "Day-wise itinerary and GST quote on your letterhead.", href: "/features/itinerary-builder" },
      { title: "Invoices and payments", body: "Advance, balance and GST invoice on the booking.", href: "/features/booking-management" },
    ],
    plan: "Solo Agent — 1 login, up to 200 inquiries, itineraries, quotes and invoices.",
    faqs: [
      {
        q: "Do I need a GST number to use EzzySync?",
        a: "No. You can create itineraries and quotes without one. GST invoices use your GSTIN when you add it in Settings.",
      },
      {
        q: "Can I upgrade when I hire someone?",
        a: "Yes. Switch to Agency Growth for up to 5 logins; your leads and bookings stay as they are.",
      },
    ],
    related: ["/free-itinerary-builder", "/features/follow-up-automation", "/pricing"],
  },
  {
    slug: "small-travel-businesses",
    label: "Small travel businesses",
    metaTitle: "Travel Business Software for Small Teams (2–5 people) | EzzySync",
    metaDescription:
      "Travel business software for small teams: assign leads, share one WhatsApp number, set staff permissions and see bookings, payments and expenses in one dashboard.",
    h1: "Travel software for small teams of 2 to 5",
    intro:
      "Once a second person joins, the WhatsApp-and-Excel setup starts to crack: two people reply to the same client, nobody knows which sheet is current. EzzySync gives a small team one shared system without enterprise complexity.",
    pains: [
      { title: "Double replies and dropped chats", body: "Nobody is sure who owns which client." },
      { title: "The owner is the bottleneck", body: "Every quote and payment question goes through one person." },
      { title: "No numbers you trust", body: "Revenue, pending payments and expenses live in different places." },
    ],
    fit: [
      { title: "Lead assignment", body: "Every inquiry has one owner; reassign in a click.", href: "/features/lead-management" },
      { title: "Staff permissions", body: "Give each login access to what they need.", href: "/features/customer-management" },
      { title: "Dashboard", body: "Bookings, monthly revenue, pending payments and expenses together.", href: "/features/booking-management" },
    ],
    plan: "Agency Growth — up to 5 team logins on one shared WhatsApp number.",
    faqs: [
      {
        q: "What happens to a lead when a staff member leaves?",
        a: "Leads, chats and bookings belong to the agency account. Before removing a staff login you reassign their leads to someone else.",
      },
      {
        q: "Can I track office expenses too?",
        a: "Yes. Log expenses by category and link them to a trip or keep them general, alongside your bookings and revenue.",
      },
    ],
    related: ["/features/lead-management", "/features/whatsapp-automation", "/pricing"],
  },
];

export const getFeaturePage = (slug) => featurePages.find((p) => p.slug === slug);
export const getSolutionPage = (slug) => solutionPages.find((p) => p.slug === slug);
