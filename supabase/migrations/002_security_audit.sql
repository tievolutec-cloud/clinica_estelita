-- Clínica Estelita - endurecimento de permissões e auditoria
-- Execute após 001_initial_schema.sql.

-- 1) Recepção não deve escrever prontuário, anamnese, odontograma ou plano clínico.
do $$
declare t text;
begin
  foreach t in array array['patients','appointments','anamneses','medical_records','odontogram_events','treatment_plans','treatment_plan_items','budgets','budget_items']
  loop
    execute format('drop policy if exists %I_clinical_write on public.%I', t, t);
  end loop;
end $$;

create policy patients_operational_write on public.patients
for all to authenticated
using (public.has_clinic_role(clinic_id, array['admin','recepcao','dentista']::public.user_role[]))
with check (public.has_clinic_role(clinic_id, array['admin','recepcao','dentista']::public.user_role[]));

create policy appointments_operational_write on public.appointments
for all to authenticated
using (public.has_clinic_role(clinic_id, array['admin','recepcao','dentista']::public.user_role[]))
with check (public.has_clinic_role(clinic_id, array['admin','recepcao','dentista']::public.user_role[]));

create policy anamneses_clinical_write on public.anamneses
for all to authenticated
using (public.has_clinic_role(clinic_id, array['admin','dentista']::public.user_role[]))
with check (public.has_clinic_role(clinic_id, array['admin','dentista']::public.user_role[]));

create policy medical_records_clinical_write on public.medical_records
for all to authenticated
using (public.has_clinic_role(clinic_id, array['admin','dentista']::public.user_role[]))
with check (public.has_clinic_role(clinic_id, array['admin','dentista']::public.user_role[]));

create policy odontogram_clinical_write on public.odontogram_events
for all to authenticated
using (public.has_clinic_role(clinic_id, array['admin','dentista']::public.user_role[]))
with check (public.has_clinic_role(clinic_id, array['admin','dentista']::public.user_role[]));

create policy treatment_plans_clinical_write on public.treatment_plans
for all to authenticated
using (public.has_clinic_role(clinic_id, array['admin','dentista']::public.user_role[]))
with check (public.has_clinic_role(clinic_id, array['admin','dentista']::public.user_role[]));

create policy treatment_plan_items_clinical_write on public.treatment_plan_items
for all to authenticated
using (public.has_clinic_role(clinic_id, array['admin','dentista']::public.user_role[]))
with check (public.has_clinic_role(clinic_id, array['admin','dentista']::public.user_role[]));

create policy budgets_operational_write on public.budgets
for all to authenticated
using (public.has_clinic_role(clinic_id, array['admin','recepcao','dentista']::public.user_role[]))
with check (public.has_clinic_role(clinic_id, array['admin','recepcao','dentista']::public.user_role[]));

create policy budget_items_operational_write on public.budget_items
for all to authenticated
using (public.has_clinic_role(clinic_id, array['admin','recepcao','dentista']::public.user_role[]))
with check (public.has_clinic_role(clinic_id, array['admin','recepcao','dentista']::public.user_role[]));

-- 2) Prontuário não pode ser apagado fisicamente pela aplicação.
create or replace function public.prevent_medical_record_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'Prontuários não podem ser apagados. Registre correção ou adendo.';
end;
$$;

drop trigger if exists medical_records_prevent_delete on public.medical_records;
create trigger medical_records_prevent_delete
before delete on public.medical_records
for each row execute function public.prevent_medical_record_delete();

-- 3) Auditoria automática de alterações importantes.
create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_clinic_id uuid;
  v_entity_id text;
begin
  if TG_OP = 'DELETE' then
    v_clinic_id := old.clinic_id;
    v_entity_id := old.id::text;
    insert into public.audit_logs (clinic_id, user_id, action, entity, entity_id, old_data, new_data)
    values (v_clinic_id, auth.uid(), lower(TG_OP), TG_TABLE_NAME, v_entity_id, to_jsonb(old), null);
    return old;
  elsif TG_OP = 'UPDATE' then
    v_clinic_id := new.clinic_id;
    v_entity_id := new.id::text;
    insert into public.audit_logs (clinic_id, user_id, action, entity, entity_id, old_data, new_data)
    values (v_clinic_id, auth.uid(), lower(TG_OP), TG_TABLE_NAME, v_entity_id, to_jsonb(old), to_jsonb(new));
    return new;
  else
    v_clinic_id := new.clinic_id;
    v_entity_id := new.id::text;
    insert into public.audit_logs (clinic_id, user_id, action, entity, entity_id, old_data, new_data)
    values (v_clinic_id, auth.uid(), lower(TG_OP), TG_TABLE_NAME, v_entity_id, null, to_jsonb(new));
    return new;
  end if;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'patients','appointments','anamneses','medical_records','odontogram_events',
    'treatment_plans','treatment_plan_items','budgets','budget_items',
    'accounts_receivable','receivable_installments','accounts_payable',
    'cash_sessions','payments','cash_movements'
  ]
  loop
    execute format('drop trigger if exists %I_audit on public.%I', t, t);
    execute format('create trigger %I_audit after insert or update or delete on public.%I for each row execute function public.audit_row_change()', t, t);
  end loop;
end $$;

-- 4) Índices adicionais para consultas frequentes.
create index if not exists patients_clinic_phone_idx on public.patients(clinic_id, phone);
create index if not exists appointments_patient_idx on public.appointments(clinic_id, patient_id, starts_at desc);
create index if not exists budgets_patient_idx on public.budgets(clinic_id, patient_id, created_at desc);
create index if not exists accounts_receivable_patient_idx on public.accounts_receivable(clinic_id, patient_id, created_at desc);
