// services/LeadService.js

const mongoose = require("mongoose");
const Lead = require("../models/Lead");
const Origem = require("../models/origem");
const LeadStage = require("../models/LeadStage");
const User = require("../models/User");
const DiscardReason = require("../models/DiscardReason");
const LeadHistory = require("../models/LeadHistory");
const origemService = require("./origemService");


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
const logHistory = async (leadId, userId, action, details) => {
  try {
    if (!leadId) {
      console.warn("[History] Tentativa de log sem leadId.");
      return;
    }
    const historyEntry = new LeadHistory({
      lead: leadId,
      user: userId || null,
      action: action,
      details: details || "",
    });
    await historyEntry.save();
    console.log(
      `[History] Logged: Lead ${leadId}, Action: ${action}, User: ${
        userId || "System"
      }`
    );
  } catch (error) {
    console.error(
      `[History] FAILED to log: Lead ${leadId}, Action: ${action}`,
      error
    );
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

    const page = parseInt(queryParams.page, 10) || 1;
    const limit = parseInt(queryParams.limit, 10) || 1000;
    const skip = (page - 1) * limit;

    const queryConditions = { company: new mongoose.Types.ObjectId(companyId) };

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

    if (queryParams.origem && mongoose.Types.ObjectId.isValid(queryParams.origem)) {
        queryConditions.origem = queryParams.origem;
    }

    if (queryParams.responsavel && mongoose.Types.ObjectId.isValid(queryParams.responsavel)) {
        queryConditions.responsavel = queryParams.responsavel;
    }

    if (queryParams.tags && queryParams.tags.trim() !== '') {
        const tagsArray = queryParams.tags
            .split(',')
            .map(tag => tag.trim().toLowerCase())
            .filter(Boolean);
        if (tagsArray.length > 0) {
            queryConditions.tags = { $all: tagsArray };
        }
    }

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
        const aggregationPipeline = [
            { $match: queryConditions },
            {
                $lookup: {
                    from: 'tasks',
                    localField: '_id',
                    foreignField: 'lead',
                    as: 'tasks',
                    pipeline: [
                        { $match: { status: 'Pendente' } },
                        { $sort: { dueDate: 1 } }
                    ]
                }
            },
            {
                $addFields: {
                    pendingTask: { $first: "$tasks" }
                }
            },
            { $lookup: { from: 'leadstages', localField: 'situacao', foreignField: '_id', as: 'situacao' } },
            { $lookup: { from: 'origens', localField: 'origem', foreignField: '_id', as: 'origem' } },
            { $lookup: { from: 'users', localField: 'responsavel', foreignField: '_id', as: 'responsavel' } },
            { $unwind: { path: "$situacao", preserveNullAndEmptyArrays: true } },
            { $unwind: { path: "$origem", preserveNullAndEmptyArrays: true } },
            { $unwind: { path: "$responsavel", preserveNullAndEmptyArrays: true } },
            { $sort: { updatedAt: -1 } },
            { $skip: skip },
            { $limit: limit },
            {
                $project: {
                    nome: 1,
                    contato: 1,
                    situacao: { _id: 1, nome: 1 },
                    origem: { _id: 1, nome: 1 },
                    responsavel: { _id: 1, nome: 1, perfil: 1 },
                    tags: 1,
                    updatedAt: 1,
                    pendingTask: { _id: 1, title: 1, dueDate: 1 }
                }
            }
        ];

        const [totalLeads, leads] = await Promise.all([
            Lead.countDocuments(queryConditions),
            Lead.aggregate(aggregationPipeline)
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
    const lead = await Lead.findOne({ _id: id, company: companyId }) // Filtra por ID e Empresa
      .populate("situacao", "nome ordem")
      .populate("origem", "nome")
      .populate("responsavel", "nome perfil")
      .populate("motivoDescarte", "nome");
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
        await logHistory(leadSalvo._id, userId, "CRIACAO", "Lead criado no sistema.");
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

        if (situacaoDoc.nome.toLowerCase() === "descartado") {
            if (!motivoDescarte || !mongoose.Types.ObjectId.isValid(motivoDescarte)) {
                throw new Error("Motivo de descarte (ID) é obrigatório ao mover o lead para 'Descartado'.");
            }
            const motivoDoc = await DiscardReason.findOne({ _id: motivoDescarte, company: companyId });
            if (!motivoDoc) throw new Error("Motivo de descarte inválido ou não pertence a esta empresa.");
            updateFields.motivoDescarte = motivoDescarte;
            if (comentario !== undefined) updateFields.comentario = comentario;
        } else {
            updateFields.motivoDescarte = null;
        }
    } else {
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
        const nomeSituacaoAntiga = leadExistente.situacao?.nome || '';
        const nomeSituacaoNova = (await LeadStage.findById(updatedLead.situacao).lean())?.nome || '';
        if (updateFields.situacao && String(leadExistente.situacao?._id) !== String(updatedLead.situacao)) {
            if (nomeSituacaoAntiga.toLowerCase().includes('em reserva')) {
                const proximosEstagiosPermitidos = ["em proposta", "proposta emitida", "contrato assinado", "vendido"];
                if (!proximosEstagiosPermitidos.some(s => nomeSituacaoNova.toLowerCase().includes(s))) {
                    console.log(`[updateLead] Lead ${id} saiu de 'Em Reserva'. Cancelando reserva ativa.`);
                    const reservaAtiva = await Reserva.findOne({ lead: id, statusReserva: "Ativa", company: companyId }).session(session);
                    if (reservaAtiva) {
                        reservaAtiva.statusReserva = "Cancelada";
                        const unidadeParaLiberar = await Unidade.findById(reservaAtiva.unidade).session(session);
                        if (unidadeParaLiberar && String(unidadeParaLiberar.currentReservaId) === String(reservaAtiva._id)) {
                            unidadeParaLiberar.statusUnidade = "Disponível";
                            unidadeParaLiberar.currentLeadId = null;
                            unidadeParaLiberar.currentReservaId = null;
                            await unidadeParaLiberar.save({ session });
                        }
                        await reservaAtiva.save({ session });
                    }
                }
            }
        }
        
        await logHistory(updatedLead._id, userId, "EDICAO_DADOS", `Lead atualizado.`, leadExistente.toObject(), updatedLead.toObject(), 'Lead', updatedLead._id, session);
        
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
      "EXCLUSAO",
      `Lead ${deleted.nome || id} excluído.`
    ); // <<< Passa userId
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

  // Define nome padrão e ordem alta
  const nomeSituacaoDescartado = "Descartado";
  const ordemSituacaoDescartado = 9999; // Ordem alta padrão

  try {
    // Busca Motivo de Descarte E Situação "Descartado" em paralelo
    const [reasonExists, situacaoDescartadoExistente] = await Promise.all([
      DiscardReason.findOne({ _id: motivoDescarte, company: companyId }).lean(), // Busca Motivo na empresa
      LeadStage.findOne({ nome: nomeSituacaoDescartado, company: companyId }), // Busca Situação na empresa (SEM .lean() para poder salvar se precisar criar)
    ]);

    // Valida Motivo
    if (!reasonExists)
      throw new Error(
        `Motivo Descarte ID ${motivoDescarte} não encontrado nesta empresa.`
      );

    let situacaoDescartadoFinal = situacaoDescartadoExistente;

    // <<< LÓGICA "FIND OR CREATE" PARA SITUAÇÃO DESCARTADO >>>
    if (!situacaoDescartadoFinal) {
      // Se NÃO encontrou, CRIA a situação "Descartado" para esta empresa
      console.warn(
        `[descartarLead] Situação '${nomeSituacaoDescartado}' não encontrada para ${companyId}. Criando...`
      );
      situacaoDescartadoFinal = new LeadStage({
        nome: nomeSituacaoDescartado,
        ordem: ordemSituacaoDescartado,
        company: companyId,
        ativo: true, // Garante que seja criada como ativa
      });
      try {
        await situacaoDescartadoFinal.save(); // Salva a nova situação padrão
        console.log(
          `[descartarLead] Situação '${nomeSituacaoDescartado}' criada para ${companyId} com ID: ${situacaoDescartadoFinal._id}`
        );
      } catch (creationError) {
        // Pode dar erro se houver race condition (outra req criou ao mesmo tempo) ou outra validação
        console.error(
          `[descartarLead] Falha ao tentar criar situação '${nomeSituacaoDescartado}' para ${companyId}:`,
          creationError
        );
        // Verifica se o erro foi de duplicidade (outra req criou antes)
        if (creationError.message.includes("já existe")) {
          // Tenta buscar novamente
          situacaoDescartadoFinal = await LeadStage.findOne({
            nome: nomeSituacaoDescartado,
            company: companyId,
          });
          if (!situacaoDescartadoFinal) {
            // Se ainda não achar, lança erro definitivo
            throw new Error(
              `Falha crítica ao criar/encontrar situação padrão 'Descartado'.`
            );
          }
        } else {
          throw new Error(
            `Falha ao configurar a situação 'Descartado' para esta empresa.`
          );
        }
      }
    }
    // <<< FIM LÓGICA "FIND OR CREATE" >>>

    // Agora temos certeza que situacaoDescartadoFinal contém o documento (encontrado ou criado)

    // Atualiza o Lead
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

    // Log de Histórico (igual)
    const details = `Motivo: ${reasonExists.nome}${
      comentario ? ` | Comentário: ${comentario}` : ""
    }`;
    await logHistory(lead._id, userId, "DESCARTE", details);

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
 * Importa leads de um buffer de arquivo CSV, pré-processando os dados
 * e chamando o serviço createLead para cada linha.
 */
const importLeadsFromCSV = async (fileBuffer, companyId, createdByUserId) => {
    console.log(`[LeadSvc Import] Iniciando importação de CSV para Company: ${companyId}`);
    
    // --- 1. Preparar Cache de Dados para Validação ---
    const [allStages, allOrigins, existingLeads] = await Promise.all([
        LeadStage.find({ company: companyId, ativo: true }).lean(),
        Origem.find({ company: companyId, ativo: true }).lean(),
        // VVVVV BUSCA TAMBÉM O CPF PARA VERIFICAÇÃO DE DUPLICADOS VVVVV
        Lead.find({ company: companyId, ativo: true }).select('email contato cpf').lean()
    ]);

    const stagesMap = new Map(allStages.map(s => [s.nome.trim().toLowerCase(), s._id]));
    const originsMap = new Map(allOrigins.map(o => [o.nome.trim().toLowerCase(), o._id]));
    
    // Cria Sets para verificação RÁPIDA de duplicados
    const existingEmails = new Set(existingLeads.map(l => l.email).filter(Boolean));
    const existingContatos = new Set(existingLeads.map(l => l.contato).filter(Boolean));
    const existingCpfs = new Set(existingLeads.map(l => l.cpf).filter(Boolean)); // <<< NOVO SET PARA CPFs
    
    console.log(`[LeadSvc Import] Cache preparado: ${stagesMap.size} situações, ${originsMap.size} origens. ${existingEmails.size} emails, ${existingContatos.size} contatos e ${existingCpfs.size} CPFs existentes.`);

    // --- 2. Ler e Parsear o Arquivo CSV ---
    const lines = fileBuffer.toString('utf8').split(/\r?\n/);
    const headerLine = lines.shift()?.trim();
    if (!headerLine) {
        throw new Error("Arquivo CSV está vazio ou não contém um cabeçalho.");
    }
    const delimiter = headerLine.includes(';') ? ';' : ',';
    const headers = headerLine.split(delimiter).map(h => h.trim().toLowerCase());
    console.log(`[LeadSvc Import] Cabeçalhos detectados: [${headers.join(', ')}]. Delimitador: '${delimiter}'`);
    
    const dataRows = lines.filter(line => line.trim() !== '');
    
    // --- 3. Processar, Validar e Preparar Leads para Criação ---
    let importedCount = 0;
    const importErrors = [];

    for (let i = 0; i < dataRows.length; i++) {
        const line = dataRows[i];
        const lineNumber = i + 2;
        
        const values = line.split(delimiter);
        const row = headers.reduce((obj, header, index) => {
            obj[header] = values[index]?.trim() || '';
            return obj;
        }, {});

        try {
            // --- Validação de campos obrigatórios ---
            if (!row.nome || !row.telefone) {
                throw new Error("Campos 'nome' e 'telefone' são obrigatórios.");
            }
            
            // --- Pré-processamento e formatação dos dados ---
            const nomeFormatado = row.nome.trim();
            const emailFormatado = row.email?.trim().toLowerCase() || null;
            
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
            if (cpfFormatado && existingCpfs.has(cpfFormatado)) { // <<< VALIDAÇÃO DE CPF ADICIONADA
                throw new Error(`CPF '${row.cpf}' já existe no sistema.`);
            }

            // Monta o objeto final para chamar a função createLead
            const leadDataParaCriar = {
                nome: nomeFormatado,
                email: emailFormatado,
                contato: contatoFormatado,
                cpf: cpfFormatado,
                origem: row.origem,
                situacao: row.situacao,
                comentario: row.comentario,
                tags: ['importado-csv']
            };
            
            // Chama a função createLead que já existe e é robusta
            await createLead(leadDataParaCriar, companyId, createdByUserId);
            importedCount++;

            // Adiciona os novos dados aos Sets para evitar duplicatas DENTRO do mesmo arquivo
            if(emailFormatado) existingEmails.add(emailFormatado);
            if(contatoFormatado) existingContatos.add(contatoFormatado);
            if(cpfFormatado) existingCpfs.add(cpfFormatado); // <<< ADICIONADO AO SET

        } catch (error) {
            console.error(`[LeadSvc Import] Erro ao processar linha ${lineNumber}:`, error.message);
            importErrors.push({
                line: lineNumber,
                error: error.message,
                data: row
            });
        }
    }
    
    // --- 4. Retorna o Resumo Final ---
    const summary = {
        totalRows: dataRows.length,
        importedCount, // Já foi incrementado no loop
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
