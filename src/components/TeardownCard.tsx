import type { Teardown } from "@/lib/types";
import { Icon } from "./Icon";

export function TeardownCard({ teardown, image }: { teardown: Teardown; image?: string | null }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      <div className="flex items-center gap-2 border-b border-border bg-surface-2 px-5 py-3">
        <Icon name="sparkles" className="h-4 w-4 text-brand" />
        <span className="text-sm font-semibold text-text">Competitor teardown</span>
        <span className="text-xs text-muted">reverse-engineered from the ad you uploaded</span>
      </div>

      <div className="grid gap-5 p-5 md:grid-cols-[180px_1fr]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {image ? (
          <img src={image} alt="Competitor ad" className="h-fit max-h-72 w-full rounded-lg border border-border object-contain" />
        ) : (
          <div className="flex h-36 items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted md:h-full">
            Competitor ad
          </div>
        )}

        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Attr label="Platform">{teardown.platform}</Attr>
            <Attr label="Funnel stage">{teardown.funnelStage}</Attr>
            <Attr label="Angle">{teardown.angle}</Attr>
            <Attr label="Target emotion">{teardown.targetEmotion}</Attr>
          </div>
          <Attr label="Hook">{teardown.hook}</Attr>
          <Attr label="Offer">{teardown.offer}</Attr>

          <div className="grid gap-3 pt-1 sm:grid-cols-2">
            <List label="Why it works" tone="success" items={teardown.whyItWorks} />
            <List label="Weaknesses to exploit" tone="danger" items={teardown.weaknesses} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Attr({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-0.5 text-sm leading-relaxed text-text/90">{children}</div>
    </div>
  );
}

function List({ label, tone, items }: { label: string; tone: "success" | "danger"; items: string[] }) {
  return (
    <div>
      <div className={`text-[11px] font-semibold uppercase tracking-wide ${tone === "success" ? "text-success" : "text-danger"}`}>
        {label}
      </div>
      <ul className="mt-1 space-y-1">
        {items.map((it, i) => (
          <li key={i} className="flex gap-1.5 text-sm leading-relaxed text-text/85">
            <span className={tone === "success" ? "text-success" : "text-danger"}>•</span>
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}
