// Client-side CSV export. Converts an array of plain objects to CSV text and
// triggers a browser download via a Blob — no server round-trip.

function escapeCell(value: unknown): string {
  if (value == null) return "";
  const s = String(value);
  // Quote when the cell contains a delimiter, quote, newline, or edge spaces.
  if (/[",\r\n]/.test(s) || /^\s|\s$/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Build a CSV from `rows` and download it as `filename`.
 * Column order follows the union of keys across rows (first-seen order).
 */
export function exportToCsv(
  filename: string,
  rows: Record<string, unknown>[]
): void {
  if (rows.length === 0) return;

  const headers: string[] = [];
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!headers.includes(key)) headers.push(key);
    }
  }

  const lines = [
    headers.map(escapeCell).join(","),
    ...rows.map((row) => headers.map((h) => escapeCell(row[h])).join(",")),
  ];

  // Leading BOM so spreadsheet apps detect UTF-8; CRLF line endings for Excel.
  const csv = "﻿" + lines.join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
