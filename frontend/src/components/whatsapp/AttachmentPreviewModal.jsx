import React, { useEffect } from 'react';
import { X, Send, Download, FileText, Loader2, ExternalLink, Paperclip, Plus } from 'lucide-react';

/**
 * Centred attachment viewer, used for both halves of the job:
 *
 *  - mode="compose": what the agent is about to send, with a caption box and
 *    a Send button. A wrong file reaching a customer cannot be recalled, so
 *    the file is shown properly before anything is sent.
 *  - mode="view": an attachment already in the thread, read-only.
 *
 * PDFs render inline in an iframe (browsers do this natively for both blob
 * and http URLs); anything else that cannot be displayed falls back to a card
 * with the file's details and a link to open it.
 */
export default function AttachmentPreviewModal({
  open,
  mode = 'compose',
  // view mode: a single already-sent attachment
  url,
  fileName,
  fileSize,
  mimeType,
  // compose mode: the staged files, previewed one at a time
  files = [],
  previewUrls = [],
  activeIndex = 0,
  onActiveIndexChange,
  onRemoveFile,
  onAddFiles,
  maxFiles = 8,
  caption = '',
  onCaptionChange,
  onSend,
  onClose,
  sending = false,
}) {
  // Escape closes, and the page behind must not scroll with the overlay open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape' && !sending) onClose?.();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, sending, onClose]);

  if (!open) return null;

  // One code path renders both modes: compose looks at the file currently
  // selected in the strip, view at the single attachment it was handed.
  const isCompose = mode === 'compose';
  const active = isCompose ? files[activeIndex] : null;
  const shownUrl = isCompose ? previewUrls[activeIndex] : url;
  const shownName = isCompose ? active?.name : fileName;
  const shownSize = isCompose ? active?.size : fileSize;
  const shownMime = isCompose ? active?.type : mimeType;

  const type = String(shownMime || '');
  const isImage = type.startsWith('image/');
  const isPdf = type.includes('pdf') || String(shownName || '').toLowerCase().endsWith('.pdf');
  const isVideo = type.startsWith('video/');
  const isAudio = type.startsWith('audio/');

  const formatSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const kindLabel = isImage ? 'Photo' : isPdf ? 'PDF' : isVideo ? 'Video' : isAudio ? 'Audio' : 'Document';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm"
      onClick={() => !sending && onClose?.()}
    >
      <div
        className="relative w-full max-w-2xl max-h-[88vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
              <Paperclip className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                {shownName || 'Attachment'}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {[kindLabel, formatSize(shownSize), isCompose && files.length > 1 ? `${activeIndex + 1} of ${files.length}` : ''].filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {shownUrl && (
              <a
                href={shownUrl}
                target="_blank"
                rel="noreferrer"
                title="Open in a new tab"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
            {mode === 'view' && shownUrl && (
              <a
                href={shownUrl}
                download={shownName}
                title="Download"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Download className="w-4 h-4" />
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              disabled={sending}
              title="Close"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-auto p-4 bg-slate-50 dark:bg-slate-950/40 flex items-center justify-center">
          {isImage && shownUrl ? (
            <img
              src={shownUrl}
              alt={shownName || 'Attachment'}
              className="max-h-[52vh] max-w-full object-contain rounded-xl border border-slate-200 dark:border-slate-800 bg-white"
            />
          ) : isPdf && shownUrl ? (
            <iframe
              src={shownUrl}
              title={shownName || 'PDF preview'}
              className="w-full h-[52vh] rounded-xl bg-white border border-slate-200 dark:border-slate-800"
            />
          ) : isVideo && shownUrl ? (
            <video src={shownUrl} controls className="max-h-[52vh] max-w-full rounded-xl bg-black" />
          ) : isAudio && shownUrl ? (
            <audio src={shownUrl} controls className="w-full max-w-md" />
          ) : (
            <div className="text-center px-6 py-10">
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center">
                <FileText className="w-7 h-7 text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 break-words">
                {shownName || 'Attachment'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{formatSize(shownSize)}</p>
              <p className="text-[11px] text-slate-400 mt-3 max-w-xs mx-auto">
                This file type can’t be shown here. It will still send normally.
              </p>
              {shownUrl && (
                <a
                  href={shownUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block mt-4 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors"
                >
                  Open file
                </a>
              )}
            </div>
          )}
        </div>

        {/* Thumbnail strip - only worth showing once there is a choice to make */}
        {isCompose && files.length > 1 && (
          <div className="shrink-0 px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2 overflow-x-auto">
            {files.map((f, i) => (
              <div key={i} className="relative shrink-0 group">
                <button
                  type="button"
                  onClick={() => onActiveIndexChange?.(i)}
                  title={f.name}
                  className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-colors flex items-center justify-center bg-slate-50 dark:bg-slate-800 ${
                    i === activeIndex
                      ? 'border-emerald-500'
                      : 'border-transparent hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  {f.type?.startsWith('image/') && previewUrls[i] ? (
                    <img src={previewUrls[i]} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <FileText className="w-5 h-5 text-slate-400" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => onRemoveFile?.(i)}
                  title="Remove this file"
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-700 hover:bg-rose-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}

            {files.length < maxFiles && (
              <button
                type="button"
                onClick={onAddFiles}
                title="Add more files"
                className="shrink-0 w-12 h-12 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 text-slate-400 hover:text-emerald-600 hover:border-emerald-400 flex items-center justify-center transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
            )}

            <span className="ml-auto shrink-0 text-[11px] text-slate-400 pl-2">
              {files.length}/{maxFiles}
            </span>
          </div>
        )}

        {/* Compose footer */}
        {mode === 'compose' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!sending) onSend?.();
            }}
            className="shrink-0 px-4 py-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2"
          >
            {files.length === 1 && files.length < maxFiles && (
              <button
                type="button"
                onClick={onAddFiles}
                title="Add more files"
                className="shrink-0 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-emerald-600 hover:border-emerald-400 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}

            <input
              type="text"
              autoFocus
              value={caption}
              onChange={(e) => onCaptionChange?.(e.target.value)}
              placeholder="Add a caption (optional)…"
              className="flex-1 px-4 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="submit"
              disabled={sending}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all"
            >
              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>{sending ? 'Sending…' : files.length > 1 ? `Send ${files.length}` : 'Send'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
