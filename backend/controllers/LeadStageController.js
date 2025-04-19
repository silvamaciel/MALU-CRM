// controllers/LeadStageController.js
const LeadStageService = require('../services/LeadStageService');

// Listar todas as situações
const getLeadStages = async (req, res) => {
  try {
    const stages = await LeadStageService.getLeadStages();
    res.json(stages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Criar uma nova situação
const createLeadStage = async (req, res) => {
  try {
    const novaSituacao = await LeadStageService.createLeadStage(req.body);
    res.status(201).json(novaSituacao);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Atualizar uma situação
const updateLeadStage = async (req, res) => {
  try {
    const situacaoAtualizada = await LeadStageService.updateLeadStage(req.params.id, req.body);
    res.json(situacaoAtualizada);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Deletar uma situação
const deleteLeadStage = async (req, res) => {
  try {
    await LeadStageService.deleteLeadStage(req.params.id);
    res.json({ mensagem: 'Situação excluída com sucesso.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getLeadStages,
  createLeadStage,
  updateLeadStage,
  deleteLeadStage,
};
