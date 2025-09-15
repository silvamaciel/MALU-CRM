-- Draft DDL gerado automaticamente
-- Extensão recomendada: pgcrypto (gen_random_uuid) ou uuid-ossp
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Arquivo (models/Arquivo.js)
CREATE TABLE IF NOT EXISTS "arquivo" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "nome_original" text NOT NULL,
  "nome_no_bucket" text NOT NULL UNIQUE,
  "url" text NOT NULL UNIQUE,
  "mimetype" text NOT NULL,
  "pasta" text,
  "size" numeric NOT NULL,
  "company_id" uuid NOT NULL,
  "uploaded_by_id" uuid NOT NULL,
  "categoria" text NOT NULL CHECK ("categoria" IN ('Contratos', 'Documentos Leads', 'Materiais Empreendimentos', 'Recibos', 'Parcela', 'Identidade Visual', 'Mídia WhatsApp', 'Outros')),
  "associations" jsonb
);

ALTER TABLE "arquivo"
  ADD CONSTRAINT "arquivo_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE "arquivo"
  ADD CONSTRAINT "arquivo_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "user"("id") ON UPDATE CASCADE ON DELETE SET NULL;


-- BrokerContact (models/BrokerContact.js)
CREATE TABLE IF NOT EXISTS "broker_contact" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "nome" text NOT NULL,
  "contato" text,
  "email" text UNIQUE,
  "creci" text,
  "nome_imobiliaria" text,
  "cpf_cnpj" text,
  "company_id" uuid NOT NULL,
  "ativo" boolean,
  "public_submission_token" text UNIQUE
);

ALTER TABLE "broker_contact"
  ADD CONSTRAINT "broker_contact_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON UPDATE CASCADE ON DELETE SET NULL;

-- TODO: traduzir partialFilterExpression para WHERE (...) neste índice
CREATE UNIQUE INDEX IF NOT EXISTS "broker_contact_idx_1" ON "broker_contact" ("company" ASC, "cpf" ASC);
-- TODO: traduzir partialFilterExpression para WHERE (...) neste índice
CREATE UNIQUE INDEX IF NOT EXISTS "broker_contact_idx_2" ON "broker_contact" ("company" ASC, "creci" ASC);

-- Company (models/Company.js)
CREATE TABLE IF NOT EXISTS "company" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "nome" text NOT NULL,
  "cnpj" text NOT NULL UNIQUE,
  "ativo" boolean,
  "facebook_page_id" text UNIQUE,
  "autentique_api_token" text,
  "linked_facebook_forms" jsonb,
  "facebook_connected_by_user_id" uuid,
  "public_broker_token" text UNIQUE,
  "facebook_webhook_subscription_id" text
);

ALTER TABLE "company"
  ADD CONSTRAINT "company_facebook_connected_by_user_id_fkey" FOREIGN KEY ("facebook_connected_by_user_id") REFERENCES "user"("id") ON UPDATE CASCADE ON DELETE SET NULL;


-- Conversation (models/Conversation.js)
CREATE TABLE IF NOT EXISTS "conversation" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "lead_id" uuid,
  "lead_name_snapshot" text,
  "temp_contact_name" text,
  "company_id" uuid NOT NULL,
  "channel" text NOT NULL CHECK ("channel" IN ('WhatsApp', 'Instagram', 'FacebookMessenger')),
  "channel_internal_id" text NOT NULL,
  "last_message" text,
  "last_message_at" timestamptz,
  "unread_count" numeric,
  "instance_id" uuid,
  "instance_name" text,
  "contact_photo_url" text
);

ALTER TABLE "conversation"
  ADD CONSTRAINT "conversation_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "lead"("id") ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE "conversation"
  ADD CONSTRAINT "conversation_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE "conversation"
  ADD CONSTRAINT "conversation_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "evolution_instance"("id") ON UPDATE CASCADE ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "conversation_idx_1" ON "conversation" ("lead" ASC, "channel" ASC);
CREATE INDEX IF NOT EXISTS "conversation_idx_2" ON "conversation" ("company" ASC, "last_message_at" DESC, "id" DESC);

