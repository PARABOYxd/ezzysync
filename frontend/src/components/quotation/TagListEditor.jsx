import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import Input from '../ui/Input.jsx';
import Button from '../ui/Button.jsx';

/** Add-a-line list editor used for both Inclusions and Exclusions. */
export default function TagListEditor({ label, icon: Icon, tone, items, onChange, placeholder }) {
  const [draft, setDraft] = useState('');

  const addItem = () => {
    const value = draft.trim();
    if (!value) return;
    onChange([...items, value]);
    setDraft('');
  };

  const removeItem = (index) => onChange(items.filter((_, i) => i !== index));

  return (
    <div className="space-y-2.5">
      <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
        <Icon size={15} className={tone} />
        <span>{label}</span>
      </h4>
      <div className="flex gap-2">
        <Input
          className="flex-1"
          placeholder={placeholder}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addItem();
            }
          }}
        />
        <Button type="button" onClick={addItem} className="text-xs gap-1 px-4 shrink-0">
          <Plus size={14} /> Add
        </Button>
      </div>
      {items.length > 0 && (
        <ul className="space-y-1.5">
          {items.map((item, index) => (
            <li key={index} className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs text-slate-700">
              <span>{item}</span>
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="text-slate-400 hover:text-rose-600 transition shrink-0"
                title="Remove"
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
