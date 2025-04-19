// services/LeadService.js

const Lead = require("../models/Lead");
const Origem = require("../models/origem");
const LeadStage = require("../models/LeadStage");
const User = require("../models/User");

const mongoose = require('mongoose');


const cpfcnpj = require("cpf-cnpj-validator");

const getLeads = async () => {
  try {
    const leads = await Lead.find()
      .populate("situacao", "nome") // Popula o nome da situação
      .populate("origem", "nome") // Popula o nome da origem
      .populate("responsavel", "nome perfil") // Popula nome e perfil do responsável
      .sort({ createdAt: -1 }); // Ordena pelos mais recentes primeiro (opcional)
    return leads;
  } catch (err) {
    console.error("Erro ao buscar leads no serviço:", err);
    throw new Error("Erro ao buscar os leads");
  }
};

const getLeadById = async (id) => {
  // Validação básica do formato do ID (opcional mas recomendado)
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("ID de Lead inválido.");
  }
  const lead = await Lead.findById(id)
    .populate("situacao", "nome")
    .populate("origem", "nome")
    .populate("responsavel", "nome perfil");

  if (!lead) throw new Error("Lead não encontrado");
  return lead;
};



const createLead = async (leadData) => {
  const {
    nome,
    contato,
    email,
    nascimento,
    endereco,
    cpf,
    situacao, // ID
    motivoDescarte,
    comentario,
    origem, // ID
    responsavel, // ID
  } = leadData;

  // --- Validação de CPF (se fornecido) ---
  let cpfLimpo = null;
  if (cpf) {
    cpfLimpo = cpf.replace(/\D/g, '');
    // 2. CORRIGIR A CHAMADA DE VALIDAÇÃO: Usar cpfcnpj.cpf.isValid()
    if (!cpfcnpj.cpf.isValid(cpfLimpo)) { // <-- MUDANÇA AQUI
      throw new Error(`CPF inválido fornecido: ${cpf}`);
    }
  }
  // --------------------------------------

  // --- Validações dos IDs de Referência ---
  const [responsavelDoc, origemDoc, situacaoDoc] = await Promise.all([
      User.findById(responsavel).lean(),
      Origem.findById(origem).lean(),
      LeadStage.findById(situacao).lean()
  ]).catch(err => {
      console.error("Erro ao validar IDs referenciados:", err);
      throw new Error("Erro ao verificar referências (Responsável, Origem ou Situação).");
  });

  if (!responsavelDoc) throw new Error("Responsável não encontrado");
  if (!origemDoc) throw new Error("Origem não encontrada");
  if (!situacaoDoc) throw new Error("Situação não encontrada");
  // --------------------------------------

  // --- Criação do Novo Lead ---
  const novoLead = new Lead({
    nome,
    contato,
    email,
    nascimento: nascimento || null,
    endereco: endereco || null,
    cpf: cpfLimpo,
    situacao: situacaoDoc._id,
    motivoDescarte: motivoDescarte || null,
    comentario: comentario || null,
    origem: origemDoc._id,
    responsavel: responsavelDoc._id,
  });

  // --- Salvar e Tratar Erro de Duplicidade de CPF ---
  try {
    const leadSalvo = await novoLead.save();
    return leadSalvo;
  } catch (error) {
    console.error("Erro ao salvar lead no serviço:", error);
    throw new Error(error.message || "Erro interno ao salvar o lead.");
  }
};