-- Credor (models/Credor.js)
CREATE TABLE IF NOT EXISTS "credor" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "nome" text NOT NULL,
  "cpf_cnpj" text UNIQUE,
  "tipo" text NOT NULL CHECK ("tipo" IN ('Corretor', 'Funcionário', 'Fornecedor', 'Outro')),
  "broker_contact_ref_id" uuid,
  "user_ref_id" uuid,
  "contato" text,
  "email" text,
  "dados_bancarios" jsonb,
  "company_id" uuid NOT NULL
);

ALTER TABLE "credor"
  ADD CONSTRAINT "credor_broker_contact_ref_id_fkey" FOREIGN KEY ("broker_contact_ref_id") REFERENCES "broker_contact"("id") ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE "credor"
  ADD CONSTRAINT "credor_user_ref_id_fkey" FOREIGN KEY ("user_ref_id") REFERENCES "user"("id") ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE "credor"
  ADD CONSTRAINT "credor_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON UPDATE CASCADE ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "credor_idx_1" ON "credor" ("company" ASC, "nome" ASC);

-- Despesa (models/Despesa.js)
CREATE TABLE IF NOT EXISTS "despesa" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "descricao" text NOT NULL,
  "credor_id" uuid NOT NULL,
  "contrato_id" uuid,
  "company_id" uuid NOT NULL,
  "valor" numeric NOT NULL,
  "data_vencimento" timestamptz NOT NULL,
  "data_pagamento" timestamptz,
  "status" text CHECK ("status" IN ('A Pagar', 'Paga', 'Atrasada', 'Cancelada')),
  "centro_de_custo" text CHECK ("centro_de_custo" IN ('Comissões', 'Marketing', 'Operacional', 'Outros')),
  "observacoes" text,
  "registrado_por_id" uuid NOT NULL
);

ALTER TABLE "despesa"
  ADD CONSTRAINT "despesa_credor_id_fkey" FOREIGN KEY ("credor_id") REFERENCES "credor"("id") ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE "despesa"
  ADD CONSTRAINT "despesa_contrato_id_fkey" FOREIGN KEY ("contrato_id") REFERENCES "proposta_contrato"("id") ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE "despesa"
  ADD CONSTRAINT "despesa_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE "despesa"
  ADD CONSTRAINT "despesa_registrado_por_id_fkey" FOREIGN KEY ("registrado_por_id") REFERENCES "user"("id") ON UPDATE CASCADE ON DELETE SET NULL;


-- DiscardReason (models/DiscardReason.js)
CREATE TABLE IF NOT EXISTS "discard_reason" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "nome" text NOT NULL,
  "company_id" uuid NOT NULL,
  "ativo" boolean
);

ALTER TABLE "discard_reason"
  ADD CONSTRAINT "discard_reason_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON UPDATE CASCADE ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "discard_reason_idx_1" ON "discard_reason" ("company" ASC, "nome" ASC);

-- Empreendimento (models/Empreendimento.js)
CREATE TABLE IF NOT EXISTS "empreendimento" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "nome" text NOT NULL,
  "construtora_incorporadora" text,
  "localizacao" jsonb,
  "tipo" text NOT NULL,
  "status_empreendimento" text NOT NULL,
  "descricao" text,
  "imagem_principal" jsonb,
  "data_prevista_entrega" timestamptz,
  "company_id" uuid NOT NULL,
  "ativo" boolean
);

ALTER TABLE "empreendimento"
  ADD CONSTRAINT "empreendimento_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON UPDATE CASCADE ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "empreendimento_idx_1" ON "empreendimento" ("nome" ASC, "company" ASC);

-- EvolutionInstance (models/EvolutionInstance.js)
CREATE TABLE IF NOT EXISTS "evolution_instance" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "instance_name" text NOT NULL,
  "instance_id" text NOT NULL UNIQUE,
  "receive_from_groups" boolean,
  "auto_create_lead" boolean,
  "api_key" text NOT NULL,
  "status" text,
  "owner_number" text,
  "company_id" uuid NOT NULL,
  "created_by_id" uuid NOT NULL
);

ALTER TABLE "evolution_instance"
  ADD CONSTRAINT "evolution_instance_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE "evolution_instance"
  ADD CONSTRAINT "evolution_instance_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON UPDATE CASCADE ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "evolution_instance_idx_1" ON "evolution_instance" ("company" ASC, "instance_name" ASC);

