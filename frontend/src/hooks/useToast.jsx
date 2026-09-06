import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

let idCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message, type = 'success') => {
      const id = ++idCounter;
      setToasts((prev) => [...prev, { id, message, type }]);

      // Errors stay up longer than confirmations. A server error now carries a
      // reference id the person is asked to send on, and three and a half
      // seconds is not enough time to read a UUID, let alone copy it.
      setTimeout(() => remove(id), type === 'error' ? 10000 : 3500);
    },
    [remove]
  );

  const toast = {
    success: (msg) => push(msg, 'success'),
    error: (msg) => push(msg, 'error'),
    info: (msg) => push(msg, 'info'),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-80 max-w-[90vw]">
        {toasts.map((t) => (
          <div
            key={t.id}
            onClick={() => remove(t.id)}
            role="status"
            title="Click to dismiss"
            // whitespace-pre-line so the reference id lands on its own line;
            // break-words so a long id cannot push the toast off screen.
            className={`rounded-xl px-4 py-3 shadow-soft text-sm font-medium text-white animate-[fadeIn_.2s_ease] cursor-pointer whitespace-pre-line break-words ${
              t.type === 'success' ? 'bg-emerald-600' : t.type === 'error' ? 'bg-red-600' : 'bg-slate-800'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
