-- Clínica Estelita - esquema inicial PostgreSQL/Supabase
-- Execute no SQL Editor do Supabase antes de usar dados reais.

create extension if not exists pgcrypto;

create type public.user_role as enum ('admin','recepcao','dentista','financeiro','gestor');
create type public.appointment_status as enum ('agendado','confirmado','aguardando','em_atendimento','finalizado','faltou','cancelado');
create type public.budget_status as enum ('rascunho','enviado','aprovado','parcial','recusado','cancelado');
create type public.financial_status as enum ('pendente','pago','parcial','vencido','cancelado');
create type public.cash_movement_type as enum ('entrada','saida','sangria','suprimento');

create table public.clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text,
  document text,
  phone text,
  email text,
  address jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.clinic_members (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.user_role not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (clinic_id, user_id)
);

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  full_name text not null,
  cpf text,
  birth_date date,
  phone text,
  whatsapp text,
  email text,
  address jsonb not null default '{}'::jsonb,
  guardian_name text,
  notes text,
  active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index patients_clinic_cpf_unique on public.patients(clinic_id, cpf) where cpf is not null and cpf <> '';
create index patients_clinic_name_idx on public.patients(clinic_id, full_name);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete restrict,
  professional_id uuid references auth.users(id),
  starts_at timestamptz not null,
  ends_at timestamptz,
  procedure_name text,
  status public.appointment_status not null default 'agendado',
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index appointments_clinic_date_idx on public.appointments(clinic_id, starts_at);

