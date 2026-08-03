import React from 'react';

export function Table({ children, className = '', wrapperClassName = '' }) {
  return (
    <div className={`overflow-x-auto ${wrapperClassName}`}>
      <table className={`w-full text-sm text-left ${className}`}>
        {children}
      </table>
    </div>
  );
}

export function Thead({ children, className = '' }) {
  return (
    <thead>
      <tr className={`border-b border-slate-100 dark:border-zinc-800 bg-slate-50/60 dark:bg-zinc-900/50 text-xs text-slate-400 dark:text-zinc-500 uppercase tracking-wider ${className}`}>
        {children}
      </tr>
    </thead>
  );
}

export function Tbody({ children, className = '' }) {
  return <tbody className={`divide-y divide-slate-50 dark:divide-zinc-800/50 ${className}`}>{children}</tbody>;
}

export function Tr({ children, className = '', ...props }) {
  return (
    <tr className={`hover:bg-slate-50/60 dark:hover:bg-zinc-800/50 transition-colors ${className}`} {...props}>
      {children}
    </tr>
  );
}

export function Th({ children, className = '', ...props }) {
  return (
    <th className={`px-4 py-3 font-medium ${className}`} {...props}>
      {children}
    </th>
  );
}

export function Td({ children, className = '', ...props }) {
  return (
    <td className={`px-4 py-3 ${className}`} {...props}>
      {children}
    </td>
  );
}
