import type { Creative } from "./types";
import { platformSpec } from "./platforms";

/** Escape a value for CSV (RFC-4180 style). */
function cell(v: string): string {
  const s = v ?? "";
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Build a CSV for a set of creatives on one platform, using that platform's
 * copy fields as columns plus compliance metadata — close to what a buyer would
 * paste into a bulk-upload sheet.
 */
export function creativesToCsv(creatives: Creative[]): string {
  if (creatives.length === 0) return "";
  const spec = platformSpec(creatives[0].platform);
  const fieldKeys = spec.fields.map((f) => f.key);
  const headers = [...spec.fields.map((f) => f.label), "Image Concept", "Compliance Risk", "Compliance Score"];

  const rows = creatives.map((c) =>
    [
      ...fieldKeys.map((k) => cell((c.fields[k] ?? "").replace(/\n/g, " "))),
      cell(c.imageConcept),
      cell(c.compliance.risk),
      cell(String(c.compliance.score)),
    ].join(",")
  );

  return [headers.map(cell).join(","), ...rows].join("\n");
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
