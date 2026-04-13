/**
 * POST /api/v1/analyze
 * Analyze a relationship graph and return insights.
 */

import { NextResponse } from "next/server";
import { createGraph, analyzeGraph, getRingStats } from "@/lib/engine";
import type { DawayirNode, DawayirEdge } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const nodes: DawayirNode[] = body.nodes ?? [];
    const edges: DawayirEdge[] = body.edges ?? [];

    if (!Array.isArray(nodes)) {
      return NextResponse.json({ success: false, error: "nodes must be an array" }, { status: 400 });
    }

    const graph = createGraph(nodes, edges);
    const insights = analyzeGraph(graph);
    const stats = getRingStats(nodes);

    return NextResponse.json({
      success: true,
      insights,
      stats,
      meta: { analyzedAt: new Date().toISOString(), version: "1.0.0" },
    });
  } catch (error) {
    console.error("[Dawayir API] Analysis error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    service: "Dawayir — Relationship Intelligence API",
    version: "1.0.0",
    docs: "/docs",
    usage: "POST /api/v1/analyze with { nodes, edges }",
  });
}
