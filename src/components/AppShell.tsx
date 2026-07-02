import { Logo } from "./Logo";

export function AppShell({ right, children }: { right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-surface/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Logo />
          <div className="flex items-center gap-2">{right}</div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-5 text-xs text-muted">
          Angleworks — creative operations for media buyers.
        </div>
      </footer>
    </div>
  );
}
