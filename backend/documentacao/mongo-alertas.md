# Mongo Alerts (populate / aggregate / lean / distinct / updates)

## .populate()
Total: **55**
### services/empreendimentoService.js
  - #1 • totalUnidades
  - #2 • totalUnidades

### services/FileService.js
  - #1 • [{path:lead, select:_id}, {path:imovel, select:_id empreendimento}]
  - #2 • imovelInteresse
  - #3 • uploadedBy | nome

### services/FinanceiroService.js
  - #1 • lead
  - #2 • sacado
  - #3 • {path:contrato, select:imovel tipoImovel, populate:{path:imovel, select:titulo}}
  - #4 • {path:sacado, select:nome}
  - #5 • credor | nome

### services/ImovelAvulsoService.js
  - #1 • responsavel | nome email
  - #2 • responsavel | nome email

### services/integrationService.js
  - #1 • lead | nome
  - #2 • company | autentiqueApiToken

### services/leadHistoryService.js
  - #1 • user | nome

### services/LeadService.js
  - #1 • motivoDescarte | nome
  - #2 • responsavel | nome perfil
  - #3 • origem | nome
  - #4 • situacao | nome ordem
  - #5 • situacao
  - #6 • []
  - #7 • [{path:situacao, select:nome ordem}, {path:origem, select:nome}, {path:responsavel, select:nome perfil}, {path:motivoDescarte, select:nome}]
  - #8 • motivoDescarte | nome
  - #9 • situacao | nome

### services/PropostaContratoService.js
  - #1 • lead
  - #2 • imovel
  - #3 • lead
  - #4 • {path:corretagem.corretorPrincipal, select:nome creci cpfCnpj contato email}
  - #5 • {path:createdBy, select:nome email}
  - #6 • {path:responsavelNegociacao, select:nome email}
  - #7 • {path:modeloContratoUtilizado, select:nomeModelo tipoDocumento}
  - #8 • {path:reserva, select:dataReserva validadeReserva valorSinal}
  - #9 • {path:imovel, select:identificador titulo tipologia areaUtil empreendimento preco precoTabela, populate:{path:empreendimento, select:nome localizacao memorialIncorporacao}}
  - #10 • {path:lead, select:nome email contato cpf rg estadoCivil profissao nacionalidade}
  - #11 • imovel
  - #12 • reserva
  - #13 • lead
  - #14 • imovel
  - #15 • reserva
  - #16 • lead
  - #17 • {path:empreendimento, select:nome}
  - #18 • {path:imovel}
  - #19 • {path:lead}

### services/ReajusteService.js
  - #1 • {path:contrato, select:regrasDeReajuste, populate:{path:regrasDeReajuste.indexador}}

### services/ReservaService.js
  - #1 • {path:imovel, populate:{path:empreendimento, select:nome}}
  - #2 • createdBy | nome
  - #3 • lead | nome email contato
  - #4 • {path:imovel.empreendimento, select:nome localizacao}
  - #5 • imovel
  - #6 • {path:createdBy, select:nome email}
  - #7 • {path:lead, select:nome email contato cpf rg estadoCivil profissao nacionalidade endereco coadquirentes}

### services/SignatureService.js
  - #1 • lead | nome
  - #2 • company | autentiqueApiToken

### services/TaskService.js
  - #1 • [{path:lead, select:nome}, {path:assignedTo, select:nome}]

### controllers/LeadRequestController.js
  - #1 • corretorResponsavel | nome

---

## .aggregate()
Total: **8**
### services/ChatService.js
  - #1 • Stages: ?
    • Pipeline: pipeline

### services/dashboardService.js
  - #1 • Stages: $match, $facet
    • Pipeline: [{$match:initialMatch}, {$facet:{}}]
  - #2 • Stages: $match, $facet
    • Pipeline: [{$match:baseMatch}, {$facet:{}}]
  - #3 • Stages: $match, $facet
    • Pipeline: [{$match:{}}, {$facet:{}}]
  - #4 • Stages: $match, $facet
    • Pipeline: [{$match:initialMatch}, {$facet:{}}]

### services/FinanceiroService.js
  - #1 • Stages: $match, $group
    • Pipeline: [{$match:{}}, {$group:{}}]

### services/LeadService.js
  - #1 • Stages: ?
    • Pipeline: aggregationPipeline

### services/TaskService.js
  - #1 • Stages: $facet
    • Pipeline: [{$facet:{}}]

---

## .lean()
Total: **61**
### models/Reserva.js
  - 2 ocorrência(s)

### models/Unidade.js
  - 1 ocorrência(s)

### services/ChatService.js
  - 3 ocorrência(s)

### services/dashboardService.js
  - 2 ocorrência(s)

### services/empreendimentoService.js
  - 2 ocorrência(s)

### services/FileService.js
  - 1 ocorrência(s)

