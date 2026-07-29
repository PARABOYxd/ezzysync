import React from 'react';

export default function Helper({ children, error }) {
  if (!children) return null;
  return (
    <p className={error ? 'helper-text-error' : 'helper-text'}>
      {children}
    </p>
  );
}
