# Schema → PostgreSQL (mapa)
> Rascunho gerado automaticamente. Revise tipos/tamanhos/constraints conforme regra de negócio.

## Arquivo → `arquivo`
Arquivo: `models/Arquivo.js`

- `nome_original` text • NOT NULL
- `nome_no_bucket` text • NOT NULL | UNIQUE
- `url` text • NOT NULL | UNIQUE
- `mimetype` text • NOT NULL
- `pasta` text
- `size` numeric • NOT NULL
- `company_id` uuid • NOT NULL → FK company.id
- `uploaded_by_id` uuid • NOT NULL → FK user.id
- `categoria` text • NOT NULL | ENUM(Contratos,Documentos Leads,Materiais Empreendimentos,Recibos,Parcela,Identidade Visual,Mídia WhatsApp,Outros)
- `associations` jsonb



## BrokerContact → `broker_contact`
Arquivo: `models/BrokerContact.js`

- `nome` text • NOT NULL
- `contato` text
- `email` text • UNIQUE
- `creci` text
- `nome_imobiliaria` text
- `cpf_cnpj` text
- `company_id` uuid • NOT NULL → FK company.id
- `ativo` boolean
- `public_submission_token` text • UNIQUE


**Índices compostos**:
- INDEX ( company, cpf ) { unique:true, partialFilterExpression:true } /* TODO: traduzir partialFilterExpression para WHERE */
- INDEX ( company, creci ) { unique:true, partialFilterExpression:true } /* TODO: traduzir partialFilterExpression para WHERE */

## Company → `company`
Arquivo: `models/Company.js`

- `nome` text • NOT NULL
- `cnpj` text • NOT NULL | UNIQUE
- `ativo` boolean
- `facebook_page_id` text • UNIQUE
- `autentique_api_token` text
- `linked_facebook_forms` jsonb
- `facebook_connected_by_user_id` uuid → FK user.id
- `public_broker_token` text • UNIQUE
- `facebook_webhook_subscription_id` text



## Conversation → `conversation`
Arquivo: `models/Conversation.js`

- `lead_id` uuid → FK lead.id
- `lead_name_snapshot` text
- `temp_contact_name` text
- `company_id` uuid • NOT NULL → FK company.id
- `channel` text • NOT NULL | ENUM(WhatsApp,Instagram,FacebookMessenger)
- `channel_internal_id` text • NOT NULL
- `last_message` text
- `last_message_at` timestamptz
- `unread_count` numeric
- `instance_id` uuid → FK evolution_instance.id
- `instance_name` text
- `contact_photo_url` text


**Índices compostos**:
- INDEX ( lead, channel ) { unique:true }
- INDEX ( company, last_message_at DESC, _id DESC ) 

## Credor → `credor`
Arquivo: `models/Credor.js`

- `nome` text • NOT NULL
- `cpf_cnpj` text • UNIQUE
- `tipo` text • NOT NULL | ENUM(Corretor,Funcionário,Fornecedor,Outro)
- `broker_contact_ref_id` uuid → FK broker_contact.id
- `user_ref_id` uuid → FK user.id
- `contato` text
- `email` text
- `dados_bancarios` jsonb
- `company_id` uuid • NOT NULL → FK company.id


**Índices compostos**:
- INDEX ( company, nome ) 

## Despesa → `despesa`
Arquivo: `models/Despesa.js`

- `descricao` text • NOT NULL
- `credor_id` uuid • NOT NULL → FK credor.id
- `contrato_id` uuid → FK proposta_contrato.id
- `company_id` uuid • NOT NULL → FK company.id
- `valor` numeric • NOT NULL
- `data_vencimento` timestamptz • NOT NULL
- `data_pagamento` timestamptz
- `status` text • ENUM(A Pagar,Paga,Atrasada,Cancelada)
- `centro_de_custo` text • ENUM(Comissões,Marketing,Operacional,Outros)
- `observacoes` text
- `registrado_por_id` uuid • NOT NULL → FK user.id



## DiscardReason → `discard_reason`
Arquivo: `models/DiscardReason.js`

- `nome` text • NOT NULL
- `company_id` uuid • NOT NULL → FK company.id
- `ativo` boolean


**Índices compostos**:
- INDEX ( company, nome ) { unique:true }

## Empreendimento → `empreendimento`
Arquivo: `models/Empreendimento.js`

