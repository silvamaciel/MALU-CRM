// services/LeadService.js

const mongoose = require("mongoose"); 
const Lead = require("../models/Lead");
const Origem = require("../models/origem");
const LeadStage = require("../models/LeadStage"); 
const User = require("../models/User"); 
const DiscardReason = require('../models/DiscardReason');
const cpfcnpj = require("cpf-cnpj-validator"); 

const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();
const PNF = require('google-libphonenumber').PhoneNumberFormat;

const getLeads = async (queryParams = {}) => {
  try {
    console.log("[getLeads] Query Params Recebidos:", queryParams);

    // 1. Extrair e validar parâmetros de paginação
    let page = parseInt(queryParams.page, 10);
    let limit = parseInt(queryParams.limit, 10);

    // Definir padrões e limites razoáveis
    page = isNaN(page) || page < 1 ? 1 : page;
    limit = isNaN(limit) || limit < 1 ? 10 : (limit > 100 ? 100 : limit); // Ex: Limite padrão 10, máximo 100

    const skip = (page - 1) * limit; // Calcular quantos documentos pular

    // 2. Construir objeto de filtros (queryConditions) - Igual ao anterior
    const queryConditions = {};
    const filters = queryParams; // Usar queryParams como base para filtros

    if (filters.nome) queryConditions.nome = { $regex: filters.nome, $options: 'i' };
    if (filters.email) queryConditions.email = { $regex: filters.email, $options: 'i' };
    if (filters.situacao && mongoose.Types.ObjectId.isValid(filters.situacao)) queryConditions.situacao = filters.situacao;
    if (filters.origem && mongoose.Types.ObjectId.isValid(filters.origem)) queryConditions.origem = filters.origem;
    if (filters.responsavel && mongoose.Types.ObjectId.isValid(filters.responsavel)) queryConditions.responsavel = filters.responsavel;

    const dateQuery = {};
    if (filters.dataInicio) { /* ... lógica data inicio ... */ }
    if (filters.dataFim) { /* ... lógica data fim ... */ }
     if (Object.keys(dateQuery).length > 0) queryConditions.createdAt = dateQuery;

    console.log("[getLeads] Condições Query MongoDB:", JSON.stringify(queryConditions, null, 2));

    // 3. Executar DUAS queries: uma para contar o total, outra para buscar a página
    // Usamos Promise.all para executá-las em paralelo
    const [totalLeads, leads] = await Promise.all([
      Lead.countDocuments(queryConditions), // Conta o TOTAL de documentos que correspondem aos filtros
      Lead.find(queryConditions)           // Busca os documentos da PÁGINA ATUAL
        .populate("situacao", "nome")
        .populate("origem", "nome")
        .populate("responsavel", "nome perfil")
        .sort({ createdAt: -1 })           // Aplica ordenação
        .skip(skip)                        // Pula os documentos das páginas anteriores
        .limit(limit)                      // Limita ao número de itens por página
    ]);

    // 4. Calcular total de páginas
    const totalPages = Math.ceil(totalLeads / limit);

    console.log(`[getLeads] Encontrados ${leads.length} leads (Total: ${totalLeads}, Página: ${page}/${totalPages})`);

    // 5. Retornar um objeto estruturado com os dados e metadados da paginação
    return {
      leads: leads,           // Array de leads da página atual
      totalLeads: totalLeads, // Contagem total de leads com os filtros aplicados
      currentPage: page,      // Página atual que foi retornada
      totalPages: totalPages, // Número total de páginas existentes
      limit: limit            // Limite de itens por página usado
    };

  } catch (err) {
    console.error("Erro ao buscar leads paginados no serviço:", err);
    throw new Error("Erro ao buscar os leads com paginação.");
  }
};

