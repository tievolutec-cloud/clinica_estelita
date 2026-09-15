"use client";

import { FormEvent, useState } from "react";
import { LockKeyhole, Mail, ShieldCheck, Sparkles } from "lucide-react";
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
    <main className="login-shell">
      <div className="login-glow login-glow-one"/>
      <div className="login-glow login-glow-two"/>
      <section className="login-card surface-card">
        <div className="login-brand-row">
          <div className="brand-mark">CE</div>
          <div><strong>Clínica Estelita</strong><small>Gestão odontológica</small></div>
        </div>
        <div className="login-intro">
          <span className="eyebrow"><Sparkles size={12}/> ACESSO SEGURO</span>
          <h1>Bem-vindo de volta</h1>
          <p>Entre para acessar agenda, pacientes, prontuário e gestão da clínica.</p>
        </div>
        <form onSubmit={submit} className="login-form">
          <div className="field"><label><Mail size={14}/> E-mail</label><input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="voce@clinica.com.br"/></div>
          <div className="field"><label><LockKeyhole size={14}/> Senha</label><input type="password" required value={password} onChange={e=>setPassword(e.target.value)} minLength={8} placeholder="••••••••"/></div>
          {message && <div className="notice login-error">{message}</div>}
          <button className="btn primary login-submit" disabled={loading} type="submit">{loading ? "Entrando..." : "Entrar no sistema"}</button>
        </form>
        <div className="login-security"><ShieldCheck size={16}/><span>Autenticação protegida pelo Supabase. Senhas não ficam armazenadas em texto puro.</span></div>
      </section>
    </main>
  );
}
