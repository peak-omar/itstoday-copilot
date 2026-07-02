import type { PlatformId } from "./types";

/**
 * Platform specs encode the real constraints a media buyer works within:
 * copy fields + character limits, the creative format, and the policy themes
 * that most often get affiliate accounts flagged or banned. These drive both
 * the generation prompts and the compliance audit.
 */
export interface PlatformSpec {
  id: PlatformId;
  name: string;
  /** Short tag shown in the UI. */
  format: string;
  accent: string; // tailwind-friendly hex for the platform chip
  /** Ordered copy fields Claude must produce, with guidance + soft char limits. */
  fields: { key: string; label: string; limit: number; guidance: string }[];
  /** Voice/style guidance specific to how creative performs here. */
  styleNotes: string;
  /** Policy themes that most commonly trip up affiliate ads on this platform. */
  policyThemes: string[];
}

export const PLATFORMS: Record<PlatformId, PlatformSpec> = {
  meta: {
    id: "meta",
    name: "Meta (FB/IG)",
    format: "Feed image ad",
    accent: "#1877F2",
    fields: [
      { key: "primaryText", label: "Primary text", limit: 125, guidance: "Hook in first 125 chars before 'See more' cut-off." },
      { key: "headline", label: "Headline", limit: 40, guidance: "Punchy benefit or curiosity." },
      { key: "description", label: "Description", limit: 30, guidance: "Supporting line under headline." },
    ],
    styleNotes:
      "Scroll-stopping, conversational, benefit-led. Native to the feed, not salesy. Emojis sparingly.",
    policyThemes: [
      "Personal health/medical claims ('cure', 'treat', disease names)",
      "Implying knowledge of personal attributes ('Are you overweight?')",
      "Unrealistic income/results claims and guarantees",
      "Before/after imagery and idealized body claims",
      "Sensational or shocking language",
    ],
  },
  tiktok: {
    id: "tiktok",
    name: "TikTok",
    format: "UGC video",
    accent: "#010101",
    fields: [
      { key: "hook", label: "Hook (0-3s)", limit: 90, guidance: "The scroll-stopper spoken/shown in first 3 seconds." },
      { key: "script", label: "Script (15-30s)", limit: 600, guidance: "Beat-by-beat UGC script, native and un-polished." },
      { key: "caption", label: "Caption", limit: 100, guidance: "Casual caption with a soft CTA." },
    ],
    styleNotes:
      "Native, authentic, creator-first. Feels like advice from a friend, not an ad. Trend-aware, fast cuts.",
    policyThemes: [
      "Misleading or exaggerated claims",
      "Weight-loss / body-image and prohibited health claims",
      "Before/after and unrealistic results",
      "Financial 'get rich quick' claims",
    ],
  },
  taboola: {
    id: "taboola",
    name: "Taboola",
    format: "Native discovery",
    accent: "#04BF9D",
    fields: [
      { key: "headline", label: "Headline", limit: 70, guidance: "Curiosity-gap native headline; reads like editorial, not an ad." },
      { key: "branding", label: "Branding text", limit: 25, guidance: "Source/brand shown under headline." },
    ],
    styleNotes:
      "Editorial 'discovery' tone. Curiosity gap that earns the click without being clickbait-banned. Reads like a news teaser.",
    policyThemes: [
      "Deceptive clickbait and 'shocking' claims",
      "Before/after imagery",
      "Misleading health, financial or miracle claims",
      "Sensitive 'you'-targeting of conditions",
    ],
  },
  google: {
    id: "google",
    name: "Google (RSA)",
    format: "Responsive search ad",
    accent: "#EA4335",
    fields: [
      { key: "headline1", label: "Headline 1", limit: 30, guidance: "Include primary intent keyword." },
      { key: "headline2", label: "Headline 2", limit: 30, guidance: "Benefit or differentiator." },
      { key: "headline3", label: "Headline 3", limit: 30, guidance: "CTA or trust signal." },
      { key: "description1", label: "Description 1", limit: 90, guidance: "Expand the benefit + CTA." },
      { key: "description2", label: "Description 2", limit: 90, guidance: "Proof, offer, or urgency." },
    ],
    styleNotes:
      "Intent-matched and keyword-relevant. Clear, benefit-driven, trustworthy. No gimmicks — Google rewards relevance.",
    policyThemes: [
      "Unapproved supplement / health claims",
      "Misrepresentation and unrealistic guarantees",
      "Restricted financial claims",
      "Trademark and superlative ('#1', 'best') without proof",
    ],
  },
};

export const PLATFORM_ORDER: PlatformId[] = ["meta", "tiktok", "taboola", "google"];

export function platformSpec(id: PlatformId): PlatformSpec {
  return PLATFORMS[id];
}
