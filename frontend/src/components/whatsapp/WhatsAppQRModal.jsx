import React, { useState, useEffect } from 'react';
import { QrCode, Smartphone, CheckCircle, RefreshCw, X, AlertCircle, ShieldCheck, Loader2 } from 'lucide-react';
import { whatsappWebService } from '../../services/whatsappWebService';

export default function WhatsAppQRModal({ isOpen, onClose, onConnected }) {
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState(null);
  const [status, setStatus] = useState('disconnected');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');

  const fetchStatusAndConnect = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await whatsappWebService.connect();
      setStatus(data.status);
      setQrCode(data.qrCode);
      setPhoneNumber(data.phoneNumber);
      if (data.status === 'connected') {
        if (onConnected) onConnected(data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start WhatsApp Web session.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    fetchStatusAndConnect();

    // 1.5s keeps the handshake feeling responsive - the pair -> 515 -> redial
    // sequence resolves in a couple of seconds, and a 3s poll made a finished
    // connection sit unnoticed for most of that time again.
    const interval = setInterval(async () => {
      try {
        const data = await whatsappWebService.getStatus();
        setStatus(data.status);
        // Drop the QR as soon as we leave the 'qrcode' phase. The backend
        // nulls qr_code_data once the scan lands, so holding on to the old
        // image would leave a dead QR on screen through the whole handshake.
        setQrCode(data.status === 'qrcode' ? data.qrCode : null);
        if (data.phoneNumber) setPhoneNumber(data.phoneNumber);

        if (data.status === 'connected') {
          clearInterval(interval);
          if (onConnected) onConnected(data);
        }
      } catch (e) {}
    }, 1500);

    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const STATUS_PILLS = {
    connected: { label: 'Connected', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' },
    connecting: { label: 'Connecting', className: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400' },
    qrcode: { label: 'Waiting for scan', className: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-400' },
    disconnected: { label: 'Not linked', className: 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
  };
  const statusPill = STATUS_PILLS[status] || STATUS_PILLS.disconnected;

  // The stretch between a successful scan and a live socket covers a full
  // WhatsApp handshake (pair -> 515 restartRequired -> redial), which takes a
  // few seconds. Without its own screen the modal just sat on a stale QR and
  // looked frozen, so people rescanned and broke the pairing mid-flight.
  const isConnecting = status === 'connecting';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-900 dark:text-white">Connect WhatsApp Web</h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${statusPill.className}`}>
                  {statusPill.label}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Link your business phone for 24x7 AI & Unlimited CRM chat</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 flex items-center gap-2.5 text-rose-600 dark:text-rose-400 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {status === 'connected' ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center animate-bounce">
                <CheckCircle className="w-10 h-10" />
              </div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white">WhatsApp Connected!</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Connected with number: <strong className="text-emerald-600 dark:text-emerald-400">+{phoneNumber}</strong>
              </p>
              <div className="mt-6 flex justify-center">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition-all shadow-lg shadow-emerald-500/20"
                >
                  Start Chatting & Automations
                </button>
              </div>
            </div>
          ) : isConnecting ? (
            <div className="text-center py-10">
              <div className="relative w-20 h-20 mx-auto mb-5">
                <div className="absolute inset-0 rounded-full border-4 border-emerald-500/15" />
                <Loader2 className="absolute inset-0 m-auto w-20 h-20 text-emerald-500 animate-spin" strokeWidth={1.5} />
                <Smartphone className="absolute inset-0 m-auto w-7 h-7 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white">Linking your WhatsApp…</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1.5 max-w-xs mx-auto">
                Scan successful. Setting up the secure connection with WhatsApp — this usually takes a few seconds.
              </p>
              <div className="mt-5 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-800/50 text-[11px] text-amber-700 dark:text-amber-400">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Please keep this window open and don’t scan again.</span>
              </div>
            </div>
          ) : (
            <div>
              {/* QR Code display */}
              <div className="flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                {qrCode ? (
                  <div className="relative group p-3 bg-white rounded-2xl shadow-md">
                    <img src={qrCode} alt="WhatsApp QR Code" className="w-56 h-56 rounded-lg object-contain" />
                    <div className="absolute inset-0 rounded-2xl border-2 border-emerald-500/30 pointer-events-none" />
                  </div>
                ) : (
                  <div className="w-56 h-56 flex flex-col items-center justify-center gap-3 text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                    <span className="text-xs font-medium">Generating QR code…</span>
                    <span className="text-[11px] text-slate-400/80">Starting a secure WhatsApp session</span>
                  </div>
                )}

                <button
                  onClick={fetchStatusAndConnect}
                  disabled={loading}
                  className="mt-4 flex items-center gap-1.5 text-xs text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>Click to reload QR code</span>
                </button>
              </div>

              {/* Instructions */}
              <div className="mt-6 space-y-2.5">
                <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">How to connect:</h5>
                <ol className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                  <li className="flex items-start gap-2">
                    <span className="flex items-center justify-center w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 font-bold text-[10px] shrink-0 mt-0.5">1</span>
                    <span>Open <strong>WhatsApp</strong> on your phone.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex items-center justify-center w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 font-bold text-[10px] shrink-0 mt-0.5">2</span>
                    <span>Tap <strong>Menu (⋮)</strong> on Android or <strong>Settings (⚙️)</strong> on iPhone.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex items-center justify-center w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 font-bold text-[10px] shrink-0 mt-0.5">3</span>
                    <span>Tap <strong>Linked Devices</strong> and then tap <strong>Link a Device</strong>.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex items-center justify-center w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 font-bold text-[10px] shrink-0 mt-0.5">4</span>
                    <span>Point your phone camera to this QR code to scan and connect.</span>
                  </li>
                </ol>
              </div>

              {/* Anti-ban note */}
              <div className="mt-5 p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>100% Free & Unlimited. Normal multi-device WhatsApp connection with human-like delays.</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
