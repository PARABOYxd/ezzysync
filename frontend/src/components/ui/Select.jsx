import React from 'react';
import { ChevronDown } from 'lucide-react';
import Label from './Label.jsx';
import Helper from './Helper.jsx';

export default function Select({
  label,
  icon: Icon,
  options = [], // strings or { value, label } objects
  error,
  required = false,
  accentAsterisk = false,
  hint = '',
  className = 'w-full',
  inputClassName = '',
  ...props
}) {
  return (
    <div className={className}>
      <Label required={required} accent={accentAsterisk}>{label}</Label>
      <div className="relative">
        {Icon && (
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Icon size={16} />
          </span>
        )}
        <select
          className={`input appearance-none pr-10 cursor-pointer disabled:bg-slate-50 dark:disabled:bg-zinc-900 disabled:text-slate-400 dark:disabled:text-zinc-600 disabled:cursor-not-allowed
            ${Icon ? 'pl-10' : ''}
            ${error ? 'border-red-400 focus:ring-red-500/15 focus:border-red-400' : ''}
            ${inputClassName}`}
          {...props}
        >
          {options.map((opt) => {
            const isObj = typeof opt === 'object' && opt !== null;
            const val = isObj ? opt.value : opt;
            const lbl = isObj ? opt.label : opt;
            return (
              <option key={val} value={val}>{lbl}</option>
            );
          })}
        </select>
        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
          <ChevronDown size={14} />
        </span>
      </div>
      <Helper error={!!error}>{error || hint}</Helper>
    </div>
  );
}
