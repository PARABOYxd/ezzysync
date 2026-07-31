import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Compass, LayoutDashboard, Contact2, Kanban, ListTodo, CalendarCheck, 
  FileText, Map, Building2, Sparkles, CheckCircle2, ChevronRight, HelpCircle,
  Phone, MessageSquare, Mail, Settings, UserCheck, Search
} from 'lucide-react';

const GUIDE_SECTIONS = [
  {
    id: "dashboard",
    icon: LayoutDashboard,
    route: "/dashboard",
    title: {
      en: "Dashboard Analytics & Welcome Onboarding",
      hi: "डैशबोर्ड विश्लेषण (Dashboard)",
      hinglish: "Dashboard Analytics aur Beginners Setup"
    },
    diagram: "📊 View Quick Stats ➔ 🎯 Track Sales Target ➔ 🚀 Read Onboarding Checklists",
    description: {
      en: "Your central command center. Provides real-time metrics on total bookings, monthly revenue, pending payments, and onboarding checklists for beginners.",
      hi: "आपका मुख्य नियंत्रण केंद्र। यहाँ आपको कुल बुकिंग, मासिक आय, लंबित भुगतान और शुरुआती सेटअप के लिए ऑनबोर्डिंग गाइड देखने को मिलती है।",
      hinglish: "Aapke business ka central counter. Yahan aap monthly revenue, total bookings, pending payments aur dynamic onboarding guide (beginner setup checklists) check karte hain."
    },
    actionItems: {
      en: ["Monitor daily sales metrics", "Check active tour statistics", "Follow 3-step beginner setup checklist"],
      hi: ["दैनिक बिक्री डेटा ट्रैक करें", "सक्रिय यात्राओं के आंकड़े देखें", "शुरुआती सेटअप चेकलिस्ट का पालन करें"],
      hinglish: ["Daily profit and revenue stats track karein", "Onboarding checklist se system configure karein"]
    }
  },
  {
    id: "leads",
    icon: Contact2,
    route: "/leads",
    title: {
      en: "Leads Management",
      hi: "लीड्स प्रबंधन (Leads)",
      hinglish: "Client Leads Manage Karna"
    },
    diagram: "📥 Capture Leads ➔ 🏷️ Set Source & Interest ➔ 📞 Link Contact Details",
    description: {
      en: "The beginning of your sales funnel. Log new travelers, their budget interest, custom lead sources (e.g. Instagram, Web, Walk-in), and destination details.",
      hi: "आपके सेल्स की शुरुआत। यहाँ आप यात्रियों का नाम, ईमेल, संपर्क नंबर, यात्रा स्थल की रुचि और लीड का स्रोत (जैसे की फेसबुक, वेबसाइट) सेव करते हैं।",
      hinglish: "Sales cycle ki shuruwat yahan se hoti hai. New enquiries/clients ka naam, phone number aur kahan jana hai (destination interest) yahan register karein."
    },
    actionItems: {
      en: ["Log manual leads", "Assign staff members to lead queries", "Filter by stage & source parameters"],
      hi: ["मैन्युअल लीड्स जोड़ें", "स्टाफ सदस्यों को लीड आवंटित करें", "चरणों और स्रोतों द्वारा फ़िल्टर करें"],
      hinglish: ["Naye client ki information save karein", "Har enquiry ko sales agent assign karein"]
    }
  },
  {
    id: "pipeline",
    icon: Kanban,
    route: "/pipeline",
    title: {
      en: "Visual Sales Pipeline",
      hi: "बिक्री पाइपलाइन (Sales Pipeline)",
      hinglish: "Visual Deals and Pipeline Stages"
    },
    diagram: "🆕 New Lead ➔ 💬 Contacted ➔ 📋 Requirements Gathered ➔ ✈️ Closed Won / Lost",
    description: {
      en: "A drag-and-drop kanban board to visually move deals through stages. Quickly track which bookings are confirmed, lost, or pending discussion.",
      hi: "एक ड्रैग-एंड-ड्रॉप कानबान बोर्ड, जिसकी मदद से आप सौदों को चरणों में स्थानांतरित कर सकते हैं। पता लगाएं कि कौन सी बुकिंग पक्की है और कौन सी रद्द हुई है।",
      hinglish: "Deals ko track karne ke liye ek interactive board. Drag and drop karke lead ka status (Negotiation, Closed, Lost) update karein."
    },
    actionItems: {
      en: ["Drag deals across columns to update status", "Identify stuck queries instantly", "View conversion analytics"],
      hi: ["स्थिति बदलने के लिए कार्ड्स को ड्रैग करें", "अटकी हुई पूछताछ को तुरंत पहचानें", "रूपांतरण का विश्लेषण देखें"],
      hinglish: ["Client ke status ke according card drag karein", "Har stage ke deals ki value check karein"]
    }
  },
  {
    id: "followups",
    icon: ListTodo,
    route: "/follow-ups",
    title: {
      en: "Follow-up Tasks Scheduler",
      hi: "फॉलो-अप और कार्य (Follow-ups)",
      hinglish: "Follow-up Reminders aur Shortcuts"
    },
    diagram: "⏰ Set Follow-up Date ➔ 🔔 Alert on Due Day ➔ 📞 Direct Phone/WhatsApp/Email Shortcuts",
    description: {
      en: "Never miss client discussions. The CRM automatically displays pending follow-ups for the day. Click the Call, WhatsApp, or Email shortcut buttons to contact the client instantly.",
      hi: "ग्राहकों से बातचीत कभी न भूलें। यह सिस्टम आज के सभी फॉलो-अप्स दिखाता है। तुरंत संपर्क करने के लिए कॉल, व्हाट्सएप या ईमेल बटन पर क्लिक करें।",
      hinglish: "Clients se regular touch me rahein. Jis din follow-up due hoga, system automatic alert show karega. 1-click me direct Call (tel:), WhatsApp (wa.me) ya Email send karein."
    },
    actionItems: {
      en: ["Mark follow-up logs as Done", "Click WhatsApp icon to chat instantly without saving number", "Filter tasks by team member"],
      hi: ["पूरे हुए फॉलो-अप को 'Done' चिह्नित करें", "नंबर सेव किए बिना व्हाट्सएप आइकन से चैट शुरू करें", "स्टाफ के अनुसार कार्य फ़िल्टर करें"],
      hinglish: ["Pending task complete hone par Done click karein", "Direct WhatsApp shortcut button check karein"]
    }
  },
  {
    id: "quotations",
    icon: Map,
    route: "/quotations",
    title: {
      en: "Itineraries & Quotes Creator",
      hi: "यात्रा योजनाएं और उद्धरण (Quotations & Itinerary)",
      hinglish: "Professional Itinerary & Quotation Creator"
    },
    diagram: "✏️ Fill Days Layout ➔ 💵 Add Price Quotes ➔ 🔗 Generate Shareable PDF/Web Link",
    description: {
      en: "Create stunning travel itineraries day-by-day. Enter sightseeing descriptions, transfer details, flight configurations, and share direct links with clients.",
      hi: "दिन-प्रतिदिन की सुंदर यात्रा योजनाएं बनाएं। दर्शनीय स्थलों का विवरण, वाहन सुविधा, उड़ानें जोड़ें और ग्राहकों के साथ सीधे लिंक साझा करें।",
      hinglish: "Clients ke liye professional Day-wise Itinerary design karein. Attractions, transfer detail, flight aur costs set karke directly shareable link share karein."
    },
    actionItems: {
      en: ["Export quotation links to clients", "Configure tax structures", "Track client approval status"],
      hi: ["ग्राहकों को कोटेशन लिंक भेजें", "कर (Tax/GST) संरचना कॉन्फ़िगर करें", "ग्राहक की स्वीकृति स्थिति को ट्रैक करें"],
      hinglish: ["Dynamic Web link copy karke WhatsApp par share karein", "Valid until date filter set karein"]
    }
  },
  {
    id: "hotels",
    icon: Building2,
    route: "/hotels",
    title: {
      en: "Hotels & Tariff Inventory",
      hi: "होटल सूची और मूल्य (Hotels)",
      hinglish: "Hotels & Room Tariffs Database"
    },
    diagram: "🏢 Add Property ➔ 🛏️ Input Room Types ➔ 💰 Save B2B Cost & Selling Rates",
    description: {
      en: "Maintain a directory of partner hotels. Save address lists, multiple contact persons (e.g. Sales, Reservation desk), room categories, and seasonal tariffs.",
      hi: "साझेदार होटलों की सूची व्यवस्थित करें। होटल का पता, एक से अधिक संपर्क व्यक्ति (सेल्स, बुकिंग), कमरों की श्रेणियां और मौसम अनुसार कीमतें सेव करें।",
      hinglish: "Apne partners aur vendor hotels ki complete profile save karein. Har hotel ke different room tariffs (Cost vs Selling price) aur multiple staff details manage karein."
    },
    actionItems: {
      en: ["Link multiple contact details for properties", "Input custom room categories", "Update pricing matrix"],
      hi: ["होटल के लिए एक से अधिक संपर्क नंबर जोड़ें", "विशिष्ट कमरों के प्रकार दर्ज करें", "मूल्य मैट्रिक्स को अपडेट करें"],
      hinglish: ["Sales manager aur reservation desk details separate set karein", "Deluxe, Suite aur Villa prices setup karein"]
    }
  },
  {
    id: "bookings",
    icon: CalendarCheck,
    route: "/bookings",
    title: {
      en: "Bookings Management & Hotel Vouchers",
      hi: "बुकिंग और होटल वाउचर (Bookings)",
      hinglish: "Bookings aur Hotel Confirmation Vouchers"
    },
    diagram: "🔗 Select Itinerary ➔ 🏨 Link Hotel & Room Category ➔ ⏳ Confirm Booking Status & Voucher No",
    description: {
      en: "Manage confirmed tours. Link bookings directly to an Itinerary to auto-fill details. Select hotels, room types, track voucher reservation status (Pending/Confirmed), and voucher IDs.",
      hi: "सक्रिय यात्राओं को ट्रैक करें। विवरण भरने के लिए सीधे कोटेशन लिंक करें। होटल, कमरे के प्रकार, वाउचर बुकिंग स्थिति (पुष्टि/लंबित) और वाउचर आईडी दर्ज करें।",
      hinglish: "Confirm packages aur bookings save karein. Itinerary link karke customer and price auto-fill karein. Hotel aur room select karke Room Confirmation status aur Voucher ID track karein."
    },
    actionItems: {
      en: ["Pre-fill form via Itinerary selection link", "Log hotel confirmation status updates", "Verify final travel checklist values"],
      hi: ["कोटेशन चुनकर फ़ॉर्म को स्वचालित रूप से भरें", "होटल की वाउचर स्थिति (Confirmed/Pending) बदलें", "अंतिम यात्रा चेकलिस्ट को सत्यापित करें"],
      hinglish: ["Itinerary dropdown select karke form auto-fill karein", "Hotel reservation update hote hi status Confirmed set karein"]
    }
  },
  {
    id: "invoices",
    icon: FileText,
    route: "/invoices",
    title: {
      en: "Billing Invoices & Receipts",
      hi: "बिल और रसीदें (Invoices)",
      hinglish: "Invoices aur Receipts Generation"
    },
    diagram: "📝 Select Booking ➔ 🧾 Auto-calculate GST/TCS ➔ 🖨️ Print Professional Invoices",
    description: {
      en: "Generate dynamic invoices scoped to bookings. Supports automated GST, TCS, custom invoice prefix values, footer messages, and payment receipt logs.",
      hi: "बुकिंग के अनुसार बिल (इनवॉइस) बनाएं। स्वचालित जीएसटी, टीसीएस, इनवॉइस उपसर्ग, फूटर संदेश और भुगतान रसीद इतिहास का प्रबंधन करें।",
      hinglish: "Confirm bookings ke invoice generate karein. GST, TCS, custom footer and notes (Terms and conditions) dynamically calculate karke print-friendly format print karein."
    },
    actionItems: {
      en: ["Print invoice as PDF", "Log multiple partial payment receipts", "Configure dynamic tax rates"],
      hi: ["पीडीएफ के रूप में बिल प्रिंट करें", "आंशिक भुगतान रसीद इतिहास दर्ज करें", "विशिष्ट कर दरें कॉन्फ़िगर करें"],
      hinglish: ["Bill print karke direct clients ko send karein", "Log dynamic receipt payments"]
    }
  },
  {
    id: "settings",
    icon: Settings,
    route: "/settings",
    title: {
      en: "Settings & Self-Service API Connections",
      hi: "सेटिंग्स और एपीआई कनेक्शन (Settings)",
      hinglish: "Settings aur Self-Service WhatsApp/Instagram APIs"
    },
    diagram: "⚙️ General Config ➔ 💬 WhatsApp custom integration ➔ 📧 Google/Gmail Auth",
    description: {
      en: "Configure profile parameters and custom communication routes. Connect your own Meta WhatsApp Cloud API credentials to automate messages from your business number. If left blank, EzzySync's global official number will automatically send updates for you.",
      hi: "कंपनी प्रोफाइल और संचार सेटिंग्स बदलें। अपने खुद के व्हाट्सएप क्रेडेंशियल्स जोड़ें। यदि खाली छोड़ दिया जाता है, तो एजीसिंक (EzzySync) का आधिकारिक नंबर स्वचालित रूप से अलर्ट संदेश भेजेगा।",
      hinglish: "Apni company profile configure karein. WhatsApp and Instagram dynamic connection tab se custom Meta APIs link karein. Agar detail blank hogi, to EzzySync default system number se automatic message alerts send karega."
    },
    actionItems: {
      en: ["Save customized WhatsApp Phone Number ID & Tokens", "Connect Gmail account for mailing", "Customize invoice prefixes and footer text"],
      hi: ["व्हाट्सएप फ़ोन नंबर आईडी और टोकन सहेजें", "ईमेल भेजने के लिए जीमेल कनेक्ट करें", "इनवॉइस उपसर्ग और फूटर संदेश बदलें"],
      hinglish: ["Apna custom WhatsApp API credentials add karein", "Email notification activate karne ke liye Gmail connect karein"]
    }
  }
];

