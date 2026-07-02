import type { Creative } from "@/lib/types";
import { platformSpec } from "@/lib/platforms";

/**
 * Lightweight visual preview of each platform's ad using the (possibly edited)
 * copy + image concept, so buyers see the creative in context — not just fields.
 */
export function AdMockup({ creative }: { creative: Creative }) {
  const spec = platformSpec(creative.platform);
  const f = creative.fields;

  const concept = (dark = false) => (
    <div className={`flex items-center justify-center px-3 py-4 text-center ${dark ? "" : "bg-surface-2"}`}>
      <span className={`text-[11px] leading-snug ${dark ? "text-white/70" : "text-muted"}`}>
        Creative concept — {creative.imageConcept}
      </span>
    </div>
  );

  if (creative.platform === "meta") {
    return (
      <Frame accent={spec.accent}>
        <div className="flex items-center gap-2 p-3">
          <div className="h-7 w-7 rounded-full" style={{ background: spec.accent }} />
          <div className="text-xs">
            <div className="font-semibold text-text">Your Brand</div>
            <div className="text-[10px] text-muted">Sponsored</div>
          </div>
        </div>
        <p className="px-3 pb-2 text-xs leading-relaxed text-text/90">{f.primaryText}</p>
        <div className="aspect-[1.91/1] border-y border-border">{concept()}</div>
        <div className="flex items-center justify-between gap-2 bg-surface-2 p-3">
          <div className="min-w-0">
            <div className="truncate text-xs font-semibold text-text">{f.headline}</div>
            <div className="truncate text-[10px] text-muted">{f.description}</div>
          </div>
          <span className="shrink-0 rounded-md border border-border bg-surface px-2.5 py-1 text-[10px] font-medium text-text">
            Learn More
          </span>
        </div>
      </Frame>
    );
  }

  if (creative.platform === "tiktok") {
    return (
      <Frame accent={spec.accent}>
        <div className="relative aspect-[9/16] max-h-80 overflow-hidden bg-gradient-to-b from-neutral-800 to-black">
          <div className="flex h-full items-center justify-center px-4 text-center">
            <span className="text-[11px] leading-snug text-white/60">Creative concept — {creative.imageConcept}</span>
          </div>
          <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/70 to-transparent p-3">
            <span className="text-sm font-bold leading-tight text-white drop-shadow">{f.hook}</span>
          </div>
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3">
            <span className="text-[11px] text-white/90">{f.caption}</span>
          </div>
        </div>
      </Frame>
    );
  }

  if (creative.platform === "taboola") {
    return (
      <Frame accent={spec.accent}>
        <div className="p-2.5">
          <div className="mb-1.5 text-[10px] uppercase tracking-wide text-muted">Around the web</div>
          <div className="overflow-hidden rounded-lg border border-border">
            <div className="aspect-[1.6/1]">{concept()}</div>
            <div className="p-2.5">
              <div className="text-xs font-semibold leading-snug text-text">{f.headline}</div>
              <div className="mt-1 text-[10px] text-muted">{f.branding}</div>
            </div>
          </div>
        </div>
      </Frame>
    );
  }

  // Google RSA
  return (
    <Frame accent={spec.accent}>
      <div className="p-3">
        <div className="mb-1 flex items-center gap-1.5 text-[10px] text-muted">
          <span className="rounded border border-border px-1 font-bold text-text">Ad</span>
          <span>·</span>
          <span>www.yourbrand.com</span>
        </div>
        <div className="text-sm font-medium leading-snug text-[#1a0dab]">
          {[f.headline1, f.headline2, f.headline3].filter(Boolean).join(" | ")}
        </div>
        <p className="mt-1 text-xs leading-relaxed text-text/70">
          {[f.description1, f.description2].filter(Boolean).join(" ")}
        </p>
      </div>
    </Frame>
  );
}

function Frame({ accent, children }: { accent: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border bg-surface" style={{ borderColor: `${accent}44` }}>
      {children}
    </div>
  );
}
