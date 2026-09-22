import React, { useEffect, useState } from 'react';
import { copyText } from '../../utils/clipboard.js';
import * as settingsService from '../../services/settingsService';
import { API_BASE_URL } from '../../services/api';
import { useToast } from '../../hooks/useToast.jsx';
import { Copy, RefreshCw } from 'lucide-react';
import Button from '../ui/Button.jsx';

/**
 * The form an agency pastes into their own website.
 *
 * The previous one-liner had two faults that made a working submission look
 * like a broken one. It ended in `this.reset()&&alert(...)` - `reset()`
 * returns undefined, so the confirmation never appeared even when the lead
 * saved perfectly. And it had no `.catch`, so a rejected request (which,
 * until the CORS fix, was every request from a real website) failed in
 * complete silence: the visitor saw their details still sitting in the form
 * and no idea whether anyone had received them.
 *
 * This version reports both outcomes in the page, disables the button while
 * sending, and surfaces the server's own message on failure.
 */
function buildEmbedSnippet(publicLeadKey) {
  if (!publicLeadKey) return '';
  return `<form action="${API_BASE_URL}/public/leads/${publicLeadKey}" method="POST">
  <input name="customerName" placeholder="Your Name" required />
  <input name="phone" placeholder="Phone Number" required />
  <input name="email" placeholder="Email (optional)" type="email" />
  <input name="interest" placeholder="Destination you're interested in" />
  <button type="submit">Submit Enquiry</button>
  <p data-ezzysync-status role="status"></p>
</form>
<script>
(function () {
  var form = document.currentScript.previousElementSibling;
  var status = form.querySelector('[data-ezzysync-status]');
  var button = form.querySelector('button[type="submit"]');
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    button.disabled = true;
    status.textContent = 'Sending...';
    fetch(form.action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(new FormData(form)))
    })
      .then(function (response) {
        return response.json().catch(function () { return {}; }).then(function (data) {
          if (!response.ok) throw new Error(data.message || 'Something went wrong. Please try again.');
          return data;
        });
      })
      .then(function (data) {
        form.reset();
        status.textContent = data.message || 'Thanks! We will be in touch shortly.';
      })
      .catch(function (error) {
        status.textContent = error.message || 'Could not send your enquiry. Please try again.';
      })
      .then(function () { button.disabled = false; });
  });
})();
</script>`;
}

export default function LeadCaptureTab() {
  const toast = useToast();
  const [publicLeadKey, setPublicLeadKey] = useState(null);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    settingsService.getPublicLeadKey().then(setPublicLeadKey).catch(() => toast.error('Could not load lead capture link.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRegenerateKey = async () => {
    if (!window.confirm('Regenerating will break any embed already published on your website. Continue?')) return;
    setRegenerating(true);
    try {
      const newKey = await settingsService.regeneratePublicLeadKey();
      setPublicLeadKey(newKey);
      toast.success('Lead capture link regenerated. Update your website with the new snippet.');
    } catch {
      toast.error('Could not regenerate the link.');
    } finally {
      setRegenerating(false);
    }
  };

  const embedSnippet = buildEmbedSnippet(publicLeadKey);

  const handleCopySnippet = async () => {
    if (await copyText(embedSnippet)) toast.success('Embed code copied to clipboard.');
    else toast.error('Could not copy automatically - select the code and copy it by hand.');
  };

  return (
    <div className="card space-y-6 max-w-3xl p-6">
      <div>
        <h3 className="font-bold text-slate-800">Landing Page Lead Capture</h3>
        <p className="text-xs text-slate-400 mt-1">
          Embed this form on your own website to capture customer inquiries directly into your Leads pipeline.
          This is separate from EzzySync's own demo-request form.
        </p>
      </div>

      {!publicLeadKey ? (
        <div className="skeleton h-32 rounded-xl" />
      ) : (
        <>
          <div className="space-y-1.5">
            <label className="label">Your Embed Code</label>
            <div className="relative">
              <textarea
                readOnly
                rows={8}
                value={embedSnippet}
                className="input font-mono text-xs bg-slate-50 resize-none"
              />
            </div>
            <Button type="button" variant="ghost" onClick={handleCopySnippet} className="text-xs gap-1.5 mt-2">
              <Copy size={14} /> Copy Embed Code
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800 rounded-xl p-4">
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-zinc-200">Regenerate Capture Link</p>
              <p className="text-xs text-slate-400 mt-0.5">Invalidates the current embed everywhere it's published. Use if the link has leaked.</p>
            </div>
            <Button type="button" variant="ghost" onClick={handleRegenerateKey} disabled={regenerating} className="text-xs gap-1.5 shrink-0">
              <RefreshCw size={14} className={regenerating ? 'animate-spin' : ''} /> {regenerating ? 'Regenerating...' : 'Regenerate'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
