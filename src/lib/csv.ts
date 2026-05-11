const BOM = "﻿";

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(headers: string[], rows: Array<Record<string, unknown>>, keys: string[]): string {
  const head = headers.map(escapeCell).join(";");
  const body = rows.map((r) => keys.map((k) => escapeCell(r[k])).join(";")).join("\n");
  return `${BOM}${head}\n${body}`;
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