-- ImovelAvulso (models/ImovelAvulso.js)
CREATE TABLE IF NOT EXISTS "imovel_avulso" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "titulo" text NOT NULL,
  "descricao" text,
  "tipo_imovel" text NOT NULL CHECK ("tipo_imovel" IN ('Apartamento', 'Casa', 'Terreno', 'Sala Comercial', 'Loja', 'Galpão', 'Outro')),
  "status" text NOT NULL CHECK ("status" IN ('Disponível', 'Reservado', 'Vendido', 'Inativo', 'Proposta')),
  "quartos" numeric,
  "suites" numeric,
  "banheiros" numeric,
  "vagas_garagem" numeric,
  "area_total" numeric NOT NULL,
  "construtora_nome" text,
  "preco" numeric NOT NULL,
  "endereco" jsonb,
  "fotos" jsonb,
  "company_id" uuid NOT NULL,
  "responsavel_id" uuid NOT NULL,
  "current_lead_id" uuid,
  "current_reserva_id" uuid
);

ALTER TABLE "imovel_avulso"
  ADD CONSTRAINT "imovel_avulso_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE "imovel_avulso"
  ADD CONSTRAINT "imovel_avulso_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "user"("id") ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE "imovel_avulso"
  ADD CONSTRAINT "imovel_avulso_current_lead_id_fkey" FOREIGN KEY ("current_lead_id") REFERENCES "lead"("id") ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE "imovel_avulso"
  ADD CONSTRAINT "imovel_avulso_current_reserva_id_fkey" FOREIGN KEY ("current_reserva_id") REFERENCES "reserva"("id") ON UPDATE CASCADE ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "imovel_avulso_idx_1" ON "imovel_avulso" ("company" ASC, "tipo_imovel" ASC, "status" ASC);

-- Indexador (models/Indexador.js)
CREATE TABLE IF NOT EXISTS "indexador" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "nome" text NOT NULL UNIQUE,
  "descricao" text,
  "valores" jsonb,
  "company_id" uuid NOT NULL
);

ALTER TABLE "indexador"
  ADD CONSTRAINT "indexador_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON UPDATE CASCADE ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "indexador_idx_1" ON "indexador" ("company" ASC, "nome" ASC);
-- TODO: traduzir partialFilterExpression para WHERE (...) neste índice
CREATE UNIQUE INDEX IF NOT EXISTS "indexador_idx_2" ON "indexador" ("valores_mes_ano" ASC);

-- Lead (models/Lead.js)
CREATE TABLE IF NOT EXISTS "lead" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "nome" text NOT NULL,
  "contato" text NOT NULL,
  "email" text NOT NULL UNIQUE,
  "nascimento" timestamptz,
  "endereco" text,
  "cpf" text UNIQUE,
  "rg" text,
  "nacionalidade" text,
  "estado_civil" text CHECK ("estado_civil" IN ('Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)', 'União Estável', 'Outro')),
  "profissao" text,
  "nascimento" timestamptz,
  "endereco" text,
  "coadquirentes" jsonb,
  "situacao_id" uuid NOT NULL,
  "motivo_descarte_id" uuid,
  "comentario" text,
  "origem_id" uuid NOT NULL,
  "responsavel_id" uuid NOT NULL,
  "company_id" uuid NOT NULL,
  "tags" text[],
  "submitted_by_broker_id" uuid,
  "corretor_responsavel_id" uuid,
  "approval_status" text CHECK ("approval_status" IN ('Aprovado', 'Pendente', 'Rejeitado'))
);

