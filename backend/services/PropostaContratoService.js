// backend/services/PropostaContratoService.js
const mongoose = require('mongoose');
const PropostaContrato = require('../models/PropostaContrato');
const Reserva = require('../models/Reserva');
const Lead = require('../models/Lead');
const Unidade = require('../models/Unidade');
const Empreendimento = require('../models/Empreendimento');
const Company = require('../models/Company'); 
const LeadStage = require('../models/LeadStage');
const { logHistory } = require('./LeadService');
const User = require('../models/User');
const ModeloContrato = require('../models/ModeloContrato');
const BrokerContact = require('../models/BrokerContact');


/**
 * Cria uma nova Proposta/Contrato a partir de uma Reserva ativa.
 * @param {string} reservaId - ID da Reserva ativa.
 * @param {object} propostaContratoData - Dados específicos da proposta/contrato (valor, condições, parcelas, corretagem, corpoHTML, etc.).
 * @param {string} companyId - ID da Empresa do usuário logado.
 * @param {string} creatingUserId - ID do Usuário do CRM que está criando.
 * @returns {Promise<PropostaContrato>} A Proposta/Contrato criada.
 */
const createPropostaContrato = async (reservaId, propostaContratoData, companyId, creatingUserId) => {
    console.log(`[PropContSvc] Criando Proposta/Contrato da Reserva ${reservaId} usando Modelo ID ${propostaContratoData.modeloContratoId}`);

    console.log(`[PropContSvc] Iniciando createPropostaContrato.`);
    console.log(`[PropContSvc] Reserva ID: ${reservaId}`);
    // VVVVV LOG IMPORTANTE AQUI VVVVV
    console.log("[PropContSvc] propostaContratoData RECEBIDO PELO SERVIÇO:", JSON.stringify(propostaContratoData, null, 2));
    // ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    console.log(`[PropContSvc] Company ID: ${companyId}, Creating User ID: ${creatingUserId}`);

    // Validações básicas
    if (!mongoose.Types.ObjectId.isValid(reservaId) ||
        !mongoose.Types.ObjectId.isValid(companyId) ||
        !mongoose.Types.ObjectId.isValid(creatingUserId)) {
        throw new Error("IDs inválidos fornecidos (Reserva, Empresa ou Usuário Criador).");
    }
    if (!propostaContratoData || typeof propostaContratoData !== 'object') {
        throw new Error("Dados da proposta/contrato são obrigatórios.");
    }
    if (!propostaContratoData.valorPropostaContrato || typeof propostaContratoData.valorPropostaContrato !== 'number') {
        throw new Error("Valor da Proposta/Contrato é obrigatório e deve ser um número.");
    }
     if (!propostaContratoData.responsavelNegociacao || !mongoose.Types.ObjectId.isValid(propostaContratoData.responsavelNegociacao)) {
        throw new Error("Responsável pela Negociação (ID de Usuário válido) é obrigatório.");
    }


    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // 1. Buscar a Reserva e seus dados populados
        console.log("[PropContSvc] Buscando Reserva, Lead, Unidade, Empreendimento...");
        const reserva = await Reserva.findOne({ _id: reservaId, company: companyId, statusReserva: "Ativa" })
            .populate('lead')
            .populate('unidade')
            .populate('empreendimento')
            .session(session);

        if (!reserva) {
            throw new Error(`Reserva ativa com ID ${reservaId} não encontrada para esta empresa.`);
        }
        if (!reserva.lead || !reserva.unidade || !reserva.empreendimento) {
            throw new Error("Dados da reserva (Lead, Unidade ou Empreendimento) estão incompletos.");
        }
        console.log("[PropContSvc] Reserva e dados associados encontrados.");

        // 2. Buscar dados da Empresa Vendedora (Company logada)
        const empresaVendedora = await Company.findById(companyId).lean().session(session);
        if (!empresaVendedora) {
            throw new Error("Empresa vendedora não encontrada.");
        }
        console.log("[PropContSvc] Empresa vendedora encontrada.");


        // 3. Buscar o Modelo de Contrato selecionado
        if (!propostaContratoData.modeloContratoUtilizado || !mongoose.Types.ObjectId.isValid(propostaContratoData.modeloContratoUtilizado)) {
            throw new Error("ID do Modelo de Contrato válido é obrigatório.");
        }
        console.log("[PropContSvc] Nenhuma proposta existente para esta reserva.");

        const modeloContrato = await ModeloContrato.findOne({ 
            _id: propostaContratoData.modeloContratoUtilizado, // <<< USE O NOME CORRETO AQUI
            company: companyId, 
            ativo: true 
        }).lean();
        if (!modeloContrato) {
            throw new Error("Modelo de Contrato selecionado não encontrado, inativo ou não pertence a esta empresa.");
        }

        console.log(`[PropContSvc] Modelo de Contrato '${modeloContrato.nomeModelo}' encontrado.`);

        // 4. Montar o objeto de dados para substituir os placeholders no template
        // Este objeto precisa conter todas as chaves que seus placeholders esperam (ex: {{lead_nome}})
        const dadosParaTemplate = {
            // Dados do Vendedor (Empresa do CRM)
            vendedor_nome_fantasia: empresaVendedora.nome,
            vendedor_razao_social: empresaVendedora.razaoSocial || empresaVendedora.nome,
            vendedor_cnpj: empresaVendedora.cnpj, // Adicionar formatação se necessário
            vendedor_endereco_completo: `${empresaVendedora.endereco?.logradouro || ''}, ${empresaVendedora.endereco?.numero || ''} - ${empresaVendedora.endereco?.bairro || ''}, ${empresaVendedora.endereco?.cidade || ''}/${empresaVendedora.endereco?.uf || ''} - CEP: ${empresaVendedora.endereco?.cep || ''}`,
            vendedor_representante_nome: empresaVendedora.representanteLegalNome || '', // Adicionar ao Company Model
            vendedor_representante_cpf: empresaVendedora.representanteLegalCPF || '',   // Adicionar ao Company Model

            // Dados do Comprador (Lead)
            lead_nome: reserva.lead.nome,
            lead_cpf: reserva.lead.cpf || '', // Adicionar formatação se necessário
            lead_rg: reserva.lead.rg || '', // Adicionar 'rg' ao Lead Model
            lead_endereco_completo: reserva.lead.endereco || '',
            lead_estado_civil: reserva.lead.estadoCivil || '', // Adicionar 'estadoCivil' ao Lead Model
            lead_profissao: reserva.lead.profissao || '',     // Adicionar 'profissao' ao Lead Model
            lead_nacionalidade: reserva.lead.nacionalidade || 'Brasileiro(a)', // Adicionar 'nacionalidade' ao Lead Model
            lead_email: reserva.lead.email || '',
            lead_telefone: reserva.lead.contato || '', // Já formatado

            // Dados do Imóvel (Empreendimento e Unidade)
            empreendimento_nome: reserva.empreendimento.nome,
            unidade_identificador: reserva.unidade.identificador,
            unidade_tipologia: reserva.unidade.tipologia,
            unidade_area_privativa: reserva.unidade.areaUtil ? `${reserva.unidade.areaUtil}m²` : '_m²',
            empreendimento_endereco_completo: `${reserva.empreendimento.localizacao?.logradouro || ''}, ${reserva.empreendimento.localizacao?.numero || ''} - ${reserva.empreendimento.localizacao?.bairro || ''}, ${reserva.empreendimento.localizacao?.cidade || ''}/${reserva.empreendimento.localizacao?.uf || ''}`,
            unidade_memorial_incorporacao: reserva.empreendimento.memorialIncorporacao || 'Não Registrado', // Adicionar ao Empreendimento Model
            unidade_matricula: reserva.unidade.matriculaImovel || 'Não Registrado', // Adicionar ao Unidade Model

            // Dados da Transação (da propostaContratoData)
            proposta_valor_total_formatado: `R$ ${propostaContratoData.valorPropostaContrato.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            proposta_valor_entrada_formatado: propostaContratoData.valorEntrada ? `R$ ${propostaContratoData.valorEntrada.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A',
            proposta_condicoes_pagamento_gerais: propostaContratoData.condicoesPagamentoGerais || '',
            
            // Dados Bancários para Pagamento (do propostaContratoData)
            pagamento_banco_nome: propostaContratoData.dadosBancariosParaPagamento?.bancoNome || '_',
            pagamento_agencia: propostaContratoData.dadosBancariosParaPagamento?.agencia || '_',
            pagamento_conta_corrente: propostaContratoData.dadosBancariosParaPagamento?.contaCorrente || '_',
            pagamento_cnpj_favorecido: propostaContratoData.dadosBancariosParaPagamento?.cnpjPagamento || '_',
            pagamento_pix: propostaContratoData.dadosBancariosParaPagamento?.pix || '_',

            // Plano de Pagamento (transformar em uma tabela HTML ou string formatada)
            plano_pagamento_string_formatada: (propostaContratoData.planoDePagamento || [])
                .map(p => `${p.quantidade}x ${p.tipoParcela} de R$ ${p.valorUnitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (1º Venc: ${new Date(p.vencimentoPrimeira).toLocaleDateString('pt-BR')}) ${p.observacao || ''}`)
                .join('\n'),
            
            // Corretagem
            corretagem_valor_formatado: propostaContratoData.corretagem?.valorCorretagem ? `R$ ${propostaContratoData.corretagem.valorCorretagem.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A',
            // Para corretor_nome, etc., precisaria buscar o BrokerContact
            corretagem_condicoes: propostaContratoData.corretagem?.condicoesPagamentoCorretagem || '_',

            // Outros
            data_proposta_extenso: new Date(propostaContratoData.dataProposta || Date.now()).toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' }),
            cidade_contrato: empresaVendedora.endereco?.cidade || '_',
        };

        console.log("[PropContSvc] Corpo do contrato HTML preparado/processado.");

        // Se precisar de dados do BrokerContact, buscar aqui:
        if (propostaContratoData.corretagem?.corretorPrincipal) {
            const BrokerContactModel = mongoose.model('BrokerContact'); // Assumindo que o modelo é 'BrokerContact'
            const corretor = await BrokerContactModel.findById(propostaContratoData.corretagem.corretorPrincipal).lean();
            if (corretor) {
                dadosParaTemplate.corretor_principal_nome = corretor.nome;
                dadosParaTemplate.corretor_principal_cpf_cnpj = corretor.cpfCnpj; // Assumindo campo
                dadosParaTemplate.corretor_principal_creci = corretor.registroProfissional; // Assumindo campo
            }
            console.log(`[PropContSvc] Corretor Principal ${corretor.nome} validado.`);

        }

        // 5
        let corpoContratoProcessado = modeloContrato.conteudoHTMLTemplate;
        for (const key in dadosParaTemplate) {
            const placeholder = `{{${key}}}`;
            // Use uma regex global para substituir todas as ocorrências
            corpoContratoProcessado = corpoContratoProcessado.replace(new RegExp(placeholder.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), dadosParaTemplate[key] || '');
        }

        

        //6. Preparar dados para o novo PropostaContrato
        const dadosParaNovaProposta = {
            ...propostaContratoData,
            lead: reserva.lead._id,
            reserva: reserva._id,
            unidade: reserva.unidade._id,
            empreendimento: reserva.empreendimento._id,
            company: companyId,
            createdBy: creatingUserId,
            modeloContratoUtilizado: propostaContratoData.modeloContratoUtilizado,
            corpoContratoHTMLGerado: corpoContratoProcessado, // <<< HTML COM DADOS PREENCHIDOS

            empreendimentoNomeSnapshot: reserva.empreendimento.nome,
            unidadeIdentificadorSnapshot: reserva.unidade.identificador,
            unidadeTipologiaSnapshot: reserva.unidade.tipologia,
            unidadeAreaUtilSnapshot: reserva.unidade.areaUtil,
            precoTabelaUnidadeNoMomento: reserva.unidade.precoTabela,
            
            vendedorNomeFantasia: empresaVendedora.nome,
            vendedorRazaoSocial: empresaVendedora.razaoSocial || empresaVendedora.nome,
            vendedorCnpj: empresaVendedora.cnpj,
            vendedorEndereco: `${empresaVendedora.endereco?.logradouro || ''}, ${empresaVendedora.endereco?.numero || ''} - ${empresaVendedora.endereco?.bairro || ''}, ${empresaVendedora.endereco?.cidade || ''}/${empresaVendedora.endereco?.uf || ''}`,
            vendedorRepresentanteNome: empresaVendedora.representanteLegalNome || null,
            vendedorRepresentanteCpf: empresaVendedora.representanteLegalCPF || null,

            statusPropostaContrato: propostaContratoData.statusPropostaContrato || "Em Elaboração",
            dataProposta: propostaContratoData.dataProposta || new Date(),
        };

       console.log("[PropContSvc DEBUG] Objeto dadosParaNovaProposta montado:", JSON.stringify(dadosParaNovaProposta, null, 2));


        const novaPropostaContrato = new PropostaContrato(dadosParaNovaProposta);
                console.log("[PropContSvc DEBUG] Tentando salvar nova PropostaContrato...");

        const propostaSalva = await novaPropostaContrato.save({ session });
                console.log("[PropContSvc DEBUG] Tentando salvar nova PropostaContrato...");

        // 7. Atualizar Status da Reserva
        console.log(`[PropContSvc] Atualizando Reserva ${reserva._id}...`);
        reserva.statusReserva = "ConvertidaEmProposta";
        reserva.propostaId = propostaSalva._id;
        await reserva.save({ session });

        // 8. Atualizar Status do Lead
        console.log(`[PropContSvc] Atualizando Lead ${reserva.lead._id}...`);

        const nomeEstagioProposta = "Proposta Emitida"; // Ou o nome que você definiu
        let situacaoProposta = await LeadStage.findOne(
            { company: companyId, nome: { $regex: new RegExp(`^${nomeEstagioProposta}$`, "i") } }
        ).session(session).lean(); // Busca primeiro, usando a sessão e .lean() para performance

        if (!situacaoProposta) {
            console.log(`[PropContSvc] Estágio '${nomeEstagioProposta}' não encontrado para Company ${companyId}. Criando...`);
            try {
                const novoEstagioProposta = new LeadStage({
                    nome: nomeEstagioProposta,
                    company: companyId,
                    ativo: true,
                    descricao: "Proposta comercial/contrato gerado para o lead."
                });
                situacaoProposta = await novoEstagioProposta.save({ session });
                console.log(`[PropContSvc] Estágio '${nomeEstagioProposta}' criado com ID: ${situacaoProposta._id}`);
            } catch (creationError) {
                
                console.error(`[PropContSvc] Falha ao tentar criar estágio padrão '${nomeEstagioProposta}':`, creationError);
        
                throw new Error(`Falha ao criar/encontrar estágio de lead '${nomeEstagioProposta}'. ${creationError.message}`);
            }
        }
        
        if (!situacaoProposta || !situacaoProposta._id) { // Checagem extra de segurança
            throw new Error (`Estágio '${nomeEstagioProposta}' não pôde ser encontrado ou criado para a empresa.`);
        }
        
        console.log(`[PropContSvc] Usando Estágio '${nomeEstagioProposta}' (ID: ${situacaoProposta._id}) para o Lead.`);

        const oldLeadStatusId = reserva.lead.situacao; // Supondo que reserva.lead foi populado
        
        if (reserva.lead && typeof reserva.lead.save === 'function') {
             reserva.lead.situacao = situacaoProposta._id;
             await reserva.lead.save({session});
        } else { // Se reserva.lead é um objeto lean, ou para garantir, buscamos e salvamos
            const leadDocParaAtualizar = await Lead.findById(reserva.lead._id || reserva.lead).session(session);
            if(leadDocParaAtualizar){
                leadDocParaAtualizar.situacao = situacaoProposta._id;
                await leadDocParaAtualizar.save({session});
                console.log(`[PropContSvc] Lead ${leadDocParaAtualizar._id} atualizado para status ${situacaoProposta.nome}.`);

            } else {
                throw new Error("Lead da reserva não encontrado para atualização de status.");
            }
        }



        // 9. Atualizar Status da Unidade (opcional, pode manter "Reservada" ou mudar para "Com Proposta")
        reserva.unidade.statusUnidade = "Proposta"; // Exemplo
         await reserva.unidade.save({ session }); 
        // ^^^ Se unidade foi populada e não lean, senão:
        const unidadeDoc = await Unidade.findById(reserva.unidade._id).session(session);
        if (unidadeDoc) {
            unidadeDoc.statusUnidade = "Proposta";
            await unidadeDoc.save({session});
        }


        // 10. Registrar no Histórico do Lead
        const leadStatusAntigoNome = await LeadStage.findById(oldLeadStatusId).select('nome').lean();
        await logHistory(
            reserva.lead._id,
            creatingUserId,
            "PROPOSTA_CONTRATO_CRIADA",
            `Proposta/Contrato (ID: ${propostaSalva._id}) criada para unidade ${reserva.unidade.identificador}. Lead movido de "${leadStatusAntigoNome?.nome || 'N/A'}" para "${situacaoProposta.nome}".`,
            { propostaContratoId: propostaSalva._id, reservaId: reserva._id },
            null, // newValue
            'PropostaContrato', // entityType
            propostaSalva._id,  // entityId
            session
        );
            console.log("[PropContSvc] Histórico registrado.");

        await session.commitTransaction();
        console.log(`[PropContSvc] Proposta/Contrato ${propostaSalva._id} criada com sucesso.`);
        return propostaSalva;

    } catch (error) {
        await session.abortTransaction();
        console.error("[PropContSvc] Erro ao criar Proposta/Contrato:", error);
        // Tratar erro de índice único para reserva._id em PropostaContrato se já existir
        if (error.code === 11000 && error.message.includes("reserva_1")) { // Assumindo que 'reserva' é unique
            throw new Error(`Já existe uma proposta/contrato vinculada a esta reserva.`);
        }
        throw new Error(error.message || "Erro interno ao criar a Proposta/Contrato.");
    } finally {
        session.endSession();
    }
};

const preencherTemplateContrato = (templateHtml = "", dados = {}) => {
  let corpoProcessado = templateHtml;
  for (const key in dados) {
    const placeholder = `{{${key}}}`;
    corpoProcessado = corpoProcessado.replace(
      new RegExp(placeholder.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'),
      dados[key] !== null && dados[key] !== undefined ? dados[key] : ''
    );
  }
  return corpoProcessado;
};

/**
 * Busca uma Proposta/Contrato específica por seu ID, garantindo que pertence à empresa.
 * @param {string} propostaContratoId - ID da Proposta/Contrato.
 * @param {string} companyId - ID da Empresa.
 * @returns {Promise<PropostaContrato|null>} A Proposta/Contrato encontrada ou null.
 */
const getPropostaContratoById = async (propostaContratoId, companyId) => {
    if (!mongoose.Types.ObjectId.isValid(propostaContratoId) || !mongoose.Types.ObjectId.isValid(companyId)) {
        throw new Error("ID da Proposta/Contrato ou da Empresa inválido.");
    }
    console.log(`[PropContSvc] Buscando Proposta/Contrato ID: ${propostaContratoId} para Company: ${companyId}`);
    try {
        const propostaContrato = await PropostaContrato.findOne({ _id: propostaContratoId, company: companyId })
            .populate({ path: 'lead', select: 'nome email contato cpf rg estadoCivil profissao nacionalidade' })
            .populate({ path: 'unidade', select: 'identificador tipologia areaUtil empreendimento', populate: { path: 'empreendimento', select: 'nome localizacao memorialIncorporacao'} })
            .populate({ path: 'empreendimento', select: 'nome localizacao memorialIncorporacao' }) // Pode já vir pelo populate da unidade
            .populate({ path: 'reserva', select: 'dataReserva validadeReserva valorSinal' })
            .populate({ path: 'modeloContratoUtilizado', select: 'nomeModelo tipoDocumento' })
            .populate({ path: 'responsavelNegociacao', select: 'nome email' })
            .populate({ path: 'createdBy', select: 'nome email' })
            .populate({ path: 'corretagem.corretorPrincipal', model: 'BrokerContact', select: 'nome creci cpfCnpj contato email' }) // Populando corretor principal
            .lean(); // Retorna objeto JS puro

        if (!propostaContrato) {
            console.log(`[PropContSvc] Proposta/Contrato ID: ${propostaContratoId} não encontrada para Company: ${companyId}.`);
            return null;
        }
        // Adicionar dados da empresa vendedora explicitamente se não estiverem no snapshot ou se quiser sempre os mais atuais
        if (propostaContrato.company) {
             const empresaVendedora = await Company.findById(propostaContrato.company).select('nome razaoSocial cnpj endereco representanteLegalNome representanteLegalCPF').lean();
             propostaContrato.dadosEmpresaVendedora = empresaVendedora || {};
        }

        return propostaContrato;
    } catch (error) {
        console.error(`[PropContSvc] Erro ao buscar Proposta/Contrato ${propostaContratoId}:`, error);
        throw new Error("Erro ao buscar Proposta/Contrato por ID.");
    }
};


module.exports = {
    createPropostaContrato,
    preencherTemplateContrato,
    getPropostaContratoById
};