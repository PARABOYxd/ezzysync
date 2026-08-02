import React from 'react';
import { Menu, Search, Bell, HelpCircle } from 'lucide-react';
import ThemeToggle from './ThemeToggle.jsx';
import GlobalSearchModal from './GlobalSearchModal.jsx';

export default function Topbar({ title, onMenuClick, actions }) {
  const [searchOpen, setSearchOpen] = React.useState(false);

  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header className="sticky top-0 z-20 bg-white dark:bg-zinc-950 border-b border-[var(--border)] h-[56px] flex items-center justify-between px-4 md:px-8 select-none">
      {/* Left section: breadcrumbs / menu button */}
      <div className="flex items-center gap-3">
        <button className="md:hidden text-slate-500 hover:text-slate-700" onClick={onMenuClick}>
          <Menu size={18} />
        </button>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 dark:text-zinc-500">
          <span>EzzySync</span>
          <span>/</span>
          <span className="text-sm font-bold text-slate-800 dark:text-zinc-200">{title}</span>
        </div>
      </div>

      {/* Center section: dense 320px search input */}
      <div 
        onClick={() => setSearchOpen(true)}
        className="hidden sm:flex items-center relative w-[320px] cursor-pointer"
      >
        <Search size={14} className="absolute left-3 text-slate-400 dark:text-zinc-500" />
        <input 
          type="text" 
          readOnly
          placeholder="Search leads, bookings..." 
          className="w-full h-8 pl-9 pr-12 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-xs text-slate-800 dark:text-zinc-200 outline-none focus:border-[#F97316] cursor-pointer"
        />
        <kbd className="absolute right-3 px-1.5 py-0.5 text-[9px] font-mono text-slate-400 dark:text-zinc-500 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded shadow-sm">
          ⌘K
        </kbd>
      </div>

      {/* Right section: actions bar */}
      <div className="flex items-center gap-3">
        {actions}
      </div>

      {/* Global Search Popover modal overlay */}
      <GlobalSearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
}
