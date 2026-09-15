"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarCheck, CircleDollarSign, ClipboardCheck, Clock3, CreditCard, TrendingUp, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Props = { clinicId: string; role: string; patientCount: number };
type Appointment = { starts_at:string; status:string };
type Budget = { total:number; status:string; created_at:string };
type Receivable = { total:number; status:string; created_at:string };
type Payment = { amount:number; paid_at:string; payment_method:string };

function money(value:number){return Number(value||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}
function monthKey(value:string){const date=new Date(value);return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}`}
function monthLabel(key:string){const [year,month]=key.split("-").map(Number);return new Intl.DateTimeFormat("pt-BR",{month:"short"}).format(new Date(year,month-1,1)).replace(".","")}

export default function ConnectedReportsModule({clinicId,role,patientCount}:Props){
  const [appointments,setAppointments]=useState<Appointment[]>([]);
  const [budgets,setBudgets]=useState<Budget[]>([]);
  const [receivables,setReceivables]=useState<Receivable[]>([]);
  const [payments,setPayments]=useState<Payment[]>([]);
  const [loading,setLoading]=useState(true);
  const [message,setMessage]=useState("");

  useEffect(()=>{void (async()=>{
    setLoading(true);
    const supabase=createClient();
    const since=new Date();since.setMonth(since.getMonth()-5);since.setDate(1);since.setHours(0,0,0,0);
    const queries=await Promise.all([
      supabase.from("appointments").select("starts_at,status").eq("clinic_id",clinicId).gte("starts_at",since.toISOString()).limit(3000),
      supabase.from("budgets").select("total,status,created_at").eq("clinic_id",clinicId).gte("created_at",since.toISOString()).limit(2000),
      supabase.from("accounts_receivable").select("total,status,created_at").eq("clinic_id",clinicId).gte("created_at",since.toISOString()).limit(2000),
      supabase.from("payments").select("amount,paid_at,payment_method").eq("clinic_id",clinicId).gte("paid_at",since.toISOString()).limit(3000),
    ]);
    const [a,b,r,p]=queries;
    if(a.error)setMessage(a.error.message);
    if(b.error)setMessage(b.error.message);
    if(r.error&&!['recepcao','dentista'].includes(role))setMessage(r.error.message);
    if(p.error&&!['dentista'].includes(role))setMessage(p.error.message);
    setAppointments((a.data||[]) as Appointment[]);setBudgets((b.data||[]) as Budget[]);setReceivables((r.data||[]) as Receivable[]);setPayments((p.data||[]) as Payment[]);setLoading(false);
  })()},[clinicId,role]);

  const stats=useMemo(()=>{
    const finalized=appointments.filter(a=>a.status==="finalizado").length;
    const missed=appointments.filter(a=>a.status==="faltou").length;
    const cancelled=appointments.filter(a=>a.status==="cancelado").length;
    const approved=budgets.filter(b=>["aprovado","parcial"].includes(b.status));
    const budgetTotal=budgets.reduce((s,b)=>s+Number(b.total),0);
    const approvedTotal=approved.reduce((s,b)=>s+Number(b.total),0);
    const received=payments.reduce((s,p)=>s+Number(p.amount),0);
    const open=receivables.filter(r=>!["pago","cancelado"].includes(r.status)).reduce((s,r)=>s+Number(r.total),0);
    return {finalized,missed,cancelled,budgetTotal,approvedTotal,received,open,conversion:budgets.length?Math.round(approved.length/budgets.length*100):0};
  },[appointments,budgets,receivables,payments]);

  const monthly=useMemo(()=>{
    const now=new Date();
    const keys=Array.from({length:6},(_,index)=>{const d=new Date(now.getFullYear(),now.getMonth()-5+index,1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`});
    return keys.map(key=>({key,label:monthLabel(key),appointments:appointments.filter(a=>monthKey(a.starts_at)===key).length,received:payments.filter(p=>monthKey(p.paid_at)===key).reduce((s,p)=>s+Number(p.amount),0)}));
  },[appointments,payments]);
  const maxAppointments=Math.max(1,...monthly.map(m=>m.appointments));
  const maxReceived=Math.max(1,...monthly.map(m=>m.received));

  return <div className="module-stack page-enter">
    <div className="page-title-row"><div><span className="eyebrow">INTELIGÊNCIA DA CLÍNICA</span><h1>Relatórios</h1><p>Indicadores objetivos dos últimos seis meses para acompanhar operação e resultado.</p></div></div>
    {message&&<div className="notice">{message}</div>}
    {loading?<div className="surface-card modern-empty"><Clock3 size={25}/><h3>Calculando indicadores</h3><p>Consolidando os dados da clínica.</p></div>:<>
      <div className="insight-grid">
        <div className="insight-card tone-blue"><div className="insight-icon"><Users size={19}/></div><div><span>Pacientes ativos</span><strong>{patientCount}</strong><small>base cadastrada</small></div></div>
        <div className="insight-card tone-sky"><div className="insight-icon"><CalendarCheck size={19}/></div><div><span>Atendimentos finalizados</span><strong>{stats.finalized}</strong><small>últimos 6 meses</small></div></div>
        <div className="insight-card tone-violet"><div className="insight-icon"><TrendingUp size={19}/></div><div><span>Conversão de orçamento</span><strong>{stats.conversion}%</strong><small>{money(stats.approvedTotal)} aprovados</small></div></div>
        <div className="insight-card tone-slate"><div className="insight-icon"><CircleDollarSign size={19}/></div><div><span>Recebido</span><strong>{money(stats.received)}</strong><small>{money(stats.open)} em aberto</small></div></div>
      </div>

      <div className="report-grid">
        <section className="surface-card report-card"><div className="section-heading"><div><span className="eyebrow">AGENDA</span><h2>Movimento mensal</h2><p>Quantidade de agendamentos cadastrados por mês.</p></div><CalendarCheck size={20}/></div><div className="bar-chart">{monthly.map(item=><div className="bar-column" key={item.key}><div className="bar-value">{item.appointments}</div><div className="bar-track"><div className="bar-fill" style={{height:`${Math.max(5,item.appointments/maxAppointments*100)}%`}}/></div><span>{item.label}</span></div>)}</div><div className="report-foot"><span>Faltas: <strong>{stats.missed}</strong></span><span>Cancelamentos: <strong>{stats.cancelled}</strong></span></div></section>
        <section className="surface-card report-card"><div className="section-heading"><div><span className="eyebrow">RECEBIMENTOS</span><h2>Entrada financeira</h2><p>Pagamentos registrados por mês.</p></div><CreditCard size={20}/></div><div className="bar-chart money-bars">{monthly.map(item=><div className="bar-column" key={item.key}><div className="bar-value">{item.received?money(item.received).replace("R$ ",""):"0"}</div><div className="bar-track"><div className="bar-fill" style={{height:`${Math.max(5,item.received/maxReceived*100)}%`}}/></div><span>{item.label}</span></div>)}</div><div className="report-foot"><span>Orçado: <strong>{money(stats.budgetTotal)}</strong></span><span>Aprovado: <strong>{money(stats.approvedTotal)}</strong></span></div></section>
      </div>

      <section className="surface-card report-summary"><div><ClipboardCheck size={20}/><span><strong>{budgets.length}</strong> orçamentos emitidos</span></div><div><CircleDollarSign size={20}/><span><strong>{receivables.length}</strong> contas a receber</span></div><div><CreditCard size={20}/><span><strong>{payments.length}</strong> pagamentos registrados</span></div></section>
    </>}
  </div>
}
