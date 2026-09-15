"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import {
  Bell, CalendarDays, ChevronLeft, ChevronRight, CircleDollarSign, ClipboardList,
  LayoutDashboard, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Plus, Search,
  Settings, ShieldCheck, Users, WalletCards
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import ConnectedPatientDetail from "@/components/connected-patient-detail";

type Patient = {
  id: string;
  full_name: string;
  cpf: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  birth_date: string | null;
  active: boolean;
  created_at: string;
};

type AppointmentPatient = { full_name: string };
type Appointment = {
  id: string;
  starts_at: string;
  ends_at: string | null;
  procedure_name: string | null;
  status: string;
  patient_id: string;
  patients: AppointmentPatient | AppointmentPatient[] | null;
};

type Props = {
  clinicId: string;
  clinicName: string;
  role: string;
  userName: string;
  initialPatients: Patient[];
  initialAppointments: Appointment[];
};

type Module = "inicio" | "agenda" | "pacientes" | "financeiro" | "caixa" | "relatorios" | "configuracoes";
type AgendaView = "dia" | "semana" | "mes";

function fmtDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}
function fmtTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}
function appointmentPatientName(value: Appointment["patients"]) {
  if (Array.isArray(value)) return value[0]?.full_name || "Paciente";
  return value?.full_name || "Paciente";
}
function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0,2).map((p)=>p[0]?.toUpperCase()).join("") || "P";
}
function age(birthDate: string | null) {
  if (!birthDate) return null;
  const d = new Date(`${birthDate}T00:00:00`);
  const now = new Date();
  let years = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) years--;
  return years;
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function ConnectedClinicApp({ clinicId, clinicName, role, userName, initialPatients, initialAppointments }: Props) {
  const [module, setModule] = useState<Module>("inicio");
  const [patients, setPatients] = useState(initialPatients);
  const [appointments, setAppointments] = useState(initialAppointments);
  const [patientSearch, setPatientSearch] = useState("");
  const [globalSearch, setGlobalSearch] = useState("");
  const [showPatient, setShowPatient] = useState(false);
  const [showAppointment, setShowAppointment] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [message, setMessage] = useState("");
  const [compact, setCompact] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [agendaDate, setAgendaDate] = useState(new Date());
  const [agendaView, setAgendaView] = useState<AgendaView>("dia");
  const globalInput = useRef<HTMLInputElement>(null);

  const filteredPatients = useMemo(() => {
    const q = patientSearch.toLowerCase().trim();
    if (!q) return patients;
    return patients.filter((p) => `${p.full_name} ${p.cpf || ""} ${p.phone || ""} ${p.email || ""}`.toLowerCase().includes(q));
  }, [patients, patientSearch]);

  const globalMatches = useMemo(() => {
    const q = globalSearch.toLowerCase().trim();
    if (q.length < 2) return [];
    return patients.filter((p) => `${p.full_name} ${p.cpf || ""} ${p.phone || ""}`.toLowerCase().includes(q)).slice(0,8);
  }, [globalSearch, patients]);

  const dayAppointments = useMemo(() => appointments.filter((a) => sameDay(new Date(a.starts_at), agendaDate)), [appointments, agendaDate]);
  const upcoming = useMemo(() => appointments.filter((a) => new Date(a.starts_at).getTime() >= Date.now()).slice(0,8), [appointments]);

  const navItems: { key: Module; label: string; icon: React.ReactNode }[] = [
    { key: "inicio", label: "Início", icon: <LayoutDashboard size={18}/> },
    { key: "agenda", label: "Agenda", icon: <CalendarDays size={18}/> },
    { key: "pacientes", label: "Pacientes", icon: <Users size={18}/> },
    { key: "financeiro", label: "Financeiro", icon: <CircleDollarSign size={18}/> },
    { key: "caixa", label: "Caixa", icon: <WalletCards size={18}/> },
    { key: "relatorios", label: "Relatórios", icon: <ClipboardList size={18}/> },
    { key: "configuracoes", label: "Configurações", icon: <Settings size={18}/> },
  ];

  function navigate(next: Module) {
    setModule(next);
    setMobileOpen(false);
    if (next !== "pacientes") setSelectedPatient(null);
  }

  function openPatient(patient: Patient) {
    setSelectedPatient(patient);
    setModule("pacientes");
    setGlobalSearch("");
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  async function addPatient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const form = new FormData(event.currentTarget);
    const full_name = String(form.get("full_name") || "").trim();
    const cpf = String(form.get("cpf") || "").trim() || null;
    const phone = String(form.get("phone") || "").trim() || null;
    const whatsapp = String(form.get("whatsapp") || "").trim() || null;
    const email = String(form.get("email") || "").trim() || null;
    const birth_date = String(form.get("birth_date") || "").trim() || null;
    if (!full_name) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase.from("patients")
      .insert({ clinic_id: clinicId, full_name, cpf, phone, whatsapp, email, birth_date, created_by: user?.id })
      .select("id,full_name,cpf,phone,whatsapp,email,birth_date,active,created_at").single();
    if (error) return setMessage(`Não foi possível cadastrar: ${error.message}`);
    setPatients((current) => [data as Patient, ...current]);
    setShowPatient(false);
    setSelectedPatient(data as Patient);
    setModule("pacientes");
  }

  async function addAppointment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const form = new FormData(event.currentTarget);
    const patient_id = String(form.get("patient_id") || "");
    const date = String(form.get("date") || "");
    const time = String(form.get("time") || "");
    const procedure_name = String(form.get("procedure_name") || "").trim() || "Avaliação";
    if (!patient_id || !date || !time) return;
    const starts_at = new Date(`${date}T${time}:00`).toISOString();
    const ends_at = new Date(new Date(starts_at).getTime() + 30 * 60 * 1000).toISOString();
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase.from("appointments")
      .insert({ clinic_id: clinicId, patient_id, starts_at, ends_at, procedure_name, created_by: user?.id })
      .select("id,starts_at,ends_at,procedure_name,status,patient_id,patients(full_name)").single();
    if (error) return setMessage(`Não foi possível agendar: ${error.message}`);
    setAppointments((current) => [...current, data as Appointment].sort((a,b)=>a.starts_at.localeCompare(b.starts_at)));
    setShowAppointment(false);
    setAgendaDate(new Date(starts_at));
  }

  function moveDay(delta: number) {
    setAgendaDate((current) => { const next = new Date(current); next.setDate(next.getDate() + delta); return next; });
  }

  const todayLabel = new Intl.DateTimeFormat("pt-BR", { weekday:"long", day:"2-digit", month:"long" }).format(new Date());
  const selectedDateLabel = new Intl.DateTimeFormat("pt-BR", { weekday:"long", day:"2-digit", month:"long", year:"numeric" }).format(agendaDate);
  const hours = Array.from({length: 22}, (_,i)=>7 + i * .5);

  return (
    <div className={`modern-shell ${compact ? "compact" : ""}`}>
      <aside className={`modern-sidebar ${mobileOpen ? "mobile-open" : ""}`}>
        <div className="modern-brand">
          <div className="brand-mark">CE</div>
          <div className="modern-brand-copy"><strong>{clinicName}</strong><small>Gestão odontológica</small></div>
          <button className="sidebar-collapse" onClick={()=>setCompact(v=>!v)} title="Recolher menu">{compact ? <PanelLeftOpen size={17}/> : <PanelLeftClose size={17}/>}</button>
        </div>
        <div className="sidebar-search"><Search size={16}/><input placeholder="Buscar módulo..." onFocus={()=>globalInput.current?.focus()}/></div>
        <div className="sidebar-section-title">Gestão</div>
        <nav className="modern-nav">{navItems.map((item)=><button key={item.key} className={module===item.key?"active":""} onClick={()=>navigate(item.key)}>{item.icon}<span className="nav-label">{item.label}</span></button>)}</nav>
        <div className="modern-sidebar-footer"><div className="sidebar-avatar">{userName.slice(0,1).toUpperCase()}</div><div className="sidebar-profile-copy"><strong>{userName}</strong><small>{role}</small></div></div>
      </aside>

      <main className="modern-main">
        <header className="modern-topbar">
          <button className="topbar-action mobile-menu" onClick={()=>setMobileOpen(true)}><Menu size={18}/></button>
          <div className="global-search"><Search size={17}/><input ref={globalInput} value={globalSearch} onChange={(e)=>setGlobalSearch(e.target.value)} placeholder="Buscar paciente por nome, CPF ou telefone..."/><span className="search-kbd">Ctrl K</span>{globalMatches.length>0&&<div className="search-popover">{globalMatches.map((p)=><button className="search-result" key={p.id} onClick={()=>openPatient(p)}><span><strong>{p.full_name}</strong><small>{p.cpf || p.phone || "Paciente"}</small></span><span className={p.active?"badge green":"badge red"}>{p.active?"Ativo":"Inativo"}</span></button>)}</div>}</div>
          <div className="topbar-spacer"/>
          <button className="topbar-action" title="Notificações"><Bell size={17}/></button>
          <div className="user-pill"><div className="avatar">{userName.slice(0,1).toUpperCase()}</div><span>{userName}</span></div>
          <button className="topbar-action" onClick={signOut} title="Sair"><LogOut size={17}/></button>
        </header>

        <section className="modern-content fade-switch">
          {message && <div className="notice">{message}</div>}

          {module === "inicio" && <>
            <div className="page-title-row"><div><h1>Bom dia 👋</h1><p>{todayLabel}. Aqui está o resumo da clínica.</p></div><div className="quick-actions"><button className="btn" onClick={()=>navigate("pacientes")}><Users size={16}/> Pacientes</button><button className="btn primary" onClick={()=>setShowAppointment(true)}><Plus size={16}/> Novo agendamento</button></div></div>
            <div className="dashboard-grid">
              <div className="surface-card modern-metric"><div className="metric-top"><span>Pacientes ativos</span><span className="metric-icon"><Users size={17}/></span></div><div className="metric-number">{patients.filter(p=>p.active).length}</div><div className="metric-foot">Base atual da clínica</div></div>
              <div className="surface-card modern-metric"><div className="metric-top"><span>Agenda de hoje</span><span className="metric-icon"><CalendarDays size={17}/></span></div><div className="metric-number">{appointments.filter(a=>sameDay(new Date(a.starts_at),new Date())).length}</div><div className="metric-foot">Atendimentos previstos</div></div>
              <div className="surface-card modern-metric"><div className="metric-top"><span>Perfil atual</span><span className="metric-icon"><ShieldCheck size={17}/></span></div><div className="metric-number" style={{fontSize:21}}>{role}</div><div className="metric-foot">Permissões ativas</div></div>
              <div className="surface-card modern-metric"><div className="metric-top"><span>Infraestrutura</span><span className="metric-icon"><Settings size={17}/></span></div><div className="metric-number" style={{fontSize:21}}>Online</div><div className="metric-foot">Vercel + Supabase</div></div>
            </div>
            <div className="surface-card" style={{marginTop:16}}><div className="card-head"><h3>Próximos atendimentos</h3><button className="btn" onClick={()=>navigate("agenda")}>Abrir agenda</button></div><div className="timeline">{upcoming.map(a=><div className="timeline-item" key={a.id}><div className="timeline-time">{fmtTime(a.starts_at)}</div><div><div className="timeline-title">{appointmentPatientName(a.patients)}</div><div className="timeline-meta">{a.procedure_name || "Atendimento"} · {a.status.replaceAll("_"," ")}</div></div></div>)}{upcoming.length===0&&<div className="empty">Nenhum atendimento futuro cadastrado.</div>}</div></div>
          </>}

          {module === "pacientes" && selectedPatient && <ConnectedPatientDetail clinicId={clinicId} role={role} patient={selectedPatient} onBack={()=>setSelectedPatient(null)}/>} 

          {module === "pacientes" && !selectedPatient && <>
            <div className="page-title-row"><div><h1>Pacientes</h1><p>Cadastro, busca rápida e acesso à ficha clínica.</p></div><button className="btn primary" onClick={()=>setShowPatient(true)}><Plus size={16}/> Novo paciente</button></div>
            <div className="toolbar"><div className="search"><Search size={17}/><input value={patientSearch} onChange={(e)=>setPatientSearch(e.target.value)} placeholder="Nome, CPF, telefone ou e-mail"/></div><span className="badge">{filteredPatients.length} paciente(s)</span></div>
            <div className="surface-card modern-table-wrap"><table className="modern-table"><thead><tr><th>Paciente</th><th>Nascimento</th><th>Contato</th><th>E-mail</th><th>Situação</th><th></th></tr></thead><tbody>{filteredPatients.map((p)=><tr key={p.id}><td><div className="patient-name-cell"><div className="patient-initials">{initials(p.full_name)}</div><div><strong>{p.full_name}</strong><span className="muted-line">{p.cpf || "CPF não informado"}</span></div></div></td><td>{fmtDate(p.birth_date)}{age(p.birth_date)!==null&&<span className="muted-line">{age(p.birth_date)} anos</span>}</td><td>{p.phone || p.whatsapp || "—"}</td><td>{p.email || "—"}</td><td><span className={p.active?"badge green":"badge red"}>{p.active?"Ativo":"Inativo"}</span></td><td><button className="btn" onClick={()=>openPatient(p)}>Abrir ficha</button></td></tr>)}</tbody></table>{filteredPatients.length===0&&<div className="empty">Nenhum paciente encontrado.</div>}</div>
          </>}

          {module === "agenda" && <>
            <div className="page-title-row"><div><h1>Agenda</h1><p>Uma visão simples e visual dos atendimentos.</p></div><button className="btn primary" onClick={()=>setShowAppointment(true)}><Plus size={16}/> Novo agendamento</button></div>
            <div className="agenda-toolbar"><div className="date-nav"><button onClick={()=>moveDay(-1)}><ChevronLeft size={17}/></button><button className="btn" style={{width:"auto"}} onClick={()=>setAgendaDate(new Date())}>Hoje</button><button onClick={()=>moveDay(1)}><ChevronRight size={17}/></button><strong style={{textTransform:"capitalize",marginLeft:8}}>{selectedDateLabel}</strong></div><div className="segmented"><button className={agendaView==="mes"?"active":""} onClick={()=>setAgendaView("mes")}>Mês</button><button className={agendaView==="semana"?"active":""} onClick={()=>setAgendaView("semana")}>Semana</button><button className={agendaView==="dia"?"active":""} onClick={()=>setAgendaView("dia")}>Dia</button></div></div>
            {agendaView==="dia"?<div className="surface-card agenda-day">{hours.map((hour)=>{const h=Math.floor(hour);const min=hour%1===0?0:30;const slot=dayAppointments.filter(a=>{const d=new Date(a.starts_at);return d.getHours()===h&&d.getMinutes()===min;});return <div key={hour} style={{display:"contents"}}><div className="agenda-hour">{String(h).padStart(2,"0")}:{String(min).padStart(2,"0")}</div><div className="agenda-slot">{slot.map(a=><button key={a.id} className={`appointment-pill ${a.status}`} onClick={()=>{const p=patients.find(p=>p.id===a.patient_id);if(p)openPatient(p)}}><strong>{appointmentPatientName(a.patients)}</strong><small>{a.procedure_name || "Atendimento"} · {a.status.replaceAll("_"," ")}</small></button>)}</div></div>})}</div>:<div className="surface-card module-placeholder"><CalendarDays size={34}/><h2>{agendaView==="semana"?"Visão semanal":"Visão mensal"}</h2><p>Esta visualização será adicionada na próxima etapa. A visão diária já está operacional com os dados reais.</p></div>}
          </>}

          {module === "financeiro" && <div className="surface-card module-placeholder"><CircleDollarSign size={38}/><h2>Financeiro</h2><p>Contas a receber, contas a pagar, parcelamentos e conciliação serão organizados aqui, separados do caixa.</p></div>}
          {module === "caixa" && <div className="surface-card module-placeholder"><WalletCards size={38}/><h2>Caixa</h2><p>Abertura, recebimentos do dia, sangrias, suprimentos e fechamento de caixa.</p></div>}
          {module === "relatorios" && <div className="surface-card module-placeholder"><ClipboardList size={38}/><h2>Relatórios</h2><p>Indicadores objetivos de agenda, produção, recebimentos e inadimplência.</p></div>}
          {module === "configuracoes" && <>
            <div className="page-title-row"><div><h1>Configurações</h1><p>Organizadas por assunto, sem uma árvore infinita de menus.</p></div></div>
            <div className="settings-grid">
              {[{t:"Clínica",d:"Dados da empresa, endereço, contatos e identidade."},{t:"Usuários e profissionais",d:"Equipe, dentistas, recepção, financeiro e gestores."},{t:"Permissões",d:"O que cada perfil pode visualizar e alterar."},{t:"Agenda",d:"Horários, duração padrão, disponibilidade e status."},{t:"Pacientes",d:"Campos de cadastro, documentos e preferências."},{t:"Atendimento",d:"Prontuário, anamnese, odontograma e procedimentos."},{t:"Financeiro",d:"Categorias, formas de pagamento e regras financeiras."},{t:"Segurança",d:"Sessões, auditoria, backups e políticas de acesso."}].map(item=><button className="settings-card" key={item.t}><div className="settings-card-icon"><Settings size={18}/></div><h3>{item.t}</h3><p>{item.d}</p></button>)}
            </div>
          </>}
        </section>
      </main>

      {showPatient&&<div className="modal-backdrop"><form className="modal" onSubmit={addPatient}><div className="modal-head"><h2>Novo paciente</h2><button type="button" className="btn" onClick={()=>setShowPatient(false)}>Fechar</button></div><div className="modal-body form-grid"><div className="field full"><label>Nome completo</label><input name="full_name" required/></div><div className="field"><label>CPF</label><input name="cpf"/></div><div className="field"><label>Nascimento</label><input name="birth_date" type="date"/></div><div className="field"><label>Telefone</label><input name="phone"/></div><div className="field"><label>WhatsApp</label><input name="whatsapp"/></div><div className="field full"><label>E-mail</label><input name="email" type="email"/></div></div><div className="modal-foot"><button type="button" className="btn" onClick={()=>setShowPatient(false)}>Cancelar</button><button className="btn primary">Salvar paciente</button></div></form></div>}

      {showAppointment&&<div className="modal-backdrop"><form className="modal" onSubmit={addAppointment}><div className="modal-head"><h2>Novo agendamento</h2><button type="button" className="btn" onClick={()=>setShowAppointment(false)}>Fechar</button></div><div className="modal-body form-grid"><div className="field full"><label>Paciente</label><select name="patient_id" required defaultValue=""><option value="" disabled>Selecione</option>{patients.map(p=><option key={p.id} value={p.id}>{p.full_name}</option>)}</select></div><div className="field"><label>Data</label><input name="date" type="date" required defaultValue={agendaDate.toISOString().slice(0,10)}/></div><div className="field"><label>Hora</label><input name="time" type="time" required/></div><div className="field full"><label>Procedimento</label><input name="procedure_name" defaultValue="Avaliação odontológica"/></div></div><div className="modal-foot"><button type="button" className="btn" onClick={()=>setShowAppointment(false)}>Cancelar</button><button className="btn primary">Salvar agendamento</button></div></form></div>}
    </div>
  );
}
