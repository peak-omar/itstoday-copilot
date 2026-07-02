import type { OfferBrief } from "@/lib/types";
import { Icon } from "./Icon";

export function BriefCard({ brief }: { brief: OfferBrief }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-text">{brief.product}</h3>
          <p className="text-sm text-muted">{brief.category}</p>
        </div>
        {brief.sourceUrl && (
          <a
            href={brief.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-muted hover:text-brand"
          >
            <Icon name="link" className="h-3.5 w-3.5" />
            Source
          </a>
        )}
      </div>

      <p className="mb-4 text-sm leading-relaxed text-text/90">{brief.valueProposition}</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Target audience">{brief.targetAudience}</Field>
        <Field label="Tone">{brief.toneNotes}</Field>
      </div>

      <div className="mt-4">
        <FieldLabel>Key benefits</FieldLabel>
        <ul className="mt-1.5 flex flex-wrap gap-1.5">
          {brief.keyBenefits.map((b) => (
            <li key={b} className="rounded-md border border-border bg-surface-2 px-2.5 py-1 text-xs text-text/80">
              {b}
            </li>
          ))}
        </ul>
      </div>

      {brief.sensitiveClaims.length > 0 && (
        <div className="mt-4 rounded-lg border border-[color:var(--warning)]/20 bg-warning-soft p-3">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-warning">
            <Icon name="warning" className="h-3.5 w-3.5" />
            Compliance-sensitive claims detected
          </div>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {brief.sensitiveClaims.map((c) => (
              <li key={c} className="rounded-md bg-surface px-2.5 py-1 text-xs text-warning">
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">{children}</span>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <p className="mt-1 text-sm leading-relaxed text-text/90">{children}</p>
    </div>
  );
}
