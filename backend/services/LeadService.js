// services/LeadService.js

const mongoose = require("mongoose");
const Lead = require("../models/Lead");
const Origem = require("../models/origem");
const LeadStage = require("../models/LeadStage");
const User = require("../models/User");
const DiscardReason = require("../models/DiscardReason");
const LeadHistory = require("../models/LeadHistory");
const origemService = require("./origemService");
const {
    LEAD_HISTORY_ACTIONS,
    LEAD_STAGE_NOME_DESCARTADO,
    LEAD_STAGE_NOME_EM_RESERVA,
    RESERVA_STATUS,
    UNIDADE_STATUS
} = require('../utils/constants');


const cpfcnpj = require("cpf-cnpj-validator");
const {
  PhoneNumberUtil,
  PhoneNumberFormat: PNF,
} = require("google-libphonenumber");
const phoneUtil = PhoneNumberUtil.getInstance();

const getDefaultAdminUserIdForCompany = async (companyId) => {
  if (!companyId) return null;
  const adminUser = await User.findOne({
    company: companyId,
    perfil: "admin",
    ativo: true,
  })
    .select("_id")
    .lean();
  return adminUser?._id || null;
};


const getDefaultLeadStageIdForCompany = async (companyId, stageName = "Novo") => {
    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) return null;
    let stage = await LeadStage.findOne({ company: companyId, nome: { $regex: new RegExp(`^${stageName}$`, 'i') }, ativo: true });
    if (!stage) {
        try {
            console.log(`[LeadService] Estágio '${stageName}' não encontrado para Company ${companyId}. Tentando criar...`);
            const newStage = new LeadStage({ nome: stageName, company: companyId, ativo: true, ordem: 0 }); // Ajuste 'ordem'
            stage = await newStage.save();
        } catch (error) {
            console.error(`[LeadService] Falha ao criar estágio padrão '${stageName}' para Company ${companyId}:`, error);
            return null;
        }
    }
    return stage?._id || null;
};

const getStageNameById = async (stageId, companyId) => {
    if (!stageId || !mongoose.Types.ObjectId.isValid(stageId)) return 'N/A';
    const stageDoc = await LeadStage.findOne({ _id: stageId, company: companyId }).select('nome').lean();
    return stageDoc?.nome || 'N/A';
};

// --- Função Auxiliar logHistory ---
const logHistory = async (leadId, userId, action, details, oldValue = null, newValue = null, entity = 'Lead', entityId = null, session = null) => {
  try {
    if (!leadId) {
      console.warn("[History] Tentativa de log sem leadId.");
      return;
    }
    const historyData = {
      lead: leadId,
      user: userId || null, // System action if userId is null
      action: action,
      details: details || "",
      oldValue: oldValue ? JSON.stringify(oldValue) : undefined, // Store as JSON string if exists
      newValue: newValue ? JSON.stringify(newValue) : undefined, // Store as JSON string if exists
      entity: entity,
      entityId: entityId
    };
    const historyEntry = new LeadHistory(historyData);

    if (session) {
        await historyEntry.save({ session });
    } else {
        await historyEntry.save();
    }

    console.log(
      `[History] Logged: Lead ${leadId}, Action: ${action}, User: ${userId || "System"}, Entity: ${entity}, EntityID: ${entityId}`
    );
  } catch (error) {
    console.error(
      `[History] FAILED to log for Lead ${leadId}, Action: ${action}, Entity: ${entity}, EntityID: ${entityId}`,
      error
    );
    // Não relançar o erro para não quebrar a operação principal que chamou o log
  }
};

/**
 * Busca leads de uma empresa com filtros avançados e paginação.
 * @param {string} companyId - ID da empresa.
 * @param {object} queryParams - Parâmetros da query (filtros e paginação).
 * @returns {Promise<object>} Objeto com leads e dados de paginação.
 */
