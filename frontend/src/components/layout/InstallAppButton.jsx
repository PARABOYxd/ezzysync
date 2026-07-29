import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

export default function InstallAppButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const handleInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  if (!deferredPrompt || installed) return null;

  const handleInstall = async () => {
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  return (
    <button
      onClick={handleInstall}
      title="Install EzzySync as an app"
      className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100"
    >
      <Download size={14} /> Install App
    </button>
  );
}
