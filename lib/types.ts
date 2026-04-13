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

// ─── Cloud Map Sync Types ────────────────────────────────

export type NodeDataColor = "core" | "danger" | "ignored" | "neutral";
export type NodeDataSize = "small" | "medium" | "large";

export type NodeData = {
  id: string;
  label: string;
  size: NodeDataSize;
  color: NodeDataColor;
  mass: number;
};

export type EdgeData = {
  source: string;
  target: string;
  type: string;
  animated: boolean;
};

export interface DawayirMapState {
  id?: string;
  nodes: NodeData[];
  edges: EdgeData[];
  insight_message: string;
  detected_symptoms?: string[];
  metadata?: Record<string, unknown>;
}

export interface MapSyncPayload<TNode = any> {
  sessionId: string;
  nodes: TNode[];
  updatedAt: string;
  needsSync: boolean;
  lastError?: string | null;
}

export type MapSyncStatus = "idle" | "pending" | "syncing" | "synced" | "error" | "offline";

export type DawayirDomainEvent =
  | { type: "node_added"; nodeId: string; ring: string }
  | { type: "node_archived"; nodeId: string }
  | { type: "ring_changed"; nodeId: string; from: string; to: string }
  | { type: "detachment_toggled"; nodeId: string; value: boolean }
  | { type: "map_synced"; timestamp: string }
  | { type: "relational_snapshot_ready"; painIntensity: number };