const getLeads = async (queryParams = {}, companyId) => {
    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
        throw new Error("ID da empresa inválido ou não fornecido para buscar leads.");
    }

    // Paginação
    const page = parseInt(queryParams.page, 10) || 1;
    const limit = parseInt(queryParams.limit, 10) || 1000; // Limite alto para Kanban, ajuste se necessário
    const skip = (page - 1) * limit;

    // Condições da Query
    const queryConditions = { company: companyId };

    // Filtro unificado por Nome, Email ou CPF (busca textual)
    if (queryParams.termoBusca && queryParams.termoBusca.trim() !== '') {
        const searchTerm = queryParams.termoBusca.trim();
        const searchRegex = { $regex: searchTerm, $options: 'i' };
        const cpfLimpo = searchTerm.replace(/\D/g, "");

        queryConditions.$or = [
            { nome: searchRegex },
            { email: searchRegex },
        ];

        if (cpfLimpo.length > 0) {
            queryConditions.$or.push({ cpf: cpfLimpo });
            queryConditions.$or.push({ contato: { $regex: cpfLimpo } });
        }
    }

    // Filtros por ID
    if (queryParams.origem && mongoose.Types.ObjectId.isValid(queryParams.origem)) {
        queryConditions.origem = queryParams.origem;
    }
    if (queryParams.responsavel && mongoose.Types.ObjectId.isValid(queryParams.responsavel)) {
        queryConditions.responsavel = queryParams.responsavel;
    }

    // Filtro por Tags
    if (queryParams.tags && queryParams.tags.trim() !== '') {
        const tagsArray = queryParams.tags
            .split(',')
            .map(tag => tag.trim().toLowerCase())
            .filter(Boolean);
        if (tagsArray.length > 0) {
            queryConditions.tags = { $all: tagsArray };
        }
    }

    // Filtro por Intervalo de Datas (baseado em createdAt)
    if (queryParams.dataInicio || queryParams.dataFim) {
        queryConditions.createdAt = {};
        if (queryParams.dataInicio) {
            queryConditions.createdAt.$gte = new Date(queryParams.dataInicio + "T00:00:00.000Z");
        }
        if (queryParams.dataFim) {
            queryConditions.createdAt.$lte = new Date(queryParams.dataFim + "T23:59:59.999Z");
        }
    }

    console.log("[getLeads] Condições Query MongoDB:", JSON.stringify(queryConditions, null, 2));

    try {
        // Execução paralela para reduzir tempo de I/O
        const [leads, totalLeads] = await Promise.all([
            Lead.find(queryConditions)
                .populate('situacao', 'nome ordem')
                .populate('origem', 'nome')
                .populate('responsavel', 'nome perfil')
                .sort({ updatedAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Lead.countDocuments(queryConditions)
        ]);

        const totalPages = Math.ceil(totalLeads / limit) || 1;

        return { leads, totalLeads, totalPages, currentPage: page };
    } catch (error) {
        console.error(`[getLeads] Erro ao buscar leads para empresa ${companyId}:`, error);
        throw new Error('Erro ao buscar os leads.');
    }
};

const getLeadById = async (id, companyId) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("ID de Lead inválido.");
  }
  if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
    throw new Error("ID da empresa inválido.");
  }
  try {
    const lead = await Lead.findOne({ _id: id, company: companyId })
      .populate("situacao", "nome ordem")
      .populate("origem", "nome")
      .populate("responsavel", "nome perfil")
      .populate("motivoDescarte", "nome")
      .lean(); // Added .lean()
    if (!lead) throw new Error("Lead não encontrado nesta empresa.");
    return lead;
  } catch (error) {
    console.error(
      `[getLeadById] Erro para lead ${id} / empresa ${companyId}:`,
      error
    );
    throw new Error("Erro ao buscar detalhes do lead.");
  }
};


/**
 * Cria um novo Lead com validação completa.
 * @param {object} leadData - Dados do lead, incluindo coadquirentes e tags.
 * @param {string} companyId - ID da empresa.
 * @param {string|null} userId - ID do usuário que está criando.
 * @returns {Promise<Lead>} O lead criado.
 */
