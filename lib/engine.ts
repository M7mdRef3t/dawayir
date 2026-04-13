/**
 * Dawayir SDK — Graph Engine
 * Pure functions for relationship graph analysis.
 */

import type {
  DawayirNode, DawayirEdge, DawayirGraph, Ring,
  RingStats, GraphInsights, HiddenPattern, EdgeType,
} from "./types";

/* ─── Node Operations ───────────────────────── */

export function createNode(
  label: string,
  ring: Ring = "yellow",
  score: number = 50,
): DawayirNode {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID?.() ?? `node-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    label,
    ring,
    score: Math.max(0, Math.min(100, score)),
    tags: [],
    notes: "",
    createdAt: now,
    updatedAt: now,
    archived: false,
  };
}

export function classifyRing(score: number): Ring {
  if (score < 35) return "red";
  if (score < 70) return "yellow";
  return "green";
}

export function autoClassifyNodes(nodes: DawayirNode[]): DawayirNode[] {
  return nodes.map(n => ({ ...n, ring: classifyRing(n.score) }));
}

/* ─── Edge Operations ───────────────────────── */

export function createEdge(
  source: string,
  target: string,
  type: EdgeType = "stable",
  weight: number = 0.5,
): DawayirEdge {
  return {
    source,
    target,
    type,
    weight: Math.max(0, Math.min(1, weight)),
    animated: type === "draining" || type === "conflict",
  };
}

/* ─── Graph Construction ────────────────────── */

export function createGraph(
  nodes: DawayirNode[] = [],
  edges: DawayirEdge[] = [],
): DawayirGraph {
  const now = new Date().toISOString();
  return {
    nodes,
    edges,
    metadata: { createdAt: now, updatedAt: now, version: "1.0.0" },
  };
}

/* ─── Statistics ────────────────────────────── */

export function getRingStats(nodes: DawayirNode[]): RingStats {
  const active = nodes.filter(n => !n.archived);
  return {
    red: active.filter(n => n.ring === "red").length,
    yellow: active.filter(n => n.ring === "yellow").length,
    green: active.filter(n => n.ring === "green").length,
    archived: nodes.filter(n => n.archived).length,
    total: nodes.length,
  };
}

/* ─── Pattern Detection ─────────────────────── */

function detectPatterns(nodes: DawayirNode[], edges: DawayirEdge[]): HiddenPattern[] {
  const patterns: HiddenPattern[] = [];
  const active = nodes.filter(n => !n.archived);

  // Over-dependency: one node has > 40% of all edges
  const edgeCounts: Record<string, number> = {};
  edges.forEach(e => {
    edgeCounts[e.source] = (edgeCounts[e.source] || 0) + 1;
    edgeCounts[e.target] = (edgeCounts[e.target] || 0) + 1;
  });
  const totalEdges = edges.length * 2;
  for (const [nodeId, count] of Object.entries(edgeCounts)) {
    if (totalEdges > 0 && count / totalEdges > 0.4) {
      const node = active.find(n => n.id === nodeId);
      if (node) {
        patterns.push({
          kind: "over_dependency",
          description: `Your world revolves heavily around ${node.label}. This creates fragility.`,
          affectedNodes: [nodeId],
          severity: "high",
        });
      }
    }
  }

  // Emotional drain: > 50% of connections are draining
  const drainingEdges = edges.filter(e => e.type === "draining" || e.type === "conflict");
  if (edges.length > 2 && drainingEdges.length / edges.length > 0.5) {
    patterns.push({
      kind: "emotional_drain",
      description: "More than half of your connections are draining. Your emotional reserves are at risk.",
      affectedNodes: [...new Set(drainingEdges.flatMap(e => [e.source, e.target]))],
      severity: "high",
    });
  }

  // Ghost connection: nodes with no edges
  const connectedIds = new Set(edges.flatMap(e => [e.source, e.target]));
  const ghosts = active.filter(n => !connectedIds.has(n.id));
  if (ghosts.length > 0) {
    patterns.push({
      kind: "ghost_connection",
      description: `${ghosts.length} people exist in your map but have no active connections. Are they still relevant?`,
      affectedNodes: ghosts.map(n => n.id),
      severity: "low",
    });
  }

  // Safe harbor: if no green-ring nodes exist
  const greenNodes = active.filter(n => n.ring === "green");
  if (active.length > 3 && greenNodes.length === 0) {
    patterns.push({
      kind: "safe_harbor",
      description: "You have no 'safe' relationships. Everyone is either draining or uncertain.",
      affectedNodes: [],
      severity: "high",
    });
  }

  return patterns;
}

/* ─── Full Analysis ─────────────────────────── */

export function analyzeGraph(graph: DawayirGraph): GraphInsights {
  const { nodes, edges } = graph;
  const active = nodes.filter(n => !n.archived);
  const stats = getRingStats(nodes);

  const overallHealth = active.length > 0
    ? Math.round(active.reduce((sum, n) => sum + n.score, 0) / active.length)
    : 0;

  const dominantRing: Ring =
    stats.red >= stats.yellow && stats.red >= stats.green ? "red" :
    stats.yellow >= stats.green ? "yellow" : "green";

  const drainingEdges = edges.filter(e => e.type === "draining" || e.type === "conflict");
  const nurturingEdges = edges.filter(e => e.type === "nurturing" || e.type === "stable");

  const drainingRatio = edges.length > 0 ? drainingEdges.length / edges.length : 0;
  const nurturingRatio = edges.length > 0 ? nurturingEdges.length / edges.length : 0;

  const isolationRisk = active.length <= 2 || (edges.length < active.length * 0.5);

  const hiddenPatterns = detectPatterns(active, edges);

  const recommendation =
    isolationRisk ? "Your circle is very small. Consider reconnecting with past relationships." :
    drainingRatio > 0.5 ? "Most of your connections are draining. Consider setting boundaries." :
    overallHealth < 40 ? "Your relationship health is low. Focus on nurturing your green-ring connections." :
    overallHealth > 70 ? "Your relationships are strong! Keep investing in your inner circle." :
    "Your circle is balanced. Watch for patterns forming in the yellow zone.";

  return {
    overallHealth,
    dominantRing,
    isolationRisk,
    drainingRatio: Math.round(drainingRatio * 100) / 100,
    nurturingRatio: Math.round(nurturingRatio * 100) / 100,
    hiddenPatterns,
    recommendation,
  };
}

/* ─── Export Graph for Visualization ─────────── */

export function toVisualizationData(graph: DawayirGraph) {
  const ringColors: Record<Ring, string> = {
    red: "hsl(0, 75%, 55%)",
    yellow: "hsl(45, 90%, 55%)",
    green: "hsl(150, 70%, 50%)",
  };

  const ringRadius: Record<Ring, number> = { red: 200, yellow: 350, green: 500 };

  const active = graph.nodes.filter(n => !n.archived);

  // Position nodes in concentric circles based on ring
  const positioned = active.map((node, i) => {
    const sameRing = active.filter(n => n.ring === node.ring);
    const idx = sameRing.indexOf(node);
    const angle = (2 * Math.PI * idx) / sameRing.length;
    const r = ringRadius[node.ring];

    return {
      ...node,
      x: Math.cos(angle) * r,
      y: Math.sin(angle) * r,
      color: ringColors[node.ring],
      radius: 20 + (node.score / 100) * 20,
    };
  });

  return { nodes: positioned, edges: graph.edges };
}
