# Clínica Estelita — Sistema Odontológico V1

Sistema web próprio para gestão de clínica odontológica, construído com Next.js + Supabase e preparado para deploy na Vercel.

> **Importante:** a tela inicial está em modo demonstração com dados fictícios. Não use dados reais de pacientes antes de concluir Supabase, autenticação, RLS, auditoria, backups e testes de permissão.

## O que já existe nesta V1

- Dashboard da clínica
- Agenda diária
- Cadastro e busca de pacientes
- Ficha do paciente em abas
- Prontuário
- Odontograma
- Plano de tratamento
- Orçamentos
- Financeiro separado do caixa
- Contas a receber / pagar (estrutura de banco)
- Caixa e movimentações
- Relatórios gerenciais
- Usuários e perfis (estrutura de banco)
- Login com e-mail e senha via Supabase Auth
- Banco PostgreSQL completo
- Row Level Security (RLS) por clínica
- Storage privado preparado para documentos clínicos
- Estrutura de auditoria
- Layout responsivo para computador, tablet e celular

## Arquitetura

- Frontend e backend web: **Next.js**
- Hospedagem: **Vercel**
- Banco: **PostgreSQL no Supabase**
- Login: **Supabase Auth**
- Arquivos: **Supabase Storage**
- Segurança de dados: **RLS + perfis de acesso**
- Código: **GitHub**

---

# 1. Ver a interface na Vercel agora

A interface demonstrativa funciona sem Supabase.

1. Entre em https://vercel.com
2. Clique em **Add New > Project**.
3. Escolha o GitHub conectado.
4. Selecione o repositório `tievolutec-cloud/clinica_estelita`.
5. Framework Preset deve aparecer como **Next.js**.
6. Não precisa adicionar variáveis ainda para ver a demonstração.
7. Clique em **Deploy**.
8. Ao terminar, clique em **Visit**.

A tela inicial exibirá somente dados fictícios mantidos no navegador.

---

# 2. Criar o projeto Supabase

1. Entre em https://supabase.com/dashboard
2. Clique em **New project**.
3. Escolha sua organização.
4. Nome sugerido: `clinica-estelita-prod`.
5. Crie uma senha forte para o banco e guarde em gerenciador de senhas.
6. Escolha a região mais adequada para a operação e requisitos de proteção de dados da clínica.
7. Clique em **Create new project**.

## Criar as tabelas e regras

1. No Supabase, abra **SQL Editor**.
2. Clique em **New query**.
3. No GitHub, abra `supabase/migrations/001_initial_schema.sql`.
4. Copie todo o conteúdo.
5. Cole no SQL Editor.
6. Clique em **Run**.
7. Confirme que não houve erro.

Esse arquivo cria as tabelas, tipos, índices, Storage e regras RLS iniciais.

---

# 3. Criar o primeiro usuário administrador

1. No Supabase, abra **Authentication > Users**.
2. Clique em **Add user > Create new user**.
3. Informe o e-mail do administrador.
4. Use uma senha forte com pelo menos 12 caracteres.
5. Marque o e-mail como confirmado apenas se você controlar esse endereço.
6. Clique em **Create user**.

Depois abra **SQL Editor**, crie uma nova query e execute o modelo abaixo, trocando `SEU_EMAIL@EXEMPLO.COM` pelo e-mail realmente criado:

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

Depois confirme em **Table Editor > clinic_members** que existe uma linha com o perfil `admin`.

---

# 4. Conectar Supabase à Vercel

No Supabase:

1. Abra **Project Settings**.
2. Abra a área de API/Keys do projeto.
3. Copie a **Project URL**.
4. Copie somente a chave pública indicada para uso no cliente (`anon` / publishable, conforme exibida no painel atual).
5. **Nunca coloque `service_role` no navegador, GitHub ou variável `NEXT_PUBLIC_*`.**

Na Vercel:

1. Abra o projeto `clinica_estelita`.
2. Entre em **Settings > Environment Variables**.
3. Crie:

```text
NEXT_PUBLIC_SUPABASE_URL
```

Valor: Project URL do Supabase.

4. Crie:

```text
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Valor: chave pública do projeto.

5. Opcionalmente crie:

```text
NEXT_PUBLIC_APP_URL
```

com a URL final da Vercel/domínio.

6. Salve.
7. Abra **Deployments**.
8. Faça **Redeploy** do último deploy para carregar as novas variáveis.

A rota `/login` já está preparada para autenticar pelo Supabase.

---

# 5. Antes de colocar pacientes reais

Não considere esta V1 pronta para produção clínica só porque está online. Antes de inserir informações reais de saúde, faça obrigatoriamente:

- Validar cada perfil: Administrador, Recepção, Dentista, Financeiro e Gestor.
- Testar que uma clínica não acessa dados de outra clínica.
- Criar auditoria automática para alterações críticas de prontuário e financeiro.
- Definir política para correção/adendo de prontuários sem apagar histórico clínico.
- Configurar backup do PostgreSQL.
- Configurar backup separado dos objetos do Supabase Storage.
- Testar restauração de backup.
- Definir política de privacidade, bases legais, retenção e direitos dos titulares conforme LGPD.
- Revisar transferência/localização de dados com responsável jurídico/LGPD quando aplicável.
- Ativar MFA para administradores assim que o fluxo escolhido estiver definido.
- Configurar domínio, HTTPS e e-mail transacional.
- Realizar testes com dados fictícios primeiro.

---

# 6. Estrutura principal do banco

O arquivo `supabase/migrations/001_initial_schema.sql` cria:

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

Os registros operacionais possuem `clinic_id` para permitir isolamento entre clínicas/unidades.

---

# 7. Perfis previstos

- `admin`: controle administrativo completo
- `recepcao`: agenda, pacientes e operações autorizadas de recepção
- `dentista`: informações clínicas e atendimento
- `financeiro`: financeiro e caixa
- `gestor`: consultas gerenciais e relatórios

As regras precisam ser revisadas com o funcionamento real da Clínica Estelita antes da produção.

---

# 8. Próxima etapa de desenvolvimento

A interface desta versão já permite avaliar o fluxo visual. A próxima etapa técnica é substituir gradualmente os dados demonstrativos pelos dados reais do Supabase, começando nesta ordem:

1. Sessão/login obrigatório
2. Clínica e usuário logado
3. Pacientes
4. Agenda
5. Prontuário/anamnese
6. Odontograma
7. Tratamentos e orçamentos
8. Contas a receber
9. Pagamentos e caixa
10. Contas a pagar
11. Relatórios
12. Arquivos clínicos
13. Auditoria completa

Essa ordem mantém o sistema utilizável em cada etapa e facilita testes de segurança.

---

## Segurança

Este projeto não armazena senhas em texto puro. A autenticação foi projetada para usar Supabase Auth. Chaves reais devem existir somente nas configurações seguras do ambiente e nunca ser commitadas no GitHub.

Dados odontológicos podem conter dados pessoais sensíveis de saúde. A entrada em produção deve ocorrer somente depois dos testes técnicos, operacionais e de conformidade correspondentes.
