import { NextResponse } from "next/server";
import { generateStructured, hasApiKey } from "@/lib/anthropic";
import { buildCreative } from "@/lib/prompts";
import { demoCreatives } from "@/lib/demo";
import { PLATFORM_ORDER } from "@/lib/platforms";
import type { Angle, Creative, CreativesResult, OfferBrief, PlatformId } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    brief?: OfferBrief;
    angle?: Angle;
    platforms?: PlatformId[];
  };

  const platforms =
    body.platforms && body.platforms.length > 0
      ? body.platforms.filter((p) => PLATFORM_ORDER.includes(p))
      : PLATFORM_ORDER;

  // No key → serve demo creatives so every angle still produces a full result.
  if (!hasApiKey()) {
    const result: CreativesResult = {
      angleId: body.angle?.id ?? "demo",
      creatives: demoCreatives(platforms),
      demo: true,
    };
    return NextResponse.json(result);
  }

  if (!body.brief || !body.angle) {
    return NextResponse.json({ error: "Missing brief or angle." }, { status: 400 });
  }
  const { brief, angle } = body;

  try {
    // Generate all platforms in parallel — each call also self-audits compliance.
    const creatives = await Promise.all(
      platforms.map(async (platform): Promise<Creative> => {
        const { system, prompt, schema, toolName } = buildCreative(brief, angle, platform);
        const out = await generateStructured<Omit<Creative, "platform">>({
          system,
          prompt,
          schema,
          toolName,
          maxTokens: 2000,
        });
        return { ...out, platform };
      })
    );

    const result: CreativesResult = { angleId: angle.id, creatives, demo: false };
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Creative generation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