ALTER TABLE "lead"
  ADD CONSTRAINT "lead_situacao_id_fkey" FOREIGN KEY ("situacao_id") REFERENCES "lead_stage"("id") ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE "lead"
  ADD CONSTRAINT "lead_motivo_descarte_id_fkey" FOREIGN KEY ("motivo_descarte_id") REFERENCES "discard_reason"("id") ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE "lead"
  ADD CONSTRAINT "lead_origem_id_fkey" FOREIGN KEY ("origem_id") REFERENCES "origem"("id") ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE "lead"
  ADD CONSTRAINT "lead_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "user"("id") ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE "lead"
  ADD CONSTRAINT "lead_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE "lead"
  ADD CONSTRAINT "lead_submitted_by_broker_id_fkey" FOREIGN KEY ("submitted_by_broker_id") REFERENCES "broker_contact"("id") ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE "lead"
  ADD CONSTRAINT "lead_corretor_responsavel_id_fkey" FOREIGN KEY ("corretor_responsavel_id") REFERENCES "broker_contact"("id") ON UPDATE CASCADE ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "lead_idx_1" ON "lead" ("company" ASC, "contato" ASC);
CREATE UNIQUE INDEX IF NOT EXISTS "lead_idx_2" ON "lead" ("company" ASC, "email" ASC);

-- LeadHistory (models/LeadHistory.js)
CREATE TABLE IF NOT EXISTS "lead_history" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "lead_id" uuid NOT NULL,
  "user_id" uuid,
  "action" text NOT NULL CHECK ("action" IN ('CRIACAO', 'ATUALIZACAO', 'DESCARTE', 'REATIVACAO', 'RESERVA_CRIADA', 'RESERVA_CANCELADA', 'RESERVA_EXPIRADA', 'RESERVA_EXCLUIDA', 'PROPOSTA_CRIADA', 'RESERVA_CANCELADA_STATUS_LEAD', 'UNIDADE_LIBERADA', 'PROPOSTA_CONTRATO_CRIADA', 'PROPOSTA_STATUS_ALTERADO', 'VENDA_CONCRETIZADA', 'DISTRATO_REALIZADO', 'PROPOSTA_STATUS_ASSINADO', 'PROPOSTA_STATUS_VENDIDO', 'PROPOSTA_STATUS_RECUSADO', 'PROPOSTA_STATUS_CANCELADO', 'PROPOSTA_STATUS_DISTRATO_REALIZADO', 'DISTRATO_REALIZADO', 'PROPOSTA_STATUS_AGUARDANDO_ASSINATURA_CLIENTE', 'PROPOSTA_CONTRATO_EDITADA', 'PROPOSTA_STATUS_AGUARDANDO_APROVAÇÕES', 'EDICAO_DADOS')),
  "details" text
);

ALTER TABLE "lead_history"
  ADD CONSTRAINT "lead_history_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "lead"("id") ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE "lead_history"
  ADD CONSTRAINT "lead_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON UPDATE CASCADE ON DELETE SET NULL;


-- LeadRequest (models/LeadRequest.js)
CREATE TABLE IF NOT EXISTS "lead_request" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "company_id" uuid NOT NULL,
  "nome" text NOT NULL,
  "contato" text NOT NULL,
  "email" text,
  "nascimento" timestamptz,
  "endereco" text,
  "cpf" text,
  "rg" text,
  "nacionalidade" text,
  "estado_civil" text CHECK ("estado_civil" IN ('Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)', 'União Estável', 'Outro')),
  "profissao" text,
  "comentario" text,
  "origem_id" uuid,
  "coadquirentes" jsonb,
  "corretor_responsavel_id" uuid NOT NULL,
  "submitted_by_broker_id" uuid NOT NULL,
  "tags" text[],
  "status" text CHECK ("status" IN ('Pendente', 'Aprovado', 'Rejeitado')),
  "reject_reason" text
);

ALTER TABLE "lead_request"
  ADD CONSTRAINT "lead_request_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE "lead_request"
  ADD CONSTRAINT "lead_request_origem_id_fkey" FOREIGN KEY ("origem_id") REFERENCES "origem"("id") ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE "lead_request"
  ADD CONSTRAINT "lead_request_corretor_responsavel_id_fkey" FOREIGN KEY ("corretor_responsavel_id") REFERENCES "broker_contact"("id") ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE "lead_request"
  ADD CONSTRAINT "lead_request_submitted_by_broker_id_fkey" FOREIGN KEY ("submitted_by_broker_id") REFERENCES "broker_contact"("id") ON UPDATE CASCADE ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "lead_request_idx_1" ON "lead_request" ("company" ASC, "contato" ASC, "status" ASC);
CREATE INDEX IF NOT EXISTS "lead_request_idx_2" ON "lead_request" ("company" ASC, "email" ASC, "status" ASC);

