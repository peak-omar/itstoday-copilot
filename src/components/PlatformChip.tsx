import { platformSpec } from "@/lib/platforms";
import type { PlatformId } from "@/lib/types";

export function PlatformChip({ id, small }: { id: PlatformId; small?: boolean }) {
  const spec = platformSpec(id);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-border bg-surface font-medium text-text ${
        small ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"
      }`}
    >
      <span className="h-2 w-2 rounded-full" style={{ background: spec.accent }} />
      {spec.name}
    </span>
  );
}
