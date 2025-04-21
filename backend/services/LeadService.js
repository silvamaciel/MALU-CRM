// services/LeadService.js

const mongoose = require("mongoose");
const Lead = require("../models/Lead");
// !!! Verifique o nome do arquivo: origem.js ou Origem.js? Ajuste o require abaixo !!!
const Origem = require("../models/origem");
const LeadStage = require("../models/LeadStage");
const User = require("../models/User");
// REMOVIDO: const DiscardReason = require('../models/DiscardReason');
// REMOVIDO: const cpfcnpj = require("cpf-cnpj-validator");
// REMOVIDO: const phoneUtil = require('google-libphonenumber')...
// REMOVIDO: const PNF = require('google-libphonenumber')...


// --- GET Leads (Mantém Filtros e Paginação) ---
const getLeads = async (queryParams = {}) => {
  try {
    console.log("[getLeads] Query Params:", queryParams);
    let page = parseInt(queryParams.page, 10) || 1;
    let limit = parseInt(queryParams.limit, 10) || 10;
    limit = Math.min(limit, 100); page = Math.max(1, page); limit = Math.max(1, limit);
    const skip = (page - 1) * limit;
    const queryConditions = {};
    const filters = queryParams;
    if (filters.nome) queryConditions.nome = { $regex: filters.nome, $options: 'i' };
    if (filters.email) queryConditions.email = { $regex: filters.email, $options: 'i' };
    if (filters.situacao && mongoose.Types.ObjectId.isValid(filters.situacao)) queryConditions.situacao = filters.situacao;
    if (filters.origem && mongoose.Types.ObjectId.isValid(filters.origem)) queryConditions.origem = filters.origem;
    if (filters.responsavel && mongoose.Types.ObjectId.isValid(filters.responsavel)) queryConditions.responsavel = filters.responsavel;
    const dateQuery = {};
    if (filters.dataInicio) { try { /*...*/ } catch(e){/*...*/} }
    if (filters.dataFim) { try { /*...*/ } catch(e){/*...*/} }
    if (Object.keys(dateQuery).length > 0) queryConditions.createdAt = dateQuery;
    console.log("[getLeads] Condições Query:", JSON.stringify(queryConditions, null, 2));
    const [totalLeads, leads] = await Promise.all([
      Lead.countDocuments(queryConditions),
      Lead.find(queryConditions)
        .populate("situacao", "nome")
        .populate("origem", "nome")
        .populate("responsavel", "nome perfil")
        // REMOVIDO: .populate("motivoDescarte", "nome")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
    ]);
    const totalPages = Math.ceil(totalLeads / limit);
    console.log(`[getLeads] ${leads.length}/${totalLeads} leads (Pág ${page}/${totalPages})`);
    return { leads, totalLeads, currentPage: page, totalPages, limit };
  } catch (err) { /* ... tratamento erro ... */ }
};

// --- GET Lead By Id (Remove populate de motivoDescarte) ---
const getLeadById = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) { throw new Error("ID inválido."); }
  const lead = await Lead.findById(id)
    .populate("situacao", "nome")
    .populate("origem", "nome")
    .populate("responsavel", "nome perfil");
    // REMOVIDO: .populate("motivoDescarte", "nome");
  if (!lead) throw new Error("Lead não encontrado");
  return lead;
};

const createLead = async (leadData) => {
  const {
    nome, contato, email, nascimento, endereco, // SEM CPF
    situacao, // ID Obrigatório
    motivoDescarte, comentario,
    origem, // ID Obrigatório
    responsavel, // ID Obrigatório
  } = leadData;

  // Validação básica de campos que deveriam vir (Schema também valida 'required')
  if (!nome || !contato || !email || !situacao || !origem || !responsavel) {
    throw new Error("Campos obrigatórios (Nome, Contato, Email, Situação, Origem, Responsável) não foram fornecidos.");
  }

  // REMOVIDO: Validação/Formatação de Contato
  // REMOVIDO: Validação de CPF

  // --- Validações dos IDs de Referência ---
  // (Garante que os IDs obrigatórios são válidos e existem)
  const [responsavelDoc, origemDoc, situacaoDoc] = await Promise.all([
    User.findById(responsavel).lean(),
    Origem.findById(origem).lean(), // Usa Origem do topo
    LeadStage.findById(situacao).lean()
  ]).catch(err => { throw new Error("Erro ao verificar referências."); });

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
    return leadSalvo;
  } catch (error) {
    console.error("[createLead] Erro ao salvar:", error);
    throw new Error(error.message || "Erro interno ao salvar lead.");
  }
};


