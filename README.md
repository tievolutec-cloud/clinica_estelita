# Clínica Estelita — Sistema Odontológico

Sistema web próprio para gestão odontológica, construído com Next.js + Supabase e preparado para deploy automático na Vercel.

> **Importante:** sem variáveis do Supabase o sistema abre em modo demonstração. Quando o Supabase é configurado, o acesso passa a exigir login e pacientes/agenda usam o banco real.

## O que já está funcionando

- Interface responsiva
- Dashboard demonstrativo
- Login real com e-mail e senha via Supabase Auth
- Proteção de rotas no Next.js 16
- Identificação da clínica e perfil do usuário
- Cadastro real de pacientes no PostgreSQL
- Busca de pacientes
- Agenda real persistida no PostgreSQL
- Logout
- Banco multi-clínica
- Row Level Security (RLS)
- Perfis: admin, recepção, dentista, financeiro e gestor
- Storage privado preparado para documentos clínicos
- Auditoria automática das entidades críticas na migração 002
- Bloqueio de exclusão física de prontuários na migração 002
- CI do GitHub validando TypeScript e build de produção
- Deploy automático Vercel conectado ao branch `main`

## Arquitetura

- Frontend/backend web: **Next.js 16 + TypeScript**
- Hospedagem: **Vercel**
- Banco: **PostgreSQL no Supabase**
- Login: **Supabase Auth**
- Arquivos: **Supabase Storage privado**
- Segurança: **RLS + perfis + auditoria**
- Código: **GitHub**

---

# 1. Criar o projeto Supabase

1. Entre no painel do Supabase.
2. Clique em **New project**.
3. Nome sugerido: `clinica-estelita-prod`.
4. Crie e guarde uma senha forte do banco.
5. Escolha a região adequada para a clínica e seus requisitos de proteção de dados.
6. Conclua a criação.

## Executar as migrações

No Supabase abra **SQL Editor > New query**.

Execute os arquivos nesta ordem:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_security_audit.sql`

O primeiro cria tabelas, tipos, índices, RLS e Storage. O segundo endurece permissões clínicas, impede exclusão física de prontuário e ativa auditoria automática.

---

# 2. Criar o primeiro administrador

1. Supabase > **Authentication > Users**.
2. **Add user > Create new user**.
3. Informe o e-mail do administrador e uma senha forte.
4. Confirme o e-mail somente se você controlar o endereço.

Depois, no **SQL Editor**, troque o e-mail abaixo e execute:

```sql
with new_clinic as (
  insert into public.clinics (name)
  values ('Clínica Estelita')
  returning id
)
insert into public.clinic_members (clinic_id, user_id, role)
select nc.id, u.id, 'admin'::public.user_role
from new_clinic nc
join auth.users u on lower(u.email) = lower('SEU_EMAIL@EXEMPLO.COM');
```

Confirme em **Table Editor > clinic_members** que existe um vínculo com `role = admin`.

---

# 3. Conectar Supabase à Vercel

No Supabase, copie:

- Project URL
- Publishable key pública (ou `anon` pública nos projetos que ainda exibem o formato antigo)

Nunca use `service_role` em variável `NEXT_PUBLIC_*`.

Na Vercel abra:

**Projeto > Settings > Environment Variables**

Crie:

```text
NEXT_PUBLIC_SUPABASE_URL
```

E preferencialmente:

```text
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

Se o painel do seu projeto ainda usar chave `anon`, também há compatibilidade com:

```text
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Opcional:

```text
NEXT_PUBLIC_APP_URL
```

Depois salve e faça um novo deploy. Assim que as duas variáveis obrigatórias existirem, `/` passa a exigir login.

---

# 4. Fluxo atual conectado

Depois de configurar Supabase e entrar:

1. O servidor valida o usuário.
2. Busca o vínculo do usuário em `clinic_members`.
3. Descobre qual clínica e qual perfil podem ser usados.
4. O banco aplica RLS.
5. A tela carrega pacientes reais.
6. Novo paciente grava no PostgreSQL.
7. A agenda lê e grava agendamentos reais.
8. Auditoria registra alterações nas entidades protegidas após executar a migração 002.

Sem vínculo em `clinic_members`, o sistema bloqueia o uso operacional e informa que o usuário ainda não pertence a uma clínica.

---

# 5. Estrutura principal do banco

- `clinics`
- `profiles`
- `clinic_members`
- `patients`
- `appointments`
- `anamneses`
- `medical_records`
- `odontogram_events`
- `treatment_plans`
- `treatment_plan_items`
- `budgets`
- `budget_items`
- `accounts_receivable`
- `receivable_installments`
- `accounts_payable`
- `cash_sessions`
- `payments`
- `cash_movements`
- `audit_logs`

---

# 6. Perfis

- `admin`: administração completa
- `recepcao`: pacientes, agenda e operações autorizadas
- `dentista`: prontuário, anamnese, odontograma e tratamentos
- `financeiro`: financeiro e caixa
- `gestor`: consultas e relatórios

A migração 002 corrige uma permissão importante da versão inicial: **recepção não pode escrever prontuário, anamnese, odontograma ou plano clínico**.

---

# 7. Segurança antes de pacientes reais

Antes de inserir dados reais de saúde:

- execute as duas migrações;
- teste cada perfil com contas separadas;
- confirme que clínica A não acessa clínica B;
- teste auditoria;
- teste que prontuários não podem ser apagados;
- configure backup do PostgreSQL;
- configure backup separado do Storage;
- teste restauração;
- configure MFA para perfis administrativos quando o fluxo estiver definido;
- configure e-mail transacional;
- revise política de privacidade, retenção e procedimentos LGPD;
- mantenha chaves secretas fora do GitHub.

Dados odontológicos podem conter dados pessoais sensíveis de saúde. Estar publicado na Vercel não significa, sozinho, estar pronto para produção clínica.

---

# 8. Próximas entregas de desenvolvimento

Ordem planejada:

1. Prontuário/anamnese reais
2. Odontograma persistente
3. Plano de tratamento e orçamento
4. Contas a receber e parcelamento
5. Pagamentos e caixa
6. Contas a pagar
7. Relatórios reais
8. Upload de arquivos clínicos
9. Administração de usuários/permissões pela interface
10. Recuperação de senha, MFA e reforços finais

---

## Validação automática

O arquivo `.github/workflows/ci.yml` executa a cada alteração:

- instalação das dependências;
- verificação TypeScript;
- build de produção Next.js.

A Vercel continua fazendo o deploy automaticamente a partir do branch `main`.
