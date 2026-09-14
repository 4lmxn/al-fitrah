export function csvField(value: unknown): string {
  if (value === null || value === undefined) return "";
  let s = String(value);

  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;

  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function csvRow(values: unknown[]): string {
  return values.map(csvField).join(",");
}

export function csvDocument(header: string[], rows: unknown[][]): string {
  return "﻿" + [csvRow(header), ...rows.map(csvRow)].join("\r\n") + "\r\n";
}

export function csvFilename(prefix: string, d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${prefix}-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}.csv`;
}
