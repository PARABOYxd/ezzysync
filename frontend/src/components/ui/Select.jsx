import React, { useId } from 'react';
import { ChevronDown } from 'lucide-react';
import Label from './Label.jsx';
import Helper from './Helper.jsx';
import Combobox from './Combobox.jsx';

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
  value,
  onChange,
  placeholder = 'Select…',
  disabled = false,
  name,
  searchable,
  pageSize = 10,
  forceNative = false,
  allowClear = false,
  ...props
}) {
  const generatedId = useId();
  const inputId = props.id || generatedId;

  // When more than 10 options or explicitly searchable, automatically upgrade to Combobox
  const shouldUpgrade = !forceNative && (options.length > 10 || searchable);

  if (shouldUpgrade) {
    return (
      <Combobox
        label={label}
        icon={Icon}
        options={options}
        value={value}
        onChange={(val, fakeEvent) => {
          if (onChange) {
            const evt = fakeEvent || {
              target: { name: name || props.name || '', value: val },
              currentTarget: { name: name || props.name || '', value: val },
              preventDefault: () => {},
              stopPropagation: () => {},
            };
            onChange(evt, val);
          }
        }}
        placeholder={placeholder}
        error={error}
        required={required}
        accentAsterisk={accentAsterisk}
        hint={hint}
        disabled={disabled}
        className={className}
        inputClassName={inputClassName}
        name={name || props.name}
        pageSize={pageSize}
        searchable={searchable ?? options.length > 10}
        allowClear={allowClear}
      />
    );
  }

  return (
    <div className={className}>
      <Label htmlFor={inputId} required={required} accent={accentAsterisk}>{label}</Label>
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
          value={value}
          onChange={onChange}
          disabled={disabled}
          name={name}
          {...props}
          id={inputId}
          aria-required={required || undefined}
        >
          {options.map((opt, idx) => {
            const isObj = typeof opt === 'object' && opt !== null;
            const val = isObj ? opt.value : opt;
            const lbl = isObj ? opt.label : opt;
            return (
              <option key={val !== undefined ? `${val}-${idx}` : idx} value={val}>{lbl}</option>
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
