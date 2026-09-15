"use client";

import { useEffect, useState } from "react";
import { Building2, CalendarDays, ChevronRight, FileLock2, ShieldCheck, UserCog, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Clinic = { id:string; name:string; legal_name:string|null; document:string|null; phone:string|null; email:string|null; active:boolean };
type Member = { id:string; user_id:string; role:string; active:boolean; created_at:string };
type Audit = { id:number; action:string; entity:string; created_at:string; user_id:string|null };
type Props = { clinicId:string; role:string; clinicName:string };

export default function ConnectedSettingsModule({clinicId,role,clinicName}:Props){
  const [clinic,setClinic]=useState<Clinic|null>(null);
  const [members,setMembers]=useState<Member[]>([]);
  const [audits,setAudits]=useState<Audit[]>([]);
  const [loading,setLoading]=useState(true);
  const [message,setMessage]=useState("");
  const canAdmin=role==="admin";

  useEffect(()=>{void (async()=>{
    setLoading(true);
    const supabase=createClient();
    const [c,m,a]=await Promise.all([
      supabase.from("clinics").select("id,name,legal_name,document,phone,email,active").eq("id",clinicId).maybeSingle(),
      supabase.from("clinic_members").select("id,user_id,role,active,created_at").eq("clinic_id",clinicId).order("created_at",{ascending:true}),
      supabase.from("audit_logs").select("id,action,entity,created_at,user_id").eq("clinic_id",clinicId).order("created_at",{ascending:false}).limit(12),
    ]);
    if(c.error)setMessage(c.error.message);
    if(m.error)setMessage(m.error.message);
    if(a.error&&!["recepcao","dentista","financeiro"].includes(role))setMessage(a.error.message);
    setClinic((c.data||null) as Clinic|null);setMembers((m.data||[]) as Member[]);setAudits((a.data||[]) as Audit[]);setLoading(false);
  })()},[clinicId,role]);

  const permissionRows=[
    {label:"Administrador",desc:"Acesso total, equipe, financeiro, caixa e configurações.",roles:"admin"},
    {label:"Recepção",desc:"Pacientes, agenda, atendimento operacional e caixa permitido.",roles:"recepcao"},
    {label:"Dentista",desc:"Pacientes, prontuário, odontograma, tratamento e orçamento.",roles:"dentista"},
    {label:"Financeiro",desc:"Contas a pagar, receber, pagamentos e caixa.",roles:"financeiro"},
    {label:"Gestor",desc:"Leitura gerencial, relatórios e auditoria sem operação financeira.",roles:"gestor"},
  ];

  return <div className="module-stack page-enter">
    <div className="page-title-row"><div><span className="eyebrow">CONTROLE DA OPERAÇÃO</span><h1>Configurações</h1><p>Dados da clínica, equipe, permissões e segurança em uma área simples.</p></div></div>
    {message&&<div className="notice">{message}</div>}
    {loading?<div className="surface-card modern-empty"><ShieldCheck size={24}/><h3>Carregando configurações</h3><p>Consultando dados e permissões da clínica.</p></div>:<div className="settings-sections">
      <section className="surface-card settings-panel"><div className="settings-panel-head"><div className="settings-panel-icon"><Building2 size={20}/></div><div><h2>Clínica</h2><p>Identificação e contatos principais.</p></div></div><div className="settings-data-grid"><div><span>Nome</span><strong>{clinic?.name||clinicName}</strong></div><div><span>Razão social</span><strong>{clinic?.legal_name||"Não informado"}</strong></div><div><span>Documento</span><strong>{clinic?.document||"Não informado"}</strong></div><div><span>Telefone</span><strong>{clinic?.phone||"Não informado"}</strong></div><div><span>E-mail</span><strong>{clinic?.email||"Não informado"}</strong></div><div><span>Status</span><strong>{clinic?.active!==false?"Ativa":"Inativa"}</strong></div></div>{canAdmin&&<div className="settings-note">A edição dos dados empresariais será liberada junto com a próxima política administrativa do Supabase, sem expor permissões sensíveis no navegador.</div>}</section>

      <section className="surface-card settings-panel"><div className="settings-panel-head"><div className="settings-panel-icon"><Users size={20}/></div><div><h2>Equipe e acessos</h2><p>{members.length} usuário(s) vinculado(s) à clínica.</p></div></div><div className="team-list">{members.map(member=><div className="team-row" key={member.id}><div className="team-avatar"><UserCog size={17}/></div><div><strong>Usuário {member.user_id.slice(0,8)}</strong><span>Vinculado em {new Intl.DateTimeFormat("pt-BR").format(new Date(member.created_at))}</span></div><span className="badge blue">{member.role}</span><span className={member.active?"badge green":"badge red"}>{member.active?"Ativo":"Inativo"}</span></div>)}</div></section>

      <section className="surface-card settings-panel"><div className="settings-panel-head"><div className="settings-panel-icon"><ShieldCheck size={20}/></div><div><h2>Permissões por perfil</h2><p>Resumo das regras aplicadas pelo banco de dados.</p></div></div><div className="permission-list">{permissionRows.map(item=><div key={item.roles}><div><strong>{item.label}</strong><p>{item.desc}</p></div><span className="badge blue">{item.roles}</span></div>)}</div></section>

      <section className="surface-card settings-panel"><div className="settings-panel-head"><div className="settings-panel-icon"><CalendarDays size={20}/></div><div><h2>Agenda e operação</h2><p>Configurações funcionais que entram na próxima camada.</p></div></div><div className="settings-action-list"><button><span><strong>Horários de atendimento</strong><small>Definir dias e faixas de funcionamento.</small></span><ChevronRight size={16}/></button><button><span><strong>Duração padrão</strong><small>Tempo sugerido para novos agendamentos.</small></span><ChevronRight size={16}/></button><button><span><strong>Status da agenda</strong><small>Personalizar fluxo de confirmação e atendimento.</small></span><ChevronRight size={16}/></button></div></section>

      <section className="surface-card settings-panel full-settings-panel"><div className="settings-panel-head"><div className="settings-panel-icon"><FileLock2 size={20}/></div><div><h2>Segurança e auditoria</h2><p>Eventos recentes disponíveis para administrador e gestor.</p></div></div>{audits.length?<div className="audit-list">{audits.map(item=><div key={item.id}><span className="audit-dot"/><div><strong>{item.action}</strong><p>{item.entity} · {new Intl.DateTimeFormat("pt-BR",{dateStyle:"short",timeStyle:"short"}).format(new Date(item.created_at))}</p></div></div>)}</div>:<div className="modern-empty compact-empty"><FileLock2 size={23}/><h3>Sem eventos para exibir</h3><p>Os registros de auditoria aparecerão aqui conforme as operações protegidas forem executadas.</p></div>}</section>
    </div>}
  </div>
}
