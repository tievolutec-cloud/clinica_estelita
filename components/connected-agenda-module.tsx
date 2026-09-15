"use client";

import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

type AppointmentPatient = { full_name: string };
export type AgendaAppointment = {
  id: string;
  starts_at: string;
  ends_at: string | null;
  procedure_name: string | null;
  status: string;
  patient_id: string;
  patients: AppointmentPatient | AppointmentPatient[] | null;
};

type Props = {
  appointments: AgendaAppointment[];
  selectedDate: Date;
  view: "dia" | "semana" | "mes";
  onViewChange: (view: "dia" | "semana" | "mes") => void;
  onDateChange: (date: Date) => void;
  onNewAppointment: () => void;
  onOpenPatient: (patientId: string) => void;
};

function patientName(value: AgendaAppointment["patients"]) {
  if (Array.isArray(value)) return value[0]?.full_name || "Paciente";
  return value?.full_name || "Paciente";
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function startOfWeek(value: Date) {
  const date = new Date(value);
  const day = date.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + offset);
  date.setHours(0,0,0,0);
  return date;
}
function weekDays(value: Date) {
  const start = startOfWeek(value);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}
function monthGrid(value: Date) {
  const first = new Date(value.getFullYear(), value.getMonth(), 1);
  const start = startOfWeek(first);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}
function fmtTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}
function statusLabel(value: string) {
  return value.replaceAll("_", " ");
}

export default function ConnectedAgendaModule({ appointments, selectedDate, view, onViewChange, onDateChange, onNewAppointment, onOpenPatient }: Props) {
  const dayAppointments = appointments.filter((item) => sameDay(new Date(item.starts_at), selectedDate));
  const days = weekDays(selectedDate);
  const monthDays = monthGrid(selectedDate);
  const hours = Array.from({ length: 22 }, (_, index) => 7 + index * .5);

  function move(delta: number) {
    const next = new Date(selectedDate);
    if (view === "dia") next.setDate(next.getDate() + delta);
    if (view === "semana") next.setDate(next.getDate() + delta * 7);
    if (view === "mes") next.setMonth(next.getMonth() + delta);
    onDateChange(next);
  }

  const title = view === "mes"
    ? new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(selectedDate)
    : view === "semana"
      ? `${new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(days[0])} — ${new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(days[6])}`
      : new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }).format(selectedDate);

  return <div className="page-enter">
    <div className="page-title-row">
      <div><span className="eyebrow">ORGANIZAÇÃO CLÍNICA</span><h1>Agenda</h1><p>Dia, semana e mês em uma navegação única e visual.</p></div>
      <button className="btn primary elevated" onClick={onNewAppointment}><Plus size={16}/> Novo agendamento</button>
    </div>

    <div className="surface-card agenda-toolbar">
      <div className="date-nav"><button className="icon-btn" onClick={()=>move(-1)}><ChevronLeft size={17}/></button><button className="btn ghost" onClick={()=>onDateChange(new Date())}>Hoje</button><button className="icon-btn" onClick={()=>move(1)}><ChevronRight size={17}/></button><strong className="agenda-title">{title}</strong></div>
      <div className="pill-tabs"><button className={view==="mes"?"active":""} onClick={()=>onViewChange("mes")}>Mês</button><button className={view==="semana"?"active":""} onClick={()=>onViewChange("semana")}>Semana</button><button className={view==="dia"?"active":""} onClick={()=>onViewChange("dia")}>Dia</button></div>
    </div>

    {view === "dia" && <div className="surface-card agenda-day premium-card">{hours.map((hour)=>{const h=Math.floor(hour);const min=hour%1===0?0:30;const slot=dayAppointments.filter(a=>{const d=new Date(a.starts_at);return d.getHours()===h&&d.getMinutes()===min;});return <div key={hour} style={{display:"contents"}}><div className="agenda-hour">{String(h).padStart(2,"0")}:{String(min).padStart(2,"0")}</div><div className="agenda-slot">{slot.map(item=><button key={item.id} className={`appointment-pill ${item.status}`} onClick={()=>onOpenPatient(item.patient_id)}><strong>{patientName(item.patients)}</strong><small>{item.procedure_name || "Atendimento"} · {statusLabel(item.status)}</small></button>)}</div></div>})}</div>}

    {view === "semana" && <div className="surface-card week-calendar">
      <div className="week-calendar-head"><div className="week-time-label"/>{days.map(day=><button key={day.toISOString()} className={sameDay(day,new Date())?"today":""} onClick={()=>{onDateChange(day);onViewChange("dia")}}><span>{new Intl.DateTimeFormat("pt-BR",{weekday:"short"}).format(day)}</span><strong>{day.getDate()}</strong></button>)}</div>
      <div className="week-calendar-body">{hours.map(hour=>{const h=Math.floor(hour);const min=hour%1===0?0:30;return <div className="week-row" key={hour}><div className="week-time-label">{String(h).padStart(2,"0")}:{String(min).padStart(2,"0")}</div>{days.map(day=>{const slot=appointments.filter(item=>{const d=new Date(item.starts_at);return sameDay(d,day)&&d.getHours()===h&&d.getMinutes()===min});return <div className="week-cell" key={day.toISOString()+hour}>{slot.map(item=><button className={`week-event ${item.status}`} key={item.id} title={`${patientName(item.patients)} — ${item.procedure_name || "Atendimento"}`} onClick={()=>onOpenPatient(item.patient_id)}><strong>{fmtTime(item.starts_at)}</strong><span>{patientName(item.patients)}</span></button>)}</div>})}</div>})}</div>
    </div>}

    {view === "mes" && <div className="surface-card month-calendar">
      <div className="month-weekdays">{["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"].map(label=><span key={label}>{label}</span>)}</div>
      <div className="month-grid">{monthDays.map(day=>{const items=appointments.filter(item=>sameDay(new Date(item.starts_at),day));const outside=day.getMonth()!==selectedDate.getMonth();return <div className={`month-day ${outside?"outside":""} ${sameDay(day,new Date())?"today":""}`} key={day.toISOString()}><button className="month-day-number" onClick={()=>{onDateChange(day);onViewChange("dia")}}>{day.getDate()}</button><div className="month-events">{items.slice(0,4).map(item=><button key={item.id} className={`month-event ${item.status}`} onClick={()=>onOpenPatient(item.patient_id)}><span>{fmtTime(item.starts_at)}</span> {patientName(item.patients)}</button>)}{items.length>4&&<button className="month-more" onClick={()=>{onDateChange(day);onViewChange("dia")}}>+{items.length-4} atendimentos</button>}</div></div>})}</div>
    </div>}
  </div>;
}
