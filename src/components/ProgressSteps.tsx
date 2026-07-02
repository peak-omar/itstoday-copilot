"use client";

import { useEffect, useState } from "react";
import { Icon } from "./Icon";

/**
 * A self-advancing stepper shown while a request is in flight — reads as a real
 * pipeline working, not a generic spinner. Advances through labels on a timer
 * and holds on the last one until the request resolves and unmounts it.
 */
export function ProgressSteps({ labels }: { labels: string[] }) {
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setI((cur) => Math.min(cur + 1, labels.length - 1)), 850);
    return () => clearInterval(t);
  }, [labels.length]);

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 rounded-lg border border-border bg-surface px-4 py-3 text-sm shadow-sm">
      {labels.map((label, idx) => {
        const done = idx < i;
        const active = idx === i;
        return (
          <div key={label} className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 ${
                done ? "text-success" : active ? "text-text" : "text-muted"
              }`}
            >
              {done ? (
                <Icon name="check" className="h-3.5 w-3.5" />
              ) : (
                <span
                  className={`h-2 w-2 rounded-full ${active ? "bg-brand animate-pulse" : "bg-border-strong"}`}
                />
              )}
              {label}
            </span>
            {idx < labels.length - 1 && <span className="text-border-strong">→</span>}
          </div>
        );
      })}
    </div>
  );
}
