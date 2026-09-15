"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  CreditCard,
  FileText,
  HeartPulse,
  Phone,
  Plus,
  UserRound,
  WalletCards,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Patient = {
  id: string;
  full_name: string;
  cpf?: string | null;
  phone: string | null;
  whatsapp?: string | null;
  email?: string | null;
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

type Props = { clinicId: string; role: string; patient: Patient; onBack: () => void };

type Tab = "resumo" | "anamnese" | "prontuario" | "odontograma" | "tratamento" | "orcamentos" | "financeiro";

const tabItems: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "resumo", label: "Visão geral", icon: <Activity size={16}/> },
  { id: "anamnese", label: "Anamnese", icon: <HeartPulse size={16}/> },
  { id: "prontuario", label: "Prontuário", icon: <FileText size={16}/> },
  { id: "odontograma", label: "Odontograma", icon: <ClipboardList size={16}/> },
  { id: "tratamento", label: "Tratamentos", icon: <Plus size={16}/> },
  { id: "orcamentos", label: "Orçamentos", icon: <CreditCard size={16}/> },
  { id: "financeiro", label: "Financeiro", icon: <WalletCards size={16}/> },
];

const teeth = [18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28,48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38];

function dateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}
function dateOnly(value: string | null) {
  if (!value) return "Não informado";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}
