// services/LeadService.js

const mongoose = require('mongoose'); // Verifique se está no topo
const Lead = require("../models/Lead");
// !!! ATENÇÃO: Verifique se o nome do arquivo é realmente 'origem.js' (minúsculo) ou 'Origem.js' (maiúsculo) e ajuste o require abaixo se necessário !!!
const Origem = require("../models/origem");
const LeadStage = require("../models/LeadStage"); // Verifique se este arquivo e exportação estão corretos
const User = require("../models/User"); // Verifique se este arquivo e exportação estão corretos
const cpfcnpj = require("cpf-cnpj-validator"); // Validador

const getLeads = async () => {
  try {
    const leads = await Lead.find()
      .populate("situacao", "nome")
      .populate("origem", "nome")
      .populate("responsavel", "nome perfil")
      .sort({ createdAt: -1 });
    return leads;
  } catch (err) {
    console.error("Erro ao buscar leads no serviço:", err);
    throw new Error("Erro ao buscar os leads");
  }
};

const getLeadById = async (id) => {
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
    nome, contato, email, nascimento, endereco, cpf,
    situacao, // ID
    motivoDescarte, comentario,
    origem, // ID
    responsavel, // ID
  } = leadData;

  // Validação de CPF
  let cpfLimpo = null;
  if (cpf) {
    cpfLimpo = cpf.replace(/\D/g, '');
    if (!cpfcnpj.cpf.isValid(cpfLimpo)) {
      throw new Error(`CPF inválido fornecido: ${cpf}`);
    }
  }

  // Validação de IDs de Referência
  const [responsavelDoc, origemDoc, situacaoDoc] = await Promise.all([
      User.findById(responsavel).lean(),
      Origem.findById(origem).lean(), // Usando a variável Origem importada
      LeadStage.findById(situacao).lean()
  ]).catch(err => {
      console.error("Erro ao validar IDs referenciados:", err);
      throw new Error("Erro ao verificar referências (Responsável, Origem ou Situação).");
  });

  if (!responsavelDoc) throw new Error("Responsável não encontrado");
  // !!! ATENÇÃO: Se o require de Origem falhar (por causa do nome 'origem.js' vs 'Origem.js'), origemDoc será null aqui!
  if (!origemDoc) throw new Error("Origem não encontrada");
  if (!situacaoDoc) throw new Error("Situação não encontrada");

  // Criação do Novo Lead
  const novoLead = new Lead({
    nome, contato, email,
    nascimento: nascimento || null,
    endereco: endereco || null,
    cpf: cpfLimpo,
    situacao: situacaoDoc._id,
    motivoDescarte: motivoDescarte || null,
    comentario: comentario || null,
    origem: origemDoc._id,
    responsavel: responsavelDoc._id,
  });

  // Salvar
  try {
    const leadSalvo = await novoLead.save();
    return leadSalvo;
  } catch (error) {
    console.error("Erro ao salvar lead no serviço:", error);
    // O hook post no model trata o erro E11000 de CPF duplicado
    throw new Error(error.message || "Erro interno ao salvar o lead.");
  }
};

