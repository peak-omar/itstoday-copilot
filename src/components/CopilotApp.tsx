"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AnalyzeResult, Angle, Creative, CreativesResult, OfferBrief, PlatformId } from "@/lib/types";
import { PLATFORM_ORDER, platformSpec } from "@/lib/platforms";
import { creativesToCsv, downloadCsv } from "@/lib/csv";
import { DEMO_OFFER_URL } from "@/lib/demo";
import { HistoryEntry, loadHistory, relativeTime, upsertEntry } from "@/lib/history";
import { AppShell } from "./AppShell";
import { BriefCard } from "./BriefCard";
import { TeardownCard } from "./TeardownCard";
import { AngleCard } from "./AngleCard";
import { CreativeCard } from "./CreativeCard";
import { ProgressSteps } from "./ProgressSteps";
import { Icon } from "./Icon";

type Mode = "offer" | "competitor";

function sortByPlatform(list: Creative[]): Creative[] {
  return [...list].sort((a, b) => PLATFORM_ORDER.indexOf(a.platform) - PLATFORM_ORDER.indexOf(b.platform));
}

function fileToBase64(file: File): Promise<{ base64: string; dataUrl: string; mime: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      resolve({ base64: dataUrl.split(",")[1], dataUrl, mime: file.type });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function CopilotApp() {
  const [mode, setMode] = useState<Mode>("offer");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [showText, setShowText] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [teardownImage, setTeardownImage] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

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
  const isTeardown = Boolean(analysis?.teardown);

  const persist = useCallback((a: AnalyzeResult, byAngle: Record<string, Creative[]>, id: string) => {
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
  }, []);

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

  async function applyAnalysis(data: AnalyzeResult) {
    const id = String(Date.now());
    setActiveId(id);
    setAnalysis(data);
    persist(data, {}, id);
    if (data.angles[0]) {
      setSelectedAngle(data.angles[0].id);
      await ensureCoverageFresh(data.angles[0], data.brief, id, data);
    }
  }

  function resetResults() {
    setError(null);
    setAnalyzing(true);
    setAnalysis(null);
    setSelectedAngle(null);
    setCreativesByAngle({});
  }

  async function runAnalyze(demoOffer = false) {
    resetResults();
    setTeardownImage(null);
    try {
      const body = demoOffer ? { url: DEMO_OFFER_URL } : showText && text.trim() ? { text } : { url };
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as AnalyzeResult & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Analysis failed.");
      await applyAnalysis(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function runTeardown(demo = false) {
    resetResults();
    try {
      let body: Record<string, unknown> = {};
      let img: string | null = null;
      if (!demo) {
        if (!file) throw new Error("Upload a competitor ad screenshot first.");
        const { base64, dataUrl, mime } = await fileToBase64(file);
        body = { imageBase64: base64, mimeType: mime, note };
        img = dataUrl;
      }
      const res = await fetch("/api/teardown", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as AnalyzeResult & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Teardown failed.");
      setTeardownImage(img);
      await applyAnalysis(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setAnalyzing(false);
    }
  }

  function selectAngle(angle: Angle) {
    setSelectedAngle(angle.id);
    if (analysis && activeId) ensureCoverage(angle, analysis.brief, activeId);
  }

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

  function pickFile(f: File | null) {
    if (!f) return;
    setFile(f);
    fileToBase64(f).then(({ dataUrl }) => setPreview(dataUrl));
  }

  function restore(entry: HistoryEntry) {
    setAnalysis(entry.analysis);
    setCreativesByAngle(entry.creativesByAngle);
    setActiveId(entry.id);
    setTeardownImage(null);
    setError(null);
    setSelectedAngle(Object.keys(entry.creativesByAngle)[0] ?? entry.analysis.angles[0]?.id ?? null);
  }

  function newCampaign() {
    setAnalysis(null);
    setSelectedAngle(null);
    setCreativesByAngle({});
    setActiveId(null);
    setError(null);
    setUrl("");
    setText("");
    setFile(null);
    setPreview(null);
    setNote("");
    setTeardownImage(null);
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

  const canRun =
    !analyzing && (mode === "offer" ? (showText ? text.trim().length > 20 : url.trim().length > 4) : Boolean(file));

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
              Spy on winners. Launch better ads. Keep your accounts.
            </h1>
            <p className="mx-auto mt-2 max-w-xl text-sm text-muted">
              Tear down a competitor&apos;s ad or start from an offer — Angleworks reverse-engineers what works and builds
              compliant, launch-ready creative for Meta, TikTok, Taboola and Google.
            </p>
          </div>
        )}

        {/* Input */}
        <div className="rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-5">
          {/* Mode switch */}
          <div className="mb-4 inline-flex rounded-lg border border-border bg-surface-2 p-0.5 text-sm">
            <ModeTab active={mode === "competitor"} onClick={() => setMode("competitor")} icon="sparkles">
              Teardown competitor ad
            </ModeTab>
            <ModeTab active={mode === "offer"} onClick={() => setMode("offer")} icon="link">
              Start from an offer
            </ModeTab>
          </div>

          {mode === "offer" ? (
            <OfferInput
              url={url}
              setUrl={setUrl}
              text={text}
              setText={setText}
              showText={showText}
              setShowText={setShowText}
              analyzing={analyzing}
              canRun={canRun}
              onRun={() => runAnalyze()}
              onExample={() => runAnalyze(true)}
            />
          ) : (
            <CompetitorInput
              preview={preview}
              note={note}
              setNote={setNote}
              analyzing={analyzing}
              canRun={canRun}
              fileInput={fileInput}
              onPick={pickFile}
              onRun={() => runTeardown()}
              onExample={() => runTeardown(true)}
              onClear={() => {
                setFile(null);
                setPreview(null);
              }}
            />
          )}

          <PlatformToggles platforms={platforms} onToggle={togglePlatform} />
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
                  className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-left text-sm transition hover:border-brand/40 hover:shadow-sm"
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
            <ProgressSteps
              labels={
                mode === "competitor"
                  ? ["Reading the ad", "Reverse-engineering the angle", "Building beat-it angles"]
                  : ["Reading the offer", "Extracting the brief", "Finding angles"]
              }
            />
          </div>
        )}

        {analysis && (
          <div className="mt-8 space-y-8">
            {analysis.demo && (
              <div className="flex items-start gap-2 rounded-lg border border-border bg-surface-2 px-4 py-3 text-sm text-muted">
                <Icon name="sparkles" className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                <span>You&apos;re viewing sample data. Connect an API key to run this live on any real ad or offer.</span>
              </div>
            )}

            {analysis.teardown && (
              <section className="animate-fade-up">
                <SectionTitle title="Intelligence" />
                <div className="mt-3">
                  <TeardownCard teardown={analysis.teardown} image={teardownImage} />
                </div>
              </section>
            )}

            <section className="animate-fade-up">
              <SectionTitle title={isTeardown ? "Your competing brief" : "Campaign brief"} />
              <div className="mt-3">
                <BriefCard brief={analysis.brief} />
              </div>
            </section>

            <section className="animate-fade-up">
              <SectionTitle
                title={isTeardown ? "Beat-it angles" : "Marketing angles"}
                hint="Pick one to generate creatives"
              />
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
                <SectionTitle title="Launch-ready creatives" hint={currentAngle ? `Angle: ${currentAngle.name}` : undefined} />
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

/* ---------------------------------- inputs --------------------------------- */

function ModeTab({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition ${
        active ? "bg-surface text-brand shadow-sm" : "text-muted hover:text-text"
      }`}
    >
      <Icon name={icon} className="h-4 w-4" />
      {children}
    </button>
  );
}

function OfferInput(props: {
  url: string;
  setUrl: (v: string) => void;
  text: string;
  setText: (v: string) => void;
  showText: boolean;
  setShowText: (f: (s: boolean) => boolean) => void;
  analyzing: boolean;
  canRun: boolean;
  onRun: () => void;
  onExample: () => void;
}) {
  const { url, setUrl, text, setText, showText, setShowText, analyzing, canRun, onRun, onExample } = props;
  return (
    <div className="flex flex-col gap-2">
      {!showText ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && canRun && onRun()}
            placeholder="Paste an affiliate offer or landing page URL…"
            className="flex-1 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm outline-none placeholder:text-muted focus:border-brand focus:ring-2 focus:ring-brand/15"
          />
          <RunButton analyzing={analyzing} canRun={canRun} onRun={onRun} label="Generate campaign" />
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
          <RunButton analyzing={analyzing} canRun={canRun} onRun={onRun} label="Generate campaign" />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <button onClick={() => setShowText((s) => !s)} className="text-muted hover:text-text">
          {showText ? "Use a URL instead" : "No URL? Describe the offer"}
        </button>
        <button onClick={onExample} className="inline-flex items-center gap-1 font-medium text-brand hover:underline">
          <Icon name="sparkles" className="h-3.5 w-3.5" /> Try an example offer
        </button>
      </div>
    </div>
  );
}

function CompetitorInput(props: {
  preview: string | null;
  note: string;
  setNote: (v: string) => void;
  analyzing: boolean;
  canRun: boolean;
  fileInput: React.RefObject<HTMLInputElement | null>;
  onPick: (f: File | null) => void;
  onRun: () => void;
  onExample: () => void;
  onClear: () => void;
}) {
  const { preview, note, setNote, analyzing, canRun, fileInput, onPick, onRun, onExample, onClear } = props;
  return (
    <div className="flex flex-col gap-3">
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
      />
      <div className="grid gap-3 sm:grid-cols-[200px_1fr]">
        <div
          onClick={() => fileInput.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            onPick(e.dataTransfer.files?.[0] ?? null);
          }}
          className="flex min-h-36 cursor-pointer items-center justify-center rounded-lg border border-dashed border-border-strong bg-surface-2 p-3 text-center transition hover:border-brand"
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Competitor ad" className="max-h-40 rounded-md object-contain" />
          ) : (
            <div className="text-xs text-muted">
              <div className="mb-1 font-medium text-text">Drop a competitor ad screenshot</div>
              or click to upload (Meta / TikTok / Taboola)
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional: what's the product/vertical, or what you want to beat…"
            rows={3}
            className="w-full resize-none rounded-lg border border-border bg-surface px-4 py-2.5 text-sm outline-none placeholder:text-muted focus:border-brand focus:ring-2 focus:ring-brand/15"
          />
          <div className="flex items-center gap-2">
            <RunButton analyzing={analyzing} canRun={canRun} onRun={onRun} label="Tear down & beat it" />
            {preview && (
              <button onClick={onClear} className="text-xs text-muted hover:text-text">
                Clear
              </button>
            )}
          </div>
        </div>
      </div>
      <button onClick={onExample} className="inline-flex items-center gap-1 self-start text-xs font-medium text-brand hover:underline">
        <Icon name="sparkles" className="h-3.5 w-3.5" /> Try an example teardown
      </button>
    </div>
  );
}

function RunButton({ analyzing, canRun, onRun, label }: { analyzing: boolean; canRun: boolean; onRun: () => void; label: string }) {
  return (
    <button
      onClick={onRun}
      disabled={!canRun}
      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:opacity-40"
    >
      {analyzing ? "Working…" : label}
      {!analyzing && <Icon name="arrowRight" className="h-4 w-4" />}
    </button>
  );
}

function PlatformToggles({ platforms, onToggle }: { platforms: PlatformId[]; onToggle: (p: PlatformId) => void }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border pt-3 text-xs">
      <span className="text-muted">Platforms</span>
      {PLATFORM_ORDER.map((p) => {
        const on = platforms.includes(p);
        const spec = platformSpec(p);
        return (
          <button
            key={p}
            onClick={() => onToggle(p)}
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
  );
}

/* --------------------------------- results --------------------------------- */

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
