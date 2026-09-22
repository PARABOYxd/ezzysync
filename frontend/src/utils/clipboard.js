/**
 * Copies text and says whether it worked.
 *
 * navigator.clipboard only exists on secure origins and rejects when the
 * browser withholds permission. Called bare, that rejection went unhandled
 * and the "copied!" toast showed anyway - so the agent pasted whatever was
 * on their clipboard before. The fallback covers plain-http and older
 * browsers; the return value lets the caller tell the truth.
 */
export async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}
