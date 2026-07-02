import type { Angle } from "@/lib/types";
import { PlatformChip } from "./PlatformChip";
import { Icon } from "./Icon";

export function AngleCard({
  angle,
  selected,
  loading,
  onSelect,
}: {
  angle: Angle;
  selected: boolean;
  loading: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      disabled={loading}
      className={`group relative flex flex-col rounded-xl border p-4 text-left transition ${
        selected
          ? "border-brand bg-brand-soft shadow-sm ring-1 ring-brand/20"
          : "border-border bg-surface hover:border-brand/40 hover:shadow-sm"
      } disabled:cursor-not-allowed`}
    >
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <h4 className="font-semibold leading-tight text-text">{angle.name}</h4>
        <span className="shrink-0 rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted">
          {angle.psychology}
        </span>
      </div>
      <p className="mb-3 text-sm leading-relaxed text-muted">{angle.description}</p>

      <div className="mt-auto flex flex-wrap items-center gap-1.5">
        {angle.bestPlatforms.map((p) => (
          <PlatformChip key={p} id={p} small />
        ))}
      </div>

      <span
        className={`mt-3 inline-flex items-center gap-1 text-xs font-medium ${
          selected ? "text-brand" : "text-muted group-hover:text-brand"
        }`}
      >
        {loading ? (
          "Generating creatives…"
        ) : selected ? (
          <>
            <Icon name="check" className="h-3.5 w-3.5" /> Selected
          </>
        ) : (
          <>
            Generate creatives <Icon name="arrowRight" className="h-3.5 w-3.5" />
          </>
        )}
      </span>
    </button>
  );
}
