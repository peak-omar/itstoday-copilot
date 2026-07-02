import type { AnalyzeResult, Creative, PlatformId, Teardown } from "./types";

/**
 * A fully-formed example campaign so the deployed URL is impressive even with
 * no ANTHROPIC_API_KEY set. Vertical: a nutra (blood-sugar support) offer —
 * a real affiliate staple that also showcases the compliance engine, because
 * health copy is exactly what gets accounts banned.
 */

export const DEMO_OFFER_URL = "https://example-offers.com/glucoguard";

export const DEMO_ANALYZE: AnalyzeResult = {
  demo: true,
  brief: {
    product: "GlucoGuard",
    category: "Nutra — blood sugar support supplement",
    valueProposition:
      "A plant-based daily capsule that helps support healthy blood sugar levels and steady energy.",
    keyBenefits: [
      "Supports healthy blood sugar already in the normal range",
      "Helps reduce afternoon energy crashes",
      "Plant-based, non-GMO, made in a GMP-certified facility",
      "Reduces cravings for sugary snacks",
    ],
    targetAudience:
      "Adults 45-65, health-conscious but time-poor, worried about their blood sugar after a checkup or family history.",
    sensitiveClaims: [
      "Implied treatment/cure of diabetes",
      "'Reverse blood sugar problems' outcome language",
      "Before/after body transformation implications",
    ],
    toneNotes: "Reassuring, science-backed, empathetic. Speaks to worry without fear-mongering.",
    sourceUrl: DEMO_OFFER_URL,
  },
  angles: [
    {
      id: "angle-doctor",
      name: "The Doctor's Overlooked Nutrient",
      psychology: "Authority + curiosity gap",
      description:
        "Frames a specific plant compound most doctors don't mention as the missing piece for steady blood sugar.",
      bestPlatforms: ["taboola", "meta"],
    },
    {
      id: "angle-3pm",
      name: "The 3PM Crash",
      psychology: "Problem-agitate-solve",
      description:
        "Opens on the universal afternoon energy crash and reframes it as a blood-sugar swing, then offers the fix.",
      bestPlatforms: ["tiktok", "meta"],
    },
    {
      id: "angle-checkup",
      name: "After the Checkup",
      psychology: "Fear-of-loss + relief",
      description:
        "Speaks to the moment after a worrying doctor's visit and offers a proactive daily habit to feel in control.",
      bestPlatforms: ["meta", "google"],
    },
    {
      id: "angle-cravings",
      name: "Kill the Sugar Cravings",
      psychology: "Aspiration + tangible benefit",
      description:
        "Leads with breaking the sugar-craving cycle — a concrete, relatable daily win rather than a medical promise.",
      bestPlatforms: ["tiktok", "taboola"],
    },
  ],
};

function demoCreative(platform: PlatformId): Creative {
  switch (platform) {
    case "meta":
      return {
        platform,
        fields: {
          primaryText:
            "That 3PM crash isn't just tiredness — it's often your blood sugar swinging. A simple plant-based habit helps keep it steady all afternoon. 🌿",
          headline: "Steady Energy, All Day",
          description: "Plant-based daily support",
        },
        variants: [
          "Tired of the afternoon slump? It might be your blood sugar talking.",
          "One small morning habit for steadier energy after lunch.",
        ],
        imageConcept:
          "Warm kitchen scene, 50-something woman smiling with tea and a capsule bottle on the counter, soft morning light. Overlay: 'Steady all day'. No before/after framing.",
        compliance: {
          risk: "low",
          score: 88,
          summary: "Clean — benefit stays within 'support healthy levels', no disease claims.",
          flags: [
            {
              phrase: "keep it steady all afternoon",
              reason: "Borderline outcome guarantee; soften to avoid implying a promised result.",
              policy: "Meta: Unrealistic results / guarantees",
              severity: "rejection",
              rewrite: "help support steady energy through the afternoon",
            },
          ],
        },
      };
    case "tiktok":
      return {
        platform,
        fields: {
          hook: "POV: it's 3PM and you're face-down on your desk again 😩",
          script:
            "[0-3s] Face to camera, tired: 'Why am I like this every afternoon?'\n[3-8s] 'Turns out my afternoon crash was a blood sugar swing.'\n[8-18s] Show morning routine: water + one capsule. 'I started supporting my levels with a plant-based thing every morning.'\n[18-25s] Energetic at desk: 'Two weeks in, no more 3PM zombie mode.'\n[25-30s] 'Not medical advice — just what worked for me. Link's up top.'",
          caption: "the 3pm crash was NOT the personality trait i thought it was 🧟",
        },
        variants: [
          "nobody warned me the afternoon slump had a fix",
          "trying the thing my aunt won't stop talking about",
        ],
        imageConcept:
          "Vertical UGC selfie video, natural light, unpolished. Creator at desk then in kitchen. Trending audio, on-screen captions.",
        compliance: {
          risk: "low",
          score: 84,
          summary: "Native and low-risk; disclaimer included. Keep results anecdotal.",
          flags: [
            {
              phrase: "no more 3PM zombie mode",
              reason: "Personal results claim — fine as testimonial but keep it clearly anecdotal.",
              policy: "TikTok: Exaggerated/health results",
              severity: "rejection",
              rewrite: "my afternoons have felt a lot easier (just my experience)",
            },
          ],
        },
      };
    case "taboola":
      return {
        platform,
        fields: {
          headline: "The Overlooked Nutrient Some Doctors Rarely Mention for Blood Sugar",
          branding: "Health Insider",
        },
        variants: [
          "Why Afternoon Energy Crashes May Start With Your Blood Sugar",
          "A Simple Morning Habit Gaining Attention Among Adults Over 45",
        ],
        imageConcept:
          "Editorial-style photo of leafy plant extract and capsules on a clean surface, magazine lighting. Looks like a news article thumbnail, not an ad.",
        compliance: {
          risk: "medium",
          score: 71,
          summary: "Curiosity gap is fine, but 'doctors rarely mention' edges toward misleading authority.",
          flags: [
            {
              phrase: "Some Doctors Rarely Mention",
              reason: "Implied medical authority/conspiracy framing can be flagged as misleading.",
              policy: "Taboola: Misleading / deceptive claims",
              severity: "account-ban",
              rewrite: "A Plant Nutrient Getting Attention for Healthy Blood Sugar",
            },
          ],
        },
      };
    case "google":
      return {
        platform,
        fields: {
          headline1: "Blood Sugar Support",
          headline2: "Plant-Based Daily Formula",
          headline3: "Shop GlucoGuard Today",
          description1:
            "Support healthy blood sugar already in the normal range with a plant-based daily capsule.",
          description2: "Non-GMO, GMP-certified facility. Free shipping on your first order.",
        },
        variants: ["Healthy Blood Sugar Support", "Steady Energy, Naturally"],
        imageConcept: "N/A — responsive search ad (text only).",
        compliance: {
          risk: "low",
          score: 90,
          summary: "Compliant: uses 'support healthy levels', no disease or cure language.",
          flags: [],
        },
      };
  }
}

