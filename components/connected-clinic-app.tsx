"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import {
  Bell, CalendarDays, ChevronRight, CircleDollarSign, ClipboardList,
  LayoutDashboard, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Plus, Search,
  Settings, ShieldCheck, Users, WalletCards
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import ConnectedPatientDetail from "@/components/connected-patient-detail";
import ConnectedFinanceModule from "@/components/connected-finance-module";
import ConnectedCashModule from "@/components/connected-cash-module";
import ConnectedAgendaModule, { AgendaAppointment } from "@/components/connected-agenda-module";

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

type Props = {
  clinicId: string;
  clinicName: string;
  role: string;
  userName: string;
  initialPatients: Patient[];
  initialAppointments: AgendaAppointment[];
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
function appointmentPatientName(value: AgendaAppointment["patients"]) {
  if (Array.isArray(value)) return value[0]?.full_name || "Paciente";
  return value?.full_name || "Paciente";
}
function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0,2).map((part)=>part[0]?.toUpperCase()).join("") || "P";
}
function age(birthDate: string | null) {
  if (!birthDate) return null;
  const d = new Date(`${birthDate}T00:00:00`);
  const now = new Date();
  let years = now.getFullYear() - d.getFullYear();
  const month = now.getMonth() - d.getMonth();
  if (month < 0 || (month === 0 && now.getDate() < d.getDate())) years--;
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
    const query = patientSearch.toLowerCase().trim();
    if (!query) return patients;
    return patients.filter((patient) => `${patient.full_name} ${patient.cpf || ""} ${patient.phone || ""} ${patient.email || ""}`.toLowerCase().includes(query));
  }, [patients, patientSearch]);

  const globalMatches = useMemo(() => {
    const query = globalSearch.toLowerCase().trim();
    if (query.length < 2) return [];
    return patients.filter((patient) => `${patient.full_name} ${patient.cpf || ""} ${patient.phone || ""}`.toLowerCase().includes(query)).slice(0,8);
  }, [globalSearch, patients]);

  const upcoming = useMemo(() => appointments.filter((appointment) => new Date(appointment.starts_at).getTime() >= Date.now()).slice(0,8), [appointments]);

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

  function openPatientById(patientId: string) {
    const patient = patients.find((item) => item.id === patientId);
    if (patient) openPatient(patient);
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
    if (!full_name) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase.from("patients").insert({
      clinic_id: clinicId,
      full_name,
      cpf: String(form.get("cpf") || "").trim() || null,
      phone: String(form.get("phone") || "").trim() || null,
      whatsapp: String(form.get("whatsapp") || "").trim() || null,
      email: String(form.get("email") || "").trim() || null,
      birth_date: String(form.get("birth_date") || "").trim() || null,
      created_by: user?.id,
    }).select("id,full_name,cpf,phone,whatsapp,email,birth_date,active,created_at").single();
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
    const { data, error } = await supabase.from("appointments").insert({ clinic_id: clinicId, patient_id, starts_at, ends_at, procedure_name, created_by: user?.id }).select("id,starts_at,ends_at,procedure_name,status,patient_id,patients(full_name)").single();
    if (error) return setMessage(`Não foi possível agendar: ${error.message}`);
    setAppointments((current) => [...current, data as AgendaAppointment].sort((a,b)=>a.starts_at.localeCompare(b.starts_at)));
    setShowAppointment(false);
    setAgendaDate(new Date(starts_at));
  }

  const todayLabel = new Intl.DateTimeFormat("pt-BR", { weekday:"long", day:"2-digit", month:"long" }).format(new Date());

  return <div className={`modern-shell ${compact ? "compact" : ""}`}>
    <aside className={`modern-sidebar ${mobileOpen ? "mobile-open" : ""}`}>
      <div className="modern-brand"><div className="brand-mark">CE</div><div className="modern-brand-copy"><strong>{clinicName}</strong><small>Gestão odontológica</small></div><button className="sidebar-collapse" onClick={()=>setCompact((value)=>!value)} title="Recolher menu">{compact ? <PanelLeftOpen size={17}/> : <PanelLeftClose size={17}/>}</button></div>
      <button className="sidebar-search" onClick={()=>globalInput.current?.focus()}><Search size={16}/><span className="nav-label">Busca rápida</span><kbd className="nav-label">⌘K</kbd></button>
      <div className="sidebar-section-title nav-label">Gestão</div>
      <nav className="modern-nav">{navItems.map((item)=><button key={item.key} className={module===item.key?"active":""} onClick={()=>navigate(item.key)}>{item.icon}<span className="nav-label">{item.label}</span></button>)}</nav>
      <div className="modern-sidebar-footer"><div className="sidebar-avatar">{userName.slice(0,1).toUpperCase()}</div><div className="sidebar-profile-copy"><strong>{userName}</strong><small>{role}</small></div></div>
    </aside>

    {mobileOpen && <button className="mobile-scrim" aria-label="Fechar menu" onClick={()=>setMobileOpen(false)}/>} 

    <main className="modern-main">
      <header className="modern-topbar">
        <button className="topbar-action mobile-menu" onClick={()=>setMobileOpen(true)}><Menu size={18}/></button>
        <div className="global-search"><Search size={17}/><input ref={globalInput} value={globalSearch} onChange={(event)=>setGlobalSearch(event.target.value)} placeholder="Buscar paciente por nome, CPF ou telefone..."/><span className="search-kbd">Ctrl K</span>{globalMatches.length>0&&<div className="search-popover">{globalMatches.map((patient)=><button className="search-result" key={patient.id} onClick={()=>openPatient(patient)}><span><strong>{patient.full_name}</strong><small>{patient.cpf || patient.phone || "Paciente"}</small></span><span className={patient.active?"badge green":"badge red"}>{patient.active?"Ativo":"Inativo"}</span></button>)}</div>}</div>
        <div className="topbar-spacer"/><button className="topbar-action" title="Notificações"><Bell size={17}/></button><div className="user-pill"><div className="avatar">{userName.slice(0,1).toUpperCase()}</div><span>{userName}</span></div><button className="topbar-action" onClick={signOut} title="Sair"><LogOut size={17}/></button>
      </header>

      <section className="modern-content" key={module}>
        {message && <div className="notice">{message}</div>}

        {module === "inicio" && <div className="page-enter">
          <div className="page-title-row"><div><span className="eyebrow">PAINEL DA CLÍNICA</span><h1>Bom dia 👋</h1><p>{todayLabel}. O essencial da operação em um só lugar.</p></div><div className="quick-actions"><button className="btn" onClick={()=>navigate("pacientes")}><Users size={16}/> Pacientes</button><button className="btn primary elevated" onClick={()=>setShowAppointment(true)}><Plus size={16}/> Novo agendamento</button></div></div>
          <div className="insight-grid dashboard-insights">
            <div className="insight-card tone-blue"><div className="insight-icon"><Users size={19}/></div><div><span>Pacientes ativos</span><strong>{patients.filter((patient)=>patient.active).length}</strong><small>Base atual da clínica</small></div></div>
            <div className="insight-card tone-sky"><div className="insight-icon"><CalendarDays size={19}/></div><div><span>Agenda de hoje</span><strong>{appointments.filter((appointment)=>sameDay(new Date(appointment.starts_at),new Date())).length}</strong><small>Atendimentos previstos</small></div></div>
            <div className="insight-card tone-violet"><div className="insight-icon"><ShieldCheck size={19}/></div><div><span>Seu perfil</span><strong className="text-metric">{role}</strong><small>Permissões aplicadas</small></div></div>
            <div className="insight-card tone-slate"><div className="insight-icon"><Settings size={19}/></div><div><span>Ambiente</span><strong className="text-metric">Online</strong><small>Vercel + Supabase</small></div></div>
          </div>
          <div className="dashboard-columns">
            <div className="surface-card premium-card"><div className="card-head modern-card-head"><div><span className="eyebrow">PRÓXIMOS</span><h3>Atendimentos</h3></div><button className="btn ghost" onClick={()=>navigate("agenda")}>Ver agenda</button></div><div className="modern-list">{upcoming.map((appointment)=><button className="appointment-list-row" key={appointment.id} onClick={()=>openPatientById(appointment.patient_id)}><div className="time-bubble">{fmtTime(appointment.starts_at)}</div><div><strong>{appointmentPatientName(appointment.patients)}</strong><span>{appointment.procedure_name || "Atendimento"}</span></div><span className="badge blue">{appointment.status.replaceAll("_"," ")}</span></button>)}{upcoming.length===0&&<div className="modern-empty"><div className="empty-orb"><CalendarDays size={24}/></div><h3>Agenda tranquila</h3><p>Nenhum atendimento futuro cadastrado.</p></div>}</div></div>
            <div className="surface-card shortcut-card"><span className="eyebrow">ATALHOS</span><h3>Comece por aqui</h3><div className="shortcut-grid"><button onClick={()=>setShowPatient(true)}><span><Users size={18}/></span><strong>Novo paciente</strong><small>Cadastro rápido</small></button><button onClick={()=>setShowAppointment(true)}><span><CalendarDays size={18}/></span><strong>Agendar</strong><small>Novo horário</small></button><button onClick={()=>navigate("financeiro")}><span><CircleDollarSign size={18}/></span><strong>Financeiro</strong><small>Receber e pagar</small></button><button onClick={()=>navigate("caixa")}><span><WalletCards size={18}/></span><strong>Caixa</strong><small>Movimento do dia</small></button></div></div>
          </div>
        </div>}

        {module === "pacientes" && selectedPatient && <ConnectedPatientDetail clinicId={clinicId} role={role} patient={selectedPatient} onBack={()=>setSelectedPatient(null)}/>} 
        {module === "pacientes" && !selectedPatient && <div className="page-enter"><div className="page-title-row"><div><span className="eyebrow">BASE DE RELACIONAMENTO</span><h1>Pacientes</h1><p>Busca rápida e acesso à ficha clínica sem navegar por várias telas.</p></div><button className="btn primary elevated" onClick={()=>setShowPatient(true)}><Plus size={16}/> Novo paciente</button></div><div className="surface-card list-toolbar"><div className="soft-search wide"><Search size={17}/><input value={patientSearch} onChange={(event)=>setPatientSearch(event.target.value)} placeholder="Buscar por nome, CPF, telefone ou e-mail"/></div><div className="count-chip">{filteredPatients.length}<span>pacientes</span></div></div><div className="surface-card modern-table-wrap"><table className="modern-table"><thead><tr><th>Paciente</th><th>Nascimento</th><th>Contato</th><th>E-mail</th><th>Situação</th><th></th></tr></thead><tbody>{filteredPatients.map((patient)=><tr key={patient.id}><td><div className="patient-name-cell"><div className="patient-initials">{initials(patient.full_name)}</div><div><strong>{patient.full_name}</strong><span className="muted-line">{patient.cpf || "CPF não informado"}</span></div></div></td><td>{fmtDate(patient.birth_date)}{age(patient.birth_date)!==null&&<span className="muted-line">{age(patient.birth_date)} anos</span>}</td><td>{patient.phone || patient.whatsapp || "—"}</td><td>{patient.email || "—"}</td><td><span className={patient.active?"badge green":"badge red"}>{patient.active?"Ativo":"Inativo"}</span></td><td><button className="row-action" onClick={()=>openPatient(patient)}>Abrir ficha <ChevronRight size={15}/></button></td></tr>)}</tbody></table>{filteredPatients.length===0&&<div className="modern-empty"><div className="empty-orb"><Search size={24}/></div><h3>Nenhum paciente encontrado</h3><p>Tente outro termo ou cadastre um novo paciente.</p></div>}</div></div>}

        {module === "agenda" && <ConnectedAgendaModule appointments={appointments} selectedDate={agendaDate} view={agendaView} onViewChange={setAgendaView} onDateChange={setAgendaDate} onNewAppointment={()=>setShowAppointment(true)} onOpenPatient={openPatientById}/>} 
        {module === "financeiro" && <ConnectedFinanceModule clinicId={clinicId} role={role} patients={patients.map(({id,full_name})=>({id,full_name}))}/>} 
        {module === "caixa" && <ConnectedCashModule clinicId={clinicId} role={role}/>} 

        {module === "relatorios" && <div className="page-enter"><div className="page-title-row"><div><span className="eyebrow">INTELIGÊNCIA DA CLÍNICA</span><h1>Relatórios</h1><p>Indicadores curtos, claros e úteis para decisão.</p></div></div><div className="insight-grid"><div className="insight-card tone-blue"><div className="insight-icon"><CalendarDays size={19}/></div><div><span>Agendamentos</span><strong>{appointments.length}</strong><small>Período carregado</small></div></div><div className="insight-card tone-sky"><div className="insight-icon"><Users size={19}/></div><div><span>Pacientes ativos</span><strong>{patients.filter((patient)=>patient.active).length}</strong><small>Base cadastrada</small></div></div></div><div className="hero-empty surface-card" style={{marginTop:18}}><div className="hero-empty-orb"><ClipboardList size={30}/></div><h2>Relatórios objetivos</h2><p>A próxima etapa adicionará produção, conversão de orçamento, recebimentos, inadimplência e ocupação da agenda.</p></div></div>}

        {module === "configuracoes" && <div className="page-enter"><div className="page-title-row"><div><span className="eyebrow">PERSONALIZAÇÃO E CONTROLE</span><h1>Configurações</h1><p>Ajustes agrupados por contexto, sem labirinto de submenus.</p></div></div><div className="settings-grid">{[{t:"Clínica",d:"Dados da empresa, endereço e contatos.",i:"CE"},{t:"Usuários e profissionais",d:"Equipe, dentistas e perfis de acesso.",i:"UP"},{t:"Permissões",d:"Quem pode visualizar e alterar cada módulo.",i:"PE"},{t:"Agenda",d:"Horários, duração e disponibilidade.",i:"AG"},{t:"Pacientes",d:"Campos, documentos e preferências.",i:"PA"},{t:"Atendimento",d:"Prontuário, anamnese e odontograma.",i:"AT"},{t:"Financeiro",d:"Categorias e formas de pagamento.",i:"FI"},{t:"Segurança",d:"Sessões, auditoria e backups.",i:"SE"}].map((item)=><button className="settings-card" key={item.t}><div className="settings-card-icon">{item.i}</div><div><h3>{item.t}</h3><p>{item.d}</p></div><ChevronRight size={17}/></button>)}</div></div>}
      </section>
    </main>

    {showPatient&&<div className="drawer-backdrop" onMouseDown={()=>setShowPatient(false)}><form className="side-drawer" onSubmit={addPatient} onMouseDown={(event)=>event.stopPropagation()}><div className="drawer-head"><div><span className="eyebrow">NOVO CADASTRO</span><h2>Novo paciente</h2></div><button type="button" className="icon-btn" onClick={()=>setShowPatient(false)}>×</button></div><div className="drawer-body form-grid"><div className="field full"><label>Nome completo</label><input name="full_name" required autoFocus/></div><div className="field"><label>CPF</label><input name="cpf"/></div><div className="field"><label>Nascimento</label><input name="birth_date" type="date"/></div><div className="field"><label>Telefone</label><input name="phone"/></div><div className="field"><label>WhatsApp</label><input name="whatsapp"/></div><div className="field full"><label>E-mail</label><input name="email" type="email"/></div></div><div className="drawer-foot"><button type="button" className="btn" onClick={()=>setShowPatient(false)}>Cancelar</button><button className="btn primary">Salvar paciente</button></div></form></div>}

    {showAppointment&&<div className="drawer-backdrop" onMouseDown={()=>setShowAppointment(false)}><form className="side-drawer" onSubmit={addAppointment} onMouseDown={(event)=>event.stopPropagation()}><div className="drawer-head"><div><span className="eyebrow">AGENDA</span><h2>Novo agendamento</h2></div><button type="button" className="icon-btn" onClick={()=>setShowAppointment(false)}>×</button></div><div className="drawer-body form-grid"><div className="field full"><label>Paciente</label><select name="patient_id" required defaultValue=""><option value="" disabled>Selecione o paciente</option>{patients.map((patient)=><option key={patient.id} value={patient.id}>{patient.full_name}</option>)}</select></div><div className="field"><label>Data</label><input name="date" type="date" required defaultValue={agendaDate.toISOString().slice(0,10)}/></div><div className="field"><label>Hora</label><input name="time" type="time" required/></div><div className="field full"><label>Procedimento</label><input name="procedure_name" defaultValue="Avaliação odontológica"/></div></div><div className="drawer-foot"><button type="button" className="btn" onClick={()=>setShowAppointment(false)}>Cancelar</button><button className="btn primary">Salvar agendamento</button></div></form></div>}
  </div>;
}
