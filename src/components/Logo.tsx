// Angleworks brand mark + wordmark. The mark is a geometric "angle" (vertex + two
// rays sweeping up-right) — the buyer's core concept, and a subtle growth cue.

export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="var(--brand)" />
      <path
        d="M9 22.5 L16 9.5 L23 22.5"
        stroke="#fff"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path d="M13 22.5 L19 22.5" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" opacity="0.55" />
    </svg>
  );
}

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2 select-none">
      <LogoMark size={size} />
      <span className="text-[17px] font-semibold tracking-tight text-text">
        Angle<span className="text-brand">works</span>
      </span>
    </span>
  );
}
