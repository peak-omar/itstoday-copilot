import { NextResponse } from "next/server";
import { generateStructured, hasApiKey } from "@/lib/anthropic";
import { buildAnalyze } from "@/lib/prompts";
import { scrapeOffer } from "@/lib/scrape";
import { DEMO_ANALYZE } from "@/lib/demo";
import type { AnalyzeResult, Angle, OfferBrief } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const { url, text } = (await req.json().catch(() => ({}))) as {
    url?: string;
    text?: string;
  };

  // No key → serve the demo campaign so the deployed URL always works.
  if (!hasApiKey()) {
    return NextResponse.json(DEMO_ANALYZE);
  }

  if (!url && !text?.trim()) {
    return NextResponse.json({ error: "Provide an offer URL or a description." }, { status: 400 });
  }

  try {
    let title: string | undefined;
    let source = text?.trim() ?? "";

    if (url) {
      const scraped = await scrapeOffer(url);
      title = scraped.title;
      // Prefer scraped copy; fall back to any pasted text if the page was thin.
      source = scraped.text.length > 200 ? scraped.text : `${scraped.text}\n${source}`.trim();
    }

    if (source.length < 40) {
      return NextResponse.json(
        { error: "Couldn't read enough from that offer. Paste a description instead." },
        { status: 422 }
      );
    }

    const { system, prompt, schema, toolName } = buildAnalyze({ title, text: source, sourceUrl: url });
    const out = await generateStructured<{ brief: OfferBrief; angles: Omit<Angle, "id">[] }>({
      system,
      prompt,
      schema,
      toolName,
      maxTokens: 3000,
    });

    const result: AnalyzeResult = {
      demo: false,
      brief: { ...out.brief, sourceUrl: url },
      angles: out.angles.map((a, i) => ({ ...a, id: `angle-${i}` })),
    };
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analysis failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