const getLeadById = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("ID de Lead inválido.");
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
    nome, contato, email, nascimento, endereco, cpf,
    situacao, // ID
    motivoDescarte, comentario,
    origem, // ID
    responsavel, // ID
  } = leadData;

  // --- Validação e Formatação do Contato --- <<< LÓGICA ADICIONADA AQUI >>>
  let formattedPhoneNumber = null;
  // Assumindo que 'contato' é obrigatório pelo Schema do Lead
  if (!contato) {
      throw new Error("O campo Contato é obrigatório.");
  }
  try {
      const phoneNumber = phoneUtil.parseAndKeepRawInput(contato, 'BR'); // Tenta parsear
      if (phoneUtil.isValidNumber(phoneNumber)) { // Valida
          formattedPhoneNumber = phoneUtil.format(phoneNumber, PNF.E164); // Formata E.164
          console.log(`[createLead] Contato formatado: ${contato} -> ${formattedPhoneNumber}`);
      } else {
          // Se chegou aqui mas não é válido (raro com parseAndKeepRawInput, mas possível)
          throw new Error(`Número de contato inválido: ${contato}`);
      }
  } catch (e) {
      // Erro no parse (formato não reconhecido)
      console.warn(`[createLead] Erro ao processar contato: ${contato}`, e.message);
      throw new Error(`Formato de número de contato não reconhecido: ${contato}`);
  }
  // -----------------------------------------

  // --- Validação de CPF ---
  let cpfLimpo = null;
  if (cpf) {
    cpfLimpo = cpf.replace(/\D/g, "");
    if (!cpfcnpj.cpf.isValid(cpfLimpo)) {
      throw new Error(`CPF inválido fornecido: ${cpf}`);
    }
  }

  // --- Validações dos IDs de Referência ---
  const [responsavelDoc, origemDoc, situacaoDoc] = await Promise.all([
    User.findById(responsavel).lean(),
    Origem.findById(origem).lean(),
    LeadStage.findById(situacao).lean(),
  ]).catch((err) => { /* ... tratamento erro ... */ });

  if (!responsavelDoc) throw new Error("Responsável não encontrado");
  if (!origemDoc) throw new Error("Origem não encontrada");
  if (!situacaoDoc) throw new Error("Situação não encontrada");

  // --- Criação do Novo Lead ---
  const novoLead = new Lead({
    nome,
    contato: formattedPhoneNumber, // <-- USA NÚMERO FORMATADO
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

  // --- Salvar ---
  try {
    const leadSalvo = await novoLead.save();
    return leadSalvo;
  } catch (error) { /* ... tratamento erro ... */ }
};


const updateLead = async (id, leadData) => {
  console.log(`[updateLead] Iniciando para ID: ${id}`);
  console.log("[updateLead] leadData recebido:", JSON.stringify(leadData, null, 2));

  if (!mongoose.Types.ObjectId.isValid(id)) { throw new Error("ID inválido."); }

  const {
    nome, contato, email, nascimento, endereco, cpf,
    responsavel, situacao, motivoDescarte, comentario, origem
  } = leadData;

  const updateFields = {};

  // Adiciona campos simples (EXCETO CONTATO, que será tratado abaixo)
  if (nome !== undefined) updateFields.nome = nome;
  if (email !== undefined) updateFields.email = email;
  if (nascimento !== undefined) updateFields.nascimento = nascimento;
  if (endereco !== undefined) updateFields.endereco = endereco;
  // motivo/comentario tratados na lógica da situação ou se situação não mudar

  // --- Validação e Formatação do Contato --- <<< LÓGICA ADICIONADA/MODIFICADA AQUI >>>
  if (contato !== undefined) { // Verifica se o campo 'contato' veio na atualização
    if (contato === null || String(contato).trim() === '') { // Permite limpar o campo
      updateFields.contato = null;
      console.log(`[updateLead] Contato limpo (setado para null).`);
    } else {
      // Se não for nulo/vazio, tenta validar e formatar
      try {
        const phoneNumber = phoneUtil.parseAndKeepRawInput(contato, 'BR');
        if (phoneUtil.isValidNumber(phoneNumber)) {
          const formattedNumber = phoneUtil.format(phoneNumber, PNF.E164);
          updateFields.contato = formattedNumber; // Adiciona número formatado
          console.log(`[updateLead] Contato formatado: ${contato} -> ${formattedNumber}`);
        } else {
          // Se não for válido, lança erro para impedir atualização com dado ruim
          throw new Error(`Número de contato inválido para atualização: ${contato}`);
        }
      } catch (e) {
        // Erro no parse (formato inválido)
        console.warn(`[updateLead] Erro ao processar contato na atualização: ${contato}`, e.message);
        throw new Error(`Formato de número de contato não reconhecido: ${contato}`);
      }
    }
  }
  // -----------------------------------------

  // --- Handle CPF ---
  if (cpf !== undefined) { /* ... código CPF existente ... */ }

  // --- Handle Situação e Limpeza de Descarte ---
  if (situacao !== undefined) { /* ... código Situação existente ... */ }
  else {
      // Se situação NÃO mudou, permite atualizar motivo/comentário se vieram
       if (motivoDescarte !== undefined) updateFields.motivoDescarte = motivoDescarte;
       if (comentario !== undefined) updateFields.comentario = comentario;
  }

  // --- Handle Origem ---
  if (origem !== undefined) { /* ... código Origem existente ... */ }

  // --- Handle Responsável ---
  if (responsavel !== undefined) { /* ... código Responsável existente ... */ }


  // --- Executa Update ---
  if (Object.keys(updateFields).length === 0) { /* ... código existente ... */ }
  console.log("[updateLead] Final updateFields:", JSON.stringify(updateFields, null, 2));
  try {
    const updatedLead = await Lead.findByIdAndUpdate(id, { $set: updateFields }, { new: true, runValidators: true });
    if (!updatedLead) { throw new Error("Lead não encontrado."); }
    console.log("[updateLead] Raw updated doc:", JSON.stringify(updatedLead, null, 2));
    await updatedLead.populate([ /* ... populate paths ... */ ]);
    console.log("[updateLead] Final populated doc:", JSON.stringify(updatedLead, null, 2));
    return updatedLead;
  } catch (error) { /* ... tratamento de erro existente ... */ }
};

const deleteLead = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("ID de Lead inválido.");
  }
  const deleted = await Lead.findByIdAndDelete(id);
  if (!deleted) throw new Error("Lead não encontrado");
  return { message: "Lead deletado com sucesso" };
};