-- LeadStage (models/LeadStage.js)
CREATE TABLE IF NOT EXISTS "lead_stage" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "nome" text NOT NULL,
  "company_id" uuid NOT NULL,
  "ativo" boolean,
  "ordem" numeric
);

ALTER TABLE "lead_stage"
  ADD CONSTRAINT "lead_stage_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON UPDATE CASCADE ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "lead_stage_idx_1" ON "lead_stage" ("company" ASC, "nome" ASC);
CREATE INDEX IF NOT EXISTS "lead_stage_idx_2" ON "lead_stage" ("company" ASC, "ordem" ASC);

-- Message (models/Message.js)
CREATE TABLE IF NOT EXISTS "message" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "conversation_id" uuid NOT NULL,
  "company_id" uuid NOT NULL,
  "channel_message_id" text UNIQUE,
  "direction" text NOT NULL CHECK ("direction" IN ('incoming', 'outgoing')),
  "sender_id" text,
  "content_type" text NOT NULL CHECK ("content_type" IN ('text', 'image', 'audio', 'document', 'other')),
  "content" text NOT NULL,
  "media_url" text,
  "media_mime_type" text,
  "read" boolean,
  "status" text CHECK ("status" IN ('sent', 'delivered', 'read', 'failed'))
);

ALTER TABLE "message"
  ADD CONSTRAINT "message_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversation"("id") ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE "message"
  ADD CONSTRAINT "message_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON UPDATE CASCADE ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "message_idx_1" ON "message" ("conversation" ASC, "created_at" DESC);

-- ModeloContrato (models/ModeloContrato.js)
CREATE TABLE IF NOT EXISTS "modelo_contrato" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "nome_modelo" text NOT NULL,
  "tipo_documento" text NOT NULL CHECK ("tipo_documento" IN ('Proposta', 'Contrato de Reserva', 'Contrato de Compra e Venda', 'Outro')),
  "conteudo_htmltemplate" text NOT NULL,
  "placeholders_disponiveis" jsonb,
  "company_id" uuid NOT NULL,
  "ativo" boolean
);

ALTER TABLE "modelo_contrato"
  ADD CONSTRAINT "modelo_contrato_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON UPDATE CASCADE ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "modelo_contrato_idx_1" ON "modelo_contrato" ("nome_modelo" ASC, "company" ASC);

-- Origem (models/origem.js)
CREATE TABLE IF NOT EXISTS "origem" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "nome" text NOT NULL,
  "descricao" text,
  "company_id" uuid NOT NULL,
  "ativo" boolean
);

ALTER TABLE "origem"
  ADD CONSTRAINT "origem_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON UPDATE CASCADE ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "origem_idx_1" ON "origem" ("company" ASC, "nome" ASC);

-- Parcela (models/Parcela.js)
CREATE TABLE IF NOT EXISTS "parcela" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tipo_parcela" text NOT NULL CHECK ("tipo_parcela" IN ('ATO', 'PARCELA MENSAL', 'PARCELA BIMESTRAL', 'PARCELA TRIMESTRAL', 'PARCELA SEMESTRAL', 'INTERCALADA', 'ENTREGA DE CHAVES', 'FINANCIAMENTO', 'OUTRA')),
  "quantidade" numeric,
  "valor_unitario" numeric NOT NULL,
  "vencimento_primeira" timestamptz NOT NULL,
  "observacao" text
);


