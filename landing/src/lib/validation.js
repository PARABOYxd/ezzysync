const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_CHARS = /^[0-9+\-\s()]+$/;

/**
 * Validates the demo-request form. Returns a field -> message map; an empty
 * object means the form is valid. Phone is optional but format-checked when
 * present.
 */
export function validateDemoForm({ name, agency, email, phone }) {
  const errs = {};
  if (!name.trim()) errs.name = "Name is required.";
  if (!agency.trim()) errs.agency = "Agency name is required.";
  if (!email.trim()) {
    errs.email = "Email is required.";
  } else if (!EMAIL_PATTERN.test(email)) {
    errs.email = "Enter a valid email address.";
  }
  const phoneDigits = (phone || "").replace(/\D/g, "").length;
  if (phone && (!PHONE_CHARS.test(phone) || phoneDigits < 7 || phoneDigits > 15)) {
    errs.phone = "Enter a valid phone number (7-15 digits).";
  }
  return errs;
}
