import React from "react";
import { FileText, ImageIcon } from "lucide-react";
import SectionHeading from "../common/SectionHeading";

/* Small, drawn-in-code scenes of what the mess actually looks like today.
   They replace stock illustrations: specific beats generic. */

function ChatPile() {
  const chats = [
    ["+91 98201 •••••", "Bhai Goa ka package bhejo", "11:02", 3],
    ["Neha (Bali)", "Any update on the hotels?", "10:47", 2],
    ["+91 99300 •••••", "Rate for 4 pax Manali?", "Yest.", 1],
    ["Kapoor family", "Did you get the payment?", "Yest.", 4],
  ];
  return (
    <ul className="divide-y divide-paper-200 text-[13px]">
      {chats.map(([name, msg, time, unread]) => (
        <li key={name} className="flex items-center gap-3 py-2.5">
          <span className="w-8 h-8 rounded-full bg-paper-200 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="block font-medium text-ink-900 truncate">{name}</span>
            <span className="block text-slate-500 truncate">{msg}</span>
          </span>
          <span className="flex flex-col items-end gap-1 shrink-0">
            <span className="text-[11px] text-emerald-700">{time}</span>
            <span className="min-w-5 h-5 px-1.5 rounded-full bg-emerald-600 text-white text-[11px] font-semibold flex items-center justify-center">
              {unread}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function FileChaos() {
  const files = [
    ["Bali_Quote.docx", "Mon"],
    ["Bali_Quote_FINAL.docx", "Tue"],
    ["Bali_Quote_FINAL_v3 (1).docx", "Wed"],
    ["Bali_Quote_client_changes.pdf", "Today"],
  ];
  return (
    <ul className="text-[13px] font-mono">
      {files.map(([f, d], i) => (
        <li
          key={f}
          className={`flex items-center gap-2.5 py-2.5 ${i > 0 ? "border-t border-paper-200" : ""} ${
            i === files.length - 1 ? "text-ink-900" : "text-slate-500"
          }`}
        >
          <FileText className="w-4 h-4 shrink-0 text-slate-400" aria-hidden="true" />
          <span className="truncate flex-1">{f}</span>
          <span className="font-sans text-[11px] text-slate-400 shrink-0">{d}</span>
        </li>
      ))}
    </ul>
  );
}

function ScreenshotPile() {
  const shots = [
    ["IMG_4412.jpg", "₹25,000", "Kapoor?"],
    ["IMG_4419.jpg", "₹12,500", "?"],
    ["Screenshot_1023.png", "₹40,000", "Dubai trip?"],
  ];
  return (
    <ul className="text-[13px]">
      {shots.map(([file, amt, who], i) => (
        <li key={file} className={`flex items-center gap-3 py-2.5 ${i > 0 ? "border-t border-paper-200" : ""}`}>
          <span className="w-8 h-10 rounded bg-paper-100 border border-paper-300 flex items-center justify-center shrink-0">
            <ImageIcon className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-mono text-slate-500 truncate">{file}</span>
            <span className="block font-medium text-ink-900">UPI {amt}</span>
          </span>
          <span className="text-[12px] text-amber-700 bg-amber-50 border border-amber-200/70 rounded px-1.5 py-0.5 shrink-0">
            {who}
          </span>
        </li>
      ))}
    </ul>
  );
}

const pains = [
  {
    Scene: ChatPile,
    title: "Leads get lost in WhatsApp chats",
    body: "Inquiries are spread across 4 staff phones. Nobody knows who replied, follow-ups slip, and the traveller books with someone faster.",
  },
  {
    Scene: FileChaos,
    title: "Every quote takes 1–2 hours",
    body: "Copy-pasting hotel rates and day plans into Word or Canva for every small change the client asks for.",
  },
  {
    Scene: ScreenshotPile,
    title: "No clear record of payments",
    body: "Scrolling chats for UPI screenshots, with no way to see who paid the advance and whose balance is still due.",
  },
];

export default function Problem() {
  return (
    <section id="problem" className="section-y">
      <div className="wrap">
        <SectionHeading
          index="01"
          label="The problem"
          title="Running your agency on WhatsApp & Excel?"
          intro="It works for 10 inquiries a month. At 100, things start falling through the cracks."
        />

        <ol className="mt-[clamp(64px,8vw,128px)]">
          {pains.map(({ Scene, title, body }, i) => (
            <li key={title} className="grid-12 gap-y-8 py-10 sm:py-14 border-t border-line last:border-b items-start">
              <span className="col-span-12 lg:col-span-1 t-label text-ink-600 tabular-nums pt-2">0{i + 1}</span>
              <div className="col-span-12 md:col-span-6 lg:col-span-5">
                <h3 data-split className="t-h3 text-ink-900">{title}</h3>
                <p data-reveal="fade" className="mt-5 text-[17px] leading-relaxed text-ink-600 max-w-md">{body}</p>
              </div>
              <div
                data-reveal="fade"
                aria-hidden="true"
                className="col-span-12 md:col-span-6 lg:col-start-8 lg:col-span-5 rounded-2xl bg-white border border-line px-5 py-3"
              >
                <Scene />
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
