import React, { useId } from 'react';
import Label from './Label.jsx';
import Helper from './Helper.jsx';

export default function Input({
  label,
  icon: Icon,
  type = 'text',
  error,
  required = false,
  accentAsterisk = false,
  hint = '',
  className = 'w-full',
  inputClassName = '',
  ...props
}) {
  const generatedId = useId();
  const inputId = props.id || generatedId;
  return (
    <div className={className}>
      <Label htmlFor={inputId} required={required} accent={accentAsterisk}>{label}</Label>
      <div className="relative">
        {Icon && (
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Icon size={16} />
          </span>
        )}
        <input
          type={type}
          className={`input disabled:bg-slate-50 dark:disabled:bg-zinc-900 disabled:text-slate-400 dark:disabled:text-zinc-600 disabled:cursor-not-allowed
            ${Icon ? 'pl-10' : ''}
            ${error ? 'border-red-400 focus:ring-red-500/15 focus:border-red-400' : ''}
            ${inputClassName}`}
          {...props}
          id={inputId}
          aria-required={required || undefined}
        />
      </div>
      <Helper error={!!error}>{error || hint}</Helper>
    </div>
  );
}