const updateLead = async (id, leadData) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
     throw new Error("ID de Lead inválido.");
  }

  const {
    nome,
    contato,
    email,
    nascimento,
    endereco,
    cpf,
    responsavel, // ID
    situacao, // ID
    motivoDescarte,
    comentario,
    origem, // ID
  } = leadData;

  const updateFields = {};

  // Adiciona campos simples
  if (nome !== undefined) updateFields.nome = nome;
  if (contato !== undefined) updateFields.contato = contato;
  if (email !== undefined) updateFields.email = email;
  if (nascimento !== undefined) updateFields.nascimento = nascimento;
  if (endereco !== undefined) updateFields.endereco = endereco;
  if (motivoDescarte !== undefined) updateFields.motivoDescarte = motivoDescarte;
  if (comentario !== undefined) updateFields.comentario = comentario;

  // --- Validação de CPF na atualização (se fornecido) ---
  if (cpf !== undefined) {
    if (cpf === null || cpf === '') {
        updateFields.cpf = null;
    } else {
        const cpfLimpo = cpf.replace(/\D/g, '');
        // 2. CORRIGIR A CHAMADA DE VALIDAÇÃO: Usar cpfcnpj.cpf.isValid()
        if (!cpfcnpj.cpf.isValid(cpfLimpo)) { // <-- MUDANÇA AQUI
             throw new Error(`CPF inválido fornecido para atualização: ${cpf}`);
        }
        updateFields.cpf = cpfLimpo;
    }
  }
  // -----------------------------------------------------

  // --- Validação e adição de IDs de referência ---
   if (situacao !== undefined) {
    const situacaoDoc = await LeadStage.findById(situacao).lean();
    if (!situacaoDoc) throw new Error("Situação não encontrada para o ID fornecido.");
    updateFields.situacao = situacaoDoc._id;
  }
  if (origem !== undefined) {
    // Corrigindo require para Origem (verifique se o nome do arquivo é Origem.js)
    const OrigemModel = require("../models/origem");
    const origemDoc = await OrigemModel.findById(origem).lean();
    if (!origemDoc) throw new Error("Origem não encontrada para o ID fornecido.");
    updateFields.origem = origemDoc._id;
  }
  if (responsavel !== undefined) {
    const responsavelDoc = await User.findById(responsavel).lean();
    if (!responsavelDoc) throw new Error("Responsável não encontrado para o ID fornecido.");
    updateFields.responsavel = responsavelDoc._id;
  }
  // ---------------------------------------------

  if (Object.keys(updateFields).length === 0) {
     console.warn(`Nenhum campo válido fornecido para atualizar o Lead ID: ${id}`);
     const leadAtual = await getLeadById(id);
     return leadAtual;
  }

  // --- Executa Update e Trata Erro de Duplicidade de CPF ---
  try {
    const updatedLead = await Lead.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true }
    )
      .populate("situacao", "nome")
      .populate("origem", "nome")
      .populate("responsavel", "nome perfil");

    if (!updatedLead) throw new Error("Lead não encontrado (não foi possível atualizar).");
    return updatedLead;

  } catch (error) {
    console.error("Erro ao atualizar lead no serviço:", error);
    throw new Error(error.message || "Erro interno ao atualizar o lead.");
  }
};


const deleteLead = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("ID de Lead inválido.");
  }
  const deleted = await Lead.findByIdAndDelete(id);
  if (!deleted) throw new Error("Lead não encontrado");
  return { message: "Lead deletado com sucesso" }; // Mensagem alterada para 'message'
};

const descartarLead = async (id, dados) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("ID de Lead inválido.");
  }
  const { motivoDescarte, comentario } = dados;
  if (!motivoDescarte) {
    throw new Error("O motivo do descarte é obrigatório.");
  }

  const situacaoDescartado = await LeadStage.findOne({
    nome: "Descartado",
  }).lean(); // Usar nome fixo ou buscar por um ID/flag
  if (!situacaoDescartado) {
    console.error('Situação "Descartado" não configurada no banco de dados.');
    throw new Error('Erro interno: Situação "Descartado" não encontrada.');
  }

  const lead = await Lead.findByIdAndUpdate(
    id,
    {
      situacao: situacaoDescartado._id,
      motivoDescarte,
      comentario: comentario || null, // Permite comentário vazio
    },
    { new: true }
  ).populate("situacao", "nome"); // Popula para retornar o nome "Descartado"

  if (!lead)
    throw new Error("Lead não encontrado (não foi possível descartar).");
  return lead;
};

module.exports = {
  getLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
  descartarLead,
};
