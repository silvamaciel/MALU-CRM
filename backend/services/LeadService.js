// services/LeadService.js

const mongoose = require("mongoose");
const Lead = require("../models/Lead");
const Origem = require("../models/Origem");
const LeadStage = require("../models/LeadStage");
const User = require("../models/User");
const DiscardReason = require("../models/DiscardReason");
const cpfcnpj = require("cpf-cnpj-validator");
const phoneUtil = require("google-libphonenumber");
const PNF = require("google-libphonenumber");
const LeadHistory = require("../models/LeadHistory");

// --- GET Leads (Mantém Filtros e Paginação) ---
const getLeads = async (queryParams = {}) => {
  try {
    console.log("[getLeads] Query Params:", queryParams);
    let page = parseInt(queryParams.page, 10) || 1;
    let limit = parseInt(queryParams.limit, 10) || 10;
    limit = Math.min(limit, 100);
    page = Math.max(1, page);
    limit = Math.max(1, limit);
    const skip = (page - 1) * limit;
    const queryConditions = {};
    const filters = queryParams;
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
    const dateQuery = {};
    if (filters.dataInicio) {
      try {
        /*...*/
      } catch (e) {
        /*...*/
      }
    }
    if (filters.dataFim) {
      try {
        /*...*/
      } catch (e) {
        /*...*/
      }
    }
    if (Object.keys(dateQuery).length > 0)
      queryConditions.createdAt = dateQuery;
    console.log(
      "[getLeads] Condições Query:",
      JSON.stringify(queryConditions, null, 2)
    );
    const [totalLeads, leads] = await Promise.all([
      Lead.countDocuments(queryConditions),
      Lead.find(queryConditions)
        .populate("situacao", "nome")
        .populate("origem", "nome")
        .populate("responsavel", "nome perfil")
        .populate("motivoDescarte", "nome")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
    ]);
    const totalPages = Math.ceil(totalLeads / limit);
    console.log(
      `[getLeads] ${leads.length}/${totalLeads} leads (Pág ${page}/${totalPages})`
    );
    return { leads, totalLeads, currentPage: page, totalPages, limit };
  } catch (err) {
    /* ... tratamento erro ... */
  }
};

// --- GET Lead By Id (Remove populate de motivoDescarte) ---
const getLeadById = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("ID inválido.");
  }
  const lead = await Lead.findById(id)
    .populate("situacao", "nome")
    .populate("origem", "nome")
    .populate("responsavel", "nome perfil")
    .populate("motivoDescarte", "nome");
  if (!lead) throw new Error("Lead não encontrado");
  return lead;
};

const createLead = async (leadData) => {
  const {
    nome,
    contato,
    email,
    nascimento,
    endereco, // SEM CPF
    situacao, // ID Obrigatório
    motivoDescarte,
    comentario,
    origem, // ID Obrigatório
    responsavel, // ID Obrigatório
  } = leadData;

  // Validação básica de campos que deveriam vir (Schema também valida 'required')
  if (!nome || !contato || !email || !situacao || !origem || !responsavel) {
    throw new Error(
      "Campos obrigatórios (Nome, Contato, Email, Situação, Origem, Responsável) não foram fornecidos."
    );
  }

  // REMOVIDO: Validação/Formatação de Contato
  // REMOVIDO: Validação de CPF

  // --- Validações dos IDs de Referência ---
  // (Garante que os IDs obrigatórios são válidos e existem)
  const [responsavelDoc, origemDoc, situacaoDoc] = await Promise.all([
    User.findById(responsavel).lean(),
    Origem.findById(origem).lean(), // Usa Origem do topo
    LeadStage.findById(situacao).lean(),
  ]).catch((err) => {
    throw new Error("Erro ao verificar referências.");
  });

  if (!responsavelDoc) throw new Error("Responsável não encontrado");
  if (!origemDoc) throw new Error("Origem não encontrada");
  if (!situacaoDoc) throw new Error("Situação não encontrada");
  // --------------------------------------

  const novoLead = new Lead({
    nome,
    contato, // <-- Salva o contato raw (como veio)
    email,
    nascimento: nascimento || null,
    endereco: endereco || null,
    // SEM CPF
    situacao: situacaoDoc._id,
    motivoDescarte: motivoDescarte || null, // Continua sendo String
    comentario: comentario || null,
    origem: origemDoc._id,
    responsavel: responsavelDoc._id,
  });

  // --- Salvar ---
  try {
    const leadSalvo = await novoLead.save();

    await logHistory(leadSalvo._id, null, "CRIACAO", "Lead criado.");

    return leadSalvo;
  } catch (error) {
    console.error("[createLead] Erro ao salvar:", error);
    throw new Error(error.message || "Erro interno ao salvar lead.");
  }
};

