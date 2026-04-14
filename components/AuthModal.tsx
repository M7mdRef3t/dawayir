"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export function AuthModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [status, setStatus] = useState<{ type: "error" | "success" | "loading", text: string } | null>(null);
  
  const router = useRouter();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({ type: "loading", text: "جاري المعالجة..." });

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setStatus({ type: "success", text: "تم تسجيل الدخول بنجاح!" });
        router.push("/dashboard");
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setStatus({ type: "success", text: "تم إنشاء الحساب! يتم توجيهك الآن..." });
        router.push("/dashboard");
      }
    } catch (err: any) {
      setStatus({ type: "error", text: err.message || "حدث خطأ أثناء الاتصال." });
    }
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)",
      display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999
    }}>
      <div style={{
        background: "var(--dw-bg-card)", border: "1px solid var(--dw-border)",
        borderRadius: "var(--dw-radius)", width: "100%", maxWidth: 400, padding: 32,
        position: "relative", boxShadow: "0 12px 48px rgba(0,0,0,0.5)"
      }}>
        <button 
          onClick={onClose}
          style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: "var(--dw-text-muted)", fontSize: 24, cursor: "pointer" }}
        >
          ×
        </button>

        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>{isLogin ? "تسجيل الدخول" : "إنشاء حساب"}</h2>
          <p style={{ color: "var(--dw-text-secondary)", fontSize: 14 }}>
            لوحة القيادة السيادية (Sovereign Command Center)
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--dw-text-secondary)", marginBottom: 8 }}>البريد الإلكتروني</label>
            <input 
              type="email" required
              value={email} onChange={e => setEmail(e.target.value)}
              style={{
                width: "100%", padding: "12px 16px", borderRadius: 8,
                background: "var(--dw-bg-glass)", border: "1px solid var(--dw-border)",
                color: "var(--dw-text)", fontSize: 14, outline: "none"
              }}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--dw-text-secondary)", marginBottom: 8 }}>كلمة المرور</label>
            <input 
              type="password" required minLength={6}
              value={password} onChange={e => setPassword(e.target.value)}
              style={{
                width: "100%", padding: "12px 16px", borderRadius: 8,
                background: "var(--dw-bg-glass)", border: "1px solid var(--dw-border)",
                color: "var(--dw-text)", fontSize: 14, outline: "none"
              }}
            />
          </div>

          {status && (
            <div style={{ 
              padding: 12, borderRadius: 8, fontSize: 13, textAlign: "center",
              background: status.type === "error" ? "hsla(0,75%,55%,0.1)" : status.type === "success" ? "hsla(150,70%,50%,0.1)" : "var(--dw-bg-glass)",
              color: status.type === "error" ? "var(--dw-red)" : status.type === "success" ? "var(--dw-green)" : "var(--dw-text-secondary)"
            }}>
              {status.text}
            </div>
          )}

          <button 
            type="submit" disabled={status?.type === "loading"}
            className="btn btn--primary" style={{ width: "100%", marginTop: 8 }}
          >
            {status?.type === "loading" ? "جاري التحميل..." : (isLogin ? "دخول" : "إنشاء الهوية")}
          </button>
        </form>

        <div style={{ marginTop: 24, textAlign: "center", fontSize: 13, color: "var(--dw-text-muted)" }}>
          {isLogin ? "ليس لديك حساب؟ " : "لديك حساب بالفعل؟ "}
          <button 
            onClick={() => setIsLogin(!isLogin)}
            style={{ background: "none", border: "none", color: "var(--dw-green)", fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}
          >
            {isLogin ? "سجل الآن" : "سجل دخول"}
          </button>
        </div>
      </div>
    </div>
  );
}