- `nome` text • NOT NULL
- `construtora_incorporadora` text
- `localizacao` jsonb
- `tipo` text • NOT NULL
- `status_empreendimento` text • NOT NULL
- `descricao` text
- `imagem_principal` jsonb
- `data_prevista_entrega` timestamptz
- `company_id` uuid • NOT NULL → FK company.id
- `ativo` boolean


**Índices compostos**:
- INDEX ( nome, company ) { unique:true }

## EvolutionInstance → `evolution_instance`
Arquivo: `models/EvolutionInstance.js`

- `instance_name` text • NOT NULL
- `instance_id` text • NOT NULL | UNIQUE
- `receive_from_groups` boolean
- `auto_create_lead` boolean
- `api_key` text • NOT NULL
- `status` text
- `owner_number` text
- `company_id` uuid • NOT NULL → FK company.id
- `created_by_id` uuid • NOT NULL → FK user.id


**Índices compostos**:
- INDEX ( company, instance_name ) { unique:true }

## ImovelAvulso → `imovel_avulso`
Arquivo: `models/ImovelAvulso.js`

- `titulo` text • NOT NULL
- `descricao` text
- `tipo_imovel` text • NOT NULL | ENUM(Apartamento,Casa,Terreno,Sala Comercial,Loja,Galpão,Outro)
- `status` text • NOT NULL | ENUM(Disponível,Reservado,Vendido,Inativo,Proposta)
- `quartos` numeric
- `suites` numeric
- `banheiros` numeric
- `vagas_garagem` numeric
- `area_total` numeric • NOT NULL
- `construtora_nome` text
- `preco` numeric • NOT NULL
- `endereco` jsonb
- `fotos` jsonb
- `company_id` uuid • NOT NULL → FK company.id
- `responsavel_id` uuid • NOT NULL → FK user.id
- `current_lead_id` uuid → FK lead.id
- `current_reserva_id` uuid → FK reserva.id


**Índices compostos**:
- INDEX ( company, tipo_imovel, status ) 

## Indexador → `indexador`
Arquivo: `models/Indexador.js`

- `nome` text • NOT NULL | UNIQUE
- `descricao` text
- `valores` jsonb
- `company_id` uuid • NOT NULL → FK company.id


**Índices compostos**:
- INDEX ( company, nome ) { unique:true }
- INDEX ( valores_mes_ano ) { unique:true, partialFilterExpression:true } /* TODO: traduzir partialFilterExpression para WHERE */

## Lead → `lead`
Arquivo: `models/Lead.js`

- `nome` text • NOT NULL
- `contato` text • NOT NULL
- `email` text • NOT NULL | UNIQUE
- `nascimento` timestamptz
- `endereco` text
- `cpf` text • UNIQUE
- `rg` text
- `nacionalidade` text
- `estado_civil` text • ENUM(Solteiro(a),Casado(a),Divorciado(a),Viúvo(a),União Estável,Outro)
- `profissao` text
- `nascimento` timestamptz
- `endereco` text
- `coadquirentes` jsonb
- `situacao_id` uuid • NOT NULL → FK lead_stage.id
- `motivo_descarte_id` uuid → FK discard_reason.id
- `comentario` text
- `origem_id` uuid • NOT NULL → FK origem.id
- `responsavel_id` uuid • NOT NULL → FK user.id
- `company_id` uuid • NOT NULL → FK company.id
- `tags` text[]
- `submitted_by_broker_id` uuid → FK broker_contact.id
- `corretor_responsavel_id` uuid → FK broker_contact.id
- `approval_status` text • ENUM(Aprovado,Pendente,Rejeitado)


**Índices compostos**:
- INDEX ( company, contato ) { unique:true, sparse:true }
- INDEX ( company, email ) { unique:true, sparse:true }

## LeadHistory → `lead_history`
Arquivo: `models/LeadHistory.js`

- `lead_id` uuid • NOT NULL → FK lead.id
- `user_id` uuid → FK user.id
- `action` text • NOT NULL | ENUM(CRIACAO,ATUALIZACAO,DESCARTE,REATIVACAO,RESERVA_CRIADA,RESERVA_CANCELADA,RESERVA_EXPIRADA,RESERVA_EXCLUIDA,PROPOSTA_CRIADA,RESERVA_CANCELADA_STATUS_LEAD,UNIDADE_LIBERADA,PROPOSTA_CONTRATO_CRIADA,PROPOSTA_STATUS_ALTERADO,VENDA_CONCRETIZADA,DISTRATO_REALIZADO,PROPOSTA_STATUS_ASSINADO,PROPOSTA_STATUS_VENDIDO,PROPOSTA_STATUS_RECUSADO,PROPOSTA_STATUS_CANCELADO,PROPOSTA_STATUS_DISTRATO_REALIZADO,DISTRATO_REALIZADO,PROPOSTA_STATUS_AGUARDANDO_ASSINATURA_CLIENTE,PROPOSTA_CONTRATO_EDITADA,PROPOSTA_STATUS_AGUARDANDO_APROVAÇÕES,EDICAO_DADOS)
- `details` text



