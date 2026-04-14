"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { createNode, createGraph } from "@/lib/engine";
import type { DawayirNode, DawayirEdge, Ring } from "@/lib/types";

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  
  const [graph, setGraph] = useState(() => createGraph([], []));
  const [sessionId, setSessionId] = useState<string>("");

  const [analysisData, setAnalysisData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [energy, setEnergy] = useState<number>(65);
  const [mood, setMood] = useState<string>("neutral");
  
  // Historical pulses for timeline
  const [history, setHistory] = useState<{ timestamp: number; energy: number; mood: string }[]>([]);

  // Auth Guard
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/");
      } else {
        setUser(user);
        setSessionId(user.id);
        
        // Load Maps & Pulses
        loadDashboard(user.id);
      }
    });
  }, [router]);

  const loadDashboard = async (userId: string) => {
    try {
      // Fetch Graph
      const { data: mapData } = await fetch(`/api/v1/sync?sessionId=${userId}`).then(res => res.json());
      if (mapData && mapData.nodes && mapData.nodes.length > 0) {
        setGraph(mapData);
      }

      // Fetch Analysis Data
      const { data: analyticsRes } = await fetch("/api/v1/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodes: mapData?.nodes || [],
          edges: mapData?.edges || [],
          userState: null, // Don't record a new state on initial load
          sessionId: userId
        }),
      }).then(res => res.json());
      
      if (analyticsRes) {
        setAnalysisData(analyticsRes);
        // We will pull the pulses history from snapshot
        if (analyticsRes.analytics?.snapshot?.pulses) {
          setHistory(analyticsRes.analytics.snapshot.pulses);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const syncState = useCallback(async (newEnergy: number, newMood: string) => {
    setEnergy(newEnergy);
    setMood(newMood);
    setIsLoading(true);

    try {
      const { data: analyticsRes } = await fetch("/api/v1/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodes: graph.nodes,
          edges: graph.edges,
          userState: { energy: newEnergy, mood: newMood },
          sessionId: user.id
        }),
      }).then(res => res.json());

      if (analyticsRes) {
        setAnalysisData(analyticsRes);
        if (analyticsRes.analytics?.snapshot?.pulses) {
          setHistory(analyticsRes.analytics.snapshot.pulses);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [graph, user]);

  if (!user) return <div style={{ padding: 40, color: "white", textAlign: "center" }}>جاري التحقق من الهوية السيادية...</div>;

  return (
    <>
      <div className="ambient" />
      
      <nav className="nav" style={{ borderBottom: "1px solid var(--dw-border)" }}>
        <div className="container nav__inner">
          <a href="/dashboard" className="nav__logo">
            <div className="nav__logo-rings"><span /><span /><span /></div>
            <span>دواير <span style={{fontSize: 12, color: "var(--dw-yellow)", fontWeight: "normal"}}>Command Center</span></span>
          </a>
          <button onClick={() => supabase.auth.signOut().then(() => router.push("/"))} className="btn btn--ghost" style={{ padding: "6px 12px", fontSize: 13 }}>
            تسجيل الخروج
          </button>
        </div>
      </nav>

      <div className="container" style={{ padding: "40px 20px" }}>
        
        <header style={{ marginBottom: 40 }}>
          <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 8 }}>مرحباً بعودتك للقيادة.</h1>
          <p style={{ color: "var(--dw-text-secondary)" }}>هويتك السيادية مفعلة. إليك التقرير التحليلي لشبكة علاقاتك وتأثيرها الممتد.</p>
        </header>

        {/* Top Controls */}
        <div style={{
          padding: 24, borderRadius: 'var(--dw-radius)',
          background: 'var(--dw-bg-card)', border: '1px solid var(--dw-border)',
          display: 'flex', flexWrap: 'wrap', gap: 20, justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 32
        }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--dw-text-secondary)', marginBottom: 8 }}>تسجيل النبض الحالي (طاقة {energy})</label>
            <input
              type="range" min="0" max="100" value={energy}
              onChange={e => setEnergy(parseInt(e.target.value))}
              onMouseUp={() => syncState(energy, mood)}
              style={{ width: '200px', cursor: 'pointer' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--dw-text-secondary)', marginBottom: 8 }}>المزاج الحالي</label>
            <select
              value={mood}
              onChange={e => syncState(energy, e.target.value)}
              style={{
                width: '200px', padding: '10px 14px', borderRadius: '8px',
                background: 'var(--dw-bg-glass)', border: '1px solid var(--dw-border)',
                color: 'var(--dw-text)', fontSize: 14, outline: 'none'
              }}
            >
              <option value="calm">هادئ (Calm)</option>
              <option value="neutral">محايد (Neutral)</option>
              <option value="anxious">قلق (Anxious)</option>
              <option value="sad">حزين (Sad)</option>
              <option value="angry">غاضب (Angry)</option>
              <option value="overwhelmed">مرهق (Overwhelmed)</option>
              <option value="flow">متدفق (Flow)</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div style={{ textAlign: "center", padding: 40, color: 'var(--dw-text-muted)' }}>جاري معالجة بياناتك العميقة...</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 32 }}>

            {/* Deep Analytics Overview */}
            {analysisData && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
                <div style={{
                  padding: 24, borderRadius: 'var(--dw-radius)',
                  background: 'var(--dw-bg-card)', border: '1px solid var(--dw-border)',
                }}>
                  <div style={{ fontSize: 13, color: 'var(--dw-text-secondary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>مؤشر الألم الكلي</div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginBottom: 16 }}>
                    <div style={{ fontSize: 48, fontWeight: 900, lineHeight: 1, color: analysisData.analytics.overview.painLevel.color }}>
                      {analysisData.analytics.snapshot.pain.painFieldIntensity}%
                    </div>
                  </div>
                  <p style={{ fontSize: 14, color: 'var(--dw-text-muted)' }}>{analysisData.analytics.overview.painLevel.action}</p>
                </div>

                <div style={{
                  padding: 24, borderRadius: 'var(--dw-radius)',
                  background: 'var(--dw-bg-card)', border: `1px solid ${analysisData.analytics.overview.painLevel.color}40`,
                  position: 'relative', overflow: 'hidden'
                }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: analysisData.analytics.overview.painLevel.color }}></div>
                  <div style={{ fontSize: 13, color: 'var(--dw-text-secondary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>توجه الذكاء الاصطناعي السيادي</div>
                  <h4 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12, lineHeight: 1.4, color: 'var(--dw-text)' }}>
                    {analysisData.analytics.overview.recommendationText}
                  </h4>
                </div>
              </div>
            )}

            {/* Historical Timeline */}
            <div style={{ padding: 24, borderRadius: 'var(--dw-radius)', background: 'var(--dw-bg-card)', border: '1px solid var(--dw-border)' }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 24 }}>مخطط النبضات السابقة (History Timeline)</h3>
              {history.length === 0 ? (
                <p style={{ color: "var(--dw-text-muted)", fontSize: 14 }}>لا توجد نبضات سابقة لتكوين نمط.</p>
              ) : (
                <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 150, paddingBottom: 20, overflowX: "auto" }}>
                  {history.map((h, i) => (
                    <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                      <div style={{
                        width: 24, height: Math.max(h.energy, 5), background: h.energy > 60 ? "var(--dw-green)" : h.energy > 30 ? "var(--dw-yellow)" : "var(--dw-red)",
                        borderRadius: 4, transition: "height 0.3s"
                      }} />
                      <div style={{ fontSize: 10, color: "var(--dw-text-muted)", writingMode: "vertical-rl" }}>
                        {new Date(h.timestamp).toLocaleString("ar", { hour: "numeric", minute: "numeric", day: "numeric", month: "short" })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* CTA back to editor */}
            <div style={{ textAlign: "center", marginTop: 24 }}>
              <button onClick={() => router.push("/")} className="btn btn--primary">
                العودة لرسم الخريطة ←
              </button>
            </div>

          </div>
        )}
      </div>
    </>
  );
}
