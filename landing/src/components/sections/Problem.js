import React from "react";
import Image from "next/image";
import ScrollReveal from "../ScrollReveal";

const pains = [
  {
    img: "/images/problem-leads.jpg",
    imgAlt: "Travel agent overwhelmed by multiple WhatsApp chats flying off phones",
    title: "Leads get lost in WhatsApp chats",
    body: "Inquiries are spread across 4 staff phones. Nobody knows who replied, follow-ups slip, and the traveler books with someone faster.",
  },
  {
    img: "/images/problem-quote.jpg",
    imgAlt: "Person at laptop surrounded by stacks of papers and a large clock on the wall",
    title: "Every quote takes 1–2 hours",
    body: "Copy-pasting hotel rates and day plans into Word or Canva for every small change the client asks for.",
  },
  {
    img: "/images/problem-payment.jpg",
    imgAlt: "Pile of payment receipts and a phone with a question mark above — payment confusion",
    title: "No clear record of payments",
    body: "Scrolling chats for UPI screenshots, with no way to see who paid the advance and whose balance is still due.",
  },
];

export default function Problem() {
  return (
    <section id="problem" className="py-16 sm:py-24 bg-slate-50 border-b border-slate-200">
      <div className="max-w-[1140px] mx-auto px-5 sm:px-6 space-y-10 sm:space-y-14">
        <ScrollReveal className="text-center max-w-3xl mx-auto space-y-3">
          <h2 className="font-bold text-3xl sm:text-4xl tracking-tight text-slate-950">
            Running your agency on WhatsApp &amp; Excel?
          </h2>
          <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
            It works for 10 inquiries a month. At 100, things start falling through the cracks.
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
          {pains.map(({ img, imgAlt, title, body }, i) => (
            <ScrollReveal key={title} delay={i * 80}>
              <div className="h-full bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col card-hover">
                <div className="relative w-full h-44 shrink-0">
                  <Image
                    src={img}
                    alt={imgAlt}
                    fill
                    sizes="(max-width: 768px) 100vw, 380px"
                    className="object-cover"
                  />
                </div>
                <div className="p-6 sm:p-7 flex flex-col flex-1">
                  <h3 className="font-bold text-lg text-slate-900 tracking-tight">{title}</h3>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed">{body}</p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