-- PropostaContrato (models/PropostaContrato.js)
CREATE TABLE IF NOT EXISTS "proposta_contrato" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "lead_id" uuid NOT NULL,
  "reserva_id" uuid NOT NULL UNIQUE,
  "imovel" uuid NOT NULL,
  "tipo_imovel" text NOT NULL CHECK ("tipo_imovel" IN ('Unidade', 'ImovelAvulso')),
  "company_id" uuid NOT NULL,
  "adquirentes_snapshot" jsonb NOT NULL,
  "modelo_contrato_utilizado_id" uuid,
  "autentique_document_id" text,
  "signatarios" jsonb,
  "status_assinatura" text CHECK ("status_assinatura" IN ('Não Enviado', 'Aguardando Assinaturas', 'Finalizado', 'Recusado')),
  "preco_tabela_unidade_no_momento" numeric NOT NULL,
  "valor_proposta_contrato" numeric NOT NULL,
  "valor_desconto_concedido" numeric,
  "valor_entrada" numeric,
  "condicoes_pagamento_gerais" text,
  "dados_bancarios_para_pagamento" jsonb,
  "plano_de_pagamento" jsonb,
  "corretagem" jsonb,
  "regras_de_reajuste" jsonb,
  "corpo_contrato_htmlgerado" text NOT NULL,
  "data_proposta" timestamptz,
  "data_assinatura_cliente" timestamptz,
  "data_venda_efetivada" timestamptz,
  "status_proposta_contrato" text NOT NULL CHECK ("status_proposta_contrato" IN ('Em Elaboração', 'Aguardando Aprovações', 'Aguardando Assinatura Cliente', 'Assinado', 'Vendido', 'Recusado', 'Cancelado', 'Distrato Realizado')),
  "responsavel_negociacao_id" uuid NOT NULL,
  "created_by_id" uuid NOT NULL,
  "observacoes_internas_proposta" text,
  "data_distrato" timestamptz,
  "motivo_distrato" text
);

ALTER TABLE "proposta_contrato"
  ADD CONSTRAINT "proposta_contrato_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "lead"("id") ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE "proposta_contrato"
  ADD CONSTRAINT "proposta_contrato_reserva_id_fkey" FOREIGN KEY ("reserva_id") REFERENCES "reserva"("id") ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE "proposta_contrato"
  ADD CONSTRAINT "proposta_contrato_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE "proposta_contrato"
  ADD CONSTRAINT "proposta_contrato_modelo_contrato_utilizado_id_fkey" FOREIGN KEY ("modelo_contrato_utilizado_id") REFERENCES "modelo_contrato"("id") ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE "proposta_contrato"
  ADD CONSTRAINT "proposta_contrato_responsavel_negociacao_id_fkey" FOREIGN KEY ("responsavel_negociacao_id") REFERENCES "user"("id") ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE "proposta_contrato"
  ADD CONSTRAINT "proposta_contrato_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON UPDATE CASCADE ON DELETE SET NULL;


-- Reserva (models/Reserva.js)
CREATE TABLE IF NOT EXISTS "reserva" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "lead_id" uuid NOT NULL,
  "imovel" uuid NOT NULL,
  "tipo_imovel" text NOT NULL CHECK ("tipo_imovel" IN ('Unidade', 'ImovelAvulso')),
  "company_id" uuid,
  "data_reserva" timestamptz NOT NULL,
  "validade_reserva" timestamptz NOT NULL,
  "valor_sinal" numeric,
  "observacoes_reserva" text,
  "status_reserva" text NOT NULL,
  "created_by_id" uuid NOT NULL,
  "proposta_id" uuid,
  "venda_id" uuid
);

ALTER TABLE "reserva"
  ADD CONSTRAINT "reserva_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "lead"("id") ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE "reserva"
  ADD CONSTRAINT "reserva_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE "reserva"
  ADD CONSTRAINT "reserva_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE "reserva"
  ADD CONSTRAINT "reserva_proposta_id_fkey" FOREIGN KEY ("proposta_id") REFERENCES "proposta"("id") ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE "reserva"
  ADD CONSTRAINT "reserva_venda_id_fkey" FOREIGN KEY ("venda_id") REFERENCES "venda"("id") ON UPDATE CASCADE ON DELETE SET NULL;

-- TODO: traduzir partialFilterExpression para WHERE (...) neste índice
CREATE UNIQUE INDEX IF NOT EXISTS "reserva_idx_1" ON "reserva" ("imovel" ASC, "status_reserva" ASC);

-- Task (models/Task.js)
CREATE TABLE IF NOT EXISTS "task" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" text NOT NULL,
  "description" text,
  "status" text CHECK ("status" IN ('Pendente', 'Concluída')),
  "due_date" timestamptz NOT NULL,
  "lead_id" uuid NOT NULL,
  "assigned_to_id" uuid NOT NULL,
  "company_id" uuid NOT NULL,
  "created_by_id" uuid NOT NULL
);