const updateLead = async (id, leadData) => {
  console.log(`--- [updateLead] Iniciando para ID: ${id} ---`);
  console.log("[updateLead] leadData recebido:", JSON.stringify(leadData, null, 2));

  if (!mongoose.Types.ObjectId.isValid(id)) { throw new Error("ID inválido."); }

  const {
    nome, contato, email, nascimento, endereco, // SEM CPF
    responsavel, // ID
    situacao,    // ID
    motivoDescarte, // STRING
    comentario,
    origem       // ID
  } = leadData;

  const updateFields = {};

  // Campos simples
  if (nome !== undefined) updateFields.nome = nome;
  if (contato !== undefined) updateFields.contato = contato;
  if (email !== undefined) updateFields.email = email;
  if (nascimento !== undefined) updateFields.nascimento = nascimento;
  if (endereco !== undefined) updateFields.endereco = endereco;
  if (motivoDescarte !== undefined) updateFields.motivoDescarte = motivoDescarte;
  if (comentario !== undefined) updateFields.comentario = comentario;

  try { // Adiciona try/catch em volta das validações para pegar erros
      // --- Handle Referências (Valida IDs se forem enviados) ---
      if (situacao !== undefined) {
        console.log("[updateLead] Processando campo 'situacao' com ID:", situacao);
        if (!mongoose.Types.ObjectId.isValid(situacao)) throw new Error("ID Situação inválido.");
        const situacaoDoc = await LeadStage.findById(situacao).lean();
        if (!situacaoDoc) throw new Error("Situação não encontrada para o ID fornecido.");
        updateFields.situacao = situacaoDoc._id;
        console.log(`[updateLead] OK - Adicionado ao updateFields: situacao=${updateFields.situacao}`);
      }

      if (origem !== undefined) {
        console.log("[updateLead] Processando campo 'origem' com ID:", origem);
        if (!mongoose.Types.ObjectId.isValid(origem)) throw new Error("ID Origem inválido.");
        // !!! VERIFIQUE SE ESTE REQUIRE ESTÁ CORRETO (Origem vs origem) !!!
        const OrigemModel = require("../models/origem"); // Assumindo 'Origem.js'
        const origemDoc = await OrigemModel.findById(origem).lean();
        if (!origemDoc) throw new Error("Origem não encontrada para o ID fornecido.");
        updateFields.origem = origemDoc._id;
        console.log(`[updateLead] OK - Adicionado ao updateFields: origem=${updateFields.origem}`);
      }

      if (responsavel !== undefined) {
        console.log("[updateLead] Processando campo 'responsavel' com ID:", responsavel);
        if (!mongoose.Types.ObjectId.isValid(responsavel)) throw new Error("ID Responsável inválido.");
        const responsavelDoc = await User.findById(responsavel).lean();
        if (!responsavelDoc) throw new Error("Responsável não encontrado para o ID fornecido.");
        updateFields.responsavel = responsavelDoc._id;
        console.log(`[updateLead] OK - Adicionado ao updateFields: responsavel=${updateFields.responsavel}`);
      }

  } catch(validationError) {
       // Captura erros das validações findById ou ObjectId.isValid
       console.error("[updateLead] Erro durante validação de referência:", validationError);
       throw validationError; // Re-lança o erro para o controller tratar
  }


  // --- Executa Update ---
  if (Object.keys(updateFields).length === 0) {
    console.warn(`[updateLead] Nenhum campo para atualizar ID: ${id}`);
    return await getLeadById(id);
  }

  console.log("[updateLead] Objeto FINAL updateFields:", JSON.stringify(updateFields, null, 2)); // Log crucial

  try {
    const updatedLead = await Lead.findByIdAndUpdate(id, { $set: updateFields }, { new: true, runValidators: true });
    if (!updatedLead) { throw new Error("Lead não encontrado (update falhou)."); }

    console.log("[updateLead] Documento atualizado no DB (antes populate):", JSON.stringify(updatedLead, null, 2));

    // Re-populate
    await updatedLead.populate([
        { path: "situacao", select: "nome" },
        { path: "origem", select: "nome" },
        { path: "responsavel", select: "nome perfil" }
        // Sem populate para motivoDescarte (String)
    ]);
    return updatedLead;

  } catch (error) {
    console.error("[updateLead] Erro durante findByIdAndUpdate/populate:", error);
    throw new Error(error.message || "Erro interno ao atualizar.");
  }
};

const deleteLead = async (id) => { /* ... código existente ... */ };

const descartarLead = async (id, dados) => {
  if (!mongoose.Types.ObjectId.isValid(id)) { throw new Error("ID inválido."); }
  const { motivoDescarte, comentario } = dados; // motivoDescarte é STRING

  if (!motivoDescarte || typeof motivoDescarte !== 'string' || motivoDescarte.trim() === '') {
    throw new Error("O motivo do descarte (texto) é obrigatório."); // Ajustada mensagem
  }

  // Busca situação "Descartado"
  const situacaoDescartado = await LeadStage.findOne({ nome: "Descartado" }).lean(); // <-- Nome Exato!
  if (!situacaoDescartado) { throw new Error("Configuração: Situação 'Descartado' não encontrada."); }

  const lead = await Lead.findByIdAndUpdate(
    id,
    {
      situacao: situacaoDescartado._id,
      motivoDescarte: motivoDescarte.trim(), // <-- Salva a STRING
      comentario: comentario || null,
    },
    { new: true }
  ).populate("situacao", "nome"); // Não popula mais motivoDescarte

  if (!lead) throw new Error("Lead não encontrado.");
  return lead;
};

// --- EXPORTS ---
module.exports = {
  getLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
  descartarLead,
};

// Cole as implementações completas das funções omitidas com /* ... */
// (getLeads filter logic, error handling blocks, populate paths)
// Certifique-se que o require de Origem está correto.