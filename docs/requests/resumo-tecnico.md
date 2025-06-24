Você é um engenheiro de software sênior com foco em documentação técnica.

Leia todo o repositório deste projeto e preencha **os arquivos dentro da pasta `/docs`**, com o conteúdo mais completo, técnico e estruturado possível. O projeto é um CRM Imobiliário para construtora, feito com Node.js, React, MongoDB, e possui funcionalidades como funil de vendas, contratos, gestão de leads, integrações com Google e Facebook, geração de propostas etc.

Siga a estrutura abaixo e escreva o conteúdo correspondente em cada arquivo:

---

### 🧠 `/docs/architecture/system-overview.md`
Explique de forma macro como o sistema funciona:
- Visão geral da arquitetura
- Comunicação entre frontend, backend e banco
- Fluxo dos dados
- Tecnologias utilizadas por camada
- Pontos de integração externa

---

### 📜 `/docs/architecture/decision-records.md`
Liste as principais decisões arquiteturais tomadas, como:
- Uso de MongoDB em vez de SQL
- Separação de camadas com Services/Controllers
- Escolha do padrão REST
- Autenticação via JWT
- Deploy separado (Railway + Vercel)

---

### 🚀 `/docs/guides/getting-started.md`
Tutorial para rodar o sistema localmente:
- Clonagem do repositório
- Instalação de dependências (Node, npm, .env)
- Como rodar frontend e backend
- Estrutura básica de ambiente (ex: `.env.example`)

---

### 🚀 `/docs/guides/deployment.md`
Explique como o deploy é feito:
- Onde o frontend e backend estão hospedados
- Como configurar o deploy automático (CI/CD)
- Gerenciamento de secrets
- Variáveis de ambiente e ambientes de staging/produção

---

### ⚙️ `/docs/how-to/create-proposta.md`
Passo a passo para criar uma proposta:
- Fluxo no frontend (wizard, steps, validações)
- Chamada ao backend (endpoint usado)
- Lógica de preenchimento de dados
- Geração de contrato e salvamento final

---

### ⚙️ `/docs/how-to/import-leads.md`
Guia de como importar leads:
- Upload de CSV
- Validações no frontend
- Processamento no backend
- Feedback de sucesso/erro

---

### 📚 `/docs/references/api-spec.md`
Documentação técnica dos endpoints:
- Endpoints principais (GET/POST/PUT/DELETE)
- Autenticação e headers
- Estrutura dos payloads
- Exemplos de request/response

---

### 🧩 `/docs/references/domain-model.md`
Explique os models do MongoDB usados:
- Lead, PropostaContrato, Reserva, Unidade, ImovelAvulso
- Campos, validações, relacionamentos
- Uso de tipos polimórficos
- Referências cruzadas (ex: unidade → empreendimento)

---

### 📌 `/docs/requests/resumo-tecnico.md`
Use o prompt original de resumo técnico para IA (já colado)

---

**Formato de saída**: preencha cada arquivo `.md` no padrão Markdown, com títulos e subtítulos claros.

**Objetivo final**: esta documentação será usada por IAs (ChatGPT Plus, Claude, etc) e novos devs no onboarding. Deve estar o mais completa, robusta e legível possível.