const createLead = async (leadData, companyId, userId) => {
    console.log(`[createLead] Iniciando criação. Empresa: ${companyId}, Usuário: ${userId || 'Sistema'}`);
    
    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
        throw new Error("ID da Empresa inválido.");
    }
    if (userId && !mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error("ID do Usuário criador inválido.");
    }

    const {
        nome, contato, email, cpf, rg, nacionalidade, estadoCivil, profissao,
        nascimento, endereco, comentario, origem, responsavel, situacao,
        tags, coadquirentes
    } = leadData;

    if (!nome || !contato) {
        throw new Error("Nome e Contato são obrigatórios.");
    }

    // 1. Formatação e Validação dos Dados de Entrada
    let formattedPhoneNumber = null;
    try {
        const phoneNumber = phoneUtil.parseAndKeepRawInput(String(contato), 'BR');
        if (phoneUtil.isValidNumber(phoneNumber)) {
            formattedPhoneNumber = phoneUtil.format(phoneNumber, PNF.E164);
        } else { throw new Error(`Número de contato inválido: ${contato}`); }
    } catch (e) { throw new Error(`Formato de contato não reconhecido: ${contato}`); }
    
    const emailFormatado = email?.trim().toLowerCase() || null;
    let cpfLimpo = null;
    if (cpf) {
        cpfLimpo = String(cpf).replace(/\D/g, "");
        if (cpfLimpo && !cpfcnpj.cpf.isValid(cpfLimpo)) throw new Error(`CPF inválido: ${cpf}`);
        if (cpfLimpo === "") cpfLimpo = null;
    }

    // 2. Validação de Duplicados no Banco de Dados
    console.log("[createLead] Verificando duplicados...");
    const duplicateQuery = { company: companyId, $or: [] };
    if (formattedPhoneNumber) duplicateQuery.$or.push({ contato: formattedPhoneNumber });
    if (emailFormatado) duplicateQuery.$or.push({ email: emailFormatado });
    if (cpfLimpo) duplicateQuery.$or.push({ cpf: cpfLimpo });

    if (duplicateQuery.$or.length > 0) {
        const existingLead = await Lead.findOne(duplicateQuery);
        if (existingLead) {
            let errorMessage = "Já existe um lead com estes dados: ";
            if (existingLead.contato === formattedPhoneNumber) errorMessage += `Telefone (${contato}). `;
            if (existingLead.email === emailFormatado) errorMessage += `Email (${email}). `;
            if (existingLead.cpf === cpfLimpo) errorMessage += `CPF (${cpf}). `;
            throw new Error(errorMessage.trim());
        }
    }
    console.log("[createLead] Nenhuma duplicidade encontrada.");

    // 3. Lógica para buscar/definir IDs de relacionamentos
    let responsavelIdFinal = responsavel || userId || await getDefaultAdminUserIdForCompany(companyId);
    let situacaoIdFinal = situacao ? (await LeadStage.findOne({_id: situacao, company: companyId}))?._id : await LeadStage.findOne({ company: companyId, ativo: true, nome: { $ne: "Descartado" } }).sort({ ordem: 1 }).lean();
    let origemIdFinal = origem ? (await Origem.findOne({_id: origem, company: companyId}))?._id : (await origemService.findOrCreateOrigem({ nome: "Sistema Gestor" }, companyId))?._id;

    if (!responsavelIdFinal) console.warn(`[createLead] Não foi possível definir um responsável para o lead.`);
    if (!situacaoIdFinal) throw new Error("Não foi possível definir uma situação válida para o lead.");
    if (!origemIdFinal) throw new Error("Não foi possível definir uma origem válida para o lead.");

    // 4. Processamento de Tags e Coadquirentes
    let processedTags = [];
    if (Array.isArray(tags)) {
        processedTags = [...new Set(tags.map(tag => tag.trim().toLowerCase()).filter(Boolean))];
    }
    
    let processedCoadquirentes = [];
    if (Array.isArray(coadquirentes)) {
        processedCoadquirentes = coadquirentes.map(co => {
            if (!co.nome) throw new Error("O nome de cada coadquirente é obrigatório.");
            const coCpfLimpo = co.cpf ? String(co.cpf).replace(/\D/g, "") : null;
            if (coCpfLimpo && !cpfcnpj.cpf.isValid(coCpfLimpo)) throw new Error(`CPF do coadquirente '${co.nome}' é inválido.`);
            return {
                nome: co.nome.trim(),
                cpf: coCpfLimpo,
                rg: co.rg?.trim() || null,
                nacionalidade: co.nacionalidade?.trim() || 'Brasileiro(a)',
                estadoCivil: co.estadoCivil?.trim() || null,
                profissao: co.profissao?.trim() || null,
                email: co.email?.trim().toLowerCase() || null,
                contato: co.contato?.trim() || null,
                endereco: co.endereco?.trim() || null,
                nascimento: co.nascimento || null,
            };
        });
    }

    // 5. Criação do Novo Lead
    const novoLead = new Lead({
        nome: nome.trim(),
        contato: formattedPhoneNumber,
        email: emailFormatado,
        cpf: cpfLimpo,
        rg: rg?.trim() || null,
        nacionalidade: nacionalidade?.trim() || 'Brasileiro(a)',
        estadoCivil: estadoCivil?.trim() || null,
        profissao: profissao?.trim() || null,
        nascimento: nascimento || null,
        endereco: endereco?.trim() || null,
        coadquirentes: processedCoadquirentes,
        tags: processedTags,
        comentario: comentario || null,
        situacao: situacaoIdFinal,
        origem: origemIdFinal,
        responsavel: responsavelIdFinal,
        company: companyId,
        createdBy: userId,
        ativo: true
    });

    try {
        const leadSalvo = await novoLead.save();
        console.log(`[createLead] Lead criado com sucesso: ${leadSalvo._id}`);
        await logHistory(leadSalvo._id, userId, LEAD_HISTORY_ACTIONS.CRIACAO, "Lead criado no sistema.", null, leadSalvo.toObject(), 'Lead', leadSalvo._id);
        return leadSalvo;
    } catch (error) {
        console.error(`[createLead] Falha ao salvar lead no banco:`, error);
        if (error.code === 11000) {
            throw new Error("Lead duplicado detectado pelo banco de dados (Email, Contato ou CPF).");
        }
        throw new Error(error.message || "Erro ao salvar lead.");
    }
};


/**
 * Atualiza um Lead existente, incluindo dados de coadquirentes e tags.
 * @param {string} id - ID do Lead.
 * @param {object} leadData - Dados para atualizar.
 * @param {string} companyId - ID da empresa.
 * @param {string} userId - ID do usuário que está realizando a ação.
 * @returns {Promise<Lead>} O lead atualizado.
 */
