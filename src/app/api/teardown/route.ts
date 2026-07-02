import { NextResponse } from "next/server";
import { generateStructured, hasApiKey } from "@/lib/anthropic";
import { buildTeardown } from "@/lib/prompts";
import { DEMO_TEARDOWN_RESULT } from "@/lib/demo";
import type { AnalyzeResult, Angle, OfferBrief, Teardown } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const { imageBase64, mimeType, note } = (await req.json().catch(() => ({}))) as {
    imageBase64?: string;
    mimeType?: string;
    note?: string;
  };

  // No key → serve the sample teardown so the flow always works.
  if (!hasApiKey()) {
    return NextResponse.json(DEMO_TEARDOWN_RESULT);
  }

  if (!imageBase64) {
    return NextResponse.json({ error: "Upload a screenshot of the competitor ad." }, { status: 400 });
  }

  try {
    const { system, prompt, schema, toolName } = buildTeardown(note);
    const out = await generateStructured<{
      teardown: Teardown;
      brief: OfferBrief;
      angles: Omit<Angle, "id">[];
    }>({
      system,
      prompt,
      schema,
      toolName,
      maxTokens: 3500,
      images: [{ data: imageBase64, mediaType: mimeType ?? "image/png" }],
    });

    const result: AnalyzeResult = {
      demo: false,
      teardown: out.teardown,
      brief: out.brief,
      angles: out.angles.map((a, i) => ({ ...a, id: `angle-${i}` })),
    };
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Teardown failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
