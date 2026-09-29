import React from 'react';

/** Shown for the moment a page's code is loading on first visit. */
export default function PageLoader({ fullScreen = false }) {
  return (
    <div
      aria-busy="true"
      aria-label="Loading page"
      className={`flex items-center justify-center ${fullScreen ? 'min-h-screen bg-[var(--bg-page)]' : 'py-24'}`}
    >
      <span className="h-7 w-7 rounded-full border-2 border-brand-200 border-t-brand-600 animate-spin" />
    </div>
  );
}