const updateLead = async (id, leadData, companyId, userId) => {
    console.log(`--- [updateLead] Iniciando para ID: ${id}, Empresa: ${companyId}, User: ${userId} ---`);
    if (!mongoose.Types.ObjectId.isValid(id)) throw new Error("ID de Lead inválido.");
    if (!mongoose.Types.ObjectId.isValid(companyId)) throw new Error("ID de Empresa inválido.");
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) throw new Error("ID do usuário (ator) inválido.");

    // --- 1. Busca Lead Existente para Comparações Posteriores ---
    const leadExistente = await Lead.findOne({ _id: id, company: companyId }).populate('situacao');
    if (!leadExistente) {
        throw new Error("Lead não encontrado nesta empresa.");
    }

    const {
        nome, contato, email, cpf, rg, nacionalidade, estadoCivil, profissao,
        nascimento, endereco, comentario, origem, responsavel, situacao, motivoDescarte,
        tags, coadquirentes
    } = leadData;

    const updateFields = {};

    // --- 2. Processamento e Validação dos Dados Recebidos ---

    // Campos de texto simples
    if (nome !== undefined) updateFields.nome = nome.trim();
    if (email !== undefined) updateFields.email = email ? email.trim().toLowerCase() : null;
    if (rg !== undefined) updateFields.rg = rg?.trim() || null;
    if (nacionalidade !== undefined) updateFields.nacionalidade = nacionalidade?.trim() || 'Brasileiro(a)';
    if (estadoCivil !== undefined) updateFields.estadoCivil = estadoCivil?.trim() || null;
    if (profissao !== undefined) updateFields.profissao = profissao?.trim() || null;
    if (nascimento !== undefined) updateFields.nascimento = nascimento || null;
    if (endereco !== undefined) updateFields.endereco = endereco?.trim() || null;

    // Contato (com formatação)
    if (contato !== undefined) {
        if (!contato || String(contato).trim() === "") {
            updateFields.contato = null;
        } else {
            try {
                const phoneNumber = phoneUtil.parseAndKeepRawInput(String(contato), 'BR');
                if (phoneUtil.isValidNumber(phoneNumber)) {
                    updateFields.contato = phoneUtil.format(phoneNumber, PNF.E164);
                } else { throw new Error(`Número de contato inválido: ${contato}`); }
            } catch (e) { throw new Error(`Formato de contato não reconhecido: ${contato}`); }
        }
    }

    // CPF (com formatação)
    if (cpf !== undefined) {
        const cpfLimpo = cpf ? String(cpf).replace(/\D/g, "") : null;
        if (cpfLimpo && !cpfcnpj.cpf.isValid(cpfLimpo)) throw new Error(`CPF inválido: ${cpf}`);
        updateFields.cpf = cpfLimpo;
    }

    // Coadquirentes (substitui o array inteiro)
    if (coadquirentes !== undefined) {
        if (!Array.isArray(coadquirentes)) throw new Error("Coadquirentes deve ser um array.");
        updateFields.coadquirentes = coadquirentes.map(co => {
            if (!co.nome) throw new Error("O nome de cada coadquirente é obrigatório.");
            const coCpfLimpo = co.cpf ? String(co.cpf).replace(/\D/g, "") : null;
            if (coCpfLimpo && !cpfcnpj.cpf.isValid(coCpfLimpo)) throw new Error(`CPF do coadquirente '${co.nome}' é inválido.`);
            return {
                nome: co.nome.trim(),
                cpf: coCpfLimpo || null,
                rg: co.rg?.trim() || null,
                nacionalidade: co.nacionalidade?.trim() || 'Brasileiro(a)',
                estadoCivil: co.estadoCivil?.trim() || null,
                profissao: co.profissao?.trim() || null,
                // Adicione outros campos do coadquirente aqui
            };
        });
    }

    // Tags
    if (tags !== undefined) {
        if (!Array.isArray(tags)) throw new Error("Tags deve ser um array de strings.");
        updateFields.tags = tags
            .filter(tag => typeof tag === 'string' && tag.trim() !== '')
            .map(tag => tag.trim().toLowerCase());
        updateFields.tags = [...new Set(updateFields.tags)];
    }

    // --- 3. Validação de Duplicados (Email, Contato, CPF) ---
    const duplicateCheckQuery = { _id: { $ne: id }, company: companyId, $or: [] };
    if (updateFields.email && updateFields.email !== leadExistente.email) {
        duplicateCheckQuery.$or.push({ email: updateFields.email });
    }
    if (updateFields.contato && updateFields.contato !== leadExistente.contato) {
        duplicateCheckQuery.$or.push({ contato: updateFields.contato });
    }
    if (updateFields.cpf && updateFields.cpf !== leadExistente.cpf) {
        duplicateCheckQuery.$or.push({ cpf: updateFields.cpf });
    }
    if (duplicateCheckQuery.$or.length > 0) {
        const existingLeadWithData = await Lead.findOne(duplicateCheckQuery);
        if (existingLeadWithData) {
            let errorMessage = "Já existe outro lead com estes dados: ";
            if (updateFields.email && existingLeadWithData.email === updateFields.email) errorMessage += `Email. `;
            if (updateFields.contato && existingLeadWithData.contato === updateFields.contato) errorMessage += `Telefone. `;
            if (updateFields.cpf && existingLeadWithData.cpf === updateFields.cpf) errorMessage += `CPF. `;
            throw new Error(errorMessage.trim());
        }
    }

    // --- 4. Processamento de Relacionamentos (Situação, Origem, Responsável) ---
    if (situacao !== undefined) {
        if (!mongoose.Types.ObjectId.isValid(situacao)) throw new Error("ID de Situação inválido.");
        const situacaoDoc = await LeadStage.findOne({ _id: situacao, company: companyId });
        if (!situacaoDoc) throw new Error("Situação inválida ou não pertence a esta empresa.");
        updateFields.situacao = situacao;

        if (situacaoDoc.nome.toLowerCase() === LEAD_STAGE_NOME_DESCARTADO.toLowerCase()) {
            if (!motivoDescarte || !mongoose.Types.ObjectId.isValid(motivoDescarte)) {
                throw new Error(`Motivo de descarte (ID) é obrigatório ao mover o lead para '${LEAD_STAGE_NOME_DESCARTADO}'.`);
            }
            const motivoDoc = await DiscardReason.findOne({ _id: motivoDescarte, company: companyId });
            if (!motivoDoc) throw new Error("Motivo de descarte inválido ou não pertence a esta empresa.");
            updateFields.motivoDescarte = motivoDescarte;
            if (comentario !== undefined) updateFields.comentario = comentario; // Allow comment update when discarding
        } else {
            // If moving out of "Descartado" or to any other non-descartado status, clear motivoDescarte
            updateFields.motivoDescarte = null;
        }
    } else { // If situacao is not being changed, but comentario is
        if (comentario !== undefined) updateFields.comentario = comentario;
    }

    if (origem !== undefined) {
        if (!mongoose.Types.ObjectId.isValid(origem)) throw new Error("ID de Origem inválido.");
        const origemDoc = await Origem.findOne({ _id: origem, company: companyId });
        if (!origemDoc) throw new Error("Origem inválida ou não pertence a esta empresa.");
        updateFields.origem = origem;
    }

    if (responsavel !== undefined) {
        if (!mongoose.Types.ObjectId.isValid(responsavel)) throw new Error("ID de Responsável inválido.");
        const userDoc = await User.findOne({ _id: responsavel, company: companyId });
        if (!userDoc) throw new Error("Responsável inválido ou não pertence a esta empresa.");
        updateFields.responsavel = responsavel;
    }


    if (Object.keys(updateFields).length === 0) {
        console.warn(`[updateLead] Nenhum campo para atualizar ID: ${id}.`);
        return await leadExistente.populate([/* ... seus populates ... */]);
    }

    // --- 5. Transação e Persistência no Banco ---
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const updatedLead = await Lead.findOneAndUpdate(
            { _id: id, company: companyId },
            { $set: updateFields },
            { new: true, runValidators: true, session }
        );
        if (!updatedLead) throw new Error("Falha ao encontrar ou atualizar o lead durante a transação.");

        // Lógica para liberar reserva se o status mudou de 'Em Reserva'
        const nomeSituacaoAntiga = leadExistente.situacao?.nome || ''; // situacao here is populated
        const situacaoNovaDoc = await LeadStage.findById(updatedLead.situacao).lean(); // Fetch the new stage doc
        const nomeSituacaoNova = situacaoNovaDoc?.nome || '';

        if (updateFields.situacao && String(leadExistente.situacao?._id) !== String(updatedLead.situacao)) {
            if (nomeSituacaoAntiga.toLowerCase().includes(LEAD_STAGE_NOME_EM_RESERVA.toLowerCase())) {
                const proximosEstagiosPermitidos = [
                    LEAD_STAGE_NOME_PROPOSTA_EMITIDA.toLowerCase(), // "em proposta", "proposta emitida"
                    // Add other valid next stages like "contrato assinado", "vendido" if they exist
                    // For now, assuming "Proposta Emitida" is the main one after "Em Reserva" before sale
                ];
                // If new stage is not one of the allowed next stages from "Em Reserva" (e.g., moving to "Novo", "Contato", or "Descartado")
                if (!proximosEstagiosPermitidos.some(s => nomeSituacaoNova.toLowerCase().includes(s)) && nomeSituacaoNova.toLowerCase() !== LEAD_STAGE_NOME_VENDA_REALIZADA.toLowerCase()) {
                    console.log(`[updateLead] Lead ${id} saiu de '${LEAD_STAGE_NOME_EM_RESERVA}'. Cancelando reserva ativa.`);
                    // This logic assumes Reserva model is available
                    const Reserva = mongoose.model('Reserva');
                    const UnidadeModel = mongoose.model('Unidade'); // Assuming Unidade model
                    const ImovelAvulsoModel = mongoose.model('ImovelAvulso');


                    const reservaAtiva = await Reserva.findOne({ lead: id, statusReserva: RESERVA_STATUS.ATIVA, company: companyId }).session(session);
                    if (reservaAtiva) {
                        reservaAtiva.statusReserva = RESERVA_STATUS.CANCELADA;

                        const ImovelReferencedModel = reservaAtiva.tipoImovel === 'Unidade' ? UnidadeModel : ImovelAvulsoModel;
                        const imovelParaLiberar = await ImovelReferencedModel.findById(reservaAtiva.imovel).session(session);

                        if (imovelParaLiberar && String(imovelParaLiberar.currentReservaId) === String(reservaAtiva._id)) {
                            const statusField = reservaAtiva.tipoImovel === 'Unidade' ? 'statusUnidade' : 'status';
                            imovelParaLiberar[statusField] = UNIDADE_STATUS.DISPONIVEL; // Assuming UNIDADE_STATUS.DISPONIVEL is generic
                            imovelParaLiberar.currentLeadId = null;
                            imovelParaLiberar.currentReservaId = null;
                            await imovelParaLiberar.save({ session });
                            await logHistory(updatedLead._id, userId, LEAD_HISTORY_ACTIONS.UNIDADE_LIBERADA, `Unidade/Imóvel ${imovelParaLiberar._id} liberado devido à mudança de status do lead.`, null, {imovelId: imovelParaLiberar._id, tipo: reservaAtiva.tipoImovel }, 'Lead', updatedLead._id, session);
                        }
                        await reservaAtiva.save({ session });
                        await logHistory(updatedLead._id, userId, LEAD_HISTORY_ACTIONS.RESERVA_CANCELADA_STATUS_LEAD, `Reserva ${reservaAtiva._id} cancelada devido à mudança de status do lead.`, {oldStatus: RESERVA_STATUS.ATIVA}, {newStatus: RESERVA_STATUS.CANCELADA}, 'Reserva', reservaAtiva._id, session);
                    }
                }
            }
        }
        
        await logHistory(updatedLead._id, userId, LEAD_HISTORY_ACTIONS.EDICAO_DADOS, `Lead atualizado.`, leadExistente.toObject(), updatedLead.toObject(), 'Lead', updatedLead._id, session);
        
        await session.commitTransaction();

        await updatedLead.populate([
            { path: "situacao", select: "nome ordem" },
            { path: "origem", select: "nome" },
            { path: "responsavel", select: "nome perfil" },
            { path: "motivoDescarte", select: "nome" },
        ]);
        return updatedLead;

    } catch (error) {
        if (session.inTransaction()) await session.abortTransaction();
        console.error("[updateLead] Erro na transação ao atualizar lead:", error);
        if (error.code === 11000) throw new Error("Erro de duplicidade ao atualizar (Email, Contato ou CPF).");
        throw new Error(error.message || "Erro ao atualizar lead.");
    } finally {
        session.endSession();
    }
};


