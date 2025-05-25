// services/LeadService.js

const mongoose = require("mongoose");
const Lead = require("../models/Lead");
const Origem = require("../models/origem");
const LeadStage = require("../models/LeadStage");
const User = require("../models/User");
const DiscardReason = require("../models/DiscardReason");
const LeadHistory = require("../models/LeadHistory");
const Reserva = require("../models/Reserva");
const Unidade = require("../models/Unidade");

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

const getLeads = async (queryParams = {}, companyId) => {
  if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
    throw new Error(
      "ID da empresa inválido ou não fornecido para buscar leads."
    );
  }
  try {
    console.log(`[getLeads] Empresa: ${companyId}, Query Params:`, queryParams);
    let page = parseInt(queryParams.page, 10) || 1;
    let limit = parseInt(queryParams.limit, 10) || 10;
    limit = Math.min(Math.max(1, limit), 100);
    page = Math.max(1, page);
    const skip = (page - 1) * limit;
    const queryConditions = { company: companyId }; // Filtro base por empresa
    const filters = queryParams;

    // Adiciona filtros opcionais
    if (filters.nome)
      queryConditions.nome = { $regex: filters.nome, $options: "i" };
    if (filters.email)
      queryConditions.email = { $regex: filters.email, $options: "i" };
    if (filters.situacao && mongoose.Types.ObjectId.isValid(filters.situacao))
      queryConditions.situacao = filters.situacao;
    if (filters.origem && mongoose.Types.ObjectId.isValid(filters.origem))
      queryConditions.origem = filters.origem;
    if (
      filters.responsavel &&
      mongoose.Types.ObjectId.isValid(filters.responsavel)
    )
      queryConditions.responsavel = filters.responsavel;

    // Filtro de Data
    const dateQuery = {};
    if (filters.dataInicio) {
      try {
        const d = new Date(filters.dataInicio);
        d.setUTCHours(0, 0, 0, 0);
        if (!isNaN(d)) dateQuery.$gte = d;
      } catch (e) {
        console.warn("Erro Data Inicio", e);
      }
    }
    if (filters.dataFim) {
      try {
        const d = new Date(filters.dataFim);
        d.setUTCHours(23, 59, 59, 999);
        if (!isNaN(d)) dateQuery.$lte = d;
      } catch (e) {
        console.warn("Erro Data Fim", e);
      }
    }
    if (Object.keys(dateQuery).length > 0)
      queryConditions.createdAt = dateQuery;

    console.log(
      "[getLeads] Condições Query MongoDB:",
      JSON.stringify(queryConditions, null, 2)
    );

    // Busca e Contagem
    const [totalLeads, leads] = await Promise.all([
      Lead.countDocuments(queryConditions),
      Lead.find(queryConditions)
        .populate("situacao", "nome ordem")
        .populate("origem", "nome")
        .populate("responsavel", "nome perfil")
        .populate("motivoDescarte", "nome")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
    ]);

    const totalPages = Math.ceil(totalLeads / limit);
    console.log(
      `[getLeads] Empresa ${companyId}: ${leads.length}/${totalLeads} leads (Pág ${page}/${totalPages})`
    );
    return { leads, totalLeads, currentPage: page, totalPages, limit };
  } catch (err) {
    console.error(`[getLeads] Erro para empresa ${companyId}:`, err);
    throw new Error("Erro ao buscar os leads.");
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

const createLead = async (leadData, companyId, userId) => {
  console.log(
    "[createLead DEBUG] Dados recebidos em leadData:",
    JSON.stringify(leadData, null, 2)
  );
  console.log(`[createLead DEBUG] companyId: ${companyId}, userId: ${userId}`);

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
    situacao,
    origem,
    responsavel,
    comentario,
  } = leadData;

  // 1. Validação Campos Mínimos
  if (!nome || !contato) {
    throw new Error("Nome e Contato são obrigatórios.");
  }

  // 2. Validação/Formatação Contato
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

  // 3. Validação CPF
  let cpfLimpo = null;
  if (cpf) {
    cpfLimpo = cpf.replace(/\D/g, "");
    if (!cpfcnpj.cpf.isValid(cpfLimpo)) {
      throw new Error(`CPF inválido: ${cpf}`);
    }
  }

  // 4. Determinar/Validar IDs de Referência (Dentro da Empresa)
  let situacaoIdFinal = null;
  let origemIdFinal = null;
  let responsavelIdFinal =
    leadData.responsavel ||
    userId ||
    (await getDefaultAdminUserIdForCompany(companyId));

  // Responsável (Default = LoggedIn User)
  if (responsavel && mongoose.Types.ObjectId.isValid(responsavelIdFinal)) {
    const doc = await User.findOne({
      _id: responsavel,
      company: companyId,
    }).lean();
    if (!doc)
      throw new Error(
        `Responsável ID ${responsavel} inválido ou não pertence à empresa.`
      );
    responsavelIdFinal = doc._id;
  } else {
    const currentUser = await User.findById(userId).lean();
    if (!currentUser || !currentUser.company.equals(companyId))
      throw new Error(
        "Usuário logado inválido ou não pertence a esta empresa."
      );
    responsavelIdFinal = currentUser._id;
  }

  // Situação (Default = Primeira por ordem, não descartado)
  if (situacao && mongoose.Types.ObjectId.isValid(situacao)) {
    const doc = await LeadStage.findOne({
      _id: situacao,
      company: companyId,
    }).lean();
    if (!doc)
      throw new Error(
        `Situação ID ${situacao} inválida ou não pertence à esta empresa.`
      );
    situacaoIdFinal = doc._id;
  } else {
    const doc = await LeadStage.findOne({
      company: companyId,
      nome: { $ne: "Descartado" },
      ativo: true,
    })
      .sort({ ordem: 1 })
      .lean();
    if (!doc)
      throw new Error(
        `Nenhuma situação padrão ativa encontrada para a empresa ${companyId}.`
      );
    situacaoIdFinal = doc._id;
  }

  // Origem (Default = null)
  console.log(
    `[createLead DEBUG] Valor de 'origem' recebido do frontend: ID = ${origem}, Tipo = ${typeof origem}`
  ); // <<< DEBUG LOG 1
  if (origem && mongoose.Types.ObjectId.isValid(origem)) {
    // Se origem foi fornecida E válida, tenta encontrar na empresa
    const doc = await Origem.findOne({
      _id: origem,
      company: companyId,
    }).lean();
    if (!doc)
      throw new Error(
        `Origem fornecida (ID: ${origem}) inválida ou não pertence a esta empresa.`
      );
    origemIdFinal = doc._id;
    console.log(`[createLead] Usando Origem fornecida: ${origemIdFinal}`);
  } else {
    // Origem não fornecida ou inválida, busca/cria default "Sistema Gestor"
    const nomeDefault = "Sistema Gestor";
    console.log(
      `[createLead] Origem não fornecida/inválida. Buscando/Criando default '${nomeDefault}'...`
    );

    // Tenta encontrar a origem padrão para esta empresa
    let defaultOrigin = await Origem.findOne({
      nome: nomeDefault,
      company: companyId,
    });

    if (!defaultOrigin) {
      console.log(
        `[createLead] Origem '${nomeDefault}' não encontrada para ${companyId}. Tentando criar...`
      );
      try {
        defaultOrigin = await origemService.createOrigem(
          {
            nome: nomeDefault,
            descricao: "Lead cadastrado diretamente pelo sistema.",
          },
          companyId
        );
        console.log(
          `[createLead] Origem padrão '${nomeDefault}' criada com ID: ${defaultOrigin._id}`
        );
      } catch (creationError) {
        console.error(
          `[createLead] Falha ao tentar criar origem padrão '${nomeDefault}' para ${companyId}:`,
          creationError
        );
        throw new Error(
          `Falha ao criar/encontrar origem padrão 'Sistema Gestor'. ${creationError.message}`
        );
      }
    }
    origemIdFinal = defaultOrigin._id;
    console.log(
      `[createLead] Usando Origem padrão '${nomeDefault}': ${origemIdFinal}`
    );
  }

  // 5. Criação do Novo Lead
  const novoLead = new Lead({
    nome: nome.trim(),
    contato: formattedPhoneNumber,
    email: email ? email.trim().toLowerCase() : null,
    nascimento: nascimento || null,
    endereco: endereco || null,
    cpf: cpfLimpo,
    situacao: situacaoIdFinal,
    motivoDescarte: null, // Sempre null na criação
    comentario: comentario || null,
    origem: origemIdFinal,
    responsavel: responsavelIdFinal,
    company: companyId, // Associa à empresa
  });

  // 6. Salvar
  try {
    const leadSalvo = await novoLead.save();
    console.log("[createLead] Lead salvo:", leadSalvo._id);
    await logHistory(leadSalvo._id, userId, "CRIACAO", "Lead criado.");
    return leadSalvo;
  } catch (error) {
    console.error("[createLead] Erro ao salvar:", error);
    throw new Error(error.message || "Erro interno ao salvar lead.");
  }
};

