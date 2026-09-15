"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Banknote,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  CreditCard,
  FileText,
  LayoutDashboard,
  Menu,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Stethoscope,
  UserRound,
  Users,
  WalletCards,
  X,
} from "lucide-react";

type Module = "inicio" | "agenda" | "pacientes" | "financeiro" | "caixa" | "relatorios" | "configuracoes";
type Patient = { id: number; name: string; phone: string; birth: string; lastVisit: string; status: string };
type Appointment = { id: number; time: string; patient: string; professional: string; procedure: string; status: string };

const initialPatients: Patient[] = [
  { id: 1, name: "Mariana Alves", phone: "(91) 98888-1020", birth: "14/03/1991", lastVisit: "Hoje", status: "Ativo" },
  { id: 2, name: "Paulo Henrique", phone: "(91) 98124-2210", birth: "29/11/1984", lastVisit: "12/09/2026", status: "Ativo" },
  { id: 3, name: "Helena Costa", phone: "(91) 99132-5400", birth: "07/06/2003", lastVisit: "08/09/2026", status: "Ativo" },
  { id: 4, name: "João Ribeiro", phone: "(91) 98420-7741", birth: "20/02/1976", lastVisit: "01/09/2026", status: "Ativo" },
];

const initialAppointments: Appointment[] = [
  { id: 1, time: "08:00", patient: "Mariana Alves", professional: "Dra. Estelita", procedure: "Avaliação", status: "Finalizado" },
  { id: 2, time: "09:00", patient: "Paulo Henrique", professional: "Dra. Estelita", procedure: "Restauração", status: "Em atendimento" },
  { id: 3, time: "10:30", patient: "Helena Costa", professional: "Dra. Estelita", procedure: "Profilaxia", status: "Confirmado" },
  { id: 4, time: "14:00", patient: "João Ribeiro", professional: "Dra. Estelita", procedure: "Retorno", status: "Agendado" },
  { id: 5, time: "15:30", patient: "Camila Souza", professional: "Dra. Estelita", procedure: "Clareamento", status: "Agendado" },
];

const navItems = [
  { id: "inicio" as Module, label: "Início", icon: LayoutDashboard },
  { id: "agenda" as Module, label: "Agenda", icon: CalendarDays },
  { id: "pacientes" as Module, label: "Pacientes", icon: Users },
  { id: "financeiro" as Module, label: "Financeiro", icon: WalletCards },
  { id: "caixa" as Module, label: "Caixa", icon: Banknote },
  { id: "relatorios" as Module, label: "Relatórios", icon: BarChart3 },
  { id: "configuracoes" as Module, label: "Configurações", icon: Settings },
];

function statusClass(status: string) {
  if (["Finalizado", "Pago", "Ativo", "Confirmado"].includes(status)) return "badge green";
  if (["Em atendimento", "Parcial"].includes(status)) return "badge blue";
  if (["Agendado", "Pendente"].includes(status)) return "badge orange";
  return "badge red";
}

