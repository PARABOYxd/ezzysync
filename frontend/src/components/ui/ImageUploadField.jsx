import React, { useState } from 'react';
import { useToast } from '../../hooks/useToast.jsx';

const SIZE_CLASSES = {
  sm: 'w-16 h-16',
  md: 'w-20 h-20',
  banner: 'w-24 h-16',
};

// Full literal class names, not built with a template string - Tailwind's
// JIT scanner extracts class tokens statically per file, and `object-${x}`
// would not match its regex even though these exact classes are already
// emitted elsewhere in the app (dynamic interpolation is still the wrong
// habit to leave in new code).
const FIT_CLASSES = {
  contain: 'object-contain',
  cover: 'object-cover',
};

/**
 * Pick-a-local-file-and-preview-it widget, shared by every place that
 * defers the actual upload to the parent form's save (logo, payment QR,
 * quotation banner) - each used to hand-roll this same preview/remove/pick
 * markup with its own copy of the 5MB size check.
 *
 * Deliberately uncontrolled for the preview: `value` is the already-saved
 * URL, and picking a file shows its local blob preview immediately without
 * the parent needing a separate previewUrl state. Give it a `key` prop tied
 * to whatever record it belongs to (e.g. `quotation?.id`) if the same field
 * can be reused across different records in one page, so switching records
 * remounts it instead of keeping the previous file's local preview.
 */
export default function ImageUploadField({
  label,
  hint,
  value,
  onFileSelected,
  uploading = false,
  size = 'sm',
  maxSizeMB = 5,
  required = false,
  buttonLabel = 'Upload Image',
  emptyLabel = 'No Image',
  imageFit = 'contain',
}) {
  const toast = useToast();
  const [localPreview, setLocalPreview] = useState('');
  const previewUrl = localPreview || value;
  const boxClass = SIZE_CLASSES[size] || SIZE_CLASSES.sm;

  const handleChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`File size too large. Maximum allowed size is ${maxSizeMB}MB.`);
      return;
    }

    setLocalPreview(URL.createObjectURL(file));
    onFileSelected(file);
  };

  const handleRemove = () => {
    setLocalPreview('');
    onFileSelected(null);
  };

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
          <span>{label}</span>
          {required && <span className="text-rose-500 font-bold">*</span>}
        </label>
      )}
      <div className="flex items-center gap-4 bg-slate-50/50 dark:bg-zinc-800/25 p-3 rounded-xl border border-slate-200 dark:border-zinc-800">
        {previewUrl ? (
          <div className={`relative group shrink-0 ${boxClass} rounded-lg overflow-hidden border border-slate-200 dark:border-zinc-700 bg-white`}>
            <img src={previewUrl} alt={label || 'Preview'} className={`w-full h-full ${FIT_CLASSES[imageFit] || FIT_CLASSES.contain}`} />
            <button
              type="button"
              onClick={handleRemove}
              className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-medium transition"
            >
              Remove
            </button>
          </div>
        ) : (
          <div className={`${boxClass} rounded-lg border-2 border-dashed border-slate-300 dark:border-zinc-700 flex items-center justify-center text-slate-400 text-xs shrink-0 bg-white dark:bg-zinc-900`}>
            {emptyLabel}
          </div>
        )}
        <div className="flex flex-col gap-2">
          <label className={`btn btn-xs ${uploading ? 'loading btn-disabled' : 'btn-outline btn-primary'} cursor-pointer text-[10px] w-fit px-2.5 py-1 rounded border border-brand-500 text-brand-600 hover:bg-brand-50 transition`}>
            {uploading ? 'Uploading...' : buttonLabel}
            <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={handleChange} />
          </label>
          {hint && <p className="text-[10px] text-slate-400">{hint}</p>}
        </div>
      </div>
    </div>
  );
}
