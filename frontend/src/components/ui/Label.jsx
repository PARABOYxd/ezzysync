import React from 'react';

export default function Label({ children, required, accent, htmlFor, className = '' }) {
  if (!children) return null;
  return (
    <label htmlFor={htmlFor} className={`label select-none ${className}`}>
      {children} {required && <span className={accent ? 'text-[var(--primary)]' : 'text-red-600'}>*</span>}
    </label>
  );
}
