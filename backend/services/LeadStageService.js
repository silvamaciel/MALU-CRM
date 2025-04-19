// services/LeadStageService.js
const LeadStage = require('../models/LeadStage');

// Função para listar todas as situações
const getLeadStages = async () => {
  try {
    return await LeadStage.find().sort({ ordem: 1 });
  } catch (error) {
    throw new Error('Erro ao buscar situações.');
  }
};

// Função para criar uma nova situação
const createLeadStage = async (data) => {
  try {
    const novaSituacao = new LeadStage(data);
    return await novaSituacao.save();
  } catch (error) {
    throw new Error('Erro ao criar situação.');
  }
};

// Função para atualizar uma situação
const updateLeadStage = async (id, data) => {
  try {
    return await LeadStage.findByIdAndUpdate(id, data, { new: true });
  } catch (error) {
    throw new Error('Erro ao atualizar situação.');
  }
};

// Função para excluir uma situação
const deleteLeadStage = async (id) => {
  try {
    return await LeadStage.findByIdAndDelete(id);
  } catch (error) {
    throw new Error('Erro ao excluir situação.');
  }
};

module.exports = {
  getLeadStages,
  createLeadStage,
  updateLeadStage,
  deleteLeadStage,
};
