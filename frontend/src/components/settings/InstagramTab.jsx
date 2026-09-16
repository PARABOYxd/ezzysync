import React, { useEffect, useState } from 'react';
import * as instagramService from '../../services/instagramService';
import * as instagramDirectService from '../../services/instagramDirectService';
import * as settingsService from '../../services/settingsService';
import { useToast } from '../../hooks/useToast.jsx';
import { Instagram, Sparkles } from 'lucide-react';
import Input from '../ui/Input.jsx';
import Button from '../ui/Button.jsx';

export default function InstagramTab({ settings, setSettings }) {
  const toast = useToast();

  const [igDirectStatus, setIgDirectStatus] = useState({ status: 'disconnected', username: '' });
  const [igDirectForm, setIgDirectForm] = useState({ username: '', password: '' });
  const [igDirectLoggingIn, setIgDirectLoggingIn] = useState(false);
  const [igChallenge, setIgChallenge] = useState({ open: false, code: '', message: '', verifying: false });

  useEffect(() => {
    instagramDirectService.getInstagramDirectStatus().then(setIgDirectStatus).catch(() => {});
  }, []);

  useEffect(() => {
    const onMessage = (e) => {
      if (e.data?.instagramOAuth === 'success') {
        toast.success('Instagram connected successfully via Meta!');
        settingsService.getSettings().then(setSettings).catch(() => {});
      } else if (e.data?.instagramOAuth === 'denied') {
        toast.error('Instagram connection was cancelled.');
      } else if (e.data?.instagramOAuth === 'error') {
        toast.error('Instagram connection failed.');
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleIgDirectLogin = async (e) => {
    e.preventDefault();
    if (!igDirectForm.username || !igDirectForm.password) {
      toast.error('Instagram username and password are required.');
      return;
    }
    setIgDirectLoggingIn(true);
    try {
      const res = await instagramDirectService.loginInstagramDirect(igDirectForm.username, igDirectForm.password);
      if (res.status === 'challenge_required') {
        setIgChallenge({
          open: true,
          code: '',
          message: res.message || 'Security verification required.',
          verifying: false,
        });
        toast.info('Security verification required. Check SMS/Authenticator.');
      } else {
        setIgDirectStatus({ status: 'connected', username: res.username });
        setIgDirectForm({ username: '', password: '' });
        toast.success(`Direct Instagram connected as @${res.username}! DMs & AI Auto-Reply active.`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Instagram Direct login failed.');
    } finally {
      setIgDirectLoggingIn(false);
    }
  };

  const handleIgVerifyCode = async (e) => {
    e.preventDefault();
    if (!igChallenge.code) return;
    setIgChallenge((prev) => ({ ...prev, verifying: true }));
    try {
      const res = await instagramDirectService.verifyInstagramDirectCode(igChallenge.code);
      setIgDirectStatus({ status: 'connected', username: res.username });
      setIgChallenge({ open: false, code: '', message: '', verifying: false });
      toast.success(`Verification successful! Connected as @${res.username}.`);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Invalid verification code.');
    } finally {
      setIgChallenge((prev) => ({ ...prev, verifying: false }));
    }
  };

  const handleIgDirectDisconnect = async () => {
    if (!window.confirm('Disconnect Direct Instagram session?')) return;
    try {
      await instagramDirectService.disconnectInstagramDirect();
      setIgDirectStatus({ status: 'disconnected', username: '' });
      toast.success('Direct Instagram disconnected.');
    } catch {
      toast.error('Failed to disconnect Instagram.');
    }
  };

  const handleMetaInstagramConnect = () => {
    instagramService.connectInstagram();
  };

  const handleMetaInstagramDisconnect = async () => {
    if (!window.confirm('Disconnect Official Meta Instagram account?')) return;
    try {
      await instagramService.disconnect();
      setSettings((prev) => ({ ...prev, instagramUsername: '', instagramAccountId: '' }));
      toast.success('Official Instagram disconnected.');
    } catch {
      toast.error('Could not disconnect Instagram.');
    }
  };

  const isDirectConnected = igDirectStatus.status === 'connected';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* 🌟 1-CLICK OFFICIAL META INSTAGRAM LOGIN */}
      <div className="card space-y-5 border-2 border-indigo-500/40 bg-gradient-to-br from-white via-indigo-50/20 to-purple-50/30 shadow-xl shadow-indigo-500/5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Instagram size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                Official Instagram Login
                <span className="text-[10px] font-extrabold uppercase bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200">
                  100% Meta Official • Zero Ban Risk
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                1-Click login with your normal Instagram/Facebook account via official Meta popup.
              </p>
            </div>
          </div>
        </div>

        {settings?.instagramUsername ? (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold text-base shadow-md shadow-indigo-500/20 shrink-0">
                  {(settings.instagramUsername || 'IG')[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-base text-slate-900">@{settings.instagramUsername}</p>
                  <p className="text-xs text-emerald-800 font-mono mt-0.5">
                    Status: Meta Official Webhook Active (AI Auto-Pilot & DMs ON)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-100/80 px-3 py-1.5 rounded-lg shrink-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Official Connected
                </span>
                <button
                  type="button"
                  onClick={handleMetaInstagramDisconnect}
                  className="px-3.5 py-1.5 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded-lg transition"
                >
                  Disconnect
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-5 bg-white/80 rounded-2xl border border-indigo-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="font-bold text-sm text-slate-800">Normal 1-Click Meta Login</h4>
              <p className="text-xs text-slate-500 mt-0.5 max-w-md">
                Click the button to open Meta's official login window, log in normally, and allow permissions. DMs will auto-sync with CRM and Gemini AI.
              </p>
            </div>

            <button
              type="button"
              onClick={handleMetaInstagramConnect}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:opacity-95 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-500/25 transition shrink-0 cursor-pointer"
            >
              <Instagram size={16} />
              <span>Log in with Instagram</span>
            </button>
          </div>
        )}
      </div>

      {/* ⚡ DIRECT INSTAGRAM CONNECTION (Alternative Method) */}
      <div className="card space-y-5 border-2 border-slate-200 dark:border-slate-800 bg-white">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-pink-500 to-rose-600 text-white flex items-center justify-center shadow-md shadow-pink-500/20">
              <Instagram size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                Alternative: Direct Username & Password
                <span className="text-[10px] font-extrabold uppercase bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full border border-slate-200">Direct Device</span>
              </h3>
              <p className="text-xs text-slate-500">Connect directly using your Instagram Username & Password if you prefer not using Facebook login.</p>
            </div>
          </div>
        </div>

        {isDirectConnected ? (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-pink-500 to-rose-600 text-white flex items-center justify-center font-bold text-base shadow-md shadow-pink-500/20 shrink-0">
                  {(igDirectStatus.username || 'IG')[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-base text-slate-900">@{igDirectStatus.username}</p>
                  <p className="text-xs text-emerald-800 font-mono mt-0.5">
                    Status: Active Session (Polling DMs & AI Auto-Reply ON)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-100/80 px-3 py-1.5 rounded-lg shrink-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Connected Direct
                </span>
                <button
                  type="button"
                  onClick={handleIgDirectDisconnect}
                  className="px-3.5 py-1.5 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded-lg transition"
                >
                  Disconnect
                </button>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/40 text-xs text-indigo-900 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <Sparkles size={14} className="text-indigo-600" />
                AI Auto-Reply for Instagram Direct Messages is Active
              </p>
              <p className="text-[11px] text-indigo-700 leading-relaxed">
                Incoming DMs from Instagram will auto-create CRM Leads and receive grounded AI responses with your agency's trip packages and itinerary details.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleIgDirectLogin} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Instagram Username / Email"
                required
                placeholder="e.g. travel_agency_official"
                value={igDirectForm.username}
                onChange={(e) => setIgDirectForm({ ...igDirectForm, username: e.target.value })}
              />
              <Input
                label="Instagram Password"
                type="password"
                required
                placeholder="••••••••"
                value={igDirectForm.password}
                onChange={(e) => setIgDirectForm({ ...igDirectForm, password: e.target.value })}
              />
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-1 border-t border-slate-100">
              <p className="text-[11px] text-slate-500">
                🔒 Credentials create a direct encrypted device session. 2FA verification supported.
              </p>
              <Button
                type="submit"
                disabled={igDirectLoggingIn}
                className="w-full sm:w-auto px-6 text-xs bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold border-none shadow-md shadow-pink-500/20"
              >
                {igDirectLoggingIn ? 'Connecting Instagram...' : 'Connect Direct Account'}
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* 2FA / Security Verification Code Modal */}
      {igChallenge.open && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Sparkles size={18} className="text-pink-600" />
                Instagram Security Verification
              </h4>
              <button
                onClick={() => setIgChallenge({ ...igChallenge, open: false })}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {igChallenge.message || 'Please enter the 6-digit security/OTP code sent to your phone or authenticator app.'}
            </p>

            <form onSubmit={handleIgVerifyCode} className="space-y-4">
              <Input
                label="6-Digit Verification Code"
                required
                placeholder="123456"
                maxLength={8}
                value={igChallenge.code}
                onChange={(e) => setIgChallenge({ ...igChallenge, code: e.target.value })}
                inputClassName="text-center text-base font-mono tracking-widest"
              />

              <div className="flex gap-2 justify-end pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIgChallenge({ ...igChallenge, open: false })}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={igChallenge.verifying}
                  className="text-xs px-5 bg-pink-600 hover:bg-pink-500 text-white font-bold"
                >
                  {igChallenge.verifying ? 'Verifying...' : 'Verify Code & Connect'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
