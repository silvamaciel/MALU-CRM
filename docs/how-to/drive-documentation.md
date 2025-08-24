
# Drive (Google Drive-like) — Upload, Pastas, Preview

Este README documenta a funcionalidade de Drive do CRM (estilo Google Drive/Dropbox): **upload com metadados**, **pastas por associação**, **subpastas**, **listagem com filtros**, **preview inline** e **exclusão**.

---

## Sumário
- [Visão Geral](#visão-geral)
- [Arquitetura](#arquitetura)
- [Backend](#backend)
  - [Model `Arquivo`](#model-arquivo)
  - [Service](#service)
  - [Controllers](#controllers)
  - [Rotas](#rotas)
  - [Config S3/Spaces (upload)](#config-s3spaces-upload)
  - [Exemplos de uso (cURL)](#exemplos-de-uso-curl)
- [Frontend](#frontend)
  - [Camada de API (`src/api/fileApi.js`)](#camada-de-api-srcapifileapijs)
  - [Página e Componentes](#página-e-componentes)
  - [CSS](#css)
- [Fluxos](#fluxos)
  - [Upload com Metadados](#upload-com-metadados)
  - [Navegação em Pastas](#navegação-em-pastas)
  - [Preview Inline](#preview-inline)
- [Evoluções Futuras](#evoluções-futuras)
- [Solução de Problemas (FAQ)](#solução-de-problemas-faq)
- [Checklist de Integração](#checklist-de-integração)
- [Changelog](#changelog)

---

## Visão Geral

A feature permite:
- **Upload** por **categoria**, com **associação** (Empreendimento/Lead/Contrato/Parcela) e **subpasta** (`pasta`: ex. “Imagens/Plantas/Documentos”).
- **Navegação** por pastas: Empreendimento → Subpasta (Imagens/Plantas) → Arquivos; Lead → Documentos → Arquivos.
- **Listagem** com filtros por `categoria`, `associations.item` e `pasta`.
- **Pré‑visualização** inline (imagem, PDF, vídeo, áudio) via `/api/files/:id/preview`.
- **Exclusão** de arquivos.

---

## Arquitetura

```
[Frontend]
  ├─ DrivePage.jsx (navegação, toolbar, grids, modais)
  │   ├─ FolderGrid (pastas: Emp/Lead + subpastas)
  │   ├─ FileGrid + FileCard (arquivos)
  │   ├─ UploadMetaModal (metadados após escolher arquivo)
  │   └─ PreviewModal (preview inline via blob)
  └─ src/api/fileApi.js (listar, upload, delete, preview blob)

[Backend]
  ├─ models/Arquivo.js
  ├─ services/FileService.js  (registrarArquivo, listarArquivos, apagarArquivo, getPreviewStream)
  ├─ controllers/FileController.js
  └─ routes/fileRoutes.js     (montado em /api/files)
```

---

## Backend

### Model `Arquivo`

`models/Arquivo.js` (principais campos):

- `categoria: String` (**enum**):
  - `Contratos`, `Documentos Leads`, `Materiais Empreendimentos`, `Recibos`, `Identidade Visual`, `Mídia WhatsApp`, `Outros`
- `pasta: String` (opcional): subpasta (ex.: `Imagens`, `Plantas`, `Documentos`)
- `associations: [{ kind, item }]`:
  - `kind` enum: `Lead`, `PropostaContrato`, `Empreendimento`, `Unidade`, `ImovelAvulso`, `User`
  - `item: ObjectId` (ref dinâmico via `refPath`)
- Campos S3/Spaces: `nomeNoBucket`, `url`, `mimetype`, `size`
- Metadados: `company`, `uploadedBy`, timestamps

> Índices recomendados: `company`, `categoria`, `pasta`, `associations.item`, `createdAt` (sort).

### Service

**`registrarArquivo(file, metadata, companyId, userId)`**  
- `metadata`: `{ categoria, primaryAssociation?, pasta? }`
- Faz `JSON.parse` se `primaryAssociation` vier como string (upload multipart).
- Salva `pasta` (subpasta) quando enviada.
- **Cascatas**:
  - `PropostaContrato` → adiciona `Lead`, `Unidade/ImovelAvulso` e, se `Unidade`, o `Empreendimento` pai.
  - `Lead` → adiciona `imovelInteresse` (Unidade/ImovelAvulso) e, se `Unidade`, o `Empreendimento` pai.
- Remove duplicados por chave `kind:item`.

**`listarArquivos(companyId, filters)`**  
- Monta `queryConditions` com `{ company: companyId, ...filters }`.
- Se `filters.associations` (string JSON `{ item }`), aplica `queryConditions['associations.item'] = parsed.item`.
- Se `!filters.pasta`, remove de `queryConditions` (não restringe por subpasta).
- `find().populate('uploadedBy','nome').sort({ createdAt: -1 })`

**`apagarArquivo(arquivoId, companyId)`**  
- Remove do Spaces (`DeleteObjectCommand`) e depois do MongoDB.

**`getPreviewStream(arquivoId, companyId)`**  
- Busca o arquivo (com filtro de `company` se fornecido).
- `GetObjectCommand` no Spaces.
- Retorna `{ stream, contentType, filename }` para o controller responder `inline`.

### Controllers

- `uploadArquivoController(req, res)` → `registrarArquivo(req.file, req.body, req.user.company, req.user._id)`
- `listarArquivosController(req, res)` → `listarArquivos(req.user.company, req.query)`
- `apagarArquivoController(req, res)` → `apagarArquivo(req.params.id, req.user.company)`
- `previewArquivoController(req, res)`:
  - `const { stream, contentType, filename } = await getPreviewStream(req.params.id, req.user?.company)`
  - `res.set('Content-Type', contentType)`  
    `res.set('Content-Disposition', 'inline; filename="..."')`  
    `stream.pipe(res)`

### Rotas

Montagem (em `app.js`):
```js
app.use('/api/files', require('./routes/fileRoutes')); // antes do catch-all da SPA
```

`routes/fileRoutes.js`:
```js
router.get('/', FileController.listarArquivosController);              // GET /api/files
router.post('/upload', upload.single('arquivo'), FileController.uploadArquivoController); // POST /api/files/upload
router.get('/:id/preview', FileController.previewArquivoController);   // GET /api/files/:id/preview
router.delete('/:id', FileController.apagarArquivoController);         // DELETE /api/files/:id
```

### Config S3/Spaces (upload)

Se usar `multer-s3`, recomenda-se:
```js
storage: multerS3({
  s3: s3Client,
  bucket: process.env.SPACES_BUCKET_NAME,
  acl: 'public-read',
  contentType: multerS3.AUTO_CONTENT_TYPE, // mantém o mimetype correto
  // contentDisposition: 'inline',          // opcional: abre direto ao clicar no URL público
  key: (req, file, cb) => cb(null, `uploads/${Date.now()}_${file.originalname}`),
})
```

> Mesmo sem `contentDisposition: 'inline'`, o preview funciona via `/api/files/:id/preview` (o servidor define os cabeçalhos).

### Exemplos de uso (cURL)

**Listar por categoria + pasta + associação**
```bash
curl "https://HOST/api/files?categoria=Materiais%20Empreendimentos&associations=%7B%22item%22:%22<EMP_ID>%22%7D&pasta=Imagens"
```

**Upload multipart** (campos do form)
- `arquivo`: arquivo (file)
- `categoria`: ex. `Materiais Empreendimentos`
- `primaryAssociation`: string JSON, ex. `{"kind":"Empreendimento","item":"<EMP_ID>"}`
- `pasta`: ex. `Imagens`

**Preview**
```bash
curl -i "https://HOST/api/files/<ARQUIVO_ID>/preview"
# 200 OK com Content-Type do arquivo (image/pdf/video/audio)
```

**Delete**
```bash
curl -X DELETE "https://HOST/api/files/<ARQUIVO_ID>"
```

---

## Frontend

### Camada de API (`src/api/fileApi.js`)

- `listarArquivosApi(filters)` → `GET /files`  
  filtros aceitos: `categoria`, `associations` (string JSON `{ "item": "<id>" }`), `pasta`
- `uploadArquivoApi(file, metadata, onUploadProgress)` → `POST /files/upload` (FormData)  
  envia: `arquivo`, `categoria`, `primaryAssociation?` (string JSON), `pasta?`
- `apagarArquivoApi(arquivoId)` → `DELETE /files/:id`
- `getPreviewBlobApi(arquivoId)` → `GET /files/:id/preview` com `responseType: 'blob'`

### Página e Componentes

- **DrivePage.jsx**
  - Mantém o `FileToolbar` (file picker nativo).
  - Se categoria exigir metadados, abre `UploadMetaModal` **após** o file picker.
  - Navegação por pastas:
    - `Materiais Empreendimentos` → lista Empreendimentos → subpastas `Imagens/Plantas` → `FileGrid`.
    - `Documentos Leads` → lista Leads → subpasta `Documentos` → `FileGrid`.
  - Preview: `PreviewModal` ao clicar no card.

- **UploadMetaModal.jsx**
  - Carrega listas **apenas quando aberto** (Empreendimentos/Leads/Parcelas).
  - Retorna `metadata` para o upload: `{ categoria, primaryAssociation, pasta? }`.

- **PreviewModal.jsx**
  - Busca blob via `getPreviewBlobApi(id)` (usa token do `axiosInstance`).
  - Renderiza com Object URL em `<img>`, `<iframe>`, `<video>`, `<audio>`.

- **useFiles.js**
  - Hook centraliza a listagem via `listarArquivosApi({ categoria, ...filters })`.

- **CategorySidebar / FolderGrid / FileGrid / FileCard**
  - `FileCard` chama `onPreview(file)` ao clicar no preview.
  - `FileGrid` repassa `onPreview` para cada card.

### CSS

- `DrivePage.css` com escopo `.admin-page.drive-page` para evitar conflito de estilos globais.
- Inclui layout de sidebar, grids, cards, modal, responsivo.

---

## Fluxos

### Upload com Metadados

1. Usuário clica em **Upload** (abre file picker).
2. `handlePickFile(file)`:
   - Se categoria **não exige** metadados → `uploadArquivoApi(file, { categoria })` direto.
   - Se **exige** (Emp/Lead/Contrato/Parcela) → abre `UploadMetaModal`.
3. Usuário escolhe associação e subpasta no modal → `onConfirm(metadata)`.
4. `uploadArquivoApi(file, metadata)` envia `FormData` com `primaryAssociation` (string JSON) e `pasta`.
5. `registrarArquivo` salva, aplica **cascatas** e remove duplicados.
6. `refetch()` atualiza a lista.

### Navegação em Pastas

- **Empreendimentos**:
  - Nível 1: lista empreendimentos (`FolderGrid`).
  - Nível 2: lista subpastas fixas (`Imagens`, `Plantas`).
  - Nível 3: `FileGrid` filtrado por `associations.item=<empId>` e `pasta=<subpasta>`.

- **Leads**:
  - Nível 1: lista leads.
  - Nível 2 (fixo): subpasta `Documentos`.
  - Nível 3: `FileGrid` filtrado por `associations.item=<leadId>` e `pasta=Documentos`.

### Preview Inline

- Clique no card → `PreviewModal` abre.
- `PreviewModal` chama `getPreviewBlobApi(id)` e cria Object URL.
- Renderiza inline conforme MIME:
  - `image/*` → `<img>`
  - `application/pdf` → `<iframe>`
  - `video/*` → `<video controls>`
  - `audio/*` → `<audio controls>`
- Ações rápidas: **Abrir em nova aba** (usa `file.url`) e **Baixar**.

---

## Evoluções Futuras

1. **Novas categorias**: adicione no enum do `Arquivo` e no array `CATEGORIAS` do frontend. Configure `requiresMeta()` e `SUBFOLDERS_BY_CATEGORY` se aplicável.
2. **Novos tipos de associação**: inclua no enum do `associacaoSchema.kind`, ajuste `UploadMetaModal` e (se necessário) cascatas no `registrarArquivo`.
3. **Busca/Barra de pesquisa**: filtro por `nomeOriginal`, `mimetype`, data (query ou client-side).
4. **Paginação/Scroll infinito**: endpoints com `page/limit` e UI com `IntersectionObserver`.
5. **Controle de acesso**: mover preview para exigir auth e servir apenas via `/preview` (não expor `file.url` público).
6. **Vídeo com `Range`/seek**: implementar suporte a `Range` no controller de preview (206).
7. **Versionamento/Histórico**: coleções auxiliares com versões por `nomeNoBucket`.

---

## Solução de Problemas (FAQ)



- **“Nenhum arquivo nesta categoria”** ao entrar na pasta:
  - Verifique se o upload enviou `pasta` e `primaryAssociation` corretos.
  - Cheque no Mongo: `categoria`, `pasta`, `associations.item` do documento.
- **Preview retorna 404 (HTML)**:
  - Confira se `app.use('/api/files', fileRoutes)` vem **antes** do catch‑all da SPA.
  - Rota correta no router: `/:id/preview` (não `/files/:id/preview`).
- **Baixa em vez de abrir**:
  - Use o `PreviewModal` (blob via Axios) ou force `Content-Disposition: inline` no `/preview`.
- **Travadas na página**:
  - Evite `setState` de objetos novos no render loop. Derive filtros via `useMemo`.
  - Buscas de listas apenas quando realmente necessárias (quando pasta/categoria aberta).

---

## Checklist de Integração

- [ ] `app.use('/api/files', fileRoutes)` antes do catch‑all do React.
- [ ] `routes/fileRoutes.js` com `/:id/preview` (não `/files/:id/preview`).
- [ ] `registrarArquivo` parseando `primaryAssociation` quando string.
- [ ] Frontend enviando `pasta` no `uploadArquivoApi` (quando aplicável).
- [ ] `PreviewModal` consumindo blob via `getPreviewBlobApi`.
- [ ] CSS escopado (`.admin-page.drive-page`) carregado por último, se houver conflitos.

---

## Changelog

- **v1.0** — Upload por categoria com metadados; navegação em pastas (Emp/Lead + subpastas); listagem com filtros; preview inline; exclusão.
