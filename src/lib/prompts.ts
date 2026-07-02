import type { Angle, OfferBrief, PlatformId } from "./types";
import { platformSpec } from "./platforms";

/**
 * Prompt + schema builders. All model calls go through forced tool-use, so each
 * builder returns the tool schema alongside the system/prompt text.
 */

const MARKETER_SYSTEM = `You are a world-class direct-response media buyer at a high-volume affiliate marketing company. You advertise at scale across Google, Meta, Taboola and TikTok and live and die by CTR, CVR and — critically — by keeping ad accounts alive. You think in angles, hooks and compliance risk. You are concrete, punchy and never generic. You never invent facts about the product that the source material doesn't support.`;

/* -------------------------------------------------------------------------- */
/* Stage 1: analyze the offer → brief + angles                                */
/* -------------------------------------------------------------------------- */

export function buildAnalyze(input: { title?: string; text: string; sourceUrl?: string }) {
  const schema = {
    type: "object",
    properties: {
      brief: {
        type: "object",
        properties: {
          product: { type: "string", description: "Product/offer name." },
          category: { type: "string", description: "Vertical, e.g. 'Nutra — blood sugar support'." },
          valueProposition: { type: "string", description: "One-sentence core promise." },
          keyBenefits: { type: "array", items: { type: "string" }, description: "3-5 concrete benefits." },
          targetAudience: { type: "string", description: "Who this is for, specifically." },
          sensitiveClaims: {
            type: "array",
            items: { type: "string" },
            description: "Claims an ad platform or regulator would scrutinize (health, income, guarantees).",
          },
          toneNotes: { type: "string", description: "Voice/tone the creative should adopt." },
        },
        required: ["product", "category", "valueProposition", "keyBenefits", "targetAudience", "sensitiveClaims", "toneNotes"],
      },
      angles: {
        type: "array",
        description: "4 distinct, high-contrast marketing angles a media buyer would actually test.",
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: "Short memorable angle name." },
            psychology: { type: "string", description: "The psychological driver (curiosity, fear-of-loss, aspiration, social proof, problem-agitate...)." },
            description: { type: "string", description: "How the angle is executed, in 1-2 sentences." },
            bestPlatforms: {
              type: "array",
              items: { type: "string", enum: ["meta", "tiktok", "taboola", "google"] },
              description: "Platforms where this angle tends to win.",
            },
          },
          required: ["name", "psychology", "description", "bestPlatforms"],
        },
      },
    },
    required: ["brief", "angles"],
  };

  const prompt = `Analyze this offer for a paid-media campaign.

${input.sourceUrl ? `Source URL: ${input.sourceUrl}\n` : ""}${input.title ? `Page title: ${input.title}\n` : ""}
--- OFFER SOURCE MATERIAL ---
${input.text}
--- END ---

1) Extract a tight campaign brief. Be specific; only use what the source supports. In "sensitiveClaims", flag anything that could get an ad rejected or an account banned (disease/health claims, income promises, guarantees, superlatives).
2) Propose 4 genuinely distinct angles a media buyer would split-test — different psychological drivers, not four flavors of the same idea.`;

  return { system: MARKETER_SYSTEM, prompt, schema, toolName: "submit_analysis" as const };
}

/* -------------------------------------------------------------------------- */
/* Stage 2: for one angle + platform → ad creative WITH self-audited compliance */
/* -------------------------------------------------------------------------- */

export function buildCreative(brief: OfferBrief, angle: Angle, platform: PlatformId) {
  const spec = platformSpec(platform);
  const fieldList = spec.fields
    .map((f) => `  - "${f.key}" (${f.label}, aim ≤ ${f.limit} chars): ${f.guidance}`)
    .join("\n");

  const schema = {
    type: "object",
    properties: {
      fields: {
        type: "object",
        description: `Copy fields for ${spec.name}. Keys required: ${spec.fields.map((f) => f.key).join(", ")}.`,
        properties: Object.fromEntries(spec.fields.map((f) => [f.key, { type: "string" }])),
        required: spec.fields.map((f) => f.key),
      },
      variants: {
        type: "array",
        items: { type: "string" },
        description: "2 alternate primary-hook variants for A/B testing.",
      },
      imageConcept: {
        type: "string",
        description: "Art-direction brief for the visual: subject, composition, mood, text overlay. 1-2 sentences.",
      },
      compliance: {
        type: "object",
        description: "Self-audit of the copy you just wrote against this platform's ad policy.",
        properties: {
          risk: { type: "string", enum: ["low", "medium", "high"] },
          score: { type: "number", description: "0-100, higher = safer." },
          summary: { type: "string", description: "One-line verdict." },
          flags: {
            type: "array",
            items: {
              type: "object",
              properties: {
                phrase: { type: "string", description: "The exact risky phrase from the copy." },
                reason: { type: "string", description: "Why it risks rejection/ban." },
                policy: { type: "string", description: "Platform + policy theme it touches." },
                rewrite: { type: "string", description: "Compliant rewrite that keeps the persuasive intent." },
              },
              required: ["phrase", "reason", "policy", "rewrite"],
            },
          },
        },
        required: ["risk", "score", "summary", "flags"],
      },
    },
    required: ["fields", "imageConcept", "compliance"],
  };

  const prompt = `Write a launch-ready ${spec.name} ad.

PRODUCT: ${brief.product} — ${brief.valueProposition}
CATEGORY: ${brief.category}
AUDIENCE: ${brief.targetAudience}
KEY BENEFITS: ${brief.keyBenefits.join("; ")}
KNOWN SENSITIVE CLAIMS: ${brief.sensitiveClaims.join("; ") || "none noted"}

ANGLE — "${angle.name}" (${angle.psychology}): ${angle.description}

FORMAT: ${spec.format}. ${spec.styleNotes}

Produce these fields:
${fieldList}

Then AUDIT your own copy against ${spec.name}'s policy. High-risk themes on this platform:
${spec.policyThemes.map((t) => `  • ${t}`).join("\n")}

For every risky phrase, add a flag with a compliant rewrite that preserves persuasion. Score 0-100 (higher = safer). If the copy is clean, return an empty flags array and a high score. Write copy that is compliant by design — persuasive without tripping policy.`;

  return { system: MARKETER_SYSTEM, prompt, schema, toolName: "submit_creative" as const };
}
