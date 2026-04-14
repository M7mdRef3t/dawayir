"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  createNode, createEdge, createGraph
} from "@/lib/engine";
import type { DawayirNode, DawayirEdge, Ring } from "@/lib/types";
import { AuthModal } from "@/components/AuthModal";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

/* ─── Sample Data ──────────────────────── */
function buildDemoGraph() {
  const nodes: DawayirNode[] = [
    { ...createNode("أمي", "green", 92), id: "n1" },
    { ...createNode("أحمد", "green", 85), id: "n2" },
    { ...createNode("سارة", "yellow", 55), id: "n3" },
    { ...createNode("خالد", "yellow", 48), id: "n4" },
    { ...createNode("ليلى", "red", 22), id: "n5" },
    { ...createNode("عمر", "red", 18), id: "n6" },
    { ...createNode("منى", "yellow", 62), id: "n7" },
    { ...createNode("يوسف", "green", 78), id: "n8" },
  ];
  const edges: DawayirEdge[] = [
    createEdge("n1", "n2", "nurturing", 0.9),
    createEdge("n1", "n3", "stable", 0.6),
    createEdge("n2", "n4", "stable", 0.5),
    createEdge("n3", "n5", "draining", 0.7),
    createEdge("n5", "n6", "conflict", 0.8),
    createEdge("n4", "n7", "stable", 0.4),
    createEdge("n7", "n8", "nurturing", 0.6),
    createEdge("n2", "n8", "nurturing", 0.7),
  ];
  return createGraph(nodes, edges);
}

/* ─── Ring positioning ─────────────────── */
function positionNode(node: DawayirNode, index: number, total: number, canvasSize: number) {
  const ringRadius: Record<Ring, number> = { green: 0.14, yellow: 0.28, red: 0.42 };
  const r = ringRadius[node.ring] * canvasSize;
  const angle = (2 * Math.PI * index) / Math.max(total, 1) - Math.PI / 2;
  const cx = canvasSize / 2 + Math.cos(angle) * r;
  const cy = canvasSize / 2 + Math.sin(angle) * r;
  const size = 18 + (node.score / 100) * 18;
  return { cx, cy, size };
}