ALTER TABLE "task"
  ADD CONSTRAINT "task_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "lead"("id") ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE "task"
  ADD CONSTRAINT "task_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "user"("id") ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE "task"
  ADD CONSTRAINT "task_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE "task"
  ADD CONSTRAINT "task_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON UPDATE CASCADE ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "task_idx_1" ON "task" ("company" ASC, "status" ASC, "due_date" ASC);

-- Transacao (models/Transacao.js)
CREATE TABLE IF NOT EXISTS "transacao" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "parcela_id" uuid NOT NULL,
  "contrato_id" uuid NOT NULL,
  "sacado_id" uuid NOT NULL,
  "company_id" uuid NOT NULL,
  "valor" numeric NOT NULL,
  "metodo_pagamento" text NOT NULL CHECK ("metodo_pagamento" IN ('PIX', 'Transferência', 'Boleto', 'Cartão', 'Dinheiro', 'Outro')),
  "data_transacao" timestamptz NOT NULL,
  "registrado_por_id" uuid NOT NULL,
  "comprovante_url" text
);

ALTER TABLE "transacao"
  ADD CONSTRAINT "transacao_parcela_id_fkey" FOREIGN KEY ("parcela_id") REFERENCES "parcela"("id") ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE "transacao"
  ADD CONSTRAINT "transacao_contrato_id_fkey" FOREIGN KEY ("contrato_id") REFERENCES "proposta_contrato"("id") ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE "transacao"
  ADD CONSTRAINT "transacao_sacado_id_fkey" FOREIGN KEY ("sacado_id") REFERENCES "lead"("id") ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE "transacao"
  ADD CONSTRAINT "transacao_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE "transacao"
  ADD CONSTRAINT "transacao_registrado_por_id_fkey" FOREIGN KEY ("registrado_por_id") REFERENCES "user"("id") ON UPDATE CASCADE ON DELETE SET NULL;


-- Unidade (models/Unidade.js)
CREATE TABLE IF NOT EXISTS "unidade" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "empreendimento_id" uuid NOT NULL,
  "identificador" text NOT NULL,
  "tipologia" text,
  "area_util" numeric,
  "area_total" numeric,
  "preco_tabela" numeric,
  "status_unidade" text NOT NULL,
  "descricao" text,
  "destaque" boolean,
  "company_id" uuid NOT NULL,
  "ativo" boolean,
  "current_lead_id" uuid,
  "current_reserva_id" uuid,
  "current_lead_id" uuid,
  "current_reserva_id" uuid UNIQUE
);

ALTER TABLE "unidade"
  ADD CONSTRAINT "unidade_empreendimento_id_fkey" FOREIGN KEY ("empreendimento_id") REFERENCES "empreendimento"("id") ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE "unidade"
  ADD CONSTRAINT "unidade_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE "unidade"
  ADD CONSTRAINT "unidade_current_lead_id_fkey" FOREIGN KEY ("current_lead_id") REFERENCES "lead"("id") ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE "unidade"
  ADD CONSTRAINT "unidade_current_reserva_id_fkey" FOREIGN KEY ("current_reserva_id") REFERENCES "reserva"("id") ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE "unidade"
  ADD CONSTRAINT "unidade_current_lead_id_fkey" FOREIGN KEY ("current_lead_id") REFERENCES "lead"("id") ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE "unidade"
  ADD CONSTRAINT "unidade_current_reserva_id_fkey" FOREIGN KEY ("current_reserva_id") REFERENCES "reserva"("id") ON UPDATE CASCADE ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "unidade_idx_1" ON "unidade" ("empreendimento" ASC, "identificador" ASC);

-- User (models/User.js)
CREATE TABLE IF NOT EXISTS "user" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "nome" text NOT NULL,
  "email" text NOT NULL UNIQUE,
  "senha" text,
  "perfil" text NOT NULL CHECK ("perfil" IN ('admin', 'corretor')),
  "company_id" uuid NOT NULL,
  "google_id" text UNIQUE,
  "ativo" boolean,
  "google_refresh_token" text
);

ALTER TABLE "user"
  ADD CONSTRAINT "user_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON UPDATE CASCADE ON DELETE SET NULL;

