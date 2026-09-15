"use client";

import { FormEvent, useState } from "react";
import { LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      window.location.href = "/";
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível entrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20, background: "#f2f6f5" }}>
      <section className="card" style={{ width: "min(430px, 100%)", padding: 28, boxShadow: "var(--shadow)" }}>
        <div className="brand" style={{ color: "var(--text)", padding: 0, marginBottom: 24 }}>
          <div className="brand-mark" style={{ background: "var(--brand)", color: "white" }}>CE</div>
          <div><strong>Clínica Estelita</strong><small style={{ color: "var(--muted)" }}>Acesso seguro</small></div>
        </div>
        <h1 style={{ fontSize: 24, marginBottom: 6 }}>Entrar</h1>
        <p style={{ color: "var(--muted)", marginTop: 0, marginBottom: 22 }}>Use o e-mail e a senha cadastrados no Supabase.</p>
        <form onSubmit={submit} className="form-grid" style={{ gridTemplateColumns: "1fr" }}>
          <div className="field"><label><Mail size={14} style={{ verticalAlign: "middle" }}/> E-mail</label><input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@clinica.com.br"/></div>
          <div className="field"><label><LockKeyhole size={14} style={{ verticalAlign: "middle" }}/> Senha</label><input type="password" required value={password} onChange={e => setPassword(e.target.value)} minLength={8}/></div>
          {message && <div className="notice" style={{ borderColor: "#e9c7c7", background: "#fff1f1", color: "#8a3d3d", margin: 0 }}>{message}</div>}
          <button className="btn primary" disabled={loading} type="submit">{loading ? "Entrando..." : "Entrar no sistema"}</button>
        </form>
        <p style={{ display: "flex", gap: 7, alignItems: "center", color: "var(--muted)", fontSize: 12, marginTop: 20, marginBottom: 0 }}><ShieldCheck size={15}/> Senhas são tratadas pelo Supabase Auth e nunca devem ser armazenadas em texto puro.</p>
      </section>
    </main>
  );
}
