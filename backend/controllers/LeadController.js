// controllers/leadController.js
const leadService = require('../services/LeadService');
const leadHistoryService = require('../services/leadHistoryService'); 

const getLeads = async (req, res) => {
  try {
    console.log("[Controller getLeads] req.query recebido:", req.query);
    const result = await leadService.getLeads(req.query);
    res.json(result);
  } catch (error) {
    console.error("[Controller getLeads] Erro:", error);
    res.status(500).json({ error: error.message });
  }
};

const getLeadById = async (req, res) => {
  try {
    const lead = await leadService.getLeadById(req.params.id);
    res.json(lead);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};

const createLead = async (req, res) => {
  
  try {
    const novoLead = await leadService.createLead(req.body);
    res.status(201).json(novoLead);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const updateLead = async (req, res) => {
  try {
    const leadAtualizado = await leadService.updateLead(req.params.id, req.body);
    res.json(leadAtualizado);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const deleteLead = async (req, res) => {
  try {
    const msg = await leadService.deleteLead(req.params.id);
    res.json(msg);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const descartarLead = async (req, res) => {
  try {
    const lead = await leadService.descartarLead(req.params.id, req.body);
    res.json(lead);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getLeadHistory = async (req, res) => {
  try {
      // Validação do ID do Lead pode ser feita no serviço
      const history = await leadHistoryService.getLeadHistory(req.params.id);
      res.json(history);
  } catch (error) {
      // Se o erro for 'Lead não encontrado' pode ser 404, senão 500
      const statusCode = error.message.toLowerCase().includes("não encontrado") ? 404 : 500;
      res.status(statusCode).json({ error: error.message });
  }
};




module.exports = {
  getLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
  descartarLead,
  getLeadHistory
};
