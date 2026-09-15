"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowLeft, FileText, Plus, Stethoscope, WalletCards } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Patient = {
  id: string;
  full_name: string;
  phone: string | null;
  birth_date: string | null;
  active: boolean;
  created_at: string;
};

type Anamnesis = { id: string; answers: Record<string, unknown>; alerts: string | null; created_at: string };
type RecordRow = { id: string; title: string; content: string; procedure_name: string | null; created_at: string; locked_at: string | null };
type OdontoEvent = { id: string; tooth_number: number; surface: string | null; event_type: string; status: string; notes: string | null; created_at: string };
type PlanItem = { id: string; tooth_number: number | null; procedure_name: string; quantity: number; unit_price: number; status: string; notes: string | null };
type Plan = { id: string; name: string; status: string; notes: string | null; created_at: string; treatment_plan_items: PlanItem[] };
type BudgetItem = { id: string; description: string; quantity: number; unit_price: number; total: number };
type Budget = { id: string; number: number; status: string; discount: number; total: number; valid_until: string | null; created_at: string; budget_items: BudgetItem[] };
type Receivable = { id: string; description: string; total: number; status: string; created_at: string };

type Props = {
  clinicId: string;
  role: string;
  patient: Patient;
  onBack: () => void;
};

const tabs = ["Resumo", "Anamnese", "Prontuário", "Odontograma", "Tratamento", "Orçamentos", "Financeiro"] as const;
type Tab = (typeof tabs)[number];
const teeth = [18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28,48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38];

function dateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}
function dateOnly(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}
function money(value: number) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function normalizePlan(raw: unknown): Plan {
  const value = raw as Omit<Plan, "treatment_plan_items"> & { treatment_plan_items?: PlanItem[] | null };
  return { ...value, treatment_plan_items: Array.isArray(value.treatment_plan_items) ? value.treatment_plan_items : [] };
}
function normalizeBudget(raw: unknown): Budget {
  const value = raw as Omit<Budget, "budget_items"> & { budget_items?: BudgetItem[] | null };
  return { ...value, budget_items: Array.isArray(value.budget_items) ? value.budget_items : [] };
}