// --- DELETE Lead (com Multi-Empresa) ---
const deleteLead = async (id, companyId, userId) => {
  // <<< Recebe parâmetros corretos
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("ID inválido.");
  }
  if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
    throw new Error("ID da empresa inválido.");
  }
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("ID do usuário inválido.");
  }
  try {
    const deleted = await Lead.findOneAndDelete({
      _id: id,
      company: companyId,
    }); // <<< Filtra por empresa
    if (!deleted) throw new Error("Lead não encontrado nesta empresa.");
    console.log(
      `[deleteLead] Lead ${id} da empresa ${companyId} excluído por ${userId}`
    );
    await logHistory(
      id,
      userId,
      LEAD_HISTORY_ACTIONS.EXCLUSAO,
      `Lead ${deleted.nome || id} excluído.`
    );
    return { message: "Lead deletado com sucesso" };
  } catch (error) {
    /* ... tratamento erro ... */
  }
};

// --- DESCARTAR Lead (com Multi-Empresa) ---
const descartarLead = async (id, dados, companyId, userId) => {
  // Validações de entrada (iguais)
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("ID de Lead inválido.");
  }
  if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
    throw new Error("ID da empresa inválido.");
  }
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("ID do usuário inválido.");
  }
  const { motivoDescarte, comentario } = dados;
  if (!motivoDescarte || !mongoose.Types.ObjectId.isValid(motivoDescarte)) {
    throw new Error("ID do motivo de descarte inválido ou não fornecido.");
  }

  const nomeSituacaoDescartado = LEAD_STAGE_NOME_DESCARTADO; // Use constant
  const ordemSituacaoDescartado = 9999;

  try {
    const [reasonExists, situacaoDescartadoExistente] = await Promise.all([
      DiscardReason.findOne({ _id: motivoDescarte, company: companyId }).lean(),
      LeadStage.findOne({ nome: { $regex: new RegExp(`^${nomeSituacaoDescartado}$`, 'i') }, company: companyId }),
    ]);

    if (!reasonExists) {
      throw new Error(`Motivo Descarte ID ${motivoDescarte} não encontrado nesta empresa.`);
    }

    let situacaoDescartadoFinal = situacaoDescartadoExistente;

    if (!situacaoDescartadoFinal) {
      console.warn(`[descartarLead] Situação '${nomeSituacaoDescartado}' não encontrada para ${companyId}. Criando...`);
      situacaoDescartadoFinal = new LeadStage({
        nome: nomeSituacaoDescartado, // Use constant for name
        ordem: ordemSituacaoDescartado,
        company: companyId,
        ativo: true,
      });
      try {
        await situacaoDescartadoFinal.save();
        console.log(`[descartarLead] Situação '${nomeSituacaoDescartado}' criada para ${companyId} com ID: ${situacaoDescartadoFinal._id}`);
      } catch (creationError) {
        if (creationError.message.includes("já existe")) {
          situacaoDescartadoFinal = await LeadStage.findOne({ nome: { $regex: new RegExp(`^${nomeSituacaoDescartado}$`, 'i') }, company: companyId });
          if (!situacaoDescartadoFinal) {
            throw new Error(`Falha crítica ao criar/encontrar situação padrão '${nomeSituacaoDescartado}'.`);
          }
        } else {
          throw new Error(`Falha ao configurar a situação '${nomeSituacaoDescartado}' para esta empresa.`);
        }
      }
    }

    const lead = await Lead.findOneAndUpdate(
      { _id: id, company: companyId }, // Filtra por empresa
      {
        situacao: situacaoDescartadoFinal._id, // Usa o ID encontrado ou criado
        motivoDescarte: reasonExists._id, // Usa o ID do motivo validado
        comentario: comentario || null,
      },
      { new: true }
    )
      .populate("situacao", "nome")
      .populate("motivoDescarte", "nome");

    if (!lead)
      throw new Error("Lead não encontrado nesta empresa (descarte falhou).");

    // Log de Histórico
    const details = `Motivo: ${reasonExists.nome}${comentario ? ` | Comentário: ${comentario}` : ""}`;
    await logHistory(lead._id, userId, LEAD_HISTORY_ACTIONS.DESCARTE, details, {oldSituacao: lead.situacao?.toString()}, {newSituacao: situacaoDescartadoFinal._id.toString(), motivoDescarte: reasonExists._id.toString()}, 'Lead', lead._id);

    return lead;
  } catch (error) {
    console.error(
      `[descartarLead] Erro ao descartar lead ${id} para empresa ${companyId}:`,
      error
    );
    // Repassa a mensagem de erro original
    throw new Error(error.message || "Erro ao descartar lead.");
  }
};