const updateLead = async (id, leadData) => {
    console.log(`[updateLead] Iniciando para ID: ${id}`); // Log 1
    console.log("[updateLead] leadData recebido:", JSON.stringify(leadData, null, 2)); // Log 2

    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error("ID de Lead inválido.");
    }

    const {
        nome, contato, email, nascimento, endereco, cpf,
        responsavel, // ID
        situacao,    // ID
        motivoDescarte, // Vem do payload?
        comentario,     // Vem do payload?
        origem       // ID
    } = leadData;

    const updateFields = {};

    // Adiciona campos simples
    if (nome !== undefined) updateFields.nome = nome;
    if (contato !== undefined) updateFields.contato = contato;
    if (email !== undefined) updateFields.email = email;
    if (nascimento !== undefined) updateFields.nascimento = nascimento;
    if (endereco !== undefined) updateFields.endereco = endereco;
    // motivoDescarte e comentario são tratados na lógica da situação ou se a situação não mudar
    if (situacao === undefined) {
         console.log("[updateLead] Situação não está sendo atualizada. Verificando motivo/comentário avulsos.");
         if (motivoDescarte !== undefined) updateFields.motivoDescarte = motivoDescarte;
         if (comentario !== undefined) updateFields.comentario = comentario;
    }

    // Handle CPF
    if (cpf !== undefined) {
        if (cpf === null || cpf === '') { updateFields.cpf = null; }
        else {
            const cpfLimpo = cpf.replace(/\D/g, '');
            if (!cpfcnpj.cpf.isValid(cpfLimpo)) { throw new Error(`CPF inválido fornecido para atualização: ${cpf}`); }
            updateFields.cpf = cpfLimpo;
        }
    }

    // Handle References and Clear Discard Fields Logic
    if (situacao !== undefined) {
         console.log(`[updateLead] Processando atualização de situação. Novo ID: ${situacao}`); // Log 3
         // Busca o documento completo para poder ler o nome
         const situacaoDoc = await LeadStage.findById(situacao);
         if (!situacaoDoc) { throw new Error("Situação não encontrada para o ID fornecido."); }
         console.log(`[updateLead] Nova situação encontrada no DB: ID=${situacaoDoc._id}, Nome="${situacaoDoc.nome}"`); // Log 4

         updateFields.situacao = situacaoDoc._id;

         // *** LÓGICA PARA LIMPAR CAMPOS DE DESCARTE ***
         // !!! Verifique se o nome no DB é EXATAMENTE "Descartado" (maiúsculas/minúsculas) !!!
         if (situacaoDoc.nome !== "Descartado") {
             console.log(`[updateLead] *** Condição (situacaoDoc.nome !== "Descartado") ATENDIDA. Limpando campos de descarte.`); // Log 5
             updateFields.motivoDescarte = null;
             updateFields.comentario = null;
         } else {
             // A nova situação é "Descartado". Permitir definir motivo/comentário se vieram no payload.
             console.log(`[updateLead] *** Condição (situacaoDoc.nome !== "Descartado") NÃO ATENDIDA. Mantendo/atualizando campos de descarte se fornecidos.`); // Log 6
             if (motivoDescarte !== undefined) {
                updateFields.motivoDescarte = motivoDescarte;
             } else {
                 // Opcional: Se está mudando PARA descartado, mas não veio motivo, forçar null ou erro?
                 // Por segurança, vamos forçar null se não vier nada.
                 updateFields.motivoDescarte = null;
                 console.log("[updateLead] Motivo descarte não fornecido na mudança para Descartado, setando para null.");
             }
             if (comentario !== undefined) {
                 updateFields.comentario = comentario;
             } else {
                 updateFields.comentario = null; // Limpa comentário se não for fornecido
             }
         }
    }
    // --- Fim Lógica Situação ---


    if (origem !== undefined) {
        // !!! ATENÇÃO: Ajuste o require abaixo se nome do arquivo for Origem.js !!!
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

    if (Object.keys(updateFields).length === 0) {
        console.warn(`[updateLead] Nenhum campo válido fornecido para atualizar o Lead ID: ${id}`);
        const leadAtual = await getLeadById(id); // Retorna o lead sem alterações
        return leadAtual;
    }

    console.log("[updateLead] Objeto updateFields FINAL antes da chamada DB:", JSON.stringify(updateFields, null, 2)); // Log 7

    try {
        console.log("[updateLead] Executando findByIdAndUpdate..."); // Log 8
        const updatedLead = await Lead.findByIdAndUpdate(
            id,
            { $set: updateFields },
            // runValidators: true para validar schema Mongoose (ex: required, type). Não valida mais CPF aqui.
            { new: true, runValidators: true }
        );

        if (!updatedLead) { throw new Error("Lead não encontrado (não foi possível atualizar)."); }
        console.log("[updateLead] Resultado Raw do DB ANTES de populate:", JSON.stringify(updatedLead, null, 2)); // Log 9

        // Re-populate para retornar dados consistentes e atualizados ao frontend
         await updatedLead.populate([
             { path: "situacao", select: "nome" },
             { path: "origem", select: "nome" },
             { path: "responsavel", select: "nome perfil" }
        ]);

        console.log("[updateLead] Resultado FINAL após populate:", JSON.stringify(updatedLead, null, 2)); // Log 10
        return updatedLead;

    } catch (error) {
        console.error("[updateLead] Erro durante findByIdAndUpdate ou populate:", error); // Log 11
        // O hook post no model ainda trata o erro de CPF duplicado (E11000)
        throw new Error(error.message || "Erro interno ao atualizar o lead.");
    }
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
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("ID de Lead inválido.");
  }
  const { motivoDescarte, comentario } = dados;
  if (!motivoDescarte) {
    throw new Error("O motivo do descarte é obrigatório.");
  }

  const situacaoDescartado = await LeadStage.findOne({
    nome: "Descartado", // !!! Verifique se este nome está EXATO no seu DB !!!
  }).lean();
  if (!situacaoDescartado) {
    console.error('Situação "Descartado" não configurada no banco de dados.');
    throw new Error('Erro interno: Situação "Descartado" não encontrada.');
  }

  const lead = await Lead.findByIdAndUpdate(
    id,
    {
      situacao: situacaoDescartado._id,
      motivoDescarte,
      comentario: comentario || null,
    },
    { new: true }
  ).populate("situacao", "nome");

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