// services/LeadStageService.js
const mongoose = require('mongoose'); // Necessário para validar ObjectId
const LeadStage = require('../models/LeadStage');
const Lead = require('../models/Lead'); // <<< Importar Lead para checar uso

// Função para listar todas as situações
const getLeadStages = async () => {
  try {
    // Mantendo sua ordenação por 'ordem', se existir no seu schema
    // Se não existir 'ordem', use .sort({ nome: 1 })
    return await LeadStage.find().sort({ ordem: 1 });
  } catch (error) {
    console.error("Erro ao buscar situações:", error);
    throw new Error('Erro ao buscar situações.');
  }
};

// Função para criar uma nova situação
const createLeadStage = async (data) => {
  const { nome, ordem } = data; // Pega nome e ordem (se usar)
  if (!nome) { throw new Error('O nome da situação é obrigatório.'); }

  try {
    // <<< MELHORIA: Verifica nome duplicado (case-insensitive) >>>
    const existingStage = await LeadStage.findOne({ nome: { $regex: new RegExp(`^${nome}$`, 'i') } });
    if (existingStage) {
      throw new Error(`Situação '${nome}' já existe.`);
    }
    // <<< FIM MELHORIA >>>

    const novaSituacao = new LeadStage({ nome, ordem }); // Inclui ordem se usar
    await novaSituacao.save();
    return novaSituacao;
  } catch (error) {
     if (error.message.includes("já existe")) throw error; // Repassa erro de duplicação
     console.error("Erro ao criar situação:", error);
     throw new Error('Erro ao criar situação.');
  }
};

// Função para atualizar uma situação
const updateLeadStage = async (id, data) => {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new Error("ID inválido.");
  const { nome, ordem } = data; // Pega nome e ordem
  // Garante que pelo menos um campo para atualizar foi enviado
  if (nome === undefined && ordem === undefined) {
      throw new Error("Nenhum dado fornecido para atualização.");
  }

  // Monta objeto de atualização apenas com campos definidos
  const updateData = {};
  if (nome !== undefined) {
      if(typeof nome !== 'string' || nome.trim() === '') throw new Error('Nome inválido.');
      updateData.nome = nome.trim();
  }
  if (ordem !== undefined) updateData.ordem = ordem;


  try {
    // <<< MELHORIA: Verifica nome duplicado em OUTRO doc >>>
    if (updateData.nome) {
        const existingStage = await LeadStage.findOne({
             nome: { $regex: new RegExp(`^${updateData.nome}$`, 'i') },
             _id: { $ne: id } // Exclui o próprio documento da verificação
        });
        if (existingStage) {
            throw new Error(`Já existe outra situação com o nome '${updateData.nome}'.`);
        }
    }
    // <<< FIM MELHORIA >>>

    const updatedStage = await LeadStage.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
    if (!updatedStage) {
      throw new Error('Situação não encontrada.'); // Lança erro se não achar
    }
    return updatedStage;
  } catch (error) {
     if (error.message.includes("já existe")) throw error; // Repassa erro de duplicação
     console.error("Erro ao atualizar situação:", error);
     throw new Error('Erro ao atualizar situação.');
  }
};

// Função para excluir uma situação
const deleteLeadStage = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new Error("ID inválido.");
  try {
     const stageToDelete = await LeadStage.findById(id);
     if (!stageToDelete) {
         throw new Error('Situação não encontrada.');
     }

     // <<< MELHORIA: Verifica se a situação está em uso >>>
     const leadCount = await Lead.countDocuments({ situacao: id });
     if (leadCount > 0) {
         throw new Error(`Não é possível excluir: A situação "${stageToDelete.nome}" está sendo usada por ${leadCount} lead(s).`);
     }
     // <<< FIM MELHORIA >>>

     // Se chegou aqui, pode deletar
     await LeadStage.findByIdAndDelete(id);
     return { message: `Situação "${stageToDelete.nome}" excluída com sucesso.` }; // Retorna mensagem de sucesso

  } catch (error) {
     // Repassa o erro específico (ex: "Não é possível excluir...") ou um genérico
     console.error("Erro ao excluir situação:", error);
     throw new Error(error.message || 'Erro ao excluir situação.');
  }
};

module.exports = {
  getLeadStages,
  createLeadStage,
  updateLeadStage,
  deleteLeadStage,
};