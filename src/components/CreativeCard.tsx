"use client";

import { useState } from "react";
import type { Creative } from "@/lib/types";
import { platformSpec } from "@/lib/platforms";
import { creativesToCsv, downloadCsv } from "@/lib/csv";
import { PlatformChip } from "./PlatformChip";
import { AdMockup } from "./AdMockup";
import { CompliancePanel } from "./CompliancePanel";
import { Icon } from "./Icon";

export function CreativeCard({
  creative,
  onChange,
  onRegenerate,
  regenerating,
}: {
  creative: Creative;
  onChange: (updated: Creative) => void;
  onRegenerate: () => void;
  regenerating: boolean;
}) {
  const spec = platformSpec(creative.platform);

  function setField(key: string, value: string) {
    onChange({ ...creative, fields: { ...creative.fields, [key]: value } });
  }

  function applyFix(index: number) {
    const flag = creative.compliance.flags[index];
    const fields = { ...creative.fields };
    for (const k of Object.keys(fields)) {
      if (fields[k].includes(flag.phrase)) fields[k] = fields[k].split(flag.phrase).join(flag.rewrite);
    }
    const flags = creative.compliance.flags.map((f, i) => (i === index ? { ...f, applied: true } : f));
    const allApplied = flags.every((f) => f.applied);
    onChange({
      ...creative,
      fields,
      compliance: {
        ...creative.compliance,
        flags,
        score: Math.min(100, creative.compliance.score + 6),
        risk: allApplied ? "low" : creative.compliance.risk,
      },
    });
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <PlatformChip id={creative.platform} />
        <div className="flex items-center gap-1">
          <IconButton title="Regenerate" onClick={onRegenerate} spinning={regenerating}>
            <Icon name="refresh" className="h-4 w-4" />
          </IconButton>
          <IconButton
            title="Export CSV"
            onClick={() => downloadCsv(`${creative.platform}-ad.csv`, creativesToCsv([creative]))}
          >
            <Icon name="download" className="h-4 w-4" />
          </IconButton>
        </div>
      </div>

      {regenerating ? (
        <div className="h-52 skeleton rounded-lg" />
      ) : (
        <AdMockup creative={creative} />
      )}

      <div className="space-y-2">
        {spec.fields.map((field) => (
          <EditableField
            key={field.key}
            label={field.label}
            value={creative.fields[field.key] ?? ""}
            limit={field.limit}
            onChange={(v) => setField(field.key, v)}
          />
        ))}
      </div>

      {creative.variants && creative.variants.length > 0 && (
        <div>
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">A/B variants</div>
          <ul className="space-y-1.5">
            {creative.variants.map((v, i) => (
              <li key={i} className="rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-xs text-text/80">
                {v}
              </li>
            ))}
          </ul>
        </div>
      )}

      <CompliancePanel compliance={creative.compliance} onApplyFix={applyFix} />
    </div>
  );
}

function IconButton({
  title,
  onClick,
  spinning,
  children,
}: {
  title: string;
  onClick: () => void;
  spinning?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`rounded-md border border-border bg-surface p-1.5 text-muted transition hover:border-brand/40 hover:text-brand ${
        spinning ? "animate-spin" : ""
      }`}
    >
      {children}
    </button>
  );
}

function EditableField({
  label,
  value,
  limit,
  onChange,
}: {
  label: string;
  value: string;
  limit: number;
  onChange: (v: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const over = value.length > limit;

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div className="rounded-lg border border-border bg-surface-2 p-2.5">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
          <Icon name="edit" className="h-3 w-3" />
          {label}
        </span>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] tabular-nums ${over ? "text-danger" : "text-muted"}`}>
            {value.length}/{limit}
          </span>
          <button onClick={copy} className="inline-flex items-center gap-1 text-[10px] font-medium text-brand hover:underline">
            <Icon name="copy" className="h-3 w-3" />
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={1}
        style={{ fieldSizing: "content" } as React.CSSProperties}
        className="w-full resize-none bg-transparent text-xs leading-relaxed text-text outline-none"
      />
    </div>
  );
}
