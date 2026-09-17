/**
 * Minimal CSV parser - handles quoted fields (with embedded commas, quotes
 * doubled as `""`, and embedded newlines) without pulling in a library for
 * what is, for a lead-import file, a genuinely small amount of parsing.
 *
 * Returns { headers, rows } where rows is an array of plain objects keyed by
 * the (trimmed, lowercased) header - e.g. a "Phone Number" column becomes
 * row['phone number'].
 */
export function parseCsv(text) {
  const rows = [];
  let field = '';
  let row = [];
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = '';
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      pushField();
    } else if (char === '\n') {
      pushRow();
    } else if (char === '\r') {
      // swallow - \r\n line endings are handled by the \n branch above
    } else {
      field += char;
    }
  }
  // Last line may not end with a newline.
  if (field.length > 0 || row.length > 0) pushRow();

  const nonEmptyRows = rows.filter((r) => r.some((cell) => cell.trim() !== ''));
  if (nonEmptyRows.length === 0) return { headers: [], rows: [] };

  const headers = nonEmptyRows[0].map((h) => h.trim().toLowerCase());
  const dataRows = nonEmptyRows.slice(1).map((cells) => {
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = (cells[idx] || '').trim();
    });
    return obj;
  });

  return { headers, rows: dataRows };
}
