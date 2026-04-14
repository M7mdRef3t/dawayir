import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, nodes, edges, metadata } = body;

    if (!sessionId) {
      return NextResponse.json({ success: false, error: "Missing sessionId" }, { status: 400 });
    }

    // Check if a map exists for this session
    const { data: existingMap, error: fetchError } = await supabase
      .from("dawayir_maps")
      .select("id")
      .eq("session_id", sessionId)
      .maybeSingle();

    if (fetchError) throw fetchError;

    const payload = {
      session_id: sessionId,
      nodes: nodes ?? [],
      edges: edges ?? [],
      metadata: metadata ?? {},
      updated_at: new Date().toISOString()
    };

    let result;
    if (existingMap) {
      result = await supabase
        .from("dawayir_maps")
        .update(payload)
        .eq("id", existingMap.id);
    } else {
      result = await supabase
        .from("dawayir_maps")
        .insert([payload]);
    }

    if (result.error) throw result.error;

    return NextResponse.json({
      success: true,
      message: "Synced successfully"
    });
  } catch (error) {
    console.error("[Sync API] Error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json({ success: false, error: "Missing sessionId" }, { status: 400 });
  }

  try {
    const { data, error } = await supabase
      .from("dawayir_maps")
      .select("*")
      .eq("session_id", sessionId)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: data || null
    });
  } catch (error) {
    console.error("[Sync API GET] Error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