export function demoCreatives(platforms: PlatformId[]): Creative[] {
  return platforms.map(demoCreative);
}

/** Sample teardown so the competitor-ad flow works with no API key. */
const DEMO_TEARDOWN: Teardown = {
  platform: "Meta (Facebook/Instagram)",
  angle: "Fear-based authority — 'the #1 ingredient your doctor won't tell you about'",
  hook: "Bold before/after imagery + 'Doctors are stunned' overlay to stop the scroll",
  targetEmotion: "Fear and distrust of the medical system, plus hope",
  funnelStage: "Problem-aware — knows their blood sugar is a concern, not yet solution-aware",
  offer: "SugarShield — a blood-sugar supplement promising to 'reverse' sugar problems in 30 days",
  whyItWorks: [
    "Authority + conspiracy framing ('doctors won't tell you') creates a curiosity gap",
    "Concrete 30-day timeframe makes the promise feel tangible",
    "Strong pattern-interrupt visual stops the scroll in a health-anxious audience",
  ],
  weaknesses: [
    "'Reverse' and before/after are hard policy violations — this account is one report from a ban",
    "Fear framing erodes trust; a reassurance angle can win the same audience more durably",
    "No specific mechanism — a 'how it works' angle can out-credibility it",
  ],
};

export const DEMO_TEARDOWN_RESULT: AnalyzeResult = {
  demo: true,
  teardown: DEMO_TEARDOWN,
  brief: {
    ...DEMO_ANALYZE.brief,
    valueProposition:
      "A plant-based daily capsule that supports healthy blood sugar — the credible, compliant answer to fear-based competitor ads.",
  },
  angles: [
    {
      id: "angle-mechanism",
      name: "The Mechanism They Skip",
      psychology: "Credibility + curiosity",
      description:
        "Beats the competitor's vague 'reverse' promise by explaining the actual plant mechanism — out-credibilities fear-bait.",
      bestPlatforms: ["taboola", "meta"],
    },
    {
      id: "angle-reassurance",
      name: "Calm, Not Scared",
      psychology: "Reassurance vs. fear",
      description:
        "Wins the same anxious audience with an empathetic, in-control tone instead of fear — more durable and far safer.",
      bestPlatforms: ["meta", "google"],
    },
    {
      id: "angle-doctor-built",
      name: "Actually Doctor-Formulated",
      psychology: "Authority (earned)",
      description:
        "Flips the 'doctors won't tell you' conspiracy into genuine, compliant authority — credibility that lasts.",
      bestPlatforms: ["google", "meta"],
    },
    {
      id: "angle-daily-habit",
      name: "The 30-Second Morning Habit",
      psychology: "Simplicity + tangible action",
      description:
        "Reframes from a medical promise to an easy daily habit — relatable, low-risk, and highly compliant.",
      bestPlatforms: ["tiktok", "taboola"],
    },
  ],
};
