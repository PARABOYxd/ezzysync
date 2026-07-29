import React from 'react';

export default function FormRow({ children, className = '' }) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5 ${className}`}>
      {children}
    </div>
  );
}
