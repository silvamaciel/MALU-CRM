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
const getLeads = async (companyId, queryParams = {}) => {
    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
        throw new Error("ID da empresa inválido ou não fornecido para buscar leads.");
    }

    // Paginação
    const page = parseInt(queryParams.page, 10) || 1;
    const limit = parseInt(queryParams.limit, 10) || 1000; // Limite alto para Kanban, ajuste se necessário
    const skip = (page - 1) * limit;

    // Condições da Query
    const queryConditions = { company: companyId };

    // VVVVV LÓGICA DE FILTROS AVANÇADOS ATUALIZADA VVVVV
    
    // Filtro unificado por Nome, Email ou CPF (busca textual)
    if (queryParams.termoBusca && queryParams.termoBusca.trim() !== '') {
        const searchTerm = queryParams.termoBusca.trim();
        const searchRegex = { $regex: searchTerm, $options: 'i' }; // 'i' para case-insensitive (busca aproximada)
        const cpfLimpo = searchTerm.replace(/\D/g, "");

        queryConditions.$or = [
            { nome: searchRegex },
            { email: searchRegex },
        ];
        // Adiciona busca por CPF ao $or se for um CPF válido
        if (cpfLimpo.length > 0) {
             queryConditions.$or.push({ cpf: cpfLimpo });
        }
    }
    
    // Filtros por ID (Origem, Responsável) - Você disse que estes já funcionam, ótimo!
    if (queryParams.origem && mongoose.Types.ObjectId.isValid(queryParams.origem)) {
        queryConditions.origem = queryParams.origem;
    }
    if (queryParams.responsavel && mongoose.Types.ObjectId.isValid(queryParams.responsavel)) {
        queryConditions.responsavel = queryParams.responsavel;
    }

    // Filtro por Tags (recebe uma string de tags separadas por vírgula)
    if (queryParams.tags && queryParams.tags.trim() !== '') {
        // Converte a string "vip, investidor" em um array ["vip", "investidor"]
        const tagsArray = queryParams.tags.split(',').map(tag => tag.trim().toLowerCase()).filter(Boolean);
        if (tagsArray.length > 0) {
            // $all busca leads que contenham TODAS as tags fornecidas.
            // Se preferir buscar leads com QUALQUER UMA das tags, use $in: tagsArray
            queryConditions.tags = { $all: tagsArray };
        }
    }

    // Filtro por Intervalo de Datas (baseado em createdAt)
    if (queryParams.dataInicio || queryParams.dataFim) {
        queryConditions.createdAt = {};
        if (queryParams.dataInicio) {
            // Adiciona T00:00:00.000Z para garantir que pega desde o início do dia
            queryConditions.createdAt.$gte = new Date(queryParams.dataInicio + "T00:00:00.000Z");
        }
        if (queryParams.dataFim) {
            // Adiciona T23:59:59.999Z para garantir que pega até o final do dia
            queryConditions.createdAt.$lte = new Date(queryParams.dataFim + "T23:59:59.999Z");
        }
    }

    // ^^^^^ FIM DA LÓGICA DE FILTROS ^^^^^

    console.log("[getLeads] Condições Query MongoDB:", JSON.stringify(queryConditions, null, 2));

    try {
        const totalLeads = await Lead.countDocuments(queryConditions);
        const totalPages = Math.ceil(totalLeads / limit) || 1;
        
        const leads = await Lead.find(queryConditions)
            .populate('situacao', 'nome ordem')
            .populate('origem', 'nome')
            .populate('responsavel', 'nome perfil')
            .sort({ updatedAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();
            
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
    tags,
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
    tags: leadData.tags || [],
    responsavel: responsavelIdFinal,
    company: companyId,
    tags: processedTags,
    createdBy: userId,
    ativo: true // Associa à empresa
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
 console.log(`--- [updateLead] Iniciando para ID: ${id}, Empresa: ${companyId}, User: ${userId} ---`);
  console.log("[updateLead] leadData recebido:", JSON.stringify(leadData, null, 2));

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("ID de Lead inválido.");
  }

  if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
    throw new Error("ID da empresa inválido.");
  }

  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("ID do usuário inválido.");
  }

  // --- BUSCA LEAD EXISTENTE PARA PEGAR O ESTADO ANTERIOR ---
  const leadExistente = await Lead.findOne({ _id: id, company: companyId });
  if (!leadExistente) {
    throw new Error("Lead não encontrado nesta empresa.");
  }

  const situacaoAntigaId = leadExistente.situacao;
  const nomeSituacaoAntiga = situacaoAntigaId ? await getStageNameById(situacaoAntigaId, companyId) : 'N/A';


  const {
    nome, contato, email, nascimento, endereco, cpf,
    responsavel, situacao, motivoDescarte, comentario, origem, tags,
  } = leadData;


  const updateFields = {}; // Objeto para acumular alterações // --- Processa Campos Simples ---

  
  if (nome !== undefined) updateFields.nome = nome.trim();
  if (email !== undefined)
    updateFields.email = email ? email.trim().toLowerCase() : null;
  if (nascimento !== undefined) updateFields.nascimento = nascimento || null;
  if (endereco !== undefined) updateFields.endereco = endereco;
  if (comentario !== undefined) updateFields.comentario = comentario; // motivoDescarte é tratado na lógica da situação // --- Processa Contato ---
  if (contato !== undefined) {
    if (contato === null || String(contato).trim() === "") {
      updateFields.contato = null;
    } else {
      try {
        const phoneNumber = phoneUtil.parseAndKeepRawInput(contato, null);

        if (phoneUtil.isValidNumber(phoneNumber)) {
          updateFields.contato = phoneUtil.format(phoneNumber, PNF.E164);
        } else {
          throw new Error(`Número de contato inválido: ${contato}`);
        }
      } catch (e) {
        throw new Error(`Formato de contato não reconhecido: ${contato}`);
      }
    }
  } // --- Processa CPF ---

  if (cpf !== undefined) {
    if (cpf === null || cpf === "") {
      updateFields.cpf = null;
    } else {
      const cpfLimpo = cpf.replace(/\D/g, "");
      if (!cpfcnpj.cpf.isValid(cpfLimpo)) {
        throw new Error(`CPF inválido: ${cpf}`);
      }
      updateFields.cpf = cpfLimpo;
    }
  } // --- Validação e Lógica de Referências e Descarte ---

  if (tags !== undefined) {
    if (Array.isArray(tags)) {
        updateFields.tags = tags
            .filter(tag => typeof tag === 'string' && tag.trim() !== '')
            .map(tag => tag.trim().toLowerCase());
        updateFields.tags = [...new Set(updateFields.tags)]; 
    } else {
        throw new Error("O campo 'tags' deve ser um array de strings.");
    }
  }


  try {
    // Situação e Limpeza/Atualização de Descarte

    if (situacao !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(situacao))
        throw new Error("ID Situação inválido.");
      const situacaoDoc = await LeadStage.findOne({
        _id: situacao,
        company: companyId,
      }); // Valida na empresa
      if (!situacaoDoc)
        throw new Error("Situação inválida ou não pertence a esta empresa.");
      updateFields.situacao = situacaoDoc._id;
      console.log(`[updateLead] Nova situação definida: ${situacaoDoc.nome}`);
      if (situacaoDoc.nome !== "Descartado") {
        // <-- Nome Exato!
        console.log(
          "[updateLead] Nova situação não é 'Descartado'. Limpando motivoDescarte e comentario."
        );
        updateFields.motivoDescarte = null;
        updateFields.comentario = null;
      } else {
        // Mudando PARA Descartado: valida e usa motivoDescarte (ID) se veio
        console.log(
          "[updateLead] Nova situação é 'Descartado'. Verificando motivo/comentário fornecidos."
        );

        if (motivoDescarte !== undefined) {
          if (
            !motivoDescarte ||
            !mongoose.Types.ObjectId.isValid(motivoDescarte)
          )
            throw new Error("ID de Motivo de Descarte inválido."); // Assumindo Motivos de Descarte são globais ou por empresa - Ajustar findOne se for por empresa

          const reasonExists = await DiscardReason.findById(
            motivoDescarte
          ).lean();

          if (!reasonExists)
            throw new Error(
              `Motivo de Descarte ID ${motivoDescarte} inválido.`
            );
          updateFields.motivoDescarte = reasonExists._id;
        } else {
          // Regra: Se mudar para Descartado, motivo é obrigatório
          throw new Error(
            "Motivo do descarte (ID) é obrigatório ao mover para 'Descartado'."
          );
        } // Permite atualizar/definir comentário junto com o descarte
        if (comentario !== undefined) updateFields.comentario = comentario;
      }
    } else {
      // Se Situação NÃO mudou, permite atualizar motivo/comentário SE vieram

      // (Aqui motivoDescarte deve ser ID)
      if (motivoDescarte !== undefined) {
        if (!motivoDescarte || !mongoose.Types.ObjectId.isValid(motivoDescarte))
          throw new Error("ID de Motivo de Descarte inválido.");
        const reasonExists = await DiscardReason.findById(
          motivoDescarte
        ).lean(); // Assume global
        if (!reasonExists)
          throw new Error(`Motivo de Descarte ID ${motivoDescarte} inválido.`);
        updateFields.motivoDescarte = reasonExists._id;
      }

      if (comentario !== undefined) updateFields.comentario = comentario;
    } 
    
    // Origem
    if (origem !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(origem))
        throw new Error("ID Origem inválido.");

      const origemDoc = await Origem.findOne({
        _id: origem,

        company: companyId,
      }).lean(); // Valida na empresa

      if (!origemDoc)
        throw new Error("Origem inválida ou não pertence a esta empresa.");

      updateFields.origem = origemDoc._id;
    } 
    
    // Responsável

    if (responsavel !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(responsavel))
        throw new Error("ID Responsável inválido.");
      const responsavelDoc = await User.findOne({
        _id: responsavel,
        company: companyId,
      }).lean(); 
      
      // Valida na empresa
      if (!responsavelDoc)
        throw new Error("Responsável inválido ou não pertence a esta empresa.");

      updateFields.responsavel = responsavelDoc._id;
    }
  } catch (validationError) {
    console.error(
      "[updateLead] Erro durante validação de dados:",

      validationError
    );

    throw validationError; // Re-lança o erro para o controller tratar
  } 
  
  // --- Executa Update ---
  if (Object.keys(updateFields).length === 0) {
    console.warn(`[updateLead] Nenhum campo para atualizar ID: ${id}`); // Busca com companyId para garantir que pertence à empresa antes de retornar
    return await getLeadById(id, companyId);
  }
  console.log(
    "[updateLead] Objeto final para $set:",
    JSON.stringify(updateFields, null, 2)
  );

  try {
    // <<< MULTI-TENANCY: Filtro por ID e Empresa >>>
    const updatedLead = await Lead.findOneAndUpdate(
      { _id: id, company: companyId }, // Garante que só atualiza lead da empresa correta
      { $set: updateFields },
      { new: true, runValidators: true } // Opções
    );
    if (!updatedLead) {
      throw new Error("Lead não encontrado nesta empresa (update falhou).");
    }

    const nomeSituacaoNova = await getStageNameById(updatedLead.situacao, companyId);
    
    if (updateFields.situacao && !updatedLead.situacao.equals(situacaoAntigaId) && nomeSituacaoAntiga.toLowerCase().includes('em reserva')) {
        const proximosEstagiosPermitidos = ["em proposta", "proposta emitida", "contrato assinado", "vendido"]; // Estágios que mantêm a unidade "ocupada"
        
        if (!proximosEstagiosPermitidos.some(s => nomeSituacaoNova.toLowerCase().includes(s))) {
            console.log(`[updateLead] Lead ${id} saiu de 'Em Reserva' para '${nomeSituacaoNova}'. Verificando e cancelando reserva ativa.`);
            
            const reservaAtiva = await Reserva.findOne({ lead: id, statusReserva: "Ativa", company: companyId }).session(session);

            if (reservaAtiva) {
                const unidadeIdDaReserva = reservaAtiva.unidade;
                reservaAtiva.statusReserva = "Cancelada"; // Ou "CanceladaPorMudancaDeStatusLead"
                
                // Usar unidadeService seria mais limpo, mas para manter a atomicidade, atualizamos aqui
                const unidadeParaLiberar = await Unidade.findById(unidadeIdDaReserva).session(session);
                if (unidadeParaLiberar && unidadeParaLiberar.currentReservaId && unidadeParaLiberar.currentReservaId.equals(reservaAtiva._id)) {
                    unidadeParaLiberar.statusUnidade = "Disponível";
                    unidadeParaLiberar.currentLeadId = null;
                    unidadeParaLiberar.currentReservaId = null;
                    await unidadeParaLiberar.save({ session });
                    console.log(`[updateLead] Unidade ${unidadeIdDaReserva} liberada. Status: Disponível.`);
                } else {
                    console.warn(`[updateLead] Unidade ${unidadeIdDaReserva} não foi liberada pois não estava vinculada a esta reserva ativa ou não foi encontrada.`);
                }
                
                await reservaAtiva.save({ session });
                console.log(`[updateLead] Reserva ${reservaAtiva._id} status alterado para 'Cancelada'.`);
                
                await logHistory(
                    id, userId, "RESERVA_CANCELADA_STATUS_LEAD",
                    `Reserva da unidade ID ${unidadeIdDaReserva} cancelada devido à mudança de status do lead para '${nomeSituacaoNova}'.`,
                    { oldReservaStatus: "Ativa", newReservaStatus: "Cancelada" }, null, 'Reserva', reservaAtiva._id, session
                );
            }
        }
    }


    console.log(
      "[updateLead] Documento atualizado no DB (raw):",
      JSON.stringify(updatedLead, null, 2)
    ); // --- Log de Histórico AJUSTADO ---

    try {
      
      const detalhesLog = `Campos atualizados: ${Object.keys(updateFields).join(", ")}.`;


      await logHistory(updatedLead._id, userId, "EDICAO_DADOS", detalhesLog, leadExistente.toObject(), updatedLead.toObject());
      
    } catch (historyError) {
      console.error(
        `[updateLead] Falha ao gravar histórico para Lead ${updatedLead._id}:`,

        historyError
      );
    } // --- FIM Log de Histórico --- // Re-populate para retornar dados completos ao frontend

    await updatedLead.populate([
      { path: "situacao", select: "nome ordem" },
      { path: "origem", select: "nome" },
      { path: "responsavel", select: "nome perfil" },
      { path: "motivoDescarte", select: "nome" }, // Popula motivo (ID)
    ]);

    return updatedLead; // Retorna o lead atualizado e populado
  } catch (error) {
    console.error(
      "[updateLead] Erro durante findByIdAndUpdate/populate:",
      error
    ); // Hook do model pode tratar duplicidade de CPF/Email

    throw new Error(error.message || "Erro interno ao atualizar.");
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
  getStageNameById,
  getDefaultAdminUserIdForCompany,
  getDefaultLeadStageIdForCompany 
};