function money(value: number) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function initials(value: string) {
  return value.split(" ").filter(Boolean).slice(0,2).map((part)=>part[0]?.toUpperCase()).join("") || "P";
}
function answerText(anamnesis: Anamnesis | undefined, key: string) {
  const value = anamnesis?.answers?.[key];
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "Não informado";
}
function hasRealAlert(value: string | null | undefined) {
  if (!value) return false;
  return !["nenhum", "nenhuma", "não", "nao", "sem alertas"].includes(value.trim().toLowerCase());
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
  const [tab, setTab] = useState<Tab>("resumo");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [anamneses, setAnamneses] = useState<Anamnesis[]>([]);
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [odonto, setOdonto] = useState<OdontoEvent[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [selectedTooth, setSelectedTooth] = useState(11);

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
    const { data, error } = await supabase.from("anamneses").insert({
      clinic_id: clinicId,
      patient_id: patient.id,
      answers: {
        allergies: String(form.get("allergies") || ""),
        medications: String(form.get("medications") || ""),
        conditions: String(form.get("conditions") || ""),
      },
      alerts: String(form.get("alerts") || "") || null,
      created_by: user?.id,
    }).select("id,answers,alerts,created_at").single();
    if (error) return setMessage(error.message);
    setAnamneses((current) => [data as Anamnesis, ...current]);
    event.currentTarget.reset();
    setMessage("Anamnese registrada com sucesso.");
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
    setMessage("Evolução registrada no prontuário.");
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
    setMessage("Plano de tratamento criado.");
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
    setMessage("Procedimento adicionado ao plano.");
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
    setTab("orcamentos");
    setMessage("Orçamento gerado a partir do plano de tratamento.");
  }

  const latestAnamnesis = anamneses[0];
  const latestByTooth = useMemo(() => {
    const map = new Map<number, OdontoEvent>();
    for (const item of odonto) if (!map.has(item.tooth_number)) map.set(item.tooth_number, item);
    return map;
  }, [odonto]);
  const selectedToothHistory = odonto.filter((item) => item.tooth_number === selectedTooth);
  const treatmentTotal = plans.reduce((sum, plan) => sum + plan.treatment_plan_items.reduce((inner, item) => inner + Number(item.quantity) * Number(item.unit_price), 0), 0);
  const receivableTotal = receivables.filter((item)=>item.status !== "cancelado").reduce((sum,item)=>sum+Number(item.total),0);

  return <div className="patient-workspace page-enter">
    <button className="back-link" onClick={onBack}><ArrowLeft size={16}/> Voltar para pacientes</button>

    <section className="patient-hero">
      <div className="patient-avatar-large">{initials(patient.full_name)}</div>
      <div className="patient-hero-copy">
        <div className="patient-title-line"><h1>{patient.full_name}</h1><span className={patient.active ? "status-dot-chip active" : "status-dot-chip inactive"}><span/>{patient.active ? "Paciente ativo" : "Paciente inativo"}</span></div>
        <div className="patient-meta-row">
          <span><Phone size={14}/>{patient.phone || patient.whatsapp || "Telefone não informado"}</span>
          <span><CalendarDays size={14}/>{dateOnly(patient.birth_date)}</span>
          <span><UserRound size={14}/>{patient.cpf || "CPF não informado"}</span>
        </div>
      </div>
    </section>

    {message && <div className="notice floating-notice">{message}</div>}

    <nav className="patient-subnav" aria-label="Navegação da ficha">
      {tabItems.map((item)=><button key={item.id} className={tab === item.id ? "active" : ""} onClick={()=>setTab(item.id)}>{item.icon}<span>{item.label}</span></button>)}
    </nav>

    {loading ? <div className="surface-card modern-empty patient-loading"><div className="empty-orb"><Activity size={24}/></div><h3>Carregando ficha</h3><p>Organizando as informações clínicas do paciente.</p></div> : <>
      {tab === "resumo" && <section className="patient-tab-panel">
        <div className="insight-grid patient-insights">
          <div className="insight-card tone-blue"><div className="insight-icon"><FileText size={19}/></div><div><span>Prontuário</span><strong>{records.length}</strong><small>registros clínicos</small></div></div>
          <div className="insight-card tone-violet"><div className="insight-icon"><ClipboardList size={19}/></div><div><span>Odontograma</span><strong>{latestByTooth.size}</strong><small>dentes com histórico</small></div></div>
          <div className="insight-card tone-sky"><div className="insight-icon"><Plus size={19}/></div><div><span>Planejado</span><strong>{money(treatmentTotal)}</strong><small>em tratamentos</small></div></div>
          <div className="insight-card tone-slate"><div className="insight-icon"><CircleDollarSign size={19}/></div><div><span>Financeiro</span><strong>{money(receivableTotal)}</strong><small>contas vinculadas</small></div></div>
        </div>
        <div className="patient-summary-grid">
          <div className="surface-card premium-card"><div className="section-heading"><div><span className="eyebrow">CLÍNICO</span><h2>Resumo de saúde</h2></div><button className="btn ghost" onClick={()=>setTab("anamnese")}>Abrir anamnese <ChevronRight size={15}/></button></div>{latestAnamnesis ? <div className="summary-list"><div><span>Alergias</span><strong>{answerText(latestAnamnesis,"allergies")}</strong></div><div><span>Medicamentos</span><strong>{answerText(latestAnamnesis,"medications")}</strong></div><div><span>Condições / histórico</span><strong>{answerText(latestAnamnesis,"conditions")}</strong></div><div><span>Alertas</span><strong className={hasRealAlert(latestAnamnesis.alerts)?"danger-text":""}>{latestAnamnesis.alerts || "Nenhum"}</strong></div></div> : <div className="modern-empty compact-empty"><HeartPulse size={24}/><h3>Sem anamnese</h3><p>Registre o histórico de saúde antes do atendimento.</p></div>}</div>
          <div className="surface-card premium-card"><div className="section-heading"><div><span className="eyebrow">HISTÓRICO</span><h2>Últimas evoluções</h2></div><button className="btn ghost" onClick={()=>setTab("prontuario")}>Abrir prontuário <ChevronRight size={15}/></button></div><div className="clinical-feed">{records.slice(0,4).map((record)=><article key={record.id}><span className="feed-dot"/><div><strong>{record.title}</strong><small>{dateTime(record.created_at)}{record.procedure_name ? ` · ${record.procedure_name}` : ""}</small><p>{record.content}</p></div></article>)}{records.length===0&&<div className="modern-empty compact-empty"><FileText size={24}/><h3>Prontuário sem registros</h3><p>As evoluções clínicas aparecerão aqui.</p></div>}</div></div>
        </div>
      </section>}

      {tab === "anamnese" && <section className="patient-tab-panel clinical-layout">
        <form className="surface-card clinical-form-card" onSubmit={addAnamnesis}>
          <div className="section-heading"><div><span className="eyebrow">NOVA ANAMNESE</span><h2>Histórico de saúde</h2><p>Registre apenas informações relevantes para o atendimento odontológico.</p></div><div className="section-icon"><HeartPulse size={21}/></div></div>
          <div className="clinical-form-grid">
            <div className="field full"><label>Alergias e reações conhecidas</label><textarea name="allergies" rows={3} placeholder="Ex.: dipirona, látex, anestésico local..."/></div>
            <div className="field full"><label>Medicamentos em uso</label><textarea name="medications" rows={3} placeholder="Informe medicamento, dose quando relevante e frequência."/></div>
            <div className="field full"><label>Condições de saúde / histórico</label><textarea name="conditions" rows={4} placeholder="Hipertensão, diabetes, cirurgias, gestação, histórico cardiovascular..."/></div>
            <div className="field full"><label>Alertas importantes para a equipe</label><textarea name="alerts" rows={2} placeholder="Somente alertas que precisam ficar evidentes na ficha."/></div>
          </div>
          <div className="clinical-form-footer"><span><AlertTriangle size={15}/> O histórico anterior será preservado.</span><button className="btn primary elevated" disabled={!canClinicalWrite}>{canClinicalWrite ? "Registrar anamnese" : "Sem permissão clínica"}</button></div>
        </form>
        <aside className="surface-card clinical-side-card">
          <div className="section-heading"><div><span className="eyebrow">MAIS RECENTE</span><h2>Última anamnese</h2></div></div>
          {latestAnamnesis ? <><div className="record-date-chip">Registrada em {dateTime(latestAnamnesis.created_at)}</div><div className="summary-list spacious"><div><span>Alergias</span><strong>{answerText(latestAnamnesis,"allergies")}</strong></div><div><span>Medicamentos em uso</span><strong>{answerText(latestAnamnesis,"medications")}</strong></div><div><span>Condições / histórico</span><strong>{answerText(latestAnamnesis,"conditions")}</strong></div><div><span>Alertas importantes</span><strong className={hasRealAlert(latestAnamnesis.alerts)?"danger-text":""}>{latestAnamnesis.alerts || "Nenhum"}</strong></div></div>{anamneses.length>1&&<div className="history-stack"><span className="eyebrow">HISTÓRICO</span>{anamneses.slice(1,5).map((item)=><div key={item.id}><span>{dateTime(item.created_at)}</span><span className="badge blue">registro anterior</span></div>)}</div>}</> : <div className="modern-empty"><HeartPulse size={24}/><h3>Nenhum registro ainda</h3><p>A primeira anamnese ficará resumida aqui.</p></div>}
        </aside>
      </section>}

      {tab === "prontuario" && <section className="patient-tab-panel clinical-layout">
        <form className="surface-card clinical-form-card" onSubmit={addRecord}>
          <div className="section-heading"><div><span className="eyebrow">NOVA EVOLUÇÃO</span><h2>Prontuário clínico</h2><p>Registre atendimento, conduta, procedimento e observações clínicas.</p></div><div className="section-icon"><FileText size={21}/></div></div>
          <div className="clinical-form-grid"><div className="field full"><label>Título</label><input name="title" defaultValue="Evolução clínica" required/></div><div className="field full"><label>Procedimento realizado</label><input name="procedure_name" placeholder="Ex.: restauração, profilaxia, avaliação..."/></div><div className="field full"><label>Evolução / observações</label><textarea name="content" rows={9} required placeholder="Descreva o atendimento de forma objetiva e clínica."/></div></div>
          <div className="clinical-form-footer"><span><FileText size={15}/> Correções devem ser feitas por novo registro ou adendo.</span><button className="btn primary elevated" disabled={!canClinicalWrite}>{canClinicalWrite ? "Salvar evolução" : "Sem permissão clínica"}</button></div>
        </form>
        <aside className="surface-card clinical-side-card feed-card"><div className="section-heading"><div><span className="eyebrow">LINHA DO TEMPO</span><h2>Histórico clínico</h2></div></div><div className="clinical-feed large">{records.map((record)=><article key={record.id}><span className="feed-dot"/><div><strong>{record.title}</strong><small>{dateTime(record.created_at)}{record.procedure_name?` · ${record.procedure_name}`:""}</small><p>{record.content}</p></div></article>)}{records.length===0&&<div className="modern-empty"><FileText size={24}/><h3>Prontuário sem registros</h3><p>A primeira evolução ficará registrada aqui.</p></div>}</div></aside>
      </section>}

      {tab === "odontograma" && <section className="patient-tab-panel odonto-layout">
        <div className="surface-card odontogram-card"><div className="section-heading"><div><span className="eyebrow">MAPA ODONTOLÓGICO</span><h2>Odontograma</h2><p>Selecione um dente para consultar ou registrar sua situação.</p></div></div><div className="odontogram-modern">{teeth.map((tooth)=>{const last=latestByTooth.get(tooth);return <button key={tooth} className={`tooth-modern ${last?.status==="realizado"?"done":last?"planned":""} ${selectedTooth===tooth?"selected":""}`} onClick={()=>setSelectedTooth(tooth)}><span>{tooth}</span><small>{last?.event_type || "Sem registro"}</small></button>})}</div><div className="odonto-legend"><span><i className="legend-dot clean"/> Sem registro</span><span><i className="legend-dot planned"/> Planejado</span><span><i className="legend-dot done"/> Realizado</span></div></div>
        <div className="odonto-side-stack"><form className="surface-card clinical-form-card compact-form" onSubmit={addOdontoEvent}><div className="section-heading"><div><span className="eyebrow">DENTE {selectedTooth}</span><h2>Novo evento</h2></div></div><div className="clinical-form-grid"><div className="field"><label>Evento</label><select name="event_type" defaultValue="Avaliação"><option>Avaliação</option><option>Cárie</option><option>Restauração</option><option>Endodontia</option><option>Extração</option><option>Prótese</option><option>Implante</option><option>Profilaxia</option><option>Outro</option></select></div><div className="field"><label>Status</label><select name="status" defaultValue="planejado"><option value="planejado">Planejado</option><option value="em_tratamento">Em tratamento</option><option value="realizado">Realizado</option></select></div><div className="field full"><label>Face</label><input name="surface" placeholder="O, M, D, V, L..."/></div><div className="field full"><label>Observação</label><textarea name="notes" rows={4}/></div></div><button className="btn primary full-button" disabled={!canClinicalWrite}>Salvar no odontograma</button></form><div className="surface-card tooth-history"><div className="section-heading"><div><span className="eyebrow">HISTÓRICO</span><h2>Dente {selectedTooth}</h2></div></div>{selectedToothHistory.slice(0,8).map((item)=><div className="tooth-history-row" key={item.id}><span className={`history-status ${item.status}`}/><div><strong>{item.event_type}</strong><small>{dateTime(item.created_at)}{item.surface?` · face ${item.surface}`:""}</small>{item.notes&&<p>{item.notes}</p>}</div></div>)}{selectedToothHistory.length===0&&<div className="modern-empty compact-empty"><ClipboardList size={22}/><h3>Sem histórico</h3><p>Este dente ainda não possui eventos.</p></div>}</div></div>
      </section>}

      {tab === "tratamento" && <section className="patient-tab-panel treatment-layout">
        <div className="treatment-builder"><form className="surface-card clinical-form-card compact-form" onSubmit={addPlan}><div className="section-heading"><div><span className="eyebrow">PLANEJAMENTO</span><h2>Novo plano</h2></div></div><div className="clinical-form-grid"><div className="field full"><label>Nome do plano</label><input name="name" placeholder="Ex.: Reabilitação oral 2026" required/></div><div className="field full"><label>Observações</label><textarea name="notes" rows={3}/></div></div><button className="btn primary full-button" disabled={!canClinicalWrite}><Plus size={15}/> Criar plano</button></form><form className="surface-card clinical-form-card compact-form" onSubmit={addPlanItem}><div className="section-heading"><div><span className="eyebrow">PROCEDIMENTO</span><h2>Adicionar ao plano</h2></div></div><div className="clinical-form-grid"><div className="field full"><label>Plano</label><select name="plan_id" required defaultValue=""><option value="" disabled>Selecione</option>{plans.map((plan)=><option key={plan.id} value={plan.id}>{plan.name}</option>)}</select></div><div className="field"><label>Dente</label><input name="tooth_number" type="number"/></div><div className="field"><label>Valor</label><input name="unit_price" type="number" min="0" step="0.01"/></div><div className="field full"><label>Procedimento</label><input name="procedure_name" required/></div><div className="field full"><label>Observações</label><textarea name="notes" rows={2}/></div></div><button className="btn primary full-button" disabled={!canClinicalWrite}>Adicionar procedimento</button></form></div>
        <div className="plan-list">{plans.map((plan)=>{const total=plan.treatment_plan_items.reduce((sum,item)=>sum+Number(item.quantity)*Number(item.unit_price),0);return <article className="surface-card plan-card" key={plan.id}><div className="plan-card-head"><div><span className="badge blue">{plan.status}</span><h3>{plan.name}</h3><small>{dateTime(plan.created_at)}</small></div><div><strong>{money(total)}</strong><button className="btn ghost" disabled={!canBudgetWrite} onClick={()=>void createBudgetFromPlan(plan)}>Gerar orçamento</button></div></div><div className="plan-items">{plan.treatment_plan_items.map((item)=><div key={item.id}><span>{item.tooth_number?`Dente ${item.tooth_number} · `:""}{item.procedure_name}</span><strong>{money(Number(item.quantity)*Number(item.unit_price))}</strong></div>)}{plan.treatment_plan_items.length===0&&<div className="modern-empty compact-empty"><Plus size={22}/><h3>Plano vazio</h3><p>Adicione o primeiro procedimento.</p></div>}</div></article>})}{plans.length===0&&<div className="surface-card modern-empty"><Plus size={24}/><h3>Nenhum plano criado</h3><p>Crie um plano e adicione os procedimentos previstos.</p></div>}</div>
      </section>}

      {tab === "orcamentos" && <section className="patient-tab-panel budget-grid">{budgets.map((budget)=><article className="surface-card budget-card" key={budget.id}><div className="budget-head"><div><span className="eyebrow">ORÇAMENTO #{budget.number}</span><h2>{money(budget.total)}</h2><p>{dateTime(budget.created_at)}</p></div><span className="badge blue">{budget.status}</span></div><div className="budget-items">{budget.budget_items.map((item)=><div key={item.id}><span>{item.description}</span><strong>{money(item.total)}</strong></div>)}</div></article>)}{budgets.length===0&&<div className="surface-card modern-empty full-span"><CreditCard size={26}/><h3>Nenhum orçamento emitido</h3><p>Gere um orçamento diretamente a partir de um plano de tratamento.</p><button className="btn primary" onClick={()=>setTab("tratamento")}>Ir para tratamentos</button></div>}</section>}

      {tab === "financeiro" && <section className="patient-tab-panel"><div className="surface-card patient-finance-card"><div className="section-heading"><div><span className="eyebrow">FINANCEIRO DO PACIENTE</span><h2>Contas vinculadas</h2><p>Visão rápida das cobranças associadas a esta ficha.</p></div><strong className="finance-total">{money(receivableTotal)}</strong></div><div className="modern-list">{receivables.map((item)=><div className="ledger-row" key={item.id}><div className="ledger-leading income"><CircleDollarSign size={17}/></div><div className="ledger-main"><strong>{item.description}</strong><span>{dateTime(item.created_at)}</span></div><span className={item.status==="pago"?"badge green":item.status==="vencido"?"badge red":"badge blue"}>{item.status}</span><strong className="ledger-value">{money(item.total)}</strong></div>)}{receivables.length===0&&<div className="modern-empty"><WalletCards size={24}/><h3>Nenhuma conta vinculada</h3><p>As cobranças do paciente aparecerão nesta área.</p></div>}</div></div></section>}
    </>}
  </div>;
}
