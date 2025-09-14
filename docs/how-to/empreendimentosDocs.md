# Módulo: Empreendimentos & Unidades (CRM)

Gestão de **Empreendimentos** e suas **Unidades** com backend Node/Express + Mongoose e frontend React. Inclui CRUD completo, paginação, filtros, virtual de contagem de unidades e regras de negócio para ativação/desativação.

---

## Sumário
- [Visão Geral](#visão-geral)
- [Arquitetura](#arquitetura)
- [Backend](#backend)
  - [Models](#models)
  - [Services](#services)
  - [Controllers](#controllers)
  - [Routes](#routes)
  - [Configurações extras](#configurações-extras)
- [Frontend](#frontend)
  - [Camada de API](#camada-de-api)
  - [Páginas e componentes](#páginas-e-componentes)
  - [Hooks, estados, props](#hooks-estados-props)
  - [CSS](#css)
- [Fluxos](#fluxos)
- [Evoluções Futuras](#evoluções-futuras)
- [FAQ / Solução de Problemas](#faq--solução-de-problemas)
- [Checklist de Integração](#checklist-de-integração)
- [Changelog](#changelog)

---

## Visão Geral
O módulo permite às empresas (multi-tenant) cadastrar **Empreendimentos** (ex.: condomínios, loteamentos) e **Unidades** (ex.: apartamentos, lotes), com controle de status, preços, localização e vitrine (destaque). O backend aplica validações, índices únicos por empresa e **soft delete**. O frontend oferece telas de **lista**, **detalhe** (com abas) e **formulários** de criação/edição.

### Diagrama (alto nível)
```mermaid
flowchart LR
  UI[React Pages] --> AX[axiosInstance (/api)]
  AX --> RT[Express Router]
  RT --> CT[Controllers]
  CT --> SV[Services]
  SV --> MD[(Mongoose Models)]
  MD --> DB[(MongoDB)]
```

---

## Arquitetura
```
backend/
  controllers/
    empreendimentoController.js
    unidadeController.js
  models/
    Empreendimento.js
    Unidade.js
  routes/
    empreendimentoRoutes.js
    unidadeRoutes.js
  services/
    empreendimentoService.js
    unidadeService.js
  middlewares/
    authMiddleware.js           // TODO: confirmar implementação
    asyncHandler.js             // TODO: confirmar implementação
  utils/
    errorResponse.js            // TODO: confirmar implementação

frontend/src/
  api/
    axiosInstance.js            // TODO: confirmar baseURL/interceptors
    empreendimentoApi.js
    unidadeApi.js
  pages/Empreendimento/
    EmpreendimentoListPage/
      EmpreendimentoListPage.js
      EmpreendimentoListPage.css
    EmpreendimentoFormPage/
      EmpreendimentoFormPage.js
      EmpreendimentoFormPage.css
    EmpreendimentoDetailPage/
      EmpreendimentoDetailPage.js
      EmpreendimentoDetailPage.css
      UnidadeList.js
      UnidadeList.css
    UnidadeFormPage/
      UnidadeFormPage.js
      UnidadeFormPage.css
```

---

## Backend

### Models

#### Empreendimento.js
- **Campos**
  - `nome` *(String, required, trim, index)* — **único por empresa**
  - `construtoraIncorporadora` *(String, trim)*
  - `localizacao` *(subdoc)*
    - `logradouro` *(String)*, `numero` *(String)*, `bairro` *(String)*
    - `cidade` *(String, required)*, `uf` *(String, required, 2 letras, uppercase)*
    - `cep` *(String)*, `latitude` *(String)*, `longitude` *(String)*
  - `tipo` *(String, required, enum)*: `Residencial Vertical` | `Residencial Horizontal` | `Loteamento` | `Comercial`
  - `statusEmpreendimento` *(String, required, enum, default: Em Planejamento)*: `Em Planejamento` | `Breve Lançamento` | `Lançamento` | `Em Obras` | `Pronto para Morar` | `Concluído`
  - `descricao` *(String, trim)*
  - `imagemPrincipal` *(subdoc)*: `url`, `thumbnailUrl`, `altText`
  - `dataPrevistaEntrega` *(Date)*
  - `company` *(ObjectId → Company, required, index)*
  - `ativo` *(Boolean, default: true)*
  - **timestamps** e **virtuals** habilitados em `toJSON`/`toObject`
- **Índices**
  - Único: `{ nome: 1, company: 1 }`
- **Virtuals**
  - `totalUnidades` *(ref: Unidade, localField: _id, foreignField: empreendimento, count: true)*

#### Unidade.js
- **Campos**
  - `empreendimento` *(ObjectId → Empreendimento, required, index)*
  - `identificador` *(String, required, trim)* — **único por empreendimento**
  - `tipologia` *(String, trim)*
  - `areaUtil` *(Number, min 0)*, `areaTotal` *(Number, min 0)*
  - `precoTabela` *(Number, min 0)*
  - `statusUnidade` *(String, required, enum, default: Disponível)*: `Disponível` | `Reservada` | `Proposta` | `Vendido` | `Bloqueado`
  - `descricao` *(String, trim)*
  - `destaque` *(Boolean, default: false)*
  - `company` *(ObjectId → Company, required, index)* → **é herdado do Empreendimento** no `pre('save')`
  - `ativo` *(Boolean, default: true)*
  - `currentLeadId` *(ObjectId → Lead, optional, index, sparse)*
  - `currentReservaId` *(ObjectId → Reserva, optional, unique, sparse)*
  - **timestamps**
- **Índices**
  - Único: `{ empreendimento: 1, identificador: 1 }`
- **Hooks**
  - `pre('save')`: carrega `company` a partir do Empreendimento pai.
- **Observações**
  - **Atenção**: há **duplicidade de definição** de `currentLeadId` e `currentReservaId` no schema. Recomenda-se manter **uma única definição** por campo para evitar comportamentos inesperados. // TODO: confirmar intenção

### Services

#### empreendimentoService.js
- `createEmpreendimento(empreendimentoData, companyId)`
  - Valida `companyId` e campos obrigatórios (nome, tipo, status, localização.cidade/uf)
  - Persiste com `ativo: true`
  - Trata erro `11000` (índice único por empresa)
- `getEmpreendimentosByCompany(companyId, filters, { page, limit })`
  - Query `{ company, ativo: true, ...filters }`
  - Paginação (`skip/limit`), ordenação por `nome`
  - `populate('totalUnidades')` com `lean({ virtuals: true })`
  - Retorna `{ empreendimentos, total, page, pages }`
- `getEmpreendimentoByIdAndCompany(empreendimentoId, companyId)`
  - Filtra por empresa e `ativo: true`, popula `totalUnidades`
- `updateEmpreendimento(empreendimentoId, updateData, companyId)`
  - Bloqueia `company`, `ativo`, `_id`
  - Checa duplicidade de `nome` dentro da empresa
  - `findOneAndUpdate` com `{ new: true, runValidators: true }`
- `deleteEmpreendimento(empreendimentoId, companyId)`
  - **Regra**: impede desativar se existir **unidade ativa** com `statusUnidade != 'Vendido'`
  - Marca `ativo: false` no empreendimento e **desativa** todas as suas unidades

#### unidadeService.js
- `createUnidade(unidadeData, empreendimentoId, companyId)`
  - Valida IDs
  - Garante empreendimento **pertencente** à empresa e **ativo**
  - Define `company` pela herança do empreendimento
  - Trata erro `11000` (identificador único por empreendimento)
- `getUnidadesByEmpreendimento(empreendimentoId, companyId, filters, { page, limit })`
  - Valida IDs, confirma empreendimento da empresa
  - Query `{ empreendimento, company, ativo: true, ...filters }`
  - Paginação, ordenação por `identificador`
  - Retorno `{ unidades, total, page, pages }`
- `getUnidadeById(unidadeId, empreendimentoId, companyId)`
  - Busca uma unidade ativa por ID, empreendimento e empresa
- `updateUnidade(unidadeId, updateData, empreendimentoId, companyId)`
  - Bloqueia `empreendimento`, `company`, `ativo`, `currentLeadId`, `currentReservaId`, `_id`
  - Se mudar `identificador`, verifica duplicidade no mesmo empreendimento
  - `findOneAndUpdate` com `{ new: true, runValidators: true }`
- `deleteUnidade(unidadeId, empreendimentoId, companyId)`
  - Impede desativar se `statusUnidade` ∈ **[Reservada, Proposta Aceita, Vendido]**  
    **Obs.:** `Proposta Aceita` **não existe** no enum do Model. // TODO: alinhar status entre Model/Service/Frontend
  - Marca `ativo: false`

### Controllers

#### empreendimentoController.js
- **POST** `/api/empreendimentos`
  - Lê `companyId` de `req.user.company` (via `protect`)
  - Valida campos mínimos e delega ao `service.createEmpreendimento`
- **GET** `/api/empreendimentos`
  - Suporta `?page&limit&...filters`
  - Delega a `service.getEmpreendimentosByCompany`
- **GET** `/api/empreendimentos/:id`
  - Busca por empresa + ativo; 404 se inexistente
- **PUT** `/api/empreendimentos/:id`
  - Atualiza via service (com validações)
- **DELETE** `/api/empreendimentos/:id`
  - Soft delete com regra de unidades

#### unidadeController.js
- **POST** `/api/empreendimentos/:empreendimentoId/unidades`
- **GET** `/api/empreendimentos/:empreendimentoId/unidades`
- **GET** `/api/empreendimentos/:empreendimentoId/unidades/:unidadeId`
- **PUT** `/api/empreendimentos/:empreendimentoId/unidades/:unidadeId`
- **DELETE** `/api/empreendimentos/:empreendimentoId/unidades/:unidadeId`

### Routes

**Prefixo sugerido do app:** `/api`

#### Empreendimentos
| Método | Caminho | Query | Body (JSON) | Resposta |
|---|---|---|---|---|
| POST | `/api/empreendimentos` | — | `{ nome, tipo, statusEmpreendimento, localizacao: { cidade, uf }, ... }` | `201 { success, data: Empreendimento }` |
| GET | `/api/empreendimentos` | `page, limit, ...filters` | — | `200 { success, empreendimentos[], total, page, pages }` |
| GET | `/api/empreendimentos/:id` | — | — | `200 { success, data: Empreendimento }` ou `404` |
| PUT | `/api/empreendimentos/:id` | — | `campos editáveis` | `200 { success, data }` |
| DELETE | `/api/empreendimentos/:id` | — | — | `200 { success, data: { message } }` |

**cURL**
```bash
# Criar Empreendimento
curl -X POST "$API_BASE/api/empreendimentos" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{
    "nome": "Residencial Sol",
    "tipo": "Residencial Vertical",
    "statusEmpreendimento": "Lançamento",
    "localizacao": { "cidade": "Fortaleza", "uf": "CE" }
  }'

# Listar (página 1, 10 itens)
curl -G "$API_BASE/api/empreendimentos" \
  -H "Authorization: Bearer $TOKEN" \
  --data-urlencode "page=1" --data-urlencode "limit=10"

# Buscar por ID
curl -H "Authorization: Bearer $TOKEN" "$API_BASE/api/empreendimentos/$ID"

# Atualizar
curl -X PUT "$API_BASE/api/empreendimentos/$ID" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{ "statusEmpreendimento": "Em Obras" }'

# Desativar (soft delete)
curl -X DELETE -H "Authorization: Bearer $TOKEN" "$API_BASE/api/empreendimentos/$ID"
```

#### Unidades (aninhado a um Empreendimento)
| Método | Caminho | Query | Body (JSON) | Resposta |
|---|---|---|---|---|
| POST | `/api/empreendimentos/:empreendimentoId/unidades` | — | `{ identificador, tipologia?, areaUtil?, areaTotal?, precoTabela?, statusUnidade?, descricao?, destaque? }` | `201 { success, data: Unidade }` |
| GET | `/api/empreendimentos/:empreendimentoId/unidades` | `page, limit, ...filters` | — | `200 { success, unidades[], total, page, pages }` |
| GET | `/api/empreendimentos/:empreendimentoId/unidades/:unidadeId` | — | — | `200 { success, data: Unidade }` |
| PUT | `/api/empreendimentos/:empreendimentoId/unidades/:unidadeId` | — | `campos editáveis` | `200 { success, data }` |
| DELETE | `/api/empreendimentos/:empreendimentoId/unidades/:unidadeId` | — | — | `200 { success, data: { message } }` |

**cURL**
```bash
# Criar Unidade
curl -X POST "$API_BASE/api/empreendimentos/$EMP_ID/unidades" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{
    "identificador": "Apto 101",
    "tipologia": "2Q com suíte",
    "areaUtil": 55.0,
    "precoTabela": 350000,
    "statusUnidade": "Disponível"
  }'

# Listar Unidades
curl -G "$API_BASE/api/empreendimentos/$EMP_ID/unidades" \
  -H "Authorization: Bearer $TOKEN" \
  --data-urlencode "page=1" --data-urlencode "limit=100"

# Atualizar Unidade
curl -X PUT "$API_BASE/api/empreendimentos/$EMP_ID/unidades/$UN_ID" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{ "precoTabela": 365000 }'

# Desativar Unidade
curl -X DELETE -H "Authorization: Bearer $TOKEN" "$API_BASE/api/empreendimentos/$EMP_ID/unidades/$UN_ID"
```

### Configurações extras
- **Autenticação/Autorização**: middleware `protect` exige usuário autenticado e injeta `req.user.company` para escopo multi-tenant.
- **Tratamento de Erros**: `asyncHandler` encapsula controllers; `ErrorResponse` padroniza mensagens/HTTP status.
- **Validações**: Mongoose (enums, required, índices únicos) + validações manuais nos services/controllers.

---

## Frontend

### Camada de API

#### `src/api/empreendimentoApi.js`
- `getEmpreendimentos(page=1, limit=10, filters={})` → `GET /empreendimentos`
- `getEmpreendimentoById(id)` → `GET /empreendimentos/:id`
- `createEmpreendimento(data)` → `POST /empreendimentos`
- `updateEmpreendimento(id, data)` → `PUT /empreendimentos/:id`
- `deleteEmpreendimento(id)` → `DELETE /empreendimentos/:id`

#### `src/api/unidadeApi.js`
- `getUnidades(empreendimentoId, page=1, limit=10, filters={})` → `GET /empreendimentos/:id/unidades`
- `getUnidadeByIdApi(empreendimentoId, unidadeId)` → `GET /:id/unidades/:unidadeId`
- `createUnidadeApi(empreendimentoId, data)` → `POST /:id/unidades`
- `updateUnidadeApi(empreendimentoId, unidadeId, data)` → `PUT /:id/unidades/:unidadeId`
- `deleteUnidadeApi(empreendimentoId, unidadeId)` → `DELETE /:id/unidades/:unidadeId`

> **Observação**: ambas as APIs dependem de `axiosInstance` (headers de auth, `baseURL`). // TODO: confirmar configuração

### Páginas e componentes

#### EmpreendimentoListPage
- Lista paginada de empreendimentos (itens por página: 10/20/50)
- Exibe `totalUnidades` (virtual populado no backend)
- Ações: **Detalhes** | **Editar** | **Novo Empreendimento**

#### EmpreendimentoDetailPage
- Abas: **Detalhes** e **Unidades**
- Mostra dados do empreendimento (inclui imagem, localização e `totalUnidades`)
- Renderiza `<UnidadeList />` na aba **Unidades**

#### EmpreendimentoFormPage
- **Criação/Edição** de empreendimento
- Valida: `nome`, `tipo`, `statusEmpreendimento`, `localizacao.cidade`, `localizacao.uf`
- Converte `dataPrevistaEntrega` para `YYYY-MM-DD` no modo edição

#### UnidadeList (componente)
- Lista paginada de unidades do empreendimento
- Botão **+ Adicionar Unidade** → navega para `UnidadeFormPage`

#### UnidadeFormPage
- **Criação/Edição** de unidade
- Valida: `identificador`, `statusUnidade`
- Converte inputs numéricos para `Number` antes de enviar
- **Status exibidos**: `Disponível`, `Reservada`, `Proposta Aceita`, `Vendido`, `Bloqueado`  
  **Atenção**: divergente do **Model** (não há `Proposta Aceita`). // TODO: alinhar

### Hooks, estados, props
- **Estados**: `loading`, `error`, paginação (`page`, `limit`, `totalPages`, `total`), `formData`, `activeTab`
- **Props** relevantes:
  - `UnidadeList({ empreendimentoId, empreendimentoNome })`
- **Padrões de UX**: shells com rolagem interna para tabelas; barra de paginação fixa; toasts de sucesso/erro.

### CSS
- Arquivos CSS específicos por página/componente (`*.css`).  
  // TODO: confirmar tokens de design (cores, espaçamentos) e padrões de responsividade.

---

## Fluxos

### 1) Criar Empreendimento
1. Usuário acessa **Novo Empreendimento**
2. Preenche campos obrigatórios
3. Frontend `POST /empreendimentos` via `createEmpreendimento`
4. Backend valida → persiste → retorna `201`
5. UI exibe toast de sucesso e navega para lista

### 2) Editar Empreendimento
1. Usuário abre **Editar**
2. Frontend carrega dados via `getEmpreendimentoById`
3. Ao salvar, `PUT /empreendimentos/:id` → atualiza

### 3) Visualizar Detalhes & Unidades
1. `GET /empreendimentos/:id` para dados + `totalUnidades`
2. Na aba **Unidades**, `<UnidadeList>` chama `GET /:id/unidades` paginado

### 4) Criar/Editar Unidade
1. Botão **+ Adicionar Unidade**
2. Formulário valida obrigatórios e normaliza numéricos
3. `POST /:empId/unidades` (ou `PUT /:empId/unidades/:unId`)
4. Em sucesso, navega de volta para **Detalhes do Empreendimento**

### 5) Desativar Empreendimento
1. `DELETE /empreendimentos/:id`
2. Service verifica **se há unidades ativas não vendidas**
3. Em sucesso, marca `ativo: false` e desativa unidades filhas

### 6) Desativar Unidade
1. `DELETE /:empId/unidades/:unId`
2. Service **impede** se status ∈ [Reservada, Proposta Aceita, Vendido]

---

## Evoluções Futuras
- Unificar **enum de status** entre Model, Service e UI (incluir `Proposta Aceita` oficialmente **ou** padronizar como `Proposta`).
- Corrigir **duplicidades** de campos no `Unidade.js`.
- Filtros avançados (por cidade/UF, tipo, faixa de preço, status) e **ordenação** customizável.
- Upload de imagens (S3/Cloudinary) e geração de `thumbnailUrl` no backend.
- Integração de mapa (ex.: Leaflet/Mapbox) usando `latitude/longitude`.
- Soft delete com **motivo** e **auditoria** (quem desativou, quando, por quê).
- Inclusão de **reservas/propostas** com histórico por unidade.
- Caching de listas e **infinite scroll** opcional no frontend.

---

## FAQ / Solução de Problemas
- **Erro 11000 (duplicidade) ao criar Empreendimento**
  - Já existe `nome` igual **na mesma empresa**. Altere o nome ou confirme o `companyId` do usuário.
- **Erro ao desativar Empreendimento**
  - Existem unidades ativas com status diferente de `Vendido`. Desative/unifique os status antes.
- **Status `Proposta Aceita` não salvo**
  - O enum do **Model** não inclui esse valor. Padronize antes (ver *Evoluções Futuras*).
- **`totalUnidades` não aparece**
  - Verifique `populate('totalUnidades')` + `lean({ virtuals: true })` no service e se há unidades associadas.
- **401/403 nas chamadas**
  - Confirme `Authorization: Bearer <token>` e configuração do `axiosInstance`.
- **Campos `currentLeadId`/`currentReservaId` instáveis**
  - Há definições duplicadas no schema; unificar a definição.

---

## Checklist de Integração
- [ ] Configurar `axiosInstance.baseURL` e interceptor de `Authorization` (JWT).
- [ ] Garantir `protect` ativo nas rotas e que `req.user.company` é populado.
- [ ] Executar `npm run dev`/`start` com variáveis de ambiente corretas (DB_URI, JWT_SECRET, etc.). // TODO: confirmar .env
- [ ] Rodar **índices** do Mongoose (ou `db.collection.createIndex`) para `{ nome, company }` e `{ empreendimento, identificador }`.
- [ ] Validar CORS conforme origem do frontend.
- [ ] Testar cURL dos principais endpoints (CRUD Empreendimentos/Unidades).
- [ ] Revisar e alinhar **status** de Unidade entre backend e frontend.
- [ ] Remover **duplicação** de campos no `Unidade.js`.

---

## Changelog
- **14/09/2025** — v1.0  
  Documentação inicial do módulo **Empreendimentos & Unidades**, incluindo arquitetura, endpoints, fluxos e pendências identificadas.

