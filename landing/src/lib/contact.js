/** Sales WhatsApp number, digits only (wa.me format). */
export const WHATSAPP_NUMBER = "918826610820";

/** wa.me deep link with a prefilled message. */
export function waLink(text) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

export const WA_DEMO_TEXT = "Hi EzzySync, I run a travel agency and want a live demo.";
