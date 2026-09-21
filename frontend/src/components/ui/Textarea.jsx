import React, { useId } from 'react';
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
  const generatedId = useId();
  const inputId = props.id || generatedId;
  return (
    <div className={className}>
      <Label htmlFor={inputId} required={required}>{label}</Label>
      <textarea
        rows={rows}
        className={`input resize-none disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed
          ${error ? 'border-red-400 focus:ring-red-500/15 focus:border-red-400' : ''}
          ${inputClassName}`}
        {...props}
        id={inputId}
        aria-required={required || undefined}
      />
      <Helper error={!!error}>{error || hint}</Helper>
    </div>
  );
}