/**
const Papa = require('papaparse');

/**
 * Importa leads de um buffer de arquivo CSV, pré-processando os dados
 * e chamando o serviço createLead para cada linha.
 */
const importLeadsFromCSV = async (fileBuffer, companyId, createdByUserId) => {
    console.log(`[LeadSvc Import] Iniciando importação de CSV para Company: ${companyId}`);

    // --- 1. Preparar Cache de Dados para Validação ---
    const [allStages, allOrigins, existingLeads] = await Promise.all([
        LeadStage.find({ company: companyId, ativo: true }).lean(),
        Origem.find({ company: companyId, ativo: true }).lean(),
        Lead.find({ company: companyId, ativo: true }).select('email contato cpf').lean()
    ]);

    const stagesMap = new Map(allStages.map(s => [s.nome.trim().toLowerCase(), s._id]));
    const originsMap = new Map(allOrigins.map(o => [o.nome.trim().toLowerCase(), o._id]));
    
    const existingEmails = new Set(existingLeads.map(l => l.email).filter(Boolean));
    const existingContatos = new Set(existingLeads.map(l => l.contato).filter(Boolean));
    const existingCpfs = new Set(existingLeads.map(l => l.cpf).filter(Boolean));
    
    console.log(`[LeadSvc Import] Cache preparado: ${stagesMap.size} situações, ${originsMap.size} origens. ${existingEmails.size} emails, ${existingContatos.size} contatos e ${existingCpfs.size} CPFs existentes.`);

    // --- 2. Ler e Parsear o Arquivo CSV usando PapaParse ---
    const csvString = fileBuffer.toString('utf8');
    const importErrors = [];
    let importedCount = 0;
    let processedRowCount = 0;

    // PapaParse config
    const config = {
        header: true, // Trata a primeira linha como cabeçalho
        skipEmptyLines: true,
        transformHeader: header => header.trim().toLowerCase(), // Normaliza cabeçalhos
        complete: async (results) => {
            processedRowCount = results.data.length;
            console.log(`[LeadSvc Import] PapaParse processou ${processedRowCount} linhas de dados.`);

            if (results.errors.length > 0) {
                results.errors.forEach(error => {
                    importErrors.push({
                        line: error.row + 2, // PapaParse row index is 0-based for data
                        error: `Erro de parsing CSV: ${error.message} (Código: ${error.code})`,
                        data: error.rowContent || 'Linha não pôde ser lida'
                    });
                });
                console.warn(`[LeadSvc Import] Encontrados ${results.errors.length} erros durante o parsing do CSV.`);
            }
            
            for (let i = 0; i < results.data.length; i++) {
                const row = results.data[i];
                const lineNumber = i + 2; // +1 for header, +1 for 1-based indexing

                try {
                    // --- Validação de campos obrigatórios ---
                    if (!row.nome || !row.telefone) {
                        throw new Error("Campos 'nome' e 'telefone' são obrigatórios.");
                    }
            
                    // --- Pré-processamento e formatação dos dados ---
                    const nomeFormatado = String(row.nome).trim();
                    const emailFormatado = row.email ? String(row.email).trim().toLowerCase() : null;
            
                    let contatoFormatado = null;
                    if (row.telefone?.trim()) {
                        const phoneNumber = phoneUtil.parseAndKeepRawInput(String(row.telefone).trim(), 'BR');
                        if (phoneUtil.isValidNumber(phoneNumber)) {
                            contatoFormatado = phoneUtil.format(phoneNumber, PNF.E164);
                        } else {
                            throw new Error(`Número de telefone inválido: ${row.telefone}`);
                        }
                    }
            
                    let cpfFormatado = null;
                    if (row.cpf?.trim()) {
                        const cpfLimpo = String(row.cpf).replace(/\D/g, "");
                        if (cpfLimpo) {
                             if (!cpfcnpj.cpf.isValid(cpfLimpo)) throw new Error(`CPF inválido: ${row.cpf}`);
                             cpfFormatado = cpfLimpo;
                        }
                    }

                    // --- VALIDAÇÃO COMPLETA DE DUPLICADOS ---
                    if (emailFormatado && existingEmails.has(emailFormatado)) {
                        throw new Error(`Email '${emailFormatado}' já existe no sistema.`);
                    }
                    if (contatoFormatado && existingContatos.has(contatoFormatado)) {
                        throw new Error(`Telefone '${contatoFormatado}' já existe no sistema.`);
                    }
                    if (cpfFormatado && existingCpfs.has(cpfFormatado)) {
                        throw new Error(`CPF '${row.cpf}' já existe no sistema.`);
                    }

                    // Monta o objeto final para chamar a função createLead
                    const leadDataParaCriar = {
                        nome: nomeFormatado,
                        email: emailFormatado,
                        contato: contatoFormatado,
                        cpf: cpfFormatado,
                        // Para origem e situacao, passamos o NOME. O createLead resolverá os IDs.
                        origem: row.origem ? String(row.origem).trim() : undefined,
                        situacao: row.situacao ? String(row.situacao).trim() : undefined,
                        comentario: row.comentario ? String(row.comentario).trim() : null,
                        tags: ['importado-csv'] // Adiciona tag padrão
                    };

                    // Chama a função createLead que já existe e é robusta
                    await createLead(leadDataParaCriar, companyId, createdByUserId);
                    importedCount++;

                    // Adiciona os novos dados aos Sets para evitar duplicatas DENTRO do mesmo arquivo
                    if(emailFormatado) existingEmails.add(emailFormatado);
                    if(contatoFormatado) existingContatos.add(contatoFormatado);
                    if(cpfFormatado) existingCpfs.add(cpfFormatado);

                } catch (error) {
                    console.error(`[LeadSvc Import] Erro ao processar linha ${lineNumber}:`, error.message);
                    importErrors.push({
                        line: lineNumber,
                        error: error.message,
                        data: row // row já é um objeto aqui
                    });
                }
            }
        }
    };

    // Executa o parsing
    // Usamos uma Promise para poder 'await' o resultado do 'complete' callback do PapaParse
    await new Promise((resolve, reject) => {
        config.complete = async (results) => {
            processedRowCount = results.data.length;
            console.log(`[LeadSvc Import] PapaParse processou ${processedRowCount} linhas de dados.`);

            if (results.errors.length > 0) {
                results.errors.forEach(error => {
                    // error.row é o índice da linha no arquivo (0-based, incluindo header se não skipado)
                    // Se header: true, error.row é o índice da linha de DADOS (0-based)
                    const actualLineNumber = error.row + 2; // +1 for header, +1 for 1-based
                    importErrors.push({
                        line: actualLineNumber,
                        error: `Erro de parsing CSV: ${error.message} (Código: ${error.code})`,
                        data: results.data[error.row] || `Linha ${actualLineNumber} com erro de parsing severo.`
                    });
                });
                console.warn(`[LeadSvc Import] Encontrados ${results.errors.length} erros durante o parsing do CSV.`);
            }

            for (let i = 0; i < results.data.length; i++) {
                const row = results.data[i];
                const lineNumber = i + 2;

                try {
                    if (!row.nome || !row.telefone) {
                        throw new Error("Campos 'nome' e 'telefone' são obrigatórios.");
                    }

                    const nomeFormatado = String(row.nome).trim();
                    const emailFormatado = row.email ? String(row.email).trim().toLowerCase() : null;
            
                    let contatoFormatado = null;
                    if (row.telefone?.trim()) {
                        const phoneNumber = phoneUtil.parseAndKeepRawInput(String(row.telefone).trim(), 'BR');
                        if (phoneUtil.isValidNumber(phoneNumber)) {
                            contatoFormatado = phoneUtil.format(phoneNumber, PNF.E164);
                        } else {
                            throw new Error(`Número de telefone inválido: ${row.telefone}`);
                        }
                    } else { // Se telefone estiver vazio na linha, é um erro pois é obrigatório
                         throw new Error("Campo 'telefone' é obrigatório e não pode estar vazio.");
                    }

                    let cpfFormatado = null;
                    if (row.cpf?.trim()) {
                        const cpfLimpo = String(row.cpf).replace(/\D/g, "");
                        if (cpfLimpo) {
                             if (!cpfcnpj.cpf.isValid(cpfLimpo)) throw new Error(`CPF inválido: ${row.cpf}`);
                             cpfFormatado = cpfLimpo;
                        }
                    }

                    if (emailFormatado && existingEmails.has(emailFormatado)) {
                        throw new Error(`Email '${emailFormatado}' já existe no sistema.`);
                    }
                    if (contatoFormatado && existingContatos.has(contatoFormatado)) {
                        throw new Error(`Telefone '${contatoFormatado}' já existe no sistema.`);
                    }
                    if (cpfFormatado && existingCpfs.has(cpfFormatado)) {
                        throw new Error(`CPF '${row.cpf}' já existe no sistema.`);
                    }

                    const leadDataParaCriar = {
                        nome: nomeFormatado,
                        email: emailFormatado,
                        contato: contatoFormatado,
                        cpf: cpfFormatado,
                        origem: row.origem ? String(row.origem).trim() : undefined,
                        situacao: row.situacao ? String(row.situacao).trim() : undefined,
                        comentario: row.comentario ? String(row.comentario).trim() : null,
                        tags: ['importado-csv']
                    };

                    await createLead(leadDataParaCriar, companyId, createdByUserId);
                    importedCount++;

                    if(emailFormatado) existingEmails.add(emailFormatado);
                    if(contatoFormatado) existingContatos.add(contatoFormatado);
                    if(cpfFormatado) existingCpfs.add(cpfFormatado);

                } catch (error) {
                    console.error(`[LeadSvc Import] Erro ao processar linha ${lineNumber} (Dados: ${JSON.stringify(row)}):`, error.message);
                    importErrors.push({
                        line: lineNumber,
                        error: error.message,
                        data: row
                    });
                }
            }
            resolve(); // Resolve a Promise quando o loop 'complete' terminar
        };
        config.error = (error) => { // Lida com erros fatais do PapaParse
            console.error("[LeadSvc Import] Erro fatal no PapaParse:", error);
            reject(new Error("Falha crítica ao parsear o arquivo CSV: " + error.message));
        };

        Papa.parse(csvString, config);
    });

    // --- 4. Retorna o Resumo Final ---
    const summary = {
        totalRows: processedRowCount,
        importedCount,
        errorCount: importErrors.length,
        errors: importErrors
    };
    
    console.log("[LeadSvc Import] Importação concluída.", summary);
    return summary;
};

// --- EXPORTS ---
module.exports = {
  getLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
  descartarLead,
  logHistory,
  getStageNameById,
  getDefaultAdminUserIdForCompany,
  getDefaultLeadStageIdForCompany,
  importLeadsFromCSV
};
