import React, { useState } from 'react';
import { Plus, X, Navigation, IndianRupee } from 'lucide-react';
import Input from '../ui/Input.jsx';
import Button from '../ui/Button.jsx';

/** Optional per-pickup-point pricing - each entry is its own absolute total price. */
export default function PickupOptionsEditor({ items, onChange }) {
  const [location, setLocation] = useState('');
  const [price, setPrice] = useState('');

  const addItem = () => {
    const loc = location.trim();
    if (!loc || price === '') return;
    onChange([...items, { location: loc, price: Number(price) }]);
    setLocation('');
    setPrice('');
  };

  const removeItem = (index) => onChange(items.filter((_, i) => i !== index));

  return (
    <div className="space-y-2.5">
      <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
        <Navigation size={15} className="text-blue-500" />
        <span>Pickup Options (Optional)</span>
      </h4>
      <p className="text-[10px] text-slate-400">Each pickup point gets its own total package price, shown on the client preview.</p>
      <div className="flex gap-2">
        <Input
          className="flex-1"
          placeholder="Pickup location, e.g. Delhi"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
        <Input
          className="w-32 shrink-0"
          type="number"
          min={0}
          icon={IndianRupee}
          placeholder="Price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
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
              <span className="flex items-center gap-1.5"><Navigation size={12} className="text-blue-400" /> {item.location}</span>
              <span className="flex items-center gap-3">
                <span className="font-semibold text-slate-600">₹{item.price}</span>
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="text-slate-400 hover:text-rose-600 transition shrink-0"
                  title="Remove"
                >
                  <X size={14} />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
