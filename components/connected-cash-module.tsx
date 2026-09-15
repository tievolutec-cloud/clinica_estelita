"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, Banknote, CircleDollarSign, LockKeyhole, Plus, WalletCards, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type CashSession = { id: string; opened_at: string; opening_balance: number; closed_at: string | null; expected_balance: number | null; counted_balance: number | null; difference: number | null };
type Movement = { id: string; movement_type: string; description: string; amount: number; payment_method: string | null; created_at: string };
type Props = { clinicId: string; role: string };

function money(value: number | null | undefined) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function ConnectedCashModule({ clinicId, role }: Props) {
  const [session, setSession] = useState<CashSession | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOpen, setShowOpen] = useState(false);
  const [showMovement, setShowMovement] = useState(false);
  const [showClose, setShowClose] = useState(false);
  const [message, setMessage] = useState("");

  const canWrite = ["admin", "recepcao", "financeiro"].includes(role);

  async function load() {
    setLoading(true);
    const supabase = createClient();
    const { data: sessions, error } = await supabase.from("cash_sessions")
      .select("id,opened_at,opening_balance,closed_at,expected_balance,counted_balance,difference")
      .eq("clinic_id", clinicId).is("closed_at", null).order("opened_at", { ascending: false }).limit(1);
    if (error) setMessage(error.message);
    const current = (sessions?.[0] || null) as CashSession | null;
    setSession(current);
    if (current) {
      const { data, error: movementsError } = await supabase.from("cash_movements")
        .select("id,movement_type,description,amount,payment_method,created_at")
        .eq("clinic_id", clinicId).eq("cash_session_id", current.id).order("created_at", { ascending: false }).limit(300);
      if (movementsError) setMessage(movementsError.message);
      setMovements((data || []) as Movement[]);
    } else {
      setMovements([]);
    }
    setLoading(false);
  }

  useEffect(() => { void load(); }, [clinicId]);

  const summary = useMemo(() => {
    const entries = movements.filter((m)=>["entrada","suprimento"].includes(m.movement_type)).reduce((s,m)=>s+Number(m.amount),0);
    const exits = movements.filter((m)=>["saida","sangria"].includes(m.movement_type)).reduce((s,m)=>s+Number(m.amount),0);
    const expected = Number(session?.opening_balance || 0) + entries - exits;
    return { entries, exits, expected };
  }, [movements, session]);

  async function openCash(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canWrite) return;
    const form = new FormData(event.currentTarget);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase.from("cash_sessions").insert({
      clinic_id: clinicId,
      opened_by: user.id,
      opening_balance: Number(form.get("opening_balance") || 0),
    }).select("id,opened_at,opening_balance,closed_at,expected_balance,counted_balance,difference").single();
    if (error) return setMessage(error.message);
    setSession(data as CashSession);
    setMovements([]);
    setShowOpen(false);
    setMessage("Caixa aberto com sucesso.");
  }

  async function addMovement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canWrite || !session) return;
    const form = new FormData(event.currentTarget);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase.from("cash_movements").insert({
      clinic_id: clinicId,
      cash_session_id: session.id,
      movement_type: String(form.get("movement_type") || "entrada"),
      description: String(form.get("description") || "Movimentação"),
      amount: Number(form.get("amount") || 0),
      payment_method: String(form.get("payment_method") || "") || null,
      created_by: user?.id,
    }).select("id,movement_type,description,amount,payment_method,created_at").single();
    if (error) return setMessage(error.message);
    setMovements((current) => [data as Movement, ...current]);
    setShowMovement(false);
  }

  async function closeCash(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canWrite || !session) return;
    const counted = Number(new FormData(event.currentTarget).get("counted_balance") || 0);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("cash_sessions").update({
      closed_by: user?.id,
      closed_at: new Date().toISOString(),
      expected_balance: summary.expected,
      counted_balance: counted,
      difference: counted - summary.expected,
    }).eq("id", session.id).eq("clinic_id", clinicId);
    if (error) return setMessage(error.message);
    setShowClose(false);
    setMessage("Caixa fechado. O histórico foi preservado.");
    setSession(null);
    setMovements([]);
  }

  return <div className="module-stack page-enter">
    <div className="page-title-row"><div><span className="eyebrow">MOVIMENTO REAL DO DIA</span><h1>Caixa</h1><p>Entradas e saídas efetivas. O planejamento continua no Financeiro.</p></div><div className="quick-actions">{!session && canWrite && <button className="btn primary elevated" onClick={()=>setShowOpen(true)}><WalletCards size={16}/> Abrir caixa</button>}{session && canWrite && <><button className="btn" onClick={()=>setShowMovement(true)}><Plus size={16}/> Movimentação</button><button className="btn primary" onClick={()=>setShowClose(true)}><LockKeyhole size={16}/> Fechar caixa</button></>}</div></div>
    {message && <div className="notice">{message}</div>}

    {!session && !loading && <div className="hero-empty surface-card"><div className="hero-empty-orb"><Banknote size={30}/></div><span className="eyebrow">CAIXA FECHADO</span><h2>Comece o movimento do dia</h2><p>Abra o caixa com o saldo inicial. Recebimentos, suprimentos e sangrias ficam registrados separadamente do financeiro.</p>{canWrite && <button className="btn primary elevated" onClick={()=>setShowOpen(true)}>Abrir caixa agora</button>}</div>}

    {session && <>
      <div className="cash-status-card surface-card"><div><span className="live-dot"/> Caixa aberto</div><strong>desde {new Intl.DateTimeFormat("pt-BR", { hour:"2-digit", minute:"2-digit" }).format(new Date(session.opened_at))}</strong></div>
      <div className="insight-grid cash-insights">
        <div className="insight-card tone-slate"><div className="insight-icon"><WalletCards size={19}/></div><div><span>Saldo inicial</span><strong>{money(session.opening_balance)}</strong><small>Abertura do caixa</small></div></div>
        <div className="insight-card tone-emerald"><div className="insight-icon"><ArrowDownCircle size={19}/></div><div><span>Entradas</span><strong>{money(summary.entries)}</strong><small>Recebimentos + suprimentos</small></div></div>
        <div className="insight-card tone-rose"><div className="insight-icon"><ArrowUpCircle size={19}/></div><div><span>Saídas</span><strong>{money(summary.exits)}</strong><small>Pagamentos + sangrias</small></div></div>
        <div className="insight-card tone-blue"><div className="insight-icon"><CircleDollarSign size={19}/></div><div><span>Saldo esperado</span><strong>{money(summary.expected)}</strong><small>Calculado automaticamente</small></div></div>
      </div>
      <div className="surface-card modern-list cash-ledger"><div className="workspace-toolbar"><div><span className="eyebrow">MOVIMENTAÇÕES</span><h3 style={{margin:"4px 0 0"}}>Histórico do caixa aberto</h3></div>{canWrite&&<button className="btn" onClick={()=>setShowMovement(true)}><Plus size={15}/> Nova movimentação</button>}</div>{movements.map((m)=><div className="ledger-row" key={m.id}><div className={`ledger-leading ${["entrada","suprimento"].includes(m.movement_type)?"income":"expense"}`}>{["entrada","suprimento"].includes(m.movement_type)?<ArrowDownCircle size={17}/>:<ArrowUpCircle size={17}/>}</div><div className="ledger-main"><strong>{m.description}</strong><span>{m.movement_type} · {m.payment_method || "sem forma informada"} · {new Intl.DateTimeFormat("pt-BR", {hour:"2-digit",minute:"2-digit"}).format(new Date(m.created_at))}</span></div><strong className="ledger-value">{["entrada","suprimento"].includes(m.movement_type)?"+":"-"}{money(m.amount)}</strong></div>)}{movements.length===0&&<div className="modern-empty"><div className="empty-orb"><WalletCards size={24}/></div><h3>Nenhuma movimentação ainda</h3><p>O caixa está aberto e pronto para receber lançamentos.</p></div>}</div>
    </>}

    {showOpen&&<div className="drawer-backdrop" onMouseDown={()=>setShowOpen(false)}><form className="side-drawer" onSubmit={openCash} onMouseDown={(e)=>e.stopPropagation()}><div className="drawer-head"><div><span className="eyebrow">ABERTURA</span><h2>Abrir caixa</h2></div><button type="button" className="icon-btn" onClick={()=>setShowOpen(false)}><X size={18}/></button></div><div className="drawer-body"><div className="field"><label>Saldo inicial</label><input name="opening_balance" type="number" min="0" step="0.01" defaultValue="0"/></div><div className="soft-panel"><strong>Como funciona</strong><p>O saldo inicial entra no cálculo do saldo esperado, mas não é uma receita da clínica.</p></div></div><div className="drawer-foot"><button type="button" className="btn" onClick={()=>setShowOpen(false)}>Cancelar</button><button className="btn primary">Abrir caixa</button></div></form></div>}

    {showMovement&&<div className="drawer-backdrop" onMouseDown={()=>setShowMovement(false)}><form className="side-drawer" onSubmit={addMovement} onMouseDown={(e)=>e.stopPropagation()}><div className="drawer-head"><div><span className="eyebrow">CAIXA ABERTO</span><h2>Nova movimentação</h2></div><button type="button" className="icon-btn" onClick={()=>setShowMovement(false)}><X size={18}/></button></div><div className="drawer-body form-grid"><div className="field full"><label>Tipo</label><select name="movement_type" defaultValue="entrada"><option value="entrada">Entrada</option><option value="saida">Saída</option><option value="suprimento">Suprimento</option><option value="sangria">Sangria</option></select></div><div className="field full"><label>Descrição</label><input name="description" required/></div><div className="field"><label>Valor</label><input name="amount" type="number" min="0.01" step="0.01" required/></div><div className="field"><label>Forma</label><select name="payment_method"><option value="pix">PIX</option><option value="dinheiro">Dinheiro</option><option value="cartao">Cartão</option><option value="transferencia">Transferência</option><option value="outro">Outro</option></select></div></div><div className="drawer-foot"><button type="button" className="btn" onClick={()=>setShowMovement(false)}>Cancelar</button><button className="btn primary">Registrar</button></div></form></div>}

    {showClose&&<div className="drawer-backdrop" onMouseDown={()=>setShowClose(false)}><form className="side-drawer" onSubmit={closeCash} onMouseDown={(e)=>e.stopPropagation()}><div className="drawer-head"><div><span className="eyebrow">CONFERÊNCIA</span><h2>Fechar caixa</h2></div><button type="button" className="icon-btn" onClick={()=>setShowClose(false)}><X size={18}/></button></div><div className="drawer-body"><div className="closing-summary"><span>Saldo esperado</span><strong>{money(summary.expected)}</strong></div><div className="field"><label>Valor contado no caixa</label><input name="counted_balance" type="number" min="0" step="0.01" required/></div><p className="muted-copy">A diferença entre o valor contado e o esperado ficará registrada no fechamento.</p></div><div className="drawer-foot"><button type="button" className="btn" onClick={()=>setShowClose(false)}>Cancelar</button><button className="btn primary">Confirmar fechamento</button></div></form></div>}
  </div>;
}