const updateLead = async (id, leadData) => {
  console.log(`--- [updateLead] Iniciando para ID: ${id} ---`);
  console.log(
    "[updateLead] leadData recebido:",
    JSON.stringify(leadData, null, 2)
  );

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("ID de Lead inválido.");
  }

  const {
    nome,
    contato,
    email,
    nascimento,
    endereco, // SEM CPF neste estado do código
    responsavel, // ID
    situacao, // ID
    motivoDescarte, // STRING (neste estado do código)
    comentario,
    origem, // ID
  } = leadData;

  const updateFields = {};

  // Campos simples (exceto motivo/comentario que dependem da situação)
  if (nome !== undefined) updateFields.nome = nome;
  if (contato !== undefined) updateFields.contato = contato; // Salva o contato raw (sem formatação E.164 nesta versão)
  if (email !== undefined) updateFields.email = email;
  if (nascimento !== undefined) updateFields.nascimento = nascimento;
  if (endereco !== undefined) updateFields.endereco = endereco;
  // NÃO adiciona motivoDescarte/comentario aqui ainda

  // REMOVIDO: Validação/Formatação de Contato e CPF (conforme o estado revertido)

  try {
    // Try/catch em volta das validações de ID
    // --- Handle Referências ---
    if (situacao !== undefined) {
      console.log("[updateLead] Processando Situação ID:", situacao);
      if (!mongoose.Types.ObjectId.isValid(situacao))
        throw new Error("ID Situação inválido.");

      // Busca o documento completo para ler o nome
      const situacaoDoc = await LeadStage.findById(situacao);
      if (!situacaoDoc)
        throw new Error("Situação não encontrada para o ID fornecido.");

      console.log(
        `[updateLead] Nova situação encontrada: ID=${situacaoDoc._id}, Nome="${situacaoDoc.nome}"`
      );
      updateFields.situacao = situacaoDoc._id; // Adiciona a nova situação ao update

      // *** LÓGICA ESSENCIAL ADICIONADA AQUI ***
      // Verifica o NOME da nova situação
      // !!! Garanta que o nome no seu DB é EXATAMENTE "Descartado" !!!
      if (situacaoDoc.nome !== "Descartado") {
        // Se NÃO for "Descartado", força a limpeza dos campos de descarte
        console.log(
          `[updateLead] Limpando motivoDescarte e comentario porque a nova situação é "${situacaoDoc.nome}".`
        );
        updateFields.motivoDescarte = null;
        updateFields.comentario = null;
      } else {
        // Se a nova situação FOR "Descartado", permite que motivo/comentário sejam atualizados
        // (se eles vieram no leadData)
        console.log(
          `[updateLead] Nova situação é "Descartado". Atualizando motivo/comentário se fornecidos.`
        );
        if (motivoDescarte !== undefined)
          updateFields.motivoDescarte = motivoDescarte;
        if (comentario !== undefined) updateFields.comentario = comentario;
      }
      // *** FIM DA LÓGICA ADICIONADA ***
    } else {
      // Se a situação NÃO foi alterada no payload,
      // permite que motivoDescarte e comentario sejam atualizados se vieram
      if (motivoDescarte !== undefined)
        updateFields.motivoDescarte = motivoDescarte;
      if (comentario !== undefined) updateFields.comentario = comentario;
    }

    if (origem !== undefined) {
      console.log("[updateLead] Processando Origem ID:", origem);
      if (!mongoose.Types.ObjectId.isValid(origem))
        throw new Error("ID Origem inválido.");
      const origemDoc = await Origem.findById(origem).lean(); // Usa Origem do topo
      if (!origemDoc)
        throw new Error("Origem não encontrada para o ID fornecido.");
      updateFields.origem = origemDoc._id;
      console.log(
        `[updateLead] OK - Adicionado ao updateFields: origem=${updateFields.origem}`
      );
    }

    if (responsavel !== undefined) {
      console.log("[updateLead] Processando Responsavel ID:", responsavel);
      if (!mongoose.Types.ObjectId.isValid(responsavel))
        throw new Error("ID Responsável inválido.");
      const responsavelDoc = await User.findById(responsavel).lean();
      if (!responsavelDoc)
        throw new Error("Responsável não encontrado para o ID fornecido.");
      updateFields.responsavel = responsavelDoc._id;
      console.log(
        `[updateLead] OK - Adicionado ao updateFields: responsavel=${updateFields.responsavel}`
      );
    }
  } catch (validationError) {
    console.error("[updateLead] Erro durante validação:", validationError);
    throw validationError;
  }

  // --- Executa Update ---
  if (Object.keys(updateFields).length === 0) {
    console.warn(`[updateLead] Nenhum campo para atualizar ID: ${id}`);
    return await getLeadById(id); // Retorna o lead sem alterações
  }

  console.log(
    "[updateLead] Objeto FINAL updateFields:",
    JSON.stringify(updateFields, null, 2)
  ); // Log crucial

  try {
    const updatedLead = await Lead.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true, runValidators: true } // runValidators valida o schema no update
    );

    if (!updatedLead) {
      throw new Error("Lead não encontrado (update falhou).");
    }
    console.log(
      "[updateLead] Raw updated doc:",
      JSON.stringify(updatedLead, null, 2)
    );

    // Re-populate para retornar dados consistentes
    await updatedLead.populate([
      { path: "situacao", select: "nome" },
      { path: "origem", select: "nome" },
      { path: "responsavel", select: "nome perfil" },
      // Não popula motivoDescarte pois é String aqui
    ]);

    // <<< ADICIONAR LOG DE HISTÓRICO >>>
    // Detalhe simples por enquanto
    const changedFields = Object.keys(updateFields).join(", "); // Lista campos que foram enviados para update
    // Verifica se a ação foi uma reativação (mudou para NÃO descartado)
    let actionType = "ATUALIZACAO";
    if (
      updateFields.situacao &&
      !updateFields.motivoDescarte &&
      !updateFields.comentario
    ) {
      // Se situacao mudou E motivo/comentário foram setados para null, pode ser reativação
      // Precisaria buscar o status ANTES para ter certeza, simplificando por agora
      const situacaoDoc = await LeadStage.findById(
        updateFields.situacao
      ).lean();
      if (situacaoDoc && situacaoDoc.nome !== "Descartado") {
        // Se a nova situação NÃO é descartado E a limpeza ocorreu, chamamos de REATIVACAO
        // (Nota: isso pode logar reativação mesmo se já estava ativo, melhoria futura seria checar status anterior)
        actionType = "REATIVACAO";
        await logHistory(
          updatedLead._id,
          null,
          actionType,
          `Lead reativado para "${situacaoDoc.nome}".`
        );
      }
    }
    // Log genérico de atualização se não for reativação específica
    if (actionType === "ATUALIZACAO") {
      await logHistory(
        updatedLead._id,
        null,
        actionType,
        `Campos alterados: ${changedFields}`
      );
    }
    // <<< FIM ADIÇÃO >>>

    return updatedLead;
  } catch (error) {
    console.error(
      "[updateLead] Erro durante findByIdAndUpdate/populate:",
      error
    );
    throw new Error(error.message || "Erro interno ao atualizar.");
  }
};

