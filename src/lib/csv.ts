/**
 * CSV writing.
 *
 * The parser in lib/studentImport reads spreadsheets; this writes them. Kept
 * separate because the risks run in opposite directions: reading is about
 * tolerating messy input, writing is about not producing dangerous output.
 */

/**
 * Escape one field.
 *
 * Two jobs. The ordinary one is quoting: a parent named "Khan, Ayesha" would
 * otherwise split into two columns.
 *
 * The other is CSV injection. Excel and Sheets evaluate any cell beginning with
 * `=`, `+`, `-` or `@` as a formula, so a lead whose name is
 * `=HYPERLINK("http://evil","Click")` becomes a live link in the school's
 * spreadsheet — and `=cmd|...` can do considerably worse. The value is an
 * attacker-controlled string that arrived through a public form, so it is
 * prefixed with a single quote, which spreadsheets treat as "this is text".
 */
export function csvField(value: unknown): string {
  if (value === null || value === undefined) return "";
  let s = String(value);

  // Neutralise formula triggers before quoting, so the guard survives escaping.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;

  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function csvRow(values: unknown[]): string {
  return values.map(csvField).join(",");
}

/**
 * A complete CSV document.
 *
 * Prefixed with a UTF-8 BOM: without it Excel on Windows reads the file as the
 * system codepage and mangles every non-ASCII name — which, for a school in
 * Bengaluru, is most of them.
 */
export function csvDocument(header: string[], rows: unknown[][]): string {
  return "﻿" + [csvRow(header), ...rows.map(csvRow)].join("\r\n") + "\r\n";
}

/** Filename-safe stamp, e.g. "leads-2026-08-05.csv". */
export function csvFilename(prefix: string, d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${prefix}-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}.csv`;
}
