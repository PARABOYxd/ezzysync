import React from 'react';
import Label from './Label.jsx';
import Helper from './Helper.jsx';

export default function Input({
  label,
  icon: Icon,
  type = 'text',
  error,
  required = false,
  hint = '',
  className = 'w-full',
  inputClassName = '',
  ...props
}) {
  return (
    <div className={className}>
      <Label required={required}>{label}</Label>
      <div className="relative">
        {Icon && (
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Icon size={16} />
          </span>
        )}
        <input
          type={type}
          className={`input disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed
            ${Icon ? 'pl-10' : ''}
            ${error ? 'border-red-400 focus:ring-red-500/15 focus:border-red-400' : ''}
            ${inputClassName}`}
          {...props}
        />
      </div>
      <Helper error={!!error}>{error || hint}</Helper>
    </div>
  );
}
