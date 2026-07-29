import React from 'react';
import { Menu } from 'lucide-react';

export default function Topbar({ title, onMenuClick, actions }) {
  return (
    <header className="sticky top-0 z-20 bg-slate-50/80 backdrop-blur border-b border-slate-100 h-16 flex items-center justify-between px-4 md:px-8">
      <div className="flex items-center gap-3">
        <button className="md:hidden text-slate-500" onClick={onMenuClick}>
          <Menu size={22} />
        </button>
        <h1 className="text-lg font-semibold text-slate-800">{title}</h1>
      </div>
      <div className="flex items-center gap-3">{actions}</div>
    </header>
  );
}
