"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, CalendarClock, CircleDollarSign, Plus, ReceiptText, Search, TrendingDown, TrendingUp, WalletCards, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Patient = { id: string; full_name: string };
type Receivable = {
  id: string;
  patient_id: string | null;
  description: string;
  total: number;
  status: string;
  created_at: string;
  patients: { full_name: string } | { full_name: string }[] | null;
  receivable_installments: { id: string; installment_number: number; due_date: string; amount: number; paid_amount: number; status: string }[];
};
type Payable = {
  id: string;
  supplier: string | null;
  description: string;
  due_date: string;
  amount: number;
  paid_amount: number;
  status: string;
  category: string | null;
};

type Props = { clinicId: string; role: string; patients: Patient[] };
type FinanceTab = "receber" | "pagar";

function money(value: number) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function patientName(value: Receivable["patients"]) {
  if (Array.isArray(value)) return value[0]?.full_name || "Sem paciente";
  return value?.full_name || "Sem paciente";
}
function statusLabel(value: string) {
  return value.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase());
}
function badgeClass(status: string) {
  if (status === "pago") return "badge green";
  if (status === "vencido") return "badge red";
  if (status === "parcial") return "badge orange";
  return "badge blue";
}

export default function ConnectedFinanceModule({ clinicId, role, patients }: Props) {
  const [tab, setTab] = useState<FinanceTab>("receber");
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [payables, setPayables] = useState<Payable[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [showReceivable, setShowReceivable] = useState(false);
  const [showPayable, setShowPayable] = useState(false);
  const [message, setMessage] = useState("");

  const canWrite = role === "admin" || role === "financeiro";

  async function load() {
    setLoading(true);
    const supabase = createClient();
    const [ar, ap] = await Promise.all([
      supabase.from("accounts_receivable")
        .select("id,patient_id,description,total,status,created_at,patients(full_name),receivable_installments(id,installment_number,due_date,amount,paid_amount,status)")
        .eq("clinic_id", clinicId).order("created_at", { ascending: false }).limit(500),
      supabase.from("accounts_payable")
        .select("id,supplier,description,due_date,amount,paid_amount,status,category")
        .eq("clinic_id", clinicId).order("due_date", { ascending: true }).limit(500),
    ]);
    if (ar.error && !["recepcao"].includes(role)) setMessage(ar.error.message);
    if (ap.error && !["recepcao", "dentista"].includes(role)) setMessage(ap.error.message);
    setReceivables((ar.data || []) as Receivable[]);
    setPayables((ap.data || []) as Payable[]);
    setLoading(false);
  }

  useEffect(() => { void load(); }, [clinicId]);

  const totals = useMemo(() => {
    const receivableTotal = receivables.filter((r) => r.status !== "cancelado").reduce((s, r) => s + Number(r.total), 0);
    const received = receivables.reduce((sum, r) => sum + r.receivable_installments.reduce((s, i) => s + Number(i.paid_amount || 0), 0), 0);
    const overdue = receivables.reduce((sum, r) => sum + r.receivable_installments.filter((i) => i.status === "vencido").reduce((s, i) => s + Math.max(0, Number(i.amount) - Number(i.paid_amount || 0)), 0), 0);
    const payableTotal = payables.filter((p) => p.status !== "cancelado" && p.status !== "pago").reduce((s, p) => s + Math.max(0, Number(p.amount) - Number(p.paid_amount || 0)), 0);
    return { receivableTotal, received, overdue, payableTotal };
  }, [receivables, payables]);

  const filteredReceivables = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return receivables;
    return receivables.filter((r) => `${r.description} ${patientName(r.patients)} ${r.status}`.toLowerCase().includes(q));
  }, [query, receivables]);
  const filteredPayables = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return payables;
    return payables.filter((r) => `${r.description} ${r.supplier || ""} ${r.category || ""}`.toLowerCase().includes(q));
  }, [query, payables]);

  async function addReceivable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canWrite) return;
    const form = new FormData(event.currentTarget);
    const total = Number(form.get("total") || 0);
    const dueDate = String(form.get("due_date") || "");
    const patientId = String(form.get("patient_id") || "") || null;
    if (!total || !dueDate) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: account, error } = await supabase.from("accounts_receivable").insert({
      clinic_id: clinicId,
      patient_id: patientId,
      description: String(form.get("description") || "Conta a receber"),
      total,
      created_by: user?.id,
    }).select("id,patient_id,description,total,status,created_at,patients(full_name)").single();
    if (error || !account) return setMessage(error?.message || "Não foi possível criar a conta.");
    const { data: installment, error: installmentError } = await supabase.from("receivable_installments").insert({
      clinic_id: clinicId,
      account_receivable_id: account.id,
      installment_number: 1,
      due_date: dueDate,
      amount: total,
    }).select("id,installment_number,due_date,amount,paid_amount,status").single();
    if (installmentError) return setMessage(installmentError.message);
    setReceivables((current) => [{ ...(account as Omit<Receivable, "receivable_installments">), receivable_installments: installment ? [installment] : [] }, ...current]);
    setShowReceivable(false);
    setMessage("Conta a receber criada com sucesso.");
  }

  async function addPayable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canWrite) return;
    const form = new FormData(event.currentTarget);
    const amount = Number(form.get("amount") || 0);
    const dueDate = String(form.get("due_date") || "");
    if (!amount || !dueDate) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase.from("accounts_payable").insert({
      clinic_id: clinicId,
      supplier: String(form.get("supplier") || "") || null,
      description: String(form.get("description") || "Conta a pagar"),
      due_date: dueDate,
      amount,
      category: String(form.get("category") || "") || null,
      created_by: user?.id,
    }).select("id,supplier,description,due_date,amount,paid_amount,status,category").single();
    if (error) return setMessage(error.message);
    setPayables((current) => [...current, data as Payable].sort((a,b)=>a.due_date.localeCompare(b.due_date)));
    setShowPayable(false);
    setMessage("Conta a pagar criada com sucesso.");
  }

  return <div className="module-stack page-enter">
    <div className="page-title-row">
      <div><span className="eyebrow">GESTÃO FINANCEIRA</span><h1>Financeiro</h1><p>Previsão de recebimentos e obrigações, separado do caixa diário.</p></div>
      {canWrite && <button className="btn primary elevated" onClick={() => tab === "receber" ? setShowReceivable(true) : setShowPayable(true)}><Plus size={16}/> {tab === "receber" ? "Nova cobrança" : "Nova despesa"}</button>}
    </div>

    {message && <div className="notice">{message}</div>}

    <div className="insight-grid finance-insights">
      <div className="insight-card tone-emerald"><div className="insight-icon"><TrendingUp size={19}/></div><div><span>Previsto a receber</span><strong>{money(totals.receivableTotal)}</strong><small>Contas emitidas</small></div></div>
      <div className="insight-card tone-blue"><div className="insight-icon"><ArrowDownLeft size={19}/></div><div><span>Já recebido</span><strong>{money(totals.received)}</strong><small>Pagamentos registrados</small></div></div>
      <div className="insight-card tone-amber"><div className="insight-icon"><CalendarClock size={19}/></div><div><span>Em atraso</span><strong>{money(totals.overdue)}</strong><small>Parcelas vencidas</small></div></div>
      <div className="insight-card tone-rose"><div className="insight-icon"><TrendingDown size={19}/></div><div><span>A pagar</span><strong>{money(totals.payableTotal)}</strong><small>Obrigações pendentes</small></div></div>
    </div>

    <div className="surface-card finance-workspace">
      <div className="workspace-toolbar">
        <div className="pill-tabs"><button className={tab === "receber" ? "active" : ""} onClick={() => setTab("receber")}><ArrowDownLeft size={15}/> Contas a receber</button><button className={tab === "pagar" ? "active" : ""} onClick={() => setTab("pagar")}><ArrowUpRight size={15}/> Contas a pagar</button></div>
        <div className="soft-search"><Search size={16}/><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Pesquisar lançamentos..."/></div>
      </div>
      {loading ? <div className="modern-empty"><div className="empty-orb"><CircleDollarSign size={24}/></div><h3>Carregando financeiro</h3><p>Buscando lançamentos no banco.</p></div> : tab === "receber" ? <div className="modern-list">
        {filteredReceivables.map((item) => {
          const installment = item.receivable_installments?.[0];
          return <div className="ledger-row" key={item.id}><div className="ledger-leading income"><ReceiptText size={17}/></div><div className="ledger-main"><strong>{item.description}</strong><span>{patientName(item.patients)}{installment?.due_date ? ` · vence ${new Intl.DateTimeFormat("pt-BR").format(new Date(`${installment.due_date}T12:00:00`))}` : ""}</span></div><span className={badgeClass(installment?.status || item.status)}>{statusLabel(installment?.status || item.status)}</span><strong className="ledger-value">{money(item.total)}</strong></div>;
        })}
        {filteredReceivables.length === 0 && <div className="modern-empty"><div className="empty-orb"><ReceiptText size={24}/></div><h3>Nenhuma conta a receber</h3><p>As cobranças e parcelamentos da clínica aparecerão aqui.</p></div>}
      </div> : <div className="modern-list">
        {filteredPayables.map((item) => <div className="ledger-row" key={item.id}><div className="ledger-leading expense"><WalletCards size={17}/></div><div className="ledger-main"><strong>{item.description}</strong><span>{item.supplier || "Sem fornecedor"} · vence {new Intl.DateTimeFormat("pt-BR").format(new Date(`${item.due_date}T12:00:00`))}</span></div><span className={badgeClass(item.status)}>{statusLabel(item.status)}</span><strong className="ledger-value">{money(item.amount)}</strong></div>)}
        {filteredPayables.length === 0 && <div className="modern-empty"><div className="empty-orb"><WalletCards size={24}/></div><h3>Nenhuma conta a pagar</h3><p>Despesas, fornecedores e compromissos financeiros aparecerão aqui.</p></div>}
      </div>}
    </div>

    {showReceivable && <div className="drawer-backdrop" onMouseDown={() => setShowReceivable(false)}><form className="side-drawer" onSubmit={addReceivable} onMouseDown={(e)=>e.stopPropagation()}><div className="drawer-head"><div><span className="eyebrow">NOVA COBRANÇA</span><h2>Conta a receber</h2></div><button type="button" className="icon-btn" onClick={()=>setShowReceivable(false)}><X size={18}/></button></div><div className="drawer-body form-grid"><div className="field full"><label>Paciente</label><select name="patient_id" defaultValue=""><option value="">Sem paciente vinculado</option>{patients.map(p=><option value={p.id} key={p.id}>{p.full_name}</option>)}</select></div><div className="field full"><label>Descrição</label><input name="description" required placeholder="Ex.: Tratamento odontológico"/></div><div className="field"><label>Valor</label><input name="total" type="number" min="0.01" step="0.01" required/></div><div className="field"><label>Vencimento</label><input name="due_date" type="date" required/></div></div><div className="drawer-foot"><button type="button" className="btn" onClick={()=>setShowReceivable(false)}>Cancelar</button><button className="btn primary">Criar cobrança</button></div></form></div>}

    {showPayable && <div className="drawer-backdrop" onMouseDown={() => setShowPayable(false)}><form className="side-drawer" onSubmit={addPayable} onMouseDown={(e)=>e.stopPropagation()}><div className="drawer-head"><div><span className="eyebrow">NOVA DESPESA</span><h2>Conta a pagar</h2></div><button type="button" className="icon-btn" onClick={()=>setShowPayable(false)}><X size={18}/></button></div><div className="drawer-body form-grid"><div className="field full"><label>Descrição</label><input name="description" required/></div><div className="field full"><label>Fornecedor</label><input name="supplier"/></div><div className="field"><label>Valor</label><input name="amount" type="number" min="0.01" step="0.01" required/></div><div className="field"><label>Vencimento</label><input name="due_date" type="date" required/></div><div className="field full"><label>Categoria</label><input name="category" placeholder="Ex.: Laboratório, aluguel, material"/></div></div><div className="drawer-foot"><button type="button" className="btn" onClick={()=>setShowPayable(false)}>Cancelar</button><button className="btn primary">Criar despesa</button></div></form></div>}
  </div>;
}
