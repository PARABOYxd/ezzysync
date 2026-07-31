import React from 'react';
import { Menu } from 'lucide-react';

export default function Topbar({ title, onMenuClick, actions }) {
  return (
    <header className="sticky top-0 z-20 bg-[var(--bg-page)]/80 backdrop-blur border-b border-[var(--border)] h-16 flex items-center justify-between px-4 md:px-8">
      <div className="flex items-center gap-3">
        <button className="md:hidden text-slate-500 hover:text-slate-700" onClick={onMenuClick}>
          <Menu size={22} />
        </button>
        <h1 className="text-lg font-semibold text-[var(--text-main)]">{title}</h1>
      </div>
      <div className="flex items-center gap-3">{actions}</div>
    </header>
  );
}