### services/FinanceiroService.js
  - 2 ocorrência(s)

### services/ImovelAvulsoService.js
  - 2 ocorrência(s)

### services/integrationService.js
  - 9 ocorrência(s)

### services/leadHistoryService.js
  - 1 ocorrência(s)

### services/LeadService.js
  - 8 ocorrência(s)

### services/ModeloContratoService.js
  - 2 ocorrência(s)

### services/PropostaContratoService.js
  - 10 ocorrência(s)

### services/ReservaService.js
  - 5 ocorrência(s)

### services/unidadeService.js
  - 4 ocorrência(s)

### services/webhookService.js
  - 5 ocorrência(s)

### controllers/LeadRequestController.js
  - 1 ocorrência(s)

### controllers/webhookController.js
  - 1 ocorrência(s)

---

## .distinct()
Total: **1**
### services/FinanceiroService.js
  - #1 • field: _id

---

## updates (updateOne/updateMany/findOneAndUpdate/update)
Total: **33**
### services/brokerContactService.js
  - #1 • findOneAndUpdate • ops: $set
    • body: {$set:fieldsToUpdate}

### services/ChatService.js
  - #1 • updateOne • ops: $set
    • body: {$set:{}}

### services/discardReasonService.js
  - #1 • findOneAndUpdate • ops: $set
    • body: {$set:fieldsToUpdate}

### services/empreendimentoService.js
  - #1 • findOneAndUpdate • ops: $set
    • body: {$set:updateData}
  - #2 • findOneAndUpdate • ops: $set
    • body: {$set:{}}
  - #3 • updateMany • ops: $set
    • body: {$set:{}}

### services/evolutionWebhookService.js
  - #1 • findOneAndUpdate • ops: $set, $setOnInsert
    • body: {$set:{}, $setOnInsert:{}}
  - #2 • findOneAndUpdate • ops: $set, $setOnInsert
    • body: {$set:{}, $setOnInsert:{}}
  - #3 • findOneAndUpdate • ops: $set, $setOnInsert
    • body: {$set:{}, $setOnInsert:{}}

### services/FileService.js
  - #1 • updateOne • ops: —
    • body: (não literal)

### services/ImovelAvulsoService.js
  - #1 • findOneAndUpdate • ops: $set
    • body: {$set:updateData}

### services/integrationService.js
  - #1 • findOneAndUpdate • ops: $setOnInsert
    • body: {$setOnInsert:{}}
  - #2 • findOneAndUpdate • ops: $setOnInsert
    • body: {$setOnInsert:{}}
  - #3 • findOneAndUpdate • ops: $set
    • body: {$set:updateData}

### services/LeadService.js
  - #1 • findOneAndUpdate • ops: $set
    • body: {$set:updateFields}
  - #2 • findOneAndUpdate • ops: —
    • body: {}

### services/LeadStageService.js
  - #1 • findOneAndUpdate • ops: —
    • body: fieldsToUpdate

### services/ModeloContratoService.js
  - #1 • findOneAndUpdate • ops: $set
    • body: {$set:updateData}
  - #2 • findOneAndUpdate • ops: $set
    • body: {$set:{}}

### services/origemService.js
  - #1 • findOneAndUpdate • ops: —
    • body: fieldsToUpdate

### services/PropostaContratoService.js
  - #1 • findOneAndUpdate • ops: $setOnInsert
    • body: {$setOnInsert:{}}
  - #2 • findOneAndUpdate • ops: $setOnInsert
    • body: {$setOnInsert:{}}
  - #3 • findOneAndUpdate • ops: $setOnInsert
    • body: {$setOnInsert:{}}
  - #4 • findOneAndUpdate • ops: $setOnInsert
    • body: {$setOnInsert:{}}

### services/ReservaService.js
  - #1 • updateOne • ops: $set, $unset
    • body: {$set:{}, $unset:unsetCommon}
  - #2 • updateOne • ops: $set, $unset
    • body: {$set:{}, $unset:unsetCommon}
  - #3 • updateOne • ops: $set, $unset
    • body: {$set:{}, $unset:unsetCommon}
  - #4 • updateOne • ops: $set, $unset
    • body: {$set:{}, $unset:unsetCommon}

### services/TaskService.js
  - #1 • findOneAndUpdate • ops: $set
    • body: {$set:updateData}

### services/unidadeService.js
  - #1 • findOneAndUpdate • ops: $set
    • body: {$set:updateData}

### services/UserService.js
  - #1 • findOneAndUpdate • ops: $set
    • body: {$set:fieldsToUpdate}

### services/webhookService.js
  - #1 • findOneAndUpdate • ops: $setOnInsert
    • body: {$setOnInsert:{}}

### controllers/webhookController.js
  - #1 • update • ops: —
    • body: (não literal)
