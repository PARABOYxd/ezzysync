import React from 'react';
import Label from './Label.jsx';
import Helper from './Helper.jsx';

export default function Textarea({
  label,
  error,
  required = false,
  hint = '',
  className = 'w-full',
  inputClassName = '',
  rows = 3,
  ...props
}) {
  return (
    <div className={className}>
      <Label required={required}>{label}</Label>
      <textarea
        rows={rows}
        className={`input resize-none disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed
          ${error ? 'border-red-400 focus:ring-red-500/15 focus:border-red-400' : ''}
          ${inputClassName}`}
        {...props}
      />
      <Helper error={!!error}>{error || hint}</Helper>
    </div>
  );
}