const descartarLead = async (id, dados) => {
  if (!mongoose.Types.ObjectId.isValid(id)) { throw new Error("ID de Lead inválido."); }

  const { motivoDescarte, comentario } = dados; // motivoDescarte agora é um ID

  // Valida se o ID do motivo foi enviado e é válido
  if (!motivoDescarte || !mongoose.Types.ObjectId.isValid(motivoDescarte)) {
    throw new Error("ID do motivo de descarte inválido ou não fornecido.");
  }

  // Valida se o motivo realmente existe no banco (opcional mas recomendado)
  const reasonExists = await DiscardReason.findById(motivoDescarte);
  if (!reasonExists) {
      throw new Error(`Motivo de descarte com ID ${motivoDescarte} não encontrado.`);
  }

  // Busca a situação "Descartado" (igual antes)
  const situacaoDescartado = await LeadStage.findOne({ nome: "Descartado" }).lean();
  if (!situacaoDescartado) { /* ... erro ... */ }

  // Atualiza o lead com o ID da situação e o ID do motivo
  const lead = await Lead.findByIdAndUpdate(
    id,
    {
      situacao: situacaoDescartado._id,
      motivoDescarte: reasonExists._id, // <<< Salva o ID do motivo
      comentario: comentario || null,
    },
    { new: true }
  )
    // Popula situação E o novo motivoDescarte referenciado
    .populate("situacao", "nome")
    .populate("motivoDescarte", "nome"); // <<< Adiciona populate para motivoDescarte

  if (!lead) { throw new Error("Lead não encontrado (não foi possível descartar)."); }
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
