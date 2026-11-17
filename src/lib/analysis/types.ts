export type PlaystyleId =
  | "awper"
  | "entry"
  | "support"
  | "clutch"
  | "consistent"
  | "impact"
  | "balanced";

export interface Playstyle {
  id: PlaystyleId;
  name: string;
  /** One line, second person. */
  tagline: string;
  /** Why we think this, grounded in the player's numbers. */
  reasons: string[];
  /** Short trait chips. */
  traits: string[];
  secondary: { id: PlaystyleId; name: string } | null;
  confidence: "high" | "medium" | "low";
}

export type InsightCategory =
  | "firepower"
  | "aim"
  | "conversion"
  | "opening"
  | "clutch"
  | "utility"
  | "map"
  | "form"
  | "consistency"
  | "winning";

export interface Insight {
  id: string;
  category: InsightCategory;
  kind: "strength" | "weakness";
  /** Short label, e.g. "Wins opening duels". */
  title: string;
  /** One or two plain sentences that explain the number. */
  detail: string;
  /** The key number(s), e.g. "56% opening duels won". */
  evidence: string;
  /** Sentence used by the coach summary. */
  coachLine: string;
  /** How strongly the data supports this (higher = more notable). */
  weight: number;
}

export interface FocusPlan {
  goal: string;
  why: string;
  /** Measurable target the player can check after their next matches. */
  target: { metric: string; current: string; goal: string } | null;
  tasks: string[];
  /** Insight this plan addresses. */
  insightId: string | null;
}

export interface PlayerReport {
  playstyle: Playstyle;
  strengths: Insight[];
  weaknesses: Insight[];
  summary: string[];
  focus: FocusPlan;
  /** Caveats about how much data the report is built on. */
  dataNotes: string[];
}
