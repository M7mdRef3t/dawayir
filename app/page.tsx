"use client";

import { useState, useMemo, useCallback } from "react";
import {
  createNode, createEdge, createGraph, analyzeGraph,
  getRingStats, toVisualizationData,
} from "@/lib/engine";
import type { DawayirNode, DawayirEdge, Ring, GraphInsights } from "@/lib/types";

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
  const ringRadius: Record<Ring, number> = { red: 0.14, yellow: 0.28, green: 0.42 };
  const r = ringRadius[node.ring] * canvasSize;
  const angle = (2 * Math.PI * index) / Math.max(total, 1) - Math.PI / 2;
  const cx = canvasSize / 2 + Math.cos(angle) * r;
  const cy = canvasSize / 2 + Math.sin(angle) * r;
  const size = 18 + (node.score / 100) * 18;
  return { cx, cy, size };
}

export default function HomePage() {
  const [graph, setGraph] = useState(() => buildDemoGraph());
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newRing, setNewRing] = useState<Ring>("yellow");

  const stats = useMemo(() => getRingStats(graph.nodes), [graph.nodes]);
  const insights = useMemo(() => analyzeGraph(graph), [graph]);
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
            <span>Dawayir</span>
          </a>
          <div className="nav__links">
            <a href="#playground">Playground</a>
            <a href="#features">Features</a>
            <a href="#quickstart">Quick Start</a>
            <a href="/docs">Docs</a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="container hero__inner">
          <div className="hero__badge animate-in">🔗 World&apos;s First — Relationship Intelligence Platform</div>
          <h1 className="hero__title animate-in delay-1">See Who Shapes<br />Your World.</h1>
          <p className="hero__subtitle animate-in delay-2">
            Map your relationships. Detect hidden patterns. Understand who drains you,
            who lifts you, and who you&apos;ve been ignoring — all in one visual graph.
          </p>
          <div className="hero__actions animate-in delay-3">
            <a href="#playground" className="btn btn--primary">Try It Live ↓</a>
            <a href="#quickstart" className="btn btn--ghost">Quick Start</a>
          </div>
          <div className="hero__code animate-in delay-4">
            <code>npm install @alrehla/dawayir</code>
          </div>
        </div>
      </section>

      {/* Live Graph Playground */}
      <section id="playground" className="section">
        <div className="container">
          <h2 className="section__title">Live Playground</h2>
          <p className="section__desc">
            Add people. Assign them a ring. Watch the AI detect hidden patterns in your relationships.
          </p>

          {/* Add Person Form */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 32, flexWrap: 'wrap' }}>
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addPerson()}
              placeholder="Enter a name..."
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
                {r === "green" ? "🟢 Safe" : r === "yellow" ? "🟡 Uncertain" : "🔴 Draining"}
              </button>
            ))}
            <button className="btn btn--primary" onClick={addPerson} style={{ padding: '10px 24px' }}>
              + Add
            </button>
          </div>

          {/* SVG Graph */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
            <svg width={canvasSize} height={canvasSize} viewBox={`0 0 ${canvasSize} ${canvasSize}`} style={{ maxWidth: '100%' }}>
              {/* Concentric rings */}
              {[
                { r: 0.42, color: "hsla(150,70%,50%,0.12)", label: "Safe" },
                { r: 0.28, color: "hsla(45,90%,55%,0.12)", label: "Uncertain" },
                { r: 0.14, color: "hsla(0,75%,55%,0.12)", label: "Draining" },
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
                    Ring: <span style={{ color: ringColors[node.ring] }}>{node.ring}</span> · Score: {node.score}
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
                  Remove
                </button>
              </div>
            );
          })()}

          {/* Stats + Insights */}
          <div className="insights">
            <div className="insight-card">
              <div className="insight-card__value" style={{ color: 'var(--dw-green)' }}>{stats.green}</div>
              <div className="insight-card__label">Safe Circle</div>
            </div>
            <div className="insight-card">
              <div className="insight-card__value" style={{ color: 'var(--dw-yellow)' }}>{stats.yellow}</div>
              <div className="insight-card__label">Uncertain</div>
            </div>
            <div className="insight-card">
              <div className="insight-card__value" style={{ color: 'var(--dw-red)' }}>{stats.red}</div>
              <div className="insight-card__label">Draining</div>
            </div>
            <div className="insight-card">
              <div className="insight-card__value">{insights.overallHealth}%</div>
              <div className="insight-card__label">Health Score</div>
            </div>
          </div>

          {/* Hidden Patterns */}
          {insights.hiddenPatterns.length > 0 && (
            <div style={{ marginTop: 32, maxWidth: 700, margin: '32px auto 0' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, textAlign: 'center' }}>🔍 Hidden Patterns Detected</h3>
              {insights.hiddenPatterns.map((p, i) => (
                <div key={i} style={{
                  padding: 16, marginBottom: 8, borderRadius: 12,
                  background: 'var(--dw-bg-card)', border: '1px solid var(--dw-border)',
                  fontSize: 13, color: 'var(--dw-text-secondary)',
                }}>
                  <span style={{
                    display: 'inline-block', padding: '2px 8px', borderRadius: 6,
                    fontSize: 10, fontWeight: 700, marginRight: 8, textTransform: 'uppercase',
                    background: p.severity === 'high' ? 'hsla(0,75%,55%,0.15)' : 'hsla(45,90%,55%,0.1)',
                    color: p.severity === 'high' ? 'var(--dw-red)' : 'var(--dw-yellow)',
                  }}>
                    {p.kind.replace(/_/g, ' ')}
                  </span>
                  {p.description}
                </div>
              ))}
              <p style={{ textAlign: 'center', marginTop: 16, fontSize: 14, fontStyle: 'italic', color: 'var(--dw-text-muted)' }}>
                &quot;{insights.recommendation}&quot;
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="section">
        <div className="container">
          <h2 className="section__title">Why Dawayir?</h2>
          <p className="section__desc">LinkedIn maps your career. Dawayir maps your life.</p>
          <div className="features">
            <div className="feature-card">
              <div className="feature-card__icon">🔗</div>
              <h3 className="feature-card__title">3-Ring System</h3>
              <p className="feature-card__desc">Red (draining), Yellow (uncertain), Green (safe). See your entire social world at a glance.</p>
            </div>
            <div className="feature-card">
              <div className="feature-card__icon">🧠</div>
              <h3 className="feature-card__title">AI Pattern Detection</h3>
              <p className="feature-card__desc">Over-dependency, emotional drain, ghost connections — the engine sees what you can&apos;t.</p>
            </div>
            <div className="feature-card">
              <div className="feature-card__icon">📊</div>
              <h3 className="feature-card__title">Health Scoring</h3>
              <p className="feature-card__desc">Every relationship gets a score. Every circle gets a health check. Data-driven emotional intelligence.</p>
            </div>
            <div className="feature-card">
              <div className="feature-card__icon">📡</div>
              <h3 className="feature-card__title">REST API</h3>
              <p className="feature-card__desc">Plug Dawayir into your coaching platform, therapy app, or HR tool. Full API access.</p>
            </div>
            <div className="feature-card">
              <div className="feature-card__icon">🔒</div>
              <h3 className="feature-card__title">Privacy-First</h3>
              <p className="feature-card__desc">Your relationships are yours. No social network mining. No data selling. Ever.</p>
            </div>
            <div className="feature-card">
              <div className="feature-card__icon">🌍</div>
              <h3 className="feature-card__title">Arabic + English</h3>
              <p className="feature-card__desc">Built for the Arab world first. Full RTL support. Bilingual interface.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Start */}
      <section id="quickstart" className="section">
        <div className="container">
          <h2 className="section__title">Quick Start</h2>
          <p className="section__desc">Build a relationship graph in 5 lines of code.</p>
          <div className="code-block" style={{ maxWidth: 700, margin: '0 auto' }}>
            <pre><code>
              <span className="cmt">{"// 1. Install"}</span>{"\n"}
              <span className="fn">npm install</span> <span className="str">@alrehla/dawayir</span>{"\n\n"}
              <span className="cmt">{"// 2. Build a graph"}</span>{"\n"}
              <span className="kw">import</span> {"{ "}<span className="fn">createNode, createGraph, analyzeGraph</span>{" }"} <span className="kw">from</span> <span className="str">&apos;@alrehla/dawayir&apos;</span>;{"\n\n"}
              <span className="kw">const</span> graph = <span className="fn">createGraph</span>([{"\n"}
              {"  "}<span className="fn">createNode</span>(<span className="str">&apos;Mom&apos;</span>, <span className="str">&apos;green&apos;</span>, <span className="num">92</span>),{"\n"}
              {"  "}<span className="fn">createNode</span>(<span className="str">&apos;Ahmed&apos;</span>, <span className="str">&apos;yellow&apos;</span>, <span className="num">55</span>),{"\n"}
              {"  "}<span className="fn">createNode</span>(<span className="str">&apos;Layla&apos;</span>, <span className="str">&apos;red&apos;</span>, <span className="num">22</span>),{"\n"}
              ]);{"\n\n"}
              <span className="cmt">{"// 3. Get insights"}</span>{"\n"}
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
          <h2 className="cta__title">Map Your World.</h2>
          <p className="cta__desc">Join the waitlist for the full Dawayir app and API access.</p>
          <a href="mailto:dawayir@alrehla.app" className="btn btn--primary">Request Early Access →</a>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <p>Dawayir — A product by <a href="https://alrehla.app">الرحلة (Alrehla)</a> · © {new Date().getFullYear()}</p>
        </div>
      </footer>
    </>
  );
}