create table public.anamneses (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  alerts text,
  signed_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.medical_records (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete restrict,
  professional_id uuid not null references auth.users(id),
  appointment_id uuid references public.appointments(id) on delete set null,
  title text not null,
  content text not null,
  procedure_name text,
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index medical_records_patient_idx on public.medical_records(clinic_id, patient_id, created_at desc);

create table public.odontogram_events (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete restrict,
  tooth_number smallint not null check (tooth_number between 11 and 85),
  surface text,
  event_type text not null,
  status text not null default 'planejado',
  notes text,
  professional_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.treatment_plans (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete restrict,
  name text not null,
  status text not null default 'rascunho',
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.treatment_plan_items (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  treatment_plan_id uuid not null references public.treatment_plans(id) on delete cascade,
  tooth_number smallint,
  procedure_name text not null,
  quantity numeric(10,2) not null default 1,
  unit_price numeric(12,2) not null default 0,
  status text not null default 'planejado',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete restrict,
  treatment_plan_id uuid references public.treatment_plans(id) on delete set null,
  number bigint generated always as identity,
  status public.budget_status not null default 'rascunho',
  discount numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  valid_until date,
  approved_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.budget_items (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  budget_id uuid not null references public.budgets(id) on delete cascade,
  description text not null,
  quantity numeric(10,2) not null default 1,
  unit_price numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  treatment_plan_item_id uuid references public.treatment_plan_items(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.accounts_receivable (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  patient_id uuid references public.patients(id) on delete restrict,
  budget_id uuid references public.budgets(id) on delete set null,
  description text not null,
  total numeric(12,2) not null,
  status public.financial_status not null default 'pendente',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.receivable_installments (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  account_receivable_id uuid not null references public.accounts_receivable(id) on delete cascade,
  installment_number integer not null,
  due_date date not null,
  amount numeric(12,2) not null,
  paid_amount numeric(12,2) not null default 0,
  status public.financial_status not null default 'pendente',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(account_receivable_id, installment_number)
);
create index installments_due_idx on public.receivable_installments(clinic_id, due_date, status);

create table public.accounts_payable (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  supplier text,
  description text not null,
  due_date date not null,
  amount numeric(12,2) not null,
  paid_amount numeric(12,2) not null default 0,
  status public.financial_status not null default 'pendente',
  category text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cash_sessions (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  opened_by uuid not null references auth.users(id),
  opened_at timestamptz not null default now(),
  opening_balance numeric(12,2) not null default 0,
  closed_by uuid references auth.users(id),
  closed_at timestamptz,
  expected_balance numeric(12,2),
  counted_balance numeric(12,2),
  difference numeric(12,2),
  notes text
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  patient_id uuid references public.patients(id) on delete restrict,
  installment_id uuid references public.receivable_installments(id) on delete set null,
  cash_session_id uuid references public.cash_sessions(id) on delete set null,
  amount numeric(12,2) not null check (amount > 0),
  payment_method text not null,
  paid_at timestamptz not null default now(),
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.cash_movements (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  cash_session_id uuid not null references public.cash_sessions(id) on delete cascade,
  payment_id uuid references public.payments(id) on delete set null,
  movement_type public.cash_movement_type not null,
  description text not null,
  amount numeric(12,2) not null check (amount > 0),
  payment_method text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  clinic_id uuid references public.clinics(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_clinic_created_idx on public.audit_logs(clinic_id, created_at desc);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.is_clinic_member(target_clinic uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.clinic_members cm
    where cm.clinic_id = target_clinic
      and cm.user_id = auth.uid()
      and cm.active = true
  );
$$;

create or replace function public.has_clinic_role(target_clinic uuid, allowed_roles public.user_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.clinic_members cm
    where cm.clinic_id = target_clinic
      and cm.user_id = auth.uid()
      and cm.active = true
      and cm.role = any(allowed_roles)
  );
$$;

revoke all on function public.is_clinic_member(uuid) from public;
grant execute on function public.is_clinic_member(uuid) to authenticated;
revoke all on function public.has_clinic_role(uuid, public.user_role[]) from public;
grant execute on function public.has_clinic_role(uuid, public.user_role[]) to authenticated;

-- Mantém updated_at automaticamente.
do $$
declare t text;
begin
  foreach t in array array['clinics','profiles','patients','appointments','anamneses','medical_records','treatment_plans','treatment_plan_items','budgets','accounts_receivable','receivable_installments','accounts_payable']
  loop
    execute format('create trigger %I_touch before update on public.%I for each row execute function public.touch_updated_at()', t, t);
  end loop;
end $$;

-- RLS: por padrão nenhum usuário autenticado acessa outra clínica.
alter table public.clinics enable row level security;
alter table public.profiles enable row level security;
alter table public.clinic_members enable row level security;
alter table public.patients enable row level security;
alter table public.appointments enable row level security;
alter table public.anamneses enable row level security;
alter table public.medical_records enable row level security;
alter table public.odontogram_events enable row level security;
alter table public.treatment_plans enable row level security;
alter table public.treatment_plan_items enable row level security;
alter table public.budgets enable row level security;
alter table public.budget_items enable row level security;
alter table public.accounts_receivable enable row level security;
alter table public.receivable_installments enable row level security;
alter table public.accounts_payable enable row level security;
alter table public.cash_sessions enable row level security;
alter table public.payments enable row level security;
alter table public.cash_movements enable row level security;
alter table public.audit_logs enable row level security;

create policy profiles_self_select on public.profiles for select to authenticated using (id = auth.uid());
create policy profiles_self_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy clinics_member_select on public.clinics for select to authenticated using (public.is_clinic_member(id));
create policy clinic_members_member_select on public.clinic_members for select to authenticated using (public.is_clinic_member(clinic_id));
create policy clinic_members_admin_write on public.clinic_members for all to authenticated using (public.has_clinic_role(clinic_id, array['admin']::public.user_role[])) with check (public.has_clinic_role(clinic_id, array['admin']::public.user_role[]));

-- Tabelas operacionais: membro lê; perfis permitidos escrevem.
do $$
declare t text;
begin
  foreach t in array array['patients','appointments','anamneses','medical_records','odontogram_events','treatment_plans','treatment_plan_items','budgets','budget_items']
  loop
    execute format('create policy %I_member_select on public.%I for select to authenticated using (public.is_clinic_member(clinic_id))', t, t);
    execute format('create policy %I_clinical_write on public.%I for all to authenticated using (public.has_clinic_role(clinic_id, array[''admin'',''recepcao'',''dentista'']::public.user_role[])) with check (public.has_clinic_role(clinic_id, array[''admin'',''recepcao'',''dentista'']::public.user_role[]))', t, t);
  end loop;
end $$;

-- Financeiro: recepção pode consultar contas a receber; alterações financeiras ficam limitadas.
create policy ar_member_select on public.accounts_receivable for select to authenticated using (public.is_clinic_member(clinic_id));
create policy installments_member_select on public.receivable_installments for select to authenticated using (public.is_clinic_member(clinic_id));
create policy ap_financial_select on public.accounts_payable for select to authenticated using (public.has_clinic_role(clinic_id, array['admin','financeiro','gestor']::public.user_role[]));

create policy ar_financial_write on public.accounts_receivable for all to authenticated using (public.has_clinic_role(clinic_id, array['admin','financeiro']::public.user_role[])) with check (public.has_clinic_role(clinic_id, array['admin','financeiro']::public.user_role[]));
create policy installments_financial_write on public.receivable_installments for all to authenticated using (public.has_clinic_role(clinic_id, array['admin','financeiro']::public.user_role[])) with check (public.has_clinic_role(clinic_id, array['admin','financeiro']::public.user_role[]));
create policy ap_financial_write on public.accounts_payable for all to authenticated using (public.has_clinic_role(clinic_id, array['admin','financeiro']::public.user_role[])) with check (public.has_clinic_role(clinic_id, array['admin','financeiro']::public.user_role[]));

create policy cash_select on public.cash_sessions for select to authenticated using (public.has_clinic_role(clinic_id, array['admin','recepcao','financeiro','gestor']::public.user_role[]));
create policy cash_write on public.cash_sessions for all to authenticated using (public.has_clinic_role(clinic_id, array['admin','recepcao','financeiro']::public.user_role[])) with check (public.has_clinic_role(clinic_id, array['admin','recepcao','financeiro']::public.user_role[]));
create policy payments_select on public.payments for select to authenticated using (public.has_clinic_role(clinic_id, array['admin','recepcao','financeiro','gestor']::public.user_role[]));
create policy payments_write on public.payments for all to authenticated using (public.has_clinic_role(clinic_id, array['admin','recepcao','financeiro']::public.user_role[])) with check (public.has_clinic_role(clinic_id, array['admin','recepcao','financeiro']::public.user_role[]));
create policy movements_select on public.cash_movements for select to authenticated using (public.has_clinic_role(clinic_id, array['admin','recepcao','financeiro','gestor']::public.user_role[]));
create policy movements_write on public.cash_movements for all to authenticated using (public.has_clinic_role(clinic_id, array['admin','recepcao','financeiro']::public.user_role[])) with check (public.has_clinic_role(clinic_id, array['admin','recepcao','financeiro']::public.user_role[]));

create policy audit_admin_select on public.audit_logs for select to authenticated using (public.has_clinic_role(clinic_id, array['admin','gestor']::public.user_role[]));

-- Bucket privado para exames, radiografias, termos e fotografias.
insert into storage.buckets (id, name, public)
values ('clinical-files', 'clinical-files', false)
on conflict (id) do nothing;

create policy clinical_files_member_read on storage.objects
for select to authenticated
using (
  bucket_id = 'clinical-files'
  and exists (
    select 1 from public.clinic_members cm
    where cm.user_id = auth.uid()
      and cm.active = true
      and cm.clinic_id::text = split_part(name, '/', 1)
  )
);

create policy clinical_files_member_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'clinical-files'
  and exists (
    select 1 from public.clinic_members cm
    where cm.user_id = auth.uid()
      and cm.active = true
      and cm.role in ('admin','recepcao','dentista')
      and cm.clinic_id::text = split_part(name, '/', 1)
  )
);

-- Observação: prontuários clínicos devem preferir correção/adendo em vez de exclusão física.
-- Antes de produção, implemente e teste triggers de auditoria específicos para entidades críticas.
