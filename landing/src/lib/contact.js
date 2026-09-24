/**
 * Central Single Source of Truth for all Contact Information & WhatsApp Links
 * Modify here to update everywhere across landing pages, footers, navbars, and Schema JSON-LD.
 */

/** Raw WhatsApp digits with country code for wa.me links */
export const WHATSAPP_NUMBER = "918104665986";

/** Human-readable display format */
export const DISPLAY_PHONE = "+91 81046 65986";

/** International RFC 3966 telephone format for Schema JSON-LD & tel: hrefs */
export const TEL_PHONE = "+91-8104665986";

/** Official support email */
export const SUPPORT_EMAIL = "support@ezzysync.com";

/** Support hours */
export const SUPPORT_HOURS = "Mon - Sat, 10 AM - 7 PM";

/** Direct wa.me link with optional prefilled message */
export function waLink(text = "") {
  if (!text) {
    return `https://wa.me/${WHATSAPP_NUMBER}`;
  }
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

/** Standard prefilled messages */
export const WA_DEMO_TEXT = "Hi EzzySync, I run a travel agency and want a live demo.";
export const WA_HEADER_DEMO_TEXT = "Hi EzzySync, I am a travel agent and want a demo";
export const WA_BOOK_DEMO_TEXT = "Hi EzzySync, I am interested in a live demo for my agency";
export const WA_QUESTION_TEXT = "Hi EzzySync, I have a question about the travel CRM";
export const WA_WALKTHROUGH_TEXT = "Hi EzzySync, I want to schedule a guided walkthrough.";
export const WA_FEATURES_WALKTHROUGH_TEXT = "Hi EzzySync, I want a guided walkthrough of all features";
export const WA_FEATURES_DEMO_TEXT = "Hi EzzySync, I want to see a live demo of EzzySync";
export const WA_ABOUT_INQUIRY_TEXT = "Hello EzzySync Team! I would like to know more about EzzySync.";
