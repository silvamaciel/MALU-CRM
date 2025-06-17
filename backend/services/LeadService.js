// services/LeadService.js

const mongoose = require("mongoose");
const Lead = require("../models/Lead");
const Origem = require("../models/origem");
const LeadStage = require("../models/LeadStage");
const User = require("../models/User");
const DiscardReason = require("../models/DiscardReason");
const LeadHistory = require("../models/LeadHistory");
const origemService = require("./origemService");

const stream = require('stream');
const csv = require('csv-parser');
const csvParser = require('csv-parser');

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
 * Cria um novo Lead, incluindo dados de coadquirentes.
 * @param {object} leadData - Dados do lead, incluindo os novos campos e o array 'coadquirentes'.
 * @param {string} companyId - ID da empresa.
 * @param {string|null} userId - ID do usuário que está criando.
 * @returns {Promise<Lead>} O lead criado.
 */
const createLead = async (leadData, companyId, userId) => {
  console.log(`[createLead] Iniciando criação. Empresa: ${companyId}, Usuário: ${userId}`);

  if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
    throw new Error("ID da Empresa inválido.");
  }
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("ID do Usuário inválido.");
  }

  const {
    nome,
    contato,
    email,
    nascimento,
    endereco,
    cpf,
    rg,
    nacionalidade,
    estadoCivil,
    profissao,
    situacao,
    origem,
    tags,
    responsavel,
    comentario,
    coadquirentes
  } = leadData;

  if (!nome || !contato) {
    throw new Error("Nome e Contato são obrigatórios.");
  }

  let formattedPhoneNumber = null;
  try {
    const phoneNumber = phoneUtil.parseAndKeepRawInput(contato, null);
    if (phoneUtil.isValidNumber(phoneNumber)) {
      formattedPhoneNumber = phoneUtil.format(phoneNumber, PNF.E164);
    } else {
      throw new Error(`Número de contato inválido: ${contato}`);
    }
  } catch (e) {
    throw new Error(`Formato de contato não reconhecido: ${contato}`);
  }

  let cpfLimpo = null;
  if (cpf) {
    cpfLimpo = cpf.replace(/\D/g, "");
    if (!cpfcnpj.cpf.isValid(cpfLimpo)) {
      throw new Error(`CPF inválido: ${cpf}`);
    }
  }

  let situacaoIdFinal = null;
  let origemIdFinal = null;
  let responsavelIdFinal =
    leadData.responsavel ||
    userId ||
    (await getDefaultAdminUserIdForCompany(companyId));

  if (responsavel && mongoose.Types.ObjectId.isValid(responsavelIdFinal)) {
    const doc = await User.findOne({
      _id: responsavel,
      company: companyId,
    }).lean();
    if (!doc) throw new Error(`Responsável ID inválido ou não pertence à empresa.`);
    responsavelIdFinal = doc._id;
  } else {
    const currentUser = await User.findById(userId).lean();
    if (!currentUser || !currentUser.company.equals(companyId)) {
      throw new Error("Usuário logado inválido ou não pertence a esta empresa.");
    }
    responsavelIdFinal = currentUser._id;
  }

  if (situacao && mongoose.Types.ObjectId.isValid(situacao)) {
    const doc = await LeadStage.findOne({
      _id: situacao,
      company: companyId,
    }).lean();
    if (!doc) throw new Error(`Situação ID inválida ou não pertence à empresa.`);
    situacaoIdFinal = doc._id;
  } else {
    const doc = await LeadStage.findOne({
      company: companyId,
      nome: { $ne: "Descartado" },
      ativo: true,
    }).sort({ ordem: 1 }).lean();
    if (!doc) throw new Error(`Nenhuma situação padrão ativa encontrada.`);
    situacaoIdFinal = doc._id;
  }

  if (origem && mongoose.Types.ObjectId.isValid(origem)) {
    const doc = await Origem.findOne({
      _id: origem,
      company: companyId,
    }).lean();
    if (!doc) throw new Error(`Origem fornecida inválida ou não pertence à empresa.`);
    origemIdFinal = doc._id;
  } else {
    const nomeDefault = "Sistema Gestor";
    let defaultOrigin = await Origem.findOne({
      nome: nomeDefault,
      company: companyId,
    });

    if (!defaultOrigin) {
      try {
        defaultOrigin = await origemService.createOrigem(
          {
            nome: nomeDefault,
            descricao: "Lead cadastrado diretamente pelo sistema.",
          },
          companyId
        );
      } catch (creationError) {
        throw new Error(`Erro ao criar origem padrão: ${creationError.message}`);
      }
    }

    origemIdFinal = defaultOrigin._id;
  }

  let processedTags = [];
  if (Array.isArray(tags)) {
    processedTags = tags
      .filter(tag => typeof tag === 'string' && tag.trim() !== '')
      .map(tag => tag.trim().toLowerCase());
    processedTags = [...new Set(processedTags)];
  } else if (typeof tags === 'string' && tags.trim() !== '') {
    processedTags = tags.split(',')
      .map(tag => tag.trim().toLowerCase())
      .filter(tag => tag.length > 0);
    processedTags = [...new Set(processedTags)];
  }

  // --- Validação de Coadquirentes ---
  let processedCoadquirentes = [];
  if (Array.isArray(coadquirentes)) {
    processedCoadquirentes = coadquirentes.map(co => {
      if (!co.nome) throw new Error("O nome de cada coadquirente é obrigatório.");
      const coCpfLimpo = co.cpf ? String(co.cpf).replace(/\D/g, "") : null;
      if (coCpfLimpo && !cpfcnpj.cpf.isValid(coCpfLimpo)) {
        throw new Error(`CPF do coadquirente '${co.nome}' é inválido.`);
      }
      return {
        nome: co.nome.trim(),
        cpf: coCpfLimpo || null,
        rg: co.rg?.trim() || null,
        nacionalidade: co.nacionalidade?.trim() || 'Brasileiro(a)',
        estadoCivil: co.estadoCivil?.trim() || null,
        profissao: co.profissao?.trim() || null,
      };
    });
  }

  const novoLead = new Lead({
    nome: nome.trim(),
    contato: formattedPhoneNumber,
    email: email ? email.trim().toLowerCase() : null,
    nascimento: nascimento || null,
    endereco: endereco || null,
    cpf: cpfLimpo,
    rg: rg?.trim() || null,
    nacionalidade: nacionalidade?.trim() || 'Brasileiro(a)',
    estadoCivil: estadoCivil?.trim() || null,
    profissao: profissao?.trim() || null,
    situacao: situacaoIdFinal,
    motivoDescarte: null,
    comentario: comentario || null,
    origem: origemIdFinal,
    tags: processedTags,
    responsavel: responsavelIdFinal,
    company: companyId,
    createdBy: userId,
    ativo: true,
    coadquirentes: processedCoadquirentes,
  });

  try {
    const leadSalvo = await novoLead.save();
    console.log(`[createLead] Lead criado com sucesso: ${leadSalvo._id}`);
    await logHistory(leadSalvo._id, userId, "CRIACAO", "Lead criado.");
    return leadSalvo;
  } catch (error) {
    console.error(`[createLead] Falha ao salvar lead:`, error);
    if (error.code === 11000) {
      throw new Error("Lead duplicado: já existe um lead com estes dados.");
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

  const leadExistente = await Lead.findOne({ _id: id, company: companyId });
  if (!leadExistente) throw new Error("Lead não encontrado nesta empresa.");

  const {
    nome, contato, email, cpf, rg, nacionalidade, estadoCivil, profissao,
    nascimento, endereco, comentario, origem, responsavel, situacao, motivoDescarte,
    tags, coadquirentes
  } = leadData;

  const updateFields = {};

  // Campos básicos
  if (nome !== undefined) updateFields.nome = nome.trim();
  if (email !== undefined) updateFields.email = email ? email.trim().toLowerCase() : null;
  if (rg !== undefined) updateFields.rg = rg?.trim() || null;
  if (nacionalidade !== undefined) updateFields.nacionalidade = nacionalidade?.trim() || null;
  if (estadoCivil !== undefined) updateFields.estadoCivil = estadoCivil?.trim() || null;
  if (profissao !== undefined) updateFields.profissao = profissao?.trim() || null;
  if (nascimento !== undefined) updateFields.nascimento = nascimento || null;
  if (endereco !== undefined) updateFields.endereco = endereco;
  if (comentario !== undefined) updateFields.comentario = comentario?.trim() || null;

  // Contato
  if (contato !== undefined) {
    const contatoLimpo = String(contato).replace(/\D/g, "");
    if (contatoLimpo.length < 10 || contatoLimpo.length > 11) throw new Error("Contato inválido.");
    updateFields.contato = contatoLimpo;
  }

  // CPF
  if (cpf !== undefined) {
    const cpfLimpo = cpf ? String(cpf).replace(/\D/g, "") : null;
    if (cpfLimpo && !cpfcnpj.cpf.isValid(cpfLimpo)) throw new Error("CPF inválido.");
    updateFields.cpf = cpfLimpo;
  }

  // Coadquirentes
  if (coadquirentes !== undefined) {
    if (!Array.isArray(coadquirentes)) throw new Error("Coadquirentes deve ser um array.");
    updateFields.coadquirentes = coadquirentes.map(co => {
      if (!co.nome) throw new Error("Nome do coadquirente é obrigatório.");
      const coCpf = co.cpf ? String(co.cpf).replace(/\D/g, "") : null;
      if (coCpf && !cpfcnpj.cpf.isValid(coCpf)) throw new Error(`CPF do coadquirente '${co.nome}' é inválido.`);
      return {
        nome: co.nome.trim(),
        cpf: coCpf || null,
        rg: co.rg?.trim() || null,
        nacionalidade: co.nacionalidade?.trim() || "Brasileiro(a)",
        estadoCivil: co.estadoCivil?.trim() || null,
        profissao: co.profissao?.trim() || null,
      };
    });
  }

  // Tags
  if (tags !== undefined) {
    if (!Array.isArray(tags)) throw new Error("Tags deve ser um array.");
    updateFields.tags = [...new Set(tags.map(tag => tag.trim()).filter(Boolean))];
  }

  // Situação e Motivo de Descarte
  if (situacao !== undefined) {
    if (!mongoose.Types.ObjectId.isValid(situacao)) throw new Error("Situação inválida.");
    const situacaoDoc = await LeadStage.findOne({ _id: situacao, company: companyId });
    if (!situacaoDoc) throw new Error("Situação não encontrada.");
    updateFields.situacao = situacao;

    // Valida motivo de descarte
    if (situacaoDoc.nome.toLowerCase() === "descartado") {
      if (!motivoDescarte || !mongoose.Types.ObjectId.isValid(motivoDescarte)) {
        throw new Error("Motivo de descarte obrigatório para leads descartados.");
      }
      const motivoDoc = await LeadDiscardReason.findOne({ _id: motivoDescarte, company: companyId });
      if (!motivoDoc) throw new Error("Motivo de descarte inválido.");
      updateFields.motivoDescarte = motivoDescarte;
    } else {
      updateFields.motivoDescarte = null;
    }

    // Libera reserva se saiu do estágio de reserva
    if (
      leadExistente.situacao &&
      String(leadExistente.situacao) !== String(situacao) &&
      leadExistente.statusReserva === "reservado"
    ) {
      await liberarReservaDoLead(leadExistente._id);
      updateFields.statusReserva = "nenhum";
    }
  }

  // Origem
  if (origem !== undefined) {
    if (!mongoose.Types.ObjectId.isValid(origem)) throw new Error("Origem inválida.");
    const origemDoc = await Origem.findOne({ _id: origem, company: companyId });
    if (!origemDoc) throw new Error("Origem não encontrada.");
    updateFields.origem = origem;
  }

  // Responsável
  if (responsavel !== undefined) {
    if (!mongoose.Types.ObjectId.isValid(responsavel)) throw new Error("Responsável inválido.");
    const userDoc = await User.findOne({ _id: responsavel, company: companyId });
    if (!userDoc) throw new Error("Responsável não encontrado.");
    updateFields.responsavel = responsavel;
  }

  if (Object.keys(updateFields).length === 0) {
    console.warn(`[updateLead] Nenhum campo para atualizar ID: ${id}.`);
    return await leadExistente.populate([
      { path: "situacao", select: "nome ordem" },
      { path: "origem", select: "nome" },
      { path: "responsavel", select: "nome perfil" },
      { path: "motivoDescarte", select: "nome" },
    ]);
  }

  // Transação
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const updatedLead = await Lead.findOneAndUpdate(
      { _id: id, company: companyId },
      { $set: updateFields },
      { new: true, runValidators: true, session }
    );
    if (!updatedLead) throw new Error("Falha ao encontrar ou atualizar o lead.");

    await logHistory(updatedLead._id, userId, "EDICAO_DADOS", leadExistente.toObject(), updateFields);

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
    console.error("[updateLead] Erro na transação:", error);
    if (error.code === 11000) throw new Error("Erro de duplicidade ao atualizar.");
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
 * Importa leads de um buffer de arquivo CSV, chamando o serviço createLead para cada um.
 * @param {Buffer} fileBuffer - O buffer do arquivo CSV.
 * @param {string} companyId - ID da empresa.
 * @param {string} createdByUserId - ID do usuário que está fazendo a importação.
 * @returns {Promise<object>} Um resumo da importação.
 */
const importLeadsFromCSV = async (fileBuffer, companyId, createdByUserId) => {
    console.log(`[LeadSvc Import] Iniciando importação de CSV para Company: ${companyId}`);
    
    // Lista para armazenar as linhas lidas do CSV
    const rows = [];

    // Promise para garantir que a leitura do arquivo termine antes de continuarmos
    await new Promise((resolve, reject) => {
        const readableStream = stream.Readable.from(fileBuffer);
        readableStream
            .pipe(csv({
                delimiter: ';', // Forçando ponto e vírgula, que é o formato do seu arquivo
                mapHeaders: ({ header }) => header.trim().toLowerCase(), // Limpa os cabeçalhos
            }))
            .on('data', (data) => rows.push(data))
            .on('end', () => {
                console.log(`[LeadSvc Import] Parsing do CSV finalizado. ${rows.length} linhas de dados encontradas.`);
                resolve();
            })
            .on('error', (error) => {
                console.error("[LeadSvc Import] Erro ao ler o stream do CSV:", error);
                reject(new Error("Falha na leitura do arquivo CSV."));
            });
    });

    // Agora que temos todas as linhas em 'rows', processamos uma a uma
    let importedCount = 0;
    const importErrors = [];

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const lineNumber = i + 2; // +1 pelo índice 0, +1 pelo cabeçalho pulado

        try {
            // Monta o objeto leadData exatamente como a função createLead espera
            const leadDataParaCriar = {
                nome: row.nome,
                email: row.email,
                contato: row.telefone, // O CSV tem 'telefone', mas createLead pode esperar 'contato'
                cpf: row.cpf,
                origem: row.origem, // createLead vai precisar buscar o ID a partir do nome
                situacao: row.situacao, // createLead vai precisar buscar o ID a partir do nome
                comentario: row.comentario,
                // Adicione outros campos do seu CSV aqui
            };

            // Chama a função createLead que já existe e funciona!
            await createLead(leadDataParaCriar, companyId, createdByUserId);
            importedCount++;
            
        } catch (error) {
            console.error(`[LeadSvc Import] Erro na linha ${lineNumber}:`, error.message);
            importErrors.push({
                line: lineNumber,
                error: error.message, // A mensagem de erro virá da própria função createLead
                data: row
            });
        }
    }
    
    // Retorna o resumo final
    const summary = {
        totalRows: rows.length,
        importedCount: importedCount,
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
