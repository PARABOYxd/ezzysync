export const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value || '');
export const isValidPhone = (value) => /^[0-9+\-\s()]{7,15}$/.test(value || '');
export const isValidGST = (value) => !value ? true : /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i.test(value);

