"use client";
import React from "react";
import { featuresList } from "../../data/landingData";

export default function Features() {
  return (
    <section id="features" className="py-16 sm:py-24 bg-white relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 sm:space-y-16">
        
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-600 block">Feature Rich</span>
          <h2 className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-slate-900">
            Everything Your Travel Agency Needs
          </h2>
          <p className="text-slate-600 text-sm sm:text-base max-w-xl mx-auto">
            Designed dynamically to automate operations, reduce human error, and keep clients engaged.
          </p>
        </div>

        {/* 2-Column Grid on Mobile, 3-Column on Desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-8">
          {featuresList.map((f, idx) => {
            const Icon = f.icon;
            return (
              <div
                key={idx}
                className="p-3 sm:p-6 rounded-2xl bg-slate-50 border border-slate-200/60 hover:border-brand-500 hover:bg-white hover:shadow-card hover:-translate-y-1 transform group transition-all duration-200 ease-in-out flex flex-col items-start space-y-2 sm:space-y-4"
              >
                <div className={`w-8.5 h-8.5 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl ${f.iconBg} flex items-center justify-center ${f.iconColor} group-hover:scale-110 transition-transform flex-shrink-0`}>
                  <Icon className="w-4.5 h-4.5 sm:w-6 sm:h-6" aria-hidden="true" focusable="false" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-display text-xs sm:text-lg font-bold text-slate-800 leading-tight">
                    {f.title}
                  </h3>
                  <p className="text-slate-500 text-[10px] sm:text-sm leading-normal sm:leading-relaxed">
                    {f.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
