import React from 'react';

export default function Label({ children, required, htmlFor, className = '' }) {
  if (!children) return null;
  return (
    <label htmlFor={htmlFor} className={`label select-none ${className}`}>
      {children} {required && <span className="text-red-600">*</span>}
    </label>
  );
}