export default function HomePage() {
  const router = useRouter();
  const [graph, setGraph] = useState(() => buildDemoGraph());
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newRing, setNewRing] = useState<Ring>("yellow");

  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  const handleCommandCenterClick = () => {
    if (user) {
      router.push("/dashboard");
    } else {
      setIsAuthOpen(true);
    }
  };

  // State for legacy UI structure
  const [sessionId, setSessionId] = useState<string>("");

  // Load session & initial map
  useEffect(() => {
    let sid = localStorage.getItem("dw_session");
    if (!sid) {
      sid = "session-" + Math.random().toString(36).substr(2, 9);
      localStorage.setItem("dw_session", sid);
    }
    setSessionId(sid);

    fetch(`/api/v1/sync?sessionId=${sid}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.map && data.map.nodes?.length > 0) {
          setGraph(data.map);
        }
      })
      .catch(console.error);
  }, []);

  // Sync back to DB on change (debounce)
  useEffect(() => {
    if (!sessionId || graph.nodes.length === 0) return;
    const timeout = setTimeout(() => {
      fetch("/api/v1/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, nodes: graph.nodes, edges: graph.edges })
      }).catch(console.error);
    }, 1500);
    return () => clearTimeout(timeout);
  }, [graph, sessionId]);

  // Execute deep analysis when graph or user state changes
  useEffect(() => {
    if (!sessionId) return;
    // Analysis is now moved to Command Center
  }, [graph, sessionId]);

  const active = useMemo(() => graph.nodes.filter(n => !n.archived), [graph.nodes]);
  const canvasSize = 600;

  const ringGroups = useMemo(() => {
    const groups: Record<Ring, DawayirNode[]> = { red: [], yellow: [], green: [] };
    active.forEach(n => groups[n.ring].push(n));
    return groups;
  }, [active]);

  const addPerson = useCallback(() => {
    if (!newName.trim()) return;
    const node = createNode(newName.trim(), newRing, newRing === "green" ? 80 : newRing === "yellow" ? 50 : 25);
    setGraph(prev => ({
      ...prev,
      nodes: [...prev.nodes, node],
      metadata: { ...prev.metadata, updatedAt: new Date().toISOString() },
    }));
    setNewName("");
  }, [newName, newRing]);

  const removeNode = useCallback((id: string) => {
    setGraph(prev => ({
      ...prev,
      nodes: prev.nodes.filter(n => n.id !== id),
      edges: prev.edges.filter(e => e.source !== id && e.target !== id),
    }));
    if (selectedNode === id) setSelectedNode(null);
  }, [selectedNode]);

  const ringColors: Record<Ring, string> = { red: "var(--dw-red)", yellow: "var(--dw-yellow)", green: "var(--dw-green)" };

  return (
    <>
      <div className="ambient" />

      {/* Navigation */}
      <nav className="nav">
        <div className="container nav__inner">
          <a href="/" className="nav__logo">
            <div className="nav__logo-rings"><span /><span /><span /></div>
            <span>دواير</span>
          </a>
          <div className="nav__links">
            <a href="#playground">ساحة التجربة</a>
            <a href="#features">المميزات</a>
            <a href="#quickstart">البداية السريعة</a>
            <a href="/docs">التوثيق</a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="container hero__inner">
          <div className="hero__badge animate-in">🔗 الأولى عالمياً — منصة ذكاء العلاقات</div>
          <h1 className="hero__title animate-in delay-1">اكتشف من يشكل<br />عالمك الخاص.</h1>
          <p className="hero__subtitle animate-in delay-2">
            ارسم خريطة علاقاتك. اكتشف الأنماط المخفية. افهم من يستنزفك،
            ومن يدعمك، ومن تتجاهله — كل ذلك في رسم بياني تفاعلي واحد.
          </p>
          <div className="hero__actions animate-in delay-3">
            <a href="#playground" className="btn btn--primary">جربها الآن ↓</a>
            <a href="#quickstart" className="btn btn--ghost">البداية السريعة</a>
          </div>
          <div className="hero__code animate-in delay-4">
            <code>npm install @alrehla/dawayir</code>
          </div>
        </div>
      </section>

      {/* Live Graph Playground */}
      <section id="playground" className="section">
        <div className="container">
          <h2 className="section__title">ساحة التجربة المباشرة</h2>
          <p className="section__desc">
            أضف أشخاصاً. حدد دائرتهم. وشاهد كيف يكتشف الذكاء الاصطناعي الأنماط المخفية في علاقاتك.
          </p>

          {/* Playground Intro */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 32, flexWrap: 'wrap' }}>
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addPerson()}
              placeholder="أدخل اسماً..."
              style={{
                padding: '12px 20px', borderRadius: 'var(--dw-radius)',
                background: 'var(--dw-bg-glass)', border: '1px solid var(--dw-border)',
                color: 'var(--dw-text)', fontSize: 14, minWidth: 200, outline: 'none',
              }}
            />
            {(["green", "yellow", "red"] as Ring[]).map(r => (
              <button
                key={r}
                onClick={() => setNewRing(r)}
                style={{
                  padding: '10px 16px', borderRadius: 100, fontSize: 12, fontWeight: 700,
                  background: newRing === r ? ringColors[r] : 'var(--dw-bg-glass)',
                  color: newRing === r ? 'var(--dw-bg-deep)' : 'var(--dw-text-secondary)',
                  border: `1px solid ${newRing === r ? ringColors[r] : 'var(--dw-border)'}`,
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                {r === "green" ? "🟢 آمنة" : r === "yellow" ? "🟡 غير مستقرة" : "🔴 مستنزفة"}
              </button>
            ))}
            <button className="btn btn--primary" onClick={addPerson} style={{ padding: '10px 24px' }}>
              + إضافة
            </button>
          </div>

          {/* SVG Graph */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
            <svg width={canvasSize} height={canvasSize} viewBox={`0 0 ${canvasSize} ${canvasSize}`} style={{ maxWidth: '100%' }}>
              {/* Concentric rings */}
              {[
                { r: 0.14, color: "hsla(150,70%,50%,0.12)", label: "آمنة" },
                { r: 0.28, color: "hsla(45,90%,55%,0.12)", label: "غير مستقرة" },
                { r: 0.42, color: "hsla(0,75%,55%,0.12)", label: "مستنزفة" },
              ].map((ring, i) => (
                <circle
                  key={i}
                  cx={canvasSize / 2}
                  cy={canvasSize / 2}
                  r={ring.r * canvasSize}
                  fill="none"
                  stroke={ring.color}
                  strokeDasharray="6 4"
                  strokeWidth={1}
                />
              ))}

              {/* Edges */}
              {graph.edges.map((edge, i) => {
                const sNode = active.find(n => n.id === edge.source);
                const tNode = active.find(n => n.id === edge.target);
                if (!sNode || !tNode) return null;
                const sGroup = ringGroups[sNode.ring];
                const tGroup = ringGroups[tNode.ring];
                const sp = positionNode(sNode, sGroup.indexOf(sNode), sGroup.length, canvasSize);
                const tp = positionNode(tNode, tGroup.indexOf(tNode), tGroup.length, canvasSize);
                const strokeColor = edge.type === "draining" || edge.type === "conflict"
                  ? "hsla(0,75%,55%,0.3)"
                  : edge.type === "nurturing" ? "hsla(150,70%,50%,0.3)" : "hsla(220,20%,50%,0.15)";
                return (
                  <line
                    key={i}
                    x1={sp.cx} y1={sp.cy} x2={tp.cx} y2={tp.cy}
                    stroke={strokeColor} strokeWidth={edge.weight * 2}
                  />
                );
              })}

              {/* Nodes */}
              {(["green", "yellow", "red"] as Ring[]).map(ring =>
                ringGroups[ring].map((node, idx) => {
                  const pos = positionNode(node, idx, ringGroups[ring].length, canvasSize);
                  const isSelected = selectedNode === node.id;
                  const fill = ring === "green" ? "hsl(150,70%,50%)" : ring === "yellow" ? "hsl(45,90%,55%)" : "hsl(0,75%,55%)";
                  return (
                    <g key={node.id} onClick={() => setSelectedNode(isSelected ? null : node.id)} style={{ cursor: 'pointer' }}>
                      <circle
                        cx={pos.cx} cy={pos.cy} r={pos.size}
                        fill={fill}
                        stroke={isSelected ? "white" : "none"}
                        strokeWidth={isSelected ? 3 : 0}
                        opacity={0.9}
                      />
                      <text
                        x={pos.cx} y={pos.cy + pos.size + 14}
                        textAnchor="middle"
                        fill="var(--dw-text-secondary)"
                        fontSize={11}
                        fontWeight={600}
                      >
                        {node.label}
                      </text>
                      {node.score > 0 && (
                        <text
                          x={pos.cx} y={pos.cy + 4}
                          textAnchor="middle"
                          fill="var(--dw-bg-deep)"
                          fontSize={10}
                          fontWeight={800}
                        >
                          {node.score}
                        </text>
                      )}
                    </g>
                  );
                })
              )}

              {/* Center label */}
              <text x={canvasSize / 2} y={canvasSize / 2} textAnchor="middle" fill="var(--dw-text-muted)" fontSize={12} fontWeight={600}>
                أنت
              </text>
            </svg>
          </div>

          {/* Selected Node Info */}
          {selectedNode && (() => {
            const node = active.find(n => n.id === selectedNode);
            if (!node) return null;
            return (
              <div style={{
                maxWidth: 400, margin: '0 auto 24px', padding: 20, borderRadius: 'var(--dw-radius)',
                background: 'var(--dw-bg-card)', border: '1px solid var(--dw-border)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>{node.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--dw-text-secondary)' }}>
                    الدائرة: <span style={{ color: ringColors[node.ring] }}>{node.ring === "green" ? "آمنة" : node.ring === "yellow" ? "غير مستقرة" : "مستنزفة"}</span> · النتيجة: {node.score}
                  </div>
                </div>
                <button
                  onClick={() => removeNode(node.id)}
                  style={{
                    padding: '8px 16px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                    background: 'hsla(0,75%,55%,0.12)', color: 'var(--dw-red)',
                    border: '1px solid hsla(0,75%,55%,0.2)', cursor: 'pointer',
                  }}
                >
                  حذف
                </button>
              </div>
            );
          })()}

          {/* Command Center CTA */}
          <div style={{ marginTop: 40, borderTop: '1px solid var(--dw-border)', paddingTop: 40, textAlign: 'center' }}>
            <h3 style={{ fontSize: 24, fontWeight: 800, marginBottom: 16 }}>اكتشف الصورة الكاملة</h3>
            <p style={{ color: "var(--dw-text-secondary)", marginBottom: 24, maxWidth: 600, margin: "0 auto 24px" }}>
              للوصول إلى تحليل السيادة العميق (Sovereign Engine)، ومعرفة مؤشرات الاستنزاف على المدار الزمني لك، قم بتسجيل الدخول إلى غرفة العمليات.
            </p>
            <button onClick={handleCommandCenterClick} className="btn btn--primary" style={{ padding: "12px 32px", fontSize: 16 }}>
              {user ? "الدخول لمركز القيادة السيادية" : "إنشاء هويتك السيادية للوصول للتحليل"}
            </button>
          </div>
        </div>
      </section>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />

      {/* Features */}
      <section id="features" className="section">
        <div className="container">
          <h2 className="section__title">لماذا دواير؟</h2>
          <p className="section__desc">لينكد إن يرسم مسارك المهني. دواير ترسم مسار حياتك.</p>
          <div className="features">
            <div className="feature-card">
              <div className="feature-card__icon">🔗</div>
              <h3 className="feature-card__title">نظام الدوائر الثلاث</h3>
              <p className="feature-card__desc">مستنزف (أحمر)، غير مستقر (أصفر)، آمن (أخضر). شاهد عالمك الاجتماعي بالكامل في لمح البصر.</p>
            </div>
            <div className="feature-card">
              <div className="feature-card__icon">🧠</div>
              <h3 className="feature-card__title">اكتشاف الأنماط بالذكاء الاصطناعي</h3>
              <p className="feature-card__desc">الاعتماد المفرط، الاستنزاف العاطفي، العلاقات الشبحية — المحرك يرى ما لا تراه أنت.</p>
            </div>
            <div className="feature-card">
              <div className="feature-card__icon">📊</div>
              <h3 className="feature-card__title">تقييم الصحة العلائقية</h3>
              <p className="feature-card__desc">كل علاقة لها نتيجة. كل دائرة لها تقييم صحي. ذكاء عاطفي مبني على البيانات.</p>
            </div>
            <div className="feature-card">
              <div className="feature-card__icon">📡</div>
              <h3 className="feature-card__title">واجهة برمجة التطبيقات (API)</h3>
              <p className="feature-card__desc">اربط "دواير" بمنصتك التدريبية، تطبيق العلاج النفسي، أو أدوات الموارد البشرية.</p>
            </div>
            <div className="feature-card">
              <div className="feature-card__icon">🔒</div>
              <h3 className="feature-card__title">الخصوصية أولاً</h3>
              <p className="feature-card__desc">علاقاتك ملك لك وحدك. لا نقوم بسحب بيانات الشبكات الاجتماعية أو بيع بياناتك أبداً.</p>
            </div>
            <div className="feature-card">
              <div className="feature-card__icon">🌍</div>
              <h3 className="feature-card__title">عربي + إنجليزي</h3>
              <p className="feature-card__desc">مصمم للعالم العربي أولاً. دعم كامل لـ RTL وواجهة ثنائية اللغة.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Start */}
      <section id="quickstart" className="section">
        <div className="container">
          <h2 className="section__title">البداية السريعة</h2>
          <p className="section__desc">أنشئ خريطة علاقات في 5 أسطر برمجية فقط.</p>
          <div className="code-block" style={{ maxWidth: 700, margin: '0 auto' }}>
            <pre><code>
              <span className="cmt">{"// 1. التثبيت"}</span>{"\n"}
              <span className="fn">npm install</span> <span className="str">@alrehla/dawayir</span>{"\n\n"}
              <span className="cmt">{"// 2. بناء الرسم البياني"}</span>{"\n"}
              <span className="kw">import</span> {"{ "}<span className="fn">createNode, createGraph, analyzeGraph</span>{" }"} <span className="kw">from</span> <span className="str">&apos;@alrehla/dawayir&apos;</span>;{"\n\n"}
              <span className="kw">const</span> graph = <span className="fn">createGraph</span>([{"\n"}
              {"  "}<span className="fn">createNode</span>(<span className="str">&apos;أمي&apos;</span>, <span className="str">&apos;green&apos;</span>, <span className="num">92</span>),{"\n"}
              {"  "}<span className="fn">createNode</span>(<span className="str">&apos;أحمد&apos;</span>, <span className="str">&apos;yellow&apos;</span>, <span className="num">55</span>),{"\n"}
              {"  "}<span className="fn">createNode</span>(<span className="str">&apos;ليلى&apos;</span>, <span className="str">&apos;red&apos;</span>, <span className="num">22</span>),{"\n"}
              ]);{"\n\n"}
              <span className="cmt">{"// 3. الحصول على التحليلات"}</span>{"\n"}
              <span className="kw">const</span> insights = <span className="fn">analyzeGraph</span>(graph);{"\n"}
              console.log(insights.hiddenPatterns);{"\n"}
              <span className="cmt">{"// → [{ kind: 'safe_harbor', severity: 'high', ... }]"}</span>
            </code></pre>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta">
        <div className="container">
          <h2 className="cta__title">ارسم عالمك.</h2>
          <p className="cta__desc">انضم لقائمة الانتظار للحصول على تطبيق "دواير" الكامل والوصول للـ API.</p>
          <a href="mailto:dawayir@alrehla.app" className="btn btn--primary">اطلب دخولاً مبكراً ←</a>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <p>دواير — منتج من <a href="https://alrehla.app">الرحلة (Alrehla)</a> · © {new Date().getFullYear()}</p>
        </div>
      </footer>
    </>
  );
}