const deleteLead = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("ID inválido.");
  }
  const deleted = await Lead.findByIdAndDelete(id);
  if (!deleted) throw new Error("Lead não encontrado");
  return { message: "Lead deletado com sucesso" };
};

const descartarLead = async (id, dados) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("ID de Lead inválido.");
  }
  const { motivoDescarte, comentario } = dados; // motivoDescarte agora é um ID

  // Valida se o ID do motivo foi enviado e é válido
  if (!motivoDescarte || !mongoose.Types.ObjectId.isValid(motivoDescarte)) {
    throw new Error("ID do motivo de descarte inválido ou não fornecido.");
  }

  // Busca a situação "Descartado" (igual antes)
  const situacaoDescartado = await LeadStage.findOne({
    nome: "Descartado",
  }).lean(); // <-- Nome Exato!
  if (!situacaoDescartado) {
    throw new Error("Configuração: Situação 'Descartado' não encontrada.");
  }

  // Valida se o motivo realmente existe no banco ANTES de atualizar o lead
  const reasonExists = await DiscardReason.findById(motivoDescarte); // Sem .lean()
    if (!reasonExists) { throw new Error(`Motivo ID ${motivoDescarte} não encontrado.`); }

  // Atualiza o lead com o ID da situação e o ID do motivo
  const lead = await Lead.findByIdAndUpdate(
    id,
    {
      situacao: situacaoDescartado._id,
      motivoDescarte: reasonExists._id, // <<< Salva o ID do motivo validado
      comentario: comentario || null,
    },
    { new: true } // Retorna o documento atualizado
  )
    // Popula os nomes para retornar ao frontend
    .populate("situacao", "nome")
    .populate("motivoDescarte", "nome");

  if (!lead) {
    throw new Error("Lead não encontrado (não foi possível descartar).");
  }

  const details = `Motivo: ${reasonExists.nome}${dados.comentario ? ' | Comentário: ' + dados.comentario : ''}`;
  await logHistory(lead._id, null, "DESCARTE", details);
  
  return lead;
};

const logHistory = async (leadId, userId, action, details) => {
  try {
    const historyEntry = new LeadHistory({
      lead: leadId,
      user: userId || null, // Usa null se userId não for passado
      action: action,
      details: details || "", // Garante que details seja string
    });
    await historyEntry.save();
    console.log(`[History] Logged: Lead ${leadId}, Action: ${action}`);
  } catch (error) {
    // Importante: Logar o erro do histórico, mas NÃO parar a operação principal
    console.error(
      `[History] FAILED to log: Lead ${leadId}, Action: ${action}`,
      error
    );
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
