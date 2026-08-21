import { parse } from "csv-parse/sync";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Accepts a CSV file (one column or many, header row optional) or a plain
 * newline/comma separated list of emails and returns the deduped, valid
 * email addresses found in it. Used for both the dashboard's file upload
 * and the raw `recipients` array a Postman caller can send directly.
 */
export function parseRecipientsFromBuffer(buffer: Buffer): string[] {
  const text = buffer.toString("utf-8");
  const found = new Set<string>();

  try {
    const rows: string[][] = parse(text, {
      skip_empty_lines: true,
      relax_column_count: true,
    });
    for (const row of rows) {
      for (const cell of row) {
        const trimmed = cell.trim();
        if (EMAIL_RE.test(trimmed)) found.add(trimmed.toLowerCase());
      }
    }
  } catch {
    // Fall through to naive line-splitting below if csv-parse chokes on it.
  }

  if (found.size === 0) {
    for (const token of text.split(/[\s,;\n\r]+/)) {
      const trimmed = token.trim();
      if (EMAIL_RE.test(trimmed)) found.add(trimmed.toLowerCase());
    }
  }

  return Array.from(found);
}

export function dedupeValidEmails(list: string[]): string[] {
  const found = new Set<string>();
  for (const raw of list) {
    const trimmed = raw.trim().toLowerCase();
    if (EMAIL_RE.test(trimmed)) found.add(trimmed);
  }
  return Array.from(found);
}
