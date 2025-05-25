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

/**
 * Cria uma nova Proposta/Contrato a partir de uma Reserva ativa.
 * @param {string} reservaId - ID da Reserva ativa.
 * @param {object} propostaContratoData - Dados específicos da proposta/contrato (valor, condições, parcelas, corretagem, corpoHTML, etc.).
 * @param {string} companyId - ID da Empresa do usuário logado.
 * @param {string} creatingUserId - ID do Usuário do CRM que está criando.
 * @returns {Promise<PropostaContrato>} A Proposta/Contrato criada.
 */
const createPropostaContrato = async (reservaId, propostaContratoData, companyId, creatingUserId) => {
    console.log(`[PropContSvc] Criando Proposta/Contrato a partir da Reserva ID: ${reservaId} para Company: ${companyId} por User: ${creatingUserId}`);

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

        // 2. Buscar dados da Empresa Vendedora (Company logada)
        const empresaVendedora = await Company.findById(companyId).lean().session(session); // Usar .lean() se não for modificar
        if (!empresaVendedora) {
            throw new Error("Empresa vendedora não encontrada.");
        }

        // 3. Verificar se já existe uma Proposta/Contrato para esta reserva
        const propostaExistente = await PropostaContrato.findOne({ reserva: reservaId }).session(session);
        if (propostaExistente) {
            throw new Error(`Já existe uma proposta/contrato (ID: ${propostaExistente._id}, Status: ${propostaExistente.statusPropostaContrato}) para esta reserva.`);
        }


        // 4. Preparar dados para o novo PropostaContrato
        const dadosParaNovaProposta = {
            ...propostaContratoData, // Contém valorPropostaContrato, planoDePagamento, corretagem, corpoContratoHTML, etc.
            lead: reserva.lead._id,
            reserva: reserva._id,
            unidade: reserva.unidade._id,
            empreendimento: reserva.empreendimento._id,
            company: companyId,
            createdBy: creatingUserId,
            // Dados Snapshot (Pegar do momento da criação da proposta)
            empreendimentoNomeSnapshot: reserva.empreendimento.nome,
            unidadeIdentificadorSnapshot: reserva.unidade.identificador,
            unidadeTipologiaSnapshot: reserva.unidade.tipologia,
            unidadeAreaUtilSnapshot: reserva.unidade.areaUtil,
            precoTabelaUnidadeNoMomento: reserva.unidade.precoTabela, // Preço da unidade no momento da reserva/proposta
            // Dados da Empresa Vendedora (Snapshot)
            vendedorNomeFantasia: empresaVendedora.nome, // Assumindo que 'nome' é o nome fantasia
            vendedorRazaoSocial: empresaVendedora.razaoSocial || empresaVendedora.nome, // Se tiver razaoSocial
            vendedorCnpj: empresaVendedora.cnpj,
            vendedorEndereco: `${empresaVendedora.endereco?.logradouro || ''}, ${empresaVendedora.endereco?.numero || ''} - ${empresaVendedora.endereco?.bairro || ''}, <span class="math-inline">\{empresaVendedora\.endereco?\.cidade \|\| ''\}/</span>{empresaVendedora.endereco?.uf || ''}`, // Formatar endereço
            vendedorRepresentanteNome: empresaVendedora.representanteLegalNome || null, // Campos a serem adicionados no model Company
            vendedorRepresentanteCpf: empresaVendedora.representanteLegalCPF || null,  // Campos a serem adicionados no model Company

            statusPropostaContrato: propostaContratoData.statusPropostaContrato || "Em Elaboração", // Default
            dataProposta: propostaContratoData.dataProposta || new Date(),
        };

        // Calcula desconto se valorPropostaContrato e precoTabelaUnidadeNoMomento estiverem presentes
        if (dadosParaNovaProposta.precoTabelaUnidadeNoMomento && dadosParaNovaProposta.valorPropostaContrato) {
            dadosParaNovaProposta.valorDescontoConcedido = dadosParaNovaProposta.precoTabelaUnidadeNoMomento - dadosParaNovaProposta.valorPropostaContrato;
        }


        const novaPropostaContrato = new PropostaContrato(dadosParaNovaProposta);
        const propostaSalva = await novaPropostaContrato.save({ session });

        // 5. Atualizar Status da Reserva
        reserva.statusReserva = "ConvertidaEmProposta";
        reserva.propostaId = propostaSalva._id; // Vincula a proposta à reserva
        await reserva.save({ session });

        // 6. Atualizar Status do Lead
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
            } else {
                throw new Error("Lead da reserva não encontrado para atualização de status.");
            }
        }



        // 7. Atualizar Status da Unidade (opcional, pode manter "Reservada" ou mudar para "Com Proposta")
        // reserva.unidade.statusUnidade = "Com Proposta"; // Exemplo
        // await reserva.unidade.save({ session }); 
        // ^^^ Se unidade foi populada e não lean, senão:
        const unidadeDoc = await Unidade.findById(reserva.unidade._id).session(session);
        if (unidadeDoc) {
            // unidadeDoc.statusUnidade = "Com Proposta"; // Decida se quer mudar o status da unidade aqui
            // await unidadeDoc.save({session});
        }


        // 8. Registrar no Histórico do Lead
        const leadStatusAntigoNome = await LeadStage.findById(oldLeadStatusId).select('nome').lean();
        await logHistory(
            reserva.lead._id,
            creatingUserId,
            "PROPOSTA_CONTRATO_CRIADA",
            `Proposta/Contrato (ID: ${propostaSalva._id}) criada para unidade <span class="math-inline">\{reserva\.unidade\.identificador\}\. Lead movido de "</span>{leadStatusAntigoNome?.nome || 'N/A'}" para "${situacaoProposta.nome}".`,
            { propostaContratoId: propostaSalva._id, reservaId: reserva._id },
            null, // newValue
            'PropostaContrato', // entityType
            propostaSalva._id,  // entityId
            session
        );

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

// Outras funções: getPropostaContratoById, updateStatusPropostaContrato, etc.

module.exports = {
    createPropostaContrato
};