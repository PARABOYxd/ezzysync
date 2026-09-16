import { API_BASE_URL } from '../services/api';

export function getItineraryImage(bannerUrl) {
  if (bannerUrl) {
    if (bannerUrl.includes('/uploads/')) {
      const relativePath = bannerUrl.substring(bannerUrl.indexOf('/uploads/'));
      const backendRoot = API_BASE_URL.replace('/api', '');
      return `${backendRoot}${relativePath}`;
    }
    return bannerUrl;
  }
  return 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=400&q=80';
}

/** "18h 20m" / "45m" - short enough to sit inside a one-line banner. */
export function formatWindowRemaining(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * The label on a day divider, the way WhatsApp writes it.
 *
 * A thread showed only clock times, so a message at 09:15 gave no hint
 * whether it arrived this morning or three weeks ago - and an agent scrolling
 * back had no way to tell where yesterday ended.
 */
export function formatDayLabel(ts) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '';

  const startOfDay = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const daysApart = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86400000);

  if (daysApart === 0) return 'Today';
  if (daysApart === 1) return 'Yesterday';
  // Inside the last week the weekday is more useful than the date.
  if (daysApart < 7) return d.toLocaleDateString([], { weekday: 'long' });
  // The year only earns its place once it is not this one.
  return d.toLocaleDateString([], {
    day: 'numeric',
    month: 'short',
    ...(d.getFullYear() !== new Date().getFullYear() && { year: 'numeric' }),
  });
}

/** Whether a divider belongs above this message. */
export function startsNewDay(msg, previous) {
  if (!msg?.message_timestamp) return false;
  if (!previous?.message_timestamp) return true;
  return new Date(msg.message_timestamp).toDateString()
    !== new Date(previous.message_timestamp).toDateString();
}

export function formatDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/**
 * Stored messages keep a coarse message_type ('image' / 'document') and a
 * URL, not the original mime type - so the real type is read back off the
 * stored file's extension. Guessing "pdf" for everything non-image would
 * have shown a broken PDF frame for Word files, spreadsheets and the rest.
 */
export function mediaTypeOf(msg) {
  if (!msg) return '';
  if (msg.message_type === 'image') return 'image/*';
  const ext = String(msg.media_url || '').split('?')[0].split('.').pop().toLowerCase();
  const byExt = {
    pdf: 'application/pdf',
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif',
    mp4: 'video/mp4', webm: 'video/webm',
    ogg: 'audio/ogg', mp3: 'audio/mpeg', m4a: 'audio/mp4',
  };
  return byExt[ext] || 'application/octet-stream';
}

export function mediaNameOf(msg) {
  if (!msg) return 'Attachment';
  const fromUrl = String(msg.media_url || '').split('?')[0].split('/').pop();
  return fromUrl || (msg.message_type === 'image' ? 'Photo' : 'Attachment');
}

export function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
