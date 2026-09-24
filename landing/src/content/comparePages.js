/**
 * Data-driven comparison pages at /compare/[slug]. (Zoho and TeleCRM have
 * their own hand-built pages.) Keep every row verifiable: what EzzySync
 * does must match seo/product-facts.md, and what the alternative does must
 * be true of it in general, not a worst case. Each page also says honestly
 * when the alternative is enough.
 */

export const comparePages = [
  {
    slug: "excel",
    label: "Travel CRM vs Excel",
    other: "Excel + WhatsApp",
    metaTitle: "Travel CRM vs Excel: When to Switch | EzzySync",
    metaDescription:
      "Excel and WhatsApp work for a small agency - until follow-ups, quotes and payments slip. A side-by-side look at what changes when you move to a travel CRM.",
    h1: "Travel CRM vs Excel: when is a spreadsheet no longer enough?",
    intro:
      "Most Indian travel agencies start with an Excel sheet and a WhatsApp number, and that's a sensible start. The question isn't whether Excel is bad; it's the point at which it starts costing you bookings.",
    rows: [
      ["New inquiries", "WhatsApp, Instagram DM and website-form inquiries become leads on their own", "Someone copies each chat into the sheet"],
      ["Who owns a lead", "Every lead has one assigned agent", "Whoever remembers; often unclear"],
      ["Follow-ups", "Due follow-ups listed every morning, one tap to WhatsApp", "Depends on memory or a separate reminder app"],
      ["Itinerary & quote", "Day-wise builder, GST calculated, PDF or link on your letterhead", "Word/Canva file rebuilt for each change"],
      ["Payments", "Advance, instalments and balance due per booking", "UPI screenshots in chats, a separate column"],
      ["Team working together", "Shared inbox and pipeline, per-login permissions", "One file, overwrites, version confusion"],
      ["Cost", "From ₹999/month after a free trial", "Free"],
    ],
    enough: [
      "You handle roughly 10-20 inquiries a month, alone.",
      "You rarely send more than one version of a quote.",
      "You don't collect advances and balances in instalments.",
    ],
    switchWhen: [
      "More than one person replies to clients.",
      "You've lost a booking because nobody followed up.",
      "Building a quote takes longer than the client is willing to wait.",
      "You can't answer \"who still owes us money?\" in under a minute.",
    ],
    faqs: [
      {
        q: "Can I move my Excel leads into EzzySync?",
        a: "Yes. Save the sheet as CSV and import it from the Leads page; name, phone, destination and source columns become leads.",
      },
      {
        q: "Is a travel CRM worth it for a small agency?",
        a: "If you're alone with a handful of inquiries a month, Excel is fine. Once a second person handles clients or follow-ups start slipping, a CRM usually pays for itself with one saved booking.",
      },
    ],
    related: ["/features/lead-management", "/features/follow-up-automation", "/solutions/travel-consultants"],
  },
  {
    slug: "generic-crm",
    label: "Travel CRM vs Generic CRM",
    other: "Generic CRM",
    metaTitle: "Travel CRM vs Generic CRM (Zoho, HubSpot) | EzzySync",
    metaDescription:
      "Generic CRMs handle contacts and deals well but not itineraries, GST travel quotes or vouchers. What a travel-specific CRM adds, and when a generic one is fine.",
    h1: "Travel CRM vs generic CRM: what travel agencies actually need",
    intro:
      "Zoho, HubSpot, Freshsales and similar CRMs are built for any sales team - software, real estate, education. They're excellent at contacts, deals and email. Travel sales need a few things they don't have out of the box.",
    rows: [
      ["Contacts, deals, pipeline", "Yes", "Yes - usually more customisable"],
      ["Day-wise itinerary builder", "Built in, with PDF and mobile link", "Not built in; needs custom fields or a separate tool"],
      ["GST travel quote (SAC 998555)", "Calculated on every quote", "Generic quotes; tour-operator tax setup is manual"],
      ["Hotel inventory with cost vs selling rate", "Built in", "Custom module or spreadsheet"],
      ["Hotel vouchers & driver duty slips", "From the booking", "Not available"],
      ["WhatsApp team inbox", "Official Cloud API, chats linked to leads", "Often an add-on or third-party integration"],
      ["Setup for a travel agency", "Ready on day one", "Weeks of configuration, often a consultant"],
      ["Marketing automation, email campaigns", "Not the focus", "Usually strong"],
    ],
    enough: [
      "You mostly sell one standard product with a fixed price.",
      "Email campaigns matter more to you than WhatsApp.",
      "You have someone who can configure and maintain the CRM.",
    ],
    switchWhen: [
      "Every sale needs a custom day-wise itinerary.",
      "Quotes need GST, per-person pricing and inclusions/exclusions.",
      "Bookings need hotel confirmations, vouchers and balance tracking.",
      "Your clients talk to you on WhatsApp, not email.",
    ],
    faqs: [
      {
        q: "Can't I just customise Zoho or HubSpot for travel?",
        a: "You can add custom fields and modules, but itineraries, GST travel quotes, vouchers and hotel rates end up as workarounds you maintain yourself. A travel CRM has them built in.",
      },
      {
        q: "Does EzzySync replace email marketing tools?",
        a: "No. EzzySync is built around leads, WhatsApp, itineraries, bookings and payments. Keep your email tool if campaigns are a big part of your marketing.",
      },
    ],
    related: ["/compare/zoho", "/compare/telecrm", "/features/itinerary-builder"],
  },
];

export const getComparePage = (slug) => comparePages.find((p) => p.slug === slug);
