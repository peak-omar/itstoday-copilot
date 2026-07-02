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
                policy: { type: "string", description: "Specific platform policy it touches, cited by name." },
                severity: {
                  type: "string",
                  enum: ["rejection", "account-ban", "permanent-ban"],
                  description: "Consequence if shipped: ad rejected, account banned, or permanent ban.",
                },
                rewrite: { type: "string", description: "Compliant rewrite that keeps the persuasive intent." },
              },
              required: ["phrase", "reason", "policy", "severity", "rewrite"],
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

For every risky phrase, add a flag with the specific policy cited, a severity (rejection / account-ban / permanent-ban), and a compliant rewrite that preserves persuasion. Score 0-100 (higher = safer). If the copy is clean, return an empty flags array and a high score. Write copy that is compliant by design — persuasive without tripping policy.`;

  return { system: MARKETER_SYSTEM, prompt, schema, toolName: "submit_creative" as const };
}

/* -------------------------------------------------------------------------- */
/* Competitor teardown: reverse-engineer a live ad → beat-it brief + angles    */
/* -------------------------------------------------------------------------- */

export function buildTeardown(note?: string) {
  const schema = {
    type: "object",
    properties: {
      teardown: {
        type: "object",
        description: "Reverse-engineering of the competitor ad in the image.",
        properties: {
          platform: { type: "string", description: "The platform this ad most likely runs on." },
          angle: { type: "string", description: "The core marketing angle it leads with." },
          hook: { type: "string", description: "The specific hook / opening that stops the scroll." },
          targetEmotion: { type: "string", description: "The primary emotion it targets." },
          funnelStage: { type: "string", description: "Awareness stage it targets (unaware, problem-aware, solution-aware...)." },
          offer: { type: "string", description: "The product/offer and its promise as pitched." },
          whyItWorks: { type: "array", items: { type: "string" }, description: "3-4 concrete, transferable reasons this ad converts." },
          weaknesses: { type: "array", items: { type: "string" }, description: "2-3 gaps or weaknesses a competitor could exploit to beat it." },
        },
        required: ["platform", "angle", "hook", "targetEmotion", "funnelStage", "offer", "whyItWorks", "weaknesses"],
      },
      brief: {
        type: "object",
        description: "A campaign brief for a competing product, so we can generate a better ad.",
        properties: {
          product: { type: "string" },
          category: { type: "string" },
          valueProposition: { type: "string" },
          keyBenefits: { type: "array", items: { type: "string" } },
          targetAudience: { type: "string" },
          sensitiveClaims: { type: "array", items: { type: "string" } },
          toneNotes: { type: "string" },
        },
        required: ["product", "category", "valueProposition", "keyBenefits", "targetAudience", "sensitiveClaims", "toneNotes"],
      },
      angles: {
        type: "array",
        description: "4 'beat-it' angles engineered to outperform the competitor — some derived from what works, some exploiting its weaknesses.",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            psychology: { type: "string" },
            description: { type: "string" },
            bestPlatforms: {
              type: "array",
              items: { type: "string", enum: ["meta", "tiktok", "taboola", "google"] },
            },
          },
          required: ["name", "psychology", "description", "bestPlatforms"],
        },
      },
    },
    required: ["teardown", "brief", "angles"],
  };

  const prompt = `The attached image is a competitor's advertisement. You are spying on it to beat it.

${note ? `Buyer's note: ${note}\n` : ""}
1) Tear it down: reverse-engineer the angle, hook, target emotion, funnel stage, offer, WHY it works, and its weaknesses. Read the actual creative — headline, imagery, on-image text, tone.
2) Build a campaign brief for a competing product in the same category (infer a plausible product if we don't have one).
3) Propose 4 "beat-it" angles engineered to outperform this ad — lean into what makes it work, and attack its weaknesses. Make them genuinely distinct.`;

  return { system: MARKETER_SYSTEM, prompt, schema, toolName: "submit_teardown" as const };
}