export default function ConnectedPatientDetail({ clinicId, role, patient, onBack }: Props) {
  const [tab, setTab] = useState<Tab>("Resumo");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [anamneses, setAnamneses] = useState<Anamnesis[]>([]);
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [odonto, setOdonto] = useState<OdontoEvent[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [selectedTooth, setSelectedTooth] = useState<number>(11);

  const canClinicalWrite = role === "admin" || role === "dentista";
  const canBudgetWrite = ["admin", "dentista", "recepcao"].includes(role);

  async function loadAll() {
    setLoading(true);
    const supabase = createClient();
    const [a, r, o, p, b, f] = await Promise.all([
      supabase.from("anamneses").select("id,answers,alerts,created_at").eq("clinic_id", clinicId).eq("patient_id", patient.id).order("created_at", { ascending: false }).limit(20),
      supabase.from("medical_records").select("id,title,content,procedure_name,created_at,locked_at").eq("clinic_id", clinicId).eq("patient_id", patient.id).order("created_at", { ascending: false }).limit(100),
      supabase.from("odontogram_events").select("id,tooth_number,surface,event_type,status,notes,created_at").eq("clinic_id", clinicId).eq("patient_id", patient.id).order("created_at", { ascending: false }).limit(300),
      supabase.from("treatment_plans").select("id,name,status,notes,created_at,treatment_plan_items(id,tooth_number,procedure_name,quantity,unit_price,status,notes)").eq("clinic_id", clinicId).eq("patient_id", patient.id).order("created_at", { ascending: false }).limit(30),
      supabase.from("budgets").select("id,number,status,discount,total,valid_until,created_at,budget_items(id,description,quantity,unit_price,total)").eq("clinic_id", clinicId).eq("patient_id", patient.id).order("created_at", { ascending: false }).limit(30),
      supabase.from("accounts_receivable").select("id,description,total,status,created_at").eq("clinic_id", clinicId).eq("patient_id", patient.id).order("created_at", { ascending: false }).limit(100),
    ]);

    const firstError = a.error || r.error || o.error || p.error || b.error || f.error;
    if (firstError) setMessage(`Não foi possível carregar toda a ficha: ${firstError.message}`);
    setAnamneses((a.data || []) as Anamnesis[]);
    setRecords((r.data || []) as RecordRow[]);
    setOdonto((o.data || []) as OdontoEvent[]);
    setPlans((p.data || []).map(normalizePlan));
    setBudgets((b.data || []).map(normalizeBudget));
    setReceivables((f.data || []) as Receivable[]);
    setLoading(false);
  }

  useEffect(() => { void loadAll(); }, [patient.id]);

  async function addAnamnesis(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const payload = {
      clinic_id: clinicId,
      patient_id: patient.id,
      answers: {
        allergies: String(form.get("allergies") || ""),
        medications: String(form.get("medications") || ""),
        conditions: String(form.get("conditions") || ""),
      },
      alerts: String(form.get("alerts") || "") || null,
      created_by: user?.id,
    };
    const { data, error } = await supabase.from("anamneses").insert(payload).select("id,answers,alerts,created_at").single();
    if (error) return setMessage(error.message);
    setAnamneses((current) => [data as Anamnesis, ...current]);
    event.currentTarget.reset();
    setMessage("Anamnese registrada.");
  }

  async function addRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase.from("medical_records").insert({
      clinic_id: clinicId,
      patient_id: patient.id,
      professional_id: user.id,
      title: String(form.get("title") || "Evolução clínica"),
      content: String(form.get("content") || ""),
      procedure_name: String(form.get("procedure_name") || "") || null,
    }).select("id,title,content,procedure_name,created_at,locked_at").single();
    if (error) return setMessage(error.message);
    setRecords((current) => [data as RecordRow, ...current]);
    event.currentTarget.reset();
    setMessage("Registro clínico salvo. Ele ficará no histórico de auditoria.");
  }

  async function addOdontoEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase.from("odontogram_events").insert({
      clinic_id: clinicId,
      patient_id: patient.id,
      tooth_number: selectedTooth,
      surface: String(form.get("surface") || "") || null,
      event_type: String(form.get("event_type") || "Avaliação"),
      status: String(form.get("status") || "planejado"),
      notes: String(form.get("notes") || "") || null,
      professional_id: user?.id,
    }).select("id,tooth_number,surface,event_type,status,notes,created_at").single();
    if (error) return setMessage(error.message);
    setOdonto((current) => [data as OdontoEvent, ...current]);
    event.currentTarget.reset();
    setMessage(`Dente ${selectedTooth} atualizado.`);
  }

  async function addPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase.from("treatment_plans").insert({
      clinic_id: clinicId,
      patient_id: patient.id,
      name: String(form.get("name") || "Plano de tratamento"),
      notes: String(form.get("notes") || "") || null,
      created_by: user?.id,
    }).select("id,name,status,notes,created_at").single();
    if (error) return setMessage(error.message);
    setPlans((current) => [{ ...(data as Omit<Plan, "treatment_plan_items">), treatment_plan_items: [] }, ...current]);
    event.currentTarget.reset();
  }

  async function addPlanItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const planId = String(form.get("plan_id") || "");
    if (!planId) return;
    const unitPrice = Number(String(form.get("unit_price") || "0").replace(",", "."));
    const toothValue = String(form.get("tooth_number") || "");
    const supabase = createClient();
    const { data, error } = await supabase.from("treatment_plan_items").insert({
      clinic_id: clinicId,
      treatment_plan_id: planId,
      tooth_number: toothValue ? Number(toothValue) : null,
      procedure_name: String(form.get("procedure_name") || "Procedimento"),
      quantity: 1,
      unit_price: Number.isFinite(unitPrice) ? unitPrice : 0,
      notes: String(form.get("notes") || "") || null,
    }).select("id,tooth_number,procedure_name,quantity,unit_price,status,notes").single();
    if (error) return setMessage(error.message);
    setPlans((current) => current.map((plan) => plan.id === planId ? { ...plan, treatment_plan_items: [...plan.treatment_plan_items, data as PlanItem] } : plan));
    event.currentTarget.reset();
  }

  async function createBudgetFromPlan(plan: Plan) {
    if (plan.treatment_plan_items.length === 0) return setMessage("Adicione procedimentos ao plano antes de gerar orçamento.");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const total = plan.treatment_plan_items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unit_price), 0);
    const { data: budget, error } = await supabase.from("budgets").insert({
      clinic_id: clinicId,
      patient_id: patient.id,
      treatment_plan_id: plan.id,
      total,
      created_by: user?.id,
    }).select("id,number,status,discount,total,valid_until,created_at").single();
    if (error || !budget) return setMessage(error?.message || "Não foi possível gerar o orçamento.");
    const items = plan.treatment_plan_items.map((item) => ({
      clinic_id: clinicId,
      budget_id: budget.id,
      description: item.procedure_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total: Number(item.quantity) * Number(item.unit_price),
      treatment_plan_item_id: item.id,
    }));
    const { data: inserted, error: itemError } = await supabase.from("budget_items").insert(items).select("id,description,quantity,unit_price,total");
    if (itemError) return setMessage(itemError.message);
    setBudgets((current) => [{ ...(budget as Omit<Budget, "budget_items">), budget_items: (inserted || []) as BudgetItem[] }, ...current]);
    setTab("Orçamentos");
    setMessage("Orçamento gerado a partir do plano de tratamento.");
  }

  const latestAnamnesis = anamneses[0];
  const latestByTooth = useMemo(() => {
    const map = new Map<number, OdontoEvent>();
    for (const item of odonto) if (!map.has(item.tooth_number)) map.set(item.tooth_number, item);
    return map;
  }, [odonto]);

  return <>
    <div className="page-head">
      <div><button className="btn" onClick={onBack} style={{marginBottom:12}}><ArrowLeft size={15}/> Voltar</button><h1>{patient.full_name}</h1><p>{patient.phone || "Sem telefone"} · Nascimento: {dateOnly(patient.birth_date)}</p></div>
      <span className={patient.active ? "badge green" : "badge red"}>{patient.active ? "Ativo" : "Inativo"}</span>
    </div>
    {message && <div className="notice">{message}</div>}
    <div className="card">
      <div className="tabs">{tabs.map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}</button>)}</div>
      <div className="pad" style={{padding:18}}>
        {loading && <div className="empty">Carregando ficha clínica...</div>}
        {!loading && tab === "Resumo" && <div className="grid metrics">
          <div className="card metric"><div className="label">Prontuário</div><div className="value">{records.length}</div><div className="hint">Registros clínicos</div></div>
          <div className="card metric"><div className="label">Odontograma</div><div className="value">{latestByTooth.size}</div><div className="hint">Dentes com histórico</div></div>
          <div className="card metric"><div className="label">Planos</div><div className="value">{plans.length}</div><div className="hint">Planos de tratamento</div></div>
          <div className="card metric"><div className="label">Orçamentos</div><div className="value">{budgets.length}</div><div className="hint">Orçamentos emitidos</div></div>
        </div>}

        {!loading && tab === "Anamnese" && <div className="grid two">
          <form className="card pad form-grid" onSubmit={addAnamnesis}><div className="field full"><label>Alergias</label><textarea name="allergies" rows={3}/></div><div className="field full"><label>Medicamentos em uso</label><textarea name="medications" rows={3}/></div><div className="field full"><label>Condições de saúde / histórico</label><textarea name="conditions" rows={4}/></div><div className="field full"><label>Alertas importantes</label><textarea name="alerts" rows={2}/></div><div className="field full"><button className="btn primary" disabled={!canClinicalWrite}>{canClinicalWrite ? "Registrar nova anamnese" : "Sem permissão clínica"}</button></div></form>
          <div className="card pad"><h3 style={{marginTop:0}}>Última anamnese</h3>{latestAnamnesis ? <><p><strong>Data:</strong> {dateTime(latestAnamnesis.created_at)}</p><p><strong>Alertas:</strong> {latestAnamnesis.alerts || "Nenhum"}</p><pre style={{whiteSpace:"pre-wrap",fontFamily:"inherit",color:"var(--muted)"}}>{JSON.stringify(latestAnamnesis.answers, null, 2)}</pre></> : <div className="empty">Nenhuma anamnese registrada.</div>}</div>
        </div>}

        {!loading && tab === "Prontuário" && <div className="grid two">
          <form className="card pad form-grid" onSubmit={addRecord}><div className="field full"><label>Título</label><input name="title" defaultValue="Evolução clínica" required/></div><div className="field full"><label>Procedimento</label><input name="procedure_name"/></div><div className="field full"><label>Evolução / observações clínicas</label><textarea name="content" rows={8} required/></div><div className="field full"><button className="btn primary" disabled={!canClinicalWrite}>{canClinicalWrite ? "Salvar no prontuário" : "Sem permissão clínica"}</button></div><div className="notice field full">Registros de prontuário não possuem botão de exclusão. Correções devem ser feitas por novo registro/adendo.</div></form>
          <div className="card"><div className="card-head"><h3>Histórico</h3><FileText size={17}/></div>{records.map((r) => <div key={r.id} style={{padding:16,borderBottom:"1px solid var(--border)"}}><strong>{r.title}</strong><div className="timeline-meta">{dateTime(r.created_at)}{r.procedure_name ? ` · ${r.procedure_name}` : ""}</div><p style={{whiteSpace:"pre-wrap",marginBottom:0}}>{r.content}</p></div>)}{records.length === 0 && <div className="empty">Prontuário sem registros.</div>}</div>
        </div>}

        {!loading && tab === "Odontograma" && <div className="grid two">
          <div className="card pad"><h3 style={{marginTop:0}}>Odontograma</h3><p style={{color:"var(--muted)"}}>Clique em um dente para registrar ou consultar a situação.</p><div className="odontogram">{teeth.map((tooth) => { const last = latestByTooth.get(tooth); return <button key={tooth} className={`tooth ${last?.status === "realizado" ? "done" : last ? "pending" : ""}`} onClick={() => setSelectedTooth(tooth)} style={selectedTooth === tooth ? {outline:"2px solid var(--brand)"} : undefined}>{tooth}</button>; })}</div></div>
          <form className="card pad form-grid" onSubmit={addOdontoEvent}><div className="field full"><label>Dente selecionado</label><input value={selectedTooth} readOnly/></div><div className="field"><label>Evento</label><select name="event_type" defaultValue="Avaliação"><option>Avaliação</option><option>Cárie</option><option>Restauração</option><option>Endodontia</option><option>Extração</option><option>Prótese</option><option>Implante</option><option>Profilaxia</option><option>Outro</option></select></div><div className="field"><label>Status</label><select name="status" defaultValue="planejado"><option value="planejado">Planejado</option><option value="em_tratamento">Em tratamento</option><option value="realizado">Realizado</option></select></div><div className="field"><label>Face</label><input name="surface" placeholder="O, M, D, V, L..."/></div><div className="field full"><label>Observação</label><textarea name="notes" rows={4}/></div><div className="field full"><button className="btn primary" disabled={!canClinicalWrite}>Salvar evento odontológico</button></div></form>
        </div>}

        {!loading && tab === "Tratamento" && <div className="grid two">
          <div><form className="card pad form-grid" onSubmit={addPlan}><div className="field full"><label>Novo plano</label><input name="name" placeholder="Ex.: Reabilitação 2026" required/></div><div className="field full"><label>Observações</label><textarea name="notes" rows={3}/></div><div className="field full"><button className="btn primary" disabled={!canClinicalWrite}><Plus size={15}/> Criar plano</button></div></form><form className="card pad form-grid" style={{marginTop:16}} onSubmit={addPlanItem}><div className="field full"><label>Plano</label><select name="plan_id" required defaultValue=""><option value="" disabled>Selecione</option>{plans.map((p)=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div><div className="field"><label>Dente</label><input name="tooth_number" type="number"/></div><div className="field"><label>Valor</label><input name="unit_price" type="number" min="0" step="0.01"/></div><div className="field full"><label>Procedimento</label><input name="procedure_name" required/></div><div className="field full"><label>Observações</label><textarea name="notes" rows={2}/></div><div className="field full"><button className="btn primary" disabled={!canClinicalWrite}>Adicionar procedimento</button></div></form></div>
          <div>{plans.map((plan) => { const total = plan.treatment_plan_items.reduce((s,i)=>s+Number(i.quantity)*Number(i.unit_price),0); return <div className="card" key={plan.id} style={{marginBottom:14}}><div className="card-head"><div><h3>{plan.name}</h3><div className="timeline-meta">{plan.status} · {money(total)}</div></div><button className="btn" disabled={!canBudgetWrite} onClick={()=>void createBudgetFromPlan(plan)}>Gerar orçamento</button></div>{plan.treatment_plan_items.map((item)=><div className="kpi-row" style={{padding:"11px 16px"}} key={item.id}><span>{item.tooth_number ? `Dente ${item.tooth_number} · ` : ""}{item.procedure_name}</span><strong>{money(Number(item.quantity)*Number(item.unit_price))}</strong></div>)}{plan.treatment_plan_items.length===0&&<div className="empty">Plano ainda sem procedimentos.</div>}</div>; })}{plans.length===0&&<div className="card empty">Nenhum plano de tratamento.</div>}</div>
        </div>}

        {!loading && tab === "Orçamentos" && <div>{budgets.map((budget)=><div className="card" key={budget.id} style={{marginBottom:14}}><div className="card-head"><div><h3>Orçamento #{budget.number}</h3><div className="timeline-meta">{dateTime(budget.created_at)} · {budget.status}</div></div><strong>{money(budget.total)}</strong></div>{budget.budget_items.map((item)=><div className="kpi-row" style={{padding:"11px 16px"}} key={item.id}><span>{item.description}</span><strong>{money(item.total)}</strong></div>)}</div>)}{budgets.length===0&&<div className="card empty">Nenhum orçamento gerado.</div>}</div>}

        {!loading && tab === "Financeiro" && <div className="card"><div className="card-head"><h3>Contas a receber deste paciente</h3><WalletCards size={17}/></div>{receivables.map((item)=><div className="kpi-row" style={{padding:"12px 16px"}} key={item.id}><span>{item.description}<small style={{display:"block"}}>{item.status} · {dateTime(item.created_at)}</small></span><strong>{money(item.total)}</strong></div>)}{receivables.length===0&&<div className="empty">Nenhuma conta a receber vinculada.</div>}</div>}
      </div>
    </div>
  </>;
}