export default function HelpGuide() {
  const [lang, setLang] = useState('hinglish'); // 'en', 'hi', 'hinglish'
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const filteredGuides = GUIDE_SECTIONS.filter(section => 
    section.title[lang].toLowerCase().includes(search.toLowerCase()) ||
    section.description[lang].toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Banner section */}
      <div className="bg-gradient-to-br from-brand-600 via-brand-700 to-indigo-800 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-lg border border-brand-500/20">
        <div className="relative z-10 space-y-4 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/10 backdrop-blur-md text-[11px] font-bold uppercase tracking-wider text-brand-200">
            <Compass size={13} className="animate-spin-slow" /> Setup Assistant
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">EzzySync CRM Learning Portal 📖</h2>
          <p className="text-xs sm:text-sm text-brand-100 leading-relaxed">
            Welcome to the guide! Change languages below to understand the complete CRM process in English, Hinglish, or pure Hindi.
          </p>
        </div>
        <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-12 translate-y-12">
          <HelpCircle size={300} />
        </div>
      </div>

      {/* Language Selector and Search Bar */}
      <div className="card flex flex-col sm:flex-row gap-4 justify-between items-center p-4">
        {/* Toggle Switch */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full sm:w-auto shadow-inner border border-slate-200/50">
          <button 
            onClick={() => setLang('en')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition duration-200 ${lang === 'en' ? 'bg-white text-brand-600 shadow-sm border border-slate-200/30' : 'text-slate-500 hover:text-slate-700'}`}
          >
            🇺🇸 English
          </button>
          <button 
            onClick={() => setLang('hinglish')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition duration-200 ${lang === 'hinglish' ? 'bg-white text-brand-600 shadow-sm border border-slate-200/30' : 'text-slate-500 hover:text-slate-700'}`}
          >
            🇮🇳 Hinglish
          </button>
          <button 
            onClick={() => setLang('hi')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition duration-200 ${lang === 'hi' ? 'bg-white text-brand-600 shadow-sm border border-slate-200/30' : 'text-slate-500 hover:text-slate-700'}`}
          >
            🇮🇳 हिंदी
          </button>
        </div>

        {/* Search */}
        <div className="w-full sm:max-w-xs relative">
          <input 
            type="text"
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-2xl pl-9 pr-4 py-2.5 outline-none focus:border-brand-500 focus:bg-white transition"
            placeholder={lang === 'en' ? 'Search help topics…' : lang === 'hi' ? 'गाइड खोजें…' : 'Topic search karein…'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Search size={14} className="absolute left-3.5 top-3.5 text-slate-400" />
        </div>
      </div>

      {/* Main Process Workflow Map (ASCII Interactive Flow) */}
      <div className="card p-6 bg-slate-50 border border-slate-200/60 rounded-2xl space-y-4">
        <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
          <Sparkles size={14} className="text-brand-500 animate-pulse" /> Complete CRM Pipeline Map (Workflow Lifecycle)
        </h4>

        {/* Step Workflow Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 text-center text-xs">
          {[
            { step: "1. Leads", icon: Contact2, label: "Capture Client" },
            { step: "2. Pipeline", icon: Kanban, label: "Manage Deal" },
            { step: "3. Tasks", icon: ListTodo, label: "Follow-up Reminders" },
            { step: "4. Quotations", icon: Map, label: "Create Itinerary" },
            { step: "5. Hotels", icon: Building2, label: "Room Inventory" },
            { step: "6. Bookings", icon: CalendarCheck, label: "Hotel Voucher" },
            { step: "7. Invoices", icon: FileText, label: "Track Bill/Payments" }
          ].map((item, idx) => {
            const IconComp = item.icon;
            return (
              <div key={idx} className="bg-white border border-slate-200/70 p-3 rounded-2xl flex flex-col items-center gap-2 shadow-sm">
                <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center border border-brand-100">
                  <IconComp size={15} />
                </div>
                <div>
                  <p className="font-extrabold text-slate-800 text-[10px] uppercase tracking-wide">{item.step}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-normal">{item.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dynamic Guides List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredGuides.map((section) => {
          const Icon = section.icon;
          return (
            <div key={section.id} className="card flex flex-col justify-between hover:shadow-md transition duration-200 border border-slate-100 hover:border-slate-200/60 p-6 space-y-4">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-brand-50 border border-brand-100/60 flex items-center justify-center text-brand-600">
                    <Icon size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-[15px]">{section.title[lang]}</h3>
                    <span className="text-[9px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full font-bold uppercase tracking-wider">Module Guide</span>
                  </div>
                </div>

                {/* Flow Diagram Box */}
                <div className="text-[10px] font-mono bg-slate-50 text-slate-600 border border-slate-100 rounded-xl p-2.5 break-words leading-relaxed flex items-center gap-1">
                  <span>➡️</span> <strong>Flow:</strong> {section.diagram}
                </div>

                {/* Explanation Content */}
                <p className="text-xs text-slate-500 leading-relaxed">
                  {section.description[lang]}
                </p>

                {/* Action steps */}
                <div className="space-y-2 pt-2">
                  <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                    {lang === 'en' ? 'Core Features Checklist' : lang === 'hi' ? 'मुख्य विशेषताएं चेकलिस्ट' : 'Module ke main features'}
                  </h4>
                  <ul className="space-y-1.5">
                    {section.actionItems[lang].map((item, idx) => (
                      <li key={idx} className="text-xs text-slate-600 flex items-start gap-1.5 leading-relaxed">
                        <CheckCircle2 size={12} className="text-emerald-500 mt-0.5 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Redirect Action Button */}
              <div className="pt-4 border-t border-slate-50 flex justify-end">
                <button 
                  onClick={() => navigate(section.route)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 hover:text-brand-700 transition group"
                >
                  {lang === 'en' ? 'Open Dashboard Page' : lang === 'hi' ? 'पेज पर जाएँ' : 'Go to Page'} 
                  <ChevronRight size={14} className="transform group-hover:translate-x-0.5 transition duration-150" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