## LeadRequest → `lead_request`
Arquivo: `models/LeadRequest.js`

- `company_id` uuid • NOT NULL → FK company.id
- `nome` text • NOT NULL
- `contato` text • NOT NULL
- `email` text
- `nascimento` timestamptz
- `endereco` text
- `cpf` text
- `rg` text
- `nacionalidade` text
- `estado_civil` text • ENUM(Solteiro(a),Casado(a),Divorciado(a),Viúvo(a),União Estável,Outro)
- `profissao` text
- `comentario` text
- `origem_id` uuid → FK origem.id
- `coadquirentes` jsonb
- `corretor_responsavel_id` uuid • NOT NULL → FK broker_contact.id
- `submitted_by_broker_id` uuid • NOT NULL → FK broker_contact.id
- `tags` text[]
- `status` text • ENUM(Pendente,Aprovado,Rejeitado)
- `reject_reason` text


**Índices compostos**:
- INDEX ( company, contato, status ) 
- INDEX ( company, email, status ) { sparse:true }

## LeadStage → `lead_stage`
Arquivo: `models/LeadStage.js`

- `nome` text • NOT NULL
- `company_id` uuid • NOT NULL → FK company.id
- `ativo` boolean
- `ordem` numeric


**Índices compostos**:
- INDEX ( company, nome ) { unique:true }
- INDEX ( company, ordem ) 

## Message → `message`
Arquivo: `models/Message.js`

- `conversation_id` uuid • NOT NULL → FK conversation.id
- `company_id` uuid • NOT NULL → FK company.id
- `channel_message_id` text • UNIQUE
- `direction` text • NOT NULL | ENUM(incoming,outgoing)
- `sender_id` text
- `content_type` text • NOT NULL | ENUM(text,image,audio,document,other)
- `content` text • NOT NULL
- `media_url` text
- `media_mime_type` text
- `read` boolean
- `status` text • ENUM(sent,delivered,read,failed)


**Índices compostos**:
- INDEX ( conversation, created_at DESC ) 

## ModeloContrato → `modelo_contrato`
Arquivo: `models/ModeloContrato.js`

- `nome_modelo` text • NOT NULL
- `tipo_documento` text • NOT NULL | ENUM(Proposta,Contrato de Reserva,Contrato de Compra e Venda,Outro)
- `conteudo_htmltemplate` text • NOT NULL
- `placeholders_disponiveis` jsonb
- `company_id` uuid • NOT NULL → FK company.id
- `ativo` boolean


**Índices compostos**:
- INDEX ( nome_modelo, company ) { unique:true }

## Origem → `origem`
Arquivo: `models/origem.js`

- `nome` text • NOT NULL
- `descricao` text
- `company_id` uuid • NOT NULL → FK company.id
- `ativo` boolean


**Índices compostos**:
- INDEX ( company, nome ) { unique:true }

## Parcela → `parcela`
Arquivo: `models/Parcela.js`

- `tipo_parcela` text • NOT NULL | ENUM(ATO,PARCELA MENSAL,PARCELA BIMESTRAL,PARCELA TRIMESTRAL,PARCELA SEMESTRAL,INTERCALADA,ENTREGA DE CHAVES,FINANCIAMENTO,OUTRA)
- `quantidade` numeric
- `valor_unitario` numeric • NOT NULL
- `vencimento_primeira` timestamptz • NOT NULL
- `observacao` text



## PropostaContrato → `proposta_contrato`
Arquivo: `models/PropostaContrato.js`

