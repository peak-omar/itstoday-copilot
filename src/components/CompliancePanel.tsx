import type { Compliance, ComplianceSeverity } from "@/lib/types";
import { Icon } from "./Icon";

const SEVERITY: Record<ComplianceSeverity, { label: string; cls: string }> = {
  rejection: { label: "Ad rejected", cls: "bg-warning-soft text-warning" },
  "account-ban": { label: "Account ban risk", cls: "bg-danger-soft text-danger" },
  "permanent-ban": { label: "Permanent ban", cls: "bg-danger text-white" },
};

const RISK_STYLES: Record<Compliance["risk"], { label: string; box: string; text: string; bar: string }> = {
  low: { label: "Low risk", box: "border-[color:var(--success)]/20 bg-success-soft", text: "text-success", bar: "bg-success" },
  medium: { label: "Medium risk", box: "border-[color:var(--warning)]/20 bg-warning-soft", text: "text-warning", bar: "bg-warning" },
  high: { label: "High risk", box: "border-[color:var(--danger)]/20 bg-danger-soft", text: "text-danger", bar: "bg-danger" },
};

export function CompliancePanel({
  compliance,
  onApplyFix,
}: {
  compliance: Compliance;
  onApplyFix?: (index: number) => void;
}) {
  const s = RISK_STYLES[compliance.risk];
  return (
    <div className={`rounded-lg border p-3.5 ${s.box}`}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${s.text}`}>
          <Icon name="shield" className="h-3.5 w-3.5" />
          {s.label}
        </span>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-black/10">
            <div className={`h-full ${s.bar}`} style={{ width: `${compliance.score}%` }} />
          </div>
          <span className="w-11 text-right text-xs font-medium tabular-nums text-muted">{compliance.score}/100</span>
        </div>
      </div>

      <p className="text-xs leading-relaxed text-text/75">{compliance.summary}</p>

      {compliance.flags.length > 0 && (
        <ul className="mt-3 space-y-2">
          {compliance.flags.map((f, i) => (
            <li
              key={i}
              className={`rounded-lg border p-2.5 text-xs ${
                f.applied ? "border-[color:var(--success)]/30 bg-surface" : "border-border bg-surface"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded px-1.5 py-0.5 font-mono ${
                    f.applied ? "bg-success-soft text-success line-through" : "bg-danger-soft text-danger"
                  }`}
                >
                  &ldquo;{f.phrase}&rdquo;
                </span>
                {!f.applied && (
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${SEVERITY[f.severity].cls}`}>
                    {SEVERITY[f.severity].label}
                  </span>
                )}
                <span className="text-[10px] uppercase tracking-wide text-muted">{f.policy}</span>
              </div>
              <p className="mt-1.5 text-muted">{f.reason}</p>
              <div className="mt-1.5 flex items-start justify-between gap-2">
                <p className="text-text/90">
                  <span className="font-medium text-success">Rewrite: </span>
                  {f.rewrite}
                </p>
                {onApplyFix &&
                  (f.applied ? (
                    <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-success">
                      <Icon name="check" className="h-3.5 w-3.5" /> Applied
                    </span>
                  ) : (
                    <button
                      onClick={() => onApplyFix(i)}
                      className="shrink-0 rounded-md border border-brand/30 bg-brand-soft px-2 py-1 text-[11px] font-medium text-brand transition hover:bg-brand hover:text-white"
                    >
                      Apply fix
                    </button>
                  ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