function currency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function ClinicApp() {
  const [module, setModule] = useState<Module>("inicio");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [patients, setPatients] = useState(initialPatients);
  const [appointments, setAppointments] = useState(initialAppointments);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"patient" | "appointment" | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientTab, setPatientTab] = useState("Resumo");

  const filteredPatients = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return patients;
    return patients.filter((p) => `${p.name} ${p.phone}`.toLowerCase().includes(q));
  }, [patients, search]);

  function navigate(next: Module) {
    setModule(next);
    setSidebarOpen(false);
    setSelectedPatient(null);
  }

  function addPatient(form: FormData) {
    const name = String(form.get("name") || "").trim();
    if (!name) return;
    setPatients((current) => [
      { id: Date.now(), name, phone: String(form.get("phone") || "—"), birth: String(form.get("birth") || "—"), lastVisit: "Novo cadastro", status: "Ativo" },
      ...current,
    ]);
    setModal(null);
  }

  function addAppointment(form: FormData) {
    const patient = String(form.get("patient") || "").trim();
    if (!patient) return;
    setAppointments((current) => [
      ...current,
      {
        id: Date.now(),
        time: String(form.get("time") || "08:00"),
        patient,
        professional: String(form.get("professional") || "Dra. Estelita"),
        procedure: String(form.get("procedure") || "Avaliação"),
        status: "Agendado",
      },
    ].sort((a, b) => a.time.localeCompare(b.time)));
    setModal(null);
  }

  const titles: Record<Module, [string, string]> = {
    inicio: ["Bom dia!", "Visão geral da Clínica Estelita"],
    agenda: ["Agenda", "Organize os atendimentos da clínica"],
    pacientes: ["Pacientes", "Cadastro e histórico clínico em um só lugar"],
    financeiro: ["Financeiro", "Contas a receber, contas a pagar e pagamentos"],
    caixa: ["Caixa", "Movimentações reais de entrada e saída"],
    relatorios: ["Relatórios", "Indicadores objetivos para gestão"],
    configuracoes: ["Configurações", "Clínica, usuários, permissões e segurança"],
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">CE</div>
          <div><strong>Clínica Estelita</strong><small>Gestão odontológica</small></div>
        </div>
        <nav className="nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} className={module === item.id ? "active" : ""} onClick={() => navigate(item.id)}>
                <Icon size={18} /> {item.label}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <ShieldCheck size={16} style={{ verticalAlign: "middle", marginRight: 7 }} />
          Ambiente demonstrativo<br />Pronto para conectar ao Supabase
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button className="btn mobile-menu" aria-label="Abrir menu" onClick={() => setSidebarOpen((v) => !v)}><Menu size={18} /></button>
            <div className="topbar-title"><strong>{titles[module][0]}</strong><span>{titles[module][1]}</span></div>
          </div>
          <div className="user-pill"><div className="avatar">A</div><span>Administrador</span></div>
        </header>

        <section className="content">
          {module === "inicio" && <Dashboard appointments={appointments} navigate={navigate} />}
          {module === "agenda" && <Agenda appointments={appointments} onNew={() => setModal("appointment")} />}
          {module === "pacientes" && !selectedPatient && <Patients patients={filteredPatients} search={search} setSearch={setSearch} onNew={() => setModal("patient")} onOpen={setSelectedPatient} />}
          {module === "pacientes" && selectedPatient && <PatientDetail patient={selectedPatient} tab={patientTab} setTab={setPatientTab} onBack={() => setSelectedPatient(null)} />}
          {module === "financeiro" && <Finance />}
          {module === "caixa" && <CashRegister />}
          {module === "relatorios" && <Reports />}
          {module === "configuracoes" && <SettingsPanel />}
        </section>
      </main>

      {modal === "patient" && <PatientModal onClose={() => setModal(null)} onSave={addPatient} />}
      {modal === "appointment" && <AppointmentModal patients={patients} onClose={() => setModal(null)} onSave={addAppointment} />}
    </div>
  );
}

function Dashboard({ appointments, navigate }: { appointments: Appointment[]; navigate: (m: Module) => void }) {
  return <>
    <div className="page-head"><div><h1>Resumo de hoje</h1><p>Terça-feira, 15 de setembro de 2026</p></div><div className="actions"><button className="btn" onClick={() => navigate("pacientes")}><Users size={16} /> Pacientes</button><button className="btn primary" onClick={() => navigate("agenda")}><CalendarDays size={16} /> Abrir agenda</button></div></div>
    <div className="notice">Esta versão está em modo demonstração. Os dados abaixo são fictícios e podem ser usados com segurança para validar o sistema antes de conectar pacientes reais.</div>
    <div className="grid metrics">
      <Metric icon={<CalendarDays size={18} />} label="Atendimentos hoje" value={String(appointments.length)} hint="1 em atendimento" />
      <Metric icon={<CircleDollarSign size={18} />} label="Previsto hoje" value="R$ 2.480" hint="Recebimentos programados" />
      <Metric icon={<CheckCircle2 size={18} />} label="Recebido hoje" value="R$ 1.260" hint="51% do previsto" />
      <Metric icon={<AlertTriangle size={18} />} label="Em atraso" value="R$ 840" hint="4 parcelas vencidas" />
    </div>
    <div className="grid two" style={{ marginTop: 16 }}>
      <div className="card"><div className="card-head"><h3>Próximos atendimentos</h3><button className="btn" onClick={() => navigate("agenda")}>Ver agenda</button></div><div className="timeline">{appointments.slice(0, 5).map(a => <div className="timeline-item" key={a.id}><div className="timeline-time">{a.time}</div><div><div style={{display:"flex",justifyContent:"space-between",gap:10}}><div className="timeline-title">{a.patient}</div><span className={statusClass(a.status)}>{a.status}</span></div><div className="timeline-meta">{a.procedure} · {a.professional}</div></div></div>)}</div></div>
      <div className="card pad"><div className="card-head" style={{padding:"0 0 12px", marginBottom:4}}><h3>Financeiro do mês</h3><WalletCards size={18}/></div><div className="kpi-row"><span>Faturado</span><strong>R$ 38.420</strong></div><div className="kpi-row"><span>Recebido</span><strong>R$ 31.760</strong></div><div className="kpi-row"><span>A receber</span><strong>R$ 6.660</strong></div><div className="kpi-row"><span>Despesas</span><strong>R$ 12.180</strong></div><div className="kpi-row"><span>Saldo operacional</span><strong>R$ 19.580</strong></div></div>
    </div>
  </>;
}

