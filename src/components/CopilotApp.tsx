"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AnalyzeResult, Angle, Creative, CreativesResult, OfferBrief, PlatformId } from "@/lib/types";
import { PLATFORM_ORDER, platformSpec } from "@/lib/platforms";
import { creativesToCsv, downloadCsv } from "@/lib/csv";
import { DEMO_OFFER_URL } from "@/lib/demo";
import { HistoryEntry, loadHistory, relativeTime, upsertEntry } from "@/lib/history";
import { AppShell } from "./AppShell";
import { BriefCard } from "./BriefCard";
import { AngleCard } from "./AngleCard";
import { CreativeCard } from "./CreativeCard";
import { ProgressSteps } from "./ProgressSteps";
import { Icon } from "./Icon";

function sortByPlatform(list: Creative[]): Creative[] {
  return [...list].sort((a, b) => PLATFORM_ORDER.indexOf(a.platform) - PLATFORM_ORDER.indexOf(b.platform));
}

export function CopilotApp() {
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [showText, setShowText] = useState(false);
  const [platforms, setPlatforms] = useState<PlatformId[]>([...PLATFORM_ORDER]);

  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalyzeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [selectedAngle, setSelectedAngle] = useState<string | null>(null);
  const [creativesByAngle, setCreativesByAngle] = useState<Record<string, Creative[]>>({});
  const [creativesLoading, setCreativesLoading] = useState(false);
  const [regenerating, setRegenerating] = useState<PlatformId | null>(null);

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => setHistory(loadHistory()), []);

  const currentAngle = analysis?.angles.find((a) => a.id === selectedAngle) ?? null;

  const persist = useCallback(
    (a: AnalyzeResult, byAngle: Record<string, Creative[]>, id: string) => {
      setHistory((cur) => {
        const existing = cur.find((e) => e.id === id);
        return upsertEntry(cur, {
          id,
          label: a.brief.product,
          sourceUrl: a.brief.sourceUrl,
          createdAt: existing?.createdAt ?? Date.now(),
          analysis: a,
          creativesByAngle: byAngle,
        });
      });
    },
    []
  );

  const fetchCreatives = useCallback(
    async (brief: OfferBrief, angle: Angle, targets: PlatformId[]): Promise<Creative[]> => {
      const res = await fetch("/api/creatives", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ brief, angle, platforms: targets }),
      });
      const data = (await res.json()) as CreativesResult & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Creative generation failed.");
      return data.creatives;
    },
    []
  );

  // Ensure the selected angle has creatives for every currently-enabled platform,
  // fetching only the missing ones and preserving any edits already made.
  const ensureCoverage = useCallback(
    async (angle: Angle, brief: OfferBrief, entryId: string) => {
      const cached = creativesByAngle[angle.id] ?? [];
      const missing = platforms.filter((p) => !cached.some((c) => c.platform === p));
      if (missing.length === 0) return;
      setCreativesLoading(true);
      setError(null);
      try {
        const fresh = await fetchCreatives(brief, angle, missing);
        setCreativesByAngle((cur) => {
          const merged = sortByPlatform([...(cur[angle.id] ?? []), ...fresh]);
          const next = { ...cur, [angle.id]: merged };
          if (analysis) persist({ ...analysis, brief }, next, entryId);
          return next;
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Creative generation failed.");
      } finally {
        setCreativesLoading(false);
      }
    },
    [creativesByAngle, platforms, fetchCreatives, analysis, persist]
  );

  async function runAnalyze(demoOffer = false) {
    setError(null);
    setAnalyzing(true);
    setAnalysis(null);
    setSelectedAngle(null);
    setCreativesByAngle({});
    try {
      const body = demoOffer ? { url: DEMO_OFFER_URL } : showText && text.trim() ? { text } : { url };
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as AnalyzeResult & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Analysis failed.");

      const id = String(Date.now());
      setActiveId(id);
      setAnalysis(data);
      persist(data, {}, id);

      if (data.angles[0]) {
        setSelectedAngle(data.angles[0].id);
        await ensureCoverageFresh(data.angles[0], data.brief, id, data);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setAnalyzing(false);
    }
  }

  // Coverage helper used right after analyze, when state hasn't settled yet.
  async function ensureCoverageFresh(angle: Angle, brief: OfferBrief, id: string, a: AnalyzeResult) {
    setCreativesLoading(true);
    try {
      const fresh = sortByPlatform(await fetchCreatives(brief, angle, platforms));
      setCreativesByAngle((cur) => {
        const next = { ...cur, [angle.id]: fresh };
        persist(a, next, id);
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Creative generation failed.");
    } finally {
      setCreativesLoading(false);
    }
  }

  function selectAngle(angle: Angle) {
    setSelectedAngle(angle.id);
    if (analysis && activeId) ensureCoverage(angle, analysis.brief, activeId);
  }

  // Fill newly-enabled platforms for the current angle.
  useEffect(() => {
    if (currentAngle && analysis && activeId && !analyzing) {
      ensureCoverage(currentAngle, analysis.brief, activeId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platforms]);

  function updateCreative(updated: Creative) {
    if (!selectedAngle) return;
    setCreativesByAngle((cur) => {
      const next = {
        ...cur,
        [selectedAngle]: (cur[selectedAngle] ?? []).map((c) => (c.platform === updated.platform ? updated : c)),
      };
      if (analysis && activeId) persist(analysis, next, activeId);
      return next;
    });
  }

  async function regenerate(platform: PlatformId) {
    if (!currentAngle || !analysis) return;
    setRegenerating(platform);
    try {
      const [fresh] = await fetchCreatives(analysis.brief, currentAngle, [platform]);
      if (fresh) updateCreative(fresh);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Regeneration failed.");
    } finally {
      setRegenerating(null);
    }
  }

  function togglePlatform(p: PlatformId) {
    setPlatforms((cur) =>
      cur.includes(p) ? cur.filter((x) => x !== p) : PLATFORM_ORDER.filter((o) => cur.includes(o) || o === p)
    );
  }

  function restore(entry: HistoryEntry) {
    setAnalysis(entry.analysis);
    setCreativesByAngle(entry.creativesByAngle);
    setActiveId(entry.id);
    setError(null);
    const firstWith = Object.keys(entry.creativesByAngle)[0] ?? entry.analysis.angles[0]?.id ?? null;
    setSelectedAngle(firstWith);
  }

  function newCampaign() {
    setAnalysis(null);
    setSelectedAngle(null);
    setCreativesByAngle({});
    setActiveId(null);
    setError(null);
    setUrl("");
    setText("");
  }

  const shown = selectedAngle ? creativesByAngle[selectedAngle] : undefined;
  const shownFiltered = useMemo(
    () => (shown ? sortByPlatform(shown.filter((c) => platforms.includes(c.platform))) : []),
    [shown, platforms]
  );

  const campaignScore = useMemo(() => {
    if (shownFiltered.length === 0) return null;
    return Math.round(shownFiltered.reduce((s, c) => s + c.compliance.score, 0) / shownFiltered.length);
  }, [shownFiltered]);

  const canAnalyze = (showText ? text.trim().length > 20 : url.trim().length > 4) && !analyzing;

  return (
    <AppShell
      right={
        <>
          {analysis?.demo && (
            <span className="hidden items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-muted sm:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-warning" /> Demo data
            </span>
          )}
          {analysis && (
            <button
              onClick={newCampaign}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-text transition hover:border-brand/40"
            >
              <Icon name="plus" className="h-4 w-4" /> New
            </button>
          )}
        </>
      }
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        {!analysis && (
          <div className="mx-auto mb-7 max-w-2xl text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-text sm:text-3xl">
              Turn any offer into launch-ready ads — compliant by default
            </h1>
            <p className="mx-auto mt-2 max-w-xl text-sm text-muted">
              Paste an affiliate offer and get angles, platform-native copy, creative concepts and a policy audit for
              Meta, TikTok, Taboola and Google in one pass.
            </p>
          </div>
        )}

        {/* Input */}
        <div className="rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-5">
          {!showText ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && canAnalyze && runAnalyze()}
                placeholder="Paste an affiliate offer or landing page URL…"
                className="flex-1 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm outline-none placeholder:text-muted focus:border-brand focus:ring-2 focus:ring-brand/15"
              />
              <button
                onClick={() => runAnalyze()}
                disabled={!canAnalyze}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:opacity-40"
              >
                {analyzing ? "Analyzing…" : "Generate campaign"}
                {!analyzing && <Icon name="arrowRight" className="h-4 w-4" />}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Describe the offer: product, benefits, who it's for…"
                rows={3}
                className="w-full resize-none rounded-lg border border-border bg-surface px-4 py-2.5 text-sm outline-none placeholder:text-muted focus:border-brand focus:ring-2 focus:ring-brand/15"
              />
              <button
                onClick={() => runAnalyze()}
                disabled={!canAnalyze}
                className="inline-flex items-center justify-center gap-1.5 self-end rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:opacity-40"
              >
                {analyzing ? "Analyzing…" : "Generate campaign"}
              </button>
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
            <button onClick={() => setShowText((s) => !s)} className="text-muted hover:text-text">
              {showText ? "Use a URL instead" : "No URL? Describe the offer"}
            </button>
            <button onClick={() => runAnalyze(true)} className="inline-flex items-center gap-1 font-medium text-brand hover:underline">
              <Icon name="sparkles" className="h-3.5 w-3.5" /> Try an example offer
            </button>
            <div className="ml-auto flex flex-wrap items-center gap-1.5">
              <span className="text-muted">Platforms</span>
              {PLATFORM_ORDER.map((p) => {
                const on = platforms.includes(p);
                const spec = platformSpec(p);
                return (
                  <button
                    key={p}
                    onClick={() => togglePlatform(p)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                      on ? "border-transparent bg-brand-soft text-brand" : "border-border text-muted hover:text-text"
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: on ? spec.accent : "var(--border-strong)" }} />
                    {spec.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Recent campaigns */}
        {!analysis && history.length > 0 && (
          <div className="mt-6">
            <div className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
              <Icon name="clock" className="h-3.5 w-3.5" /> Recent campaigns
            </div>
            <div className="flex flex-wrap gap-2">
              {history.map((e) => (
                <button
                  key={e.id}
                  onClick={() => restore(e)}
                  className="group flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-left text-sm transition hover:border-brand/40 hover:shadow-sm"
                >
                  <span className="font-medium text-text">{e.label}</span>
                  <span className="text-xs text-muted">{relativeTime(e.createdAt)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-[color:var(--danger)]/25 bg-danger-soft px-4 py-3 text-sm text-danger">
            <Icon name="warning" className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {analyzing && !analysis && (
          <div className="mt-6">
            <ProgressSteps labels={["Reading the offer", "Extracting the brief", "Finding angles"]} />
          </div>
        )}

        {analysis && (
          <div className="mt-8 space-y-8">
            {analysis.demo && (
              <div className="flex items-start gap-2 rounded-lg border border-border bg-surface-2 px-4 py-3 text-sm text-muted">
                <Icon name="sparkles" className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                <span>
                  You&apos;re viewing sample data. Connect an API key to generate live campaigns from any real offer URL.
                </span>
              </div>
            )}

            <section className="animate-fade-up">
              <SectionTitle title="Campaign brief" />
              <div className="mt-3">
                <BriefCard brief={analysis.brief} />
              </div>
            </section>

            <section className="animate-fade-up">
              <SectionTitle title="Marketing angles" hint="Pick one to generate creatives" />
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {analysis.angles.map((angle) => (
                  <AngleCard
                    key={angle.id}
                    angle={angle}
                    selected={selectedAngle === angle.id}
                    loading={creativesLoading && selectedAngle === angle.id}
                    onSelect={() => selectAngle(angle)}
                  />
                ))}
              </div>
            </section>

            <section className="animate-fade-up">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <SectionTitle
                  title="Launch-ready creatives"
                  hint={currentAngle ? `Angle: ${currentAngle.name}` : undefined}
                />
                <div className="flex items-center gap-3">
                  {campaignScore !== null && <CampaignScore score={campaignScore} />}
                  {shownFiltered.length > 0 && <ExportBar creatives={shownFiltered} />}
                </div>
              </div>

              {creativesLoading && shownFiltered.length === 0 ? (
                <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {platforms.map((p) => (
                    <div key={p} className="h-96 skeleton rounded-xl" />
                  ))}
                </div>
              ) : shownFiltered.length > 0 ? (
                <div className="mt-3 grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {shownFiltered.map((c) => (
                    <CreativeCard
                      key={c.platform}
                      creative={c}
                      onChange={updateCreative}
                      onRegenerate={() => regenerate(c.platform)}
                      regenerating={regenerating === c.platform}
                    />
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted">Select an angle to generate creatives.</p>
              )}
            </section>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function ExportBar({ creatives }: { creatives: Creative[] }) {
  const groups = PLATFORM_ORDER.map((p) => ({ p, items: creatives.filter((c) => c.platform === p) })).filter(
    (g) => g.items.length > 0
  );
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {groups.map(({ p, items }) => (
        <button
          key={p}
          onClick={() => downloadCsv(`${p}-ads.csv`, creativesToCsv(items))}
          className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[11px] font-medium text-text transition hover:border-brand/40 hover:text-brand"
        >
          <Icon name="download" className="h-3.5 w-3.5" />
          {platformSpec(p).name}
        </button>
      ))}
    </div>
  );
}

function CampaignScore({ score }: { score: number }) {
  const tone = score >= 80 ? "text-success" : score >= 60 ? "text-warning" : "text-danger";
  return (
    <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs">
      <Icon name="shield" className={`h-4 w-4 ${tone}`} />
      <span className="text-muted">Compliance</span>
      <span className={`font-semibold tabular-nums ${tone}`}>{score}/100</span>
    </div>
  );
}

function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-text">{title}</h2>
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </div>
  );
}