- `lead_id` uuid • NOT NULL → FK lead.id
- `reserva_id` uuid • NOT NULL | UNIQUE → FK reserva.id
- `imovel` uuid • NOT NULL
- `tipo_imovel` text • NOT NULL | ENUM(Unidade,ImovelAvulso)
- `company_id` uuid • NOT NULL → FK company.id
- `adquirentes_snapshot` jsonb • NOT NULL
- `modelo_contrato_utilizado_id` uuid → FK modelo_contrato.id
- `autentique_document_id` text
- `signatarios` jsonb
- `status_assinatura` text • ENUM(Não Enviado,Aguardando Assinaturas,Finalizado,Recusado)
- `preco_tabela_unidade_no_momento` numeric • NOT NULL
- `valor_proposta_contrato` numeric • NOT NULL
- `valor_desconto_concedido` numeric
- `valor_entrada` numeric
- `condicoes_pagamento_gerais` text
- `dados_bancarios_para_pagamento` jsonb
- `plano_de_pagamento` jsonb
- `corretagem` jsonb
- `regras_de_reajuste` jsonb
- `corpo_contrato_htmlgerado` text • NOT NULL
- `data_proposta` timestamptz
- `data_assinatura_cliente` timestamptz
- `data_venda_efetivada` timestamptz
- `status_proposta_contrato` text • NOT NULL | ENUM(Em Elaboração,Aguardando Aprovações,Aguardando Assinatura Cliente,Assinado,Vendido,Recusado,Cancelado,Distrato Realizado)
- `responsavel_negociacao_id` uuid • NOT NULL → FK user.id
- `created_by_id` uuid • NOT NULL → FK user.id
- `observacoes_internas_proposta` text
- `data_distrato` timestamptz
- `motivo_distrato` text



## Reserva → `reserva`
Arquivo: `models/Reserva.js`

- `lead_id` uuid • NOT NULL → FK lead.id
- `imovel` uuid • NOT NULL
- `tipo_imovel` text • NOT NULL | ENUM(Unidade,ImovelAvulso)
- `company_id` uuid → FK company.id
- `data_reserva` timestamptz • NOT NULL
- `validade_reserva` timestamptz • NOT NULL
- `valor_sinal` numeric
- `observacoes_reserva` text
- `status_reserva` text • NOT NULL
- `created_by_id` uuid • NOT NULL → FK user.id
- `proposta_id` uuid → FK proposta.id
- `venda_id` uuid → FK venda.id


**Índices compostos**:
- INDEX ( imovel, status_reserva ) { unique:true, partialFilterExpression:true, name:imovel_statusReserva_ativa_unique_idx } /* TODO: traduzir partialFilterExpression para WHERE */

## Task → `task`
Arquivo: `models/Task.js`

- `title` text • NOT NULL
- `description` text
- `status` text • ENUM(Pendente,Concluída)
- `due_date` timestamptz • NOT NULL
- `lead_id` uuid • NOT NULL → FK lead.id
- `assigned_to_id` uuid • NOT NULL → FK user.id
- `company_id` uuid • NOT NULL → FK company.id
- `created_by_id` uuid • NOT NULL → FK user.id


**Índices compostos**:
- INDEX ( company, status, due_date ) 

## Transacao → `transacao`
Arquivo: `models/Transacao.js`

- `parcela_id` uuid • NOT NULL → FK parcela.id
- `contrato_id` uuid • NOT NULL → FK proposta_contrato.id
- `sacado_id` uuid • NOT NULL → FK lead.id
- `company_id` uuid • NOT NULL → FK company.id
- `valor` numeric • NOT NULL
- `metodo_pagamento` text • NOT NULL | ENUM(PIX,Transferência,Boleto,Cartão,Dinheiro,Outro)
- `data_transacao` timestamptz • NOT NULL
- `registrado_por_id` uuid • NOT NULL → FK user.id
- `comprovante_url` text



## Unidade → `unidade`
Arquivo: `models/Unidade.js`

- `empreendimento_id` uuid • NOT NULL → FK empreendimento.id
- `identificador` text • NOT NULL
- `tipologia` text
- `area_util` numeric
- `area_total` numeric
- `preco_tabela` numeric
- `status_unidade` text • NOT NULL
- `descricao` text
- `destaque` boolean
- `company_id` uuid • NOT NULL → FK company.id
- `ativo` boolean
- `current_lead_id` uuid → FK lead.id
- `current_reserva_id` uuid → FK reserva.id
- `current_lead_id` uuid → FK lead.id
- `current_reserva_id` uuid • UNIQUE → FK reserva.id


**Índices compostos**:
- INDEX ( empreendimento, identificador ) { unique:true }

## User → `user`
Arquivo: `models/User.js`

- `nome` text • NOT NULL
- `email` text • NOT NULL | UNIQUE
- `senha` text
- `perfil` text • NOT NULL | ENUM(admin,corretor)
- `company_id` uuid • NOT NULL → FK company.id
- `google_id` text • UNIQUE
- `ativo` boolean
- `google_refresh_token` text



