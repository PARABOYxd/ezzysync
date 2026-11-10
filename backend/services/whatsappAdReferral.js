/**
 * Telling a "Click to WhatsApp" ad enquiry from an ordinary message.
 *
 * When someone taps the WhatsApp button on a Meta (Facebook or Instagram) ad,
 * their first message carries the ad it came from. The two WhatsApp transports
 * report it differently, so both are reduced here to one shape:
 *
 *   { headline, body, url, sourceId, clickId, kind }
 *
 * `headline` is the ad's title - the trip being advertised - and is what ends
 * up on the lead as its interest.
 */

const AD_SOURCE = 'Meta Ads';

const text = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

function shape({ headline, body, url, sourceId, clickId, kind }) {
  return {
    headline: text(headline, 200),
    body: text(body, 500),
    url: text(url, 500),
    sourceId: text(sourceId, 100),
    clickId: text(clickId, 200),
    kind: text(kind, 20) || 'ad',
  };
}

/**
 * From an unwrapped Baileys message. Every message type carries its own
 * `contextInfo`, so each is checked rather than only text.
 *
 * Link-preview cards use the same field, so a card alone is not enough: it has
 * to say it is an ad or a post, or carry a click id.
 */
function fromBaileys(rawMessage) {
  if (!rawMessage || typeof rawMessage !== 'object') return null;

  for (const content of Object.values(rawMessage)) {
    const ad = content && typeof content === 'object' ? content.contextInfo?.externalAdReply : null;
    if (!ad) continue;

    const kind = String(ad.sourceType || '').toLowerCase();
    const isAd = kind === 'ad' || kind === 'post' || Boolean(ad.ctwaClid);
    if (!isAd) continue;

    return shape({
      headline: ad.title,
      body: ad.body,
      url: ad.sourceUrl,
      sourceId: ad.sourceId,
      clickId: ad.ctwaClid,
      kind: kind || 'ad',
    });
  }
  return null;
}

/** From the `referral` object WhatsApp Cloud API adds to a message that came from an ad. */
function fromCloud(referral) {
  if (!referral || typeof referral !== 'object') return null;
  return shape({
    headline: referral.headline,
    body: referral.body,
    url: referral.source_url,
    sourceId: referral.source_id,
    clickId: referral.ctwa_clid,
    kind: referral.source_type,
  });
}

/** One line for the lead's timeline. */
function describe(ad) {
  const what = ad.kind === 'post' ? 'a Meta post' : 'a Meta ad';
  const title = ad.headline ? `: "${ad.headline}"` : '';
  return `Started this chat from ${what}${title}`;
}

/** Lines for the lead's notes, with whatever the ad told us. */
function notesFor(ad, firstMessage) {
  const lines = [`Auto-captured from a WhatsApp message that came from ${ad.kind === 'post' ? 'a Meta post' : 'a Meta ad'}.`];
  if (ad.headline) lines.push(`Ad: ${ad.headline}`);
  if (ad.body) lines.push(`Ad text: ${ad.body}`);
  if (ad.url) lines.push(`Ad link: ${ad.url}`);
  if (firstMessage) lines.push(`First message: "${String(firstMessage).slice(0, 300)}"`);
  return lines.join('\n');
}

module.exports = { AD_SOURCE, fromBaileys, fromCloud, describe, notesFor };
