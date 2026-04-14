import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { createGraph, toVisualizationData } from "@/lib/engine";
import { buildRelationalFieldSnapshot, summarizeTwinRecommendation, interpretPainLevel } from "@/lib/analytics";
import type { DawayirNode, DawayirEdge } from "@/lib/types";

// Helper to simulate telemetry for the demo/playground
function getMockTelemetry() {
  const now = Date.now();
  const HOUR = 60 * 60 * 1000;
  return {
    pulses: [
      { timestamp: now - 12 * HOUR, mood: "anxious", energy: 3 },
      { timestamp: now - 6 * HOUR, mood: "neutral", energy: 5 },
      { timestamp: now - 1 * HOUR, mood: "overwhelmed", energy: 2 },
    ],
    signals: [
      { timestamp: now - 24 * HOUR, type: "ring_changed" },
      { timestamp: now - 5 * HOUR, type: "node_added" },
    ],
    journeyEvents: [
      { timestamp: now - 48 * HOUR, type: "task_completed" },
      { timestamp: now - 2 * HOUR, type: "flow_event", payload: { step: "pulse_abandoned" } }
    ]
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const rawNodes: DawayirNode[] = body.nodes ?? [];
    const edges: DawayirEdge[] = body.edges ?? [];

    if (!Array.isArray(rawNodes)) {
      return NextResponse.json({ success: false, error: "يجب أن تكون العقد (nodes) في شكل مصفوفة" }, { status: 400 });
    }

    // 1. Prepare Visualization Data (SVG Coordinates)
    const graph = createGraph(rawNodes, edges);
    const visData = toVisualizationData(graph);

    // 2. Prepare Analytics Nodes (Mapping DawayirNode to AnalyticNode)
    const analyticNodes = rawNodes.map(n => ({
      ring: n.ring,
      archived: n.archived,
      // Default hypothetical data to show off the engine's power
      detachmentMode: n.ring === "red" && Math.random() > 0.5,
      recoveryProgress: {
        ruminationLogCount: n.ring === "red" ? Math.floor(Math.random() * 5) : 0,
        pathStage: "awareness",
        boundaryLegitimacyScore: Math.random() * 100
      }
    }));

    // Prepare base telemetry
    const telemetry = {
      pulses: [] as { timestamp: number; mood: string; energy: number }[],
      signals: [] as any[],
      journeyEvents: [] as any[]
    };

    // If we have a sessionId, we can load actual pulses from Supabase
    const sessionId = (body.sessionId as string) || "anonymous-playground";

    const { data: dbPulses } = await supabase
      .from("dawayir_pulses")
      .select("energy, mood, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true })
      .limit(50);
    
    if (dbPulses && dbPulses.length > 0) {
      telemetry.pulses = dbPulses.map(p => ({
        timestamp: new Date(p.created_at).getTime(),
        mood: p.mood,
        energy: p.energy
      }));
    } else {
      // Fallback historical mocks if db is empty (for playground rich feel)
      Object.assign(telemetry, getMockTelemetry());
    }

    // Inject dynamic user state if provided by the UI, and save it to DB
    const userState = body.userState as { energy: number; mood: string } | undefined;
    if (userState) {
      const newPulse = {
        timestamp: Date.now(),
        mood: userState.mood,
        energy: userState.energy
      };
      telemetry.pulses.push(newPulse);
      
      // Async insert to DB (dont await failure to not block UI)
      supabase.from("dawayir_pulses").insert([{
        session_id: sessionId,
        energy: userState.energy,
        mood: userState.mood
      }]).then();
    }

    // 3. Deep Analysis (Sovereign Engine)
    const snapshot = buildRelationalFieldSnapshot({
      now: Date.now(),
      nodes: analyticNodes,
      pulses: telemetry.pulses,
      signals: telemetry.signals,
      journeyEvents: telemetry.journeyEvents,
      entropyScore: 40 // Example entropy
    });

    const recommendationText = summarizeTwinRecommendation(snapshot);
    const painInterpretation = interpretPainLevel(snapshot.pain.painFieldIntensity);

    return NextResponse.json({
      success: true,
      data: {
        visualization: visData,
        analytics: {
          snapshot,
          overview: {
            recommendationText,
            painLevel: painInterpretation
          }
        }
      },
      meta: { analyzedAt: new Date().toISOString(), version: "2.0.0-pro" },
    });
  } catch (error) {
    console.error("[Dawayir API] Analysis error:", error);
    return NextResponse.json({ success: false, error: "حدث خطأ داخلي في الخادم" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    service: "دواير — واجهة برمجة تطبيقات ذكاء العلاقات",
    version: "1.0.0",
    docs: "/docs",
    usage: "أرسل طلب POST إلى /api/v1/analyze مع { nodes, edges }",
  });
}
