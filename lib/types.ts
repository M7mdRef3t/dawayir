/**
 * Dawayir SDK — Core Types
 * Relationship mapping engine types.
 */

export type Ring = "red" | "yellow" | "green";

export type EdgeType = "draining" | "stable" | "ignored" | "conflict" | "nurturing";

export type NodeSize = "small" | "medium" | "large";

export interface DawayirNode {
  id: string;
  label: string;
  ring: Ring;
  score: number;          // 0-100 relationship health score
  tags: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
  /** Optional detailed health breakdown */
  health?: {
    communication: number;   // 0-100
    trust: number;           // 0-100
    reciprocity: number;     // 0-100
    safety: number;          // 0-100
    growth: number;          // 0-100
  };
}

export interface DawayirEdge {
  source: string;
  target: string;
  type: EdgeType;
  weight: number;          // 0-1 strength
  animated: boolean;
}

export interface DawayirGraph {
  nodes: DawayirNode[];
  edges: DawayirEdge[];
  metadata: {
    createdAt: string;
    updatedAt: string;
    version: string;
  };
}

/** Ring-level statistics */
export interface RingStats {
  red: number;
  yellow: number;
  green: number;
  archived: number;
  total: number;
}

/** Graph-level insights */
export interface GraphInsights {
  overallHealth: number;        // 0-100
  dominantRing: Ring;
  isolationRisk: boolean;
  drainingRatio: number;        // 0-1
  nurturingRatio: number;       // 0-1
  hiddenPatterns: HiddenPattern[];
  recommendation: string;
}

export interface HiddenPattern {
  kind: "over_dependency" | "emotional_drain" | "ghost_connection" | "mirror_trap" | "safe_harbor";
  description: string;
  affectedNodes: string[];
  severity: "low" | "medium" | "high";
}

export interface DawayirConfig {
  maxNodes?: number;
  enableAI?: boolean;
  locale?: "ar" | "en";
}
