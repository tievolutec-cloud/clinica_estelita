"use client";

import { FormEvent, useMemo, useState } from "react";
import { CalendarDays, LayoutDashboard, LogOut, Plus, Search, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import ConnectedPatientDetail from "@/components/connected-patient-detail";

type Patient = {
  id: string;
  full_name: string;
  phone: string | null;
  birth_date: string | null;
  active: boolean;
  created_at: string;
};

type AppointmentPatient = { full_name: string };

type Appointment = {
  id: string;
  starts_at: string;
  procedure_name: string | null;
  status: string;
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

type Module = "inicio" | "agenda" | "pacientes";

function fmtDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

function fmtTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function labelStatus(status: string) {
  return status.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase());
}

function appointmentPatientName(value: Appointment["patients"]) {
  if (Array.isArray(value)) return value[0]?.full_name || "Paciente";
  return value?.full_name || "Paciente";
}

export default function ConnectedClinicApp({ clinicId, clinicName, role, userName, initialPatients, initialAppointments }: Props) {
  const [module, setModule] = useState<Module>("inicio");
  const [patients, setPatients] = useState(initialPatients);
  const [appointments, setAppointments] = useState(initialAppointments);
  const [search, setSearch] = useState("");
  const [showPatient, setShowPatient] = useState(false);
  const [showAppointment, setShowAppointment] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [message, setMessage] = useState("");

  const filteredPatients = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return patients;
    return patients.filter((patient) => `${patient.full_name} ${patient.phone || ""}`.toLowerCase().includes(q));
  }, [patients, search]);

  function navigate(next: Module) {
    setModule(next);
    if (next !== "pacientes") setSelectedPatient(null);
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
    const phone = String(form.get("phone") || "").trim() || null;
    const birth_date = String(form.get("birth_date") || "").trim() || null;
    if (!full_name) return;

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("patients")
      .insert({ clinic_id: clinicId, full_name, phone, birth_date, created_by: user?.id })
      .select("id,full_name,phone,birth_date,active,created_at")
      .single();

    if (error) {
      setMessage(`Não foi possível cadastrar: ${error.message}`);
      return;
    }

    setPatients((current) => [data, ...current]);
    setShowPatient(false);
    setSelectedPatient(data as Patient);
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
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("appointments")
      .insert({ clinic_id: clinicId, patient_id, starts_at, procedure_name, created_by: user?.id })
      .select("id,starts_at,procedure_name,status,patients(full_name)")
      .single();

    if (error) {
      setMessage(`Não foi possível agendar: ${error.message}`);
      return;
    }

    setAppointments((current) => [...current, data as Appointment].sort((a, b) => a.starts_at.localeCompare(b.starts_at)));
    setShowAppointment(false);
  }

  const today = new Date();
  const todayLabel = new Intl.DateTimeFormat("pt-BR", { dateStyle: "full" }).format(today);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">CE</div><div><strong>{clinicName}</strong><small>Sistema conectado</small></div></div>
        <nav className="nav">
          <button className={module === "inicio" ? "active" : ""} onClick={() => navigate("inicio")}><LayoutDashboard size={18}/> Início</button>
          <button className={module === "agenda" ? "active" : ""} onClick={() => navigate("agenda")}><CalendarDays size={18}/> Agenda</button>
          <button className={module === "pacientes" ? "active" : ""} onClick={() => navigate("pacientes")}><Users size={18}/> Pacientes</button>
        </nav>
        <div className="sidebar-footer">Perfil: <strong>{role}</strong><br/>Dados protegidos por RLS.</div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="topbar-title"><strong>Clínica Estelita</strong><span>{todayLabel}</span></div>
          <div className="actions"><div className="user-pill"><div className="avatar">{userName.slice(0,1).toUpperCase()}</div><span>{userName}</span></div><button className="btn" onClick={signOut}><LogOut size={16}/> Sair</button></div>
        </header>

        <section className="content">
          {message && <div className="notice" style={{ borderColor: "#e9c7c7", background: "#fff1f1", color: "#8a3d3d" }}>{message}</div>}

          {module === "inicio" && <>
            <div className="page-head"><div><h1>Visão geral</h1><p>Dados reais da clínica conectados ao Supabase.</p></div></div>
            <div className="grid metrics">
              <div className="card metric"><div className="label">Pacientes ativos</div><div className="value">{patients.filter(p => p.active).length}</div><div className="hint">Cadastros disponíveis</div></div>
              <div className="card metric"><div className="label">Agendamentos carregados</div><div className="value">{appointments.length}</div><div className="hint">Próximos registros</div></div>
              <div className="card metric"><div className="label">Perfil atual</div><div className="value" style={{fontSize:20}}>{role}</div><div className="hint">Permissões aplicadas pelo banco</div></div>
              <div className="card metric"><div className="label">Ambiente</div><div className="value" style={{fontSize:20}}>Produção</div><div className="hint">Vercel + Supabase</div></div>
            </div>
            <div className="card" style={{marginTop:16}}><div className="card-head"><h3>Próximos atendimentos</h3></div><div className="timeline">{appointments.slice(0,8).map(a => <div className="timeline-item" key={a.id}><div className="timeline-time">{fmtTime(a.starts_at)}</div><div><div className="timeline-title">{appointmentPatientName(a.patients)}</div><div className="timeline-meta">{a.procedure_name || "Atendimento"} · {labelStatus(a.status)}</div></div></div>)}{appointments.length === 0 && <div className="empty">Nenhum agendamento encontrado.</div>}</div></div>
          </>}

          {module === "pacientes" && selectedPatient && <ConnectedPatientDetail clinicId={clinicId} role={role} patient={selectedPatient} onBack={() => setSelectedPatient(null)} />}

          {module === "pacientes" && !selectedPatient && <>
            <div className="page-head"><div><h1>Pacientes</h1><p>Cadastro persistente no PostgreSQL.</p></div><button className="btn primary" onClick={() => setShowPatient(true)}><Plus size={16}/> Novo paciente</button></div>
            <div className="toolbar"><div className="search"><Search size={17}/><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Buscar nome ou telefone"/></div></div>
            <div className="card table-wrap"><table><thead><tr><th>Paciente</th><th>Telefone</th><th>Nascimento</th><th>Status</th><th></th></tr></thead><tbody>{filteredPatients.map(p => <tr key={p.id}><td><strong>{p.full_name}</strong></td><td>{p.phone || "—"}</td><td>{fmtDate(p.birth_date)}</td><td><span className={p.active ? "badge green" : "badge red"}>{p.active ? "Ativo" : "Inativo"}</span></td><td><button className="btn" onClick={() => setSelectedPatient(p)}>Abrir ficha</button></td></tr>)}</tbody></table>{filteredPatients.length === 0 && <div className="empty">Nenhum paciente encontrado.</div>}</div>
          </>}

          {module === "agenda" && <>
            <div className="page-head"><div><h1>Agenda</h1><p>Agendamentos persistidos no Supabase.</p></div><button className="btn primary" onClick={() => setShowAppointment(true)}><Plus size={16}/> Novo agendamento</button></div>
            <div className="card"><div className="timeline">{appointments.map(a => <div className="timeline-item" key={a.id}><div className="timeline-time">{fmtTime(a.starts_at)}</div><div><div className="timeline-title">{appointmentPatientName(a.patients)}</div><div className="timeline-meta">{a.procedure_name || "Atendimento"} · {labelStatus(a.status)}</div></div></div>)}{appointments.length === 0 && <div className="empty">Nenhum agendamento encontrado.</div>}</div></div>
          </>}
        </section>
      </main>

      {showPatient && <div className="modal-backdrop"><form className="modal" onSubmit={addPatient}><div className="modal-head"><h2>Novo paciente</h2><button type="button" className="btn" onClick={()=>setShowPatient(false)}>Fechar</button></div><div className="modal-body form-grid"><div className="field full"><label>Nome completo</label><input name="full_name" required/></div><div className="field"><label>Telefone</label><input name="phone"/></div><div className="field"><label>Nascimento</label><input name="birth_date" type="date"/></div></div><div className="modal-foot"><button type="button" className="btn" onClick={()=>setShowPatient(false)}>Cancelar</button><button className="btn primary" type="submit">Salvar paciente</button></div></form></div>}

      {showAppointment && <div className="modal-backdrop"><form className="modal" onSubmit={addAppointment}><div className="modal-head"><h2>Novo agendamento</h2><button type="button" className="btn" onClick={()=>setShowAppointment(false)}>Fechar</button></div><div className="modal-body form-grid"><div className="field full"><label>Paciente</label><select name="patient_id" required defaultValue=""><option value="" disabled>Selecione</option>{patients.map(p=><option key={p.id} value={p.id}>{p.full_name}</option>)}</select></div><div className="field"><label>Data</label><input name="date" type="date" required/></div><div className="field"><label>Hora</label><input name="time" type="time" required/></div><div className="field full"><label>Procedimento</label><input name="procedure_name" defaultValue="Avaliação"/></div></div><div className="modal-foot"><button type="button" className="btn" onClick={()=>setShowAppointment(false)}>Cancelar</button><button className="btn primary" type="submit">Salvar agendamento</button></div></form></div>}
    </div>
  );
}
