"use client";
import React from "react";
import { featuresList } from "../../data/landingData";
import ScrollReveal from "../ScrollReveal";

export default function Features() {
  return (
    <section id="features" className="py-16 sm:py-32 bg-white relative z-10">
      <div className="max-w-[1100px] mx-auto px-5 sm:px-6 space-y-12 sm:space-y-16">

        {/* Section Heading */}
        <ScrollReveal className="text-center max-w-2xl mx-auto space-y-3">
          <h2 className="font-semibold text-3xl sm:text-4xl tracking-[-0.02em] text-slate-950">
            Everything your travel agency needs
          </h2>
          <p className="text-slate-500 text-base sm:text-lg leading-relaxed max-w-[50ch] mx-auto">
            Designed to automate operations, reduce human error, and keep clients engaged.
          </p>
        </ScrollReveal>

        {/* 2-Column Grid on Mobile, 3-Column on Desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
          {featuresList.map((f, idx) => {
            const Icon = f.icon;
            return (
              <ScrollReveal key={idx} delay={idx * 60}>
                <div className="h-full p-4 sm:p-6 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 hover:-translate-y-0.5 transition-all duration-200 ease-out flex flex-col items-start space-y-2 sm:space-y-3.5">
                  <div className={`w-8.5 h-8.5 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl ${f.iconBg} flex items-center justify-center ${f.iconColor} flex-shrink-0`}>
                    <Icon className="w-4.5 h-4.5 sm:w-5 sm:h-5" aria-hidden="true" focusable="false" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-semibold text-xs sm:text-base text-slate-900 tracking-tight leading-tight">
                      {f.title}
                    </h3>
                    <p className="text-slate-500 text-[10px] sm:text-sm leading-normal sm:leading-relaxed">
                      {f.description}
                    </p>
                  </div>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
