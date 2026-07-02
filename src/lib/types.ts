// Shared domain types for Creative Ops Copilot.

export type PlatformId = "meta" | "tiktok" | "taboola" | "google";

/** Structured brief extracted from an offer page or pasted description. */
export interface OfferBrief {
  product: string;
  category: string;
  valueProposition: string;
  keyBenefits: string[];
  targetAudience: string;
  /** Claims a regulator/ad-platform might scrutinize (health, income, guarantees). */
  sensitiveClaims: string[];
  toneNotes: string;
  sourceUrl?: string;
}

/** A marketing angle — the psychological entry point an affiliate leads with. */
export interface Angle {
  id: string;
  name: string;
  /** The underlying psychological driver (curiosity, fear, aspiration...). */
  psychology: string;
  description: string;
  /** Platforms where this angle tends to perform best. */
  bestPlatforms: PlatformId[];
}

export type ComplianceRisk = "low" | "medium" | "high";

/** How badly a flag can hurt: a bounced ad vs. a dead account. */
export type ComplianceSeverity = "rejection" | "account-ban" | "permanent-ban";

export interface ComplianceFlag {
  phrase: string;
  reason: string;
  /** Which platform policy this touches, e.g. "Meta: Personal health claims". */
  policy: string;
  /** Consequence if it ships: ad rejected, account banned, or permanent ban. */
  severity: ComplianceSeverity;
  /** A compliant rewrite that keeps the persuasive intent. */
  rewrite: string;
  /** Set once the user applies the rewrite into the copy. */
  applied?: boolean;
}

export interface Compliance {
  risk: ComplianceRisk;
  /** 0-100, higher = safer. */
  score: number;
  summary: string;
  flags: ComplianceFlag[];
}

/** A single ready-to-launch ad for one platform. */
export interface Creative {
  platform: PlatformId;
  /** Platform-specific copy fields (headline, primaryText, script, etc.). */
  fields: Record<string, string>;
  /** Extra variants for A/B testing (e.g. alternate headlines). */
  variants?: string[];
  /** Art-direction brief for the visual — used to render a mockup or gen an image. */
  imageConcept: string;
  compliance: Compliance;
}

/** Reverse-engineering of a competitor's live ad from a screenshot. */
export interface Teardown {
  platform: string;
  angle: string;
  hook: string;
  targetEmotion: string;
  funnelStage: string;
  offer: string;
  /** Concrete reasons the ad works — the transferable lessons. */
  whyItWorks: string[];
  /** Weaknesses / gaps a competitor could exploit to beat it. */
  weaknesses: string[];
}

export interface AnalyzeResult {
  brief: OfferBrief;
  angles: Angle[];
  /** Present when the campaign was reverse-engineered from a competitor ad. */
  teardown?: Teardown;
  demo: boolean;
}

export interface CreativesResult {
  angleId: string;
  creatives: Creative[];
  demo: boolean;
}