function Metric({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint: string }) {
  return <div className="card metric"><div className="label"><span>{label}</span><div className="icon-box">{icon}</div></div><div className="value">{value}</div><div className="hint">{hint}</div></div>;
}

function Agenda({ appointments, onNew }: { appointments: Appointment[]; onNew: () => void }) {
  return <><div className="page-head"><div><h1>Agenda</h1><p>Hoje · Dra. Estelita</p></div><button className="btn primary" onClick={onNew}><Plus size={16}/> Novo agendamento</button></div><div className="card"><div className="card-head"><h3>15 de setembro</h3><div className="actions"><button className="btn">Hoje</button><button className="btn">Semana</button></div></div><div className="timeline">{appointments.map(a => <div className="timeline-item" key={a.id}><div className="timeline-time">{a.time}</div><div><div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center"}}><div><div className="timeline-title">{a.patient}</div><div className="timeline-meta">{a.procedure} · {a.professional}</div></div><span className={statusClass(a.status)}>{a.status}</span></div></div></div>)}</div></div></>;
}

function Patients({ patients, search, setSearch, onNew, onOpen }: { patients: Patient[]; search: string; setSearch: (v:string)=>void; onNew:()=>void; onOpen:(p:Patient)=>void }) {
  return <><div className="page-head"><div><h1>Pacientes</h1><p>{patients.length} paciente(s) exibido(s)</p></div><button className="btn primary" onClick={onNew}><Plus size={16}/> Novo paciente</button></div><div className="toolbar"><div className="search"><Search size={17}/><input placeholder="Buscar por nome ou telefone..." value={search} onChange={e=>setSearch(e.target.value)}/></div></div><div className="card table-wrap"><table><thead><tr><th>Paciente</th><th>Telefone</th><th>Nascimento</th><th>Último atendimento</th><th>Status</th><th></th></tr></thead><tbody>{patients.map(p=><tr key={p.id}><td><strong>{p.name}</strong></td><td>{p.phone}</td><td>{p.birth}</td><td>{p.lastVisit}</td><td><span className="badge green">{p.status}</span></td><td><button className="btn" onClick={()=>onOpen(p)}>Abrir</button></td></tr>)}</tbody></table></div></>;
}

function PatientDetail({ patient, tab, setTab, onBack }: { patient: Patient; tab:string; setTab:(v:string)=>void; onBack:()=>void }) {
  const tabs=["Resumo","Prontuário","Odontograma","Tratamento","Orçamentos","Financeiro","Arquivos"];
  return <><div className="page-head"><div><button className="btn" onClick={onBack} style={{marginBottom:12}}>← Voltar</button><h1>{patient.name}</h1><p>{patient.phone} · Nascimento: {patient.birth}</p></div><button className="btn primary"><Plus size={16}/> Novo atendimento</button></div><div className="card"><div className="tabs">{tabs.map(t=><button key={t} className={tab===t?"active":""} onClick={()=>setTab(t)}>{t}</button>)}</div><div className="pad">{tab==="Resumo"&&<PatientSummary/>}{tab==="Prontuário"&&<MedicalRecord/>}{tab==="Odontograma"&&<Odontogram/>}{tab==="Tratamento"&&<Treatment/>}{tab==="Orçamentos"&&<Budgets/>}{tab==="Financeiro"&&<PatientFinance/>}{tab==="Arquivos"&&<Files/>}</div></div></>;
}

function PatientSummary(){return <div className="grid two"><div><h3>Resumo clínico</h3><div className="notice">Sem alertas médicos ativos cadastrados.</div><div className="kpi-row"><span>Último atendimento</span><strong>15/09/2026</strong></div><div className="kpi-row"><span>Profissional</span><strong>Dra. Estelita</strong></div><div className="kpi-row"><span>Plano ativo</span><strong>Plano restaurador</strong></div></div><div><h3>Dados financeiros</h3><div className="kpi-row"><span>Total contratado</span><strong>R$ 2.400</strong></div><div className="kpi-row"><span>Pago</span><strong>R$ 1.200</strong></div><div className="kpi-row"><span>Em aberto</span><strong>R$ 1.200</strong></div></div></div>}
function MedicalRecord(){return <><div className="page-head" style={{marginBottom:14}}><div><h1 style={{fontSize:18}}>Prontuário</h1><p>Histórico clínico cronológico e auditável</p></div><button className="btn primary"><Plus size={16}/> Nova evolução</button></div><div className="timeline"><div className="timeline-item"><div className="timeline-time">15/09</div><div><div className="timeline-title">Avaliação e restauração do elemento 16</div><div className="timeline-meta">Dra. Estelita · 08:42</div><p>Paciente sem intercorrências. Realizada restauração conforme plano aprovado.</p></div></div><div className="timeline-item"><div className="timeline-time">01/09</div><div><div className="timeline-title">Consulta inicial</div><div className="timeline-meta">Dra. Estelita · 14:10</div><p>Anamnese preenchida e plano de tratamento apresentado.</p></div></div></div></>}
function Odontogram(){return <><div className="page-head" style={{marginBottom:16}}><div><h1 style={{fontSize:18}}>Odontograma</h1><p>Clique em um dente para registrar condição ou procedimento.</p></div></div><div className="odontogram">{[18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28,48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38].map(n=><button className={`tooth ${n===16?"done":n===26?"pending":""}`} key={n}>{n}</button>)}</div><div style={{display:"flex",gap:14,marginTop:16,fontSize:12,color:"var(--muted)"}}><span>● Verde: realizado</span><span>● Amarelo: planejado</span></div></>}
function Treatment(){return <><div className="page-head" style={{marginBottom:14}}><div><h1 style={{fontSize:18}}>Plano de tratamento</h1><p>Plano restaurador · aprovado</p></div><button className="btn primary"><Plus size={16}/> Procedimento</button></div><div className="card table-wrap"><table><thead><tr><th>Dente</th><th>Procedimento</th><th>Valor</th><th>Status</th></tr></thead><tbody><tr><td>16</td><td>Restauração em resina</td><td>R$ 480</td><td><span className="badge green">Realizado</span></td></tr><tr><td>26</td><td>Restauração em resina</td><td>R$ 480</td><td><span className="badge orange">Planejado</span></td></tr><tr><td>—</td><td>Profilaxia</td><td>R$ 220</td><td><span className="badge orange">Planejado</span></td></tr></tbody></table></div></>}
function Budgets(){return <><div className="page-head" style={{marginBottom:14}}><div><h1 style={{fontSize:18}}>Orçamentos</h1><p>Propostas e aprovações</p></div><button className="btn primary"><Plus size={16}/> Novo orçamento</button></div><div className="card table-wrap"><table><thead><tr><th>Número</th><th>Data</th><th>Total</th><th>Status</th></tr></thead><tbody><tr><td>#00042</td><td>01/09/2026</td><td>R$ 2.400</td><td><span className="badge green">Aprovado</span></td></tr></tbody></table></div></>}
function PatientFinance(){return <><h3>Financeiro do paciente</h3><div className="card table-wrap"><table><thead><tr><th>Vencimento</th><th>Descrição</th><th>Valor</th><th>Status</th></tr></thead><tbody><tr><td>05/09/2026</td><td>Parcela 1/2</td><td>R$ 1.200</td><td><span className="badge green">Pago</span></td></tr><tr><td>05/10/2026</td><td>Parcela 2/2</td><td>R$ 1.200</td><td><span className="badge orange">Pendente</span></td></tr></tbody></table></div></>}
function Files(){return <><div className="page-head" style={{marginBottom:14}}><div><h1 style={{fontSize:18}}>Arquivos</h1><p>Radiografias, fotografias, termos e documentos.</p></div><button className="btn primary"><Plus size={16}/> Enviar arquivo</button></div><div className="empty"><FileText size={30}/><p>Nenhum arquivo demonstrativo anexado.</p></div></>}

function Finance() {
  const receivables=[{name:"Mariana Alves",desc:"Parcela 2/2",date:"05/10/2026",value:1200,status:"Pendente"},{name:"Carlos Lima",desc:"Parcela 3/4",date:"10/09/2026",value:420,status:"Atrasado"},{name:"Helena Costa",desc:"Profilaxia",date:"15/09/2026",value:220,status:"Pago"}];
  return <><div className="page-head"><div><h1>Financeiro</h1><p>Compromissos financeiros — separado do caixa</p></div><div className="actions"><button className="btn"><Plus size={16}/> Conta a pagar</button><button className="btn primary"><Plus size={16}/> Conta a receber</button></div></div><div className="grid metrics"><Metric icon={<CircleDollarSign size={18}/>} label="A receber" value="R$ 6.660" hint="Próximos 30 dias"/><Metric icon={<AlertTriangle size={18}/>} label="Vencido" value="R$ 840" hint="4 parcelas"/><Metric icon={<CreditCard size={18}/>} label="A pagar" value="R$ 4.320" hint="Próximos 30 dias"/><Metric icon={<Activity size={18}/>} label="Resultado previsto" value="R$ 2.340" hint="Receber menos pagar"/></div><div className="card table-wrap" style={{marginTop:16}}><div className="card-head"><h3>Contas a receber</h3></div><table><thead><tr><th>Paciente</th><th>Descrição</th><th>Vencimento</th><th>Valor</th><th>Status</th></tr></thead><tbody>{receivables.map((r,i)=><tr key={i}><td><strong>{r.name}</strong></td><td>{r.desc}</td><td>{r.date}</td><td>{currency(r.value)}</td><td><span className={statusClass(r.status)}>{r.status}</span></td></tr>)}</tbody></table></div></>;
}

function CashRegister(){return <><div className="page-head"><div><h1>Caixa</h1><p>Caixa aberto hoje às 07:45 por Administrador</p></div><button className="btn primary"><Banknote size={16}/> Fechar caixa</button></div><div className="grid metrics"><Metric icon={<Banknote size={18}/>} label="Saldo de abertura" value="R$ 200" hint="Dinheiro inicial"/><Metric icon={<CircleDollarSign size={18}/>} label="Entradas" value="R$ 1.260" hint="Recebimentos registrados"/><Metric icon={<CreditCard size={18}/>} label="Saídas" value="R$ 80" hint="Retiradas e despesas"/><Metric icon={<CheckCircle2 size={18}/>} label="Saldo atual" value="R$ 1.380" hint="Saldo calculado"/></div><div className="card table-wrap" style={{marginTop:16}}><div className="card-head"><h3>Movimentações</h3><button className="btn"><Plus size={16}/> Movimentação</button></div><table><thead><tr><th>Hora</th><th>Tipo</th><th>Descrição</th><th>Forma</th><th>Valor</th></tr></thead><tbody><tr><td>08:55</td><td><span className="badge green">Entrada</span></td><td>Pagamento · Mariana Alves</td><td>PIX</td><td>R$ 1.200</td></tr><tr><td>10:10</td><td><span className="badge green">Entrada</span></td><td>Pagamento · Particular</td><td>Dinheiro</td><td>R$ 60</td></tr><tr><td>11:20</td><td><span className="badge red">Saída</span></td><td>Pequena despesa</td><td>Dinheiro</td><td>R$ 80</td></tr></tbody></table></div></>}

function Reports(){return <><div className="page-head"><div><h1>Relatórios</h1><p>Indicadores simples para decisões do dia a dia</p></div><button className="btn"><FileText size={16}/> Exportar</button></div><div className="grid metrics"><Metric icon={<Users size={18}/>} label="Pacientes atendidos" value="128" hint="Este mês"/><Metric icon={<CalendarDays size={18}/>} label="Taxa de presença" value="91%" hint="+3 p.p. vs. mês anterior"/><Metric icon={<CircleDollarSign size={18}/>} label="Ticket médio" value="R$ 300" hint="Por atendimento"/><Metric icon={<BarChart3 size={18}/>} label="Conversão orçamento" value="68%" hint="Aprovados no mês"/></div><div className="grid two" style={{marginTop:16}}><div className="card pad"><h3>Produção por procedimento</h3><div className="kpi-row"><span>Restaurações</span><strong>R$ 12.480</strong></div><div className="kpi-row"><span>Profilaxias</span><strong>R$ 6.820</strong></div><div className="kpi-row"><span>Clareamentos</span><strong>R$ 5.900</strong></div><div className="kpi-row"><span>Outros</span><strong>R$ 13.220</strong></div></div><div className="card pad"><h3>Agenda</h3><div className="kpi-row"><span>Agendados</span><strong>141</strong></div><div className="kpi-row"><span>Compareceram</span><strong>128</strong></div><div className="kpi-row"><span>Faltaram</span><strong>8</strong></div><div className="kpi-row"><span>Cancelaram</span><strong>5</strong></div></div></div></>}

function SettingsPanel(){return <><div className="page-head"><div><h1>Configurações</h1><p>Administração da clínica e controle de acesso</p></div></div><div className="grid two"><div className="card pad"><h3>Dados da clínica</h3><div className="form-grid" style={{marginTop:14}}><div className="field full"><label>Nome</label><input defaultValue="Clínica Estelita"/></div><div className="field"><label>CNPJ/CPF</label><input placeholder="Somente quando definido"/></div><div className="field"><label>Telefone</label><input placeholder="(91) ..."/></div><div className="field full"><label>Endereço</label><input placeholder="Endereço da clínica"/></div></div><div style={{marginTop:14}}><button className="btn primary">Salvar alterações</button></div></div><div className="card pad"><h3>Segurança</h3><div className="kpi-row"><span>Controle por perfil</span><strong>Ativo</strong></div><div className="kpi-row"><span>Auditoria</span><strong>Preparada</strong></div><div className="kpi-row"><span>RLS Supabase</span><strong>Configuração incluída</strong></div><div className="kpi-row"><span>Backup</span><strong>Configurar antes de produção</strong></div></div></div><div className="card table-wrap" style={{marginTop:16}}><div className="card-head"><h3>Usuários e perfis</h3><button className="btn primary"><Plus size={16}/> Novo usuário</button></div><table><thead><tr><th>Usuário</th><th>Perfil</th><th>Acesso</th><th>Status</th></tr></thead><tbody><tr><td><strong>Administrador</strong></td><td>Administrador</td><td>Todos os módulos</td><td><span className="badge green">Ativo</span></td></tr><tr><td>Recepção</td><td>Recepção</td><td>Agenda e pacientes</td><td><span className="badge green">Ativo</span></td></tr><tr><td>Dra. Estelita</td><td>Dentista</td><td>Clínico</td><td><span className="badge green">Ativo</span></td></tr></tbody></table></div></>}

function PatientModal({ onClose, onSave }: { onClose:()=>void; onSave:(f:FormData)=>void }) {
  return <div className="modal-backdrop"><form className="modal" action={onSave}><div className="modal-head"><h2>Novo paciente</h2><button type="button" className="btn" onClick={onClose}><X size={16}/></button></div><div className="modal-body"><div className="form-grid"><div className="field full"><label>Nome completo *</label><input name="name" required autoFocus/></div><div className="field"><label>Telefone / WhatsApp</label><input name="phone" placeholder="(91) 99999-9999"/></div><div className="field"><label>Data de nascimento</label><input name="birth" type="date"/></div><div className="field"><label>CPF</label><input name="cpf"/></div><div className="field"><label>E-mail</label><input name="email" type="email"/></div><div className="field full"><label>Observações</label><textarea name="notes" rows={3}/></div></div></div><div className="modal-foot"><button type="button" className="btn" onClick={onClose}>Cancelar</button><button className="btn primary" type="submit">Salvar paciente</button></div></form></div>
}

function AppointmentModal({ patients, onClose, onSave }: { patients:Patient[]; onClose:()=>void; onSave:(f:FormData)=>void }) {
  return <div className="modal-backdrop"><form className="modal" action={onSave}><div className="modal-head"><h2>Novo agendamento</h2><button type="button" className="btn" onClick={onClose}><X size={16}/></button></div><div className="modal-body"><div className="form-grid"><div className="field full"><label>Paciente *</label><select name="patient" required defaultValue=""><option value="" disabled>Selecione...</option>{patients.map(p=><option key={p.id}>{p.name}</option>)}</select></div><div className="field"><label>Horário</label><input type="time" name="time" defaultValue="08:00"/></div><div className="field"><label>Profissional</label><select name="professional"><option>Dra. Estelita</option></select></div><div className="field full"><label>Procedimento</label><input name="procedure" defaultValue="Avaliação"/></div></div></div><div className="modal-foot"><button type="button" className="btn" onClick={onClose}>Cancelar</button><button className="btn primary" type="submit">Agendar</button></div></form></div>
}