const updateLead = async (id, leadData, companyId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new Error("ID de Lead inválido.");
  if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) throw new Error("ID da empresa inválido.");
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) throw new Error("ID do usuário inválido.");

  const {
    nome,
    contato,
    email,
    nascimento,
    endereco,
    cpf,
    responsavel,
    situacao,
    motivoDescarte,
    comentario,
    origem,
  } = leadData;

  const updateFields = {};

  if (nome !== undefined) updateFields.nome = nome.trim();
  if (email !== undefined) updateFields.email = email ? email.trim().toLowerCase() : null;
  if (nascimento !== undefined) updateFields.nascimento = nascimento || null;
  if (endereco !== undefined) updateFields.endereco = endereco;
  if (comentario !== undefined) updateFields.comentario = comentario;

  if (contato !== undefined) {
    if (contato === null || String(contato).trim() === "") {
      updateFields.contato = null;
    } else {
      const phoneNumber = phoneUtil.parseAndKeepRawInput(contato, null);
      if (!phoneUtil.isValidNumber(phoneNumber)) throw new Error(`Número de contato inválido: ${contato}`);
      updateFields.contato = phoneUtil.format(phoneNumber, PNF.E164);
    }
  }

  if (cpf !== undefined) {
    if (cpf === null || cpf === "") {
      updateFields.cpf = null;
    } else {
      const cpfLimpo = cpf.replace(/\D/g, "");
      if (!cpfcnpj.cpf.isValid(cpfLimpo)) throw new Error(`CPF inválido: ${cpf}`);
      updateFields.cpf = cpfLimpo;
    }
  }

  let nomeSituacaoAntiga = "", nomeSituacaoNova = "";

  try {
    const leadOriginal = await Lead.findOne({ _id: id, company: companyId }).select("situacao").populate("situacao", "nome").lean();
    if (leadOriginal?.situacao?.nome) nomeSituacaoAntiga = leadOriginal.situacao.nome;

    const [situacaoDoc, motivoDoc, origemDoc, responsavelDoc] = await Promise.all([
      situacao !== undefined && mongoose.Types.ObjectId.isValid(situacao)
        ? LeadStage.findOne({ _id: situacao, company: companyId })
        : null,
      motivoDescarte !== undefined && mongoose.Types.ObjectId.isValid(motivoDescarte)
        ? DiscardReason.findById(motivoDescarte).lean()
        : null,
      origem !== undefined && mongoose.Types.ObjectId.isValid(origem)
        ? Origem.findOne({ _id: origem, company: companyId }).lean()
        : null,
      responsavel !== undefined && mongoose.Types.ObjectId.isValid(responsavel)
        ? User.findOne({ _id: responsavel, company: companyId }).lean()
        : null,
    ]);

    if (situacao !== undefined) {
      if (!situacaoDoc) throw new Error("Situação inválida ou não pertence à empresa.");
      updateFields.situacao = situacaoDoc._id;
      nomeSituacaoNova = situacaoDoc.nome;

      if (situacaoDoc.nome !== "Descartado") {
        updateFields.motivoDescarte = null;
        updateFields.comentario = null;
      } else {
        if (!motivoDoc) throw new Error("Motivo de descarte inválido.");
        updateFields.motivoDescarte = motivoDoc._id;
        if (comentario !== undefined) updateFields.comentario = comentario;
      }
    } else {
      if (motivoDescarte !== undefined && !motivoDoc) throw new Error("Motivo de descarte inválido.");
      if (motivoDoc) updateFields.motivoDescarte = motivoDoc._id;
      if (comentario !== undefined) updateFields.comentario = comentario;
    }

    if (origem !== undefined && origemDoc) updateFields.origem = origemDoc._id;
    if (responsavel !== undefined && responsavelDoc) updateFields.responsavel = responsavelDoc._id;
  } catch (e) {
    throw new Error(e.message);
  }

  if (Object.keys(updateFields).length === 0) return await getLeadById(id, companyId);

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const updatedLead = await Lead.findOneAndUpdate(
      { _id: id, company: companyId },
      { $set: updateFields },
      { new: true, runValidators: true, session }
    );

    if (!updatedLead) throw new Error("Lead não encontrado nesta empresa.");

    if (nomeSituacaoAntiga.toLowerCase().includes("em reserva")) {
      const proximosEstagiosPermitidos = ["proposta", "proposta aceita", "vendido"];


      if (!proximosEstagiosPermitidos.some(s => nomeSituacaoNova.toLowerCase().includes(s))) {
        console.log(`[updateLead DEBUG] Lead <span class="math-inline">\{id\} saiu de 'Em Reserva' para '</span>{nomeSituacaoNovaEfetiva}'. Tentando cancelar reserva.`);
      
        const reservaAtiva = await Reserva.findOne({ lead: id, statusReserva: "Ativa", company: companyId });

        if (reservaAtiva) {

          console.log(`[updateLead DEBUG] Reserva ATIVA encontrada: ${reservaAtiva._id}`);
          const unidadeIdDaReserva = reservaAtiva.unidade;
          reservaAtiva.statusReserva = "Cancelada";

          const unidade = await Unidade.findById(unidadeIdDaReserva).session(session);

          if (unidade && unidade?.company?.equals(companyId)) {
            console.log(`[updateLead DEBUG] Unidade ${unidadeIdDaReserva} encontrada. currentReservaId: ${unidade.currentReservaId}, reservaAtiva._id: ${reservaAtiva._id}`);

            if (unidade.currentReservaId && unidade.currentReservaId?.equals(reservaAtiva._id)) {
              console.log(`[updateLead DEBUG] Condição para liberar unidade ATENDIDA. Alterando status da unidade...`);
              unidade.statusUnidade = "Disponível";
              unidade.currentLeadId = null;
              unidade.currentReservaId = null;
              await unidade.save({ session });
              console.log(`[updateLead] Unidade ${unidadeIdDaReserva} status alterado para Disponível.`);

              await logHistory(id, userId, "UNIDADE_LIBERADA", `Unidade ${unidade.identificador} liberada.`, { reservaId: reservaAtiva._id, unidadeId: unidade._id });
            }
          }
          reservaAtiva.statusReserva = "Cancelada";
          await reservaAtiva.save({ session });
          console.log(`[updateLead] Reserva ${reservaAtiva._id} status alterado para Cancelada.`);

          await logHistory(id, userId, "RESERVA_CANCELADA_STATUS_LEAD", `Reserva cancelada devido mudança de status para '${nomeSituacaoNova}'.`, { oldReservaStatus: "Ativa", newReservaStatus: "Cancelada" });
        }
      }
    }

    await logHistory(updatedLead._id, userId, "ATUALIZACAO", `Campos atualizados: ${Object.keys(updateFields).join(", ")}`);

    await session.commitTransaction();
    session.endSession();

    await updatedLead.populate([
      { path: "situacao", select: "nome ordem" },
      { path: "origem", select: "nome" },
      { path: "responsavel", select: "nome perfil" },
      { path: "motivoDescarte", select: "nome" },
    ]);

    return updatedLead;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw new Error(error.message);
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

// --- EXPORTS ---
module.exports = {
  getLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
  descartarLead,
  logHistory,
};
